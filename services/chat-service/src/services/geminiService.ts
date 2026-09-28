import config from '../config';
import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

const getDbPool = async (): Promise<mysql.Pool> => {
  if (pool) return pool;
  pool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
  });
  return pool;
};

export const getStoreProducts = async (): Promise<any[]> => {
  try {
    const db = await getDbPool();
    const [rows]: any = await db.query(
      'SELECT id, name, categoryName, price, originalPrice, stock, rating, soldCount, imageUrl, description, isFlashSale, flashSaleDiscount FROM products'
    );
    return rows;
  } catch (error) {
    return [];
  }
};

export const getOrderInfo = async (orderId: string): Promise<any | null> => {
  try {
    const db = await getDbPool();
    const [rows]: any = await db.query(
      'SELECT id, customerName, totalAmount, status, paymentMethod, createdAt FROM orders WHERE id = ? OR id LIKE ? LIMIT 1',
      [orderId, `%${orderId}%`]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (err) {
    return null;
  }
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
};

export const generateRuleBasedResponse = async (userMessage: string, history: any[] = []): Promise<{ reply: string; suggestedProducts: any[] }> => {
  const query = userMessage.toLowerCase().trim();
  const products = await getStoreProducts();

  const orderMatch = query.match(/(?:đơn|mã đơn|order)[\s#:]*([a-zA-Z0-9_\-]+)/i);
  if (orderMatch) {
    const orderCode = orderMatch[1];
    const order = await getOrderInfo(orderCode);
    if (order) {
      const statusMap: Record<string, string> = {
        pending: 'Đang chờ xác nhận',
        processing: 'Đang đóng gói và vận chuyển',
        completed: 'Đã giao hàng thành công',
        cancelled: 'Đã hủy'
      };
      const statusName = statusMap[order.status] || order.status;
      return {
        reply: `Dạ em đã kiểm tra thấy thông tin đơn hàng **#${order.id}** của quý khách:\n- Khách hàng: **${order.customerName}**\n- Tổng tiền: **${formatCurrency(order.totalAmount)}**\n- Trạng thái hiện tại: **${statusName}**\n- Phương thức thanh toán: **${order.paymentMethod?.toUpperCase()}**\n\nNếu quý khách cần hỗ trợ thêm về đơn hàng này, em có thể hỗ trợ ngay ạ!`,
        suggestedProducts: []
      };
    }
  }

  if (query.includes('vận chuyển') || query.includes('giao hàng') || query.includes('ship') || query.includes('bao lâu')) {
    return {
      reply: `Dạ chính sách giao hàng của **NovaShop** như sau ạ:\n- 🚀 **Giao hàng hỏa tốc trong 2 giờ** đối với khu vực nội thành Hà Nội & TP. Hồ Chí Minh.\n- 📦 **Giao hàng toàn quốc từ 1 - 3 ngày làm việc** qua các đơn vị vận chuyển uy tín.\n- 🎁 **Miễn phí vận chuyển** cho tất cả các đơn hàng từ 500.000đ trở lên.\n\nQuý khách muốn giao hàng đến tỉnh/thành phố nào em tư vấn chi tiết hơn ạ!`,
      suggestedProducts: []
    };
  }

  if (query.includes('đổi trả') || query.includes('bảo hành') || query.includes('hỏng') || query.includes('lỗi')) {
    return {
      reply: `Dạ **NovaShop** cam kết quyền lợi tối đa cho quý khách:\n- 🛡️ **Bảo hành chính hãng 12 - 24 tháng** theo từng thiết bị, tra cứu bảo hành điện tử theo số điện thoại.\n- 🔄 **1 đổi 1 trong vòng 7 ngày đầu** nếu sản phẩm phát sinh lỗi từ nhà sản xuất.\n- 🚚 Shop hỗ trợ nhận đổi trả tận nhà hoàn toàn miễn phí.\n\nQuý khách có thể liên hệ tổng đài **1900 8888** hoặc bấm nút "Gặp nhân viên" để được hỗ trợ thủ tục nhanh nhất ạ!`,
      suggestedProducts: []
    };
  }

  if (query.includes('flash sale') || query.includes('giảm giá') || query.includes('khuyến mãi') || query.includes('ưu đãi') || query.includes('sale')) {
    const saleProds = products.filter((p) => p.isFlashSale);
    return {
      reply: `Dạ hiện tại NovaShop đang diễn ra chương trình **Flash Sale Giờ Vàng** với mức giảm giá cực sốc lên tới **40%**! 🔥\nDưới đây là những sản phẩm đang có giá ưu đãi tốt nhất hôm nay, mời quý khách tham khảo:`,
      suggestedProducts: saleProds.slice(0, 4)
    };
  }

  let matched: any[] = [];
  if (query.includes('tai nghe') || query.includes('headphone') || query.includes('sony') || query.includes('âm thanh')) {
    matched = products.filter((p) => p.name.toLowerCase().includes('tai nghe') || p.id === 'prod_01');
  } else if (query.includes('bàn phím') || query.includes('keyboard') || query.includes('keychron') || query.includes('cơ')) {
    matched = products.filter((p) => p.name.toLowerCase().includes('bàn phím') || p.id === 'prod_02');
  } else if (query.includes('đồng hồ') || query.includes('apple watch') || query.includes('smartwatch')) {
    matched = products.filter((p) => p.name.toLowerCase().includes('apple watch') || p.id === 'prod_03');
  } else if (query.includes('áo') || query.includes('bomber') || query.includes('thời trang') || query.includes('mặc')) {
    matched = products.filter((p) => p.name.toLowerCase().includes('áo') || p.categoryId === 'cat_fashion');
  } else if (query.includes('balo') || query.includes('túi') || query.includes('laptop')) {
    matched = products.filter((p) => p.name.toLowerCase().includes('balo') || p.id === 'prod_05');
  } else if (query.includes('robot') || query.includes('hút bụi') || query.includes('lau nhà') || query.includes('dreame')) {
    matched = products.filter((p) => p.name.toLowerCase().includes('robot') || p.id === 'prod_06');
  } else if (query.includes('nồi chiên') || query.includes('philips') || query.includes('bếp') || query.includes('gia dụng')) {
    matched = products.filter((p) => p.name.toLowerCase().includes('nồi chiên') || p.categoryId === 'cat_home');
  } else if (query.includes('sách') || query.includes('system design') || query.includes('đọc')) {
    matched = products.filter((p) => p.name.toLowerCase().includes('sách') || p.categoryId === 'cat_books');
  } else if (query.includes('dưới 1 triệu') || query.includes('dưới 1tr') || query.includes('rẻ')) {
    matched = products.filter((p) => p.price <= 1000000);
  } else if (query.includes('dưới 5 triệu') || query.includes('dưới 5tr')) {
    matched = products.filter((p) => p.price <= 5000000);
  } else {
    matched = products.filter((p) => {
      const text = `${p.name} ${p.categoryName} ${p.description}`.toLowerCase();
      return query.split(' ').some((word) => word.length > 2 && text.includes(word));
    });
  }

  if (matched.length > 0) {
    const list = matched.slice(0, 3);
    const names = list.map((p) => `• **${p.name}** - Giá: **${formatCurrency(p.price)}** (Đánh giá: ⭐ ${p.rating})`).join('\n');
    return {
      reply: `Dạ em tìm thấy một số sản phẩm rất phù hợp với nhu cầu của quý khách tại NovaShop:\n\n${names}\n\nQuý khách có thể bấm trực tiếp vào thẻ sản phẩm bên dưới để xem chi tiết hoặc thêm vào giỏ hàng ngay nhé! 👇`,
      suggestedProducts: list
    };
  }

  const sampleProducts = products.slice(0, 3);
  return {
    reply: `Chào quý khách! Em là **NovaBot**, trợ lý mua sắm AI của NovaShop 🌟\nEm có thể giúp quý khách:\n- 🔍 Tìm kiếm sản phẩm theo nhu cầu & mức ngân sách\n- 🏷️ Xem các ưu đãi Flash Sale hấp dẫn\n- 📦 Tra cứu tình trạng đơn hàng (vui lòng nhắn mã đơn)\n- 🛡️ Hướng dẫn chính sách bảo hành & đổi trả miễn phí 7 ngày\n\nQuý khách đang quan tâm đến sản phẩm hoặc cần hỗ trợ gì ạ?`,
    suggestedProducts: sampleProducts
  };
};

export const callGeminiApi = async (userMessage: string, history: any[] = []): Promise<{ reply: string; suggestedProducts: any[] }> => {
  const products = await getStoreProducts();
  const catalogContext = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.categoryName,
    price: p.price,
    formattedPrice: formatCurrency(p.price),
    originalPrice: p.originalPrice ? formatCurrency(p.originalPrice) : null,
    rating: p.rating,
    stock: p.stock,
    isFlashSale: Boolean(p.isFlashSale),
    flashSaleDiscount: p.flashSaleDiscount || 0,
    imageUrl: p.imageUrl,
    description: p.description
  }));

  const systemInstruction = `Bạn là NovaBot, trợ lý AI tư vấn mua sắm và chăm sóc khách hàng của sàn thương mại điện tử NovaShop (Việt Nam).
Tôn chỉ làm việc: Lịch sự, chu đáo, nhiệt tình, trung thực, sử dụng tiếng Việt tự nhiên và thêm biểu tượng cảm xúc (emoji) phù hợp.

Dưới đây là TOÀN BỘ DANH MỤC SẢN PHẨM HIỆN CÓ CỦA CỬA HÀNG:
${JSON.stringify(catalogContext, null, 2)}

CHÍNH SÁCH CỬA HÀNG NOVASHOP:
1. Giao hàng: Giao hỏa tốc 2 giờ nội thành (Hà Nội, TP.HCM), giao toàn quốc 1-3 ngày. Miễn phí ship đơn từ 500.000đ.
2. Đổi trả: 1 đổi 1 miễn phí trong 7 ngày nếu lỗi nhà sản xuất.
3. Bảo hành: Bảo hành chính hãng điện tử 12-24 tháng.
4. Thanh toán: Tiền mặt khi nhận hàng (COD), Thẻ tín dụng, Chuyển khoản ngân hàng.
5. Hotline: 1900 8888 (8:00 - 21:30 hàng ngày).

QUY TẮC PHẢN HỒI:
- Trả về kết quả theo định dạng JSON DUY NHẤT:
{
  "reply": "Nội dung trả lời khách hàng bằng Markdown thân thiện, súc tích",
  "suggestedProductIds": ["prod_01", "prod_02"]
}
- Nếu khách hỏi về sản phẩm ngoài danh mục, thông báo lịch sự là shop hiện chưa kinh doanh sản phẩm đó và gợi ý sản phẩm tương tự có sẵn nếu có.
- Nếu khách hỏi về đơn hàng mà chưa có mã đơn, hướng dẫn khách cung cấp mã đơn hàng.
- Chỉ trả về chuỗi JSON thuần túy, không bọc trong markdown code block, không thêm bất kỳ văn bản nào bên ngoài JSON.`;

  const contents: any[] = [];
  const recentHistory = history.slice(-6);
  for (const item of recentHistory) {
    if (item.sender === 'customer') {
      contents.push({ role: 'user', parts: [{ text: item.message }] });
    } else if (item.sender === 'ai' || item.sender === 'staff') {
      contents.push({ role: 'model', parts: [{ text: item.message }] });
    }
  }

  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiApiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
  }

  const data: any = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

  let cleanedText = rawText;
  if (cleanedText.startsWith('```json')) {
    cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  } else if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  }

  const parsed = JSON.parse(cleanedText);
  const suggestedProductIds = Array.isArray(parsed.suggestedProductIds) ? parsed.suggestedProductIds : [];
  const suggestedProducts = products.filter((p) => suggestedProductIds.includes(p.id));

  return {
    reply: parsed.reply || 'Dạ NovaShop có thể hỗ trợ gì thêm cho quý khách ạ?',
    suggestedProducts
  };
};

export const generateResponse = async (userMessage: string, history: any[] = []): Promise<{ reply: string; suggestedProducts: any[] }> => {
  if (config.geminiApiKey && config.geminiApiKey.trim() !== '') {
    try {
      return await callGeminiApi(userMessage, history);
    } catch (err: any) {
      console.warn('Gemini API call failed, falling back to rule-based engine:', err.message);
    }
  }

  return await generateRuleBasedResponse(userMessage, history);
};

export default {
  generateResponse,
  getStoreProducts,
  getOrderInfo
};
