"use strict";

interface ProductVariant {
    name: string;
    price: number;
    stock: number;
    color?: string;
    type?: string;
    imageUrl?: string;
    originalPrice?: number;
}

interface Product {
    id: string | number;
    name: string;
    category: string;
    categoryName?: string;
    price: number;
    originalPrice?: number;
    rating?: number;
    sold?: number;
    soldCount?: number;
    stock: number;
    imageUrl: string;
    description?: string;
    isFlashSale?: boolean;
    flashSaleDiscount?: number;
    featured?: boolean;
    variants?: ProductVariant[];
}

interface Category {
    id: string;
    name: string;
    icon?: string;
}

interface CartItem {
    id: string | number;
    productId: string | number;
    name: string;
    price: number;
    imageUrl: string;
    quantity: number;
    variantName?: string;
}

interface User {
    id: string | number;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    role?: string;
}

interface OrderItem {
    id?: string | number;
    productId: string | number;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
    variantName?: string;
}

interface Order {
    id: string | number;
    userId: string | number;
    customerName: string;
    customerPhone: string;
    shippingAddress: string;
    paymentMethod: string;
    totalAmount: number;
    status: 'pending' | 'processing' | 'completed' | 'cancelled';
    items: OrderItem[];
    createdAt: string;
}

interface ChatMessage {
    id: string | number;
    sessionId: string;
    sender: 'user' | 'ai' | 'admin' | 'system';
    message: string;
    productRecommendations?: Product[];
    createdAt: string;
}

interface ChatSession {
    id: string;
    userId?: string | number | null;
    guestName: string;
    guestEmail: string;
    status: 'ai' | 'human_waiting' | 'human_active' | 'closed';
    createdAt: string;
    updatedAt: string;
}

interface AppState {
    currentRoute: string;
    products: Product[];
    categories: Category[];
    activeCategory: string;
    searchQuery: string;
    sortBy: string;
    cart: CartItem[];
    user: User | null;
    token: string;
    activeProduct: Product | null;
    selectedColor: string;
    selectedType: string;
    selectedVariant: ProductVariant | null;
    selectedQty: number;
    minPrice: number | null;
    maxPrice: number | null;
    minRating: number | null;
    inStock: boolean;
    flashSaleFilter: boolean;
    orders: Order[];
    ordersLoading: boolean;
    chatSessionId: string;
    chatSession: ChatSession | null;
    chatMessages: ChatMessage[];
    chatOpen: boolean;
    chatLoading: boolean;
    chatPollingTimer: any;
    flashCountdownTimer: any;
}

const API_BASE = window.location.origin;

const state: AppState = {
    currentRoute: window.location.pathname || '/',
    products: [],
    categories: [],
    activeCategory: 'cat_all',
    searchQuery: '',
    sortBy: 'newest',
    cart: JSON.parse(localStorage.getItem('novashop_cart') || '[]'),
    user: JSON.parse(localStorage.getItem('novashop_customer_user') || 'null'),
    token: localStorage.getItem('novashop_customer_token') || '',
    activeProduct: null,
    selectedColor: '',
    selectedType: '',
    selectedVariant: null,
    selectedQty: 1,
    minPrice: null,
    maxPrice: null,
    minRating: null,
    inStock: false,
    flashSaleFilter: false,
    orders: [],
    ordersLoading: false,
    chatSessionId: localStorage.getItem('novashop_chat_session') || '',
    chatSession: null,
    chatMessages: [],
    chatOpen: false,
    chatLoading: false,
    chatPollingTimer: null,
    flashCountdownTimer: null
};

const formatPrice = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount || 0);
};

const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const showToast = (title: string, message: string, type: 'success' | 'error' | 'warning' = 'success'): void => {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        success: 'ri-checkbox-circle-line',
        error: 'ri-error-warning-line',
        warning: 'ri-alert-line'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="${icons[type] || icons.success} toast-icon" style="color: var(--${type === 'error' ? 'accent' : type});"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-desc">${message}</div>
        </div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
};

const saveCart = (): void => {
    localStorage.setItem('novashop_cart', JSON.stringify(state.cart));
    updateCartBadge();
};

const updateCartBadge = (): void => {
    const badge = document.getElementById('cartCountBadge');
    if (badge) {
        const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
        badge.textContent = totalCount.toString();
    }
};

const renderHeaderTemplate = (): string => {
    const cartCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    const userTopHtml = state.user
        ? `
        <div class="top-user-group">
            <span class="top-user-name">
                <i class="ri-user-smile-fill" style="color: #ee4d2d; font-size: 1rem;"></i>
                <span>${state.user.name}</span>
            </span>
            <span class="top-bar-divider"></span>
            <a href="/orders" class="top-bar-link" data-nav-link>
                <i class="ri-file-list-3-line"></i>
                <span>Đơn Mua</span>
            </a>
            <span class="top-bar-divider"></span>
            <button id="logoutBtn" type="button" class="top-bar-link" style="background: none; border: none; cursor: pointer; padding: 0;">
                <i class="ri-logout-box-r-line"></i>
                <span>Đăng Xuất</span>
            </button>
        </div>
        `
        : `
        <div class="top-auth-group" style="display: flex; align-items: center; gap: 10px;">
            <a href="/register" class="top-auth-link" data-nav-link>Đăng Ký</a>
            <span class="top-bar-divider"></span>
            <a href="/login" class="top-auth-link" data-nav-link>Đăng Nhập</a>
        </div>
        `;

    return `
    <header class="site-header">
        <div class="site-top-bar">
            <div class="container top-bar-container">
                <div class="top-bar-left">
                    <span class="top-bar-link">
                        <i class="ri-shield-check-fill" style="color: #ee4d2d;"></i>
                        <span>NovaShop Chính Hãng 100%</span>
                    </span>
                    <span class="top-bar-divider"></span>
                    <span class="top-bar-link">
                        <i class="ri-smartphone-line"></i>
                        <span>Tải ứng dụng</span>
                    </span>
                    <span class="top-bar-divider"></span>
                    <span class="top-bar-link">
                        <span>Kết nối</span>
                        <i class="ri-facebook-circle-fill" style="font-size: 1rem;"></i>
                        <i class="ri-instagram-fill" style="font-size: 1rem;"></i>
                    </span>
                </div>
                <div class="top-bar-right">
                    <span class="top-bar-link">
                        <i class="ri-notification-3-line"></i>
                        <span>Thông Báo</span>
                    </span>
                    <a href="/help" class="top-bar-link" data-nav-link>
                        <i class="ri-question-line"></i>
                        <span>Hỗ Trợ</span>
                    </a>
                    <span class="top-bar-divider"></span>
                    <div id="userMenuWrapper">
                        ${userTopHtml}
                    </div>
                </div>
            </div>
        </div>

        <div class="container nav-container">
            <a href="/" class="brand-logo" data-nav-link>
                <div class="brand-icon">
                    <i class="ri-shopping-bag-3-fill"></i>
                </div>
                <span>NovaShop</span>
            </a>

            <div class="search-container-group">
                <div class="search-bar-wrapper">
                    <input type="text" id="searchInput" class="search-input" placeholder="Tìm kiếm sản phẩm, thương hiệu, thiết bị số..." value="${state.searchQuery || ''}" autocomplete="off">
                    <button id="searchBtn" class="search-btn" aria-label="Tìm kiếm" type="button">
                        <i class="ri-search-line"></i>
                    </button>
                    <div id="searchSuggestionsDropdown" class="search-suggestions-dropdown"></div>
                </div>
                <div class="search-hot-keywords">
                    <span class="hot-keyword-tag" data-search-kw="Tai nghe Sony WH-1000XM5">Tai nghe Sony</span>
                    <span class="hot-keyword-tag" data-search-kw="Bàn phím cơ Keychron">Bàn phím cơ</span>
                    <span class="hot-keyword-tag" data-search-kw="Apple Watch Series 9">Apple Watch</span>
                    <span class="hot-keyword-tag" data-search-kw="Chuột Logitech MX Master">Chuột Logitech</span>
                    <span class="hot-keyword-tag" data-search-kw="Màn hình 4K LG">Màn hình 4K</span>
                    <span class="hot-keyword-tag" data-search-kw="Flash Sale">⚡ Flash Sale</span>
                </div>
            </div>

            <div class="nav-actions">
                <a href="/cart" class="cart-btn-trigger" aria-label="Giỏ hàng" data-nav-link>
                    <i class="ri-shopping-cart-2-line"></i>
                    <span id="cartCountBadge" class="cart-count">${cartCount}</span>
                </a>
            </div>
        </div>
    </header>
    `;
};

const renderFooterTemplate = (): string => {
    return `
    <footer class="site-footer">
        <div class="container">
            <div class="footer-grid">
                <div>
                    <div class="footer-brand">NovaShop</div>
                    <p class="footer-desc">
                        Nền tảng mua sắm thiết bị công nghệ & điện tử chính hãng hàng đầu, cam kết 100% hàng chất lượng cao, chính sách 1 đổi 1 và giao vận hỏa tốc toàn quốc.
                    </p>
                </div>
                <div>
                    <h3 class="footer-col-title">Về Chúng Tôi</h3>
                    <ul class="footer-links">
                        <li><a href="/about" data-nav-link>Giới thiệu công ty</a></li>
                        <li><a href="/careers" data-nav-link>Tuyển dụng</a></li>
                        <li><a href="/terms" data-nav-link>Điều khoản dịch vụ</a></li>
                        <li><a href="/privacy" data-nav-link>Chính sách bảo mật</a></li>
                    </ul>
                </div>
                <div>
                    <h3 class="footer-col-title">Hỗ Trợ Khách Hàng</h3>
                    <ul class="footer-links">
                        <li><a href="/help" data-nav-link>Trung tâm trợ giúp</a></li>
                        <li><a href="/guide" data-nav-link>Hướng dẫn mua hàng</a></li>
                        <li><a href="/shipping" data-nav-link>Chính sách vận chuyển</a></li>
                        <li><a href="/orders" data-nav-link>Tra cứu đơn hàng</a></li>
                    </ul>
                </div>
                <div>
                    <h3 class="footer-col-title">Thông Tin Liên Hệ</h3>
                    <p class="footer-desc">Hotline CSKH: 1900 8888 (8:00 - 21:30)</p>
                    <p class="footer-desc">Email hỗ trợ: support@novashop.vn</p>
                    <p class="footer-desc">Địa chỉ trụ sở: Hà Nội & TP. Hồ Chí Minh</p>
                </div>
            </div>
            <div class="footer-bottom">
                <div>&copy; 2026 NovaShop. Bảo lưu mọi quyền.</div>
                <div>Hệ thống mua sắm công nghệ số tin cậy hàng đầu Việt Nam</div>
            </div>
        </div>
    </footer>
    `;
};

const renderAboutView = (): string => {
    return `
    ${renderHeaderTemplate()}
    <main class="static-page-main">
        <div class="static-container">
            <div class="static-hero">
                <div class="static-hero-badge"><i class="ri-information-line"></i> Giới thiệu NovaShop</div>
                <h1 class="static-hero-title">NovaShop - Định Chuẩn Mua Sắm Công Nghệ Chính Hãng</h1>
                <p class="static-hero-subtitle">
                    Hệ thống bán lẻ thiết bị số, điện thoại, máy tính bảng và phụ kiện công nghệ hàng đầu, mang đến cho người tiêu dùng trải nghiệm tiện ích, tốc độ và cam kết chất lượng tuyệt đối.
                </p>
            </div>

            <div class="static-card">
                <h2 class="static-card-title"><i class="ri-rocket-line"></i> Câu Chuyện Thương Hiệu</h2>
                <div class="static-card-content">
                    <p>
                        Được thành lập với sứ mệnh xóa bỏ rào cản về giá và nguồn gốc xuất xứ của các thiết bị công nghệ tại Việt Nam, NovaShop định vị là cửa hàng trực tiếp nhập khẩu và phân phối sản phẩm chính hãng 100% trực tiếp đến tận tay người tiêu dùng.
                    </p>
                    <p>
                        Chúng tôi tập trung tối ưu hóa chi phí vận hành thông qua nền tảng công nghệ số hiện đại và hệ thống kho vận thông minh, từ đó mang đến mức giá ưu đãi nhất cùng chính sách hậu mãi vượt trội trên thị trường.
                    </p>
                </div>

                <div class="static-feature-grid">
                    <div class="static-feature-box">
                        <div class="static-feature-icon"><i class="ri-shield-check-line"></i></div>
                        <h4>100% Chính Hãng</h4>
                        <p>Tất cả sản phẩm đều có tem bảo hành chính hãng và hóa đơn VAT điện tử minh bạch.</p>
                    </div>
                    <div class="static-feature-box">
                        <div class="static-feature-icon"><i class="ri-refresh-line"></i></div>
                        <h4>Đổi Trả Trong 7 Ngày</h4>
                        <p>Chính sách 1 đổi 1 nhanh chóng ngay tại nhà nếu sản phẩm phát sinh lỗi từ nhà sản xuất.</p>
                    </div>
                    <div class="static-feature-box">
                        <div class="static-feature-icon"><i class="ri-truck-line"></i></div>
                        <h4>Giao Vận Siêu Tốc</h4>
                        <p>Giao hàng trong vòng 2 giờ tại nội thành Hà Nội, TP.HCM và 1-3 ngày trên cả nước.</p>
                    </div>
                    <div class="static-feature-box">
                        <div class="static-feature-icon"><i class="ri-customer-service-2-line"></i></div>
                        <h4>Tư Vấn Chuyên Sâu 24/7</h4>
                        <p>Đội ngũ kỹ thuật viên am hiểu công nghệ sẵn sàng tư vấn chi tiết từng dòng sản phẩm.</p>
                    </div>
                </div>
            </div>

            <div class="static-card">
                <h2 class="static-card-title"><i class="ri-flag-line"></i> Tầm Nhìn & Sứ Mệnh</h2>
                <div class="static-card-content">
                    <p>
                        <strong>Tầm nhìn:</strong> Trở thành thương hiệu mua sắm thiết bị điện tử trực tuyến uy tín và được yêu thích nhất tại Việt Nam vào năm 2030, tiên phong ứng dụng trí tuệ nhân tạo và tự động hóa trong logistics.
                    </p>
                    <p>
                        <strong>Sứ mệnh:</strong> Nâng cao chất lượng cuộc sống số của người Việt thông qua những sản phẩm công nghệ tiên tiến nhất với chi phí hợp lý và dịch vụ khách hàng tận tâm.
                    </p>
                </div>
            </div>
        </div>
    </main>
    ${renderFooterTemplate()}
    `;
};

