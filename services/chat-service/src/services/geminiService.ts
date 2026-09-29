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

  const systemInstruction = `Bạn là NovaBot, nhân viên tư vấn bán hàng chuyên nghiệp và nhiệt tình của sàn thương mại điện tử NovaShop (Việt Nam).

VAI TRÒ & NGUYÊN TẮC TƯ VẤN:
1. CHỈ tư vấn mua sắm các sản phẩm tại NovaShop, tra cứu đơn hàng và chính sách mua hàng của sàn. Nếu khách hỏi chuyện phiếm, học tập, lập trình hoặc vấn đề ngoài sàn, hãy từ chối lịch sự trong 1 câu và hướng dẫn khách mua sắm sản phẩm.
2. PHONG CÁCH TRẢ LỜI: Tự nhiên, thông minh, trả lời đúng trọng tâm câu hỏi của khách hàng:
   - Khi khách hỏi sản phẩm hot / khuyến mãi / flash sale / gợi ý đồ ngon: Hãy tư vấn những sản phẩm Flash Sale hot nhất kèm giá ưu đãi và lý do nên mua.
   - Khi khách hỏi chi tiết về một sản phẩm (ví dụ: "chi tiết hơn", "chi tiết sản phẩm", "thông số ra sao"): Hãy dùng thông tin mô tả chi tiết (description) trong danh mục bên dưới để giải thích cụ thể về chất liệu, công nghệ, thông số, ưu điểm thực tế. Tuyệt đối không lặp lại câu chào chung chung.
   - Khi khách hỏi về giá hoặc so sánh: Đưa ra nhận xét khách quan, chính xác dựa trên danh mục.
3. QUY TẮC HIỂN THỊ THẺ SẢN PHẨM (RẤT QUAN TRỌNG):
   - Mỗi khi bạn nhắc đến, gợi ý hoặc tư vấn về bất kỳ sản phẩm nào, BẮT BUỘC phải điền ID của sản phẩm đó vào mảng "suggestedProductIds" (từ 1 đến 3 sản phẩm phù hợp nhất).
   - Hệ thống giao diện sẽ dùng "suggestedProductIds" để hiển thị thẻ sản phẩm tương tác kèm hình ảnh và giá để khách hàng bấm xem chi tiết hoặc thêm giỏ hàng.
4. ĐỘ DÀI PHẢN HỒI: Vừa vặn, súc tích (khoảng 2 đến 4 câu văn), mạch lạc, dễ đọc. Có thể dùng emoji nhẹ nhàng để tạo sự gần gũi.

DANH MỤC SẢN PHẨM HIỆN CÓ CỦA NOVASHOP:
${JSON.stringify(catalogContext, null, 2)}

CHÍNH SÁCH CỬA HÀNG NOVASHOP:
1. Giao hàng: Giao hỏa tốc 2 giờ nội thành (Hà Nội, TP.HCM), giao toàn quốc 1-3 ngày. Miễn phí ship đơn từ 500.000đ.
2. Đổi trả: 1 đổi 1 miễn phí trong 7 ngày nếu có lỗi từ nhà sản xuất.
3. Bảo hành: Chính hãng điện tử 12-24 tháng theo số điện thoại mua hàng.
4. Hotline: 1900 8888 (8:00 - 21:30 hàng ngày).

QUY TẮC ĐỊNH DẠNG:
- Trả về JSON thuần túy theo schema:
{
  "reply": "Nội dung tư vấn chi tiết, thông minh và thân thiện bằng tiếng Việt",
  "suggestedProductIds": ["id_sp_1", "id_sp_2"]
}
- Tuyệt đối không bọc trong markdown code block, chỉ trả về chuỗi JSON hợp lệ.`;

  const contents: any[] = [];
  const recentHistory = history.slice(-6);
  for (const item of recentHistory) {
    if (item.sender === 'customer' || item.sender === 'user') {
      contents.push({ role: 'user', parts: [{ text: item.message }] });
    } else if (item.sender === 'ai' || item.sender === 'staff' || item.sender === 'bot') {
      contents.push({ role: 'model', parts: [{ text: item.message }] });
    }
  }

  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  // Thu thập danh sách API keys và xáo trộn ngẫu nhiên để tránh rate limit (tương tự như wellknow xampp)
  const candidateKeys = config.geminiApiKeys && config.geminiApiKeys.length > 0
    ? [...config.geminiApiKeys]
    : (config.geminiApiKey ? [config.geminiApiKey] : []);

  if (candidateKeys.length === 0) {
    throw new Error('Chưa cài đặt Gemini API Key trong hệ thống');
  }

  const shuffledKeys = candidateKeys.sort(() => Math.random() - 0.5);

  // Danh sách model ưu tiên và dự phòng
  const candidateModels = Array.from(new Set([
    config.geminiModel,
    ...(config.fallbackModels || [])
  ])).filter(Boolean);

  let lastError = '';

  for (const requestModel of candidateModels) {
    for (const apiKey of shuffledKeys) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(requestModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            systemInstruction: {
              parts: [{ text: systemInstruction }]
            },
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 600,
              responseMimeType: 'application/json'
            }
          })
        });

        if (!response.ok) {
          const errDetail = await response.text();
          lastError = `[Model: ${requestModel}, Key: ...${apiKey.slice(-6)}] HTTP ${response.status}: ${errDetail}`;
          console.warn('Gemini key attempt failed, trying next key/model:', lastError);
          continue;
        }

        const data: any = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        if (!rawText) {
          continue;
        }

        let cleanedText = rawText;
        if (cleanedText.startsWith('```json')) {
          cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
        } else if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```\s*/i, '').replace(/```$/i, '').trim();
        }

        let parsed: any;
        try {
          parsed = JSON.parse(cleanedText);
        } catch {
          parsed = { reply: cleanedText, suggestedProductIds: [] };
        }

        // Hỗ trợ trích xuất câu trả lời linh hoạt từ nhiều định dạng key JSON mà AI có thể trả về
        let extractedReply = '';
        if (typeof parsed === 'string') {
          extractedReply = parsed;
        } else if (parsed && typeof parsed === 'object') {
          extractedReply =
            parsed.reply ||
            parsed.response ||
            parsed.message ||
            parsed.phan_hoi ||
            parsed.tra_loi ||
            parsed.noi_dung ||
            parsed.content ||
            parsed.answer ||
            parsed.text ||
            '';
        }

        if (!extractedReply && cleanedText) {
          extractedReply = cleanedText.replace(/^[\{\}\[\]"'\s]+|[\{\}\[\]"'\s]+$/g, '');
        }

        const rawSuggested =
          (parsed && (parsed.suggestedProductIds || parsed.suggested_product_ids || parsed.suggestedProducts || parsed.san_pham_goi_y)) || [];
        const suggestedProductIds = Array.isArray(rawSuggested) ? rawSuggested : [];
        const suggestedProducts = products.filter((p) => suggestedProductIds.includes(p.id));

        return {
          reply: extractedReply || 'Dạ NovaShop có thể hỗ trợ gì thêm cho quý khách về sản phẩm ạ?',
          suggestedProducts
        };
      } catch (err: any) {
        lastError = err.message;
        console.warn(`Lỗi khi gọi Gemini với key ...${apiKey.slice(-6)}:`, err.message);
      }
    }
  }

  throw new Error(`Tất cả Gemini API keys và models đều lỗi. Lỗi cuối cùng: ${lastError}`);
};

export const generateResponse = async (userMessage: string, history: any[] = []): Promise<{ reply: string; suggestedProducts: any[] }> => {
  const hasKeys = (config.geminiApiKeys && config.geminiApiKeys.length > 0) || (config.geminiApiKey && config.geminiApiKey.trim() !== '');
  if (hasKeys) {
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
