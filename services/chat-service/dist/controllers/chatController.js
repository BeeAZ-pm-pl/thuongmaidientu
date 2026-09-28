"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAiStatus = exports.adminReply = exports.adminGetSessions = exports.switchMode = exports.requestHuman = exports.sendMessage = exports.getMessages = exports.getOrCreateSession = void 0;
const chatModel = __importStar(require("../models/chatModel"));
const geminiService = __importStar(require("../services/geminiService"));
const config_1 = __importDefault(require("../config"));
const getOrCreateSession = async (req, res) => {
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi khởi tạo phiên chat', error: error.message });
    }
};
exports.getOrCreateSession = getOrCreateSession;
const getMessages = async (req, res) => {
    try {
        const sessionId = String(req.params.sessionId);
        const session = await chatModel.getSessionById(sessionId);
        if (!session) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy phiên chat' });
        }
        const messages = await chatModel.getMessagesBySessionId(sessionId);
        return res.json({ success: true, data: { session, messages } });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi khi tải tin nhắn', error: error.message });
    }
};
exports.getMessages = getMessages;
const sendMessage = async (req, res) => {
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi gửi tin nhắn', error: error.message });
    }
};
exports.sendMessage = sendMessage;
const requestHuman = async (req, res) => {
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi chuyển chế độ', error: error.message });
    }
};
exports.requestHuman = requestHuman;
const switchMode = async (req, res) => {
    try {
        const { sessionId, mode } = req.body;
        if (!sessionId || !mode) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin' });
        }
        const session = await chatModel.updateSession(sessionId, { status: mode });
        let messageText = '';
        if (mode === 'ai') {
            messageText = '🤖 Phiên trò chuyện đã được chuyển lại cho Trợ lý NovaBot AI. Quý khách có thể tiếp tục hỏi bất kỳ điều gì ạ!';
        }
        else if (mode === 'closed') {
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi cập nhật chế độ', error: error.message });
    }
};
exports.switchMode = switchMode;
const adminGetSessions = async (req, res) => {
    try {
        const { status } = req.query;
        const sessions = await chatModel.listSessions({ status: status });
        const totalUnread = await chatModel.getUnreadTotal();
        return res.json({
            success: true,
            total: sessions.length,
            totalUnread,
            data: sessions
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi tải danh sách phiên chat', error: error.message });
    }
};
exports.adminGetSessions = adminGetSessions;
const adminReply = async (req, res) => {
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi phản hồi admin', error: error.message });
    }
};
exports.adminReply = adminReply;
const getAiStatus = (req, res) => {
    const hasKey = Boolean(config_1.default.geminiApiKey && config_1.default.geminiApiKey.trim() !== '');
    return res.json({
        success: true,
        data: {
            provider: hasKey ? 'Google Gemini AI' : 'Smart Catalog Engine (Fallback)',
            model: config_1.default.geminiModel,
            isApiKeyConfigured: hasKey
        }
    });
};
exports.getAiStatus = getAiStatus;
exports.default = {
    getOrCreateSession: exports.getOrCreateSession,
    getMessages: exports.getMessages,
    sendMessage: exports.sendMessage,
    requestHuman: exports.requestHuman,
    switchMode: exports.switchMode,
    adminGetSessions: exports.adminGetSessions,
    adminReply: exports.adminReply,
    getAiStatus: exports.getAiStatus
};