const renderCareersView = (): string => {
    return `
    ${renderHeaderTemplate()}
    <main class="static-page-main">
        <div class="static-container">
            <div class="static-hero">
                <div class="static-hero-badge"><i class="ri-briefcase-line"></i> Cơ hội nghề nghiệp</div>
                <h1 class="static-hero-title">Gia Nhập Đội Ngũ Nhân Sự NovaShop</h1>
                <p class="static-hero-subtitle">
                    Chúng tôi luôn tìm kiếm những tài năng đam mê công nghệ, sáng tạo và có tinh thần phụng sự khách hàng để cùng nhau kiến tạo tương lai thương mại điện tử thế hệ mới.
                </p>
            </div>

            <div class="static-card">
                <h2 class="static-card-title"><i class="ri-heart-pulse-line"></i> Vì Sao Bạn Nên Chọn NovaShop?</h2>
                <div class="static-card-content">
                    <p>
                        Tại NovaShop, chúng tôi đề cao sự tự chủ, học hỏi không ngừng và tinh thần cộng tác cởi mở. Mọi ý tưởng đổi mới sáng tạo đều được lắng nghe và thử nghiệm thực tế.
                    </p>
                </div>
                <div class="static-feature-grid">
                    <div class="static-feature-box">
                        <div class="static-feature-icon"><i class="ri-money-dollar-circle-line"></i></div>
                        <h4>Thu Nhập Cạnh Tranh</h4>
                        <p>Lương cứng hấp dẫn theo năng lực, thưởng hiệu quả kinh doanh và đánh giá tăng lương 2 lần/năm.</p>
                    </div>
                    <div class="static-feature-box">
                        <div class="static-feature-icon"><i class="ri-macbook-line"></i></div>
                        <h4>Thiết Bị Làm Việc Hiện Đại</h4>
                        <p>Được cấp MacBook Pro / Laptop đồ họa cấu hình cao cùng màn hình 4K làm việc thoải mái.</p>
                    </div>
                    <div class="static-feature-box">
                        <div class="static-feature-icon"><i class="ri-health-book-line"></i></div>
                        <h4>Bảo Hiểm Sức Khỏe Toàn Diện</h4>
                        <p>Gói bảo hiểm chăm sóc sức khỏe quốc tế cao cấp cho nhân viên và chính sách hỗ trợ gia đình.</p>
                    </div>
                    <div class="static-feature-box">
                        <div class="static-feature-icon"><i class="ri-plane-line"></i></div>
                        <h4>Du Lịch & Nghỉ Dưỡng Hàng Năm</h4>
                        <p>Các chuyến đi nghỉ dưỡng hàng năm tại các resort cao cấp và nhiều hoạt động thể thao gắn kết.</p>
                    </div>
                </div>
            </div>

            <div class="static-card">
                <h2 class="static-card-title"><i class="ri-fire-line"></i> Các Vị Trí Đang Tuyển Dụng</h2>
                <div class="job-item">
                    <div>
                        <div class="job-title">Senior Frontend Developer (TypeScript / Modern Web)</div>
                        <div class="job-tags">
                            <span class="job-tag">Hà Nội / Toàn thời gian</span>
                            <span class="job-tag">25 - 40 Triệu VNĐ</span>
                            <span class="job-tag">Kinh nghiệm 3+ năm</span>
                        </div>
                    </div>
                    <a href="mailto:careers@novashop.vn?subject=Ứng tuyển Senior Frontend Developer" class="btn btn-primary btn-sm">Ứng tuyển ngay</a>
                </div>

                <div class="job-item">
                    <div>
                        <div class="job-title">Node.js Microservices Engineer</div>
                        <div class="job-tags">
                            <span class="job-tag">TP.HCM / Toàn thời gian</span>
                            <span class="job-tag">28 - 45 Triệu VNĐ</span>
                            <span class="job-tag">API Gateway & Distributed Systems</span>
                        </div>
                    </div>
                    <a href="mailto:careers@novashop.vn?subject=Ứng tuyển Node.js Microservices Engineer" class="btn btn-primary btn-sm">Ứng tuyển ngay</a>
                </div>

                <div class="job-item">
                    <div>
                        <div class="job-title">Chuyên Viên Tư Vấn & Chăm Sóc Khách Hàng (CSKH)</div>
                        <div class="job-tags">
                            <span class="job-tag">Hà Nội & TP.HCM</span>
                            <span class="job-tag">10 - 16 Triệu VNĐ</span>
                            <span class="job-tag">Linh hoạt theo ca</span>
                        </div>
                    </div>
                    <a href="mailto:careers@novashop.vn?subject=Ứng tuyển Chuyên Viên CSKH" class="btn btn-primary btn-sm">Ứng tuyển ngay</a>
                </div>

                <div class="job-item">
                    <div>
                        <div class="job-title">Quản Lý Kho Vận & Điều Phối Đơn Hàng Logistics</div>
                        <div class="job-tags">
                            <span class="job-tag">Tổng kho Hà Nội</span>
                            <span class="job-tag">14 - 20 Triệu VNĐ</span>
                            <span class="job-tag">Kinh nghiệm kho bãi</span>
                        </div>
                    </div>
                    <a href="mailto:careers@novashop.vn?subject=Ứng tuyển Quản Lý Kho Vận" class="btn btn-primary btn-sm">Ứng tuyển ngay</a>
                </div>

                <p style="margin-top: 20px; font-size: 0.875rem; color: var(--text-muted); text-align: center;">
                    Gửi CV ứng tuyển trực tiếp về email: <strong>careers@novashop.vn</strong> (Tiêu đề: [Họ Tên] - [Vị Trí Ứng Tuyển])
                </p>
            </div>
        </div>
    </main>
    ${renderFooterTemplate()}
    `;
};

const renderTermsView = (): string => {
    return `
    ${renderHeaderTemplate()}
    <main class="static-page-main">
        <div class="static-container">
            <div class="static-hero">
                <div class="static-hero-badge"><i class="ri-file-text-line"></i> Quy chế & Chính sách</div>
                <h1 class="static-hero-title">Điều Khoản Dịch Vụ NovaShop</h1>
                <p class="static-hero-subtitle">
                    Vui lòng đọc kỹ các điều khoản dưới đây trước khi thực hiện đặt hàng và sử dụng các dịch vụ mua sắm tại NovaShop.
                </p>
            </div>

            <div class="static-card">
                <h2 class="static-card-title"><i class="ri-checkbox-circle-line"></i> 1. Quy Định Chung</h2>
                <div class="static-card-content">
                    <p>
                        Bằng việc truy cập, tạo tài khoản hoặc đặt hàng tại NovaShop, khách hàng xác nhận đã đọc, hiểu và đồng ý tuân thủ toàn bộ các quy định tại văn bản điều khoản này cũng như các chính sách liên quan được công bố trên website.
                    </p>
                    <p>
                        NovaShop có quyền thay đổi, chỉnh sửa hoặc cập nhật nội dung điều khoản bất kỳ lúc nào để phù hợp với quy định pháp luật và hoạt động thực tế. Các thay đổi sẽ có hiệu lực ngay khi đăng tải.
                    </p>
                </div>
            </div>

            <div class="static-card">
                <h2 class="static-card-title"><i class="ri-shopping-cart-2-line"></i> 2. Đặt Hàng & Xác Nhận Giao Dịch</h2>
                <div class="static-card-content">
                    <p>
                        Khách hàng cần cung cấp đầy đủ và chính xác các thông tin bao gồm: Họ và tên, số điện thoại, địa chỉ nhận hàng và phương thức thanh toán để bảo đảm quyền lợi giao nhận.
                    </p>
                    <p>
                        Đơn hàng chỉ được xem là xác nhận thành công sau khi hệ thống NovaShop ghi nhận và gửi thông báo mã đơn hàng qua giao diện hoặc nhân viên liên hệ xác thực. NovaShop có quyền từ chối các đơn hàng có dấu hiệu gian lận hoặc thông tin liên lạc không hợp lệ.
                    </p>
                </div>
            </div>

            <div class="static-card">
                <h2 class="static-card-title"><i class="ri-bank-card-line"></i> 3. Giá Cả & Phương Thức Thanh Toán</h2>
                <div class="static-card-content">
                    <p>
                        Giá bán sản phẩm hiển thị trên website là giá cuối cùng đã bao gồm thuế Giá Trị Gia Tăng (VAT). Chi phí vận chuyển (nếu có) sẽ được hiển thị rõ ràng tại bước xác nhận giỏ hàng.
                    </p>
                    <p>
                        Chúng tôi hỗ trợ 2 hình thức thanh toán chính: Thanh toán khi nhận hàng (COD) và Chuyển khoản ngân hàng trực tiếp. Quý khách có quyền đồng kiểm bao bì sản phẩm trước khi thanh toán cho nhân viên bưu tá.
                    </p>
                </div>
            </div>

            <div class="static-card">
                <h2 class="static-card-title"><i class="ri-scales-3-line"></i> 4. Giải Quyết Tranh Chấp & Khiếu Nại</h2>
                <div class="static-card-content">
                    <p>
                        NovaShop luôn sẵn sàng lắng nghe và ưu tiên thương lượng hòa giải đối với mọi khiếu nại của khách hàng. Trong trường hợp không đạt được thỏa thuận chung, vụ việc sẽ được đưa ra cơ quan có thẩm quyền theo luật pháp Việt Nam.
                    </p>
                </div>
            </div>
        </div>
    </main>
    ${renderFooterTemplate()}
    `;
};

const renderPrivacyView = (): string => {
    return `
    ${renderHeaderTemplate()}
    <main class="static-page-main">
        <div class="static-container">
            <div class="static-hero">
                <div class="static-hero-badge"><i class="ri-shield-keyhole-line"></i> Bảo mật thông tin</div>
                <h1 class="static-hero-title">Chính Sách Bảo Mật Quyền Riêng Tư</h1>
                <p class="static-hero-subtitle">
                    NovaShop cam kết bảo mật 100% dữ liệu cá nhân của người tiêu dùng theo các tiêu chuẩn kỹ thuật số và quy định pháp luật an ninh mạng hiện hành.
                </p>
            </div>

            <div class="static-card">
                <h2 class="static-card-title"><i class="ri-database-2-line"></i> 1. Mục Đích Thu Thập Thông Tin Cá Nhân</h2>
                <div class="static-card-content">
                    <p>
                        Chúng tôi chỉ thu thập các thông tin thiết yếu phục vụ cho quy trình đặt hàng và hỗ trợ sau bán hàng: Họ tên, số điện thoại, địa chỉ nhận hàng và địa chỉ email.
                    </p>
                    <p>
                        Mục đích sử dụng: Xử lý giao đơn hàng đến đúng địa chỉ, thông báo trạng thái đơn hàng, gửi hóa đơn bảo hành điện tử và hỗ trợ xử lý khiếu nại kỹ thuật.
                    </p>
                </div>
            </div>

            <div class="static-card">
                <h2 class="static-card-title"><i class="ri-lock-line"></i> 2. Cam Kết Bảo Vệ & Không Chia Sẻ Dữ Liệu</h2>
                <div class="static-card-content">
                    <p>
                        NovaShop cam kết tuyệt đối không bán, cho thuê hoặc chia sẻ dữ liệu người dùng cho bất kỳ bên thứ ba nào vì mục đích quảng cáo hoặc tiếp thị không mong muốn.
                    </p>
                    <p>
                        Thông tin giao hàng chỉ được cung cấp cho các đối tác vận chuyển ủy quyền (Viettel Post, GHTK, GHN) để thực hiện nhiệm vụ phát bưu kiện tới địa chỉ của quý khách.
                    </p>
                </div>
            </div>

            <div class="static-card">
                <h2 class="static-card-title"><i class="ri-user-settings-line"></i> 3. Quyền Của Khách Hàng</h2>
                <div class="static-card-content">
                    <p>
                        Khách hàng có toàn quyền kiểm tra, cập nhật, điều chỉnh hoặc yêu cầu NovaShop hủy bỏ thông tin cá nhân của mình bất kỳ lúc nào bằng cách đăng nhập vào tài khoản hoặc liên hệ trực tiếp tới tổng đài CSKH 1900 8888.
                    </p>
                </div>
            </div>
        </div>
    </main>
    ${renderFooterTemplate()}
    `;
};

const renderHelpView = (): string => {
    return `
    ${renderHeaderTemplate()}
    <main class="static-page-main">
        <div class="static-container">
            <div class="static-hero">
                <div class="static-hero-badge"><i class="ri-questionnaire-line"></i> Trợ giúp & FAQ</div>
                <h1 class="static-hero-title">Trung Tâm Trợ Giúp Khách Hàng</h1>
                <p class="static-hero-subtitle">
                    Tìm kiếm câu trả lời nhanh chóng cho các thắc mắc thường gặp về đặt hàng, thanh toán, vận chuyển và chế độ bảo hành tại NovaShop.
                </p>
            </div>

            <div class="static-card">
                <h2 class="static-card-title"><i class="ri-question-answer-line"></i> Câu Hỏi Thường Gặp (FAQ)</h2>
                <div class="faq-list">
                    <div class="faq-item">
                        <div class="faq-question">
                            <span>1. Làm thế nào để đặt hàng tại NovaShop?</span>
                            <i class="ri-arrow-down-s-line"></i>
                        </div>
                        <div class="faq-answer">
                            Bạn chỉ cần tìm sản phẩm mong muốn qua thanh tìm kiếm, chọn số lượng và nhấn "Thêm vào giỏ" hoặc "Mua ngay". Sau đó vào giỏ hàng điền thông tin người nhận và chọn hình thức thanh toán để hoàn tất.
                        </div>
                    </div>

                    <div class="faq-item">
                        <div class="faq-question">
                            <span>2. NovaShop chấp nhận những phương thức thanh toán nào?</span>
                            <i class="ri-arrow-down-s-line"></i>
                        </div>
                        <div class="faq-answer">
                            Chúng tôi hỗ trợ 2 hình thức: Thanh toán khi nhận hàng (COD - Tiền mặt) và Chuyển khoản ngân hàng trực tiếp qua mã QR thanh toán nhanh.
                        </div>
                    </div>

                    <div class="faq-item">
                        <div class="faq-question">
                            <span>3. Thời gian giao hàng là bao lâu và phí ship tính thế nào?</span>
                            <i class="ri-arrow-down-s-line"></i>
                        </div>
                        <div class="faq-answer">
                            Đơn hàng nội thành Hà Nội & TP.HCM được giao trong ngày (hoặc hỏa tốc 2 giờ). Các tỉnh khác nhận hàng sau 1 - 3 ngày làm việc. Phí ship đồng giá 30.000đ và hoàn toàn miễn phí cho đơn hàng từ 500.000đ trở lên.
                        </div>
                    </div>

                    <div class="faq-item">
                        <div class="faq-question">
                            <span>4. Tôi có được mở hộp kiểm tra hàng trước khi trả tiền không?</span>
                            <i class="ri-arrow-down-s-line"></i>
                        </div>
                        <div class="faq-answer">
                            Có. NovaShop áp dụng chính sách đồng kiểm: Khách hàng được quyền mở kiện hàng kiểm tra ngoại quan máy, phụ kiện đi kèm trước khi thanh toán cho bưu tá.
                        </div>
                    </div>

                    <div class="faq-item">
                        <div class="faq-question">
                            <span>5. Chính sách bảo hành và đổi trả trong trường hợp sản phẩm bị lỗi?</span>
                            <i class="ri-arrow-down-s-line"></i>
                        </div>
                        <div class="faq-answer">
                            Tất cả sản phẩm lỗi kỹ thuật do nhà sản xuất trong vòng 7 ngày đầu tiên đều được áp dụng chính sách 1 đổi 1 mới 100%. Sau 7 ngày, sản phẩm được tiếp nhận bảo hành chính hãng từ 12 đến 24 tháng theo tiêu chuẩn của nhà máy.
                        </div>
                    </div>
                </div>
            </div>

            <div class="static-card">
                <h2 class="static-card-title"><i class="ri-headphone-line"></i> Cần Hỗ Trợ Trực Tiếp?</h2>
                <div class="static-card-content">
                    <p>Nếu bạn không tìm thấy câu trả lời cho vấn đề của mình, hãy liên hệ ngay với đội ngũ chăm sóc khách hàng của chúng tôi:</p>
                </div>
                <div class="static-feature-grid">
                    <div class="static-feature-box">
                        <div class="static-feature-icon"><i class="ri-phone-line"></i></div>
                        <h4>Tổng Đài CSKH</h4>
                        <p>1900 8888 (Hoạt động 8:00 - 21:30 hàng ngày, kể cả T7 & CN)</p>
                    </div>
                    <div class="static-feature-box">
                        <div class="static-feature-icon"><i class="ri-mail-send-line"></i></div>
                        <h4>Email Hỗ Trợ</h4>
                        <p>support@novashop.vn (Phản hồi giải quyết trong vòng 2 giờ làm việc)</p>
                    </div>
                    <div class="static-feature-box">
                        <div class="static-feature-icon"><i class="ri-chat-smile-2-line"></i></div>
                        <h4>Trợ Lý AI Trực Tuyến</h4>
                        <p>Bấm vào biểu tượng Chat AI ở góc dưới bên phải để nhận tư vấn tức thì</p>
                    </div>
                </div>
            </div>
        </div>
    </main>
    ${renderFooterTemplate()}
    `;
};

