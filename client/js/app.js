"use strict";
const GHN_STATUS_MAP = {
    ready_to_pick: { label: 'Chờ lấy hàng', class: 'status-ready-to-pick', icon: 'ri-time-line', color: '#0284c7', bg: '#e0f2fe' },
    picking: { label: 'Đang lấy hàng', class: 'status-picking', icon: 'ri-truck-line', color: '#0284c7', bg: '#e0f2fe' },
    cancel: { label: 'Đã hủy đơn GHN', class: 'status-cancel', icon: 'ri-close-circle-line', color: '#ef4444', bg: '#fee2e2' },
    money_collect_picking: { label: 'Đang thu tiền người gửi', class: 'status-money-picking', icon: 'ri-money-dollar-circle-line', color: '#d97706', bg: '#fef3c7' },
    picked: { label: 'Đã lấy hàng', class: 'status-picked', icon: 'ri-checkbox-circle-line', color: '#2563eb', bg: '#dbeafe' },
    storing: { label: 'Hàng tại kho GHN', class: 'status-storing', icon: 'ri-archive-line', color: '#4f46e5', bg: '#e0e7ff' },
    transporting: { label: 'Đang luân chuyển hàng', class: 'status-transporting', icon: 'ri-road-map-line', color: '#7c3aed', bg: '#ede9fe' },
    sorting: { label: 'Đang phân loại bưu gửi', class: 'status-sorting', icon: 'ri-shuffle-line', color: '#7c3aed', bg: '#ede9fe' },
    delivering: { label: 'Đang giao hàng', class: 'status-delivering', icon: 'ri-e-bike-2-line', color: '#ea580c', bg: '#ffedd5' },
    money_collect_delivering: { label: 'Đang thu tiền người nhận', class: 'status-money-delivering', icon: 'ri-hand-coin-line', color: '#ea580c', bg: '#ffedd5' },
    delivered: { label: 'Giao hàng thành công', class: 'status-delivered', icon: 'ri-checkbox-circle-fill', color: '#16a34a', bg: '#dcfce7' },
    delivery_fail: { label: 'Giao hàng thất bại', class: 'status-delivery-fail', icon: 'ri-error-warning-line', color: '#dc2626', bg: '#fee2e2' },
    waiting_to_return: { label: 'Chờ xác nhận chuyển hoàn', class: 'status-waiting-return', icon: 'ri-arrow-go-back-line', color: '#b45309', bg: '#fef3c7' },
    return: { label: 'Chuyển hoàn', class: 'status-return', icon: 'ri-arrow-go-back-line', color: '#b45309', bg: '#fef3c7' },
    return_transporting: { label: 'Luân chuyển hàng hoàn', class: 'status-return-trans', icon: 'ri-road-map-line', color: '#b45309', bg: '#fef3c7' },
    return_sorting: { label: 'Phân loại hàng hoàn', class: 'status-return-sort', icon: 'ri-shuffle-line', color: '#b45309', bg: '#fef3c7' },
    returning: { label: 'Đang trả lại người gửi', class: 'status-returning', icon: 'ri-arrow-go-back-fill', color: '#b45309', bg: '#fef3c7' },
    return_fail: { label: 'Trả lại thất bại', class: 'status-return-fail', icon: 'ri-close-circle-fill', color: '#b91c1c', bg: '#fee2e2' },
    returned: { label: 'Đã hoàn trả thành công', class: 'status-returned', icon: 'ri-check-line', color: '#475569', bg: '#f1f5f9' },
    exception: { label: 'Đơn hàng ngoại lệ', class: 'status-exception', icon: 'ri-alert-line', color: '#dc2626', bg: '#fee2e2' },
    damage: { label: 'Hàng hóa bị hư hỏng', class: 'status-damage', icon: 'ri-skull-line', color: '#dc2626', bg: '#fee2e2' },
    lost: { label: 'Hàng hóa bị thất lạc', class: 'status-lost', icon: 'ri-question-mark', color: '#dc2626', bg: '#fee2e2' }
};
const API_BASE = window.location.origin;
const state = {
    currentRoute: window.location.pathname || '/',
    products: [],
    categories: [],
    activeCategory: 'cat_all',
    searchQuery: '',
    sortBy: 'newest',
    cart: JSON.parse(localStorage.getItem('novashop_cart') || '[]'),
    user: (() => {
        try {
            const rawUser = localStorage.getItem('novashop_customer_user');
            if (!rawUser)
                return null;
            const parsed = JSON.parse(rawUser);
            if (parsed && parsed.role === 'admin') {
                localStorage.removeItem('novashop_customer_user');
                localStorage.removeItem('novashop_customer_token');
                return null;
            }
            return parsed;
        }
        catch {
            return null;
        }
    })(),
    token: (() => {
        try {
            const rawUser = localStorage.getItem('novashop_customer_user');
            if (rawUser) {
                const parsed = JSON.parse(rawUser);
                if (parsed && parsed.role === 'admin') {
                    return '';
                }
            }
            return localStorage.getItem('novashop_customer_token') || '';
        }
        catch {
            return '';
        }
    })(),
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
    chatSessionId: (() => {
        const s = localStorage.getItem('novashop_chat_session');
        return s && s !== 'undefined' && s !== 'null' ? s : '';
    })(),
    chatSession: null,
    chatMessages: [],
    chatOpen: false,
    chatLoading: false,
    chatPollingTimer: null,
    flashCountdownTimer: null,
    appliedVoucher: null,
    availableVouchers: [],
    selectedProvinceId: null,
    selectedDistrictId: null,
    selectedWardCode: null,
    shippingFee: 0,
    shippingLeadTime: '',
    checkoutStep: 1
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
        warning: 'ri-alert-line',
        info: 'ri-information-line'
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
    const userTopHtml = state.user
        ? `
        <div class="top-user-menu">
            <button type="button" class="user-profile-trigger" id="topUserMenuBtn" title="Tài khoản của bạn">
                <i class="ri-user-smile-fill" style="color: #ee4d2d; font-size: 1.05rem;"></i>
                <span>${state.user.name}</span>
                <i class="ri-arrow-down-s-line" style="font-size: 0.75rem;"></i>
            </button>
            <div id="topUserDropdownMenu" class="user-dropdown-menu">
                <a href="/orders" class="user-dropdown-item" data-nav-link>
                    <i class="ri-file-list-3-line"></i>
                    <span>Đơn Mua Của Tôi</span>
                </a>
                <button id="logoutBtn" type="button" class="user-dropdown-item" style="color: #ef4444;">
                    <i class="ri-logout-box-r-line"></i>
                    <span>Đăng Xuất</span>
                </button>
            </div>
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
                    <span class="top-bar-link" style="cursor: default;">
                        <i class="ri-shield-check-fill" style="color: #ee4d2d;"></i>
                        <span>Sàn TMĐT NovaShop - 100% Chính Hãng</span>
                    </span>
                    <span class="top-bar-divider"></span>
                    <span class="top-bar-link" style="cursor: default;">
                        <i class="ri-phone-fill" style="color: #0284c7;"></i>
                        <span>Hotline: 1900 8888</span>
                    </span>
                    <span class="top-bar-divider"></span>
                    <div class="top-bar-item-dropdown">
                        <button id="topDownloadAppBtn" type="button" class="top-bar-btn" title="Tải ứng dụng di động NovaShop">
                            <i class="ri-smartphone-line"></i>
                            <span>Tải ứng dụng</span>
                        </button>
                        <div id="topAppQrMenu" class="top-dropdown-menu app-qr-dropdown">
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=https://novashop.vn/app" alt="QR Tải Ứng Dụng NovaShop" class="app-qr-image">
                            <div class="app-qr-title">Quét mã để tải ứng dụng NovaShop</div>
                            <div class="app-qr-badges">
                                <a href="javascript:void(0)" class="app-store-badge" id="appStoreBtn"><i class="ri-apple-fill"></i> App Store</a>
                                <a href="javascript:void(0)" class="app-store-badge" id="googlePlayBtn"><i class="ri-google-play-fill"></i> Google Play</a>
                            </div>
                        </div>
                    </div>
                    <span class="top-bar-divider"></span>
                    <span class="top-bar-link" style="cursor: default;">
                        <span>Kết nối</span>
                        <span class="top-bar-social-links">
                            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" class="top-bar-social" title="Facebook NovaShop"><i class="ri-facebook-circle-fill"></i></a>
                            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" class="top-bar-social" title="Instagram NovaShop"><i class="ri-instagram-fill"></i></a>
                            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" class="top-bar-social" title="TikTok NovaShop"><i class="ri-tiktok-fill"></i></a>
                        </span>
                    </span>
                </div>
                <div class="top-bar-right">
                    <div class="top-bar-item-dropdown" id="topNotificationWrapper">
                        <button id="topNotificationBtn" type="button" class="top-bar-btn" title="Xem thông báo mới nhất">
                            <i class="ri-notification-3-line"></i>
                            <span>Thông Báo</span>
                            <span id="topNotifBadge" class="top-badge">3</span>
                        </button>
                        <div id="topNotificationMenu" class="top-dropdown-menu notification-dropdown">
                            <div class="notif-header">
                                <span class="notif-header-title">Thông báo mới nhận</span>
                                <button id="markAllReadBtn" type="button" class="notif-mark-read-btn">Đánh dấu đã đọc</button>
                            </div>
                            <div class="notif-list">
                                <a href="/orders" class="notif-item unread" data-nav-link>
                                    <div class="notif-icon-circle order"><i class="ri-truck-line"></i></div>
                                    <div class="notif-info">
                                        <div class="notif-title">Đơn hàng #ord_1001 đã hoàn tất</div>
                                        <div class="notif-desc">Giao hàng thành công. Hãy đánh giá sản phẩm để nhận ngay 200 Xu Nova!</div>
                                        <div class="notif-time">2 giờ trước</div>
                                    </div>
                                </a>
                                <a href="/#flashSaleSection" class="notif-item unread" data-nav-link>
                                    <div class="notif-icon-circle sale"><i class="ri-flashlight-line"></i></div>
                                    <div class="notif-info">
                                        <div class="notif-title">Siêu Flash Sale Khung Giờ Vàng</div>
                                        <div class="notif-desc">Hàng loạt phụ kiện công nghệ giảm tới 50% trong hôm nay. Đừng bỏ lỡ!</div>
                                        <div class="notif-time">5 giờ trước</div>
                                    </div>
                                </a>
                                <a href="/#productsSection" class="notif-item unread" data-nav-link>
                                    <div class="notif-icon-circle voucher"><i class="ri-ticket-2-line"></i></div>
                                    <div class="notif-info">
                                        <div class="notif-title">Voucher 50K tặng bạn mới</div>
                                        <div class="notif-desc">Mã NOVASHOP50 giảm 50.000đ cho đơn từ 200K đã sẵn sàng trong ví của bạn.</div>
                                        <div class="notif-time">1 ngày trước</div>
                                    </div>
                                </a>
                            </div>
                            <div class="notif-footer">
                                <a href="/orders" data-nav-link>Xem tất cả thông báo</a>
                            </div>
                        </div>
                    </div>
                    <a href="/help" class="top-bar-link" data-nav-link title="Trung tâm hỗ trợ khách hàng">
                        <i class="ri-question-line"></i>
                        <span>Hỗ Trợ</span>
                    </a>
                    <span class="top-bar-divider"></span>
                    <div class="top-bar-item-dropdown">
                        <button id="langSwitcherBtn" type="button" class="top-bar-btn" title="Chọn ngôn ngữ hiển thị">
                            <i class="ri-global-line"></i>
                            <span id="currentLangLabel">Tiếng Việt</span>
                            <i class="ri-arrow-down-s-line" style="font-size: 0.75rem;"></i>
                        </button>
                        <div id="langDropdownMenu" class="top-dropdown-menu lang-dropdown">
                            <div class="lang-item active" data-lang="vi">
                                <span>Tiếng Việt</span>
                                <i class="ri-check-line"></i>
                            </div>
                            <div class="lang-item" data-lang="en">
                                <span>English</span>
                            </div>
                        </div>
                    </div>
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
                <span class="brand-badge">Mall Chính Hãng</span>
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
                <a href="/orders" class="top-bar-link" style="font-weight: 600; font-size: 0.875rem; color: var(--text-main);" data-nav-link title="Tra cứu trạng thái đơn hàng">
                    <i class="ri-truck-line" style="font-size: 1.25rem; color: #ee4d2d;"></i>
                    <span>Đơn Mua</span>
                </a>
                <a href="/cart" class="cart-btn-trigger" aria-label="Giỏ hàng" data-nav-link title="Xem giỏ hàng của bạn">
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
const renderAboutView = () => {
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
const renderCareersView = () => {
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
const renderTermsView = () => {
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
const renderPrivacyView = () => {
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
const renderHelpView = () => {
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
const renderGuideView = () => {
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
const renderShippingView = () => {
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
const renderChatWidgetTemplate = () => {
    return `
    <button id="chatLauncherBtn" class="chat-launcher-btn" aria-label="Mở khung hỗ trợ khách hàng" type="button" title="Chat hỗ trợ khách hàng">
        <i class="ri-customer-service-2-fill"></i>
        <span class="chat-launcher-badge"></span>
    </button>

    <div id="chatWidgetWindow" class="chat-widget-window ${state.chatOpen ? 'active' : ''}">
        <div class="chat-header">
            <div class="chat-header-info">
                <div class="chat-avatar-box">
                    <i class="ri-customer-service-2-line"></i>
                    <span class="chat-avatar-status"></span>
                </div>
                <div>
                    <div class="chat-header-title">
                        <span id="chatTitleText">Hỗ Trợ Khách Hàng</span>
                        <span class="chat-status-pill">Trực Tuyến</span>
                    </div>
                    <div id="chatSubtitleText" class="chat-header-subtitle">NovaShop sẵn sàng hỗ trợ bạn 24/7</div>
                </div>
            </div>
            <div class="chat-header-actions">
                <button id="chatCloseBtn" class="chat-close-btn" title="Đóng khung chat" type="button">
                    <i class="ri-close-line"></i>
                </button>
            </div>
        </div>

        <div class="chat-quick-suggestions">
            <button class="quick-chip-btn" data-query="Tư vấn tai nghe Bluetooth" type="button">🎧 Tư vấn tai nghe</button>
            <button class="quick-chip-btn" data-query="Gợi ý bàn phím cơ gõ êm" type="button">⌨️ Bàn phím cơ</button>
            <button class="quick-chip-btn" data-query="Các sản phẩm đang giảm giá Flash Sale?" type="button">🔥 Khuyến mãi hôm nay</button>
            <button class="quick-chip-btn" data-query="Chính sách bảo hành và đổi trả thế nào?" type="button">🛡️ Chính sách đổi trả</button>
            <button class="quick-chip-btn" data-query="Thời gian giao hàng là bao lâu?" type="button">🚀 Thời gian giao hàng</button>
        </div>

        <div id="chatMessagesContainer" class="chat-messages-container"></div>

        <div class="chat-footer">
            <form id="chatMessageForm" class="chat-input-row">
                <input type="text" id="chatInput" class="chat-input" placeholder="Nhập câu hỏi hoặc sản phẩm bạn cần tìm..." autocomplete="off">
                <button type="submit" id="chatSendBtn" class="chat-send-btn" aria-label="Gửi tin nhắn">
                    <i class="ri-send-plane-fill"></i>
                </button>
            </form>
            <div class="chat-footer-caption">
                <i class="ri-phone-line" style="color: #ee4d2d;"></i>
                <span>Tổng đài CSKH: 1900 8888 • Hỗ trợ 24/7</span>
            </div>
        </div>
    </div>
    `;
};
const renderStorefrontView = () => {
    return `
    ${renderHeaderTemplate()}

    <main>
        <section class="novamall-banner-section">
            <div class="container">
                <div class="novamall-banner-grid">
                    <div class="novamall-main-slider">
                        <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&q=80" alt="Banner Siêu Sale" class="novamall-slider-bg">
                        <div class="novamall-slider-content">
                            <div class="novamall-slider-tag">
                                <i class="ri-flashlight-fill" style="color: #ffd839;"></i> SIÊU SALE CÔNG NGHỆ 2026
                            </div>
                            <h2 class="novamall-slider-title">Giảm Đến 50%<br>Hàng Hiệu NovaMall</h2>
                            <p class="novamall-slider-desc">Voucher giảm thêm 100K • Miễn phí vận chuyển toàn quốc 0Đ</p>
                            <a href="#flashSaleSection" class="btn btn-primary btn-sm">
                                <span>Săn Deal Chớp Nhoáng</span>
                                <i class="ri-arrow-right-line"></i>
                            </a>
                        </div>
                    </div>
                    <div class="novamall-sub-banners">
                        <a href="#productsSection" class="novamall-sub-banner-item novamall-sub-banner-1">
                            <div>
                                <div class="novamall-sub-banner-title">👑 NovaMall Chính Hãng</div>
                                <div class="novamall-sub-banner-desc">100% chính hãng • Đổi trả miễn phí 7 ngày</div>
                            </div>
                        </a>
                        <a href="#flashSaleSection" class="novamall-sub-banner-item novamall-sub-banner-2">
                            <div>
                                <div class="novamall-sub-banner-title">⚡ Flash Sale Mỗi Ngày</div>
                                <div class="novamall-sub-banner-desc">Khung giờ vàng giá sốc từ 99K</div>
                            </div>
                        </a>
                    </div>
                </div>

                <div class="novamall-quick-services">
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
        <div class="modal-card modal-card-novamall">
            <button class="modal-close-btn" data-close-modal="quickviewModal" type="button">
                <i class="ri-close-line"></i>
            </button>
            <div class="modal-body modal-body-novamall">
                <div id="quickviewContent"></div>
            </div>
        </div>
    </div>

    ${renderChatWidgetTemplate()}
    `;
};
const renderCartView = () => {
    const isLoggedIn = !!state.user;
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
                <div class="cart-page-badge">Thanh Toán Đơn Hàng</div>
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

        <div id="activeCartView" style="${state.cart.length > 0 ? 'display: block;' : 'display: none;'}">
            <!-- Stepper Progress Bar -->
            <div class="checkout-stepper-wrapper" style="max-width: 960px; margin: 0 auto 20px; background: #ffffff; border-radius: var(--radius-lg); border: 1px solid var(--border-light); padding: 14px 20px; box-shadow: var(--shadow-sm);">
                <div style="display: flex; align-items: center; justify-content: space-between; position: relative;">
                    <div id="stepTab1" class="checkout-step-indicator" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <div id="stepCircle1" style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.875rem; background: var(--primary); color: #ffffff; transition: all 0.2s;">1</div>
                        <div>
                            <div id="stepLabel1" style="font-size: 0.85rem; font-weight: 800; color: var(--primary);">Giỏ hàng</div>
                            <div style="font-size: 0.72rem; color: var(--text-muted);">Sản phẩm đã chọn</div>
                        </div>
                    </div>

                    <div id="stepLine1" style="flex: 1; height: 2px; background: #e2e8f0; margin: 0 16px;"></div>

                    <div id="stepTab2" class="checkout-step-indicator" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <div id="stepCircle2" style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.875rem; background: #e2e8f0; color: #64748b; transition: all 0.2s;">2</div>
                        <div>
                            <div id="stepLabel2" style="font-size: 0.85rem; font-weight: 700; color: #64748b;">Địa chỉ giao hàng</div>
                            <div style="font-size: 0.72rem; color: var(--text-muted);">Vị trí & Nơi nhận</div>
                        </div>
                    </div>

                    <div id="stepLine2" style="flex: 1; height: 2px; background: #e2e8f0; margin: 0 16px;"></div>

                    <div id="stepTab3" class="checkout-step-indicator" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <div id="stepCircle3" style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.875rem; background: #e2e8f0; color: #64748b; transition: all 0.2s;">3</div>
                        <div>
                            <div id="stepLabel3" style="font-size: 0.85rem; font-weight: 700; color: #64748b;">Vận chuyển & Thanh toán</div>
                            <div style="font-size: 0.72rem; color: var(--text-muted);">Cước GHN & Đặt hàng</div>
                        </div>
                    </div>
                </div>
            </div>

            ${!isLoggedIn ? `
                <div class="checkout-auth-warning" style="max-width: 960px; margin: 0 auto 20px; background: #fffbeb; border: 1px solid #fde68a; border-radius: var(--radius-lg); padding: 18px 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; box-shadow: var(--shadow-sm);">
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <div style="width: 44px; height: 44px; border-radius: 50%; background: #fef3c7; color: #b45309; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0;">
                            <i class="ri-lock-2-line"></i>
                        </div>
                        <div>
                            <div style="font-weight: 800; font-size: 1rem; color: #92400e;">Bắt buộc đăng nhập để đặt hàng</div>
                            <div style="font-size: 0.85rem; color: #b45309;">Quý khách vui lòng đăng nhập để lưu địa chỉ, tính cước vận chuyển chuẩn GHN và hoàn tất đơn hàng.</div>
                        </div>
                    </div>
                    <a href="/login" class="btn btn-primary" data-nav-link style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; font-weight: 700;">
                        <i class="ri-login-box-line"></i>
                        <span>Đăng nhập ngay</span>
                    </a>
                </div>
            ` : ''}

            <div class="cart-layout">
                <!-- Left Column: Multi-step panels -->
                <div class="cart-steps-container">
                    <!-- Step 1: Cart Items Review -->
                    <div id="checkoutStep1Panel" class="checkout-step-panel">
                        <div class="cart-items-card">
                            <div class="cart-card-header">
                                <span><i class="ri-shopping-bag-3-line"></i> Danh Sách Sản Phẩm Trong Giỏ</span>
                                <span id="cartHeaderCount" style="color: var(--primary); font-size: 0.875rem;"></span>
                            </div>
                            <div id="cartItemsList" class="cart-items-list"></div>

                            <div style="padding: 14px 18px; background: #f8fafc; border-top: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                                <div style="font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
                                    <i class="ri-scales-3-line" style="color: #0284c7; font-size: 1.1rem;"></i>
                                    <span>Tổng trọng lượng gói hàng ước tính:</span>
                                    <strong id="cartStep1WeightBadge" style="color: #0284c7; font-weight: 700;">-- g</strong>
                                </div>
                                <button type="button" id="btnGoToStep2" class="btn btn-primary" style="padding: 9px 22px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
                                    <span>Tiếp tục: Địa chỉ nhận hàng</span>
                                    <i class="ri-arrow-right-line"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Step 2: Shipping Address -->
                    <div id="checkoutStep2Panel" class="checkout-step-panel" style="display: none;">
                        <div class="cart-items-card" style="padding: 24px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; border-bottom: 1px solid var(--border-light); padding-bottom: 12px; flex-wrap: wrap; gap: 10px;">
                                <div style="font-size: 1.05rem; font-weight: 800; color: var(--text-main); display: flex; align-items: center; gap: 8px;">
                                    <i class="ri-map-pin-user-line" style="color: var(--primary);"></i>
                                    <span>Thông Tin Người Nhận & Địa Chỉ Giao Hàng</span>
                                </div>
                                <button type="button" id="geoLocateBtn" class="btn btn-sm btn-outline" style="border-color: #3b82f6; color: #1d4ed8; background: #eff6ff; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 6px;">
                                    <i class="ri-focus-3-line"></i>
                                    <span id="geoLocateBtnText">Vị trí của tôi (Định vị tự động)</span>
                                </button>
                            </div>

                            <div id="savedAddressNotice" style="display: none; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; align-items: center; justify-content: space-between; font-size: 0.85rem; color: #065f46;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <i class="ri-checkbox-circle-fill" style="color: #059669; font-size: 1.1rem;"></i>
                                    <span>Đã tự động nạp địa chỉ giao hàng đã lưu của bạn</span>
                                </div>
                                <button type="button" id="clearSavedAddressBtn" style="background: none; border: none; color: #dc2626; font-size: 0.75rem; text-decoration: underline; cursor: pointer; font-weight: 600;">
                                    Xóa địa chỉ này
                                </button>
                            </div>

                            <div class="form-group" style="margin-bottom: 14px;">
                                <label class="form-label" for="checkoutName">Họ và tên người nhận <span style="color: #ef4444;">*</span></label>
                                <input type="text" id="checkoutName" class="form-input" placeholder="Ví dụ: Nguyễn Văn A" value="${state.user?.name || ''}" required>
                            </div>

                            <div class="form-group" style="margin-bottom: 14px;">
                                <label class="form-label" for="checkoutPhone">Số điện thoại giao hàng <span style="color: #ef4444;">*</span></label>
                                <input type="tel" id="checkoutPhone" class="form-input" placeholder="Ví dụ: 0987654321 (10 số)" value="${state.user?.phone || ''}" required>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label class="form-label" for="checkoutProvince">Tỉnh / Thành phố <span style="color: #ef4444;">*</span></label>
                                    <select id="checkoutProvince" class="form-select" required>
                                        <option value="">-- Đang tải Tỉnh/Thành... --</option>
                                    </select>
                                </div>
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label class="form-label" for="checkoutDistrict">Quận / Huyện <span style="color: #ef4444;">*</span></label>
                                    <select id="checkoutDistrict" class="form-select" required disabled>
                                        <option value="">-- Chọn Quận/Huyện --</option>
                                    </select>
                                </div>
                            </div>

                            <div class="form-group" style="margin-bottom: 14px;">
                                <label class="form-label" for="checkoutWard">Phường / Xã <span style="color: #ef4444;">*</span></label>
                                <select id="checkoutWard" class="form-select" required disabled>
                                    <option value="">-- Chọn Phường/Xã --</option>
                                </select>
                            </div>

                            <div class="form-group" style="margin-bottom: 16px;">
                                <label class="form-label" for="checkoutAddress">Địa chỉ cụ thể (Số nhà, tên đường...) <span style="color: #ef4444;">*</span></label>
                                <input type="text" id="checkoutAddress" class="form-input" placeholder="Số 123 Lê Lợi..." value="${state.user?.address || ''}" required>
                            </div>

                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                                <input type="checkbox" id="saveAddressCheckbox" style="width: 16px; height: 16px; cursor: pointer;" checked>
                                <label for="saveAddressCheckbox" style="margin: 0; font-size: 0.85rem; color: #334155; cursor: pointer; font-weight: 600;">
                                    Lưu lại địa chỉ này cho các lần mua hàng tiếp theo
                                </label>
                            </div>

                            <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-light); padding-top: 16px;">
                                <button type="button" id="btnBackToStep1" class="btn btn-secondary" style="padding: 9px 18px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
                                    <i class="ri-arrow-left-line"></i>
                                    <span>Quay lại giỏ hàng</span>
                                </button>
                                <button type="button" id="btnGoToStep3" class="btn btn-primary" style="padding: 9px 22px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
                                    <span>Tiếp tục: Thanh toán & Vận chuyển</span>
                                    <i class="ri-arrow-right-line"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Step 3: Payment & Shipping Confirmation -->
                    <div id="checkoutStep3Panel" class="checkout-step-panel" style="display: none;">
                        <div class="cart-items-card" style="padding: 24px;">
                            <div style="font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin-bottom: 16px; border-bottom: 1px solid var(--border-light); padding-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                                <i class="ri-truck-line" style="color: #2563eb;"></i>
                                <span>Vận Chuyển Chuẩn Giao Hàng Nhanh (GHN)</span>
                            </div>

                            <!-- Destination Review Card -->
                            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin-bottom: 18px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                    <span style="font-weight: 700; color: #166534; font-size: 0.85rem;"><i class="ri-map-pin-line"></i> Địa chỉ giao hàng đã chọn:</span>
                                    <button type="button" id="btnEditAddressFromStep3" style="background: none; border: none; color: #2563eb; font-size: 0.75rem; text-decoration: underline; cursor: pointer; font-weight: 600;">Sửa</button>
                                </div>
                                <div id="step3AddressText" style="font-size: 0.875rem; color: #15803d; font-weight: 600;">--</div>
                            </div>

                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; font-size: 0.8125rem;">
                                    <div>
                                        <span style="color: var(--text-muted); display: block; margin-bottom: 2px;">Trọng lượng tính cước GHN:</span>
                                        <strong id="step3GhnWeight" style="color: #0284c7; font-size: 0.95rem;">-- g</strong>
                                    </div>
                                    <div>
                                        <span style="color: var(--text-muted); display: block; margin-bottom: 2px;">Cước phí vận chuyển GHN:</span>
                                        <strong id="step3GhnFee" style="color: #2563eb; font-size: 0.95rem;">0 đ</strong>
                                    </div>
                                    <div>
                                        <span style="color: var(--text-muted); display: block; margin-bottom: 2px;">Thời gian dự kiến giao:</span>
                                        <strong id="step3GhnLeadTime" style="color: #16a34a; font-size: 0.95rem;">2 - 3 ngày</strong>
                                    </div>
                                </div>
                            </div>

                            <!-- Final Review of Order Items Before Payment -->
                            <div style="font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin-bottom: 12px; border-bottom: 1px solid var(--border-light); padding-bottom: 10px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <i class="ri-shopping-bag-3-line" style="color: var(--primary); font-size: 1.25rem;"></i>
                                    <span>Danh Sách Sản Phẩm Đặt Mua (Kiểm Tra Lần Cuối)</span>
                                </div>
                                <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;"><i class="ri-checkbox-circle-line" style="color: #16a34a;"></i> Xác nhận danh sách đơn hàng</span>
                            </div>

                            <div id="step3OrderItemsReview" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;"></div>

                            <div style="font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin-bottom: 14px; border-bottom: 1px solid var(--border-light); padding-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                                <i class="ri-wallet-3-line" style="color: var(--primary);"></i>
                                <span>Chọn Phương Thức Thanh Toán</span>
                            </div>

                            <div class="form-group" style="margin-bottom: 18px;">
                                <select id="checkoutPayment" class="form-select" style="font-size: 0.9375rem; padding: 10px 14px; font-weight: 600;">
                                    <option value="cod">💵 Thanh toán tiền mặt khi nhận hàng (COD)</option>
                                    <option value="momo">👛 Ví điện tử MoMo (ATM / QR MoMo)</option>
                                    <option value="sepay">⚡ Chuyển khoản qua SePay (VietQR tự động xác nhận)</option>
                                    <option value="banking">🏦 Chuyển khoản ngân hàng thủ công</option>
                                </select>
                            </div>

                            <div class="cart-voucher-section" style="margin-bottom: 20px;">
                                <div class="cart-voucher-header">
                                    <div class="cart-voucher-title">
                                        <i class="ri-coupon-3-fill" style="color: var(--primary);"></i>
                                        <span>Mã Giảm Giá / Voucher Ưu Đãi</span>
                                    </div>
                                    <button type="button" id="toggleVouchersBtn" class="btn btn-outline btn-sm" style="font-size: 0.75rem; padding: 2px 8px; border-color: #cbd5e1;">
                                        Danh sách voucher <i class="ri-arrow-down-s-line"></i>
                                    </button>
                                </div>

                                <div class="cart-voucher-input-group">
                                    <input type="text" id="voucherCodeInput" class="form-input form-input-sm cart-voucher-input" placeholder="Nhập mã ưu đãi (vd: NOVASHOP50)">
                                    <button type="button" id="applyVoucherBtn" class="btn btn-secondary btn-sm" style="font-weight: 700;">Áp dụng</button>
                                </div>

                                <div id="appliedVoucherContainer"></div>
                                <div id="voucherSuggestions" class="voucher-suggestions" style="display: none;"></div>
                            </div>

                            <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-light); padding-top: 16px;">
                                <button type="button" id="btnBackToStep2" class="btn btn-secondary" style="padding: 9px 18px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
                                    <i class="ri-arrow-left-line"></i>
                                    <span>Quay lại thông tin địa chỉ</span>
                                </button>
                                <button type="button" id="confirmOrderBtn" class="btn btn-primary btn-lg" style="padding: 10px 28px; font-weight: 800; display: inline-flex; align-items: center; gap: 8px;">
                                    <span>Xác Nhận Đặt Hàng</span>
                                    <i class="ri-check-double-line"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right Column: Order Summary Card -->
                <div class="cart-checkout-card">
                    <div class="cart-checkout-title">
                        <i class="ri-shield-check-line" style="color: var(--primary);"></i>
                        <span>Tóm Tắt Đơn Hàng</span>
                    </div>

                    <div class="cart-price-breakdown">
                        <div class="cart-breakdown-row">
                            <span>Tạm tính hàng:</span>
                            <span id="summarySubtotal">0 đ</span>
                        </div>
                        <div class="cart-breakdown-row">
                            <span>Trọng lượng kiện hàng:</span>
                            <span id="summaryWeight" style="color: #0284c7; font-weight: 600;">0 g</span>
                        </div>
                        <div class="cart-breakdown-row" id="voucherDiscountRow" style="display: none;">
                            <span>Giảm giá Voucher (<strong id="summaryVoucherCode" style="color: #059669;"></strong>):</span>
                            <span id="summaryVoucherDiscount" style="color: #059669; font-weight: 700;">-0 đ</span>
                        </div>
                        <div class="cart-breakdown-row">
                            <span>Phí vận chuyển GHN:</span>
                            <span id="summaryShippingFee" style="color: #2563eb; font-weight: 700;">0 đ</span>
                        </div>
                        <div class="cart-breakdown-row" id="summaryLeadTimeRow" style="display: none; font-size: 0.75rem; color: var(--text-muted);">
                            <span>Dự kiến giao hàng (GHN):</span>
                            <span id="summaryLeadTime" style="font-weight: 600; color: #0284c7;">--</span>
                        </div>
                        <div class="cart-breakdown-row total">
                            <span>Tổng thanh toán:</span>
                            <span id="summaryGrandTotal">0 đ</span>
                        </div>
                    </div>

                    <div style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.5; margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--border-light);">
                        <i class="ri-shield-star-line" style="color: #16a34a;"></i> Đơn hàng được bảo vệ bởi NovaShop. Cước phí và lộ trình vận chuyển được kết nối trực tiếp với hệ thống Giao Hàng Nhanh (GHN).
                    </div>
                </div>
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
            <div class="orders-search-wrapper">
                <i class="ri-search-line" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 1rem;"></i>
                <input type="text" id="orderSearchInput" class="orders-search-input" placeholder="Tìm theo mã đơn, sản phẩm...">
            </div>
        </div>

        <!-- Status Categories / Tabs -->
        <div class="order-tabs-nav" id="orderTabsNav">
            <button type="button" class="order-tab-btn active" data-status="all">
                <span>Tất cả</span>
                <span class="tab-badge" id="tabCountAll">0</span>
            </button>
            <button type="button" class="order-tab-btn" data-status="pending">
                <span>Chờ xác nhận</span>
                <span class="tab-badge" id="tabCountPending">0</span>
            </button>
            <button type="button" class="order-tab-btn" data-status="processing">
                <span>Đang xử lý / Vận chuyển</span>
                <span class="tab-badge" id="tabCountProcessing">0</span>
            </button>
            <button type="button" class="order-tab-btn" data-status="completed">
                <span>Hoàn thành</span>
                <span class="tab-badge" id="tabCountCompleted">0</span>
            </button>
            <button type="button" class="order-tab-btn" data-status="cancelled">
                <span>Đã hủy</span>
                <span class="tab-badge" id="tabCountCancelled">0</span>
            </button>
        </div>

        <div id="ordersLoading" style="text-align: center; padding: 40px 0;">
            <i class="ri-loader-4-line ri-spin" style="font-size: 2rem; color: var(--primary);"></i>
            <div style="margin-top: 10px; color: var(--text-muted);">Đang tải danh sách đơn hàng...</div>
        </div>

        <div id="ordersEmpty" style="display: none; background: #ffffff; border-radius: var(--radius-lg); padding: 60px 20px; text-align: center; border: 1px solid var(--border-light);">
            <i class="ri-inbox-line" style="font-size: 3rem; color: var(--text-light); margin-bottom: 12px; display: block;"></i>
            <div id="ordersEmptyTitle" style="font-size: 1.125rem; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">Bạn chưa có đơn mua nào</div>
            <div id="ordersEmptyDesc" style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 20px;">Hãy đặt hàng ngay để trải nghiệm dịch vụ của NovaShop</div>
            <a href="/" class="btn btn-primary" data-nav-link id="ordersEmptyBtn">
                <span>Mua Sắm Ngay</span>
            </a>
        </div>

        <div id="ordersList" class="orders-list"></div>
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
                <!-- Bước 1: Nhập thông tin đăng ký -->
                <div id="registerStep1Panel">
                    <h2 class="auth-title">Đăng Ký Tài Khoản</h2>
                    <p class="auth-subtitle">Nhập đầy đủ thông tin để nhận mã xác thực kích hoạt tài khoản</p>

                    <form id="customerRegisterForm" class="auth-form">
                        <div class="form-group">
                            <label class="form-label" for="regName">Họ và tên của bạn</label>
                            <div class="input-with-icon">
                                <i class="ri-user-line input-icon-left"></i>
                                <input type="text" id="regName" class="form-input" placeholder="Ví dụ: Nguyễn Văn A" required>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label" for="regEmail">Địa chỉ Email (Nhận mã OTP)</label>
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
                            <span>Gửi Mã Xác Thực OTP</span>
                            <i class="ri-mail-send-line"></i>
                        </button>
                    </form>

                    <div class="auth-footer-link">
                        <span>Đã có tài khoản thành viên? </span>
                        <a href="/login" data-nav-link>Đăng nhập ngay tại đây</a>
                    </div>
                </div>

                <!-- Bước 2: Nhập mã OTP xác thực email -->
                <div id="registerStep2Panel" class="otp-panel" style="display: none;">
                    <div class="otp-icon-header">
                        <i class="ri-mail-check-line"></i>
                    </div>
                    <h2 class="auth-title" style="text-align: center;">Xác Thực Email</h2>
                    <p class="otp-target-desc">
                        Mã xác thực OTP gồm 6 chữ số đã được gửi tới email <br>
                        <span id="otpTargetEmail" class="otp-target-email"></span> <br>
                        Vui lòng nhập mã để kích hoạt tài khoản của bạn.
                    </p>

                    <form id="customerOtpVerifyForm" class="auth-form">
                        <div class="form-group">
                            <input type="text" id="regOtpInput" class="otp-code-input" maxlength="6" placeholder="______" pattern="[0-9]{6}" autocomplete="one-time-code" required>
                        </div>

                        <div class="otp-countdown-wrap">
                            <i class="ri-time-line"></i>
                            <span>Mã có hiệu lực trong:</span>
                            <span id="otpCountdownBadge" class="otp-countdown-badge">05:00</span>
                        </div>

                        <button type="submit" id="verifyOtpSubmitBtn" class="auth-submit-btn">
                            <span>Kích Hoạt Tài Khoản</span>
                            <i class="ri-shield-check-line"></i>
                        </button>

                        <div class="otp-resend-row">
                            <span>Chưa nhận được mã? </span>
                            <button type="button" id="resendOtpBtn" class="otp-resend-btn">Gửi lại mã OTP</button>
                        </div>

                        <button type="button" id="backToStep1Btn" class="otp-back-link">
                            <i class="ri-arrow-left-line"></i> Quay lại chỉnh sửa thông tin
                        </button>
                    </form>
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
    else if (path === '/orders' || path.startsWith('/orders/')) {
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
    else if (path === '/about') {
        document.title = 'Giới Thiệu Về NovaShop | Hệ Thống Bán Lẻ Công Nghệ';
        appEl.innerHTML = renderAboutView();
    }
    else if (path === '/careers') {
        document.title = 'Tuyển Dụng & Cơ Hội Nghề Nghiệp | NovaShop';
        appEl.innerHTML = renderCareersView();
    }
    else if (path === '/terms') {
        document.title = 'Điều Khoản Dịch Vụ | NovaShop';
        appEl.innerHTML = renderTermsView();
    }
    else if (path === '/privacy') {
        document.title = 'Chính Sách Bảo Mật Quyền Riêng Tư | NovaShop';
        appEl.innerHTML = renderPrivacyView();
    }
    else if (path === '/help') {
        document.title = 'Trung Tâm Trợ Giúp & FAQ | NovaShop';
        appEl.innerHTML = renderHelpView();
    }
    else if (path === '/guide') {
        document.title = 'Hướng Dẫn Mua Hàng & Đặt Hàng | NovaShop';
        appEl.innerHTML = renderGuideView();
    }
    else if (path === '/shipping') {
        document.title = 'Chính Sách Vận Chuyển Toàn Quốc | NovaShop';
        appEl.innerHTML = renderShippingView();
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
    const closeAllTopDropdowns = () => {
        const dropdowns = document.querySelectorAll('.top-dropdown-menu, .user-dropdown-menu');
        dropdowns.forEach((dd) => {
            dd.classList.remove('show');
        });
    };
    const notifBtn = document.getElementById('topNotificationBtn');
    const notifMenu = document.getElementById('topNotificationMenu');
    if (notifBtn && notifMenu) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = notifMenu.classList.contains('show');
            closeAllTopDropdowns();
            if (!isOpen)
                notifMenu.classList.add('show');
        });
    }
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.notif-item.unread').forEach((item) => {
                item.classList.remove('unread');
            });
            const badge = document.getElementById('topNotifBadge');
            if (badge)
                badge.style.display = 'none';
            showToast('Thông báo', 'Đã đánh dấu tất cả thông báo là đã đọc', 'success');
        });
    }
    const appBtn = document.getElementById('topDownloadAppBtn');
    const appMenu = document.getElementById('topAppQrMenu');
    if (appBtn && appMenu) {
        appBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = appMenu.classList.contains('show');
            closeAllTopDropdowns();
            if (!isOpen)
                appMenu.classList.add('show');
        });
    }
    const appStoreBtn = document.getElementById('appStoreBtn');
    const googlePlayBtn = document.getElementById('googlePlayBtn');
    [appStoreBtn, googlePlayBtn].forEach((btn) => {
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                showToast('Tải Ứng Dụng', 'Ứng dụng NovaShop trên iOS và Android sẽ sớm phát hành chính thức!', 'warning');
            });
        }
    });
    const langBtn = document.getElementById('langSwitcherBtn');
    const langMenu = document.getElementById('langDropdownMenu');
    if (langBtn && langMenu) {
        langBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = langMenu.classList.contains('show');
            closeAllTopDropdowns();
            if (!isOpen)
                langMenu.classList.add('show');
        });
    }
    document.querySelectorAll('.lang-item').forEach((item) => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.lang-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const lang = item.getAttribute('data-lang');
            const label = document.getElementById('currentLangLabel');
            if (label) {
                label.textContent = lang === 'en' ? 'English' : 'Tiếng Việt';
            }
            if (langMenu)
                langMenu.classList.remove('show');
            showToast('Ngôn ngữ', `Đã chuyển sang ${lang === 'en' ? 'English' : 'Tiếng Việt'}`, 'success');
        });
    });
    const userMenuBtn = document.getElementById('topUserMenuBtn');
    const userMenuDropdown = document.getElementById('topUserDropdownMenu');
    if (userMenuBtn && userMenuDropdown) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = userMenuDropdown.classList.contains('show');
            closeAllTopDropdowns();
            if (!isOpen)
                userMenuDropdown.classList.add('show');
        });
    }
    document.addEventListener('click', () => {
        closeAllTopDropdowns();
    });
};
const initStorefrontView = () => {
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
const initSearchSuggestions = () => {
    const input = document.getElementById('searchInput');
    const dropdown = document.getElementById('searchSuggestionsDropdown');
    if (!input || !dropdown)
        return;
    const renderSuggestions = (query) => {
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
        }
        else {
            const matchedProducts = state.products.filter(p => p.name.toLowerCase().includes(q) ||
                (p.categoryName && p.categoryName.toLowerCase().includes(q)) ||
                p.category.toLowerCase().includes(q)).slice(0, 5);
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
            }
            else if (matchedKeywords.length === 0) {
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
                    openProductDetail(found);
                }
                else {
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
        const target = e.target;
        if (!target.closest('.search-container-group')) {
            dropdown.classList.remove('active');
        }
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            dropdown.classList.remove('active');
        }
        else if (e.key === 'Enter') {
            dropdown.classList.remove('active');
        }
    });
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
    initSearchSuggestions();
    document.querySelectorAll('.hot-keyword-tag').forEach((tag) => {
        tag.addEventListener('click', () => {
            const kw = tag.getAttribute('data-search-kw') || '';
            if (searchInput)
                searchInput.value = kw;
            state.searchQuery = kw;
            fetchProducts();
        });
    });
    document.querySelectorAll('[data-service-toast]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const msg = btn.getAttribute('data-service-toast');
            if (msg)
                showToast('Ưu Đãi NovaShop', msg, 'success');
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
                if (prodSec)
                    prodSec.scrollIntoView({ behavior: 'smooth' });
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
            const target = e.target;
            if (target.closest('.add-to-cart-direct-btn') || target.closest('.buy-now-direct-btn')) {
                return;
            }
            const id = card.getAttribute('data-id');
            const found = state.products.find(p => p.id.toString() === id?.toString());
            if (found)
                openProductDetail(found);
        });
    });
    gridEl.querySelectorAll('.quickview-trigger').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            const found = state.products.find(p => p.id.toString() === id?.toString());
            if (found)
                openProductDetail(found);
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
const renderFlashSaleGrid = () => {
    const gridEl = document.getElementById('flashSaleGrid');
    if (!gridEl)
        return;
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
            const target = e.target;
            if (target.closest('.flash-add-cart-btn') || target.closest('.flash-buy-now-btn')) {
                return;
            }
            const id = card.getAttribute('data-id');
            const found = state.products.find(p => p.id.toString() === id?.toString());
            if (found)
                openProductDetail(found);
        });
    });
    gridEl.querySelectorAll('.flash-add-cart-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            const found = state.products.find(p => p.id.toString() === id?.toString());
            if (found)
                addItemToCart(found, 1);
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
const loadAndRenderProductReviews = async (productId) => {
    const container = document.getElementById('productReviewsContainer');
    if (!container)
        return;
    try {
        const res = await fetch(`${API_BASE}/api/products/${productId}/reviews`);
        const result = await res.json();
        if (!result.success || !result.data) {
            container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted);">Chưa có đánh giá nào cho sản phẩm này.</div>`;
            return;
        }
        const reviews = result.data.reviews || [];
        const stats = result.data.stats || {
            totalCount: reviews.length,
            averageRating: 5.0,
            breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
        const countHeader = document.getElementById('novamallHeaderReviewCount');
        if (countHeader) {
            countHeader.innerHTML = `<strong>${stats.totalCount}</strong> Đánh Giá`;
        }
        const valHeader = document.getElementById('novamallHeaderRatingVal');
        if (valHeader) {
            valHeader.textContent = stats.averageRating.toFixed(1);
        }
        let currentFilterStar = 0;
        let selectedFormStars = 5;
        const renderReviewsView = () => {
            const filteredReviews = currentFilterStar > 0
                ? reviews.filter(r => Math.round(Number(r.rating)) === currentFilterStar)
                : reviews;
            const starIcons = (score) => {
                const rounded = Math.round(score);
                let html = '';
                for (let i = 1; i <= 5; i++) {
                    html += `<i class="${i <= rounded ? 'ri-star-fill' : 'ri-star-line'}"></i>`;
                }
                return html;
            };
            container.innerHTML = `
                <div class="novamall-rating-summary">
                    <div class="rating-score-box">
                        <div>
                            <span class="rating-score-num">${stats.averageRating.toFixed(1)}</span>
                            <span class="rating-score-max">/ 5</span>
                        </div>
                        <div class="rating-score-stars">
                            ${starIcons(stats.averageRating)}
                        </div>
                        <div class="rating-score-count">${stats.totalCount} đánh giá từ người mua</div>
                    </div>
                    <div class="rating-filter-chips">
                        <button type="button" class="rating-filter-btn ${currentFilterStar === 0 ? 'active' : ''}" data-star="0">
                            Tất cả (${stats.totalCount})
                        </button>
                        <button type="button" class="rating-filter-btn ${currentFilterStar === 5 ? 'active' : ''}" data-star="5">
                            5 Sao (${stats.breakdown[5] || 0})
                        </button>
                        <button type="button" class="rating-filter-btn ${currentFilterStar === 4 ? 'active' : ''}" data-star="4">
                            4 Sao (${stats.breakdown[4] || 0})
                        </button>
                        <button type="button" class="rating-filter-btn ${currentFilterStar === 3 ? 'active' : ''}" data-star="3">
                            3 Sao (${stats.breakdown[3] || 0})
                        </button>
                        <button type="button" class="rating-filter-btn ${currentFilterStar === 2 ? 'active' : ''}" data-star="2">
                            2 Sao (${stats.breakdown[2] || 0})
                        </button>
                        <button type="button" class="rating-filter-btn ${currentFilterStar === 1 ? 'active' : ''}" data-star="1">
                            1 Sao (${stats.breakdown[1] || 0})
                        </button>
                    </div>
                </div>

                <div class="review-form-card">
                    <div class="review-form-title">
                        <i class="ri-edit-2-line" style="color: #ee4d2d;"></i>
                        <span>Viết Đánh Giá Của Bạn Về Sản Phẩm</span>
                    </div>
                    <div class="review-star-picker">
                        <span>Đánh giá:</span>
                        <div id="interactiveStarPicker" style="display: flex; gap: 4px;">
                            ${[1, 2, 3, 4, 5].map(st => `
                                <i class="ri-star-fill star-interactive-item ${st <= selectedFormStars ? 'active' : ''}" data-val="${st}"></i>
                            `).join('')}
                        </div>
                        <span id="starRatingLabel" style="font-weight: 700; color: #f59e0b; margin-left: 8px;">
                            ${selectedFormStars === 5 ? 'Tuyệt vời' : selectedFormStars === 4 ? 'Rất tốt' : selectedFormStars === 3 ? 'Bình thường' : selectedFormStars === 2 ? 'Kém' : 'Rất tệ'}
                        </span>
                    </div>
                    <div class="review-form-inputs">
                        ${state.user ? `
                            <div style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 4px;">
                                <i class="ri-user-smile-line"></i> Người đánh giá: <strong style="color: var(--text-main);">${state.user.name}</strong> (Tài khoản NovaShop)
                            </div>
                        ` : `
                            <div style="margin-bottom: 6px;">
                                <input type="text" id="reviewAuthorInput" class="form-input form-input-sm" placeholder="Họ và tên của bạn (hoặc đăng nhập để lưu vào tài khoản)" value="Khách hàng">
                            </div>
                        `}
                        <textarea id="reviewCommentInput" class="review-textarea" placeholder="Hãy chia sẻ nhận xét chi tiết về chất lượng sản phẩm, độ hoàn thiện, đóng gói và dịch vụ giao hàng..."></textarea>
                        <button type="button" id="submitReviewBtn" class="review-submit-btn">
                            <i class="ri-send-plane-fill"></i> Gửi Đánh Giá
                        </button>
                    </div>
                </div>

                <div class="reviews-list-container">
                    ${filteredReviews.length === 0 ? `
                        <div style="text-align: center; padding: 30px; color: var(--text-muted); font-size: 0.875rem;">
                            Chưa có đánh giá nào cho mức sao này.
                        </div>
                    ` : filteredReviews.map(r => {
                const initial = (r.userName || 'K').charAt(0).toUpperCase();
                return `
                            <div class="review-item-card">
                                <div class="review-avatar-circle">${initial}</div>
                                <div class="review-item-main">
                                    <div class="review-author-line">
                                        <span class="review-author-name">${r.userName}</span>
                                        ${r.isBuyer ? `
                                            <span class="verified-buyer-badge">
                                                <i class="ri-checkbox-circle-fill"></i> Đã mua hàng tại NovaShop
                                            </span>
                                        ` : ''}
                                    </div>
                                    <div class="review-stars-row">
                                        ${starIcons(r.rating)}
                                    </div>
                                    <div class="review-date-text">${formatDate(r.createdAt)}</div>
                                    <div class="review-comment-body">${r.comment}</div>
                                    ${r.replyComment ? `
                                        <div class="review-reply-card">
                                            <div class="review-reply-label"><i class="ri-store-2-line"></i> Phản Hồi Của NovaShop:</div>
                                            <div class="review-reply-text">${r.replyComment}</div>
                                        </div>
                                    ` : ''}
                                    <div class="review-actions-line" style="margin-top: 8px;">
                                        <button type="button" class="review-helpful-action" data-id="${r.id}">
                                            <i class="ri-thumb-up-line"></i> Hữu ích (${r.helpfulCount || 0})
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
            }).join('')}
                </div>
            `;
            bindReviewEvents();
        };
        const bindReviewEvents = () => {
            container.querySelectorAll('.rating-filter-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const st = parseInt(btn.getAttribute('data-star') || '0', 10);
                    currentFilterStar = st;
                    renderReviewsView();
                });
            });
            const picker = document.getElementById('interactiveStarPicker');
            const label = document.getElementById('starRatingLabel');
            if (picker) {
                const labels = {
                    1: 'Rất tệ',
                    2: 'Kém',
                    3: 'Bình thường',
                    4: 'Rất tốt',
                    5: 'Tuyệt vời'
                };
                picker.querySelectorAll('.star-interactive-item').forEach((starEl) => {
                    starEl.addEventListener('mouseenter', () => {
                        const val = parseInt(starEl.getAttribute('data-val') || '5', 10);
                        picker.querySelectorAll('.star-interactive-item').forEach(s => {
                            const sv = parseInt(s.getAttribute('data-val') || '0', 10);
                            if (sv <= val)
                                s.classList.add('hover');
                            else
                                s.classList.remove('hover');
                        });
                        if (label && labels[val])
                            label.textContent = labels[val];
                    });
                    starEl.addEventListener('mouseleave', () => {
                        picker.querySelectorAll('.star-interactive-item').forEach(s => s.classList.remove('hover'));
                        if (label && labels[selectedFormStars])
                            label.textContent = labels[selectedFormStars];
                    });
                    starEl.addEventListener('click', () => {
                        selectedFormStars = parseInt(starEl.getAttribute('data-val') || '5', 10);
                        picker.querySelectorAll('.star-interactive-item').forEach(s => {
                            const sv = parseInt(s.getAttribute('data-val') || '0', 10);
                            if (sv <= selectedFormStars)
                                s.classList.add('active');
                            else
                                s.classList.remove('active');
                        });
                        if (label && labels[selectedFormStars])
                            label.textContent = labels[selectedFormStars];
                    });
                });
            }
            const submitBtn = document.getElementById('submitReviewBtn');
            const commentInput = document.getElementById('reviewCommentInput');
            const authorInput = document.getElementById('reviewAuthorInput');
            if (submitBtn && commentInput) {
                submitBtn.addEventListener('click', async () => {
                    const comment = commentInput.value.trim();
                    if (!comment) {
                        showToast('Nhắc nhở', 'Vui lòng nhập nội dung đánh giá sản phẩm', 'warning');
                        commentInput.focus();
                        return;
                    }
                    const userName = state.user ? state.user.name : (authorInput?.value.trim() || 'Khách hàng');
                    submitBtn.setAttribute('disabled', 'true');
                    submitBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Đang gửi...`;
                    try {
                        const postRes = await fetch(`${API_BASE}/api/products/${productId}/reviews`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                rating: selectedFormStars,
                                comment,
                                userName,
                                userId: state.user?.id || null,
                                isBuyer: true
                            })
                        });
                        const postResult = await postRes.json();
                        if (postResult.success) {
                            showToast('Thành công', 'Cảm ơn bạn đã gửi đánh giá sản phẩm!', 'success');
                            loadAndRenderProductReviews(productId);
                        }
                        else {
                            showToast('Lỗi', postResult.message || 'Không thể gửi đánh giá', 'error');
                            submitBtn.removeAttribute('disabled');
                            submitBtn.innerHTML = `<i class="ri-send-plane-fill"></i> Gửi Đánh Giá`;
                        }
                    }
                    catch {
                        showToast('Lỗi', 'Không thể kết nối đến máy chủ', 'error');
                        submitBtn.removeAttribute('disabled');
                        submitBtn.innerHTML = `<i class="ri-send-plane-fill"></i> Gửi Đánh Giá`;
                    }
                });
            }
            container.querySelectorAll('.review-helpful-action').forEach((btn) => {
                btn.addEventListener('click', () => {
                    btn.classList.toggle('liked');
                    if (btn.classList.contains('liked')) {
                        btn.innerHTML = `<i class="ri-thumb-up-fill" style="color: #ee4d2d;"></i> Đã cảm ơn`;
                    }
                });
            });
        };
        renderReviewsView();
    }
    catch {
        container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted);">Không thể tải đánh giá sản phẩm lúc này.</div>`;
    }
};
function openProductDetail(product) {
    state.activeProduct = product;
    state.selectedQty = 1;
    const variants = product.variants && product.variants.length > 0 ? product.variants : [];
    const uniqueColors = Array.from(new Set(variants.map(v => v.color).filter(Boolean)));
    const uniqueTypes = Array.from(new Set(variants.map(v => v.type).filter(Boolean)));
    state.selectedColor = uniqueColors.length > 0 ? uniqueColors[0] : '';
    state.selectedType = uniqueTypes.length > 0 ? uniqueTypes[0] : '';
    const findCurrentVariant = () => {
        if (variants.length === 0)
            return null;
        return variants.find(v => v.color === state.selectedColor && v.type === state.selectedType)
            || variants.find(v => v.color === state.selectedColor)
            || variants.find(v => v.type === state.selectedType)
            || variants[0];
    };
    state.selectedVariant = findCurrentVariant();
    const modal = document.getElementById('quickviewModal');
    const content = document.getElementById('quickviewContent');
    if (!modal || !content)
        return;
    const renderProductDetailModal = () => {
        const v = state.selectedVariant;
        const currentPrice = v ? v.price : product.price;
        const originalPrice = v && v.originalPrice ? v.originalPrice : product.originalPrice;
        const stock = v ? v.stock : product.stock;
        const activeImage = v && v.imageUrl ? v.imageUrl : product.imageUrl;
        const discount = originalPrice && originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
        const allThumbnails = variants.length > 0
            ? variants.map(varItem => varItem.imageUrl).filter(Boolean)
            : [product.imageUrl];
        const uniqueThumbs = Array.from(new Set([product.imageUrl, ...allThumbnails]));
        content.innerHTML = `
        <div class="novamall-main-grid">
            <div class="novamall-gallery">
                <div class="novamall-main-image-wrap">
                    <img id="novamallMainImg" src="${activeImage}" alt="${product.name}" class="novamall-main-image">
                </div>
                <div class="novamall-thumbnails">
                    ${uniqueThumbs.map(imgUrl => `
                        <img src="${imgUrl}" alt="Thumbnail" class="novamall-thumb-item ${imgUrl === activeImage ? 'active' : ''}" data-thumb="${imgUrl}">
                    `).join('')}
                </div>
                <div class="novamall-commitments">
                    <div class="novamall-commit-item">
                        <i class="ri-arrow-go-back-line"></i>
                        <span>7 ngày miễn phí đổi trả</span>
                    </div>
                    <div class="novamall-commit-item">
                        <i class="ri-shield-star-line"></i>
                        <span>Hàng chính hãng 100%</span>
                    </div>
                    <div class="novamall-commit-item">
                        <i class="ri-truck-line"></i>
                        <span>Miễn phí vận chuyển</span>
                    </div>
                </div>
            </div>

            <div class="novamall-info-col">
                <div class="novamall-title-area">
                    <span class="novamall-mall-tag">Chính Hãng</span>
                    <h2 class="novamall-product-title">${product.name}</h2>
                </div>

                <div class="novamall-rating-strip">
                    <div class="novamall-rating-val">
                        <span>${product.rating || '5.0'}</span>
                        <i class="ri-star-fill novamall-rating-stars"></i>
                    </div>
                    <div class="novamall-meta-divider"></div>
                    <div><strong>${product.sold || product.soldCount || 100}</strong> Đã Bán</div>
                    <div class="novamall-meta-divider"></div>
                    <div>Kho: <strong>${stock}</strong> sản phẩm</div>
                </div>

                <div class="novamall-price-box">
                    ${product.isFlashSale ? `
                        <div class="novamall-flash-banner">
                            <span><i class="ri-flashlight-fill" style="color: #ffd839;"></i> FLASH SALE GIÁ SỐC</span>
                        </div>
                    ` : ''}
                    ${originalPrice && originalPrice > currentPrice ? `
                        <div class="novamall-price-original">${formatPrice(originalPrice)}</div>
                    ` : ''}
                    <div id="novamallDisplayPrice" class="novamall-price-current">${formatPrice(currentPrice)}</div>
                    ${discount > 0 ? `
                        <span id="novamallDisplayDiscount" class="novamall-price-discount">-${discount}% GIẢM</span>
                    ` : ''}
                </div>

                <div class="novamall-variant-group">
                    ${uniqueColors.length > 0 ? `
                        <div class="novamall-variant-row">
                            <div class="novamall-variant-label">Màu Sắc</div>
                            <div class="novamall-variant-options">
                                ${uniqueColors.map(color => {
            const sampleVar = variants.find(varItem => varItem.color === color && varItem.imageUrl);
            const thumbImg = sampleVar ? `<img src="${sampleVar.imageUrl}" class="novamall-option-btn-thumb" alt="${color}">` : '';
            return `
                                    <button class="novamall-option-btn ${color === state.selectedColor ? 'active' : ''}" data-color="${color}" type="button">
                                        ${thumbImg}
                                        <span>${color}</span>
                                    </button>
                                    `;
        }).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${uniqueTypes.length > 0 ? `
                        <div class="novamall-variant-row">
                            <div class="novamall-variant-label">Phân Loại</div>
                            <div class="novamall-variant-options">
                                ${uniqueTypes.map(type => `
                                    <button class="novamall-option-btn ${type === state.selectedType ? 'active' : ''}" data-type="${type}" type="button">
                                        <span>${type}</span>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <div class="novamall-quantity-row">
                        <div class="novamall-variant-label">Số Lượng</div>
                        <div class="novamall-qty-wrapper">
                            <button class="novamall-qty-btn" id="novamallModalQtyMinus" type="button">-</button>
                            <input id="novamallModalQtyInput" type="text" class="novamall-qty-input" value="${state.selectedQty}" readonly>
                            <button class="novamall-qty-btn" id="novamallModalQtyPlus" type="button">+</button>
                        </div>
                        <div class="novamall-stock-text">
                            ${stock > 0 ? `Còn ${stock} sản phẩm có sẵn` : '<span style="color: var(--accent); font-weight: 700;">Tạm hết hàng</span>'}
                        </div>
                    </div>
                </div>

                <div class="novamall-actions-row">
                    <button id="novamallAddCartBtn" class="novamall-btn-add-cart" ${stock <= 0 ? 'disabled' : ''} type="button">
                        <i class="ri-shopping-cart-2-line" style="font-size: 1.25rem;"></i>
                        <span>Thêm Vào Giỏ Hàng</span>
                    </button>
                    <button id="novamallBuyNowBtn" class="novamall-btn-buy-now" ${stock <= 0 ? 'disabled' : ''} type="button">
                        <i class="ri-flashlight-fill"></i>
                        <span>Mua Ngay</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="novamall-detail-tabs">
            <div class="novamall-section-heading">
                <i class="ri-file-list-3-line" style="color: #ee4d2d;"></i>
                <span>CHI TIẾT SẢN PHẨM</span>
            </div>
            <table class="novamall-specs-table">
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

            <div class="novamall-section-heading">
                <i class="ri-article-line" style="color: #ee4d2d;"></i>
                <span>MÔ TẢ SẢN PHẨM</span>
            </div>
            <div class="novamall-desc-content">
                <p>${product.description || 'Sản phẩm chính hãng với tiêu chuẩn chất lượng cao, bảo hành điện tử chính hãng toàn quốc.'}</p>
            </div>

            <div class="novamall-reviews-section">
                <div class="novamall-section-heading">
                    <i class="ri-star-smile-line" style="color: #ee4d2d;"></i>
                    <span>ĐÁNH GIÁ SẢN PHẨM</span>
                </div>
                <div id="productReviewsContainer">
                    <div style="text-align: center; padding: 24px; color: var(--text-muted);">
                        <i class="ri-loader-4-line ri-spin" style="font-size: 1.5rem;"></i>
                        <p style="margin-top: 8px;">Đang tải đánh giá từ hệ thống...</p>
                    </div>
                </div>
            </div>
        </div>
        `;
        content.querySelectorAll('.novamall-thumb-item').forEach((thumb) => {
            thumb.addEventListener('click', () => {
                const imgUrl = thumb.getAttribute('data-thumb');
                if (!imgUrl)
                    return;
                const matchedVariant = variants.find(v => v.imageUrl === imgUrl);
                if (matchedVariant) {
                    if (matchedVariant.color)
                        state.selectedColor = matchedVariant.color;
                    if (matchedVariant.type)
                        state.selectedType = matchedVariant.type;
                    state.selectedVariant = matchedVariant;
                    renderProductDetailModal();
                }
                else {
                    const mainImg = document.getElementById('novamallMainImg');
                    if (mainImg)
                        mainImg.src = imgUrl;
                    content.querySelectorAll('.novamall-thumb-item').forEach(t => t.classList.remove('active'));
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
                renderProductDetailModal();
            });
        });
        content.querySelectorAll('[data-type]').forEach((btn) => {
            btn.addEventListener('click', () => {
                state.selectedType = btn.getAttribute('data-type') || '';
                state.selectedVariant = findCurrentVariant();
                renderProductDetailModal();
            });
        });
        const qtyInput = document.getElementById('novamallModalQtyInput');
        const minusBtn = document.getElementById('novamallModalQtyMinus');
        const plusBtn = document.getElementById('novamallModalQtyPlus');
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
        const addCartBtn = document.getElementById('novamallAddCartBtn');
        if (addCartBtn) {
            addCartBtn.addEventListener('click', () => {
                const varLabel = state.selectedVariant
                    ? (state.selectedVariant.name || `${state.selectedColor} ${state.selectedType}`.trim())
                    : undefined;
                addItemToCart(product, state.selectedQty, varLabel);
                modal.classList.remove('active');
            });
        }
        const buyNowBtn = document.getElementById('novamallBuyNowBtn');
        if (buyNowBtn) {
            buyNowBtn.addEventListener('click', () => {
                if (!state.user) {
                    showToast('Yêu cầu đăng nhập', 'Quý khách vui lòng đăng nhập tài khoản để đặt hàng', 'warning');
                    modal.classList.remove('active');
                    navigate('/login');
                    return;
                }
                const varLabel = state.selectedVariant
                    ? (state.selectedVariant.name || `${state.selectedColor} ${state.selectedType}`.trim())
                    : undefined;
                addItemToCart(product, state.selectedQty, varLabel);
                modal.classList.remove('active');
                state.checkoutStep = 2;
                navigate('/cart');
            });
        }
    };
    renderProductDetailModal();
    modal.classList.add('active');
    loadAndRenderProductReviews(product.id);
}
const addItemToCart = (product, quantity = 1, variantName) => {
    const itemPrice = state.selectedVariant ? state.selectedVariant.price : product.price;
    const itemImage = state.selectedVariant?.imageUrl || product.imageUrl;
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
            imageUrl: itemImage,
            quantity: quantity,
            variantName: variantName,
            weight: product.weight || 300
        });
    }
    saveCart();
    showToast('Thành công', `Đã thêm ${quantity} sản phẩm vào giỏ hàng`, 'success');
};
const stripAccentsOnly = (str) => {
    return (str || '')
        .toLowerCase()
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'd')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
};
const normalizeLocationString = (str) => {
    return stripAccentsOnly(str)
        .replace(/^(tinh|thanh pho|tp\.|tp|quan|q\.|huyen|h\.|thi xa|tx\.|tx|phuong|p\.|xa|thi tran|tt\.)\s*/gi, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};
const matchGhnEntity = (entity, type, allTokens, fullUnaccent, fullRaw) => {
    if (!entity)
        return false;
    const nameField = type === 'district' ? 'DistrictName' : (type === 'ward' ? 'WardName' : 'ProvinceName');
    const allNames = [entity[nameField], ...(entity.NameExtension || [])].filter(Boolean);
    for (const rawName of allNames) {
        const cleanName = normalizeLocationString(rawName);
        if (!cleanName)
            continue;
        if (/^\d+$/.test(cleanName)) {
            const prefix = type === 'district' ? '(quan|q\\.?|district)' : '(phuong|p\\.?|ward)';
            const regex = new RegExp('\\b' + prefix + '\\s*' + cleanName + '\\b', 'i');
            if (regex.test(fullUnaccent))
                return true;
            for (const token of allTokens) {
                const unaccentTok = stripAccentsOnly(token);
                if (new RegExp('\\b' + prefix + '\\s*' + cleanName + '\\b', 'i').test(unaccentTok))
                    return true;
            }
            continue;
        }
        for (const token of allTokens) {
            const cleanToken = normalizeLocationString(token);
            if (!cleanToken)
                continue;
            if (cleanName === cleanToken)
                return true;
            if (cleanName.length >= 3 && cleanToken.includes(cleanName))
                return true;
            if (cleanToken.length >= 4 && cleanName.includes(cleanToken))
                return true;
        }
        if (cleanName.length >= 3) {
            const escaped = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regexWord = new RegExp('(\\b|\\s)' + escaped + '(\\b|\\s|$)', 'i');
            const cleanFull = normalizeLocationString(fullUnaccent);
            if (regexWord.test(' ' + cleanFull + ' '))
                return true;
        }
    }
    return false;
};
let triggerGhnFeeCalculation = null;
const initCartView = () => {
    renderCartItemsList();
    loadAvailableVouchers();
    const confirmBtn = document.getElementById('confirmOrderBtn');
    const nameInput = document.getElementById('checkoutName');
    const phoneInput = document.getElementById('checkoutPhone');
    const addressInput = document.getElementById('checkoutAddress');
    const paymentSelect = document.getElementById('checkoutPayment');
    const provinceSelect = document.getElementById('checkoutProvince');
    const districtSelect = document.getElementById('checkoutDistrict');
    const wardSelect = document.getElementById('checkoutWard');
    const saveAddressCheckbox = document.getElementById('saveAddressCheckbox');
    const savedAddressNotice = document.getElementById('savedAddressNotice');
    const clearSavedAddressBtn = document.getElementById('clearSavedAddressBtn');
    const geoLocateBtn = document.getElementById('geoLocateBtn');
    const geoLocateBtnText = document.getElementById('geoLocateBtnText');
    const toggleVouchersBtn = document.getElementById('toggleVouchersBtn');
    const voucherSuggestions = document.getElementById('voucherSuggestions');
    const applyVoucherBtn = document.getElementById('applyVoucherBtn');
    const voucherCodeInput = document.getElementById('voucherCodeInput');
    const btnGoToStep2 = document.getElementById('btnGoToStep2');
    const btnBackToStep1 = document.getElementById('btnBackToStep1');
    const btnGoToStep3 = document.getElementById('btnGoToStep3');
    const btnBackToStep2 = document.getElementById('btnBackToStep2');
    const btnEditAddressFromStep3 = document.getElementById('btnEditAddressFromStep3');
    const stepTab1 = document.getElementById('stepTab1');
    const stepTab2 = document.getElementById('stepTab2');
    const stepTab3 = document.getElementById('stepTab3');
    const step1Panel = document.getElementById('checkoutStep1Panel');
    const step2Panel = document.getElementById('checkoutStep2Panel');
    const step3Panel = document.getElementById('checkoutStep3Panel');
    const stepCircle1 = document.getElementById('stepCircle1');
    const stepCircle2 = document.getElementById('stepCircle2');
    const stepCircle3 = document.getElementById('stepCircle3');
    const stepLabel1 = document.getElementById('stepLabel1');
    const stepLabel2 = document.getElementById('stepLabel2');
    const stepLabel3 = document.getElementById('stepLabel3');
    const stepLine1 = document.getElementById('stepLine1');
    const stepLine2 = document.getElementById('stepLine2');
    const step3AddressText = document.getElementById('step3AddressText');
    const step3GhnWeight = document.getElementById('step3GhnWeight');
    const step3GhnFee = document.getElementById('step3GhnFee');
    const step3GhnLeadTime = document.getElementById('step3GhnLeadTime');
    let ghnProvincesList = [];
    let ghnDistrictsList = [];
    let ghnWardsList = [];
    const switchCheckoutStep = (step) => {
        state.checkoutStep = step;
        if (step1Panel)
            step1Panel.style.display = step === 1 ? 'block' : 'none';
        if (step2Panel)
            step2Panel.style.display = step === 2 ? 'block' : 'none';
        if (step3Panel)
            step3Panel.style.display = step === 3 ? 'block' : 'none';
        if (stepCircle1 && stepLabel1 && stepLine1) {
            stepCircle1.style.background = step >= 1 ? 'var(--primary)' : '#e2e8f0';
            stepCircle1.style.color = step >= 1 ? '#ffffff' : '#64748b';
            stepCircle1.innerHTML = step > 1 ? '<i class="ri-check-line"></i>' : '1';
            stepLabel1.style.color = step === 1 ? 'var(--primary)' : (step > 1 ? 'var(--text-main)' : '#64748b');
            stepLine1.style.background = step >= 2 ? 'var(--primary)' : '#e2e8f0';
        }
        if (stepCircle2 && stepLabel2 && stepLine2) {
            stepCircle2.style.background = step >= 2 ? 'var(--primary)' : '#e2e8f0';
            stepCircle2.style.color = step >= 2 ? '#ffffff' : '#64748b';
            stepCircle2.innerHTML = step > 2 ? '<i class="ri-check-line"></i>' : '2';
            stepLabel2.style.color = step === 2 ? 'var(--primary)' : (step > 2 ? 'var(--text-main)' : '#64748b');
            stepLine2.style.background = step >= 3 ? 'var(--primary)' : '#e2e8f0';
        }
        if (stepCircle3 && stepLabel3) {
            stepCircle3.style.background = step >= 3 ? 'var(--primary)' : '#e2e8f0';
            stepCircle3.style.color = step >= 3 ? '#ffffff' : '#64748b';
            stepLabel3.style.color = step === 3 ? 'var(--primary)' : '#64748b';
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const loadGhnProvinces = async () => {
        if (!provinceSelect)
            return false;
        try {
            const res = await fetch(`${API_BASE}/api/orders/ghn/provinces`);
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                ghnProvincesList = data.data;
                provinceSelect.innerHTML = `<option value="">-- Chọn Tỉnh / Thành phố --</option>` +
                    ghnProvincesList.map((p) => `<option value="${p.ProvinceID}">${p.ProvinceName}</option>`).join('');
                provinceSelect.disabled = false;
                return true;
            }
            else {
                provinceSelect.innerHTML = `<option value="">-- Không thể tải tỉnh thành --</option>`;
                return false;
            }
        }
        catch {
            if (provinceSelect)
                provinceSelect.innerHTML = `<option value="">-- Lỗi kết nối GHN --</option>`;
            return false;
        }
    };
    const loadGhnDistricts = async (provinceId) => {
        if (!districtSelect)
            return false;
        districtSelect.disabled = true;
        districtSelect.innerHTML = `<option value="">Đang tải Quận / Huyện...</option>`;
        if (wardSelect) {
            wardSelect.disabled = true;
            wardSelect.innerHTML = `<option value="">-- Chọn Phường / Xã --</option>`;
        }
        try {
            const res = await fetch(`${API_BASE}/api/orders/ghn/districts/${provinceId}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                ghnDistrictsList = data.data;
                districtSelect.innerHTML = `<option value="">-- Chọn Quận / Huyện --</option>` +
                    ghnDistrictsList.map((d) => `<option value="${d.DistrictID}">${d.DistrictName}</option>`).join('');
                districtSelect.disabled = false;
                return true;
            }
            return false;
        }
        catch {
            districtSelect.innerHTML = `<option value="">-- Lỗi tải Quận / Huyện --</option>`;
            return false;
        }
    };
    const loadGhnWards = async (districtId) => {
        if (!wardSelect)
            return false;
        wardSelect.disabled = true;
        wardSelect.innerHTML = `<option value="">Đang tải Phường / Xã...</option>`;
        try {
            const res = await fetch(`${API_BASE}/api/orders/ghn/wards/${districtId}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                ghnWardsList = data.data;
                wardSelect.innerHTML = `<option value="">-- Chọn Phường / Xã --</option>` +
                    ghnWardsList.map((w) => `<option value="${w.WardCode}">${w.WardName}</option>`).join('');
                wardSelect.disabled = false;
                return true;
            }
            return false;
        }
        catch {
            wardSelect.innerHTML = `<option value="">-- Lỗi tải Phường / Xã --</option>`;
            return false;
        }
    };
    const calculateGhnShippingFee = async () => {
        if (!state.selectedDistrictId || !state.selectedWardCode) {
            state.shippingFee = 0;
            state.shippingLeadTime = '';
            renderCartItemsList();
            return;
        }
        const totalWeight = state.cart.reduce((sum, item) => sum + (Number(item.weight) || 300) * item.quantity, 0);
        const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        try {
            const res = await fetch(`${API_BASE}/api/orders/ghn/calculate-fee`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    district_id: state.selectedDistrictId,
                    ward_code: state.selectedWardCode,
                    weight: Math.max(100, totalWeight),
                    insurance_value: Math.min(5000000, subtotal)
                })
            });
            const data = await res.json();
            if (data.success) {
                state.shippingFee = Number(data.fee) || 0;
                state.shippingLeadTime = data.leadtime || '';
                if (step3GhnFee)
                    step3GhnFee.textContent = formatPrice(state.shippingFee);
                if (step3GhnLeadTime && state.shippingLeadTime)
                    step3GhnLeadTime.textContent = state.shippingLeadTime;
                if (step3GhnWeight)
                    step3GhnWeight.textContent = `${Math.max(100, totalWeight)} g`;
            }
            else {
                state.shippingFee = 30000;
            }
        }
        catch {
            state.shippingFee = 30000;
        }
        renderCartItemsList();
    };
    triggerGhnFeeCalculation = calculateGhnShippingFee;
    const restoreSavedAddress = async () => {
        if (!state.user)
            return;
        const savedRaw = localStorage.getItem(`novashop_saved_addr_${state.user.id}`);
        if (savedRaw) {
            try {
                const saved = JSON.parse(savedRaw);
                if (nameInput && saved.name)
                    nameInput.value = saved.name;
                if (phoneInput && saved.phone)
                    phoneInput.value = saved.phone;
                if (addressInput && saved.address)
                    addressInput.value = saved.address;
                if (savedAddressNotice) {
                    savedAddressNotice.style.display = 'flex';
                }
                if (saved.provinceId && provinceSelect) {
                    provinceSelect.value = String(saved.provinceId);
                    state.selectedProvinceId = Number(saved.provinceId);
                    const loadedDistricts = await loadGhnDistricts(Number(saved.provinceId));
                    if (loadedDistricts && saved.districtId && districtSelect) {
                        districtSelect.value = String(saved.districtId);
                        state.selectedDistrictId = Number(saved.districtId);
                        const loadedWards = await loadGhnWards(Number(saved.districtId));
                        if (loadedWards && saved.wardCode && wardSelect) {
                            wardSelect.value = String(saved.wardCode);
                            state.selectedWardCode = String(saved.wardCode);
                            await calculateGhnShippingFee();
                            return;
                        }
                    }
                }
            }
            catch (e) {
                console.warn('Lỗi phục hồi địa chỉ đã lưu:', e);
            }
        }
        if (state.user?.address && ghnProvincesList.length > 0 && (!state.selectedProvinceId || !provinceSelect?.value)) {
            const rawAddr = state.user.address;
            const matchedProv = ghnProvincesList.find((p) => matchGhnEntity(p, 'province', rawAddr.split(',').map((s) => s.trim()), stripAccentsOnly(rawAddr), rawAddr));
            if (matchedProv && provinceSelect) {
                provinceSelect.value = String(matchedProv.ProvinceID);
                state.selectedProvinceId = matchedProv.ProvinceID;
                const loadedDist = await loadGhnDistricts(matchedProv.ProvinceID);
                if (loadedDist && ghnDistrictsList.length > 0) {
                    const matchedDist = ghnDistrictsList.find((d) => matchGhnEntity(d, 'district', rawAddr.split(',').map((s) => s.trim()), stripAccentsOnly(rawAddr), rawAddr));
                    if (matchedDist && districtSelect) {
                        districtSelect.value = String(matchedDist.DistrictID);
                        state.selectedDistrictId = matchedDist.DistrictID;
                        const loadedW = await loadGhnWards(matchedDist.DistrictID);
                        if (loadedW && ghnWardsList.length > 0) {
                            const matchedW = ghnWardsList.find((w) => matchGhnEntity(w, 'ward', rawAddr.split(',').map((s) => s.trim()), stripAccentsOnly(rawAddr), rawAddr));
                            if (matchedW && wardSelect) {
                                wardSelect.value = String(matchedW.WardCode);
                                state.selectedWardCode = String(matchedW.WardCode);
                                await calculateGhnShippingFee();
                            }
                        }
                    }
                }
            }
        }
    };
    loadGhnProvinces().then(() => {
        restoreSavedAddress();
    });
    if (clearSavedAddressBtn) {
        clearSavedAddressBtn.addEventListener('click', () => {
            if (state.user) {
                localStorage.removeItem(`novashop_saved_addr_${state.user.id}`);
            }
            if (savedAddressNotice)
                savedAddressNotice.style.display = 'none';
            if (addressInput)
                addressInput.value = '';
            if (provinceSelect)
                provinceSelect.value = '';
            if (districtSelect) {
                districtSelect.value = '';
                districtSelect.disabled = true;
            }
            if (wardSelect) {
                wardSelect.value = '';
                wardSelect.disabled = true;
            }
            state.selectedProvinceId = null;
            state.selectedDistrictId = null;
            state.selectedWardCode = null;
            state.shippingFee = 0;
            renderCartItemsList();
            showToast('Thông báo', 'Đã xóa địa chỉ đã lưu', 'info');
        });
    }
    if (geoLocateBtn) {
        geoLocateBtn.addEventListener('click', () => {
            if (!navigator.geolocation) {
                showToast('Thông báo', 'Trình duyệt của bạn không hỗ trợ định vị vị trí', 'warning');
                return;
            }
            if (geoLocateBtnText) {
                geoLocateBtnText.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Đang xác định vị trí...`;
            }
            geoLocateBtn.setAttribute('disabled', 'true');
            navigator.geolocation.getCurrentPosition(async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`, { headers: { 'Accept-Language': 'vi' } });
                    const geoData = await geoRes.json();
                    const addr = geoData.address || {};
                    const fullDisplayName = geoData.display_name || '';
                    const fullUnaccent = stripAccentsOnly(fullDisplayName);
                    const tokens = [
                        ...(fullDisplayName.split(',').map((s) => s.trim())),
                        addr.road,
                        addr.house_number,
                        addr.suburb,
                        addr.quarter,
                        addr.neighbourhood,
                        addr.ward,
                        addr.village,
                        addr.residential,
                        addr.hamlet,
                        addr.city_district,
                        addr.district,
                        addr.county,
                        addr.town,
                        addr.municipality,
                        addr.borough,
                        addr.city,
                        addr.state,
                        addr.state_district
                    ].filter(Boolean);
                    let matchedProvince = null;
                    let matchedDistrict = null;
                    let matchedWard = null;
                    matchedProvince = ghnProvincesList.find((p) => matchGhnEntity(p, 'province', tokens, fullUnaccent, fullDisplayName));
                    if (matchedProvince && provinceSelect) {
                        provinceSelect.value = String(matchedProvince.ProvinceID);
                        state.selectedProvinceId = matchedProvince.ProvinceID;
                        const districtsLoaded = await loadGhnDistricts(matchedProvince.ProvinceID);
                        if (districtsLoaded && ghnDistrictsList.length > 0) {
                            matchedDistrict = ghnDistrictsList.find((d) => matchGhnEntity(d, 'district', tokens, fullUnaccent, fullDisplayName));
                            if (!matchedDistrict) {
                                const wardCandidates = [addr.suburb, addr.quarter, addr.neighbourhood, addr.ward, addr.village, addr.town, addr.residential, ...tokens]
                                    .filter(Boolean)
                                    .map((s) => String(s).trim())
                                    .filter((s) => {
                                    const clean = normalizeLocationString(s);
                                    return clean.length >= 3 && clean !== 'viet nam' && clean !== 'vietnam' && clean !== normalizeLocationString(matchedProvince.ProvinceName);
                                });
                                for (const cand of wardCandidates) {
                                    try {
                                        const lookupRes = await fetch(`${API_BASE}/api/orders/ghn/lookup-ward?provinceId=${matchedProvince.ProvinceID}&keyword=${encodeURIComponent(cand)}`);
                                        const lookupData = await lookupRes.json();
                                        if (lookupData.success && lookupData.data && lookupData.data.district && lookupData.data.ward) {
                                            matchedDistrict = lookupData.data.district;
                                            matchedWard = lookupData.data.ward;
                                            break;
                                        }
                                    }
                                    catch (e) {
                                        console.warn('Lỗi tra cứu ngược đơn vị hành chính:', e);
                                    }
                                }
                            }
                            if (matchedDistrict && districtSelect) {
                                districtSelect.value = String(matchedDistrict.DistrictID);
                                state.selectedDistrictId = matchedDistrict.DistrictID;
                                const wardsLoaded = await loadGhnWards(matchedDistrict.DistrictID);
                                if (wardsLoaded && ghnWardsList.length > 0) {
                                    if (!matchedWard) {
                                        matchedWard = ghnWardsList.find((w) => matchGhnEntity(w, 'ward', tokens, fullUnaccent, fullDisplayName));
                                    }
                                    if (matchedWard && wardSelect) {
                                        wardSelect.value = String(matchedWard.WardCode);
                                        state.selectedWardCode = String(matchedWard.WardCode);
                                        await calculateGhnShippingFee();
                                    }
                                }
                            }
                        }
                    }
                    let streetCandidate = [addr.house_number, addr.road].filter(Boolean).join(' ');
                    if (!streetCandidate) {
                        const parts = fullDisplayName.split(',').map((s) => s.trim());
                        const specificParts = parts.filter((part) => {
                            if (!part)
                                return false;
                            const norm = normalizeLocationString(part);
                            if (!norm || norm === 'viet nam' || norm === 'vietnam' || /^\d{5,6}$/.test(norm))
                                return false;
                            if (matchedProvince && matchGhnEntity(matchedProvince, 'province', [part], stripAccentsOnly(part), part))
                                return false;
                            if (matchedDistrict && matchGhnEntity(matchedDistrict, 'district', [part], stripAccentsOnly(part), part))
                                return false;
                            if (matchedWard && matchGhnEntity(matchedWard, 'ward', [part], stripAccentsOnly(part), part))
                                return false;
                            return true;
                        });
                        if (specificParts.length > 0) {
                            streetCandidate = specificParts.slice(0, 2).join(', ');
                        }
                        else {
                            streetCandidate = '';
                        }
                    }
                    if (addressInput) {
                        addressInput.value = streetCandidate;
                        if (!streetCandidate) {
                            addressInput.placeholder = 'Nhập số nhà, ngõ/ngách, thôn xóm...';
                        }
                    }
                    if (state.user && matchedProvince) {
                        const addrToSave = {
                            name: nameInput?.value || state.user.name || '',
                            phone: phoneInput?.value || state.user.phone || '',
                            address: streetCandidate || addressInput?.value || '',
                            provinceId: matchedProvince.ProvinceID
                        };
                        if (matchedDistrict)
                            addrToSave.districtId = matchedDistrict.DistrictID;
                        if (matchedWard)
                            addrToSave.wardCode = matchedWard.WardCode;
                        localStorage.setItem(`novashop_saved_addr_${state.user.id}`, JSON.stringify(addrToSave));
                    }
                    if (matchedProvince && matchedDistrict && matchedWard) {
                        showToast('Định vị thành công', `Đã chọn: ${matchedWard.WardName}, ${matchedDistrict.DistrictName}, ${matchedProvince.ProvinceName}`, 'success');
                    }
                    else if (matchedProvince && matchedDistrict) {
                        showToast('Đã nhận diện Quận/Huyện', `Đã chọn: ${matchedDistrict.DistrictName}, ${matchedProvince.ProvinceName}. Vui lòng chọn Phường/Xã!`, 'info');
                        wardSelect?.focus();
                    }
                    else if (matchedProvince) {
                        showToast('Đã nhận diện Tỉnh/Thành', `Đã chọn: ${matchedProvince.ProvinceName}. Vui lòng chọn Quận/Huyện và Phường/Xã!`, 'info');
                        districtSelect?.focus();
                    }
                    else {
                        showToast('Thông báo', 'Không thể nhận diện tự động Tỉnh/Thành từ GPS. Vui lòng chọn thủ công trong danh sách.', 'warning');
                    }
                }
                catch {
                    showToast('Thông báo', 'Không thể xác định vị trí chi tiết từ GPS. Vui lòng chọn theo danh mục thủ công.', 'warning');
                }
                finally {
                    if (geoLocateBtnText) {
                        geoLocateBtnText.textContent = 'Vị trí của tôi (Định vị tự động)';
                    }
                    geoLocateBtn.removeAttribute('disabled');
                }
            }, (err) => {
                let msg = 'Không thể lấy vị trí hiện tại.';
                if (err.code === 1)
                    msg = 'Bạn đã từ chối quyền truy cập vị trí trên trình duyệt.';
                showToast('Định vị thất bại', msg, 'warning');
                if (geoLocateBtnText) {
                    geoLocateBtnText.textContent = 'Vị trí của tôi (Định vị tự động)';
                }
                geoLocateBtn.removeAttribute('disabled');
            }, { timeout: 10000, enableHighAccuracy: true });
        });
    }
    if (provinceSelect) {
        provinceSelect.addEventListener('change', () => {
            const pid = parseInt(provinceSelect.value, 10);
            if (pid) {
                state.selectedProvinceId = pid;
                state.selectedDistrictId = null;
                state.selectedWardCode = null;
                loadGhnDistricts(pid);
            }
            else {
                state.selectedProvinceId = null;
                state.selectedDistrictId = null;
                state.selectedWardCode = null;
                if (districtSelect) {
                    districtSelect.disabled = true;
                    districtSelect.innerHTML = `<option value="">-- Chọn Quận / Huyện --</option>`;
                }
                if (wardSelect) {
                    wardSelect.disabled = true;
                    wardSelect.innerHTML = `<option value="">-- Chọn Phường / Xã --</option>`;
                }
            }
            calculateGhnShippingFee();
        });
    }
    if (districtSelect) {
        districtSelect.addEventListener('change', () => {
            const did = parseInt(districtSelect.value, 10);
            if (did) {
                state.selectedDistrictId = did;
                state.selectedWardCode = null;
                loadGhnWards(did);
            }
            else {
                state.selectedDistrictId = null;
                state.selectedWardCode = null;
                if (wardSelect) {
                    wardSelect.disabled = true;
                    wardSelect.innerHTML = `<option value="">-- Chọn Phường / Xã --</option>`;
                }
            }
            calculateGhnShippingFee();
        });
    }
    if (wardSelect) {
        wardSelect.addEventListener('change', () => {
            state.selectedWardCode = wardSelect.value || null;
            calculateGhnShippingFee();
        });
    }
    if (btnGoToStep2) {
        btnGoToStep2.addEventListener('click', () => {
            if (!state.user) {
                showToast('Yêu cầu đăng nhập', 'Quý khách vui lòng đăng nhập tài khoản để đặt hàng', 'warning');
                navigate('/login');
                return;
            }
            if (state.cart.length === 0) {
                showToast('Thông báo', 'Giỏ hàng của bạn đang trống', 'warning');
                return;
            }
            switchCheckoutStep(2);
        });
    }
    if (btnBackToStep1) {
        btnBackToStep1.addEventListener('click', () => {
            switchCheckoutStep(1);
        });
    }
    if (btnGoToStep3) {
        btnGoToStep3.addEventListener('click', () => {
            const name = nameInput ? nameInput.value.trim() : '';
            const phone = phoneInput ? phoneInput.value.trim() : '';
            const street = addressInput ? addressInput.value.trim() : '';
            const provId = provinceSelect ? provinceSelect.value : '';
            const distId = districtSelect ? districtSelect.value : '';
            const ward = wardSelect ? wardSelect.value : '';
            if (!name) {
                showToast('Thiếu thông tin', 'Vui lòng nhập họ và tên người nhận', 'warning');
                nameInput?.focus();
                return;
            }
            if (!phone || phone.length < 9) {
                showToast('Thiếu thông tin', 'Vui lòng nhập số điện thoại hợp lệ (10 số)', 'warning');
                phoneInput?.focus();
                return;
            }
            if (!provId) {
                showToast('Thiếu thông tin', 'Vui lòng chọn Tỉnh / Thành phố', 'warning');
                provinceSelect?.focus();
                return;
            }
            if (!distId) {
                showToast('Thiếu thông tin', 'Vui lòng chọn Quận / Huyện', 'warning');
                districtSelect?.focus();
                return;
            }
            if (!ward) {
                showToast('Thiếu thông tin', 'Vui lòng chọn Phường / Xã', 'warning');
                wardSelect?.focus();
                return;
            }
            if (!street) {
                showToast('Thiếu thông tin', 'Vui lòng nhập địa chỉ cụ thể (số nhà, đường...)', 'warning');
                addressInput?.focus();
                return;
            }
            const pName = provinceSelect.options[provinceSelect.selectedIndex]?.text || '';
            const dName = districtSelect.options[districtSelect.selectedIndex]?.text || '';
            const wName = wardSelect.options[wardSelect.selectedIndex]?.text || '';
            if (step3AddressText) {
                step3AddressText.textContent = `${name} | ${phone} - ${street}, ${wName}, ${dName}, ${pName}`;
            }
            if (saveAddressCheckbox && saveAddressCheckbox.checked && state.user) {
                const addrData = {
                    name,
                    phone,
                    address: street,
                    provinceId: Number(provId),
                    districtId: Number(distId),
                    wardCode: String(ward),
                    provinceName: pName,
                    districtName: dName,
                    wardName: wName
                };
                localStorage.setItem(`novashop_saved_addr_${state.user.id}`, JSON.stringify(addrData));
            }
            calculateGhnShippingFee();
            switchCheckoutStep(3);
        });
    }
    if (btnBackToStep2) {
        btnBackToStep2.addEventListener('click', () => {
            switchCheckoutStep(2);
        });
    }
    if (btnEditAddressFromStep3) {
        btnEditAddressFromStep3.addEventListener('click', () => {
            switchCheckoutStep(2);
        });
    }
    if (stepTab1)
        stepTab1.addEventListener('click', () => switchCheckoutStep(1));
    if (stepTab2) {
        stepTab2.addEventListener('click', () => {
            if (!state.user) {
                showToast('Yêu cầu đăng nhập', 'Quý khách vui lòng đăng nhập tài khoản để đặt hàng', 'warning');
                navigate('/login');
                return;
            }
            switchCheckoutStep(2);
        });
    }
    if (stepTab3) {
        stepTab3.addEventListener('click', () => {
            if (state.selectedDistrictId && state.selectedWardCode && addressInput?.value.trim()) {
                switchCheckoutStep(3);
            }
        });
    }
    if (toggleVouchersBtn && voucherSuggestions) {
        toggleVouchersBtn.addEventListener('click', () => {
            const isHidden = voucherSuggestions.style.display === 'none';
            voucherSuggestions.style.display = isHidden ? 'flex' : 'none';
            toggleVouchersBtn.innerHTML = isHidden
                ? 'Thu gọn <i class="ri-arrow-up-s-line"></i>'
                : 'Danh sách voucher <i class="ri-arrow-down-s-line"></i>';
        });
    }
    if (applyVoucherBtn && voucherCodeInput) {
        applyVoucherBtn.addEventListener('click', async () => {
            const code = voucherCodeInput.value.trim().toUpperCase();
            if (!code) {
                showToast('Thông báo', 'Vui lòng nhập mã ưu đãi', 'warning');
                return;
            }
            const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
            try {
                const res = await fetch(`${API_BASE}/api/orders/vouchers/apply`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, orderTotal: subtotal })
                });
                const result = await res.json();
                if (result.success && result.data) {
                    state.appliedVoucher = {
                        code: result.data.voucher.code,
                        name: result.data.voucher.name,
                        discountAmount: result.data.discountAmount,
                        discountType: result.data.voucher.discountType,
                        discountValue: result.data.voucher.discountValue,
                        minOrderValue: result.data.voucher.minOrderValue,
                        maxDiscount: result.data.voucher.maxDiscount
                    };
                    showToast('Thành công', `Đã áp dụng mã: ${result.data.voucher.name}`, 'success');
                    renderCartItemsList();
                }
                else {
                    showToast('Không thể áp dụng', result.message || 'Mã ưu đãi không hợp lệ', 'error');
                }
            }
            catch {
                showToast('Lỗi', 'Không thể kết nối đến máy chủ kiểm tra voucher', 'error');
            }
        });
    }
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!state.user) {
                showToast('Yêu cầu đăng nhập', 'Quý khách vui lòng đăng nhập để đặt hàng', 'warning');
                navigate('/login');
                return;
            }
            if (state.cart.length === 0) {
                showToast('Thông báo', 'Giỏ hàng đang trống', 'warning');
                return;
            }
            const pName = provinceSelect ? provinceSelect.options[provinceSelect.selectedIndex]?.text : '';
            const dName = districtSelect ? districtSelect.options[districtSelect.selectedIndex]?.text : '';
            const wName = wardSelect ? wardSelect.options[wardSelect.selectedIndex]?.text : '';
            const street = addressInput ? addressInput.value.trim() : '';
            if (!nameInput?.value.trim() || !phoneInput?.value.trim() || !street || !state.selectedProvinceId || !state.selectedDistrictId || !state.selectedWardCode) {
                showToast('Thiếu thông tin', 'Vui lòng kiểm tra lại địa chỉ giao hàng ở bước 2', 'warning');
                switchCheckoutStep(2);
                return;
            }
            const fullAddress = [street, wName, dName, pName].filter(Boolean).join(', ');
            const orderData = {
                userId: state.user.id,
                customerName: nameInput.value.trim(),
                customerPhone: phoneInput.value.trim(),
                shippingAddress: fullAddress || street,
                paymentMethod: paymentSelect ? paymentSelect.value : 'cod',
                items: state.cart,
                voucherCode: state.appliedVoucher ? state.appliedVoucher.code : undefined,
                shippingFee: state.shippingFee,
                provinceId: state.selectedProvinceId,
                districtId: state.selectedDistrictId,
                wardCode: state.selectedWardCode
            };
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = `<span>Đang kết nối GHN & tạo đơn...</span> <i class="ri-loader-4-line ri-spin"></i>`;
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
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = `<span>Xác Nhận Đặt Hàng</span> <i class="ri-check-double-line"></i>`;
                if (result.success) {
                    if (saveAddressCheckbox && saveAddressCheckbox.checked && state.user) {
                        localStorage.setItem(`novashop_saved_addr_${state.user.id}`, JSON.stringify({
                            name: orderData.customerName,
                            phone: orderData.customerPhone,
                            address: street,
                            provinceId: orderData.provinceId,
                            districtId: orderData.districtId,
                            wardCode: orderData.wardCode,
                            provinceName: pName,
                            districtName: dName,
                            wardName: wName
                        }));
                    }
                    state.cart = [];
                    state.appliedVoucher = null;
                    saveCart();
                    if (orderData.paymentMethod === 'momo') {
                        if (result.momoPayment && result.momoPayment.payUrl) {
                            showToast('Chuyển hướng MoMo', 'Đang chuyển đến cổng thanh toán MoMo...', 'info');
                            setTimeout(() => {
                                window.location.href = result.momoPayment.payUrl;
                            }, 600);
                        }
                        else {
                            showToast('Thành công', `Đặt hàng thành công! Mã đơn: #${result.data.id}`, 'success');
                            setTimeout(() => {
                                navigate('/orders');
                            }, 1000);
                        }
                    }
                    else if (orderData.paymentMethod === 'sepay' && result.sepayPayment) {
                        showSepayModal(result.sepayPayment);
                    }
                    else {
                        const ghnCodeMsg = result.data.ghnOrderCode ? ` • Mã vận đơn GHN: ${result.data.ghnOrderCode}` : '';
                        showToast('Thành công', `Đặt hàng thành công! Mã đơn: #${result.data.id}${ghnCodeMsg}`, 'success');
                        setTimeout(() => {
                            navigate('/orders');
                        }, 1200);
                    }
                }
                else {
                    showToast('Lỗi đặt hàng', result.message || 'Không thể tạo đơn hàng', 'error');
                }
            }
            catch {
                showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ', 'error');
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = `<span>Xác Nhận Đặt Hàng</span> <i class="ri-check-double-line"></i>`;
            }
        });
    }
    if (state.checkoutStep && state.checkoutStep > 1) {
        switchCheckoutStep(state.checkoutStep);
    }
};
const loadAvailableVouchers = async () => {
    const suggEl = document.getElementById('voucherSuggestions');
    if (!suggEl)
        return;
    try {
        const res = await fetch(`${API_BASE}/api/orders/vouchers`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
            state.availableVouchers = data.data;
            suggEl.innerHTML = state.availableVouchers.map((v) => `
                <div class="voucher-ticket">
                    <div>
                        <div class="voucher-ticket-code">${v.code}</div>
                        <div class="voucher-ticket-desc">${v.description}</div>
                    </div>
                    <button type="button" class="btn btn-outline btn-sm voucher-ticket-btn" data-use-voucher="${v.code}">
                        Dùng ngay
                    </button>
                </div>
            `).join('');
            suggEl.querySelectorAll('[data-use-voucher]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const code = btn.getAttribute('data-use-voucher');
                    const codeInput = document.getElementById('voucherCodeInput');
                    const applyBtn = document.getElementById('applyVoucherBtn');
                    if (codeInput && code) {
                        codeInput.value = code;
                        if (applyBtn)
                            applyBtn.click();
                    }
                });
            });
        }
    }
    catch { }
};
const renderCartItemsList = () => {
    const emptyView = document.getElementById('emptyCartView');
    const activeView = document.getElementById('activeCartView');
    const itemsList = document.getElementById('cartItemsList');
    const headerCount = document.getElementById('cartHeaderCount');
    const summarySubtotal = document.getElementById('summarySubtotal');
    const summaryGrandTotal = document.getElementById('summaryGrandTotal');
    const summaryWeight = document.getElementById('summaryWeight');
    const cartStep1WeightBadge = document.getElementById('cartStep1WeightBadge');
    const step3GhnWeight = document.getElementById('step3GhnWeight');
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
        activeView.style.display = 'block';
    const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalWeight = state.cart.reduce((sum, item) => sum + (Number(item.weight) || 300) * item.quantity, 0);
    if (cartStep1WeightBadge)
        cartStep1WeightBadge.textContent = `${totalWeight} g`;
    if (summaryWeight)
        summaryWeight.textContent = `${totalWeight} g`;
    if (step3GhnWeight)
        step3GhnWeight.textContent = `${Math.max(100, totalWeight)} g`;
    let discount = 0;
    if (state.appliedVoucher) {
        if (state.appliedVoucher.minOrderValue && subtotal < state.appliedVoucher.minOrderValue) {
            state.appliedVoucher = null;
            showToast('Thông báo', 'Đơn hàng không còn đủ giá trị tối thiểu để áp dụng mã', 'warning');
        }
        else {
            if (state.appliedVoucher.discountType === 'percent' && state.appliedVoucher.discountValue) {
                discount = Math.round((subtotal * state.appliedVoucher.discountValue) / 100);
                if (state.appliedVoucher.maxDiscount && discount > state.appliedVoucher.maxDiscount) {
                    discount = state.appliedVoucher.maxDiscount;
                }
            }
            else {
                discount = state.appliedVoucher.discountAmount;
            }
            discount = Math.min(discount, subtotal);
            state.appliedVoucher.discountAmount = discount;
        }
    }
    const shippingFee = Number(state.shippingFee) || 0;
    const grandTotal = Math.max(0, subtotal - discount + shippingFee);
    if (headerCount)
        headerCount.textContent = `${totalCount} sản phẩm`;
    if (summarySubtotal)
        summarySubtotal.textContent = formatPrice(subtotal);
    const summaryShippingFee = document.getElementById('summaryShippingFee');
    if (summaryShippingFee) {
        summaryShippingFee.textContent = shippingFee > 0 ? formatPrice(shippingFee) : '0 đ';
    }
    const summaryLeadTime = document.getElementById('summaryLeadTime');
    const summaryLeadTimeRow = document.getElementById('summaryLeadTimeRow');
    if (summaryLeadTime && summaryLeadTimeRow) {
        if (state.shippingLeadTime) {
            summaryLeadTimeRow.style.display = 'flex';
            summaryLeadTime.textContent = state.shippingLeadTime;
        }
        else {
            summaryLeadTimeRow.style.display = 'none';
        }
    }
    const discountRow = document.getElementById('voucherDiscountRow');
    const voucherCodeLabel = document.getElementById('summaryVoucherCode');
    const voucherDiscountLabel = document.getElementById('summaryVoucherDiscount');
    const appliedContainer = document.getElementById('appliedVoucherContainer');
    if (discountRow && voucherCodeLabel && voucherDiscountLabel && appliedContainer) {
        if (state.appliedVoucher && discount > 0) {
            discountRow.style.display = 'flex';
            voucherCodeLabel.textContent = state.appliedVoucher.code;
            voucherDiscountLabel.textContent = `-${formatPrice(discount)}`;
            appliedContainer.innerHTML = `
                <div class="cart-applied-voucher-badge">
                    <span><i class="ri-checkbox-circle-fill"></i> Đã áp dụng: <strong>${state.appliedVoucher.code}</strong> (-${formatPrice(discount)})</span>
                    <button type="button" class="cart-remove-voucher-btn" id="removeVoucherBtn" title="Gỡ mã">
                        <i class="ri-close-line"></i>
                    </button>
                </div>
            `;
            const removeBtn = document.getElementById('removeVoucherBtn');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    state.appliedVoucher = null;
                    const codeInp = document.getElementById('voucherCodeInput');
                    if (codeInp)
                        codeInp.value = '';
                    showToast('Thông báo', 'Đã gỡ mã giảm giá', 'warning');
                    renderCartItemsList();
                });
            }
        }
        else {
            discountRow.style.display = 'none';
            appliedContainer.innerHTML = '';
        }
    }
    if (summaryGrandTotal)
        summaryGrandTotal.textContent = formatPrice(grandTotal);
    if (itemsList) {
        itemsList.innerHTML = state.cart.map((item, index) => `
            <div class="cart-item-row">
                <img src="${item.imageUrl}" alt="${item.name}" class="cart-row-img">
                <div class="cart-row-info">
                    <div class="cart-row-name">${item.name}</div>
                    ${item.variantName ? `<div class="cart-row-variant">Phân loại: ${item.variantName}</div>` : ''}
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Trọng lượng: ${(Number(item.weight) || 300)}g</div>
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
            btn.addEventListener('click', async () => {
                const action = btn.getAttribute('data-action');
                const idx = parseInt(btn.getAttribute('data-idx') || '0', 10);
                if (action === 'minus') {
                    state.cart[idx].quantity--;
                    if (state.cart[idx].quantity <= 0)
                        state.cart.splice(idx, 1);
                }
                else if (action === 'plus') {
                    state.cart[idx].quantity++;
                }
                else if (action === 'remove') {
                    state.cart.splice(idx, 1);
                    showToast('Giỏ hàng', 'Đã xóa sản phẩm khỏi giỏ hàng', 'warning');
                }
                saveCart();
                if (triggerGhnFeeCalculation) {
                    await triggerGhnFeeCalculation();
                }
                else {
                    renderCartItemsList();
                }
            });
        });
    }
    const step3ReviewEl = document.getElementById('step3OrderItemsReview');
    if (step3ReviewEl) {
        if (state.cart.length === 0) {
            step3ReviewEl.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 16px;">Giỏ hàng đang trống</div>`;
        }
        else {
            step3ReviewEl.innerHTML = state.cart.map((item) => `
                <div style="background: #ffffff; border: 1px solid var(--border-light); border-radius: 10px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; box-shadow: var(--shadow-sm);">
                    <div style="display: flex; align-items: center; gap: 12px; min-width: 220px; flex: 1;">
                        <img src="${item.imageUrl}" alt="${item.name}" style="width: 46px; height: 46px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border-light); flex-shrink: 0;">
                        <div style="flex: 1;">
                            <div style="font-weight: 700; font-size: 0.875rem; color: var(--text-main); line-height: 1.3; margin-bottom: 3px;">${item.name}</div>
                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                ${item.variantName ? `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 1px 7px; border-radius: 4px; background: #eff6ff; color: #2563eb; font-size: 0.75rem; font-weight: 600;"><i class="ri-price-tag-3-line"></i> ${item.variantName}</span>` : ''}
                                <span style="font-size: 0.8125rem; color: var(--text-muted);">${formatPrice(item.price)}</span>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 20px;">
                        <div style="font-size: 0.875rem; color: var(--text-muted); font-weight: 600;">
                            Số lượng: <strong style="color: var(--text-main);">x${item.quantity}</strong>
                        </div>
                        <div style="min-width: 90px; text-align: right;">
                            <strong style="color: var(--text-main); font-size: 0.95rem;">${formatPrice(item.price * item.quantity)}</strong>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }
};
const showMomoPaymentModal = (momoData, orderId, amount) => {
    const payUrl = momoData.payUrl || '';
    if (payUrl) {
        window.location.href = payUrl;
        return;
    }
    let modalEl = document.getElementById('momoPaymentModal');
    if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'momoPaymentModal';
        document.body.appendChild(modalEl);
    }
    modalEl.className = 'modal-overlay active';
    modalEl.style.cssText = 'position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 20px;';
    modalEl.innerHTML = `
        <div class="modal-card" style="max-width: 480px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
            <div style="background: linear-gradient(135deg, #a50064 0%, #d82d8b 100%); color: #ffffff; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 42px; height: 42px; border-radius: 10px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 22px;">
                        <i class="ri-wallet-3-fill"></i>
                    </div>
                    <div>
                        <div style="font-weight: 800; font-size: 1.125rem;">Thanh Toán Ví MoMo</div>
                        <div style="font-size: 0.8125rem; opacity: 0.95;">Đơn hàng #${orderId} • ${formatPrice(amount)}</div>
                    </div>
                </div>
                <button type="button" class="btn-icon close-momo-modal" style="color: #ffffff; font-size: 22px; cursor: pointer; background: transparent; border: none;">
                    <i class="ri-close-line"></i>
                </button>
            </div>
            <div style="padding: 24px;">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 18px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.875rem;">
                        <span style="color: var(--text-muted);">Mã đơn hàng:</span>
                        <strong style="color: var(--text-main);">#${orderId}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.875rem;">
                        <span style="color: var(--text-muted);">Tổng thanh toán:</span>
                        <strong style="color: #a50064; font-size: 1.05rem;">${formatPrice(amount)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.875rem;">
                        <span style="color: var(--text-muted);">Phương thức:</span>
                        <span style="font-weight: 600; color: #a50064;">Ví điện tử MoMo</span>
                    </div>
                </div>

                <div style="display: flex; gap: 10px;">
                    <button type="button" class="btn btn-outline close-momo-modal" style="flex: 1;">
                        Đóng lại
                    </button>
                    <button type="button" id="checkMomoStatusBtn" class="btn btn-secondary" style="flex: 1;">
                        Kiểm tra kết quả
                    </button>
                </div>
            </div>
        </div>
    `;
    const closeModal = () => {
        modalEl.style.display = 'none';
        modalEl.classList.remove('active');
        navigate('/orders');
    };
    modalEl.querySelectorAll('.close-momo-modal').forEach(b => {
        b.addEventListener('click', closeModal);
    });
    const checkBtn = document.getElementById('checkMomoStatusBtn');
    if (checkBtn) {
        checkBtn.addEventListener('click', async () => {
            checkBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Đang kiểm tra...`;
            try {
                const res = await fetch(`${API_BASE}/api/orders/${orderId}`);
                const data = await res.json();
                if (data.success && data.data && data.data.paymentStatus === 'paid') {
                    showToast('Thành công', 'Đơn hàng đã được thanh toán thành công qua MoMo!', 'success');
                    closeModal();
                }
                else {
                    showToast('Chưa thanh toán', 'Giao dịch MoMo chưa hoàn tất hoặc đang chờ xử lý', 'warning');
                    checkBtn.innerHTML = 'Kiểm tra kết quả';
                }
            }
            catch {
                showToast('Lỗi', 'Không thể kết nối đến máy chủ', 'error');
                checkBtn.innerHTML = 'Kiểm tra kết quả';
            }
        });
    }
};
let sepayPollingInterval = null;
const showSepayModal = (data) => {
    let modalEl = document.getElementById('sepayPaymentModal');
    if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'sepayPaymentModal';
        document.body.appendChild(modalEl);
    }
    modalEl.className = 'modal-overlay active';
    modalEl.style.cssText = 'position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 20px;';
    if (sepayPollingInterval)
        clearInterval(sepayPollingInterval);
    modalEl.innerHTML = `
        <div class="modal-card" style="max-width: 520px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
            <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; padding: 18px 24px; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 22px;">
                        <i class="ri-qr-code-line"></i>
                    </div>
                    <div>
                        <div style="font-weight: 800; font-size: 1.125rem;">Thanh Toán Chuyển Khoản VietQR</div>
                        <div style="font-size: 0.8125rem; opacity: 0.9;">Đơn hàng #${data.orderId}</div>
                    </div>
                </div>
                <button type="button" class="btn-icon close-sepay-modal" style="color: #ffffff; font-size: 22px; cursor: pointer; background: transparent; border: none;">
                    <i class="ri-close-line"></i>
                </button>
            </div>
            <div style="padding: 24px; text-align: center;">
                <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 12px;">
                    Quét mã QR bằng App ngân hàng bất kỳ để chuyển khoản tự động:
                </div>

                <div style="display: inline-block; padding: 12px; background: #ffffff; border: 2px solid #e2e8f0; border-radius: 14px; box-shadow: var(--shadow-sm); margin-bottom: 16px;">
                    <img src="${data.qrUrl}" alt="VietQR" style="width: 220px; height: 220px; object-fit: contain; display: block;">
                </div>

                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; text-align: left; font-size: 0.875rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <span style="color: var(--text-muted);">Ngân hàng:</span>
                        <strong style="color: var(--text-main);">${data.bankName} (${data.bankCode})</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="color: var(--text-muted);">Số tài khoản:</span>
                        <div>
                            <strong style="font-family: monospace; font-size: 0.95rem; color: #0284c7;">${data.accountNumber}</strong>
                            <button type="button" class="btn btn-sm btn-outline copy-text-btn" data-copy="${data.accountNumber}" style="padding: 0 6px; font-size: 0.7rem; margin-left: 4px;">Copy</button>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <span style="color: var(--text-muted);">Chủ tài khoản:</span>
                        <strong>${data.accountName}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <span style="color: var(--text-muted);">Số tiền:</span>
                        <strong style="color: #dc2626; font-size: 1.05rem;">${formatPrice(data.amount)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
                        <span style="color: var(--text-muted);">Nội dung chuyển khoản:</span>
                        <div>
                            <strong style="color: #059669; font-family: monospace; font-size: 0.95rem;">${data.transferContent}</strong>
                            <button type="button" class="btn btn-sm btn-outline copy-text-btn" data-copy="${data.transferContent}" style="padding: 0 6px; font-size: 0.7rem; margin-left: 4px;">Copy</button>
                        </div>
                    </div>
                </div>

                <div style="display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.8125rem; color: #0284c7; margin-bottom: 14px;">
                    <i class="ri-loader-4-line ri-spin" style="font-size: 1rem;"></i>
                    <span>Đang chờ hệ thống xác nhận thanh toán...</span>
                </div>

                <button type="button" id="simulateSepaySuccessBtn" class="btn btn-primary" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); border: none; font-weight: 700; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 10px;">
                    <i class="ri-checkbox-circle-line"></i> Xác Nhận Đã Chuyển Khoản (SePay Test)
                </button>

                <div>
                    <button type="button" class="btn btn-secondary close-sepay-modal" style="width: 100%;">
                        Đóng lại và xem danh sách đơn hàng
                    </button>
                </div>
            </div>
        </div>
    `;
    const closeModal = () => {
        if (sepayPollingInterval) {
            clearInterval(sepayPollingInterval);
            sepayPollingInterval = null;
        }
        modalEl.style.display = 'none';
        modalEl.classList.remove('active');
        navigate('/orders');
    };
    modalEl.querySelectorAll('.close-sepay-modal').forEach(b => {
        b.addEventListener('click', closeModal);
    });
    const simSepayBtn = document.getElementById('simulateSepaySuccessBtn');
    if (simSepayBtn) {
        simSepayBtn.addEventListener('click', async () => {
            simSepayBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Đang xác nhận thanh toán...`;
            try {
                const res = await fetch(`${API_BASE}/api/orders/${data.orderId}/sepay/simulate-success`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(state.token ? { Authorization: `Bearer ${state.token}` } : {})
                    }
                });
                const sData = await res.json();
                if (sData.success) {
                    showToast('Thanh toán thành công', `Đơn hàng #${data.orderId} đã được SePay xác nhận và kích hoạt GHN!`, 'success');
                    closeModal();
                }
                else {
                    showToast('Lỗi', sData.message || 'Không thể xác nhận thanh toán', 'error');
                    simSepayBtn.innerHTML = `<i class="ri-checkbox-circle-line"></i> Xác Nhận Đã Chuyển Khoản (SePay Test)`;
                }
            }
            catch {
                showToast('Lỗi', 'Không thể kết nối đến máy chủ', 'error');
                simSepayBtn.innerHTML = `<i class="ri-checkbox-circle-line"></i> Xác Nhận Đã Chuyển Khoản (SePay Test)`;
            }
        });
    }
    modalEl.querySelectorAll('.copy-text-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const text = btn.getAttribute('data-copy') || '';
            navigator.clipboard.writeText(text);
            showToast('Đã sao chép', text, 'success');
        });
    });
    sepayPollingInterval = setInterval(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/orders/${data.orderId}`);
            const resData = await res.json();
            if (resData.success && resData.data && resData.data.paymentStatus === 'paid') {
                clearInterval(sepayPollingInterval);
                sepayPollingInterval = null;
                showToast('Thanh toán thành công', `Đơn hàng #${data.orderId} đã được SePay ghi nhận thanh toán!`, 'success');
                setTimeout(closeModal, 1500);
            }
        }
        catch { }
    }, 3000);
};
const openSepayModalForOrder = async (orderId) => {
    try {
        const res = await fetch(`${API_BASE}/api/orders/${orderId}/sepay/info`);
        const data = await res.json();
        if (data.success && data.data) {
            showSepayModal(data.data);
        }
        else {
            showToast('Lỗi', data.message || 'Không thể lấy thông tin SePay', 'error');
        }
    }
    catch {
        showToast('Lỗi', 'Không thể kết nối đến máy chủ', 'error');
    }
};
const initOrdersView = async () => {
    const loadingEl = document.getElementById('ordersLoading');
    const emptyEl = document.getElementById('ordersEmpty');
    const listEl = document.getElementById('ordersList');
    const urlParams = new URLSearchParams(window.location.search);
    const momoResultCode = urlParams.get('momoResult') ?? urlParams.get('resultCode');
    if (momoResultCode !== null) {
        const orderId = urlParams.get('orderId') || urlParams.get('extraData');
        const msg = urlParams.get('message');
        if (momoResultCode === '0') {
            showToast('Thanh toán MoMo thành công', `Đơn hàng #${orderId || ''} đã được thanh toán và kích hoạt vận đơn GHN!`, 'success');
        }
        else if (momoResultCode === '1006') {
            showToast('Đã hủy giao dịch', `Bạn đã hủy thanh toán MoMo cho đơn hàng #${orderId || ''}.`, 'warning');
        }
        else {
            showToast('Thanh toán MoMo thất bại', msg || `Mã phản hồi MoMo: ${momoResultCode}`, 'error');
        }
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    try {
        let fetchedOrders = [];
        if (state.user && state.user.id) {
            try {
                const res = await fetch(`${API_BASE}/api/orders/user/${state.user.id}`, {
                    headers: {
                        ...(state.token ? { Authorization: `Bearer ${state.token}` } : {})
                    }
                });
                const data = await res.json();
                if (data.success && Array.isArray(data.data)) {
                    fetchedOrders = data.data;
                }
            }
            catch { }
        }
        if (fetchedOrders.length === 0) {
            try {
                const fallbackRes = await fetch(`${API_BASE}/api/orders`, {
                    headers: {
                        ...(state.token ? { Authorization: `Bearer ${state.token}` } : {})
                    }
                });
                const fallbackData = await fallbackRes.json();
                if (fallbackData.success && Array.isArray(fallbackData.data)) {
                    if (state.user && state.user.id) {
                        fetchedOrders = fallbackData.data.filter((o) => String(o.userId) === String(state.user.id));
                    }
                    else {
                        fetchedOrders = fallbackData.data;
                    }
                }
            }
            catch { }
        }
        if (loadingEl)
            loadingEl.style.display = 'none';
        let currentTab = 'all';
        let searchQuery = '';
        const bindOrderActions = () => {
            if (!listEl)
                return;
            listEl.querySelectorAll('.pay-momo-again-btn').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-id');
                    if (!id)
                        return;
                    btn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Chuyển hướng MoMo...`;
                    try {
                        const res = await fetch(`${API_BASE}/api/orders/${id}/momo/create`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' }
                        });
                        const result = await res.json();
                        if (result.success && result.data && result.data.payUrl) {
                            showToast('Chuyển hướng MoMo', 'Đang chuyển đến cổng thanh toán MoMo...', 'info');
                            setTimeout(() => {
                                window.location.href = result.data.payUrl;
                            }, 500);
                        }
                        else {
                            showToast('Lỗi', result.message || 'Không thể tạo cổng MoMo', 'error');
                            btn.innerHTML = `<i class="ri-wallet-3-line"></i> Thanh toán MoMo`;
                        }
                    }
                    catch {
                        showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ', 'error');
                        btn.innerHTML = `<i class="ri-wallet-3-line"></i> Thanh toán MoMo`;
                    }
                });
            });
            listEl.querySelectorAll('.pay-sepay-again-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    if (id)
                        openSepayModalForOrder(id);
                });
            });
            listEl.querySelectorAll('.cancel-order-btn').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-id');
                    if (confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?')) {
                        try {
                            const res = await fetch(`${API_BASE}/api/orders/${id}/status`, {
                                method: 'PATCH',
                                headers: {
                                    'Content-Type': 'application/json',
                                    ...(state.token ? { Authorization: `Bearer ${state.token}` } : {})
                                },
                                body: JSON.stringify({ status: 'cancelled' })
                            });
                            const result = await res.json();
                            if (result.success) {
                                showToast('Thành công', 'Đã hủy đơn hàng thành công', 'success');
                                initOrdersView();
                            }
                            else {
                                showToast('Lỗi', result.message || 'Không thể hủy đơn hàng', 'error');
                            }
                        }
                        catch {
                            showToast('Lỗi', 'Không thể kết nối đến máy chủ', 'error');
                        }
                    }
                });
            });
            listEl.querySelectorAll('.sync-ghn-btn').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-id');
                    if (!id)
                        return;
                    btn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Đồng bộ...`;
                    try {
                        const res = await fetch(`${API_BASE}/api/orders/${id}/ghn/sync`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                ...(state.token ? { Authorization: `Bearer ${state.token}` } : {})
                            }
                        });
                        const result = await res.json();
                        if (result.success) {
                            showToast('Thành công', result.message || 'Đã cập nhật trạng thái mới nhất từ GHN', 'success');
                            initOrdersView();
                        }
                        else {
                            showToast('Thông báo GHN', result.message || 'Không thể đồng bộ từ GHN', 'warning');
                            btn.innerHTML = `<i class="ri-refresh-line"></i> Đồng bộ GHN`;
                        }
                    }
                    catch {
                        showToast('Lỗi', 'Không thể kết nối đến máy chủ', 'error');
                        btn.innerHTML = `<i class="ri-refresh-line"></i> Đồng bộ GHN`;
                    }
                });
            });
        };
        const renderFilteredOrders = () => {
            const countAll = state.orders.length;
            const countPending = state.orders.filter(o => o.status === 'pending').length;
            const countProcessing = state.orders.filter(o => o.status === 'processing').length;
            const countCompleted = state.orders.filter(o => o.status === 'completed').length;
            const countCancelled = state.orders.filter(o => o.status === 'cancelled').length;
            const cAll = document.getElementById('tabCountAll');
            const cPending = document.getElementById('tabCountPending');
            const cProcessing = document.getElementById('tabCountProcessing');
            const cCompleted = document.getElementById('tabCountCompleted');
            const cCancelled = document.getElementById('tabCountCancelled');
            if (cAll)
                cAll.textContent = String(countAll);
            if (cPending)
                cPending.textContent = String(countPending);
            if (cProcessing)
                cProcessing.textContent = String(countProcessing);
            if (cCompleted)
                cCompleted.textContent = String(countCompleted);
            if (cCancelled)
                cCancelled.textContent = String(countCancelled);
            let list = state.orders;
            if (currentTab !== 'all') {
                list = list.filter(o => o.status === currentTab);
            }
            if (searchQuery.trim()) {
                const q = searchQuery.trim().toLowerCase();
                list = list.filter(o => {
                    const idMatch = String(o.id || '').toLowerCase().includes(q);
                    const ghnMatch = String(o.ghnOrderCode || '').toLowerCase().includes(q);
                    const itemsMatch = Array.isArray(o.items) && o.items.some((i) => String(i.name || '').toLowerCase().includes(q));
                    return idMatch || ghnMatch || itemsMatch;
                });
            }
            if (list.length > 0) {
                if (emptyEl)
                    emptyEl.style.display = 'none';
                if (listEl) {
                    listEl.style.display = 'flex';
                    listEl.style.flexDirection = 'column';
                    listEl.style.gap = '20px';
                    listEl.style.width = '100%';
                    listEl.innerHTML = list.map((order) => {
                        const items = Array.isArray(order.items) ? order.items : [];
                        const statusMap = {
                            completed: { label: 'Hoàn thành', class: 'status-completed' },
                            processing: { label: 'Đang xử lý / Vận chuyển', class: 'status-processing' },
                            pending: { label: 'Chờ xác nhận', class: 'status-pending' },
                            cancelled: { label: 'Đã hủy', class: 'status-cancelled' }
                        };
                        const statusInfo = statusMap[order.status] || { label: order.status, class: 'status-pending' };
                        const isPaid = order.paymentStatus === 'paid';
                        const paymentBadgeHtml = isPaid
                            ? `<span class="badge-paid"><i class="ri-checkbox-circle-fill"></i> Đã thanh toán</span>`
                            : `<span class="badge-unpaid"><i class="ri-time-line"></i> Chờ thanh toán</span>`;
                        const payMethodName = order.paymentMethod === 'momo'
                            ? 'MoMo'
                            : (order.paymentMethod === 'sepay' ? 'SePay (VietQR)' : (order.paymentMethod === 'banking' ? 'Chuyển khoản' : 'COD (GHN)'));
                        const payBadgeClass = order.paymentMethod === 'momo'
                            ? 'pay-badge-momo'
                            : (order.paymentMethod === 'sepay' ? 'pay-badge-sepay' : 'pay-badge-cod');
                        return `
                        <div class="order-card">
                            <div class="order-card-top">
                                <div class="order-id-group">
                                    <span class="order-id-text">#${order.id}</span>
                                    <span class="order-date-text">• ${formatDate(order.createdAt)}</span>
                                    <span class="${payBadgeClass}">${payMethodName}</span>
                                    ${paymentBadgeHtml}
                                </div>
                                <div class="order-status-badge ${statusInfo.class}">
                                    ${statusInfo.label}
                                </div>
                            </div>

                            <div class="order-items-list">
                                ${items.map((item) => `
                                    <div class="order-item-entry">
                                        <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;">
                                            <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'}" alt="${item.name}" class="order-item-thumb">
                                            <div class="order-item-meta">
                                                <div class="order-item-name">${item.name}</div>
                                                ${item.variantName ? `<div class="order-item-variant">Phân loại: ${item.variantName}</div>` : ''}
                                                <div class="order-item-price-qty">${formatPrice(item.price)} x ${item.quantity}</div>
                                            </div>
                                        </div>
                                        <div style="font-weight: 700; color: var(--text-main); font-size: 0.95rem; white-space: nowrap; margin-left: 16px;">
                                            ${formatPrice(item.price * item.quantity)}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>

                            <div class="order-card-bottom">
                                <div style="flex: 1; min-width: 280px;">
                                    <div style="font-size: 0.875rem; color: var(--text-muted); line-height: 1.5;">
                                        Người nhận: <strong style="color: var(--text-main);">${order.customerName}</strong> (${order.customerPhone})
                                    </div>
                                    <div style="font-size: 0.8125rem; color: var(--text-muted); margin-top: 3px; line-height: 1.4;">
                                        Địa chỉ: ${order.shippingAddress}
                                    </div>

                                    ${order.ghnOrderCode ? `
                                        <div class="ghn-track-box">
                                            <i class="ri-truck-fill" style="color: #0284c7;"></i>
                                            <span style="font-size: 0.8125rem; color: #0369a1; font-weight: 600;">Vận đơn GHN:</span>
                                            <a href="https://tracking.ghn.vn/?order_code=${order.ghnOrderCode}" target="_blank" style="font-weight: 700; color: #0284c7; text-decoration: underline;" title="Tra cứu trực tiếp trên GHN">
                                                ${order.ghnOrderCode} <i class="ri-external-link-line" style="font-size: 0.75rem;"></i>
                                            </a>
                                            ${order.ghnStatus ? `
                                                <span style="background: ${(GHN_STATUS_MAP[order.ghnStatus]?.bg || '#e0f2fe')}; color: ${(GHN_STATUS_MAP[order.ghnStatus]?.color || '#0284c7')}; border: 1px solid ${(GHN_STATUS_MAP[order.ghnStatus]?.color || '#0284c7')}; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                                                    <i class="${(GHN_STATUS_MAP[order.ghnStatus]?.icon || 'ri-radar-line')}"></i> ${(GHN_STATUS_MAP[order.ghnStatus]?.label || order.ghnStatus)}
                                                </span>
                                            ` : ''}
                                            <button type="button" class="btn btn-outline btn-sm sync-ghn-btn" data-id="${order.id}" style="padding: 2px 8px; font-size: 0.72rem; border-color: #0284c7; color: #0284c7; background: #ffffff;" title="Đồng bộ trạng thái trực tiếp từ GHN">
                                                <i class="ri-refresh-line"></i> Đồng bộ GHN
                                            </button>
                                            ${order.ghnExpectedDelivery ? `<span style="color: #64748b; font-size: 0.75rem;">(Dự kiến: ${formatDate(order.ghnExpectedDelivery)})</span>` : ''}
                                        </div>
                                    ` : ''}

                                    ${order.voucherCode ? `
                                        <div class="order-voucher-badge" style="margin-top: 6px;">
                                            <i class="ri-coupon-3-line"></i> Voucher: <strong>${order.voucherCode}</strong> ${order.discountAmount ? `(-${formatPrice(order.discountAmount)})` : ''}
                                        </div>
                                    ` : ''}
                                </div>
                                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: flex-end;">
                                    ${!isPaid && order.status !== 'cancelled' && order.paymentMethod === 'momo' ? `
                                        <button class="btn btn-sm btn-primary pay-momo-again-btn" data-id="${order.id}" data-amount="${order.totalAmount}" style="background: #a50064; border-color: #a50064; padding: 6px 12px;" type="button">
                                            <i class="ri-wallet-3-line"></i> Thanh toán MoMo
                                        </button>
                                    ` : ''}

                                    ${!isPaid && order.status !== 'cancelled' && order.paymentMethod === 'sepay' ? `
                                        <button class="btn btn-sm btn-primary pay-sepay-again-btn" data-id="${order.id}" style="background: #0284c7; border-color: #0284c7; padding: 6px 12px;" type="button">
                                            <i class="ri-qr-code-line"></i> Quét mã SePay
                                        </button>
                                    ` : ''}

                                    ${order.status === 'pending' ? `
                                        <button class="btn btn-outline btn-sm cancel-order-btn" data-id="${order.id}" style="color: #ef4444; border-color: #fecdd3; padding: 6px 12px;" type="button">
                                            <i class="ri-close-circle-line"></i> Hủy đơn
                                        </button>
                                    ` : ''}

                                    <div class="order-total-group">
                                        <span class="order-total-label">Tổng số tiền:</span>
                                        <span class="order-total-val">${formatPrice(order.totalAmount)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        `;
                    }).join('');
                    bindOrderActions();
                }
            }
            else {
                if (listEl)
                    listEl.style.display = 'none';
                if (emptyEl) {
                    emptyEl.style.display = 'block';
                    const titleEl = document.getElementById('ordersEmptyTitle');
                    const descEl = document.getElementById('ordersEmptyDesc');
                    const btnEl = document.getElementById('ordersEmptyBtn');
                    if (state.orders.length === 0) {
                        if (titleEl)
                            titleEl.textContent = 'Bạn chưa có đơn mua nào';
                        if (descEl)
                            descEl.textContent = 'Hãy đặt hàng ngay để trải nghiệm dịch vụ của NovaShop';
                        if (btnEl)
                            btnEl.style.display = 'inline-flex';
                    }
                    else {
                        const tabLabels = {
                            pending: 'Chờ xác nhận',
                            processing: 'Đang xử lý / Vận chuyển',
                            completed: 'Hoàn thành',
                            cancelled: 'Đã hủy'
                        };
                        const tabName = tabLabels[currentTab] || 'danh mục này';
                        if (titleEl)
                            titleEl.textContent = `Chưa có đơn hàng trong mục "${tabName}"`;
                        if (descEl)
                            descEl.textContent = searchQuery.trim()
                                ? `Không tìm thấy đơn hàng nào khớp với "${searchQuery.trim()}".`
                                : `Hiện tại bạn không có đơn hàng nào ở trạng thái này.`;
                        if (btnEl)
                            btnEl.style.display = 'none';
                    }
                }
            }
        };
        document.querySelectorAll('#orderTabsNav .order-tab-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#orderTabsNav .order-tab-btn').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                currentTab = btn.getAttribute('data-status') || 'all';
                renderFilteredOrders();
            });
        });
        const searchInput = document.getElementById('orderSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                searchQuery = searchInput.value;
                renderFilteredOrders();
            });
        }
        state.orders = fetchedOrders;
        renderFilteredOrders();
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
let otpTimerInterval = null;
const startOtpTimer = (seconds, badgeEl) => {
    if (otpTimerInterval) {
        clearInterval(otpTimerInterval);
    }
    let remaining = seconds;
    const updateDisplay = () => {
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        if (badgeEl) {
            badgeEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        if (remaining <= 0) {
            clearInterval(otpTimerInterval);
            if (badgeEl) {
                badgeEl.textContent = 'Đã hết hạn';
            }
        }
        remaining--;
    };
    updateDisplay();
    otpTimerInterval = setInterval(updateDisplay, 1000);
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
    const step1Panel = document.getElementById('registerStep1Panel');
    const step2Panel = document.getElementById('registerStep2Panel');
    const otpVerifyForm = document.getElementById('customerOtpVerifyForm');
    const otpInput = document.getElementById('regOtpInput');
    const verifyBtn = document.getElementById('verifyOtpSubmitBtn');
    const targetEmailEl = document.getElementById('otpTargetEmail');
    const countdownBadge = document.getElementById('otpCountdownBadge');
    const resendBtn = document.getElementById('resendOtpBtn');
    const backBtn = document.getElementById('backToStep1Btn');
    let registeredEmail = '';
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
            if (password.length < 6) {
                showToast('Mật khẩu quá ngắn', 'Mật khẩu phải có tối thiểu 6 ký tự', 'error');
                return;
            }
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span>Đang gửi mã OTP...</span> <i class="ri-loader-4-line ri-spin"></i>`;
            try {
                const res = await fetch(`${API_BASE}/api/auth/register-send-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, phone, address })
                });
                const result = await res.json();
                if (result.success) {
                    registeredEmail = email;
                    if (targetEmailEl)
                        targetEmailEl.textContent = email;
                    if (step1Panel)
                        step1Panel.style.display = 'none';
                    if (step2Panel)
                        step2Panel.style.display = 'flex';
                    startOtpTimer(300, countdownBadge);
                    if (otpInput) {
                        otpInput.value = '';
                        otpInput.focus();
                    }
                    showToast('Đã gửi mã OTP', result.message || `Mã xác thực đã được gửi tới email ${email}`, 'success');
                }
                else {
                    showToast('Không thể gửi mã', result.message || 'Lỗi khi gửi mã xác thực', 'error');
                }
            }
            catch {
                showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ xác thực', 'error');
            }
            finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<span>Gửi Mã Xác Thực OTP</span> <i class="ri-mail-send-line"></i>`;
            }
        });
    }
    if (otpVerifyForm && verifyBtn && otpInput) {
        otpVerifyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const otp = otpInput.value.trim();
            if (otp.length !== 6) {
                showToast('Mã OTP không hợp lệ', 'Mã xác thực phải bao gồm đúng 6 chữ số', 'error');
                return;
            }
            verifyBtn.disabled = true;
            verifyBtn.innerHTML = `<span>Đang kích hoạt...</span> <i class="ri-loader-4-line ri-spin"></i>`;
            try {
                const res = await fetch(`${API_BASE}/api/auth/register-verify-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: registeredEmail, otp })
                });
                const result = await res.json();
                if (result.success) {
                    if (otpTimerInterval)
                        clearInterval(otpTimerInterval);
                    state.token = result.data.token;
                    state.user = result.data.user;
                    localStorage.setItem('novashop_customer_token', result.data.token);
                    localStorage.setItem('novashop_customer_user', JSON.stringify(result.data.user));
                    showToast('Đăng ký thành công', 'Tài khoản của bạn đã được kích hoạt thành công! Đang chuyển hướng...', 'success');
                    setTimeout(() => {
                        navigate('/');
                    }, 1000);
                }
                else {
                    showToast('Xác thực thất bại', result.message || 'Mã OTP không chính xác hoặc đã hết hạn', 'error');
                    verifyBtn.disabled = false;
                    verifyBtn.innerHTML = `<span>Kích Hoạt Tài Khoản</span> <i class="ri-shield-check-line"></i>`;
                }
            }
            catch {
                showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ', 'error');
                verifyBtn.disabled = false;
                verifyBtn.innerHTML = `<span>Kích Hoạt Tài Khoản</span> <i class="ri-shield-check-line"></i>`;
            }
        });
    }
    if (resendBtn) {
        resendBtn.addEventListener('click', async () => {
            if (!registeredEmail)
                return;
            resendBtn.disabled = true;
            resendBtn.textContent = 'Đang gửi lại...';
            try {
                const res = await fetch(`${API_BASE}/api/auth/register-resend-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: registeredEmail })
                });
                const result = await res.json();
                if (result.success) {
                    startOtpTimer(300, countdownBadge);
                    if (otpInput) {
                        otpInput.value = '';
                        otpInput.focus();
                    }
                    showToast('Đã gửi lại OTP', result.message || 'Mã xác thực mới đã được gửi tới email của bạn', 'success');
                }
                else {
                    showToast('Gửi lại thất bại', result.message || 'Chưa thể gửi lại mã lúc này', 'error');
                }
            }
            catch {
                showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ', 'error');
            }
            finally {
                resendBtn.disabled = false;
                resendBtn.textContent = 'Gửi lại mã OTP';
            }
        });
    }
    if (backBtn && step1Panel && step2Panel) {
        backBtn.addEventListener('click', () => {
            if (otpTimerInterval)
                clearInterval(otpTimerInterval);
            step2Panel.style.display = 'none';
            step1Panel.style.display = 'block';
        });
    }
};
const initChatWidget = () => {
    const launcherBtn = document.getElementById('chatLauncherBtn');
    const chatWindow = document.getElementById('chatWidgetWindow');
    const closeBtn = document.getElementById('chatCloseBtn');
    const chatForm = document.getElementById('chatMessageForm');
    const chatInput = document.getElementById('chatInput');
    if (launcherBtn && chatWindow) {
        launcherBtn.addEventListener('click', () => {
            state.chatOpen = !state.chatOpen;
            if (state.chatOpen) {
                chatWindow.classList.add('active');
                renderChatMessages();
                if (!state.chatSessionId || state.chatSessionId === 'undefined') {
                    startChatSession();
                }
                else {
                    loadChatMessages();
                }
            }
            else {
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
                customerName: state.user?.name || 'Khách hàng',
                customerEmail: state.user?.email || ''
            })
        });
        const data = await res.json();
        if (data.success && data.data) {
            const sess = data.data.session || data.data;
            if (sess && sess.id) {
                state.chatSessionId = sess.id;
                state.chatSession = sess;
                state.chatMessages = data.data.messages || [];
                localStorage.setItem('novashop_chat_session', sess.id);
                renderChatMessages();
            }
        }
        else {
            renderChatMessages();
        }
    }
    catch {
        renderChatMessages();
    }
};
const loadChatMessages = async () => {
    if (!state.chatSessionId || state.chatSessionId === 'undefined') {
        state.chatSessionId = '';
        localStorage.removeItem('novashop_chat_session');
        await startChatSession();
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/api/chat/session/${state.chatSessionId}`);
        const data = await res.json();
        if (data.success && data.data && data.data.session) {
            state.chatSession = data.data.session;
            state.chatMessages = data.data.messages || [];
            renderChatMessages();
        }
        else {
            state.chatSessionId = '';
            localStorage.removeItem('novashop_chat_session');
            await startChatSession();
        }
    }
    catch {
        renderChatMessages();
    }
};
const sendChatMessage = async (text) => {
    if (!state.chatSessionId || state.chatSessionId === 'undefined') {
        await startChatSession();
    }
    if (!state.chatSessionId)
        return;
    const tempUserMsg = {
        id: `temp_${Date.now()}`,
        sessionId: state.chatSessionId,
        sender: 'user',
        message: text,
        createdAt: new Date().toISOString()
    };
    state.chatMessages.push(tempUserMsg);
    renderChatMessages();
    showChatTyping();
    try {
        const res = await fetch(`${API_BASE}/api/chat/session/${state.chatSessionId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: state.chatSessionId,
                message: text,
                sender: 'customer',
                senderName: state.user?.name || 'Khách hàng'
            })
        });
        const data = await res.json();
        removeChatTyping();
        if (data.success && data.data) {
            if (data.data.aiMessage) {
                const ai = data.data.aiMessage;
                state.chatMessages.push({
                    id: ai.id,
                    sessionId: state.chatSessionId,
                    sender: 'ai',
                    message: ai.message,
                    productRecommendations: ai.suggestedProducts || [],
                    createdAt: ai.createdAt
                });
            }
            else {
                await loadChatMessages();
            }
            renderChatMessages();
        }
        else {
            showToast('Thông báo', data.message || 'Không thể gửi tin nhắn', 'warning');
        }
    }
    catch {
        removeChatTyping();
        showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ hỗ trợ', 'error');
    }
};
const showChatTyping = () => {
    const container = document.getElementById('chatMessagesContainer');
    if (!container)
        return;
    removeChatTyping();
    const typingEl = document.createElement('div');
    typingEl.id = 'chatTypingIndicator';
    typingEl.className = 'chat-msg chat-msg-ai';
    typingEl.innerHTML = `
        <div class="chat-bubble chat-bubble-ai" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; font-size: 0.8125rem; color: var(--text-muted);">
            <i class="ri-loader-4-line" style="animation: spin 1s linear infinite;"></i>
            <span>Tư vấn viên đang soạn câu trả lời...</span>
        </div>
    `;
    container.appendChild(typingEl);
    container.scrollTop = container.scrollHeight;
};
const removeChatTyping = () => {
    const el = document.getElementById('chatTypingIndicator');
    if (el)
        el.remove();
};
const renderChatMessages = () => {
    const container = document.getElementById('chatMessagesContainer');
    if (!container)
        return;
    if (state.chatMessages.length === 0) {
        container.innerHTML = `
            <div class="chat-msg chat-msg-ai">
                <div class="chat-sender-name" style="font-size: 0.6875rem; color: var(--text-muted); margin-bottom: 3px; font-weight: 600;">Tư Vấn Viên</div>
                <div class="chat-bubble chat-bubble-ai">
                    Xin chào! Cảm ơn bạn đã ghé thăm NovaShop. Chúng tôi có thể hỗ trợ gì cho bạn hôm nay? (Thông tin sản phẩm, đơn hàng, bảo hành hoặc thời gian giao hàng)
                </div>
            </div>
        `;
        return;
    }
    container.innerHTML = state.chatMessages.map((msg) => {
        const isUser = msg.sender === 'user' || msg.sender === 'customer';
        const senderClass = isUser ? 'chat-msg-user' : 'chat-msg-ai';
        const bubbleClass = isUser ? 'chat-bubble-user' : 'chat-bubble-ai';
        const senderLabel = isUser ? 'Bạn' : 'Tư Vấn Viên';
        const rawRecs = msg.suggestedProducts || msg.productRecommendations || [];
        let prods = [];
        if (typeof rawRecs === 'string') {
            try {
                prods = JSON.parse(rawRecs);
            }
            catch { }
        }
        else if (Array.isArray(rawRecs)) {
            prods = rawRecs;
        }
        const recCards = (prods && prods.length > 0)
            ? `
            <div class="chat-recs-grid">
                ${prods.map((prod) => `
                    <div class="chat-rec-item" data-rec-id="${prod.id}">
                        <img src="${prod.imageUrl || ''}" alt="${escapeHtml(prod.name || '')}" class="chat-rec-thumb" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80'">
                        <div class="chat-rec-info">
                            <div class="chat-rec-name" title="${escapeHtml(prod.name || '')}">${escapeHtml(prod.name || '')}</div>
                            <div class="chat-rec-price">${formatPrice(prod.price || 0)}</div>
                        </div>
                        <span class="chat-rec-btn"><i class="ri-eye-line"></i> Xem</span>
                    </div>
                `).join('')}
            </div>
            `
            : '';
        return `
            <div class="chat-msg ${senderClass}">
                <div class="chat-sender-name" style="font-size: 0.6875rem; color: var(--text-muted); margin-bottom: 3px; font-weight: 600;">${senderLabel}</div>
                <div class="chat-bubble ${bubbleClass}">
                    ${escapeHtml(msg.message).trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
                </div>
                ${recCards}
            </div>
        `;
    }).join('');
    container.scrollTop = container.scrollHeight;
    container.querySelectorAll('.chat-rec-item').forEach((item) => {
        item.addEventListener('click', () => {
            const id = item.getAttribute('data-rec-id');
            const found = state.products.find(p => p.id.toString() === id?.toString());
            if (found)
                openProductDetail(found);
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
