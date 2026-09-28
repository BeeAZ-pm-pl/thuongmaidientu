import { Request, Response } from 'express';
import * as chatModel from '../models/chatModel';
import * as geminiService from '../services/geminiService';
import config from '../config';

export const getOrCreateSession = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { sessionId, userId, customerName, customerEmail } = req.body;

    if (sessionId) {
      const existing = await chatModel.getSessionById(sessionId);
      if (existing) {
        if (customerName || customerEmail) {
          await chatModel.updateSession(sessionId, { customerName, customerEmail });
        }
        const messages = await chatModel.getMessagesBySessionId(sessionId);
        return res.json({
          success: true,
          data: {
            session: existing,
            messages
          }
        });
      }
    }

    const newSession = await chatModel.createSession({
      userId,
      customerName: customerName || 'Khách hàng',
      customerEmail: customerEmail || ''
    });

    if (!newSession) {
      return res.status(500).json({ success: false, message: 'Không thể tạo phiên chat' });
    }

    const messages = await chatModel.getMessagesBySessionId(newSession.id);
    return res.json({
      success: true,
      data: {
        session: newSession,
        messages
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Lỗi khởi tạo phiên chat', error: error.message });
  }
};

export const getMessages = async (req: Request, res: Response): Promise<Response> => {
  try {
    const sessionId = String(req.params.sessionId);
    const session = await chatModel.getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiên chat' });
    }
    const messages = await chatModel.getMessagesBySessionId(sessionId);
    return res.json({ success: true, data: { session, messages } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Lỗi khi tải tin nhắn', error: error.message });
  }
};

export const sendMessage = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { sessionId, message, sender = 'customer', senderName = 'Khách hàng' } = req.body;
    if (!sessionId || !message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã phiên và nội dung tin nhắn' });
    }

    const session = await chatModel.getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Phiên chat không tồn tại' });
    }

    const userMsg = await chatModel.addMessage({
      sessionId,
      sender,
      senderName,
      message: message.trim()
    });

    if (session.status === 'ai') {
      const history = await chatModel.getMessagesBySessionId(sessionId);
      const aiResponse = await geminiService.generateResponse(message.trim(), history);

      const aiMsg = await chatModel.addMessage({
        sessionId,
        sender: 'ai',
        senderName: 'NovaBot AI',
        message: aiResponse.reply,
        suggestedProducts: aiResponse.suggestedProducts
      });

      return res.json({
        success: true,
        data: {
          userMessage: userMsg,
          aiMessage: aiMsg,
          session: await chatModel.getSessionById(sessionId)
        }
      });
    }

    return res.json({
      success: true,
      data: {
        userMessage: userMsg,
        session: await chatModel.getSessionById(sessionId)
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Lỗi gửi tin nhắn', error: error.message });
  }
};

export const requestHuman = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Thiếu mã phiên' });
    }

    const session = await chatModel.getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Phiên chat không tồn tại' });
    }

    await chatModel.updateSession(sessionId, {
      status: 'human_waiting',
      incrementUnread: true
    });

    const notifyMsg = await chatModel.addMessage({
      sessionId,
      sender: 'ai',
      senderName: 'NovaBot AI',
      message: '🛎️ Quý khách đã yêu cầu kết nối với nhân viên tư vấn. Chuyên viên chăm sóc khách hàng của NovaShop đang tiếp nhận và sẽ trò chuyện với quý khách ngay ạ! Quý khách vui lòng đợi trong giây lát.'
    });

    return res.json({
      success: true,
      message: 'Đã chuyển sang kết nối tư vấn viên',
      data: {
        session: await chatModel.getSessionById(sessionId),
        systemMessage: notifyMsg
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Lỗi chuyển chế độ', error: error.message });
  }
};

export const switchMode = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { sessionId, mode } = req.body;
    if (!sessionId || !mode) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin' });
    }

    const session = await chatModel.updateSession(sessionId, { status: mode });

    let messageText = '';
    if (mode === 'ai') {
      messageText = '🤖 Phiên trò chuyện đã được chuyển lại cho Trợ lý NovaBot AI. Quý khách có thể tiếp tục hỏi bất kỳ điều gì ạ!';
    } else if (mode === 'closed') {
      messageText = '🔒 Phiên hỗ trợ này đã kết thúc. Cảm ơn quý khách đã tin tưởng và mua sắm tại NovaShop!';
    }

    if (messageText) {
      await chatModel.addMessage({
        sessionId,
        sender: 'ai',
        senderName: 'Hệ thống',
        message: messageText
      });
    }

    return res.json({ success: true, data: session });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Lỗi cập nhật chế độ', error: error.message });
  }
};

export const adminGetSessions = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { status } = req.query;
    const sessions = await chatModel.listSessions({ status: status as string });
    const totalUnread = await chatModel.getUnreadTotal();
    return res.json({
      success: true,
      total: sessions.length,
      totalUnread,
      data: sessions
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Lỗi tải danh sách phiên chat', error: error.message });
  }
};

export const adminReply = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { sessionId, message, staffName = 'Chuyên viên CSKH' } = req.body;
    if (!sessionId || !message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp nội dung trả lời' });
    }

    const session = await chatModel.getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Phiên chat không tồn tại' });
    }

    await chatModel.updateSession(sessionId, {
      status: 'human_active',
      resetUnread: true
    });

    const staffMsg = await chatModel.addMessage({
      sessionId,
      sender: 'staff',
      senderName: staffName,
      message: message.trim()
    });

    return res.json({
      success: true,
      data: {
        message: staffMsg,
        session: await chatModel.getSessionById(sessionId)
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Lỗi phản hồi admin', error: error.message });
  }
};

export const getAiStatus = (req: Request, res: Response): Response => {
  const hasKey = Boolean(config.geminiApiKey && config.geminiApiKey.trim() !== '');
  return res.json({
    success: true,
    data: {
      provider: hasKey ? 'Google Gemini AI' : 'Smart Catalog Engine (Fallback)',
      model: config.geminiModel,
      isApiKeyConfigured: hasKey
    }
  });
};

export default {
  getOrCreateSession,
  getMessages,
  sendMessage,
  requestHuman,
  switchMode,
  adminGetSessions,
  adminReply,
  getAiStatus
};