const renderGuideView = (): string => {
    return `
    ${renderHeaderTemplate()}
    <main class="static-page-main">
        <div class="static-container">
            <div class="static-hero">
                <div class="static-hero-badge"><i class="ri-book-open-line"></i> Hướng dẫn</div>
                <h1 class="static-hero-title">Hướng Dẫn Mua Hàng & Đặt Hàng Trực Tuyến</h1>
                <p class="static-hero-subtitle">
                    Quy trình mua sắm 4 bước đơn giản, nhanh chóng và an toàn tại hệ thống thương mại điện tử NovaShop.
                </p>
            </div>

            <div class="static-card">
                <h2 class="static-card-title"><i class="ri-list-ordered"></i> 4 Bước Đặt Hàng Nhanh Chóng</h2>
                <div class="static-step-list">
                    <div class="static-step-item">
                        <div class="static-step-number">1</div>
                        <div class="static-step-info">
                            <h4>Tìm kiếm & Lựa chọn sản phẩm</h4>
                            <p>Nhập tên sản phẩm, dòng máy hoặc thương hiệu vào thanh tìm kiếm hoặc khám phá theo danh mục sản phẩm. Bấm vào sản phẩm để xem hình ảnh sắc nét, cấu hình chi tiết và các đánh giá thực tế.</p>
                        </div>
                    </div>

                    <div class="static-step-item">
                        <div class="static-step-number">2</div>
                        <div class="static-step-info">
                            <h4>Thêm vào Giỏ Hàng & Kiểm tra số lượng</h4>
                            <p>Chọn số lượng sản phẩm mong muốn rồi bấm "Thêm vào giỏ" hoặc chọn "Mua ngay" để đến thẳng trang thanh toán. Bạn có thể kiểm tra lại danh sách các món đồ trong giỏ hàng bất kỳ lúc nào.</p>
                        </div>
                    </div>

                    <div class="static-step-item">
                        <div class="static-step-number">3</div>
                        <div class="static-step-info">
                            <h4>Điền thông tin giao nhận & Chọn hình thức thanh toán</h4>
                            <p>Nhập chính xác Họ tên, Số điện thoại và Địa chỉ giao hàng cụ thể. Sau đó lựa chọn phương thức thanh toán phù hợp: Thanh toán khi nhận hàng (COD) hoặc Chuyển khoản ngân hàng.</p>
                        </div>
                    </div>

                    <div class="static-step-item">
                        <div class="static-step-number">4</div>
                        <div class="static-step-info">
                            <h4>Xác nhận đơn hàng & Theo dõi lộ trình vận chuyển</h4>
                            <p>Bấm "Hoàn tất đặt hàng". Mã đơn hàng sẽ được khởi tạo ngay lập tức. Bạn có thể truy cập mục "Đơn mua" trên thanh điều hướng để theo dõi tiến độ chuẩn bị hàng và giao hàng từng bước.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="static-card">
                <h2 class="static-card-title"><i class="ri-shield-star-line"></i> Lưu Ý Quan Trọng Khi Nhận Hàng</h2>
                <div class="static-card-content">
                    <p>
                        Khi nhân viên giao hàng tới, bạn hãy kiểm tra tem niêm phong bên ngoài hộp kiện hàng. Hãy đảm bảo tem nguyên vẹn, không có dấu hiệu bị rách hoặc bóc trước khi ký nhận.
                    </p>
                    <p>
                        Khách hàng nên quay video ngắn quá trình khui hộp kiện hàng để làm cơ sở đối chiếu giải quyết nhanh nhất trong trường hợp hy hữu xảy ra lỗi hoặc thất lạc phụ kiện.
                    </p>
                </div>
            </div>
        </div>
    </main>
    ${renderFooterTemplate()}
    `;
};

const renderShippingView = (): string => {
    return `
    ${renderHeaderTemplate()}
    <main class="static-page-main">
        <div class="static-container">
            <div class="static-hero">
                <div class="static-hero-badge"><i class="ri-truck-line"></i> Vận chuyển & Giao nhận</div>
                <h1 class="static-hero-title">Chính Sách Vận Chuyển Toàn Quốc</h1>
                <p class="static-hero-subtitle">
                    Cam kết giao hàng đúng hẹn, đóng gói cẩn thận chống sốc và bảo hiểm 100% giá trị sản phẩm trong suốt hành trình vận chuyển.
                </p>
            </div>

            <div class="static-card">
                <h2 class="static-card-title"><i class="ri-price-tag-3-line"></i> Biểu Phí Vận Chuyển</h2>
                <div class="static-feature-grid">
                    <div class="static-feature-box">
                        <div class="static-feature-icon"><i class="ri-gift-line"></i></div>
                        <h4>Miễn Phí Vận Chuyển</h4>
                        <p>Áp dụng tự động cho tất cả đơn hàng có tổng giá trị từ 500.000 VNĐ trở lên trên phạm vi cả nước.</p>
                    </div>
                    <div class="static-feature-box">
                        <div class="static-feature-icon"><i class="ri-money-cny-box-line"></i></div>
                        <h4>Đồng Giá 30.000 VNĐ</h4>
                        <p>Áp dụng cho các đơn hàng có giá trị dưới 500.000 VNĐ tại mọi tỉnh thành không phân biệt vùng miền.</p>
                    </div>
                </div>
            </div>

            <div class="static-card">
                <h2 class="static-card-title"><i class="ri-time-line"></i> Thời Gian Giao Hàng Dự Kiến</h2>
                <div class="static-card-content">
                    <p>
                        <strong>Khu vực Nội thành Hà Nội & TP. Hồ Chí Minh:</strong> Đơn hàng được xử lý và giao ngay trong ngày (hoặc hỏa tốc trong 2 đến 4 giờ theo yêu cầu).
                    </p>
                    <p>
                        <strong>Khu vực Ngoại thành & Các tỉnh thành lân cận:</strong> Thời gian phát hàng từ 1 đến 2 ngày làm việc.
                    </p>
                    <p>
                        <strong>Các tỉnh miền Trung, Tây Nguyên & Vùng xa:</strong> Thời gian giao hàng từ 2 đến 3 ngày làm việc thông qua các đơn vị chuyển phát nhanh hàng đầu (Viettel Post, GHN).
                    </p>
                </div>
            </div>

            <div class="static-card">
                <h2 class="static-card-title"><i class="ri-box-3-line"></i> Quy Chuẩn Đóng Gói Chống Va Đập</h2>
                <div class="static-card-content">
                    <p>
                        Mọi sản phẩm công nghệ trước khi xuất kho đều được bọc 3 lớp màng bóng khí chống sốc chuyên dụng, đặt trong thùng carton cứng có chèn đệm góc và dán tem cảnh báo hàng dễ vỡ nguyên vẹn.
                    </p>
                    <p>
                        Toàn bộ đơn hàng đều được mua bảo hiểm hàng hóa 100%. Nếu xảy ra trường hợp móp méo, ướt hoặc hư hỏng trong quá trình vận chuyển, NovaShop cam kết đổi mới ngay lập tức cho quý khách mà không phát sinh bất kỳ khoản phí nào.
                    </p>
                </div>
            </div>
        </div>
    </main>
    ${renderFooterTemplate()}
    `;
};

const renderChatWidgetTemplate = (): string => {
    return `
    <button id="chatLauncherBtn" class="chat-launcher-btn" aria-label="Mở live chat hỗ trợ khách hàng" type="button">
        <i class="ri-customer-service-2-fill"></i>
        <span class="chat-launcher-badge"></span>
    </button>

    <div id="chatWidgetWindow" class="chat-widget-window ${state.chatOpen ? 'active' : ''}">
        <div class="chat-header">
            <div class="chat-header-info">
                <div class="chat-avatar-box">
                    <i class="ri-robot-2-line"></i>
                    <span class="chat-avatar-status"></span>
                </div>
                <div>
                    <div class="chat-header-title">
                        <span id="chatTitleText">NovaBot AI</span>
                        <span id="chatModeBadge" class="chat-ai-pill">GEMINI AI</span>
                    </div>
                    <div id="chatSubtitleText" class="chat-header-subtitle">Trợ lý mua sắm trực tuyến 24/7</div>
                </div>
            </div>
            <div class="chat-header-actions">
                <button id="chatModeToggleBtn" class="chat-mode-toggle-btn" title="Chuyển chế độ chat" type="button">
                    <i class="ri-user-voice-line"></i>
                    <span id="chatModeToggleLabel">Gặp CSKH</span>
                </button>
                <button id="chatCloseBtn" class="chat-close-btn" title="Đóng khung chat" type="button">
                    <i class="ri-close-line"></i>
                </button>
            </div>
        </div>

        <div class="chat-quick-suggestions">
            <button class="quick-chip-btn" data-query="Tư vấn tai nghe Bluetooth chống ồn" type="button">🎧 Tai nghe chống ồn</button>
            <button class="quick-chip-btn" data-query="Gợi ý bàn phím cơ gõ êm" type="button">⌨️ Bàn phím cơ</button>
            <button class="quick-chip-btn" data-query="Các sản phẩm đang Flash Sale hôm nay?" type="button">🔥 Flash Sale</button>
            <button class="quick-chip-btn" data-query="Chính sách bảo hành và đổi trả như thế nào?" type="button">🛡️ Bảo hành 7 ngày</button>
            <button class="quick-chip-btn" data-query="Giao hàng bao lâu thì nhận được?" type="button">🚀 Thời gian giao hàng</button>
        </div>

        <div id="chatMessagesContainer" class="chat-messages-container"></div>

        <div class="chat-footer">
            <form id="chatMessageForm" class="chat-input-row">
                <input type="text" id="chatInput" class="chat-input" placeholder="Nhập câu hỏi hoặc cần tư vấn sản phẩm..." autocomplete="off">
                <button type="submit" id="chatSendBtn" class="chat-send-btn" aria-label="Gửi tin nhắn">
                    <i class="ri-send-plane-fill"></i>
                </button>
            </form>
            <div class="chat-footer-caption">
                <i class="ri-sparkling-fill" style="color: #38bdf8;"></i>
                <span>Được hỗ trợ bởi Google Gemini AI • NovaShop 2026</span>
            </div>
        </div>
    </div>
    `;
};

