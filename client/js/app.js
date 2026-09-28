"use strict";
const API_BASE = window.location.origin;
const state = {
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
const formatPrice = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount || 0);
};
const formatDate = (dateStr) => {
    if (!dateStr)
        return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};
const showToast = (title, message, type = 'success') => {
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
const saveCart = () => {
    localStorage.setItem('novashop_cart', JSON.stringify(state.cart));
    updateCartBadge();
};
const updateCartBadge = () => {
    const badge = document.getElementById('cartCountBadge');
    if (badge) {
        const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
        badge.textContent = totalCount.toString();
    }
};
const renderHeaderTemplate = () => {
    const cartCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    const userMenuHtml = state.user
        ? `
        <div style="display: flex; align-items: center; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 0.875rem; color: var(--text-main);">
                <i class="ri-user-smile-fill" style="color: var(--primary); font-size: 1.125rem;"></i>
                <span>${state.user.name}</span>
            </div>
            <a href="/orders" class="btn btn-secondary btn-sm" data-nav-link>
                <i class="ri-file-list-3-line"></i>
                <span>Đơn mua</span>
            </a>
            <button id="logoutBtn" type="button" class="btn btn-outline btn-sm" style="border-color: var(--border-light); color: var(--text-muted);">
                <i class="ri-logout-box-r-line"></i>
            </button>
        </div>
        `
        : `
        <a href="/login" class="btn btn-secondary btn-sm" data-nav-link>
            <i class="ri-user-line"></i>
            <span>Đăng Nhập</span>
        </a>
        <a href="/register" class="btn btn-primary btn-sm" data-nav-link>
            <span>Đăng Ký</span>
        </a>
        `;
    return `
    <header class="site-header">
        <div class="container nav-container">
            <a href="/" class="brand-logo" data-nav-link>
                <div class="brand-icon">
                    <i class="ri-shopping-bag-3-fill"></i>
                </div>
                <span>NovaShop</span>
            </a>

            <div class="search-bar-wrapper">
                <input type="text" id="searchInput" class="search-input" placeholder="Tìm kiếm tai nghe, bàn phím, thiết bị số..." value="${state.searchQuery || ''}">
                <button id="searchBtn" class="search-btn" aria-label="Tìm kiếm" type="button">
                    <i class="ri-search-line"></i>
                </button>
            </div>

            <div class="nav-actions">
                <div id="userMenuWrapper">
                    ${userMenuHtml}
                </div>

                <a href="/cart" class="btn-icon cart-btn-trigger" aria-label="Giỏ hàng" data-nav-link>
                    <i class="ri-shopping-cart-2-line"></i>
                    <span id="cartCountBadge" class="cart-count">${cartCount}</span>
                </a>
            </div>
        </div>
    </header>
    `;
};
const renderFooterTemplate = () => {
    return `
    <footer class="site-footer">
        <div class="container">
            <div class="footer-grid">
                <div>
                    <div class="footer-brand">NovaShop</div>
                    <p class="footer-desc">
                        Nền tảng mua sắm trực tuyến uy tín hàng đầu, cam kết 100% hàng chính hãng, đổi trả thuận tiện và giao hàng nhanh toàn quốc.
                    </p>
                </div>
                <div>
                    <h3 class="footer-col-title">Về Chúng Tôi</h3>
                    <ul class="footer-links">
                        <li><a href="#" onclick="return false;">Giới thiệu công ty</a></li>
                        <li><a href="#" onclick="return false;">Tuyển dụng</a></li>
                        <li><a href="#" onclick="return false;">Điều khoản dịch vụ</a></li>
                        <li><a href="#" onclick="return false;">Chính sách bảo mật</a></li>
                    </ul>
                </div>
                <div>
                    <h3 class="footer-col-title">Hỗ Trợ Khách Hàng</h3>
                    <ul class="footer-links">
                        <li><a href="#" onclick="return false;">Trung tâm trợ giúp</a></li>
                        <li><a href="#" onclick="return false;">Hướng dẫn mua hàng</a></li>
                        <li><a href="#" onclick="return false;">Chính sách vận chuyển</a></li>
                        <li><a href="/orders" data-nav-link>Tra cứu đơn hàng</a></li>
                    </ul>
                </div>
                <div>
                    <h3 class="footer-col-title">Thông Tin Liên Hệ</h3>
                    <p class="footer-desc">Hotline CSKH: 1900 8888 (8:00 - 21:30)</p>
                    <p class="footer-desc">Email hỗ trợ: support@novashop.vn</p>
                    <p class="footer-desc">Địa chỉ: Hà Nội & TP. Hồ Chí Minh</p>
                </div>
            </div>
            <div class="footer-bottom">
                <div>&copy; 2026 NovaShop. Bảo lưu mọi quyền.</div>
                <div>Mua sắm thông minh & tiện lợi</div>
            </div>
        </div>
    </footer>
    `;
};
const renderChatWidgetTemplate = () => {
    return `
    <button id="chatLauncherBtn" class="chat-launcher-btn" aria-label="Mở live chat hỗ trợ khách hàng" type="button">
        <i class="ri-customer-service-2-fill"></i>
        <span class="chat-launcher-badge"></span>
    </button>

    <div id="chatWidgetWindow" class="chat-widget-window ${state.chatOpen ? 'open' : ''}">
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
const renderStorefrontView = () => {
    return `
    ${renderHeaderTemplate()}

    <main>
        <section class="hero-section">
            <div class="container">
                <div class="hero-banner">
                    <div class="hero-content">
                        <div class="hero-tag">
                            <i class="ri-fire-fill"></i> Ưu đãi công nghệ đỉnh cao 2026
                        </div>
                        <h1 class="hero-title">
                            Nâng Tầm Trải Nghiệm <br>
                            <span class="hero-highlight">Mua Sắm Đẳng Cấp</span>
                        </h1>
                        <p class="hero-subtitle">
                            Khám phá hàng ngàn sản phẩm công nghệ, thời trang và gia dụng chính hãng với ưu đãi tốt nhất mỗi ngày.
                        </p>
                        <div class="hero-actions">
                            <a href="#productsSection" class="btn btn-primary btn-lg">
                                <span>Khám Phá Sản Phẩm</span>
                                <i class="ri-arrow-right-line"></i>
                            </a>
                        </div>
                    </div>
                    <div class="hero-showcase">
                        <div class="hero-img-card">
                            <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80" alt="Sản phẩm nổi bật">
                        </div>
                    </div>
                </div>

                <div class="trust-features">
                    <div class="trust-item">
                        <div class="trust-icon-box trust-box-1">
                            <i class="ri-truck-line"></i>
                        </div>
                        <div>
                            <div class="trust-title">Giao Hàng Siêu Tốc</div>
                            <div class="trust-desc">Nội thành chỉ trong 2 giờ</div>
                        </div>
                    </div>
                    <div class="trust-item">
                        <div class="trust-icon-box trust-box-2">
                            <i class="ri-shield-check-line"></i>
                        </div>
                        <div>
                            <div class="trust-title">100% Chính Hãng</div>
                            <div class="trust-desc">Bảo hành điện tử toàn quốc</div>
                        </div>
                    </div>
                    <div class="trust-item">
                        <div class="trust-icon-box trust-box-3">
                            <i class="ri-exchange-box-line"></i>
                        </div>
                        <div>
                            <div class="trust-title">Đổi Trả Dễ Dàng</div>
                            <div class="trust-desc">Miễn phí đổi trả trong 7 ngày</div>
                        </div>
                    </div>
                    <div class="trust-item">
                        <div class="trust-icon-box trust-box-4">
                            <i class="ri-customer-service-2-line"></i>
                        </div>
                        <div>
                            <div class="trust-title">Hỗ Trợ 24/7</div>
                            <div class="trust-desc">Tư vấn tận tình chu đáo</div>
                        </div>
                    </div>
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
const renderCartView = () => {
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
const renderOrdersView = () => {
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
const renderLoginView = () => {
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
const renderRegisterView = () => {
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
const renderApp = () => {
    const appEl = document.getElementById('app');
    if (!appEl)
        return;
    if (state.flashCountdownTimer) {
        clearInterval(state.flashCountdownTimer);
        state.flashCountdownTimer = null;
    }
    const path = window.location.pathname;
    if (path === '/cart') {
        document.title = 'Giỏ Hàng & Đặt Hàng | NovaShop';
        appEl.innerHTML = renderCartView();
        initCartView();
    }
    else if (path === '/orders') {
        document.title = 'Đơn Mua Của Tôi | NovaShop';
        appEl.innerHTML = renderOrdersView();
        initOrdersView();
    }
    else if (path === '/login') {
        document.title = 'Đăng Nhập Khách Hàng | NovaShop';
        appEl.innerHTML = renderLoginView();
        initLoginView();
    }
    else if (path === '/register') {
        document.title = 'Đăng Ký Tài Khoản | NovaShop';
        appEl.innerHTML = renderRegisterView();
        initRegisterView();
    }
    else {
        document.title = 'NovaShop | Mua Sắm Trực Tuyến Chính Hãng';
        appEl.innerHTML = renderStorefrontView();
        initStorefrontView();
    }
    bindGlobalNavigation();
};
const navigate = (path) => {
    if (window.location.pathname !== path) {
        window.history.pushState(null, '', path);
    }
    state.currentRoute = path;
    renderApp();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};
const bindGlobalNavigation = () => {
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
const initStorefrontView = () => {
    fetchCategories();
    fetchProducts();
    initFlashSaleCountdown();
    bindStorefrontControls();
    initChatWidget();
};
const bindStorefrontControls = () => {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const sortSelect = document.getElementById('sortSelect');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const minPriceInput = document.getElementById('minPriceInput');
    const maxPriceInput = document.getElementById('maxPriceInput');
    const applyPriceBtn = document.getElementById('applyPriceBtn');
    const inStockCheckbox = document.getElementById('inStockCheckbox');
    const flashSaleCheckbox = document.getElementById('flashSaleCheckbox');
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
            }
            else if (priceType === '1m-5m') {
                state.minPrice = 1000000;
                state.maxPrice = 5000000;
            }
            else if (priceType === '5m-10m') {
                state.minPrice = 5000000;
                state.maxPrice = 10000000;
            }
            else if (priceType === 'over-10m') {
                state.minPrice = 10000000;
                state.maxPrice = null;
            }
            else {
                state.minPrice = null;
                state.maxPrice = null;
            }
            if (minPriceInput)
                minPriceInput.value = state.minPrice ? state.minPrice.toString() : '';
            if (maxPriceInput)
                maxPriceInput.value = state.maxPrice ? state.maxPrice.toString() : '';
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
            if (searchInput)
                searchInput.value = '';
            if (minPriceInput)
                minPriceInput.value = '';
            if (maxPriceInput)
                maxPriceInput.value = '';
            if (inStockCheckbox)
                inStockCheckbox.checked = false;
            if (flashSaleCheckbox)
                flashSaleCheckbox.checked = false;
            if (sortSelect)
                sortSelect.value = 'newest';
            document.querySelectorAll('#priceFilterPills .filter-pill').forEach((p, idx) => {
                if (idx === 0)
                    p.classList.add('active');
                else
                    p.classList.remove('active');
            });
            document.querySelectorAll('#ratingFilterPills .filter-pill').forEach((p, idx) => {
                if (idx === 0)
                    p.classList.add('active');
                else
                    p.classList.remove('active');
            });
            fetchCategories();
            fetchProducts();
        });
    }
    const modalCloseBtn = document.querySelector('[data-close-modal="quickviewModal"]');
    const modal = document.getElementById('quickviewModal');
    if (modalCloseBtn && modal) {
        modalCloseBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal)
                modal.classList.remove('active');
        });
    }
};
const fetchCategories = async () => {
    const tabsContainer = document.getElementById('categoryTabs');
    if (!tabsContainer)
        return;
    try {
        const res = await fetch(`${API_BASE}/api/categories`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
            state.categories = data.data;
            renderCategories();
        }
    }
    catch {
        state.categories = [
            { id: 'cat_all', name: 'Tất Cả Sản Phẩm' },
            { id: 'cat_audio', name: 'Tai Nghe & Âm Thanh' },
            { id: 'cat_gear', name: 'Bàn Phím & Chuột' },
            { id: 'cat_screen', name: 'Màn Hình & Phụ Kiện' }
        ];
        renderCategories();
    }
};
const renderCategories = () => {
    const tabsContainer = document.getElementById('categoryTabs');
    if (!tabsContainer)
        return;
    const allCat = [{ id: 'cat_all', name: 'Tất Cả Sản Phẩm' }, ...state.categories.filter(c => c.id !== 'cat_all')];
    tabsContainer.innerHTML = allCat.map((cat) => `
        <button class="category-tab ${state.activeCategory === cat.id ? 'active' : ''}" data-cat-id="${cat.id}" type="button">
            <span>${cat.name}</span>
        </button>
    `).join('');
    tabsContainer.querySelectorAll('.category-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            tabsContainer.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.activeCategory = tab.getAttribute('data-cat-id') || 'cat_all';
            fetchProducts();
        });
    });
};
const fetchProducts = async () => {
    const countEl = document.getElementById('productTotalCount');
    const gridEl = document.getElementById('productsGrid');
    const bannerEl = document.getElementById('searchActiveBanner');
    const keywordEl = document.getElementById('searchKeywordDisplay');
    if (bannerEl && keywordEl) {
        if (state.searchQuery) {
            bannerEl.style.display = 'flex';
            keywordEl.textContent = `"${state.searchQuery}"`;
        }
        else {
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
            if (countEl)
                countEl.textContent = `${state.products.length} sản phẩm phù hợp`;
            renderProductsGrid();
            renderFlashSaleGrid();
        }
        else {
            if (gridEl) {
                gridEl.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">Không tìm thấy sản phẩm nào.</div>`;
            }
        }
    }
    catch {
        if (gridEl) {
            gridEl.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--accent);">Không thể kết nối đến máy chủ sản phẩm.</div>`;
        }
    }
};
const renderProductsGrid = () => {
    const gridEl = document.getElementById('productsGrid');
    if (!gridEl)
        return;
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
            ? `<div class="product-badge badge-sale">-${Math.round((1 - prod.price / prod.originalPrice) * 100)}%</div>`
            : (prod.isFlashSale ? `<div class="product-badge badge-flash"><i class="ri-flashlight-fill"></i> Flash Sale</div>` : '');
        return `
        <div class="product-card" data-product-id="${prod.id}">
            <div class="product-thumb-wrapper">
                <img src="${prod.imageUrl}" alt="${prod.name}" class="product-thumb" loading="lazy">
                ${discountBadge}
                <div class="product-actions-overlay">
                    <button class="action-btn-pill quickview-trigger" data-id="${prod.id}" type="button">
                        <i class="ri-eye-line"></i> Xem Nhanh
                    </button>
                </div>
            </div>
            <div class="product-info-wrap">
                <h3 class="product-title" title="${prod.name}">${prod.name}</h3>
                <div class="product-pricing">
                    <span class="product-curr-price">${formatPrice(prod.price)}</span>
                    ${prod.originalPrice ? `<span class="product-old-price">${formatPrice(prod.originalPrice)}</span>` : ''}
                </div>
                <div class="product-meta-row">
                    <div class="product-rating-box">
                        <i class="ri-star-fill star-icon"></i>
                        <span>${prod.rating || '5.0'}</span>
                    </div>
                    <div class="product-sold-text">Đã bán ${prod.sold || 0}</div>
                </div>
                <button class="btn-buy-now add-to-cart-direct-btn" data-id="${prod.id}" type="button">
                    <i class="ri-shopping-cart-2-line"></i> Thêm vào giỏ
                </button>
            </div>
        </div>
        `;
    }).join('');
    gridEl.querySelectorAll('.quickview-trigger').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            const found = state.products.find(p => p.id.toString() === id?.toString());
            if (found)
                openQuickview(found);
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
};
const renderFlashSaleGrid = () => {
    const gridEl = document.getElementById('flashSaleGrid');
    if (!gridEl)
        return;
    const flashProducts = state.products.filter(p => p.isFlashSale || (p.originalPrice && p.originalPrice > p.price)).slice(0, 4);
    if (flashProducts.length === 0) {
        gridEl.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 20px;">Đang cập nhật các deal chớp nhoáng...</div>`;
        return;
    }
    gridEl.innerHTML = flashProducts.map((prod) => `
        <div class="flash-sale-card" data-id="${prod.id}">
            <div class="flash-thumb-box">
                <img src="${prod.imageUrl}" alt="${prod.name}" class="flash-thumb">
                <div class="flash-discount-tag">HOT</div>
            </div>
            <div class="flash-body">
                <div class="flash-item-name">${prod.name}</div>
                <div class="flash-item-price">${formatPrice(prod.price)}</div>
                <div class="flash-progress-track">
                    <div class="flash-progress-bar" style="width: 75%;"></div>
                </div>
                <div class="flash-stock-label">ĐÃ BÁN ${prod.sold || 18} MÓN</div>
            </div>
        </div>
    `).join('');
    gridEl.querySelectorAll('.flash-sale-card').forEach((card) => {
        card.addEventListener('click', () => {
            const id = card.getAttribute('data-id');
            const found = state.products.find(p => p.id.toString() === id?.toString());
            if (found)
                openQuickview(found);
        });
    });
};
const initFlashSaleCountdown = () => {
    let secondsLeft = 2 * 3600 + 45 * 60 + 18;
    const hourEl = document.getElementById('flashHour');
    const minEl = document.getElementById('flashMin');
    const secEl = document.getElementById('flashSec');
    state.flashCountdownTimer = setInterval(() => {
        secondsLeft--;
        if (secondsLeft <= 0)
            secondsLeft = 3 * 3600;
        const h = Math.floor(secondsLeft / 3600);
        const m = Math.floor((secondsLeft % 3600) / 60);
        const s = secondsLeft % 60;
        if (hourEl)
            hourEl.textContent = h.toString().padStart(2, '0');
        if (minEl)
            minEl.textContent = m.toString().padStart(2, '0');
        if (secEl)
            secEl.textContent = s.toString().padStart(2, '0');
    }, 1000);
};
const openQuickview = (product) => {
    state.activeProduct = product;
    state.selectedQty = 1;
    state.selectedVariant = (product.variants && product.variants.length > 0) ? product.variants[0] : null;
    const modal = document.getElementById('quickviewModal');
    const content = document.getElementById('quickviewContent');
    if (!modal || !content)
        return;
    const hasVariants = product.variants && product.variants.length > 0;
    content.innerHTML = `
        <div class="modal-gallery">
            <img src="${product.imageUrl}" alt="${product.name}" class="modal-main-img">
        </div>
        <div class="modal-detail-panel">
            <h2 class="modal-prod-title">${product.name}</h2>
            <div class="modal-meta-bar">
                <div style="color: #f59e0b; font-weight: 700; display: flex; align-items: center; gap: 4px;">
                    <i class="ri-star-fill"></i>
                    <span>${product.rating || '5.0'}</span>
                </div>
                <span>•</span>
                <div style="color: var(--text-muted);">Đã bán ${product.sold || 0}</div>
                <span>•</span>
                <div style="color: var(--success); font-weight: 600;">Còn lại ${product.stock} sản phẩm</div>
            </div>

            <div class="modal-price-box">
                <span class="modal-curr-price" id="modalPriceDisplay">${formatPrice(state.selectedVariant ? state.selectedVariant.price : product.price)}</span>
                ${product.originalPrice ? `<span class="modal-old-price">${formatPrice(product.originalPrice)}</span>` : ''}
            </div>

            <div class="modal-prod-desc">${product.description || 'Sản phẩm chính hãng với tiêu chuẩn chất lượng cao, bảo hành điện tử chính hãng toàn quốc.'}</div>

            ${hasVariants ? `
            <div style="margin-bottom: 16px;">
                <div class="option-label">Phân Loại Sản Phẩm:</div>
                <div class="option-pills" id="modalVariantPills">
                    ${product.variants.map((v, i) => `
                        <div class="option-pill ${i === 0 ? 'selected' : ''}" data-idx="${i}">${v.name}</div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <div style="margin-bottom: 24px;">
                <div class="option-label">Số Lượng:</div>
                <div class="qty-control">
                    <button class="qty-btn" id="modalQtyMinus" type="button">-</button>
                    <input type="text" class="qty-input" id="modalQtyInput" value="1" readonly>
                    <button class="qty-btn" id="modalQtyPlus" type="button">+</button>
                </div>
            </div>

            <div class="modal-cta-row">
                <button class="btn btn-secondary btn-lg" id="modalAddToCartBtn" type="button">
                    <i class="ri-shopping-cart-line"></i> Thêm Vào Giỏ Hàng
                </button>
                <button class="btn btn-primary btn-lg" id="modalBuyNowBtn" type="button">
                    <i class="ri-flashlight-line"></i> Mua Ngay
                </button>
            </div>
        </div>
    `;
    modal.classList.add('active');
    const qtyInput = document.getElementById('modalQtyInput');
    const minusBtn = document.getElementById('modalQtyMinus');
    const plusBtn = document.getElementById('modalQtyPlus');
    const priceDisplay = document.getElementById('modalPriceDisplay');
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
            if (state.selectedQty < product.stock) {
                state.selectedQty++;
                qtyInput.value = state.selectedQty.toString();
            }
        });
    }
    document.querySelectorAll('#modalVariantPills .option-pill').forEach((pill) => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('#modalVariantPills .option-pill').forEach(p => p.classList.remove('selected'));
            pill.classList.add('selected');
            const idx = parseInt(pill.getAttribute('data-idx') || '0', 10);
            if (product.variants && product.variants[idx]) {
                state.selectedVariant = product.variants[idx];
                if (priceDisplay)
                    priceDisplay.textContent = formatPrice(state.selectedVariant.price);
            }
        });
    });
    const addCartBtn = document.getElementById('modalAddToCartBtn');
    if (addCartBtn) {
        addCartBtn.addEventListener('click', () => {
            addItemToCart(product, state.selectedQty, state.selectedVariant?.name);
            modal.classList.remove('active');
        });
    }
    const buyNowBtn = document.getElementById('modalBuyNowBtn');
    if (buyNowBtn) {
        buyNowBtn.addEventListener('click', () => {
            addItemToCart(product, state.selectedQty, state.selectedVariant?.name);
            modal.classList.remove('active');
            navigate('/cart');
        });
    }
};
const addItemToCart = (product, quantity = 1, variantName) => {
    const itemPrice = state.selectedVariant && state.selectedVariant.name === variantName
        ? state.selectedVariant.price
        : product.price;
    const existingIndex = state.cart.findIndex(item => item.productId === product.id && item.variantName === variantName);
    if (existingIndex > -1) {
        state.cart[existingIndex].quantity += quantity;
    }
    else {
        state.cart.push({
            id: 'cart_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            productId: product.id,
            name: product.name,
            price: itemPrice,
            imageUrl: product.imageUrl,
            quantity: quantity,
            variantName: variantName
        });
    }
    saveCart();
    showToast('Thành công', `Đã thêm ${quantity} sản phẩm vào giỏ hàng`, 'success');
};
const initCartView = () => {
    renderCartItemsList();
    const checkoutForm = document.getElementById('checkoutSubmitForm');
    const confirmBtn = document.getElementById('confirmOrderBtn');
    const nameInput = document.getElementById('checkoutName');
    const phoneInput = document.getElementById('checkoutPhone');
    const addressInput = document.getElementById('checkoutAddress');
    const paymentSelect = document.getElementById('checkoutPayment');
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
                }
                else {
                    showToast('Lỗi đặt hàng', result.message || 'Không thể tạo đơn hàng', 'error');
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = `<span>Xác Nhận Đặt Hàng</span> <i class="ri-check-double-line"></i>`;
                }
            }
            catch {
                showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ', 'error');
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = `<span>Xác Nhận Đặt Hàng</span> <i class="ri-check-double-line"></i>`;
            }
        });
    }
};
const renderCartItemsList = () => {
    const emptyView = document.getElementById('emptyCartView');
    const activeView = document.getElementById('activeCartView');
    const itemsList = document.getElementById('cartItemsList');
    const headerCount = document.getElementById('cartHeaderCount');
    const summarySubtotal = document.getElementById('summarySubtotal');
    const summaryGrandTotal = document.getElementById('summaryGrandTotal');
    if (state.cart.length === 0) {
        if (emptyView)
            emptyView.style.display = 'block';
        if (activeView)
            activeView.style.display = 'none';
        return;
    }
    if (emptyView)
        emptyView.style.display = 'none';
    if (activeView)
        activeView.style.display = 'grid';
    const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (headerCount)
        headerCount.textContent = `${totalCount} sản phẩm`;
    if (summarySubtotal)
        summarySubtotal.textContent = formatPrice(totalAmount);
    if (summaryGrandTotal)
        summaryGrandTotal.textContent = formatPrice(totalAmount);
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
                    if (state.cart[idx].quantity <= 0)
                        state.cart.splice(idx, 1);
                    saveCart();
                    renderCartItemsList();
                }
                else if (action === 'plus') {
                    state.cart[idx].quantity++;
                    saveCart();
                    renderCartItemsList();
                }
                else if (action === 'remove') {
                    state.cart.splice(idx, 1);
                    saveCart();
                    renderCartItemsList();
                    showToast('Giỏ hàng', 'Đã xóa sản phẩm khỏi giỏ hàng', 'warning');
                }
            });
        });
    }
};
const initOrdersView = async () => {
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
        if (loadingEl)
            loadingEl.style.display = 'none';
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            state.orders = data.data;
            if (emptyEl)
                emptyEl.style.display = 'none';
            if (listEl) {
                listEl.innerHTML = state.orders.map((order) => {
                    const items = Array.isArray(order.items) ? order.items : [];
                    const statusMap = {
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
        }
        else {
            if (emptyEl)
                emptyEl.style.display = 'block';
        }
    }
    catch {
        if (loadingEl)
            loadingEl.style.display = 'none';
        if (emptyEl)
            emptyEl.style.display = 'block';
    }
};
const initLoginView = () => {
    const loginForm = document.getElementById('customerLoginForm');
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const submitBtn = document.getElementById('loginSubmitBtn');
    const togglePassBtn = document.getElementById('togglePasswordBtn');
    const togglePassIcon = document.getElementById('togglePasswordIcon');
    if (togglePassBtn && passwordInput && togglePassIcon) {
        togglePassBtn.addEventListener('click', () => {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                togglePassIcon.className = 'ri-eye-off-line';
            }
            else {
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
                }
                else {
                    showToast('Đăng nhập thất bại', result.message || 'Sai thông tin đăng nhập', 'error');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<span>Đăng Nhập Ngay</span> <i class="ri-arrow-right-line"></i>`;
                }
            }
            catch {
                showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<span>Đăng Nhập Ngay</span> <i class="ri-arrow-right-line"></i>`;
            }
        });
    }
};
const initRegisterView = () => {
    const regForm = document.getElementById('customerRegisterForm');
    const submitBtn = document.getElementById('regSubmitBtn');
    const nameInput = document.getElementById('regName');
    const emailInput = document.getElementById('regEmail');
    const passwordInput = document.getElementById('regPassword');
    const phoneInput = document.getElementById('regPhone');
    const addressInput = document.getElementById('regAddress');
    const togglePassBtn = document.getElementById('toggleRegPasswordBtn');
    const togglePassIcon = document.getElementById('toggleRegPasswordIcon');
    if (togglePassBtn && passwordInput && togglePassIcon) {
        togglePassBtn.addEventListener('click', () => {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                togglePassIcon.className = 'ri-eye-off-line';
            }
            else {
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
                }
                else {
                    showToast('Đăng ký thất bại', result.message || 'Lỗi đăng ký tài khoản', 'error');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<span>Hoàn Tất Đăng Ký</span> <i class="ri-check-line"></i>`;
                }
            }
            catch {
                showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<span>Hoàn Tất Đăng Ký</span> <i class="ri-check-line"></i>`;
            }
        });
    }
};
const initChatWidget = () => {
    const launcherBtn = document.getElementById('chatLauncherBtn');
    const chatWindow = document.getElementById('chatWidgetWindow');
    const closeBtn = document.getElementById('chatCloseBtn');
    const modeToggleBtn = document.getElementById('chatModeToggleBtn');
    const chatForm = document.getElementById('chatMessageForm');
    const chatInput = document.getElementById('chatInput');
    if (launcherBtn && chatWindow) {
        launcherBtn.addEventListener('click', () => {
            state.chatOpen = !state.chatOpen;
            if (state.chatOpen) {
                chatWindow.classList.add('open');
                if (!state.chatSessionId) {
                    startChatSession();
                }
                else {
                    loadChatMessages();
                }
            }
            else {
                chatWindow.classList.remove('open');
            }
        });
    }
    if (closeBtn && chatWindow) {
        closeBtn.addEventListener('click', () => {
            state.chatOpen = false;
            chatWindow.classList.remove('open');
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
const startChatSession = async () => {
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
    }
    catch { }
};
const loadChatMessages = async () => {
    if (!state.chatSessionId)
        return;
    try {
        const res = await fetch(`${API_BASE}/api/chat/session/${state.chatSessionId}`);
        const data = await res.json();
        if (data.success && data.data) {
            state.chatSession = data.data.session;
            state.chatMessages = data.data.messages || [];
            updateChatHeaderMode();
            renderChatMessages();
        }
    }
    catch { }
};
const updateChatHeaderMode = () => {
    const badge = document.getElementById('chatModeBadge');
    const label = document.getElementById('chatModeToggleLabel');
    if (!badge || !label)
        return;
    if (state.chatSession?.status === 'human_waiting') {
        badge.className = 'chat-human-pill';
        badge.textContent = 'CHỜ CSKH';
        label.textContent = 'Đang đợi';
    }
    else if (state.chatSession?.status === 'human_active') {
        badge.className = 'chat-human-pill';
        badge.textContent = 'CSKH TRỰC TIẾP';
        label.textContent = 'Về AI';
    }
    else {
        badge.className = 'chat-ai-pill';
        badge.textContent = 'GEMINI AI';
        label.textContent = 'Gặp CSKH';
    }
};
const requestHumanSupport = async () => {
    if (!state.chatSessionId)
        return;
    try {
        const res = await fetch(`${API_BASE}/api/chat/session/${state.chatSessionId}/human-request`, {
            method: 'POST'
        });
        const data = await res.json();
        if (data.success) {
            showToast('Hỗ trợ khách hàng', 'Đã chuyển yêu cầu tới nhân viên CSKH', 'success');
            loadChatMessages();
        }
    }
    catch { }
};
const sendChatMessage = async (text) => {
    if (!state.chatSessionId) {
        await startChatSession();
    }
    if (!state.chatSessionId)
        return;
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
    }
    catch {
        showToast('Lỗi gửi tin', 'Không thể kết nối đến máy chủ live chat', 'error');
    }
};
const appendTempUserMessage = (text) => {
    const container = document.getElementById('chatMessagesContainer');
    if (!container)
        return;
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
const renderChatMessages = () => {
    const container = document.getElementById('chatMessagesContainer');
    if (!container)
        return;
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
            if (found)
                openQuickview(found);
        });
    });
};
const escapeHtml = (text) => {
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