const renderStorefrontView = (): string => {
    return `
    ${renderHeaderTemplate()}

    <main>
        <section class="shopee-banner-section">
            <div class="container">
                <div class="shopee-banner-grid">
                    <div class="shopee-main-slider">
                        <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&q=80" alt="Banner Siêu Sale" class="shopee-slider-bg">
                        <div class="shopee-slider-content">
                            <div class="shopee-slider-tag">
                                <i class="ri-flashlight-fill" style="color: #ffd839;"></i> SIÊU SALE CÔNG NGHỆ 2026
                            </div>
                            <h2 class="shopee-slider-title">Giảm Đến 50%<br>Hàng Hiệu NovaMall</h2>
                            <p class="shopee-slider-desc">Voucher giảm thêm 100K • Miễn phí vận chuyển toàn quốc 0Đ</p>
                            <a href="#flashSaleSection" class="btn btn-primary btn-sm">
                                <span>Săn Deal Chớp Nhoáng</span>
                                <i class="ri-arrow-right-line"></i>
                            </a>
                        </div>
                    </div>
                    <div class="shopee-sub-banners">
                        <a href="#productsSection" class="shopee-sub-banner-item shopee-sub-banner-1">
                            <div>
                                <div class="shopee-sub-banner-title">👑 NovaMall Chính Hãng</div>
                                <div class="shopee-sub-banner-desc">100% chính hãng • Đổi trả miễn phí 7 ngày</div>
                            </div>
                        </a>
                        <a href="#flashSaleSection" class="shopee-sub-banner-item shopee-sub-banner-2">
                            <div>
                                <div class="shopee-sub-banner-title">⚡ Flash Sale Mỗi Ngày</div>
                                <div class="shopee-sub-banner-desc">Khung giờ vàng giá sốc từ 99K</div>
                            </div>
                        </a>
                    </div>
                </div>

                <div class="shopee-quick-services">
                    <a href="#flashSaleSection" class="quick-service-item">
                        <div class="quick-service-icon-box" style="background: #fee2e2; color: #ef4444;">
                            <i class="ri-flashlight-fill"></i>
                        </div>
                        <span class="quick-service-label">Flash Sale</span>
                    </a>
                    <a href="#productsSection" class="quick-service-item" data-service-toast="Mã Giảm Giá: Đã lưu voucher giảm 50% vào ví của bạn!">
                        <div class="quick-service-icon-box" style="background: #fef3c7; color: #f59e0b;">
                            <i class="ri-ticket-2-fill"></i>
                        </div>
                        <span class="quick-service-label">Mã Giảm Giá</span>
                    </a>
                    <a href="#productsSection" class="quick-service-item" data-service-toast="Freeship Xtra: Áp dụng miễn phí vận chuyển 0Đ cho mọi đơn hàng!">
                        <div class="quick-service-icon-box" style="background: #dcfce7; color: #10b981;">
                            <i class="ri-truck-fill"></i>
                        </div>
                        <span class="quick-service-label">Freeship Xtra</span>
                    </a>
                    <a href="#productsSection" class="quick-service-item" data-service-toast="NovaMall: Gian hàng chính hãng cam kết đền bù 200% nếu phát hiện hàng giả!">
                        <div class="quick-service-icon-box" style="background: #ede9fe; color: #8b5cf6;">
                            <i class="ri-vip-crown-fill"></i>
                        </div>
                        <span class="quick-service-label">NovaMall</span>
                    </a>
                    <a href="#productsSection" class="quick-service-item" data-quick-category="cat_electronics">
                        <div class="quick-service-icon-box" style="background: #e0f2fe; color: #0284c7;">
                            <i class="ri-headphone-fill"></i>
                        </div>
                        <span class="quick-service-label">Điện Tử</span>
                    </a>
                    <a href="#productsSection" class="quick-service-item" data-quick-category="cat_fashion">
                        <div class="quick-service-icon-box" style="background: #fce7f3; color: #ec4899;">
                            <i class="ri-t-shirt-fill"></i>
                        </div>
                        <span class="quick-service-label">Thời Trang</span>
                    </a>
                    <a href="#productsSection" class="quick-service-item" data-quick-category="cat_home">
                        <div class="quick-service-icon-box" style="background: #fae8ff; color: #a855f7;">
                            <i class="ri-home-wifi-fill"></i>
                        </div>
                        <span class="quick-service-label">Gia Dụng</span>
                    </a>
                    <a href="#productsSection" class="quick-service-item" data-quick-category="cat_books">
                        <div class="quick-service-icon-box" style="background: #ffedd5; color: #f97316;">
                            <i class="ri-book-open-fill"></i>
                        </div>
                        <span class="quick-service-label">Sách Hay</span>
                    </a>
                </div>
            </div>
        </section>

        <section class="category-nav-strip">
            <div class="container">
                <div id="categoryTabs" class="category-tabs"></div>
            </div>
        </section>

        <section id="flashSaleSection" class="flash-sale-section">
            <div class="container">
                <div class="flash-sale-header">
                    <div class="flash-sale-title-group">
                        <div class="flash-sale-badge">
                            <i class="ri-flashlight-fill"></i> FLASH SALE
                        </div>
                        <div class="flash-sale-countdown">
                            <span class="countdown-label">KẾT THÚC TRONG</span>
                            <div class="countdown-timer">
                                <span id="flashHour" class="timer-box">02</span>
                                <span class="timer-sep">:</span>
                                <span id="flashMin" class="timer-box">45</span>
                                <span class="timer-sep">:</span>
                                <span id="flashSec" class="timer-box">18</span>
                            </div>
                        </div>
                    </div>
                    <a href="#productsSection" class="flash-sale-view-all">
                        <span>Xem tất cả</span>
                        <i class="ri-arrow-right-s-line"></i>
                    </a>
                </div>
                <div id="flashSaleGrid" class="flash-sale-grid"></div>
            </div>
        </section>

        <section id="productsSection" class="shop-section">
            <div class="container">
                <div class="shop-toolbar">
                    <div class="shop-title-area">
                        <h2 class="shop-heading">Danh Sách Sản Phẩm</h2>
                        <span id="productTotalCount" class="shop-count">Đang tải dữ liệu...</span>
                    </div>
                    <div class="shop-filter-controls">
                        <select id="sortSelect" class="sort-select">
                            <option value="newest" ${state.sortBy === 'newest' ? 'selected' : ''}>Mới nhất</option>
                            <option value="popular" ${state.sortBy === 'popular' ? 'selected' : ''}>Bán chạy nhất (Phổ biến)</option>
                            <option value="price-asc" ${state.sortBy === 'price-asc' ? 'selected' : ''}>Giá: Thấp đến Cao</option>
                            <option value="price-desc" ${state.sortBy === 'price-desc' ? 'selected' : ''}>Giá: Cao đến Thấp</option>
                            <option value="rating" ${state.sortBy === 'rating' ? 'selected' : ''}>Đánh giá cao nhất</option>
                        </select>
                    </div>
                </div>

                <div class="filter-panel-card">
                    <div id="searchActiveBanner" class="search-active-banner" style="display: ${state.searchQuery ? 'flex' : 'none'};">
                        <div>
                            <i class="ri-search-2-line"></i>
                            <span>Kết quả tìm kiếm cho: <strong id="searchKeywordDisplay">"${state.searchQuery}"</strong></span>
                        </div>
                        <button id="clearSearchBtn" class="btn-clear-filters" type="button">
                            <i class="ri-close-line"></i> Xóa tìm kiếm
                        </button>
                    </div>

                    <div class="filter-section-row">
                        <div class="filter-group-label">
                            <i class="ri-price-tag-3-line" style="color: var(--primary);"></i> Mức Giá:
                        </div>
                        <div class="filter-pills-wrap" id="priceFilterPills">
                            <span class="filter-pill active" data-price="all">Tất cả mức giá</span>
                            <span class="filter-pill" data-price="under-1m">Dưới 1 triệu</span>
                            <span class="filter-pill" data-price="1m-5m">1 - 5 triệu</span>
                            <span class="filter-pill" data-price="5m-10m">5 - 10 triệu</span>
                            <span class="filter-pill" data-price="over-10m">Trên 10 triệu</span>
                        </div>
                        <div class="filter-custom-price">
                            <input type="number" id="minPriceInput" class="price-mini-input" placeholder="Từ đ..." min="0" step="50000" value="${state.minPrice || ''}">
                            <span>-</span>
                            <input type="number" id="maxPriceInput" class="price-mini-input" placeholder="Đến đ..." min="0" step="50000" value="${state.maxPrice || ''}">
                            <button id="applyPriceBtn" class="btn-filter-apply" type="button">Áp dụng</button>
                        </div>
                    </div>

                    <div class="filter-section-row">
                        <div class="filter-group-label">
                            <i class="ri-star-line" style="color: #f59e0b;"></i> Đánh Giá:
                        </div>
                        <div class="filter-pills-wrap" id="ratingFilterPills">
                            <span class="filter-pill active" data-rating="0">Tất cả sao</span>
                            <span class="filter-pill" data-rating="5">⭐ 5.0 sao</span>
                            <span class="filter-pill" data-rating="4">⭐ 4 sao trở lên</span>
                            <span class="filter-pill" data-rating="3">⭐ 3 sao trở lên</span>
                        </div>

                        <div class="filter-quick-toggles">
                            <label class="filter-checkbox-label">
                                <input type="checkbox" id="inStockCheckbox" ${state.inStock ? 'checked' : ''}>
                                <span>Chỉ hiện còn hàng</span>
                            </label>
                            <label class="filter-checkbox-label">
                                <input type="checkbox" id="flashSaleCheckbox" ${state.flashSaleFilter ? 'checked' : ''}>
                                <span style="color: #ee4d2d;"><i class="ri-flashlight-fill"></i> Flash Sale</span>
                            </label>
                            <button id="resetAllFiltersBtn" class="btn-clear-filters" type="button" title="Đặt lại toàn bộ bộ lọc">
                                <i class="ri-refresh-line"></i> Xóa bộ lọc
                            </button>
                        </div>
                    </div>
                </div>

                <div id="productsGrid" class="products-grid"></div>
            </div>
        </section>
    </main>

    ${renderFooterTemplate()}

    <div id="quickviewModal" class="modal-overlay">
        <div class="modal-card modal-card-shopee">
            <button class="modal-close-btn" data-close-modal="quickviewModal" type="button">
                <i class="ri-close-line"></i>
            </button>
            <div class="modal-body modal-body-shopee">
                <div id="quickviewContent"></div>
            </div>
        </div>
    </div>

    ${renderChatWidgetTemplate()}
    `;
};

const renderCartView = (): string => {
    return `
    <header class="cart-header">
        <div class="cart-header-container">
            <div class="cart-brand-group">
                <a href="/" class="brand-logo" data-nav-link>
                    <div class="brand-icon">
                        <i class="ri-shopping-bag-3-fill"></i>
                    </div>
                    <span>NovaShop</span>
                </a>
                <div class="cart-page-badge">Giỏ Hàng & Thanh Toán</div>
            </div>
            <a href="/" class="btn btn-secondary btn-sm" data-nav-link>
                <i class="ri-arrow-left-line"></i>
                <span>Tiếp tục mua sắm</span>
            </a>
        </div>
    </header>

    <main class="cart-main-container">
        <div id="emptyCartView" class="cart-empty-panel" style="${state.cart.length === 0 ? 'display: block;' : 'display: none;'}">
            <i class="ri-shopping-cart-line" style="font-size: 3.5rem; color: var(--text-light); margin-bottom: 16px; display: block;"></i>
            <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin-bottom: 8px;">Giỏ hàng của bạn đang trống</h2>
            <p style="color: var(--text-muted); font-size: 0.9375rem; margin-bottom: 24px;">Hãy khám phá các sản phẩm tuyệt vời và thêm vào giỏ hàng ngay!</p>
            <a href="/" class="btn btn-primary btn-lg" data-nav-link>
                <i class="ri-store-2-line"></i>
                <span>Khám Phá Cửa Hàng</span>
            </a>
        </div>

        <div id="activeCartView" class="cart-layout" style="${state.cart.length > 0 ? 'display: grid;' : 'display: none;'}">
            <div class="cart-items-card">
                <div class="cart-card-header">
                    <span>Danh Sách Sản Phẩm Đã Chọn</span>
                    <span id="cartHeaderCount" style="color: var(--primary); font-size: 0.875rem;"></span>
                </div>
                <div id="cartItemsList" class="cart-items-list"></div>
            </div>

            <div class="cart-checkout-card">
                <div class="cart-checkout-title">
                    <i class="ri-shield-check-line" style="color: var(--primary);"></i>
                    <span>Thông Tin Thanh Toán</span>
                </div>

                <form id="checkoutSubmitForm">
                    <div class="form-group" style="margin-bottom: 12px;">
                        <label class="form-label" for="checkoutName">Họ và tên người nhận</label>
                        <input type="text" id="checkoutName" class="form-input" placeholder="Ví dụ: Nguyễn Văn A" value="${state.user?.name || ''}" required>
                    </div>

                    <div class="form-group" style="margin-bottom: 12px;">
                        <label class="form-label" for="checkoutPhone">Số điện thoại giao hàng</label>
                        <input type="tel" id="checkoutPhone" class="form-input" placeholder="Ví dụ: 0912345678" value="${state.user?.phone || ''}" required>
                    </div>

                    <div class="form-group" style="margin-bottom: 12px;">
                        <label class="form-label" for="checkoutAddress">Địa chỉ nhận hàng chi tiết</label>
                        <textarea id="checkoutAddress" class="form-textarea" rows="2" placeholder="Số nhà, tên đường, phường/xã, quận/huyện..." required>${state.user?.address || ''}</textarea>
                    </div>

                    <div class="form-group" style="margin-bottom: 14px;">
                        <label class="form-label" for="checkoutPayment">Hình thức thanh toán</label>
                        <select id="checkoutPayment" class="form-select">
                            <option value="cod">Thanh toán khi nhận hàng (COD)</option>
                            <option value="banking">Chuyển khoản Ngân hàng / Quét mã VietQR</option>
                            <option value="vnpay">Ví điện tử VNPAY / MoMo</option>
                        </select>
                    </div>

                    <div class="cart-price-breakdown">
                        <div class="cart-breakdown-row">
                            <span>Tạm tính:</span>
                            <span id="summarySubtotal">0 đ</span>
                        </div>
                        <div class="cart-breakdown-row">
                            <span>Phí vận chuyển:</span>
                            <span style="color: var(--success); font-weight: 700;">Miễn phí toàn quốc</span>
                        </div>
                        <div class="cart-breakdown-row total">
                            <span>Tổng thanh toán:</span>
                            <span id="summaryGrandTotal">0 đ</span>
                        </div>
                    </div>

                    <button type="submit" id="confirmOrderBtn" class="btn btn-primary btn-lg" style="width: 100%;">
                        <span>Xác Nhận Đặt Hàng</span>
                        <i class="ri-check-double-line"></i>
                    </button>
                </form>
            </div>
        </div>
    </main>

    ${renderFooterTemplate()}
    `;
};

const renderOrdersView = (): string => {
    return `
    <header style="background: #ffffff; border-bottom: 1px solid var(--border-light); padding: 16px 0; box-shadow: var(--shadow-sm);">
        <div style="max-width: 1000px; margin: 0 auto; padding: 0 20px; display: flex; align-items: center; justify-content: space-between;">
            <a href="/" class="brand-logo" data-nav-link>
                <div class="brand-icon">
                    <i class="ri-shopping-bag-3-fill"></i>
                </div>
                <span>NovaShop</span>
            </a>
            <div style="display: flex; align-items: center; gap: 12px;">
                <a href="/cart" class="btn btn-secondary btn-sm" data-nav-link>
                    <i class="ri-shopping-cart-line"></i>
                    <span>Giỏ hàng</span>
                </a>
                <a href="/" class="btn btn-primary btn-sm" data-nav-link>
                    <i class="ri-store-2-line"></i>
                    <span>Cửa hàng</span>
                </a>
            </div>
        </div>
    </header>

    <main class="orders-container">
        <div class="orders-header-bar">
            <div>
                <h1 class="orders-title">Lịch Sử Đơn Mua</h1>
                <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 4px;">Theo dõi tiến độ giao hàng và các đơn hàng của bạn</p>
            </div>
        </div>

        <div id="ordersLoading" style="text-align: center; padding: 40px 0;">
            <i class="ri-loader-4-line ri-spin" style="font-size: 2rem; color: var(--primary);"></i>
            <div style="margin-top: 10px; color: var(--text-muted);">Đang tải danh sách đơn hàng...</div>
        </div>

        <div id="ordersEmpty" style="display: none; background: #ffffff; border-radius: var(--radius-lg); padding: 60px 20px; text-align: center; border: 1px solid var(--border-light);">
            <i class="ri-inbox-line" style="font-size: 3rem; color: var(--text-light); margin-bottom: 12px; display: block;"></i>
            <div style="font-size: 1.125rem; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">Bạn chưa có đơn mua nào</div>
            <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 20px;">Hãy đặt hàng ngay để trải nghiệm dịch vụ của NovaShop</div>
            <a href="/" class="btn btn-primary" data-nav-link>
                <span>Mua Sắm Ngay</span>
            </a>
        </div>

        <div id="ordersList"></div>
    </main>

    ${renderFooterTemplate()}
    `;
};

const renderLoginView = (): string => {
    return `
    <header class="auth-header">
        <div class="auth-header-container">
            <a href="/" class="brand-logo" data-nav-link>
                <div class="brand-icon">
                    <i class="ri-shopping-bag-3-fill"></i>
                </div>
                <span>NovaShop</span>
            </a>
            <a href="/" class="back-home-link" data-nav-link>
                <i class="ri-arrow-left-line"></i>
                <span>Quay lại Trang Chủ</span>
            </a>
        </div>
    </header>

    <main class="auth-main">
        <div class="auth-split-wrapper">
            <div class="auth-showcase-panel">
                <div>
                    <div class="showcase-badge">
                        <i class="ri-sparkling-fill"></i>
                        <span>Nền tảng mua sắm tin cậy số 1</span>
                    </div>
                    <h1 class="showcase-headline">
                        Trải Nghiệm Mua Sắm <br>Đỉnh Cao Cùng NovaShop
                    </h1>
                    <p class="showcase-desc">
                        Hàng triệu sản phẩm công nghệ, điện tử và thời trang chính hãng với ưu đãi đặc quyền độc quyền mỗi ngày.
                    </p>

                    <div class="showcase-features">
                        <div class="showcase-feature-item">
                            <div class="showcase-feature-icon">
                                <i class="ri-shield-check-line"></i>
                            </div>
                            <div class="showcase-feature-text">100% Sản phẩm chính hãng & Bảo hành điện tử</div>
                        </div>
                        <div class="showcase-feature-item">
                            <div class="showcase-feature-icon">
                                <i class="ri-truck-line"></i>
                            </div>
                            <div class="showcase-feature-text">Giao hàng hỏa tốc trong 2 giờ nội thành</div>
                        </div>
                        <div class="showcase-feature-item">
                            <div class="showcase-feature-icon">
                                <i class="ri-gift-line"></i>
                            </div>
                            <div class="showcase-feature-text">Voucher giảm 100K cho khách hàng thành viên</div>
                        </div>
                    </div>
                </div>

                <div class="showcase-footer">
                    <i class="ri-star-fill" style="color: #ffd839;"></i>
                    <span>Được đánh giá 4.9/5 sao từ hơn 50.000 khách hàng</span>
                </div>
            </div>

            <div class="auth-form-panel">
                <h2 class="auth-title">Đăng Nhập</h2>
                <p class="auth-subtitle">Vui lòng nhập tài khoản để tiếp tục mua sắm</p>

                <form id="customerLoginForm" class="auth-form">
                    <div class="form-group">
                        <label class="form-label" for="loginEmail">Email tài khoản</label>
                        <div class="input-with-icon">
                            <i class="ri-mail-line input-icon-left"></i>
                            <input type="email" id="loginEmail" class="form-input" placeholder="nhap.email@example.com" required>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="loginPassword">Mật khẩu</label>
                        <div class="input-with-icon">
                            <i class="ri-lock-line input-icon-left"></i>
                            <input type="password" id="loginPassword" class="form-input" placeholder="Nhập mật khẩu" required>
                            <button type="button" id="togglePasswordBtn" class="password-toggle-btn" aria-label="Hiện mật khẩu">
                                <i id="togglePasswordIcon" class="ri-eye-line"></i>
                            </button>
                        </div>
                    </div>

                    <button type="submit" id="loginSubmitBtn" class="auth-submit-btn">
                        <span>Đăng Nhập Ngay</span>
                        <i class="ri-arrow-right-line"></i>
                    </button>
                </form>

                <div class="auth-footer-link">
                    <span>Chưa có tài khoản thành viên? </span>
                    <a href="/register" data-nav-link>Đăng ký ngay tại đây</a>
                </div>
            </div>
        </div>
    </main>
    `;
};

const renderRegisterView = (): string => {
    return `
    <header class="auth-header">
        <div class="auth-header-container">
            <a href="/" class="brand-logo" data-nav-link>
                <div class="brand-icon">
                    <i class="ri-shopping-bag-3-fill"></i>
                </div>
                <span>NovaShop</span>
            </a>
            <a href="/" class="back-home-link" data-nav-link>
                <i class="ri-arrow-left-line"></i>
                <span>Quay lại Trang Chủ</span>
            </a>
        </div>
    </header>

    <main class="auth-main">
        <div class="auth-split-wrapper">
            <div class="auth-showcase-panel">
                <div>
                    <div class="showcase-badge">
                        <i class="ri-vip-crown-fill"></i>
                        <span>Quyền lợi thành viên NovaShop</span>
                    </div>
                    <h1 class="showcase-headline">
                        Gia Nhập Cộng Đồng <br>Mua Sắm Thông Minh
                    </h1>
                    <p class="showcase-desc">
                        Đăng ký tài khoản ngay hôm nay để nhận voucher giảm giá 100K cho đơn hàng đầu tiên và tích điểm đổi quà không giới hạn.
                    </p>

                    <div class="showcase-features">
                        <div class="showcase-feature-item">
                            <div class="showcase-feature-icon">
                                <i class="ri-copper-coin-line"></i>
                            </div>
                            <div class="showcase-feature-text">Tích xu Nova thưởng cho mỗi đơn hàng thành công</div>
                        </div>
                        <div class="showcase-feature-item">
                            <div class="showcase-feature-icon">
                                <i class="ri-percent-line"></i>
                            </div>
                            <div class="showcase-feature-text">Đặc quyền săn deal Flash Sale sớm hơn 30 phút</div>
                        </div>
                        <div class="showcase-feature-item">
                            <div class="showcase-feature-icon">
                                <i class="ri-customer-service-2-line"></i>
                            </div>
                            <div class="showcase-feature-text">Đội ngũ hỗ trợ viên ưu tiên chăm sóc 24/7</div>
                        </div>
                    </div>
                </div>

                <div class="showcase-footer">
                    <i class="ri-verified-badge-fill" style="color: #ffd839;"></i>
                    <span>Bảo mật thông tin khách hàng tuyệt đối theo chuẩn quốc tế</span>
                </div>
            </div>

            <div class="auth-form-panel">
                <h2 class="auth-title">Đăng Ký Tài Khoản</h2>
                <p class="auth-subtitle">Nhập đầy đủ thông tin để trở thành thành viên chính thức</p>

                <form id="customerRegisterForm" class="auth-form">
                    <div class="form-group">
                        <label class="form-label" for="regName">Họ và tên của bạn</label>
                        <div class="input-with-icon">
                            <i class="ri-user-line input-icon-left"></i>
                            <input type="text" id="regName" class="form-input" placeholder="Ví dụ: Nguyễn Văn A" required>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="regEmail">Địa chỉ Email</label>
                        <div class="input-with-icon">
                            <i class="ri-mail-line input-icon-left"></i>
                            <input type="email" id="regEmail" class="form-input" placeholder="tenban@example.com" required>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="regPassword">Mật khẩu bảo mật</label>
                        <div class="input-with-icon">
                            <i class="ri-lock-line input-icon-left"></i>
                            <input type="password" id="regPassword" class="form-input" placeholder="Tối thiểu 6 ký tự" required>
                            <button type="button" id="toggleRegPasswordBtn" class="password-toggle-btn" aria-label="Hiện mật khẩu">
                                <i id="toggleRegPasswordIcon" class="ri-eye-line"></i>
                            </button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="regPhone">Số điện thoại liên hệ</label>
                        <div class="input-with-icon">
                            <i class="ri-phone-line input-icon-left"></i>
                            <input type="tel" id="regPhone" class="form-input" placeholder="Ví dụ: 0912345678" required>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="regAddress">Địa chỉ nhận hàng mặc định</label>
                        <div class="input-with-icon">
                            <i class="ri-map-pin-line input-icon-left" style="top: 16px;"></i>
                            <textarea id="regAddress" class="form-textarea" placeholder="Số nhà, tên đường, phường/xã, quận/huyện..." required></textarea>
                        </div>
                    </div>

                    <button type="submit" id="regSubmitBtn" class="auth-submit-btn">
                        <span>Hoàn Tất Đăng Ký</span>
                        <i class="ri-check-line"></i>
                    </button>
                </form>

                <div class="auth-footer-link">
                    <span>Đã có tài khoản thành viên? </span>
                    <a href="/login" data-nav-link>Đăng nhập ngay tại đây</a>
                </div>
            </div>
        </div>
    </main>
    `;
};

const renderApp = (): void => {
    const appEl = document.getElementById('app');
    if (!appEl) return;

    if (state.flashCountdownTimer) {
        clearInterval(state.flashCountdownTimer);
        state.flashCountdownTimer = null;
    }

    const path = window.location.pathname;

    if (path === '/cart') {
        document.title = 'Giỏ Hàng & Đặt Hàng | NovaShop';
        appEl.innerHTML = renderCartView();
        initCartView();
    } else if (path === '/orders') {
        document.title = 'Đơn Mua Của Tôi | NovaShop';
        appEl.innerHTML = renderOrdersView();
        initOrdersView();
    } else if (path === '/login') {
        document.title = 'Đăng Nhập Khách Hàng | NovaShop';
        appEl.innerHTML = renderLoginView();
        initLoginView();
    } else if (path === '/register') {
        document.title = 'Đăng Ký Tài Khoản | NovaShop';
        appEl.innerHTML = renderRegisterView();
        initRegisterView();
    } else if (path === '/about') {
        document.title = 'Giới Thiệu Về NovaShop | Hệ Thống Bán Lẻ Công Nghệ';
        appEl.innerHTML = renderAboutView();
    } else if (path === '/careers') {
        document.title = 'Tuyển Dụng & Cơ Hội Nghề Nghiệp | NovaShop';
        appEl.innerHTML = renderCareersView();
    } else if (path === '/terms') {
        document.title = 'Điều Khoản Dịch Vụ | NovaShop';
        appEl.innerHTML = renderTermsView();
    } else if (path === '/privacy') {
        document.title = 'Chính Sách Bảo Mật Quyền Riêng Tư | NovaShop';
        appEl.innerHTML = renderPrivacyView();
    } else if (path === '/help') {
        document.title = 'Trung Tâm Trợ Giúp & FAQ | NovaShop';
        appEl.innerHTML = renderHelpView();
    } else if (path === '/guide') {
        document.title = 'Hướng Dẫn Mua Hàng & Đặt Hàng | NovaShop';
        appEl.innerHTML = renderGuideView();
    } else if (path === '/shipping') {
        document.title = 'Chính Sách Vận Chuyển Toàn Quốc | NovaShop';
        appEl.innerHTML = renderShippingView();
    } else {
        document.title = 'NovaShop | Mua Sắm Trực Tuyến Chính Hãng';
        appEl.innerHTML = renderStorefrontView();
        initStorefrontView();
    }

    bindGlobalNavigation();
};

const navigate = (path: string): void => {
    if (window.location.pathname !== path) {
        window.history.pushState(null, '', path);
    }
    state.currentRoute = path;
    renderApp();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

const bindGlobalNavigation = (): void => {
    document.querySelectorAll('[data-nav-link]').forEach((link) => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('/') && !href.startsWith('/api') && !href.startsWith('/admin')) {
                e.preventDefault();
                navigate(href);
            }
        });
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('novashop_customer_token');
            localStorage.removeItem('novashop_customer_user');
            state.token = '';
            state.user = null;
            showToast('Thông báo', 'Đã đăng xuất tài khoản thành công', 'success');
            navigate('/');
        });
    }
};

const initStorefrontView = (): void => {
    fetchCategories();
    fetchProducts();
    initFlashSaleCountdown();
    bindStorefrontControls();
    initChatWidget();
};

const POPULAR_SEARCH_KEYWORDS = [
    'Tai nghe Sony WH-1000XM5',
    'Bàn phím cơ Keychron',
    'Apple Watch Series 9',
    'Chuột Logitech MX Master',
    'Màn hình 4K LG',
    'Tai nghe bluetooth',
    'Bàn phím gaming'
];

const initSearchSuggestions = (): void => {
    const input = document.getElementById('searchInput') as HTMLInputElement | null;
    const dropdown = document.getElementById('searchSuggestionsDropdown');
    if (!input || !dropdown) return;

    const renderSuggestions = (query: string): void => {
        const q = query.trim().toLowerCase();
        if (!q) {
            dropdown.innerHTML = `
                <div class="suggestion-header">
                    <span><i class="ri-fire-fill" style="color: #ee4d2d;"></i> Tìm kiếm phổ biến</span>
                </div>
                <div class="suggestion-tag-list">
                    ${POPULAR_SEARCH_KEYWORDS.map(kw => `
                        <span class="suggestion-tag" data-kw="${kw}">
                            <i class="ri-search-line"></i> ${kw}
                        </span>
                    `).join('')}
                </div>
            `;
        } else {
            const matchedProducts = state.products.filter(p =>
                p.name.toLowerCase().includes(q) ||
                (p.categoryName && p.categoryName.toLowerCase().includes(q)) ||
                p.category.toLowerCase().includes(q)
            ).slice(0, 5);

            const matchedKeywords = POPULAR_SEARCH_KEYWORDS.filter(kw => kw.toLowerCase().includes(q));

            let html = `
                <div class="suggestion-header">
                    <span>Gợi ý cho "${escapeHtml(query)}"</span>
                    <span>${matchedProducts.length} sản phẩm</span>
                </div>
            `;

            if (matchedKeywords.length > 0) {
                html += `
                    <div class="suggestion-tag-list">
                        ${matchedKeywords.map(kw => `
                            <span class="suggestion-tag" data-kw="${kw}">
                                <i class="ri-search-line"></i> ${kw}
                            </span>
                        `).join('')}
                    </div>
                `;
            }

            if (matchedProducts.length > 0) {
                html += matchedProducts.map(p => `
                    <div class="suggestion-item-row" data-prod-id="${p.id}" data-prod-name="${escapeHtml(p.name)}">
                        <img src="${p.imageUrl}" alt="${p.name}" class="suggestion-thumb">
                        <div class="suggestion-info">
                            <div class="suggestion-title">${p.name}</div>
                            <div class="suggestion-cat">${p.categoryName || p.category}</div>
                        </div>
                        <div class="suggestion-price">${formatPrice(p.price)}</div>
                    </div>
                `).join('');
            } else if (matchedKeywords.length === 0) {
                html += `
                    <div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.875rem;">
                        Nhấn <kbd>Enter</kbd> để tìm kiếm "${escapeHtml(query)}"
                    </div>
                `;
            }

            dropdown.innerHTML = html;
        }

        dropdown.querySelectorAll('[data-kw]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const kw = el.getAttribute('data-kw') || '';
                input.value = kw;
                state.searchQuery = kw;
                dropdown.classList.remove('active');
                fetchProducts();
            });
        });

        dropdown.querySelectorAll('.suggestion-item-row').forEach(row => {
            row.addEventListener('click', (e) => {
                e.stopPropagation();
                const prodId = row.getAttribute('data-prod-id');
                const prodName = row.getAttribute('data-prod-name') || '';
                const found = state.products.find(p => p.id.toString() === prodId?.toString());
                dropdown.classList.remove('active');
                if (found) {
                    openShopeeDetail(found);
                } else {
                    input.value = prodName;
                    state.searchQuery = prodName;
                    fetchProducts();
                }
            });
        });
    };

    input.addEventListener('focus', () => {
        renderSuggestions(input.value);
        dropdown.classList.add('active');
    });

    input.addEventListener('input', () => {
        renderSuggestions(input.value);
        dropdown.classList.add('active');
    });

    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.search-container-group')) {
            dropdown.classList.remove('active');
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            dropdown.classList.remove('active');
        } else if (e.key === 'Enter') {
            dropdown.classList.remove('active');
        }
    });
};

const bindStorefrontControls = (): void => {
    const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
    const searchBtn = document.getElementById('searchBtn');
    const sortSelect = document.getElementById('sortSelect') as HTMLSelectElement | null;
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const minPriceInput = document.getElementById('minPriceInput') as HTMLInputElement | null;
    const maxPriceInput = document.getElementById('maxPriceInput') as HTMLInputElement | null;
    const applyPriceBtn = document.getElementById('applyPriceBtn');
    const inStockCheckbox = document.getElementById('inStockCheckbox') as HTMLInputElement | null;
    const flashSaleCheckbox = document.getElementById('flashSaleCheckbox') as HTMLInputElement | null;
    const resetAllFiltersBtn = document.getElementById('resetAllFiltersBtn');

    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => {
            state.searchQuery = searchInput.value.trim();
            fetchProducts();
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                state.searchQuery = searchInput.value.trim();
                fetchProducts();
            }
        });
    }

    if (clearSearchBtn && searchInput) {
        clearSearchBtn.addEventListener('click', () => {
            state.searchQuery = '';
            searchInput.value = '';
            fetchProducts();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            state.sortBy = sortSelect.value;
            fetchProducts();
        });
    }

    document.querySelectorAll('#priceFilterPills .filter-pill').forEach((pill) => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('#priceFilterPills .filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            const priceType = pill.getAttribute('data-price');
            if (priceType === 'under-1m') {
                state.minPrice = null;
                state.maxPrice = 1000000;
            } else if (priceType === '1m-5m') {
                state.minPrice = 1000000;
                state.maxPrice = 5000000;
            } else if (priceType === '5m-10m') {
                state.minPrice = 5000000;
                state.maxPrice = 10000000;
            } else if (priceType === 'over-10m') {
                state.minPrice = 10000000;
                state.maxPrice = null;
            } else {
                state.minPrice = null;
                state.maxPrice = null;
            }
            if (minPriceInput) minPriceInput.value = state.minPrice ? state.minPrice.toString() : '';
            if (maxPriceInput) maxPriceInput.value = state.maxPrice ? state.maxPrice.toString() : '';
            fetchProducts();
        });
    });

    if (applyPriceBtn) {
        applyPriceBtn.addEventListener('click', () => {
            const min = minPriceInput ? parseFloat(minPriceInput.value) : NaN;
            const max = maxPriceInput ? parseFloat(maxPriceInput.value) : NaN;
            state.minPrice = !isNaN(min) && min > 0 ? min : null;
            state.maxPrice = !isNaN(max) && max > 0 ? max : null;
            document.querySelectorAll('#priceFilterPills .filter-pill').forEach(p => p.classList.remove('active'));
            fetchProducts();
        });
    }

    document.querySelectorAll('#ratingFilterPills .filter-pill').forEach((pill) => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('#ratingFilterPills .filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            const ratingVal = parseFloat(pill.getAttribute('data-rating') || '0');
            state.minRating = ratingVal > 0 ? ratingVal : null;
            fetchProducts();
        });
    });

    if (inStockCheckbox) {
        inStockCheckbox.addEventListener('change', () => {
            state.inStock = inStockCheckbox.checked;
            fetchProducts();
        });
    }

    if (flashSaleCheckbox) {
        flashSaleCheckbox.addEventListener('change', () => {
            state.flashSaleFilter = flashSaleCheckbox.checked;
            fetchProducts();
        });
    }

    if (resetAllFiltersBtn) {
        resetAllFiltersBtn.addEventListener('click', () => {
            state.searchQuery = '';
            state.activeCategory = 'cat_all';
            state.minPrice = null;
            state.maxPrice = null;
            state.minRating = null;
            state.inStock = false;
            state.flashSaleFilter = false;
            state.sortBy = 'newest';
            if (searchInput) searchInput.value = '';
            if (minPriceInput) minPriceInput.value = '';
            if (maxPriceInput) maxPriceInput.value = '';
            if (inStockCheckbox) inStockCheckbox.checked = false;
            if (flashSaleCheckbox) flashSaleCheckbox.checked = false;
            if (sortSelect) sortSelect.value = 'newest';
            document.querySelectorAll('#priceFilterPills .filter-pill').forEach((p, idx) => {
                if (idx === 0) p.classList.add('active'); else p.classList.remove('active');
            });
            document.querySelectorAll('#ratingFilterPills .filter-pill').forEach((p, idx) => {
                if (idx === 0) p.classList.add('active'); else p.classList.remove('active');
            });
            fetchCategories();
            fetchProducts();
        });
    }

    initSearchSuggestions();

    document.querySelectorAll('.hot-keyword-tag').forEach((tag) => {
        tag.addEventListener('click', () => {
            const kw = tag.getAttribute('data-search-kw') || '';
            if (searchInput) searchInput.value = kw;
            state.searchQuery = kw;
            fetchProducts();
        });
    });

    document.querySelectorAll('[data-service-toast]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const msg = btn.getAttribute('data-service-toast');
            if (msg) showToast('Ưu Đãi Shopee', msg, 'success');
        });
    });

    document.querySelectorAll('[data-quick-category]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const catId = btn.getAttribute('data-quick-category');
            if (catId) {
                state.activeCategory = catId;
                const tab = document.querySelector(`.category-pill[data-category="${catId}"]`);
                if (tab) {
                    document.querySelectorAll('.category-pill').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                }
                fetchProducts();
                const prodSec = document.getElementById('productsSection');
                if (prodSec) prodSec.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    const modalCloseBtn = document.querySelector('[data-close-modal="quickviewModal"]');
    const modal = document.getElementById('quickviewModal');
    if (modalCloseBtn && modal) {
        modalCloseBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    }
};

const fetchCategories = async (): Promise<void> => {
    const tabsContainer = document.getElementById('categoryTabs');
    if (!tabsContainer) return;

    try {
        const res = await fetch(`${API_BASE}/api/categories`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
            state.categories = data.data;
            renderCategories();
        }
    } catch {
        state.categories = [
            { id: 'cat_all', name: 'Tất Cả Sản Phẩm' },
            { id: 'cat_audio', name: 'Tai Nghe & Âm Thanh' },
            { id: 'cat_gear', name: 'Bàn Phím & Chuột' },
            { id: 'cat_screen', name: 'Màn Hình & Phụ Kiện' }
        ];
        renderCategories();
    }
};

const renderCategories = (): void => {
    const tabsContainer = document.getElementById('categoryTabs');
    if (!tabsContainer) return;

    const allCat = [{ id: 'cat_all', name: 'Tất Cả Sản Phẩm' }, ...state.categories.filter(c => c.id !== 'cat_all')];

    tabsContainer.innerHTML = allCat.map((cat) => `
        <button class="category-pill ${state.activeCategory === cat.id ? 'active' : ''}" data-cat-id="${cat.id}" type="button">
            <span>${cat.name}</span>
        </button>
    `).join('');

    tabsContainer.querySelectorAll('.category-pill').forEach((tab) => {
        tab.addEventListener('click', () => {
            tabsContainer.querySelectorAll('.category-pill').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.activeCategory = tab.getAttribute('data-cat-id') || 'cat_all';
            fetchProducts();
        });
    });
};

const fetchProducts = async (): Promise<void> => {
    const countEl = document.getElementById('productTotalCount');
    const gridEl = document.getElementById('productsGrid');
    const bannerEl = document.getElementById('searchActiveBanner');
    const keywordEl = document.getElementById('searchKeywordDisplay');

    if (bannerEl && keywordEl) {
        if (state.searchQuery) {
            bannerEl.style.display = 'flex';
            keywordEl.textContent = `"${state.searchQuery}"`;
        } else {
            bannerEl.style.display = 'none';
        }
    }

    if (gridEl) {
        gridEl.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px 0;">
                <i class="ri-loader-4-line ri-spin" style="font-size: 2rem; color: var(--primary);"></i>
                <div style="margin-top: 8px; color: var(--text-muted);">Đang tải sản phẩm...</div>
            </div>
        `;
    }

    try {
        const queryParams = new URLSearchParams();
        if (state.activeCategory && state.activeCategory !== 'cat_all') {
            queryParams.append('category', state.activeCategory);
        }
        if (state.searchQuery) {
            queryParams.append('search', state.searchQuery);
        }
        if (state.sortBy) {
            queryParams.append('sortBy', state.sortBy);
        }
        if (state.minPrice !== null && state.minPrice > 0) {
            queryParams.append('minPrice', state.minPrice.toString());
        }
        if (state.maxPrice !== null && state.maxPrice > 0) {
            queryParams.append('maxPrice', state.maxPrice.toString());
        }
        if (state.minRating !== null && state.minRating > 0) {
            queryParams.append('minRating', state.minRating.toString());
        }
        if (state.inStock) {
            queryParams.append('inStock', 'true');
        }
        if (state.flashSaleFilter) {
            queryParams.append('flashSale', 'true');
        }

        const res = await fetch(`${API_BASE}/api/products?${queryParams.toString()}`);
        const data = await res.json();

        if (data.success && Array.isArray(data.data)) {
            state.products = data.data;
            if (countEl) countEl.textContent = `${state.products.length} sản phẩm phù hợp`;
            renderProductsGrid();
            renderFlashSaleGrid();
        } else {
            if (gridEl) {
                gridEl.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">Không tìm thấy sản phẩm nào.</div>`;
            }
        }
    } catch {
        if (gridEl) {
            gridEl.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--accent);">Không thể kết nối đến máy chủ sản phẩm.</div>`;
        }
    }
};

const renderProductsGrid = (): void => {
    const gridEl = document.getElementById('productsGrid');
    if (!gridEl) return;

    if (state.products.length === 0) {
        gridEl.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; background: #fff; border-radius: var(--radius-md); border: 1px solid var(--border-light);">
                <i class="ri-search-line" style="font-size: 2.5rem; color: var(--text-light); margin-bottom: 8px; display: block;"></i>
                <div style="font-size: 1.0625rem; font-weight: 700; color: var(--text-main);">Không tìm thấy sản phẩm phù hợp</div>
                <div style="font-size: 0.875rem; color: var(--text-muted); margin-top: 4px;">Vui lòng thử tìm kiếm bằng từ khoá khác hoặc xoá bộ lọc.</div>
            </div>
        `;
        return;
    }

    gridEl.innerHTML = state.products.map((prod) => {
        const discountBadge = prod.originalPrice && prod.originalPrice > prod.price
            ? `<span class="badge badge-sale">-${Math.round((1 - prod.price / prod.originalPrice) * 100)}%</span>`
            : (prod.isFlashSale ? `<span class="badge badge-primary"><i class="ri-flashlight-fill"></i> Flash Sale</span>` : '');

        return `
        <div class="product-card" data-id="${prod.id}">
            <div class="card-media">
                <img src="${prod.imageUrl}" alt="${prod.name}" class="card-image" loading="lazy">
                <div class="card-badge-container">
                    ${discountBadge}
                </div>
                <div class="card-quick-actions">
                    <button class="action-btn-circle quickview-trigger" data-id="${prod.id}" title="Xem nhanh" type="button">
                        <i class="ri-eye-line"></i>
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="card-category">${prod.categoryName || prod.category}</div>
                <h3 class="card-title" title="${prod.name}">${prod.name}</h3>
                <div class="card-meta">
                    <div class="rating-badge">
                        <i class="ri-star-fill"></i>
                        <span>${prod.rating || '5.0'}</span>
                    </div>
                    <span class="sold-text">• Đã bán ${prod.sold || prod.soldCount || 0}</span>
                </div>
                <div class="card-footer">
                    <div class="price-wrapper">
                        <div class="current-price">${formatPrice(prod.price)}</div>
                        ${prod.originalPrice ? `<div class="original-price">${formatPrice(prod.originalPrice)}</div>` : ''}
                    </div>
                    <div class="card-actions-group">
                        <button class="btn-card-cart add-to-cart-direct-btn" data-id="${prod.id}" title="Thêm vào giỏ" type="button">
                            <i class="ri-shopping-cart-line"></i>
                        </button>
                        <button class="btn-card-buy buy-now-direct-btn" data-id="${prod.id}" type="button">
                            <span>Mua Ngay</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');

    gridEl.querySelectorAll('.product-card').forEach((card) => {
        card.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.closest('.add-to-cart-direct-btn') || target.closest('.buy-now-direct-btn')) {
                return;
            }
            const id = card.getAttribute('data-id');
            const found = state.products.find(p => p.id.toString() === id?.toString());
            if (found) openShopeeDetail(found);
        });
    });

    gridEl.querySelectorAll('.quickview-trigger').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            const found = state.products.find(p => p.id.toString() === id?.toString());
            if (found) openShopeeDetail(found);
        });
    });

    gridEl.querySelectorAll('.add-to-cart-direct-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            const found = state.products.find(p => p.id.toString() === id?.toString());
            if (found) {
                addItemToCart(found, 1);
            }
        });
    });

    gridEl.querySelectorAll('.buy-now-direct-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            const found = state.products.find(p => p.id.toString() === id?.toString());
            if (found) {
                addItemToCart(found, 1);
                navigate('/cart');
            }
        });
    });
};

const renderFlashSaleGrid = (): void => {
    const gridEl = document.getElementById('flashSaleGrid');
    if (!gridEl) return;

    const flashProducts = state.products.filter(p => p.isFlashSale || (p.originalPrice && p.originalPrice > p.price)).slice(0, 4);
    if (flashProducts.length === 0) {
        gridEl.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 20px;">Đang cập nhật các deal chớp nhoáng...</div>`;
        return;
    }

    gridEl.innerHTML = flashProducts.map((prod) => {
        const discount = prod.flashSaleDiscount || (prod.originalPrice ? Math.round((1 - prod.price / prod.originalPrice) * 100) : 25);
        const soldCount = prod.sold || prod.soldCount || 18;
        return `
        <div class="flash-card" data-id="${prod.id}">
            <div class="flash-card-media">
                <img src="${prod.imageUrl}" alt="${prod.name}" loading="lazy">
                <div class="flash-discount-tag">
                    <span>-${discount}%</span>
                    <span style="font-size: 0.6rem; font-weight: 600;">GIẢM</span>
                </div>
            </div>
            <div class="flash-card-body">
                <div class="flash-card-price">${formatPrice(prod.price)}</div>
                <div class="flash-card-original">${formatPrice(prod.originalPrice || prod.price * 1.3)}</div>
                <div class="flash-progress-wrapper">
                    <div class="flash-progress-bar" style="width: 70%;"></div>
                    <div class="flash-progress-text">
                        <i class="ri-fire-fill" style="color: #ffd839;"></i> ĐÃ BÁN ${soldCount}
                    </div>
                </div>
                <div class="flash-card-btn-group">
                    <button class="btn-card-cart flash-add-cart-btn" data-id="${prod.id}" title="Thêm vào giỏ" type="button">
                        <i class="ri-shopping-cart-line"></i>
                    </button>
                    <button class="btn-card-buy flash-buy-now-btn" data-id="${prod.id}" type="button">
                        <span>Mua Ngay</span>
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');

    gridEl.querySelectorAll('.flash-card').forEach((card) => {
        card.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.closest('.flash-add-cart-btn') || target.closest('.flash-buy-now-btn')) {
                return;
            }
            const id = card.getAttribute('data-id');
            const found = state.products.find(p => p.id.toString() === id?.toString());
            if (found) openShopeeDetail(found);
        });
    });

    gridEl.querySelectorAll('.flash-add-cart-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            const found = state.products.find(p => p.id.toString() === id?.toString());
            if (found) addItemToCart(found, 1);
        });
    });

    gridEl.querySelectorAll('.flash-buy-now-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            const found = state.products.find(p => p.id.toString() === id?.toString());
            if (found) {
                addItemToCart(found, 1);
                navigate('/cart');
            }
        });
    });
};

const initFlashSaleCountdown = (): void => {
    let secondsLeft = 2 * 3600 + 45 * 60 + 18;
    const hourEl = document.getElementById('flashHour');
    const minEl = document.getElementById('flashMin');
    const secEl = document.getElementById('flashSec');

    state.flashCountdownTimer = setInterval(() => {
        secondsLeft--;
        if (secondsLeft <= 0) secondsLeft = 3 * 3600;

        const h = Math.floor(secondsLeft / 3600);
        const m = Math.floor((secondsLeft % 3600) / 60);
        const s = secondsLeft % 60;

        if (hourEl) hourEl.textContent = h.toString().padStart(2, '0');
        if (minEl) minEl.textContent = m.toString().padStart(2, '0');
        if (secEl) secEl.textContent = s.toString().padStart(2, '0');
    }, 1000);
};

function openShopeeDetail(product: Product): void {
    state.activeProduct = product;
    state.selectedQty = 1;
    const variants = product.variants && product.variants.length > 0 ? product.variants : [];
    const uniqueColors = Array.from(new Set(variants.map(v => v.color).filter(Boolean))) as string[];
    const uniqueTypes = Array.from(new Set(variants.map(v => v.type).filter(Boolean))) as string[];
    state.selectedColor = uniqueColors.length > 0 ? uniqueColors[0] : '';
    state.selectedType = uniqueTypes.length > 0 ? uniqueTypes[0] : '';

    const findCurrentVariant = (): ProductVariant | null => {
        if (variants.length === 0) return null;
        return variants.find(v => v.color === state.selectedColor && v.type === state.selectedType)
            || variants.find(v => v.color === state.selectedColor)
            || variants.find(v => v.type === state.selectedType)
            || variants[0];
    };
    state.selectedVariant = findCurrentVariant();

    const modal = document.getElementById('quickviewModal');
    const content = document.getElementById('quickviewContent');
    if (!modal || !content) return;

    const renderShopeeModal = (): void => {
        const v = state.selectedVariant;
        const currentPrice = v ? v.price : product.price;
        const originalPrice = v && v.originalPrice ? v.originalPrice : product.originalPrice;
        const stock = v ? v.stock : product.stock;
        const activeImage = v && v.imageUrl ? v.imageUrl : product.imageUrl;
        const discount = originalPrice && originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
        const allThumbnails = variants.length > 0
            ? variants.map(varItem => varItem.imageUrl).filter(Boolean) as string[]
            : [product.imageUrl];
        const uniqueThumbs = Array.from(new Set([product.imageUrl, ...allThumbnails]));

        content.innerHTML = `
        <div class="shopee-main-grid">
            <div class="shopee-gallery">
                <div class="shopee-main-image-wrap">
                    <img id="shopeeMainImg" src="${activeImage}" alt="${product.name}" class="shopee-main-image">
                </div>
                <div class="shopee-thumbnails">
                    ${uniqueThumbs.map(imgUrl => `
                        <img src="${imgUrl}" alt="Thumbnail" class="shopee-thumb-item ${imgUrl === activeImage ? 'active' : ''}" data-thumb="${imgUrl}">
                    `).join('')}
                </div>
                <div class="shopee-commitments">
                    <div class="shopee-commit-item">
                        <i class="ri-arrow-go-back-line"></i>
                        <span>7 ngày miễn phí đổi trả</span>
                    </div>
                    <div class="shopee-commit-item">
                        <i class="ri-shield-star-line"></i>
                        <span>Hàng chính hãng 100%</span>
                    </div>
                    <div class="shopee-commit-item">
                        <i class="ri-truck-line"></i>
                        <span>Miễn phí vận chuyển</span>
                    </div>
                </div>
            </div>

            <div class="shopee-info-col">
                <div class="shopee-title-area">
                    <span class="shopee-mall-tag">Chính Hãng</span>
                    <h2 class="shopee-product-title">${product.name}</h2>
                </div>

                <div class="shopee-rating-strip">
                    <div class="shopee-rating-val">
                        <span>${product.rating || '5.0'}</span>
                        <i class="ri-star-fill shopee-rating-stars"></i>
                    </div>
                    <div class="shopee-meta-divider"></div>
                    <div><strong>${product.sold || product.soldCount || 100}</strong> Đã Bán</div>
                    <div class="shopee-meta-divider"></div>
                    <div>Kho: <strong>${stock}</strong> sản phẩm</div>
                </div>

                <div class="shopee-price-box">
                    ${product.isFlashSale ? `
                        <div class="shopee-flash-banner">
                            <span><i class="ri-flashlight-fill" style="color: #ffd839;"></i> FLASH SALE GIÁ SỐC</span>
                        </div>
                    ` : ''}
                    ${originalPrice && originalPrice > currentPrice ? `
                        <div class="shopee-price-original">${formatPrice(originalPrice)}</div>
                    ` : ''}
                    <div id="shopeeDisplayPrice" class="shopee-price-current">${formatPrice(currentPrice)}</div>
                    ${discount > 0 ? `
                        <span id="shopeeDisplayDiscount" class="shopee-price-discount">-${discount}% GIẢM</span>
                    ` : ''}
                </div>

                <div class="shopee-variant-group">
                    ${uniqueColors.length > 0 ? `
                        <div class="shopee-variant-row">
                            <div class="shopee-variant-label">Màu Sắc</div>
                            <div class="shopee-variant-options">
                                ${uniqueColors.map(color => {
                                    const sampleVar = variants.find(varItem => varItem.color === color && varItem.imageUrl);
                                    const thumbImg = sampleVar ? `<img src="${sampleVar.imageUrl}" class="shopee-option-btn-thumb" alt="${color}">` : '';
                                    return `
                                    <button class="shopee-option-btn ${color === state.selectedColor ? 'active' : ''}" data-color="${color}" type="button">
                                        ${thumbImg}
                                        <span>${color}</span>
                                    </button>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${uniqueTypes.length > 0 ? `
                        <div class="shopee-variant-row">
                            <div class="shopee-variant-label">Phân Loại</div>
                            <div class="shopee-variant-options">
                                ${uniqueTypes.map(type => `
                                    <button class="shopee-option-btn ${type === state.selectedType ? 'active' : ''}" data-type="${type}" type="button">
                                        <span>${type}</span>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <div class="shopee-quantity-row">
                        <div class="shopee-variant-label">Số Lượng</div>
                        <div class="shopee-qty-wrapper">
                            <button class="shopee-qty-btn" id="shopeeModalQtyMinus" type="button">-</button>
                            <input id="shopeeModalQtyInput" type="text" class="shopee-qty-input" value="${state.selectedQty}" readonly>
                            <button class="shopee-qty-btn" id="shopeeModalQtyPlus" type="button">+</button>
                        </div>
                        <div class="shopee-stock-text">
                            ${stock > 0 ? `Còn ${stock} sản phẩm có sẵn` : '<span style="color: var(--accent); font-weight: 700;">Tạm hết hàng</span>'}
                        </div>
                    </div>
                </div>

                <div class="shopee-actions-row">
                    <button id="shopeeAddCartBtn" class="shopee-btn-add-cart" ${stock <= 0 ? 'disabled' : ''} type="button">
                        <i class="ri-shopping-cart-2-line" style="font-size: 1.25rem;"></i>
                        <span>Thêm Vào Giỏ Hàng</span>
                    </button>
                    <button id="shopeeBuyNowBtn" class="shopee-btn-buy-now" ${stock <= 0 ? 'disabled' : ''} type="button">
                        <i class="ri-flashlight-fill"></i>
                        <span>Mua Ngay</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="shopee-detail-tabs">
            <div class="shopee-section-heading">
                <i class="ri-file-list-3-line" style="color: #ee4d2d;"></i>
                <span>CHI TIẾT SẢN PHẨM</span>
            </div>
            <table class="shopee-specs-table">
                <tbody>
                    <tr>
                        <td>Danh Mục</td>
                        <td>${product.categoryName || product.category}</td>
                    </tr>
                    <tr>
                        <td>Thương Hiệu</td>
                        <td>Chính Hãng NovaShop</td>
                    </tr>
                    <tr>
                        <td>Bảo Hành</td>
                        <td>Bảo hành điện tử 12 tháng</td>
                    </tr>
                </tbody>
            </table>

            <div class="shopee-section-heading">
                <i class="ri-article-line" style="color: #ee4d2d;"></i>
                <span>MÔ TẢ SẢN PHẨM</span>
            </div>
            <div class="shopee-desc-content">
                <p>${product.description || 'Sản phẩm chính hãng với tiêu chuẩn chất lượng cao, bảo hành điện tử chính hãng toàn quốc.'}</p>
            </div>
        </div>
        `;

        content.querySelectorAll('.shopee-thumb-item').forEach((thumb) => {
            thumb.addEventListener('click', () => {
                const imgUrl = thumb.getAttribute('data-thumb');
                if (!imgUrl) return;
                const matchedVariant = variants.find(v => v.imageUrl === imgUrl);
                if (matchedVariant) {
                    if (matchedVariant.color) state.selectedColor = matchedVariant.color;
                    if (matchedVariant.type) state.selectedType = matchedVariant.type;
                    state.selectedVariant = matchedVariant;
                    renderShopeeModal();
                } else {
                    const mainImg = document.getElementById('shopeeMainImg') as HTMLImageElement | null;
                    if (mainImg) mainImg.src = imgUrl;
                    content.querySelectorAll('.shopee-thumb-item').forEach(t => t.classList.remove('active'));
                    thumb.classList.add('active');
                }
            });
        });

        content.querySelectorAll('[data-color]').forEach((btn) => {
            btn.addEventListener('click', () => {
                state.selectedColor = btn.getAttribute('data-color') || '';
                const matched = findCurrentVariant();
                state.selectedVariant = matched;
                if (matched && matched.type) {
                    state.selectedType = matched.type;
                }
                renderShopeeModal();
            });
        });

        content.querySelectorAll('[data-type]').forEach((btn) => {
            btn.addEventListener('click', () => {
                state.selectedType = btn.getAttribute('data-type') || '';
                state.selectedVariant = findCurrentVariant();
                renderShopeeModal();
            });
        });

        const qtyInput = document.getElementById('shopeeModalQtyInput') as HTMLInputElement | null;
        const minusBtn = document.getElementById('shopeeModalQtyMinus');
        const plusBtn = document.getElementById('shopeeModalQtyPlus');

        if (minusBtn && qtyInput) {
            minusBtn.addEventListener('click', () => {
                if (state.selectedQty > 1) {
                    state.selectedQty--;
                    qtyInput.value = state.selectedQty.toString();
                }
            });
        }

        if (plusBtn && qtyInput) {
            plusBtn.addEventListener('click', () => {
                const maxStock = state.selectedVariant ? state.selectedVariant.stock : product.stock;
                if (state.selectedQty < maxStock) {
                    state.selectedQty++;
                    qtyInput.value = state.selectedQty.toString();
                }
            });
        }

        const addCartBtn = document.getElementById('shopeeAddCartBtn');
        if (addCartBtn) {
            addCartBtn.addEventListener('click', () => {
                const varLabel = state.selectedVariant
                    ? (state.selectedVariant.name || `${state.selectedColor} ${state.selectedType}`.trim())
                    : undefined;
                addItemToCart(product, state.selectedQty, varLabel);
                modal.classList.remove('active');
            });
        }

        const buyNowBtn = document.getElementById('shopeeBuyNowBtn');
        if (buyNowBtn) {
            buyNowBtn.addEventListener('click', () => {
                const varLabel = state.selectedVariant
                    ? (state.selectedVariant.name || `${state.selectedColor} ${state.selectedType}`.trim())
                    : undefined;
                addItemToCart(product, state.selectedQty, varLabel);
                modal.classList.remove('active');
                navigate('/cart');
            });
        }
    };

    renderShopeeModal();
    modal.classList.add('active');
}

const addItemToCart = (product: Product, quantity: number = 1, variantName?: string): void => {
    const itemPrice = state.selectedVariant ? state.selectedVariant.price : product.price;
    const itemImage = state.selectedVariant?.imageUrl || product.imageUrl;

    const existingIndex = state.cart.findIndex(
        item => item.productId === product.id && item.variantName === variantName
    );

    if (existingIndex > -1) {
        state.cart[existingIndex].quantity += quantity;
    } else {
        state.cart.push({
            id: 'cart_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            productId: product.id,
            name: product.name,
            price: itemPrice,
            imageUrl: itemImage,
            quantity: quantity,
            variantName: variantName
        });
    }

    saveCart();
    showToast('Thành công', `Đã thêm ${quantity} sản phẩm vào giỏ hàng`, 'success');
};

const initCartView = (): void => {
    renderCartItemsList();

    const checkoutForm = document.getElementById('checkoutSubmitForm');
    const confirmBtn = document.getElementById('confirmOrderBtn') as HTMLButtonElement | null;
    const nameInput = document.getElementById('checkoutName') as HTMLInputElement | null;
    const phoneInput = document.getElementById('checkoutPhone') as HTMLInputElement | null;
    const addressInput = document.getElementById('checkoutAddress') as HTMLTextAreaElement | null;
    const paymentSelect = document.getElementById('checkoutPayment') as HTMLSelectElement | null;

    if (checkoutForm && confirmBtn) {
        checkoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (state.cart.length === 0) {
                showToast('Thông báo', 'Giỏ hàng đang trống', 'warning');
                return;
            }

            const orderData = {
                userId: state.user ? state.user.id : 'guest_' + Date.now(),
                customerName: nameInput ? nameInput.value.trim() : '',
                customerPhone: phoneInput ? phoneInput.value.trim() : '',
                shippingAddress: addressInput ? addressInput.value.trim() : '',
                paymentMethod: paymentSelect ? paymentSelect.value : 'cod',
                items: state.cart
            };

            confirmBtn.disabled = true;
            confirmBtn.innerHTML = `<span>Đang xử lý đơn hàng...</span> <i class="ri-loader-4-line ri-spin"></i>`;

            try {
                const res = await fetch(`${API_BASE}/api/orders`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(state.token ? { Authorization: `Bearer ${state.token}` } : {})
                    },
                    body: JSON.stringify(orderData)
                });
                const result = await res.json();

                if (result.success) {
                    state.cart = [];
                    saveCart();
                    showToast('Thành công', `Đặt hàng thành công! Mã đơn: #${result.data.id}`, 'success');
                    setTimeout(() => {
                        navigate('/orders');
                    }, 1000);
                } else {
                    showToast('Lỗi đặt hàng', result.message || 'Không thể tạo đơn hàng', 'error');
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = `<span>Xác Nhận Đặt Hàng</span> <i class="ri-check-double-line"></i>`;
                }
            } catch {
                showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ', 'error');
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = `<span>Xác Nhận Đặt Hàng</span> <i class="ri-check-double-line"></i>`;
            }
        });
    }
};

const renderCartItemsList = (): void => {
    const emptyView = document.getElementById('emptyCartView');
    const activeView = document.getElementById('activeCartView');
    const itemsList = document.getElementById('cartItemsList');
    const headerCount = document.getElementById('cartHeaderCount');
    const summarySubtotal = document.getElementById('summarySubtotal');
    const summaryGrandTotal = document.getElementById('summaryGrandTotal');

    if (state.cart.length === 0) {
        if (emptyView) emptyView.style.display = 'block';
        if (activeView) activeView.style.display = 'none';
        return;
    }

    if (emptyView) emptyView.style.display = 'none';
    if (activeView) activeView.style.display = 'grid';

    const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (headerCount) headerCount.textContent = `${totalCount} sản phẩm`;
    if (summarySubtotal) summarySubtotal.textContent = formatPrice(totalAmount);
    if (summaryGrandTotal) summaryGrandTotal.textContent = formatPrice(totalAmount);

    if (itemsList) {
        itemsList.innerHTML = state.cart.map((item, index) => `
            <div class="cart-item-row">
                <img src="${item.imageUrl}" alt="${item.name}" class="cart-row-img">
                <div class="cart-row-info">
                    <div class="cart-row-name">${item.name}</div>
                    ${item.variantName ? `<div class="cart-row-variant">Phân loại: ${item.variantName}</div>` : ''}
                    <div class="cart-row-price">${formatPrice(item.price)}</div>
                </div>
                <div class="cart-row-controls">
                    <div class="qty-control">
                        <button class="qty-btn" type="button" data-action="minus" data-idx="${index}">-</button>
                        <input type="text" class="qty-input" value="${item.quantity}" readonly>
                        <button class="qty-btn" type="button" data-action="plus" data-idx="${index}">+</button>
                    </div>
                    <button class="btn-icon" type="button" style="color: var(--accent);" title="Xóa" data-action="remove" data-idx="${index}">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            </div>
        `).join('');

        itemsList.querySelectorAll('[data-action]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-action');
                const idx = parseInt(btn.getAttribute('data-idx') || '0', 10);
                if (action === 'minus') {
                    state.cart[idx].quantity--;
                    if (state.cart[idx].quantity <= 0) state.cart.splice(idx, 1);
                    saveCart();
                    renderCartItemsList();
                } else if (action === 'plus') {
                    state.cart[idx].quantity++;
                    saveCart();
                    renderCartItemsList();
                } else if (action === 'remove') {
                    state.cart.splice(idx, 1);
                    saveCart();
                    renderCartItemsList();
                    showToast('Giỏ hàng', 'Đã xóa sản phẩm khỏi giỏ hàng', 'warning');
                }
            });
        });
    }
};

const initOrdersView = async (): Promise<void> => {
    const loadingEl = document.getElementById('ordersLoading');
    const emptyEl = document.getElementById('ordersEmpty');
    const listEl = document.getElementById('ordersList');

    try {
        const endpoint = (state.user && state.user.id)
            ? `${API_BASE}/api/orders/user/${state.user.id}`
            : `${API_BASE}/api/orders`;

        const res = await fetch(endpoint, {
            headers: {
                ...(state.token ? { Authorization: `Bearer ${state.token}` } : {})
            }
        });
        const data = await res.json();

        if (loadingEl) loadingEl.style.display = 'none';

        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            state.orders = data.data;
            if (emptyEl) emptyEl.style.display = 'none';
            if (listEl) {
                listEl.innerHTML = state.orders.map((order) => {
                    const items = Array.isArray(order.items) ? order.items : [];
                    const statusMap: Record<string, { label: string; class: string }> = {
                        completed: { label: 'Hoàn thành', class: 'status-completed' },
                        processing: { label: 'Đang xử lý', class: 'status-processing' },
                        pending: { label: 'Chờ xác nhận', class: 'status-pending' }
                    };
                    const statusInfo = statusMap[order.status] || { label: order.status, class: 'status-pending' };

                    return `
                    <div class="order-card">
                        <div class="order-card-top">
                            <div class="order-id-group">
                                <span class="order-id-text">#${order.id}</span>
                                <span class="order-date-text">• ${formatDate(order.createdAt)}</span>
                            </div>
                            <div class="order-status-badge ${statusInfo.class}">
                                ${statusInfo.label}
                            </div>
                        </div>

                        <div class="order-items-list">
                            ${items.map((item) => `
                                <div class="order-item-entry">
                                    <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'}" alt="${item.name}" class="order-item-thumb">
                                    <div class="order-item-meta">
                                        <div class="order-item-name">${item.name}</div>
                                        ${item.variantName ? `<div class="order-item-variant">Phân loại: ${item.variantName}</div>` : ''}
                                        <div class="order-item-price-qty">${formatPrice(item.price)} x ${item.quantity}</div>
                                    </div>
                                    <div style="font-weight: 700; color: var(--text-main); font-size: 0.9375rem;">
                                        ${formatPrice(item.price * item.quantity)}
                                    </div>
                                </div>
                            `).join('')}
                        </div>

                        <div class="order-card-bottom">
                            <div style="font-size: 0.8125rem; color: var(--text-muted);">
                                Người nhận: <strong>${order.customerName}</strong> (${order.customerPhone})
                            </div>
                            <div class="order-total-group">
                                <span class="order-total-label">Tổng số tiền:</span>
                                <span class="order-total-val">${formatPrice(order.totalAmount)}</span>
                            </div>
                        </div>
                    </div>
                    `;
                }).join('');
            }
        } else {
            if (emptyEl) emptyEl.style.display = 'block';
        }
    } catch {
        if (loadingEl) loadingEl.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'block';
    }
};

const initLoginView = (): void => {
    const loginForm = document.getElementById('customerLoginForm');
    const emailInput = document.getElementById('loginEmail') as HTMLInputElement | null;
    const passwordInput = document.getElementById('loginPassword') as HTMLInputElement | null;
    const submitBtn = document.getElementById('loginSubmitBtn') as HTMLButtonElement | null;
    const togglePassBtn = document.getElementById('togglePasswordBtn');
    const togglePassIcon = document.getElementById('togglePasswordIcon');

    if (togglePassBtn && passwordInput && togglePassIcon) {
        togglePassBtn.addEventListener('click', () => {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                togglePassIcon.className = 'ri-eye-off-line';
            } else {
                passwordInput.type = 'password';
                togglePassIcon.className = 'ri-eye-line';
            }
        });
    }

    if (loginForm && emailInput && passwordInput && submitBtn) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span>Đang đăng nhập...</span> <i class="ri-loader-4-line ri-spin"></i>`;

            try {
                const res = await fetch(`${API_BASE}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const result = await res.json();

                if (result.success) {
                    state.token = result.data.token;
                    state.user = result.data.user;
                    localStorage.setItem('novashop_customer_token', result.data.token);
                    localStorage.setItem('novashop_customer_user', JSON.stringify(result.data.user));
                    showToast('Thành công', `Xin chào, ${result.data.user.name}!`, 'success');
                    setTimeout(() => {
                        navigate('/');
                    }, 800);
                } else {
                    showToast('Đăng nhập thất bại', result.message || 'Sai thông tin đăng nhập', 'error');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<span>Đăng Nhập Ngay</span> <i class="ri-arrow-right-line"></i>`;
                }
            } catch {
                showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<span>Đăng Nhập Ngay</span> <i class="ri-arrow-right-line"></i>`;
            }
        });
    }
};

const initRegisterView = (): void => {
    const regForm = document.getElementById('customerRegisterForm');
    const submitBtn = document.getElementById('regSubmitBtn') as HTMLButtonElement | null;
    const nameInput = document.getElementById('regName') as HTMLInputElement | null;
    const emailInput = document.getElementById('regEmail') as HTMLInputElement | null;
    const passwordInput = document.getElementById('regPassword') as HTMLInputElement | null;
    const phoneInput = document.getElementById('regPhone') as HTMLInputElement | null;
    const addressInput = document.getElementById('regAddress') as HTMLTextAreaElement | null;
    const togglePassBtn = document.getElementById('toggleRegPasswordBtn');
    const togglePassIcon = document.getElementById('toggleRegPasswordIcon');

    if (togglePassBtn && passwordInput && togglePassIcon) {
        togglePassBtn.addEventListener('click', () => {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                togglePassIcon.className = 'ri-eye-off-line';
            } else {
                passwordInput.type = 'password';
                togglePassIcon.className = 'ri-eye-line';
            }
        });
    }

    if (regForm && submitBtn && nameInput && emailInput && passwordInput && phoneInput && addressInput) {
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = nameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const phone = phoneInput.value.trim();
            const address = addressInput.value.trim();

            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span>Đang đăng ký...</span> <i class="ri-loader-4-line ri-spin"></i>`;

            try {
                const res = await fetch(`${API_BASE}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, phone, address })
                });
                const result = await res.json();

                if (result.success) {
                    state.token = result.data.token;
                    state.user = result.data.user;
                    localStorage.setItem('novashop_customer_token', result.data.token);
                    localStorage.setItem('novashop_customer_user', JSON.stringify(result.data.user));
                    showToast('Thành công', 'Đăng ký tài khoản thành công! Đang chuyển hướng...', 'success');
                    setTimeout(() => {
                        navigate('/');
                    }, 1000);
                } else {
                    showToast('Đăng ký thất bại', result.message || 'Lỗi đăng ký tài khoản', 'error');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<span>Hoàn Tất Đăng Ký</span> <i class="ri-check-line"></i>`;
                }
            } catch {
                showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<span>Hoàn Tất Đăng Ký</span> <i class="ri-check-line"></i>`;
            }
        });
    }
};

const initChatWidget = (): void => {
    const launcherBtn = document.getElementById('chatLauncherBtn');
    const chatWindow = document.getElementById('chatWidgetWindow');
    const closeBtn = document.getElementById('chatCloseBtn');
    const modeToggleBtn = document.getElementById('chatModeToggleBtn');
    const chatForm = document.getElementById('chatMessageForm');
    const chatInput = document.getElementById('chatInput') as HTMLInputElement | null;

    if (launcherBtn && chatWindow) {
        launcherBtn.addEventListener('click', () => {
            state.chatOpen = !state.chatOpen;
            if (state.chatOpen) {
                chatWindow.classList.add('active');
                if (!state.chatSessionId) {
                    startChatSession();
                } else {
                    loadChatMessages();
                }
            } else {
                chatWindow.classList.remove('active');
            }
        });
    }

    if (closeBtn && chatWindow) {
        closeBtn.addEventListener('click', () => {
            state.chatOpen = false;
            chatWindow.classList.remove('active');
        });
    }

    if (modeToggleBtn) {
        modeToggleBtn.addEventListener('click', () => {
            requestHumanSupport();
        });
    }

    if (chatForm && chatInput) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (text) {
                sendChatMessage(text);
                chatInput.value = '';
            }
        });
    }

    document.querySelectorAll('.quick-chip-btn').forEach((chip) => {
        chip.addEventListener('click', () => {
            const query = chip.getAttribute('data-query');
            if (query) {
                sendChatMessage(query);
            }
        });
    });
};

const startChatSession = async (): Promise<void> => {
    try {
        const res = await fetch(`${API_BASE}/api/chat/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: state.user?.id || null,
                guestName: state.user?.name || 'Khách vãng lai',
                guestEmail: state.user?.email || 'guest@novashop.local'
            })
        });
        const data = await res.json();
        if (data.success && data.data) {
            state.chatSessionId = data.data.id;
            state.chatSession = data.data;
            localStorage.setItem('novashop_chat_session', data.data.id);
            loadChatMessages();
        }
    } catch {}
};

const loadChatMessages = async (): Promise<void> => {
    if (!state.chatSessionId) return;

    try {
        const res = await fetch(`${API_BASE}/api/chat/session/${state.chatSessionId}`);
        const data = await res.json();
        if (data.success && data.data) {
            state.chatSession = data.data.session;
            state.chatMessages = data.data.messages || [];
            updateChatHeaderMode();
            renderChatMessages();
        }
    } catch {}
};

const updateChatHeaderMode = (): void => {
    const badge = document.getElementById('chatModeBadge');
    const label = document.getElementById('chatModeToggleLabel');
    if (!badge || !label) return;

    if (state.chatSession?.status === 'human_waiting') {
        badge.className = 'chat-human-pill';
        badge.textContent = 'CHỜ CSKH';
        label.textContent = 'Đang đợi';
    } else if (state.chatSession?.status === 'human_active') {
        badge.className = 'chat-human-pill';
        badge.textContent = 'CSKH TRỰC TIẾP';
        label.textContent = 'Về AI';
    } else {
        badge.className = 'chat-ai-pill';
        badge.textContent = 'GEMINI AI';
        label.textContent = 'Gặp CSKH';
    }
};

const requestHumanSupport = async (): Promise<void> => {
    if (!state.chatSessionId) return;
    try {
        const res = await fetch(`${API_BASE}/api/chat/session/${state.chatSessionId}/human-request`, {
            method: 'POST'
        });
        const data = await res.json();
        if (data.success) {
            showToast('Hỗ trợ khách hàng', 'Đã chuyển yêu cầu tới nhân viên CSKH', 'success');
            loadChatMessages();
        }
    } catch {}
};

const sendChatMessage = async (text: string): Promise<void> => {
    if (!state.chatSessionId) {
        await startChatSession();
    }
    if (!state.chatSessionId) return;

    appendTempUserMessage(text);

    try {
        const res = await fetch(`${API_BASE}/api/chat/session/${state.chatSessionId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        const data = await res.json();
        if (data.success) {
            loadChatMessages();
        }
    } catch {
        showToast('Lỗi gửi tin', 'Không thể kết nối đến máy chủ live chat', 'error');
    }
};

const appendTempUserMessage = (text: string): void => {
    const container = document.getElementById('chatMessagesContainer');
    if (!container) return;

    const el = document.createElement('div');
    el.className = 'chat-msg chat-msg-user';
    el.innerHTML = `
        <div class="chat-bubble chat-bubble-user">
            ${escapeHtml(text)}
        </div>
    `;
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
};

const renderChatMessages = (): void => {
    const container = document.getElementById('chatMessagesContainer');
    if (!container) return;

    if (state.chatMessages.length === 0) {
        container.innerHTML = `
            <div class="chat-msg chat-msg-ai">
                <div class="chat-bubble chat-bubble-ai">
                    Xin chào! Tôi là Trợ lý AI của NovaShop. Tôi có thể hỗ trợ bạn tìm kiếm sản phẩm, kiểm tra đơn hàng hoặc trả lời các thắc mắc mua sắm!
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = state.chatMessages.map((msg) => {
        const isUser = msg.sender === 'user';
        const senderClass = isUser ? 'chat-msg-user' : 'chat-msg-ai';
        const bubbleClass = isUser ? 'chat-bubble-user' : 'chat-bubble-ai';

        const recCards = (msg.productRecommendations && msg.productRecommendations.length > 0)
            ? `
            <div class="chat-recs-grid">
                ${msg.productRecommendations.map((prod) => `
                    <div class="chat-rec-item" data-rec-id="${prod.id}">
                        <img src="${prod.imageUrl}" alt="${prod.name}" class="chat-rec-thumb">
                        <div class="chat-rec-info">
                            <div class="chat-rec-name">${prod.name}</div>
                            <div class="chat-rec-price">${formatPrice(prod.price)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            `
            : '';

        return `
            <div class="chat-msg ${senderClass}">
                <div class="chat-bubble ${bubbleClass}">
                    ${escapeHtml(msg.message)}
                    ${recCards}
                </div>
            </div>
        `;
    }).join('');

    container.scrollTop = container.scrollHeight;

    container.querySelectorAll('.chat-rec-item').forEach((item) => {
        item.addEventListener('click', () => {
            const id = item.getAttribute('data-rec-id');
            const found = state.products.find(p => p.id.toString() === id?.toString());
            if (found) openShopeeDetail(found);
        });
    });
};

const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

window.addEventListener('popstate', () => {
    state.currentRoute = window.location.pathname;
    renderApp();
});

document.addEventListener('DOMContentLoaded', () => {
    renderApp();
});
