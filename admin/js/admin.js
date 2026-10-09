"use strict";
let revenueTrendChart = null;
let paymentMethodsChart = null;
let orderStatusChart = null;
let currentStatsPeriod = 'days';
const GHN_STATUS_MAP = {
    ready_to_pick: { label: 'Chờ lấy hàng', color: '#0284c7', bg: '#e0f2fe' },
    picking: { label: 'Đang lấy hàng', color: '#0284c7', bg: '#e0f2fe' },
    cancel: { label: 'Đã hủy đơn GHN', color: '#ef4444', bg: '#fee2e2' },
    money_collect_picking: { label: 'Đang thu tiền người gửi', color: '#d97706', bg: '#fef3c7' },
    picked: { label: 'Đã lấy hàng', color: '#2563eb', bg: '#dbeafe' },
    storing: { label: 'Hàng tại kho GHN', color: '#4f46e5', bg: '#e0e7ff' },
    transporting: { label: 'Đang luân chuyển hàng', color: '#7c3aed', bg: '#ede9fe' },
    sorting: { label: 'Đang phân loại bưu gửi', color: '#7c3aed', bg: '#ede9fe' },
    delivering: { label: 'Đang giao hàng', color: '#ea580c', bg: '#ffedd5' },
    money_collect_delivering: { label: 'Đang thu tiền người nhận', color: '#ea580c', bg: '#ffedd5' },
    delivered: { label: 'Giao hàng thành công', color: '#16a34a', bg: '#dcfce7' },
    delivery_fail: { label: 'Giao hàng thất bại', color: '#dc2626', bg: '#fee2e2' },
    waiting_to_return: { label: 'Chờ xác nhận chuyển hoàn', color: '#b45309', bg: '#fef3c7' },
    return: { label: 'Chuyển hoàn', color: '#b45309', bg: '#fef3c7' },
    return_transporting: { label: 'Luân chuyển hàng hoàn', color: '#b45309', bg: '#fef3c7' },
    return_sorting: { label: 'Phân loại hàng hoàn', color: '#b45309', bg: '#fef3c7' },
    returning: { label: 'Đang trả lại người gửi', color: '#b45309', bg: '#fef3c7' },
    return_fail: { label: 'Trả lại thất bại', color: '#b91c1c', bg: '#fee2e2' },
    returned: { label: 'Đã hoàn trả thành công', color: '#475569', bg: '#f1f5f9' },
    exception: { label: 'Đơn hàng ngoại lệ', color: '#dc2626', bg: '#fee2e2' },
    damage: { label: 'Hàng hóa bị hư hỏng', color: '#dc2626', bg: '#fee2e2' },
    lost: { label: 'Hàng hóa bị thất lạc', color: '#dc2626', bg: '#fee2e2' }
};
const API_BASE = window.location.origin;
const state = {
    currentRoute: window.location.pathname || '/admin',
    orders: [],
    products: [],
    users: [],
    categories: [],
    vouchers: [],
    reviews: [],
    reviewRatingFilter: '',
    reviewReplyStatusFilter: '',
    reviewKeyword: '',
    stats: null,
    adminUser: (() => {
        try {
            const rawUser = localStorage.getItem('novashop_admin_user');
            if (!rawUser)
                return null;
            const parsed = JSON.parse(rawUser);
            if (parsed && parsed.role !== 'admin') {
                localStorage.removeItem('novashop_admin_user');
                localStorage.removeItem('novashop_admin_token');
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
            const rawUser = localStorage.getItem('novashop_admin_user');
            if (rawUser) {
                const parsed = JSON.parse(rawUser);
                if (parsed && parsed.role !== 'admin') {
                    return '';
                }
            }
            return localStorage.getItem('novashop_admin_token') || '';
        }
        catch {
            return '';
        }
    })(),
    chatSessions: [],
    selectedSessionId: null,
    selectedSession: null,
    selectedMessages: [],
    chatFilter: 'all',
    chatPollingInterval: null
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
const renderAdminLoginView = () => {
    return `
  <div class="admin-login-body">
    <div class="admin-login-wrapper">
      <div class="admin-login-card">
        <div class="admin-login-header">
          <div class="admin-login-icon">
            <i class="ri-shield-user-fill"></i>
          </div>
          <h1 class="admin-login-title">Cổng Quản Trị Hệ Thống</h1>
          <p class="admin-login-subtitle">Vui lòng đăng nhập bằng tài khoản Quản Trị Viên (Admin)</p>
        </div>

        <form id="adminLoginForm">
          <div class="admin-input-group">
            <label class="admin-input-label" for="adminUsername">Tài khoản quản trị</label>
            <input type="text" id="adminUsername" class="admin-input-field" placeholder="Tên tài khoản admin" required autofocus>
          </div>

          <div class="admin-input-group">
            <label class="admin-input-label" for="adminPassword">Mật khẩu</label>
            <input type="password" id="adminPassword" class="admin-input-field" placeholder="••••••••" required>
          </div>

          <button type="submit" class="admin-btn-submit" id="adminLoginBtn">
            <span>Xác Thực & Đăng Nhập</span>
          </button>
        </form>

        <a href="/" class="admin-back-link">
          <i class="ri-arrow-left-line"></i>
          <span>Quay lại trang mua sắm NovaShop</span>
        </a>
      </div>
    </div>
  </div>
  `;
};
const renderAdminDashboardView = () => {
    return `
  <div class="admin-layout">
    <aside class="admin-sidebar">
      <div class="admin-brand">
        <div class="brand-icon">
          <i class="ri-shield-keyhole-fill"></i>
        </div>
        <div>
          <div>NovaAdmin</div>
          <div style="font-size: 0.6875rem; color: #64748b; font-weight: 500;">Hệ Thống Quản Trị</div>
        </div>
      </div>

      <nav class="admin-nav">
        <div class="admin-nav-item active" data-tab="statsTab">
          <i class="ri-line-chart-fill"></i>
          <span>Thống Kê Doanh Thu</span>
        </div>
        <div class="admin-nav-item" data-tab="ordersTab">
          <i class="ri-shopping-cart-2-fill"></i>
          <span>Quản Lý Đơn Hàng</span>
        </div>
        <div class="admin-nav-item" data-tab="productsTab">
          <i class="ri-store-2-fill"></i>
          <span>Quản Lý Sản Phẩm</span>
        </div>
        <div class="admin-nav-item" data-tab="categoriesTab">
          <i class="ri-folders-fill"></i>
          <span>Quản Lý Danh Mục</span>
        </div>
        <div class="admin-nav-item" data-tab="vouchersTab">
          <i class="ri-ticket-2-fill"></i>
          <span>Mã Giảm Giá / Voucher</span>
        </div>
        <div class="admin-nav-item" data-tab="reviewsTab">
          <i class="ri-star-smile-fill"></i>
          <span>Đánh Giá Khách Hàng</span>
          <span id="adminReviewsPendingBadge" class="nav-chat-badge" style="background: #f59e0b; display: none;">0</span>
        </div>
        <div class="admin-nav-item" data-tab="usersTab">
          <i class="ri-group-fill"></i>
          <span>Người Dùng & Phân Quyền</span>
        </div>
        <div class="admin-nav-item" data-tab="chatTab">
          <i class="ri-customer-service-2-fill"></i>
          <span>Live Chat & CSKH</span>
          <span id="adminChatUnreadBadge" class="nav-chat-badge" style="display: none;">0</span>
        </div>
        <div class="admin-nav-item" data-tab="systemTab">
          <i class="ri-server-fill"></i>
          <span>Trạng Thái Hệ Thống</span>
        </div>
      </nav>

      <div class="admin-sidebar-footer">
        <button id="sidebarLogoutBtn" class="btn btn-outline btn-sm" style="width: 100%; border-color: #334155; color: #f87171;" type="button">
          <i class="ri-logout-box-r-line"></i>
          <span>Đăng Xuất Admin</span>
        </button>
      </div>
    </aside>

    <div class="admin-main">
      <header class="admin-header">
        <div class="admin-page-title" id="adminHeaderTitle">Báo Cáo & Thống Kê Doanh Thu Toàn Diện</div>
        <div class="admin-header-actions">
          <button id="refreshDataBtn" class="btn btn-outline btn-sm" type="button">
            <i class="ri-refresh-line"></i>
            <span>Làm Mới</span>
          </button>
          <div class="user-avatar-circle" style="background: var(--primary);">
            <i class="ri-admin-line"></i>
          </div>
        </div>
      </header>

      <div class="admin-content">
        <div class="kpi-grid">
          <div class="kpi-card">
            <div>
              <div class="kpi-title">Doanh Thu Đã Thu</div>
              <div id="kpiRevenue" class="kpi-value">0 đ</div>
            </div>
            <div class="kpi-icon-box trust-box-2">
              <i class="ri-money-dollar-circle-line"></i>
            </div>
          </div>

          <div class="kpi-card">
            <div>
              <div class="kpi-title">Tổng Số Đơn Hàng</div>
              <div id="kpiOrders" class="kpi-value">0</div>
            </div>
            <div class="kpi-icon-box trust-box-1">
              <i class="ri-shopping-bag-3-line"></i>
            </div>
          </div>

          <div class="kpi-card">
            <div>
              <div class="kpi-title">Số Sản Phẩm</div>
              <div id="kpiProducts" class="kpi-value">0</div>
            </div>
            <div class="kpi-icon-box trust-box-3">
              <i class="ri-box-3-line"></i>
            </div>
          </div>

          <div class="kpi-card">
            <div>
              <div class="kpi-title">Tài Khoản Đăng Ký</div>
              <div id="kpiUsers" class="kpi-value">0</div>
            </div>
            <div class="kpi-icon-box trust-box-4">
              <i class="ri-user-star-line"></i>
            </div>
          </div>
        </div>

        <section id="statsTab" class="tab-view active">
          <!-- Summary Quick Cards -->
          <div class="stats-summary-grid">
            <div class="stats-card stats-accent-blue">
              <div class="stats-card-icon"><i class="ri-money-dollar-circle-fill"></i></div>
              <div class="stats-card-info">
                <span class="stats-card-label">Doanh Thu Hôm Nay</span>
                <span class="stats-card-val" id="statsTodayRevenue">0 đ</span>
                <span class="stats-card-sub" id="statsTodayOrders">0 đơn hàng mới</span>
              </div>
            </div>

            <div class="stats-card stats-accent-green">
              <div class="stats-card-icon"><i class="ri-wallet-3-fill"></i></div>
              <div class="stats-card-info">
                <span class="stats-card-label">Doanh Thu Đã Thu (Hoàn tất)</span>
                <span class="stats-card-val" id="statsTotalCompletedRev">0 đ</span>
                <span class="stats-card-sub" id="statsCompletedOrdersCount">0 đơn hoàn thành</span>
              </div>
            </div>

            <div class="stats-card stats-accent-orange">
              <div class="stats-card-icon"><i class="ri-time-fill"></i></div>
              <div class="stats-card-info">
                <span class="stats-card-label">Đang Chờ Xử Lý / Giao</span>
                <span class="stats-card-val" id="statsPendingProcessingCount">0 đơn</span>
                <span class="stats-card-sub" id="statsPendingVal">Cần giao ngay</span>
              </div>
            </div>

            <div class="stats-card stats-accent-purple">
              <div class="stats-card-icon"><i class="ri-pie-chart-fill"></i></div>
              <div class="stats-card-info">
                <span class="stats-card-label">Tỷ Lệ Hoàn Thành</span>
                <span class="stats-card-val" id="statsSuccessRate">0%</span>
                <span class="stats-card-sub" id="statsCancelRate">0% huỷ đơn</span>
              </div>
            </div>
          </div>

          <!-- Main Chart: Doanh thu theo thời gian -->
          <div class="card-panel" style="margin-top: 20px;">
            <div class="panel-header" style="flex-wrap: wrap; gap: 12px;">
              <div>
                <div class="panel-title"><i class="ri-line-chart-line" style="color: var(--primary);"></i> Biểu Đồ Tăng Trưởng Doanh Thu</div>
                <div style="font-size: 0.8125rem; color: var(--text-muted); margin-top: 2px;">Theo dõi tiến độ doanh số và lượng đơn đặt theo chu kỳ</div>
              </div>
              <div class="panel-actions" style="display: flex; gap: 8px;">
                <button type="button" class="btn btn-sm btn-primary" id="btnStatsRangeDays"><i class="ri-calendar-2-line"></i> 30 Ngày Gần Nhất</button>
                <button type="button" class="btn btn-sm btn-outline" id="btnStatsRangeMonths"><i class="ri-calendar-line"></i> 12 Tháng Qua</button>
              </div>
            </div>
            <div style="padding: 20px; position: relative; height: 350px;">
              <canvas id="revenueTrendChart"></canvas>
            </div>
          </div>

          <!-- Secondary Charts Grid: Phương thức thanh toán + Phân bố trạng thái đơn -->
          <div class="stats-charts-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
            <div class="card-panel">
              <div class="panel-header">
                <div class="panel-title"><i class="ri-bank-card-line" style="color: #0284c7;"></i> Phương Thức Thanh Toán</div>
              </div>
              <div style="padding: 20px; position: relative; height: 280px; display: flex; align-items: center; justify-content: center;">
                <canvas id="paymentMethodsChart"></canvas>
              </div>
            </div>

            <div class="card-panel">
              <div class="panel-header">
                <div class="panel-title"><i class="ri-donut-chart-fill" style="color: #8b5cf6;"></i> Phân Bố Trạng Thái Đơn Hàng</div>
              </div>
              <div style="padding: 20px; position: relative; height: 280px; display: flex; align-items: center; justify-content: center;">
                <canvas id="orderStatusDistributionChart"></canvas>
              </div>
            </div>
          </div>

          <!-- Top 10 Best Selling Products Table & Bar Chart -->
          <div class="card-panel" style="margin-top: 20px;">
            <div class="panel-header">
              <div>
                <div class="panel-title"><i class="ri-trophy-line" style="color: #f59e0b;"></i> Top 10 Sản Phẩm Bán Chạy Nhất</div>
                <div style="font-size: 0.8125rem; color: var(--text-muted); margin-top: 2px;">Xếp hạng sản phẩm theo số lượng tiêu thụ và doanh thu phát sinh</div>
              </div>
            </div>
            <div class="data-table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width: 70px; text-align: center;">Hạng</th>
                    <th>Tên Sản Phẩm</th>
                    <th style="text-align: right;">Số Lượng Đã Bán</th>
                    <th style="text-align: right;">Doanh Thu Đóng Góp</th>
                    <th style="width: 200px;">Tỷ Trọng Doanh Số</th>
                  </tr>
                </thead>
                <tbody id="topProductsTableBody">
                  <tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">Đang tải dữ liệu thống kê...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="ordersTab" class="tab-view" style="display: none;">
          <div class="card-panel">
            <div class="panel-header">
              <div class="panel-title">Danh Sách Đơn Hàng</div>
              <div class="panel-actions">
                <select id="filterOrderStatus" class="form-select" style="width: 180px;">
                  <option value="">Tất cả trạng thái</option>
                  <option value="pending">Chờ xử lý</option>
                  <option value="processing">Đang đóng gói/giao</option>
                  <option value="completed">Đã hoàn tất</option>
                  <option value="cancelled">Đã huỷ</option>
                </select>
              </div>
            </div>
            <div class="data-table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Khách hàng</th>
                    <th>Điện thoại</th>
                    <th>Tổng tiền</th>
                    <th>Thanh toán</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody id="ordersTableBody"></tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="productsTab" class="tab-view" style="display: none;">
          <div class="card-panel">
            <div class="panel-header">
              <div class="panel-title">Kho Hàng & Sản Phẩm</div>
              <div class="panel-actions">
                <button id="openAddProductModalBtn" class="btn btn-primary btn-sm" type="button">
                  <i class="ri-add-line"></i>
                  <span>Thêm Sản Phẩm Mới</span>
                </button>
              </div>
            </div>
            <div class="data-table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Danh mục</th>
                    <th>Giá bán</th>
                    <th>Tồn kho</th>
                    <th>Đã bán</th>
                    <th>Đánh giá</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody id="productsTableBody"></tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="categoriesTab" class="tab-view" style="display: none;">
          <div class="card-panel">
            <div class="panel-header">
              <div class="panel-title">
                <i class="ri-folders-fill" style="color: var(--primary);"></i> Quản Lý Danh Mục Sản Phẩm
              </div>
              <div class="panel-actions">
                <button id="openAddCategoryModalBtn" class="btn btn-primary btn-sm" type="button">
                  <i class="ri-add-line"></i>
                  <span>Thêm Danh Mục Mới</span>
                </button>
              </div>
            </div>
            <div class="data-table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Icon</th>
                    <th>Mã định danh (ID)</th>
                    <th>Tên danh mục</th>
                    <th>Số sản phẩm</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody id="categoriesTableBody"></tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="vouchersTab" class="tab-view" style="display: none;">
          <div class="card-panel">
            <div class="panel-header">
              <div class="panel-title">
                <i class="ri-ticket-2-fill" style="color: #ea580c;"></i> Quản Lý Mã Giảm Giá & Khuyến Mãi
              </div>
              <div class="panel-actions">
                <button id="openAddVoucherModalBtn" class="btn btn-primary btn-sm" type="button">
                  <i class="ri-add-line"></i>
                  <span>Tạo Mã Voucher Mới</span>
                </button>
              </div>
            </div>
            <div class="data-table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Mã Code</th>
                    <th>Tên chương trình</th>
                    <th>Loại & Mức giảm</th>
                    <th>Đơn tối thiểu</th>
                    <th>Giảm tối đa</th>
                    <th>Lượt dùng</th>
                    <th>Hạn dùng</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody id="vouchersTableBody"></tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="usersTab" class="tab-view" style="display: none;">
          <div class="card-panel">
            <div class="panel-header">
              <div class="panel-title">Tài Khoản Người Dùng</div>
            </div>
            <div class="data-table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Mã người dùng</th>
                    <th>Họ và tên</th>
                    <th>Tài khoản / Email</th>
                    <th>Vai trò</th>
                    <th>Số điện thoại</th>
                    <th>Địa chỉ</th>
                    <th>Ngày tạo</th>
                  </tr>
                </thead>
                <tbody id="usersTableBody"></tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="chatTab" class="tab-view" style="display: none;">
          <div class="chat-admin-grid">
            <div class="card-panel chat-sessions-panel">
              <div class="panel-header" style="padding: 16px 20px;">
                <div class="panel-title" style="font-size: 1rem; display: flex; align-items: center; gap: 8px;">
                  <i class="ri-chat-smile-2-line" style="color: var(--primary);"></i>
                  <span>Hội Thoại Khách Hàng</span>
                </div>
                <div class="panel-actions">
                  <button id="refreshChatSessionsBtn" class="btn btn-outline btn-sm" title="Làm mới danh sách" type="button">
                    <i class="ri-refresh-line"></i>
                  </button>
                </div>
              </div>

              <div class="chat-sessions-filter">
                <select id="filterChatStatus" class="form-select" style="font-size: 0.8125rem; padding: 6px 10px;">
                  <option value="all">Tất cả phiên chat</option>
                  <option value="human_waiting">⚠️ Cần nhân viên hỗ trợ</option>
                  <option value="human_active">💬 Đang trao đổi với CSKH</option>
                  <option value="ai">🤖 Trợ lý AI đang tư vấn</option>
                  <option value="closed">🔒 Phiên đã đóng</option>
                </select>
              </div>

              <div id="adminChatSessionsList" class="chat-sessions-list">
                <div class="empty-state" style="padding: 24px;">
                  <i class="ri-loader-4-line ri-spin" style="font-size: 1.5rem; color: var(--primary);"></i>
                  <div style="font-size: 0.8125rem; margin-top: 8px;">Đang tải danh sách...</div>
                </div>
              </div>
            </div>

            <div class="card-panel chat-conversation-panel">
              <div id="chatConversationEmpty" class="empty-state" style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px;">
                <i class="ri-chat-voice-line" style="font-size: 3rem; color: #94a3b8; margin-bottom: 12px;"></i>
                <div style="font-weight: 600; color: var(--text-main); font-size: 1.0625rem;">Chọn một cuộc trò chuyện để hỗ trợ</div>
                <div style="font-size: 0.8125rem; color: var(--text-muted); margin-top: 4px;">Xem lịch sử trò chuyện AI và trả lời khách hàng trong thời gian thực.</div>
              </div>

              <div id="chatConversationActive" style="display: none; height: 100%; flex-direction: column;">
                <div class="chat-conv-header">
                  <div class="chat-conv-user">
                    <div class="user-avatar-circle" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);">
                      <i class="ri-user-line"></i>
                    </div>
                    <div>
                      <div id="activeCustomerName" style="font-weight: 700; color: var(--text-main); font-size: 0.9375rem;">Khách hàng</div>
                      <div id="activeCustomerEmail" style="font-size: 0.75rem; color: var(--text-muted);">Mã phiên: ...</div>
                    </div>
                  </div>

                  <div class="chat-conv-actions">
                    <span id="activeSessionStatusBadge" class="session-status-pill pill-ai">Đang tải...</span>
                    <button id="adminSwitchToAiBtn" class="btn btn-outline btn-sm" title="Chuyển lại cho Trợ lý Gemini AI" type="button">
                      <i class="ri-robot-2-line"></i>
                      <span>Chuyển AI</span>
                    </button>
                    <button id="adminCloseSessionBtn" class="btn btn-outline btn-sm" style="color: var(--accent); border-color: #fecdd3;" title="Đóng phiên" type="button">
                      <i class="ri-checkbox-circle-line"></i>
                      <span>Đóng phiên</span>
                    </button>
                  </div>
                </div>

                <div id="adminChatMessagesContainer" class="admin-chat-messages"></div>

                <div class="admin-chat-reply-box">
                  <form id="adminReplyForm" style="display: flex; gap: 10px; align-items: center;">
                    <input type="text" id="adminReplyInput" class="form-input" placeholder="Nhập câu trả lời để gửi tới khách hàng..." autocomplete="off" required>
                    <button type="submit" class="btn btn-primary" style="white-space: nowrap;">
                      <i class="ri-send-plane-fill"></i>
                      <span>Gửi phản hồi</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="reviewsTab" class="tab-view" style="display: none;">
          <!-- Thống kê đánh giá -->
          <div class="kpi-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 24px;">
            <div class="kpi-card">
              <div class="kpi-title">Tổng Lượt Đánh Giá</div>
              <div class="kpi-value" id="kpiTotalReviews">0</div>
              <div class="kpi-trend up"><i class="ri-chat-smile-2-line"></i> Toàn bộ nhận xét</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Điểm TB Toàn Sàn</div>
              <div class="kpi-value" id="kpiAvgRating" style="color: #f59e0b;">5.0 ⭐</div>
              <div class="kpi-trend up"><i class="ri-star-fill"></i> Chất lượng hài lòng</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Đánh Giá 5 Sao</div>
              <div class="kpi-value" id="kpi5StarReviews" style="color: #10b981;">0</div>
              <div class="kpi-trend up"><i class="ri-thumb-up-line"></i> Khách hàng yêu thích</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Chờ Shop Phản Hồi</div>
              <div class="kpi-value" id="kpiPendingReplyReviews" style="color: #ef4444;">0</div>
              <div class="kpi-trend down"><i class="ri-reply-line"></i> Cần trả lời</div>
            </div>
          </div>

          <div class="card-panel">
            <div class="panel-header" style="flex-wrap: wrap; gap: 12px;">
              <div class="panel-title">
                <i class="ri-star-smile-fill" style="color: #f59e0b;"></i> Quản Lý Nhận Xét & Phản Hồi Khách Hàng
              </div>
              <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <input type="text" id="reviewSearchKeyword" class="form-input form-input-sm" placeholder="Tìm theo tên khách, sản phẩm, nội dung..." style="width: 260px;">
                <select id="reviewRatingFilter" class="form-select form-select-sm" style="width: 140px;">
                  <option value="">Tất cả số sao</option>
                  <option value="5">5 Sao ⭐⭐⭐⭐⭐</option>
                  <option value="4">4 Sao ⭐⭐⭐⭐</option>
                  <option value="3">3 Sao ⭐⭐⭐</option>
                  <option value="2">2 Sao ⭐⭐</option>
                  <option value="1">1 Sao ⭐</option>
                </select>
                <select id="reviewReplyStatusFilter" class="form-select form-select-sm" style="width: 150px;">
                  <option value="">Tất cả trạng thái</option>
                  <option value="pending">Chưa phản hồi</option>
                  <option value="replied">Đã phản hồi</option>
                </select>
                <button type="button" id="refreshReviewsBtn" class="btn btn-outline btn-sm">
                  <i class="ri-refresh-line"></i> Làm Mới
                </button>
              </div>
            </div>

            <div style="padding: 20px;">
              <div id="reviewsListContainer" style="display: flex; flex-direction: column; gap: 16px;">
                <div style="text-align: center; padding: 30px; color: var(--text-muted);">
                  <i class="ri-loader-4-line ri-spin" style="font-size: 1.5rem;"></i> Đang tải danh sách đánh giá...
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="systemTab" class="tab-view" style="display: none;">
          <div class="card-panel" style="margin-bottom: 24px;">
            <div class="panel-header">
              <div class="panel-title">Hiện Trạng Máy Chủ & Kết Nối Cơ Sở Dữ Liệu MySQL</div>
            </div>
            <div style="padding: 24px;">
              <div class="services-mesh-grid" id="servicesMeshGrid"></div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>

  <div id="productModal" class="modal-overlay">
    <div class="modal-card modal-card-xl">
      <button class="modal-close-btn" data-close-modal="productModal" type="button">
        <i class="ri-close-line"></i>
      </button>
      <div class="modal-header">
        <h3 class="modal-title" id="productModalTitle">Thêm Sản Phẩm Mới</h3>
      </div>
      <div class="modal-body">
        <form id="productForm">
          <input type="hidden" id="editProductId">

          <!-- Section 1: Thông tin cơ bản -->
          <div class="form-section-title">
            <i class="ri-information-line" style="color: var(--primary);"></i> Thông Tin Chung Sản Phẩm
          </div>
          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label" for="prodNameInput">Tên sản phẩm</label>
              <input type="text" id="prodNameInput" class="form-input" placeholder="Ví dụ: Áo Khoác Gió Bomber 2 Lớp Chống Nước..." required>
            </div>
            <div class="form-group">
              <label class="form-label" for="prodCategorySelect">Danh mục</label>
              <select id="prodCategorySelect" class="form-select" required></select>
            </div>
          </div>

          <!-- Section 2: Giá & Kho hàng -->
          <div class="form-section-divider"></div>
          <div class="form-section-title">
            <i class="ri-money-dollar-circle-line" style="color: #10b981;"></i> Giá Bán & Quản Lý Tồn Kho
          </div>
          <div class="admin-form-grid-3">
            <div class="form-group">
              <label class="form-label" for="prodPriceInput">Giá bán chung (VND)</label>
              <input type="number" id="prodPriceInput" class="form-input" placeholder="Ví dụ: 150000" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="prodOriginalPriceInput">Giá gốc niêm yết (VND)</label>
              <input type="number" id="prodOriginalPriceInput" class="form-input" placeholder="Ví dụ: 250000">
            </div>
            <div class="form-group">
              <label class="form-label" for="prodWeightInput">Trọng lượng (gram - GHN)</label>
              <input type="number" min="10" step="50" id="prodWeightInput" class="form-input" placeholder="Ví dụ: 300" value="300" required>
            </div>
          </div>

          <!-- Section 3: Khuyến mãi & Trưng bày -->
          <div class="form-section-divider"></div>
          <div class="form-section-title">
            <i class="ri-flashlight-line" style="color: #f59e0b;"></i> Khuyến Mãi & Trưng Bày Bán Hàng
          </div>
          <div class="admin-form-grid-3" style="align-items: center; background: #fffbeb; padding: 12px 16px; border-radius: 8px; border: 1px solid #fef3c7; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" id="prodIsFlashSaleInput" style="width: 18px; height: 18px; cursor: pointer;">
              <label for="prodIsFlashSaleInput" style="font-weight: 700; font-size: 0.875rem; cursor: pointer; color: #b45309;">
                ⚡ Bật Flash Sale Giá Sốc
              </label>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <label class="form-label" for="prodFlashDiscountInput" style="margin-bottom: 0; white-space: nowrap; font-size: 0.8125rem;">% Giảm Flash Sale:</label>
                <input type="number" min="0" max="99" id="prodFlashDiscountInput" class="form-input form-input-sm" placeholder="0" style="width: 80px;" value="0">
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" id="prodFeaturedInput" style="width: 18px; height: 18px; cursor: pointer;">
              <label for="prodFeaturedInput" style="font-weight: 700; font-size: 0.875rem; cursor: pointer; color: #1e293b;">
                ⭐ Nổi Bật Trang Chủ
              </label>
            </div>
          </div>

          <!-- Section 4: Hình ảnh & Mô tả -->
          <div class="admin-form-grid-2">
            <div class="form-group">
              <label class="form-label" for="prodImageInput">Hình ảnh chính (URL)</label>
              <input type="url" id="prodImageInput" class="form-input" placeholder="https://images.unsplash.com/..." required>
            </div>
            <div class="form-group">
              <label class="form-label">Điểm Đánh Giá Thực Tế (Khách Hàng)</label>
              <div style="display: flex; align-items: center; gap: 8px; padding: 9px 12px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: var(--radius-md); font-weight: 700; color: #b45309;">
                <i class="ri-star-fill" style="color: #f59e0b; font-size: 1.1rem;"></i>
                <span id="prodRatingDisplayVal" style="font-size: 1rem;">5.0</span> / 5.0
                <span style="font-size: 0.75rem; color: #78350f; font-weight: 500;">(Tính từ đánh giá thật của user)</span>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="prodDescInput">Mô tả sản phẩm</label>
            <textarea id="prodDescInput" class="form-textarea" rows="2" placeholder="Chất liệu vải dù 2 lớp, form dáng chuẩn đẹp, thoáng khí khi vận động..."></textarea>
          </div>

          <!-- Section 5: Quản lý biến thể phân loại (Thời trang, Quần áo, Công nghệ...) -->
          <div class="variant-manager-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div>
                <label class="form-label" style="margin-bottom: 2px; font-weight: 800; font-size: 1rem; color: var(--text-main);">
                  <i class="ri-t-shirt-2-line" style="color: var(--primary);"></i> Phân Loại Hàng & Tồn Kho Từng Biến Thể
                  <span id="variantTotalStockSummary" style="margin-left: 8px; font-size: 0.8125rem; font-weight: 700; color: #16a34a; background: #dcfce7; padding: 2px 8px; border-radius: 999px; display: none;"></span>
                </label>
                <div style="font-size: 0.8125rem; color: var(--text-muted);">
                  Quản lý giá bán, giá gốc, tồn kho và hình ảnh theo từng phân loại cụ thể (Size, Màu sắc).
                </div>
              </div>
              <div style="display: flex; gap: 8px;">
                <button type="button" id="addVariantRowBtn" class="btn btn-primary btn-sm">
                  <i class="ri-add-line"></i> + Thêm Biến Thể
                </button>
              </div>
            </div>

            <!-- Gợi ý nhanh cho Quần áo / Thời trang / Công nghệ -->
            <div class="variant-presets-bar">
              <span class="preset-chip-group"><i class="ri-magic-line"></i> Chọn nhanh mẫu:</span>
              <button type="button" class="preset-chip" id="presetSizeAoBtn">+ Bộ Size Áo (S, M, L, XL, 2XL)</button>
              <button type="button" class="preset-chip" id="presetSizeQuanBtn">+ Bộ Size Quần (29, 30, 31, 32)</button>
              <button type="button" class="preset-chip" id="presetFreesizeBtn">+ FreeSize</button>
              <button type="button" class="preset-chip" id="presetColorsFashionBtn">+ Bộ Màu (Đen, Trắng, Be, Xanh)</button>
              <button type="button" class="preset-chip" id="presetColorsTechBtn">+ Bản Bộ Nhớ (128GB, 256GB, 512GB)</button>
            </div>

            <!-- Công cụ Áp dụng Hàng loạt (Batch Fill) -->
            <div class="variant-batch-box">
              <div class="variant-batch-title">
                <i class="ri-flashlight-line"></i> Áp dụng nhanh cho TẤT CẢ các biến thể hiện có:
              </div>
              <div class="variant-batch-grid">
                <input type="number" id="batchVarPrice" class="form-input form-input-sm" placeholder="Giá bán chung" min="0">
                <input type="number" id="batchVarOrigPrice" class="form-input form-input-sm" placeholder="Giá gốc chung" min="0">
                <input type="number" id="batchVarStock" class="form-input form-input-sm" placeholder="Kho từng loại" min="0">
                <input type="url" id="batchVarImg" class="form-input form-input-sm" placeholder="URL ảnh chung">
                <button type="button" id="applyBatchVarBtn" class="btn btn-outline btn-sm" style="white-space: nowrap; font-weight: 700;">
                  Áp Dụng Cho Tất Cả
                </button>
              </div>
            </div>

            <div id="productVariantsContainer"></div>
          </div>

          <button type="submit" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 20px;">
            <span id="saveProductBtnText">Lưu Sản Phẩm</span>
          </button>
        </form>
      </div>
    </div>
  </div>

  <div id="orderDetailModal" class="modal-overlay">
    <div class="modal-card modal-card-xl">
      <button class="modal-close-btn" data-close-modal="orderDetailModal" type="button">
        <i class="ri-close-line"></i>
      </button>
      <div class="modal-header">
        <h3 class="modal-title" id="orderDetailTitle">Quản Lý & Chỉnh Sửa Đơn Hàng</h3>
      </div>
      <div class="modal-body" id="orderDetailContent"></div>
    </div>
  </div>

  <div id="replyReviewModal" class="modal-overlay">
    <div class="modal-card modal-card-lg">
      <button class="modal-close-btn" data-close-modal="replyReviewModal" type="button">
        <i class="ri-close-line"></i>
      </button>
      <div class="modal-header">
        <h3 class="modal-title"><i class="ri-reply-fill" style="color: var(--primary);"></i> Phản Hồi Đánh Giá Của Khách Hàng</h3>
      </div>
      <div class="modal-body">
        <div id="replyReviewCustomerContext" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 16px;"></div>

        <form id="replyReviewForm">
          <input type="hidden" id="replyReviewId">
          <div class="form-group">
            <label class="form-label" for="replyReviewCommentInput">Nội dung phản hồi từ Người bán (Hiển thị công khai tới khách)</label>
            <textarea id="replyReviewCommentInput" class="form-textarea" rows="4" placeholder="Nhập câu trả lời chu đáo, lịch sự để gửi đến khách hàng..." required></textarea>
          </div>

          <div style="margin-bottom: 16px;">
            <label style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 6px;">
              <i class="ri-magic-line"></i> Chọn nhanh câu mẫu:
            </label>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              <button type="button" class="preset-chip reply-preset-btn" data-text="NovaShop chân thành cảm ơn bạn đã tin tưởng mua sắm và dành lời khen ngợi cho sản phẩm! Chúc bạn có những phút giây trải nghiệm thật tuyệt vời.">
                Cảm ơn khen ngợi
              </button>
              <button type="button" class="preset-chip reply-preset-btn" data-text="NovaShop rất tiếc vì sự bất tiện này. Shop đã liên hệ qua tin nhắn để hỗ trợ đổi trả / bảo hành ngay cho bạn nhé!">
                Hỗ trợ sự cố / Đổi trả
              </button>
              <button type="button" class="preset-chip reply-preset-btn" data-text="NovaShop cảm ơn đóng góp quý báu của bạn! Shop sẽ tiếp thu và hoàn thiện chất lượng dịch vụ tốt hơn nữa trong tương lai.">
                Ghi nhận góp ý
              </button>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" class="btn btn-outline" data-close-modal="replyReviewModal">Hủy bỏ</button>
            <button type="submit" class="btn btn-primary" id="saveReplyReviewBtn">
              <i class="ri-send-plane-fill"></i> Gửi Phản Hồi
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <div id="categoryModal" class="modal-overlay">
    <div class="modal-card" style="max-width: 480px;">
      <button class="modal-close-btn" data-close-modal="categoryModal" type="button">
        <i class="ri-close-line"></i>
      </button>
      <div class="modal-header">
        <h3 class="modal-title" id="categoryModalTitle">Thêm Danh Mục Mới</h3>
      </div>
      <div class="modal-body">
        <form id="categoryForm">
          <input type="hidden" id="editCategoryId">
          <div class="form-group">
            <label class="form-label" for="catIdInput">Mã định danh danh mục (Slug/ID)</label>
            <input type="text" id="catIdInput" class="form-input" placeholder="Ví dụ: cat_electronics, cat_cosmetics" required>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">Dùng chữ cái không dấu, viết thường, gạch dưới.</div>
          </div>
          <div class="form-group">
            <label class="form-label" for="catNameInput">Tên danh mục hiển thị</label>
            <input type="text" id="catNameInput" class="form-input" placeholder="Ví dụ: Mỹ Phẩm & Làm Đẹp" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="catIconInput">Biểu tượng RemixIcon</label>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="text" id="catIconInput" class="form-input" placeholder="Ví dụ: ri-magic-line, ri-t-shirt-line" value="ri-folder-line" required>
              <div id="catIconPreview" style="width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; background: #f1f5f9; border-radius: 6px; font-size: 1.25rem; color: var(--primary);">
                <i class="ri-folder-line"></i>
              </div>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">Icon từ thư viện RemixIcon (vd: ri-apps-line, ri-macbook-line, ri-t-shirt-line).</div>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
            <button type="button" class="btn btn-outline" data-close-modal="categoryModal">Hủy bỏ</button>
            <button type="submit" class="btn btn-primary" id="saveCategoryBtn">
              <i class="ri-save-3-line"></i> Lưu Danh Mục
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <div id="voucherModal" class="modal-overlay">
    <div class="modal-card modal-card-lg" style="max-width: 620px;">
      <button class="modal-close-btn" data-close-modal="voucherModal" type="button">
        <i class="ri-close-line"></i>
      </button>
      <div class="modal-header">
        <h3 class="modal-title" id="voucherModalTitle">Tạo Mã Giảm Giá Mới</h3>
      </div>
      <div class="modal-body">
        <form id="voucherForm">
          <input type="hidden" id="voucherIsEdit" value="0">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label class="form-label" for="voucherCodeInput">Mã Code (VIẾT HOA)</label>
              <input type="text" id="voucherCodeInput" class="form-input" placeholder="Ví dụ: SALE50K, FREESHIP" style="text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="voucherNameInput">Tên chương trình / Tên mã</label>
              <input type="text" id="voucherNameInput" class="form-input" placeholder="Ví dụ: Giảm 50.000đ cho đơn từ 300K" required>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label class="form-label" for="voucherDiscountType">Hình thức giảm giá</label>
              <select id="voucherDiscountType" class="form-select">
                <option value="fixed">Giảm số tiền cố định (VND)</option>
                <option value="percent">Giảm theo phần trăm (%)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="voucherDiscountValue" id="voucherDiscountValueLabel">Mức giảm (VND)</label>
              <input type="number" id="voucherDiscountValue" class="form-input" placeholder="Ví dụ: 50000" min="1" required>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label class="form-label" for="voucherMinOrderValue">Giá trị đơn tối thiểu (VND)</label>
              <input type="number" id="voucherMinOrderValue" class="form-input" placeholder="Ví dụ: 200000" min="0" value="0">
            </div>
            <div class="form-group">
              <label class="form-label" for="voucherMaxDiscount">Mức giảm tối đa (VND, với %)</label>
              <input type="number" id="voucherMaxDiscount" class="form-input" placeholder="Để trống nếu không giới hạn" min="0">
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label class="form-label" for="voucherUsageLimit">Số lượt sử dụng tối đa</label>
              <input type="number" id="voucherUsageLimit" class="form-input" placeholder="1000" min="1" value="1000">
            </div>
            <div class="form-group">
              <label class="form-label" for="voucherExpiresAt">Hạn sử dụng</label>
              <input type="datetime-local" id="voucherExpiresAt" class="form-input">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="voucherDescription">Mô tả ngắn điều kiện</label>
            <input type="text" id="voucherDescription" class="form-input" placeholder="Áp dụng cho mọi khách hàng nhân dịp khai trương...">
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding: 10px 14px; background: #f0fdf4; border-radius: 6px; border: 1px solid #bbf7d0;">
            <input type="checkbox" id="voucherIsActive" checked style="width: 18px; height: 18px; cursor: pointer;">
            <label for="voucherIsActive" style="font-weight: 600; font-size: 0.875rem; color: #166534; cursor: pointer;">
              Kích hoạt voucher ngay lập tức (Cho phép khách hàng áp dụng tại giỏ hàng)
            </label>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" class="btn btn-outline" data-close-modal="voucherModal">Hủy bỏ</button>
            <button type="submit" class="btn btn-primary" id="saveVoucherBtn">
              <i class="ri-save-3-line"></i> Lưu Voucher
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
  `;
};
const renderAdminApp = () => {
    const adminAppEl = document.getElementById('admin-app');
    if (!adminAppEl)
        return;
    const path = window.location.pathname;
    if (path === '/admin/login') {
        document.title = 'Đăng Nhập Quản Trị Hệ Thống | NovaShop';
        adminAppEl.innerHTML = renderAdminLoginView();
        initAdminLogin();
    }
    else {
        if (!state.token) {
            navigateAdmin('/admin/login');
            return;
        }
        document.title = 'Admin Dashboard | NovaShop Quản Trị';
        adminAppEl.innerHTML = renderAdminDashboardView();
        initAdminDashboard();
    }
};
const navigateAdmin = (path) => {
    if (window.location.pathname !== path) {
        window.history.pushState(null, '', path);
    }
    state.currentRoute = path;
    renderAdminApp();
};
const initAdminLogin = () => {
    const form = document.getElementById('adminLoginForm');
    const userField = document.getElementById('adminUsername');
    const passField = document.getElementById('adminPassword');
    if (form && userField && passField) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = userField.value.trim();
            const password = passField.value;
            try {
                const res = await fetch(`${API_BASE}/api/auth/admin/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const result = await res.json();
                if (result.success) {
                    if (result.data?.user?.role !== 'admin') {
                        showToast('Truy cập bị từ chối', 'Tài khoản không đủ thẩm quyền quản trị viên', 'error');
                        return;
                    }
                    state.token = result.data.token;
                    state.adminUser = result.data.user;
                    localStorage.setItem('novashop_admin_token', result.data.token);
                    localStorage.setItem('novashop_admin_user', JSON.stringify(result.data.user));
                    showToast('Thành công', 'Xác thực quản trị viên thành công. Đang chuyển hướng...', 'success');
                    setTimeout(() => {
                        navigateAdmin('/admin');
                    }, 800);
                }
                else {
                    showToast('Truy cập bị từ chối', result.message || 'Tài khoản không đủ thẩm quyền', 'error');
                }
            }
            catch {
                showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ xác thực', 'error');
            }
        });
    }
};
const initAdminDashboard = () => {
    bindTabs();
    bindSidebarLogout();
    bindRefresh();
    bindModals();
    bindProductForm();
    bindCategoryEvents();
    bindVoucherEvents();
    bindChatHandlers();
    bindReviewEvents();
    bindStatsHandlers();
    loadCategories();
    loadVouchers();
    loadDashboardData();
    startChatPolling();
};
const bindTabs = () => {
    const navItems = document.querySelectorAll('.admin-nav-item');
    const tabViews = document.querySelectorAll('.tab-view');
    const headerTitle = document.getElementById('adminHeaderTitle');
    const titles = {
        statsTab: 'Báo Cáo & Thống Kê Doanh Thu Toàn Diện',
        ordersTab: 'Quản Lý Đơn Hàng & Vận Chuyển',
        productsTab: 'Quản Lý Kho Hàng & Sản Phẩm',
        categoriesTab: 'Quản Lý Danh Mục Sản Phẩm',
        vouchersTab: 'Quản Lý Mã Giảm Giá & Voucher Khuyến Mãi',
        reviewsTab: 'Quản Lý Đánh Giá & Nhận Xét Của Khách Hàng',
        usersTab: 'Quản Lý Người Dùng & Quyền Hạn',
        chatTab: 'Live Chat & Hỗ Trợ Khách Hàng (Gemini AI)',
        systemTab: 'Trạng Thái Dịch Vụ Microservices'
    };
    navItems.forEach((item) => {
        item.addEventListener('click', () => {
            const tabName = item.getAttribute('data-tab');
            if (!tabName)
                return;
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            tabViews.forEach((view) => {
                view.style.display = view.id === tabName ? 'block' : 'none';
            });
            if (headerTitle && titles[tabName]) {
                headerTitle.textContent = titles[tabName];
            }
            if (tabName === 'statsTab') {
                loadStats();
            }
            else if (tabName === 'chatTab') {
                loadChatSessions();
            }
            else if (tabName === 'reviewsTab') {
                loadReviews();
            }
            else if (tabName === 'categoriesTab') {
                renderCategories();
            }
            else if (tabName === 'vouchersTab') {
                loadVouchers();
            }
        });
    });
    const filterOrderStatus = document.getElementById('filterOrderStatus');
    if (filterOrderStatus) {
        filterOrderStatus.addEventListener('change', () => {
            renderOrders();
        });
    }
};
const bindSidebarLogout = () => {
    const logoutBtn = document.getElementById('sidebarLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('novashop_admin_token');
            localStorage.removeItem('novashop_admin_user');
            state.token = '';
            state.adminUser = null;
            if (state.chatPollingInterval) {
                clearInterval(state.chatPollingInterval);
                state.chatPollingInterval = null;
            }
            showToast('Thông báo', 'Đã đăng xuất tài khoản quản trị', 'success');
            navigateAdmin('/admin/login');
        });
    }
};
const bindRefresh = () => {
    const refreshBtn = document.getElementById('refreshDataBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadDashboardData();
            showToast('Làm mới', 'Dữ liệu quản trị đã được cập nhật', 'success');
        });
    }
};
const bindModals = () => {
    const openAddBtn = document.getElementById('openAddProductModalBtn');
    const prodModal = document.getElementById('productModal');
    const modalCloseBtns = document.querySelectorAll('[data-close-modal]');
    if (openAddBtn && prodModal) {
        openAddBtn.addEventListener('click', () => {
            resetProductForm();
            prodModal.classList.add('active');
        });
    }
    modalCloseBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-close-modal');
            if (modalId) {
                const m = document.getElementById(modalId);
                if (m)
                    m.classList.remove('active');
            }
        });
    });
};
let currentProductVariants = [];
const updateTotalStockDisplay = () => {
    const totalStock = currentProductVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    const summaryEl = document.getElementById('variantTotalStockSummary');
    if (summaryEl) {
        if (currentProductVariants.length > 0) {
            summaryEl.textContent = `(Tổng kho: ${totalStock.toLocaleString('vi-VN')} cái / ${currentProductVariants.length} loại)`;
            summaryEl.style.display = 'inline-block';
        }
        else {
            summaryEl.style.display = 'none';
        }
    }
};
const renderProductVariantsEditor = (variants = []) => {
    const container = document.getElementById('productVariantsContainer');
    if (!container)
        return;
    currentProductVariants = Array.isArray(variants) ? [...variants] : [];
    updateTotalStockDisplay();
    if (currentProductVariants.length === 0) {
        container.innerHTML = `
      <div style="text-align: center; padding: 24px 16px; color: var(--text-muted); font-size: 0.875rem; background: #ffffff; border-radius: 8px; border: 1px dashed #cbd5e1; line-height: 1.6;">
        <i class="ri-t-shirt-line" style="font-size: 2.2rem; color: #94a3b8; display: block; margin-bottom: 8px;"></i>
        Chưa có biến thể nào. Tồn kho được quản lý riêng theo từng biến thể.<br>
        <span style="font-size: 0.8125rem; color: #64748b;">(Bấm <strong>"+ Thêm Biến Thể"</strong> hoặc các nút <strong>"Chọn nhanh mẫu"</strong> ở trên để tạo và chỉnh sửa số lượng kho cho từng phân loại).</span>
      </div>
    `;
        return;
    }
    const totalStock = currentProductVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    container.innerHTML = `
    <div class="variant-editor-scroll-wrap" style="overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; border-radius: 8px;">
      <div style="min-width: 680px; display: flex; flex-direction: column; gap: 8px;">
        <div class="variant-table-header">
          <div>Màu sắc (Color)</div>
          <div>Kích cỡ / Size (Type)</div>
          <div>Giá bán (VND)</div>
          <div>Giá gốc (VND)</div>
          <div>Kho (cái)</div>
          <div>Ảnh biến thể (URL)</div>
          <div></div>
        </div>
        <div id="variantRowsList">
          ${currentProductVariants.map((v, idx) => `
            <div class="variant-row" data-index="${idx}">
              <div>
                <input type="text" class="form-input form-input-sm var-color-input" value="${v.color || ''}" placeholder="Màu (vd: Đen, Trắng)" required>
              </div>
              <div>
                <input type="text" class="form-input form-input-sm var-type-input" value="${v.type || ''}" placeholder="Size (vd: S, M, L, XL)" required>
              </div>
              <div>
                <input type="number" class="form-input form-input-sm var-price-input" value="${v.price || 0}" min="0" placeholder="Giá bán" required>
              </div>
              <div>
                <input type="number" class="form-input form-input-sm var-orig-price-input" value="${v.originalPrice || v.price || 0}" min="0" placeholder="Giá gốc">
              </div>
              <div>
                <input type="number" class="form-input form-input-sm var-stock-input" value="${v.stock !== undefined ? v.stock : 50}" min="0" placeholder="Kho" required>
              </div>
              <div class="var-img-col">
                <img src="${v.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&q=80'}" class="var-thumb-preview" id="varThumb_${idx}" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&q=80'">
                <input type="url" class="form-input form-input-sm var-img-input" value="${v.imageUrl || ''}" placeholder="Link ảnh riêng" style="flex: 1;">
                <button type="button" class="btn btn-outline btn-sm copy-main-img-btn" data-index="${idx}" title="Lấy ảnh chính" style="padding: 4px 6px;">
                  <i class="ri-file-copy-line"></i>
                </button>
              </div>
              <div style="text-align: center;">
                <button type="button" class="btn btn-outline btn-sm delete-variant-btn" data-index="${idx}" style="color: #ef4444; border-color: #fecdd3; padding: 4px 8px;" title="Xóa phân loại này">
                  <i class="ri-delete-bin-line"></i>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #ffffff; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 0.8125rem;">
          <span style="color: var(--text-muted);">
            Đang có <strong>${currentProductVariants.length}</strong> phân loại hàng
          </span>
          <span style="font-weight: 700; color: #15803d;">
            Tổng tồn kho biến thể: <strong>${totalStock.toLocaleString('vi-VN')}</strong> sản phẩm (đã đồng bộ vào kho chính)
          </span>
        </div>
      </div>
    </div>
  `;
    container.querySelectorAll('.delete-variant-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-index') || '-1', 10);
            if (idx >= 0) {
                currentProductVariants.splice(idx, 1);
                renderProductVariantsEditor(currentProductVariants);
            }
        });
    });
    container.querySelectorAll('.var-color-input').forEach((input, idx) => {
        input.addEventListener('input', (e) => {
            if (currentProductVariants[idx])
                currentProductVariants[idx].color = e.target.value;
        });
    });
    container.querySelectorAll('.var-type-input').forEach((input, idx) => {
        input.addEventListener('input', (e) => {
            if (currentProductVariants[idx])
                currentProductVariants[idx].type = e.target.value;
        });
    });
    container.querySelectorAll('.var-price-input').forEach((input, idx) => {
        input.addEventListener('input', (e) => {
            if (currentProductVariants[idx])
                currentProductVariants[idx].price = Number(e.target.value) || 0;
        });
    });
    container.querySelectorAll('.var-orig-price-input').forEach((input, idx) => {
        input.addEventListener('input', (e) => {
            if (currentProductVariants[idx])
                currentProductVariants[idx].originalPrice = Number(e.target.value) || 0;
        });
    });
    container.querySelectorAll('.var-stock-input').forEach((input, idx) => {
        input.addEventListener('input', (e) => {
            if (currentProductVariants[idx]) {
                currentProductVariants[idx].stock = Number(e.target.value) || 0;
                updateTotalStockDisplay();
            }
        });
    });
    container.querySelectorAll('.var-img-input').forEach((input, idx) => {
        input.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            if (currentProductVariants[idx]) {
                currentProductVariants[idx].imageUrl = val;
                const thumb = document.getElementById(`varThumb_${idx}`);
                if (thumb && val)
                    thumb.src = val;
            }
        });
    });
    container.querySelectorAll('.copy-main-img-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-index') || '-1', 10);
            const mainImg = document.getElementById('prodImageInput')?.value.trim() || '';
            if (idx >= 0 && mainImg && currentProductVariants[idx]) {
                currentProductVariants[idx].imageUrl = mainImg;
                renderProductVariantsEditor(currentProductVariants);
            }
        });
    });
};
const resetProductForm = () => {
    const editId = document.getElementById('editProductId');
    const nameInput = document.getElementById('prodNameInput');
    const priceInput = document.getElementById('prodPriceInput');
    const origPriceInput = document.getElementById('prodOriginalPriceInput');
    const stockInput = document.getElementById('prodStockInput');
    const ratingDisplay = document.getElementById('prodRatingDisplayVal');
    const imgInput = document.getElementById('prodImageInput');
    const descInput = document.getElementById('prodDescInput');
    const weightInput = document.getElementById('prodWeightInput');
    const isFlashSaleInput = document.getElementById('prodIsFlashSaleInput');
    const flashDiscountInput = document.getElementById('prodFlashDiscountInput');
    const featuredInput = document.getElementById('prodFeaturedInput');
    const title = document.getElementById('productModalTitle');
    const btnText = document.getElementById('saveProductBtnText');
    if (editId)
        editId.value = '';
    if (nameInput)
        nameInput.value = '';
    if (priceInput)
        priceInput.value = '';
    if (origPriceInput)
        origPriceInput.value = '';
    if (ratingDisplay)
        ratingDisplay.textContent = '5.0';
    if (imgInput)
        imgInput.value = '';
    if (descInput)
        descInput.value = '';
    if (weightInput)
        weightInput.value = '300';
    if (isFlashSaleInput)
        isFlashSaleInput.checked = false;
    if (flashDiscountInput)
        flashDiscountInput.value = '0';
    if (featuredInput)
        featuredInput.checked = false;
    if (title)
        title.textContent = 'Thêm Sản Phẩm Mới';
    if (btnText)
        btnText.textContent = 'Lưu Sản Phẩm';
    renderProductVariantsEditor([
        {
            id: `temp_${Date.now()}`,
            color: 'Mặc định',
            type: 'Tiêu chuẩn',
            price: 150000,
            originalPrice: 200000,
            stock: 50,
            imageUrl: ''
        }
    ]);
};
const bindProductForm = () => {
    const form = document.getElementById('productForm');
    const addVarBtn = document.getElementById('addVariantRowBtn');
    if (addVarBtn) {
        addVarBtn.addEventListener('click', () => {
            const defaultPrice = parseFloat(document.getElementById('prodPriceInput')?.value || '0');
            const defaultOrigPrice = parseFloat(document.getElementById('prodOriginalPriceInput')?.value || '0');
            const defaultMainImg = document.getElementById('prodImageInput')?.value.trim() || '';
            currentProductVariants.push({
                id: `temp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                color: currentProductVariants.length > 0 ? currentProductVariants[currentProductVariants.length - 1].color : 'Đen',
                type: 'Size M',
                price: defaultPrice > 0 ? defaultPrice : 150000,
                originalPrice: defaultOrigPrice > 0 ? defaultOrigPrice : (defaultPrice > 0 ? defaultPrice : 200000),
                stock: 50,
                imageUrl: defaultMainImg
            });
            renderProductVariantsEditor(currentProductVariants);
        });
    }
    const presetSizeAoBtn = document.getElementById('presetSizeAoBtn');
    if (presetSizeAoBtn) {
        presetSizeAoBtn.addEventListener('click', () => {
            const defaultPrice = parseFloat(document.getElementById('prodPriceInput')?.value || '0') || 150000;
            const defaultOrigPrice = parseFloat(document.getElementById('prodOriginalPriceInput')?.value || '0') || Math.round(defaultPrice * 1.3);
            const defaultMainImg = document.getElementById('prodImageInput')?.value.trim() || '';
            const currentColor = currentProductVariants.length > 0 ? currentProductVariants[0].color : 'Đen';
            const sizes = ['Size S', 'Size M', 'Size L', 'Size XL', 'Size 2XL'];
            sizes.forEach((s) => {
                currentProductVariants.push({
                    id: `temp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                    color: currentColor,
                    type: s,
                    price: defaultPrice,
                    originalPrice: defaultOrigPrice,
                    stock: 50,
                    imageUrl: defaultMainImg
                });
            });
            renderProductVariantsEditor(currentProductVariants);
        });
    }
    const presetSizeQuanBtn = document.getElementById('presetSizeQuanBtn');
    if (presetSizeQuanBtn) {
        presetSizeQuanBtn.addEventListener('click', () => {
            const defaultPrice = parseFloat(document.getElementById('prodPriceInput')?.value || '0') || 200000;
            const defaultOrigPrice = parseFloat(document.getElementById('prodOriginalPriceInput')?.value || '0') || Math.round(defaultPrice * 1.3);
            const defaultMainImg = document.getElementById('prodImageInput')?.value.trim() || '';
            const currentColor = currentProductVariants.length > 0 ? currentProductVariants[0].color : 'Đen';
            const sizes = ['Size 29', 'Size 30', 'Size 31', 'Size 32'];
            sizes.forEach((s) => {
                currentProductVariants.push({
                    id: `temp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                    color: currentColor,
                    type: s,
                    price: defaultPrice,
                    originalPrice: defaultOrigPrice,
                    stock: 50,
                    imageUrl: defaultMainImg
                });
            });
            renderProductVariantsEditor(currentProductVariants);
        });
    }
    const presetFreesizeBtn = document.getElementById('presetFreesizeBtn');
    if (presetFreesizeBtn) {
        presetFreesizeBtn.addEventListener('click', () => {
            const defaultPrice = parseFloat(document.getElementById('prodPriceInput')?.value || '0') || 150000;
            const defaultOrigPrice = parseFloat(document.getElementById('prodOriginalPriceInput')?.value || '0') || defaultPrice;
            const defaultMainImg = document.getElementById('prodImageInput')?.value.trim() || '';
            currentProductVariants.push({
                id: `temp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                color: 'FreeSize',
                type: 'FreeSize Chuẩn',
                price: defaultPrice,
                originalPrice: defaultOrigPrice,
                stock: 100,
                imageUrl: defaultMainImg
            });
            renderProductVariantsEditor(currentProductVariants);
        });
    }
    const presetColorsFashionBtn = document.getElementById('presetColorsFashionBtn');
    if (presetColorsFashionBtn) {
        presetColorsFashionBtn.addEventListener('click', () => {
            const defaultPrice = parseFloat(document.getElementById('prodPriceInput')?.value || '0') || 150000;
            const defaultOrigPrice = parseFloat(document.getElementById('prodOriginalPriceInput')?.value || '0') || defaultPrice;
            const defaultMainImg = document.getElementById('prodImageInput')?.value.trim() || '';
            const colors = ['Đen', 'Trắng', 'Be', 'Xanh Navy'];
            colors.forEach(c => {
                currentProductVariants.push({
                    id: `temp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                    color: c,
                    type: 'Bản Tiêu Chuẩn',
                    price: defaultPrice,
                    originalPrice: defaultOrigPrice,
                    stock: 50,
                    imageUrl: defaultMainImg
                });
            });
            renderProductVariantsEditor(currentProductVariants);
        });
    }
    const presetColorsTechBtn = document.getElementById('presetColorsTechBtn');
    if (presetColorsTechBtn) {
        presetColorsTechBtn.addEventListener('click', () => {
            const defaultPrice = parseFloat(document.getElementById('prodPriceInput')?.value || '0') || 5000000;
            const defaultOrigPrice = parseFloat(document.getElementById('prodOriginalPriceInput')?.value || '0') || defaultPrice;
            const defaultMainImg = document.getElementById('prodImageInput')?.value.trim() || '';
            const currentColor = currentProductVariants.length > 0 ? currentProductVariants[0].color : 'Titan Tự Nhiên';
            const specs = [
                { type: '128GB', pAdd: 0 },
                { type: '256GB', pAdd: 2000000 },
                { type: '512GB', pAdd: 5000000 }
            ];
            specs.forEach(s => {
                currentProductVariants.push({
                    id: `temp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                    color: currentColor,
                    type: s.type,
                    price: defaultPrice + s.pAdd,
                    originalPrice: defaultOrigPrice + s.pAdd,
                    stock: 30,
                    imageUrl: defaultMainImg
                });
            });
            renderProductVariantsEditor(currentProductVariants);
        });
    }
    const applyBatchBtn = document.getElementById('applyBatchVarBtn');
    if (applyBatchBtn) {
        applyBatchBtn.addEventListener('click', () => {
            if (currentProductVariants.length === 0) {
                showToast('Thông báo', 'Chưa có biến thể nào để áp dụng', 'warning');
                return;
            }
            const bPrice = parseFloat(document.getElementById('batchVarPrice')?.value || '');
            const bOrigPrice = parseFloat(document.getElementById('batchVarOrigPrice')?.value || '');
            const bStock = parseInt(document.getElementById('batchVarStock')?.value || '', 10);
            const bImg = document.getElementById('batchVarImg')?.value.trim() || '';
            currentProductVariants.forEach(v => {
                if (!isNaN(bPrice) && bPrice >= 0)
                    v.price = bPrice;
                if (!isNaN(bOrigPrice) && bOrigPrice >= 0)
                    v.originalPrice = bOrigPrice;
                if (!isNaN(bStock) && bStock >= 0)
                    v.stock = bStock;
                if (bImg)
                    v.imageUrl = bImg;
            });
            renderProductVariantsEditor(currentProductVariants);
            showToast('Thành công', `Đã áp dụng thông số cho ${currentProductVariants.length} biến thể!`, 'success');
        });
    }
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editId = document.getElementById('editProductId')?.value;
            const name = document.getElementById('prodNameInput')?.value.trim() || '';
            const category = document.getElementById('prodCategorySelect')?.value || '';
            const price = parseFloat(document.getElementById('prodPriceInput')?.value || '0');
            const originalPrice = parseFloat(document.getElementById('prodOriginalPriceInput')?.value || '0');
            const imageUrl = document.getElementById('prodImageInput')?.value.trim() || '';
            const description = document.getElementById('prodDescInput')?.value.trim() || '';
            const weight = parseInt(document.getElementById('prodWeightInput')?.value || '300', 10);
            const isFlashSale = document.getElementById('prodIsFlashSaleInput')?.checked ? 1 : 0;
            const flashSaleDiscount = parseInt(document.getElementById('prodFlashDiscountInput')?.value || '0', 10);
            const featured = document.getElementById('prodFeaturedInput')?.checked ? 1 : 0;
            if (currentProductVariants.length === 0) {
                showToast('Lỗi', 'Vui lòng thêm ít nhất 1 biến thể sản phẩm để quản lý tồn kho và giá!', 'warning');
                return;
            }
            const stock = currentProductVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
            const payload = {
                name,
                category,
                price,
                originalPrice: originalPrice > 0 ? originalPrice : price,
                stock,
                weight: weight > 0 ? weight : 300,
                imageUrl,
                description,
                isFlashSale,
                flashSaleDiscount,
                featured
            };
            if (currentProductVariants.length > 0) {
                payload.variants = currentProductVariants;
            }
            const url = editId ? `${API_BASE}/api/products/${editId}` : `${API_BASE}/api/products`;
            const method = editId ? 'PUT' : 'POST';
            try {
                const res = await fetch(url, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${state.token}`
                    },
                    body: JSON.stringify(payload)
                });
                const result = await res.json();
                if (result.success) {
                    showToast('Thành công', editId ? 'Cập nhật sản phẩm thành công' : 'Đã thêm sản phẩm mới', 'success');
                    const m = document.getElementById('productModal');
                    if (m)
                        m.classList.remove('active');
                    loadProducts();
                }
                else {
                    showToast('Lỗi', result.message || 'Không thể lưu sản phẩm', 'error');
                }
            }
            catch {
                showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ sản phẩm', 'error');
            }
        });
    }
};
const loadDashboardData = () => {
    loadStats();
    loadOrders();
    loadProducts();
    loadUsers();
    loadCategories();
    loadVouchers();
    loadReviews();
    loadSystemStatus();
    loadChatSessions();
};
const loadCategories = async () => {
    try {
        const res = await fetch(`${API_BASE}/api/categories`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
            state.categories = data.data;
            renderCategories();
            const select = document.getElementById('prodCategorySelect');
            if (select) {
                select.innerHTML = state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            }
        }
    }
    catch { }
};
const renderCategories = () => {
    const tbody = document.getElementById('categoriesTableBody');
    if (!tbody)
        return;
    if (state.categories.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px;">Chưa có danh mục nào</td></tr>`;
        return;
    }
    tbody.innerHTML = state.categories.map(c => {
        const count = state.products.filter(p => p.category === c.id || p.category === c.name).length;
        const iconClass = c.icon || 'ri-folder-line';
        return `
      <tr>
        <td style="width: 60px; text-align: center;">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: #e0f2fe; color: #0284c7; display: inline-flex; align-items: center; justify-content: center; font-size: 1.25rem;">
            <i class="${iconClass}"></i>
          </div>
        </td>
        <td>
          <code style="background: #f1f5f9; padding: 3px 8px; border-radius: 4px; font-weight: 600; color: #475569;">${c.id}</code>
        </td>
        <td>
          <span style="font-weight: 700; color: var(--text-main); font-size: 0.9375rem;">${c.name}</span>
        </td>
        <td>
          <span class="badge" style="background: #f8fafc; border: 1px solid #e2e8f0; color: #334155; font-weight: 600;">
            ${count} sản phẩm
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn btn-outline btn-sm edit-cat-btn" data-id="${c.id}" style="padding: 4px 8px;" title="Chỉnh sửa">
              <i class="ri-edit-line"></i> Sửa
            </button>
            <button type="button" class="btn btn-outline btn-sm delete-cat-btn" data-id="${c.id}" style="padding: 4px 8px; color: #ef4444; border-color: #fecdd3;" title="Xóa danh mục">
              <i class="ri-delete-bin-line"></i> Xóa
            </button>
          </div>
        </td>
      </tr>
    `;
    }).join('');
    tbody.querySelectorAll('.edit-cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const cat = state.categories.find(c => c.id === id);
            if (cat)
                openEditCategoryModal(cat);
        });
    });
    tbody.querySelectorAll('.delete-cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            if (id)
                deleteCategory(id);
        });
    });
};
const openAddCategoryModal = () => {
    const modal = document.getElementById('categoryModal');
    const title = document.getElementById('categoryModalTitle');
    const editId = document.getElementById('editCategoryId');
    const idInput = document.getElementById('catIdInput');
    const nameInput = document.getElementById('catNameInput');
    const iconInput = document.getElementById('catIconInput');
    const preview = document.getElementById('catIconPreview');
    if (title)
        title.textContent = 'Thêm Danh Mục Mới';
    if (editId)
        editId.value = '';
    if (idInput) {
        idInput.value = '';
        idInput.removeAttribute('disabled');
    }
    if (nameInput)
        nameInput.value = '';
    if (iconInput)
        iconInput.value = 'ri-folder-line';
    if (preview)
        preview.innerHTML = `<i class="ri-folder-line"></i>`;
    if (modal)
        modal.classList.add('active');
};
const openEditCategoryModal = (cat) => {
    const modal = document.getElementById('categoryModal');
    const title = document.getElementById('categoryModalTitle');
    const editId = document.getElementById('editCategoryId');
    const idInput = document.getElementById('catIdInput');
    const nameInput = document.getElementById('catNameInput');
    const iconInput = document.getElementById('catIconInput');
    const preview = document.getElementById('catIconPreview');
    if (title)
        title.textContent = 'Chỉnh Sửa Danh Mục';
    if (editId)
        editId.value = cat.id;
    if (idInput) {
        idInput.value = cat.id;
        idInput.setAttribute('disabled', 'true');
    }
    if (nameInput)
        nameInput.value = cat.name;
    if (iconInput)
        iconInput.value = cat.icon || 'ri-folder-line';
    if (preview)
        preview.innerHTML = `<i class="${cat.icon || 'ri-folder-line'}"></i>`;
    if (modal)
        modal.classList.add('active');
};
const deleteCategory = async (id) => {
    if (!confirm(`Bạn có chắc muốn xóa danh mục "${id}"?`))
        return;
    try {
        const res = await fetch(`${API_BASE}/api/categories/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${state.token}` }
        });
        const result = await res.json();
        if (result.success) {
            showToast('Thành công', 'Đã xóa danh mục', 'success');
            loadCategories();
        }
        else {
            showToast('Không thể xóa', result.message || 'Lỗi khi xóa danh mục', 'error');
        }
    }
    catch {
        showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ', 'error');
    }
};
const bindCategoryEvents = () => {
    const openBtn = document.getElementById('openAddCategoryModalBtn');
    if (openBtn) {
        openBtn.addEventListener('click', () => openAddCategoryModal());
    }
    const iconInput = document.getElementById('catIconInput');
    const preview = document.getElementById('catIconPreview');
    if (iconInput && preview) {
        iconInput.addEventListener('input', () => {
            const cls = iconInput.value.trim() || 'ri-folder-line';
            preview.innerHTML = `<i class="${cls}"></i>`;
        });
    }
    const form = document.getElementById('categoryForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editId = document.getElementById('editCategoryId')?.value;
            const id = document.getElementById('catIdInput')?.value.trim();
            const name = document.getElementById('catNameInput')?.value.trim();
            const icon = document.getElementById('catIconInput')?.value.trim() || 'ri-folder-line';
            if (!name) {
                showToast('Lỗi', 'Vui lòng nhập tên danh mục', 'warning');
                return;
            }
            try {
                const url = editId ? `${API_BASE}/api/categories/${editId}` : `${API_BASE}/api/categories`;
                const method = editId ? 'PUT' : 'POST';
                const res = await fetch(url, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${state.token}`
                    },
                    body: JSON.stringify({ id, name, icon })
                });
                const result = await res.json();
                if (result.success) {
                    showToast('Thành công', editId ? 'Cập nhật danh mục thành công' : 'Đã thêm danh mục mới', 'success');
                    const m = document.getElementById('categoryModal');
                    if (m)
                        m.classList.remove('active');
                    loadCategories();
                }
                else {
                    showToast('Lỗi', result.message || 'Không thể lưu danh mục', 'error');
                }
            }
            catch {
                showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ', 'error');
            }
        });
    }
};
const loadVouchers = async () => {
    try {
        const res = await fetch(`${API_BASE}/api/orders/vouchers/all`, {
            headers: { Authorization: `Bearer ${state.token}` }
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
            state.vouchers = data.data;
            renderVouchers();
        }
    }
    catch { }
};
const renderVouchers = () => {
    const tbody = document.getElementById('vouchersTableBody');
    if (!tbody)
        return;
    if (state.vouchers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 30px;">Chưa có mã giảm giá nào</td></tr>`;
        return;
    }
    tbody.innerHTML = state.vouchers.map(v => {
        const isPercent = v.discountType === 'percent';
        const discountLabel = isPercent ? `${v.discountValue}%` : formatPrice(v.discountValue);
        const minOrderLabel = v.minOrderValue ? formatPrice(v.minOrderValue) : 'Không yêu cầu';
        const maxDiscountLabel = isPercent && v.maxDiscount ? formatPrice(v.maxDiscount) : (isPercent ? 'Không giới hạn' : '—');
        const usageLabel = `${v.usedCount || 0} / ${v.usageLimit || '∞'}`;
        const expiresLabel = v.expiresAt ? formatDate(v.expiresAt) : 'Vô thời hạn';
        const isExpired = v.expiresAt ? new Date(v.expiresAt) < new Date() : false;
        const isActive = Boolean(v.isActive) && !isExpired;
        const statusBadge = isExpired
            ? `<span class="badge" style="background: #fee2e2; color: #dc2626; border: 1px solid #fecdd3;">Hết hạn</span>`
            : (isActive
                ? `<span class="badge" style="background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0;"><i class="ri-checkbox-circle-fill"></i> Hoạt động</span>`
                : `<span class="badge" style="background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0;">Tạm tắt</span>`);
        return `
      <tr>
        <td>
          <span style="font-family: monospace; font-weight: 800; font-size: 0.9375rem; background: #fff7ed; color: #c2410c; border: 1px dashed #fdba74; padding: 4px 8px; border-radius: 6px;">
            ${v.code}
          </span>
        </td>
        <td>
          <div style="font-weight: 700; color: var(--text-main); font-size: 0.875rem;">${v.name}</div>
          ${v.description ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${v.description}</div>` : ''}
        </td>
        <td>
          <span style="font-weight: 700; color: #dc2626; font-size: 0.9375rem;">
            -${discountLabel}
          </span>
          <span style="font-size: 0.72rem; color: var(--text-muted); display: block;">(${isPercent ? 'Phần trăm' : 'Tiền mặt'})</span>
        </td>
        <td style="font-size: 0.8125rem;">${minOrderLabel}</td>
        <td style="font-size: 0.8125rem;">${maxDiscountLabel}</td>
        <td>
          <span style="font-weight: 600; font-size: 0.8125rem;">${usageLabel}</span>
        </td>
        <td style="font-size: 0.8125rem; color: ${isExpired ? '#dc2626' : 'var(--text-muted)'};">${expiresLabel}</td>
        <td>${statusBadge}</td>
        <td>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button type="button" class="btn btn-outline btn-sm toggle-voucher-btn" data-code="${v.code}" data-active="${v.isActive ? '1' : '0'}" style="padding: 4px 8px;" title="${v.isActive ? 'Tắt voucher' : 'Bật voucher'}">
              <i class="${v.isActive ? 'ri-eye-off-line' : 'ri-eye-line'}"></i>
            </button>
            <button type="button" class="btn btn-outline btn-sm edit-voucher-btn" data-code="${v.code}" style="padding: 4px 8px;" title="Chỉnh sửa">
              <i class="ri-edit-line"></i>
            </button>
            <button type="button" class="btn btn-outline btn-sm delete-voucher-btn" data-code="${v.code}" style="padding: 4px 8px; color: #ef4444; border-color: #fecdd3;" title="Xóa voucher">
              <i class="ri-delete-bin-line"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
    }).join('');
    tbody.querySelectorAll('.edit-voucher-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const code = btn.getAttribute('data-code');
            const v = state.vouchers.find(item => item.code === code);
            if (v)
                openEditVoucherModal(v);
        });
    });
    tbody.querySelectorAll('.toggle-voucher-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const code = btn.getAttribute('data-code');
            const active = btn.getAttribute('data-active') === '1';
            if (code)
                toggleVoucherStatus(code, active);
        });
    });
    tbody.querySelectorAll('.delete-voucher-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const code = btn.getAttribute('data-code');
            if (code)
                deleteVoucher(code);
        });
    });
};
const openAddVoucherModal = () => {
    const modal = document.getElementById('voucherModal');
    const title = document.getElementById('voucherModalTitle');
    const isEdit = document.getElementById('voucherIsEdit');
    const codeInput = document.getElementById('voucherCodeInput');
    const nameInput = document.getElementById('voucherNameInput');
    const discType = document.getElementById('voucherDiscountType');
    const discVal = document.getElementById('voucherDiscountValue');
    const discValLabel = document.getElementById('voucherDiscountValueLabel');
    const minOrder = document.getElementById('voucherMinOrderValue');
    const maxDisc = document.getElementById('voucherMaxDiscount');
    const limit = document.getElementById('voucherUsageLimit');
    const expires = document.getElementById('voucherExpiresAt');
    const desc = document.getElementById('voucherDescription');
    const isActive = document.getElementById('voucherIsActive');
    if (title)
        title.textContent = 'Tạo Mã Giảm Giá Mới';
    if (isEdit)
        isEdit.value = '0';
    if (codeInput) {
        codeInput.value = '';
        codeInput.removeAttribute('disabled');
    }
    if (nameInput)
        nameInput.value = '';
    if (discType)
        discType.value = 'fixed';
    if (discVal)
        discVal.value = '';
    if (discValLabel)
        discValLabel.textContent = 'Mức giảm (VND)';
    if (minOrder)
        minOrder.value = '0';
    if (maxDisc)
        maxDisc.value = '';
    if (limit)
        limit.value = '1000';
    if (expires)
        expires.value = '';
    if (desc)
        desc.value = '';
    if (isActive)
        isActive.checked = true;
    if (modal)
        modal.classList.add('active');
};
const openEditVoucherModal = (v) => {
    const modal = document.getElementById('voucherModal');
    const title = document.getElementById('voucherModalTitle');
    const isEdit = document.getElementById('voucherIsEdit');
    const codeInput = document.getElementById('voucherCodeInput');
    const nameInput = document.getElementById('voucherNameInput');
    const discType = document.getElementById('voucherDiscountType');
    const discVal = document.getElementById('voucherDiscountValue');
    const discValLabel = document.getElementById('voucherDiscountValueLabel');
    const minOrder = document.getElementById('voucherMinOrderValue');
    const maxDisc = document.getElementById('voucherMaxDiscount');
    const limit = document.getElementById('voucherUsageLimit');
    const expires = document.getElementById('voucherExpiresAt');
    const desc = document.getElementById('voucherDescription');
    const isActive = document.getElementById('voucherIsActive');
    if (title)
        title.textContent = `Chỉnh Sửa Voucher [${v.code}]`;
    if (isEdit)
        isEdit.value = '1';
    if (codeInput) {
        codeInput.value = v.code;
        codeInput.setAttribute('disabled', 'true');
    }
    if (nameInput)
        nameInput.value = v.name;
    if (discType)
        discType.value = v.discountType || 'fixed';
    if (discVal)
        discVal.value = (v.discountValue || 0).toString();
    if (discValLabel)
        discValLabel.textContent = v.discountType === 'percent' ? 'Mức giảm (%)' : 'Mức giảm (VND)';
    if (minOrder)
        minOrder.value = (v.minOrderValue || 0).toString();
    if (maxDisc)
        maxDisc.value = v.maxDiscount ? v.maxDiscount.toString() : '';
    if (limit)
        limit.value = (v.usageLimit || 1000).toString();
    if (expires) {
        if (v.expiresAt) {
            const d = new Date(v.expiresAt);
            const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            expires.value = iso;
        }
        else {
            expires.value = '';
        }
    }
    if (desc)
        desc.value = v.description || '';
    if (isActive)
        isActive.checked = Boolean(v.isActive);
    if (modal)
        modal.classList.add('active');
};
const toggleVoucherStatus = async (code, currentStatus) => {
    try {
        const res = await fetch(`${API_BASE}/api/orders/vouchers/${code}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${state.token}`
            },
            body: JSON.stringify({ isActive: !currentStatus })
        });
        const result = await res.json();
        if (result.success) {
            showToast('Thành công', `Đã ${!currentStatus ? 'kích hoạt' : 'tạm tắt'} voucher ${code}`, 'success');
            loadVouchers();
        }
    }
    catch {
        showToast('Lỗi', 'Không thể thay đổi trạng thái voucher', 'error');
    }
};
const deleteVoucher = async (code) => {
    if (!confirm(`Bạn có chắc muốn xóa mã voucher "${code}"?`))
        return;
    try {
        const res = await fetch(`${API_BASE}/api/orders/vouchers/${code}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${state.token}` }
        });
        const result = await res.json();
        if (result.success) {
            showToast('Thành công', 'Đã xóa voucher thành công', 'success');
            loadVouchers();
        }
        else {
            showToast('Lỗi', result.message || 'Không thể xóa voucher', 'error');
        }
    }
    catch {
        showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ', 'error');
    }
};
const bindVoucherEvents = () => {
    const openBtn = document.getElementById('openAddVoucherModalBtn');
    if (openBtn) {
        openBtn.addEventListener('click', () => openAddVoucherModal());
    }
    const discType = document.getElementById('voucherDiscountType');
    const discValLabel = document.getElementById('voucherDiscountValueLabel');
    if (discType && discValLabel) {
        discType.addEventListener('change', () => {
            discValLabel.textContent = discType.value === 'percent' ? 'Mức giảm (%)' : 'Mức giảm (VND)';
        });
    }
    const form = document.getElementById('voucherForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const isEdit = document.getElementById('voucherIsEdit')?.value === '1';
            const code = document.getElementById('voucherCodeInput')?.value.trim().toUpperCase() || '';
            const name = document.getElementById('voucherNameInput')?.value.trim() || '';
            const discountType = document.getElementById('voucherDiscountType')?.value || 'fixed';
            const discountValue = parseFloat(document.getElementById('voucherDiscountValue')?.value || '0');
            const minOrderValue = parseFloat(document.getElementById('voucherMinOrderValue')?.value || '0');
            const maxDiscountRaw = document.getElementById('voucherMaxDiscount')?.value;
            const maxDiscount = maxDiscountRaw ? parseFloat(maxDiscountRaw) : null;
            const usageLimit = parseInt(document.getElementById('voucherUsageLimit')?.value || '1000', 10);
            const expiresAt = document.getElementById('voucherExpiresAt')?.value || null;
            const description = document.getElementById('voucherDescription')?.value.trim() || '';
            const isActive = document.getElementById('voucherIsActive')?.checked ? 1 : 0;
            if (!code || !name) {
                showToast('Lỗi', 'Vui lòng nhập mã code và tên voucher', 'warning');
                return;
            }
            if (discountValue <= 0) {
                showToast('Lỗi', 'Mức giảm phải lớn hơn 0', 'warning');
                return;
            }
            const payload = {
                code,
                name,
                discountType,
                discountValue,
                minOrderValue,
                maxDiscount,
                usageLimit,
                expiresAt,
                description,
                isActive
            };
            try {
                const url = isEdit ? `${API_BASE}/api/orders/vouchers/${code}` : `${API_BASE}/api/orders/vouchers`;
                const method = isEdit ? 'PUT' : 'POST';
                const res = await fetch(url, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${state.token}`
                    },
                    body: JSON.stringify(payload)
                });
                const result = await res.json();
                if (result.success) {
                    showToast('Thành công', isEdit ? 'Cập nhật voucher thành công' : 'Đã tạo mã giảm giá mới', 'success');
                    const m = document.getElementById('voucherModal');
                    if (m)
                        m.classList.remove('active');
                    loadVouchers();
                }
                else {
                    showToast('Lỗi', result.message || 'Không thể lưu voucher', 'error');
                }
            }
            catch {
                showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ', 'error');
            }
        });
    }
};
const loadOrders = async () => {
    try {
        const res = await fetch(`${API_BASE}/api/orders`, {
            headers: { Authorization: `Bearer ${state.token}` }
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
            state.orders = data.data;
            renderOrders();
            updateKPIs();
        }
    }
    catch { }
};
const renderOrders = () => {
    const tbody = document.getElementById('ordersTableBody');
    const filterSelect = document.getElementById('filterOrderStatus');
    if (!tbody)
        return;
    const filter = filterSelect ? filterSelect.value : '';
    const filtered = filter ? state.orders.filter(o => o.status === filter) : state.orders;
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">Không có đơn hàng nào</td></tr>`;
        return;
    }
    tbody.innerHTML = filtered.map((o) => {
        const statusMap = {
            completed: { label: 'Hoàn tất', class: 'status-completed' },
            processing: { label: 'Đang xử lý', class: 'status-processing' },
            pending: { label: 'Chờ xử lý', class: 'status-pending' },
            cancelled: { label: 'Đã hủy', class: 'status-cancelled' }
        };
        const s = statusMap[o.status] || { label: o.status, class: 'status-pending' };
        const methodLower = (o.paymentMethod || '').toLowerCase();
        let methodBadge = `<span class="pay-badge">${(o.paymentMethod || 'COD').toUpperCase()}</span>`;
        if (methodLower === 'momo') {
            methodBadge = `<span class="pay-badge" style="background:#fce7f3;color:#be185d;border:1px solid #fbcfe8;"><i class="ri-wallet-3-line"></i> MoMo</span>`;
        }
        else if (methodLower === 'sepay' || methodLower === 'vietqr') {
            methodBadge = `<span class="pay-badge" style="background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;"><i class="ri-qr-code-line"></i> SePay QR</span>`;
        }
        else if (methodLower === 'banking') {
            methodBadge = `<span class="pay-badge" style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;"><i class="ri-bank-line"></i> Banking</span>`;
        }
        const isPaid = o.paymentStatus === 'paid';
        const payStatusBadge = isPaid
            ? `<div style="font-size: 0.72rem; color: #16a34a; font-weight: 700; margin-top: 3px;"><i class="ri-checkbox-circle-fill"></i> Đã thanh toán</div>`
            : `<div style="font-size: 0.72rem; color: #d97706; font-weight: 700; margin-top: 3px;"><i class="ri-time-line"></i> Chưa thanh toán</div>`;
        const ghnStatusInfo = o.ghnStatus ? (GHN_STATUS_MAP[o.ghnStatus] || { label: o.ghnStatus, color: '#0369a1', bg: '#e0f2fe' }) : null;
        const ghnInfo = o.ghnOrderCode
            ? `<div style="margin-top: 5px;">
           <a href="https://tracking.ghn.vn/?order_code=${o.ghnOrderCode}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:3px;font-size:0.7rem;background:#fff7ed;color:#c2410c;border:1px solid #fdba74;padding:2px 6px;border-radius:4px;text-decoration:none;font-weight:600;" title="Tra cứu vận đơn GHN">
             <i class="ri-truck-line"></i> GHN: ${o.ghnOrderCode}
           </a>
           ${ghnStatusInfo ? `<div style="font-size: 0.68rem; color: ${ghnStatusInfo.color}; font-weight: 600; margin-top: 2px;"><i class="ri-radar-line"></i> ${ghnStatusInfo.label}</div>` : ''}
         </div>`
            : '';
        return `
      <tr>
        <td style="font-weight: 700;">#${o.id}</td>
        <td>${o.customerName}</td>
        <td>${o.customerPhone}</td>
        <td style="font-weight: 700; color: var(--text-main);">
          ${formatPrice(o.totalAmount)}
          ${o.voucherCode ? `<div style="font-size: 0.72rem; color: #16a34a; font-weight: 600; margin-top: 2px;"><i class="ri-coupon-3-line"></i> ${o.voucherCode} (-${formatPrice(o.discountAmount || 0)})</div>` : ''}
          ${o.shippingFee ? `<div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Ship: +${formatPrice(o.shippingFee)}</div>` : ''}
        </td>
        <td>
          ${methodBadge}
          ${payStatusBadge}
        </td>
        <td>
          <span class="order-status-badge ${s.class}">${s.label}</span>
          ${ghnInfo}
        </td>
        <td style="font-size: 0.8125rem; color: var(--text-muted);">${formatDate(o.createdAt)}</td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-outline btn-sm view-order-btn" data-id="${o.id}" type="button"><i class="ri-edit-line"></i> Chi tiết & Sửa</button>
            <select class="form-select form-select-sm change-order-status-select" data-id="${o.id}">
              <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Chờ</option>
              <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>Đang giao</option>
              <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>Hoàn tất</option>
              <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Hủy</option>
            </select>
          </div>
        </td>
      </tr>
    `;
    }).join('');
    tbody.querySelectorAll('.view-order-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const found = state.orders.find(o => o.id.toString() === id);
            if (found)
                showOrderDetail(found);
        });
    });
    tbody.querySelectorAll('.change-order-status-select').forEach((sel) => {
        sel.addEventListener('change', async () => {
            const id = sel.getAttribute('data-id');
            const newStatus = sel.value;
            try {
                const res = await fetch(`${API_BASE}/api/orders/${id}/status`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${state.token}`
                    },
                    body: JSON.stringify({ status: newStatus })
                });
                const result = await res.json();
                if (result.success) {
                    showToast('Thành công', 'Đã cập nhật trạng thái đơn hàng', 'success');
                    loadOrders();
                }
            }
            catch {
                showToast('Lỗi', 'Không thể đổi trạng thái đơn', 'error');
            }
        });
    });
};
const showOrderDetail = (order) => {
    const modal = document.getElementById('orderDetailModal');
    const title = document.getElementById('orderDetailTitle');
    const content = document.getElementById('orderDetailContent');
    if (!modal || !title || !content)
        return;
    title.textContent = `Quản Lý & Chỉnh Sửa Đơn Hàng #${order.id}`;
    let currentItems = Array.isArray(order.items)
        ? JSON.parse(JSON.stringify(order.items))
        : [];
    let filterItemIndex = -1;
    const renderModalContent = () => {
        const totalAmount = currentItems.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
        const voucherDiscount = Number(order.discountAmount) || 0;
        const finalAmount = Math.max(0, totalAmount - voucherDiscount);
        const displayedItems = filterItemIndex >= 0 && filterItemIndex < currentItems.length
            ? [currentItems[filterItemIndex]]
            : currentItems;
        content.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
        <!-- Card 1: Thông tin người nhận -->
        <div class="order-edit-section" style="margin-bottom: 0;">
          <div class="order-edit-title">
            <span><i class="ri-user-location-line"></i> Thông Tin Người Nhận</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div>
              <label class="form-label" style="font-size: 0.8125rem;">Họ và tên</label>
              <input type="text" id="editCustomerName" class="form-input form-input-sm" value="${order.customerName || ''}" required>
            </div>
            <div>
              <label class="form-label" style="font-size: 0.8125rem;">Số điện thoại</label>
              <input type="text" id="editCustomerPhone" class="form-input form-input-sm" value="${order.customerPhone || ''}" required>
            </div>
            <div>
              <label class="form-label" style="font-size: 0.8125rem;">Địa chỉ giao hàng</label>
              <input type="text" id="editShippingAddress" class="form-input form-input-sm" value="${order.shippingAddress || ''}" required>
            </div>
          </div>
        </div>

        <!-- Card 2: Trạng thái & Thanh toán -->
        <div class="order-edit-section" style="margin-bottom: 0;">
          <div class="order-edit-title">
            <span><i class="ri-bank-card-line"></i> Trạng Thái & Thanh Toán</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">Ngày đặt: ${formatDate(order.createdAt)}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div>
              <label class="form-label" style="font-size: 0.8125rem;">Trạng thái đơn hàng</label>
              <select id="editStatusSelect" class="form-select form-select-sm">
                <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Chờ xử lý</option>
                <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Đang giao hàng</option>
                <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Hoàn tất</option>
                <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Đã hủy</option>
              </select>
            </div>
            <div>
              <label class="form-label" style="font-size: 0.8125rem;">Phương thức thanh toán</label>
              <select id="editPaymentMethodSelect" class="form-select form-select-sm">
                <option value="cod" ${order.paymentMethod === 'cod' ? 'selected' : ''}>Thanh toán khi nhận hàng (COD)</option>
                <option value="sepay" ${order.paymentMethod === 'sepay' || order.paymentMethod === 'vietqr' ? 'selected' : ''}>SePay (VietQR)</option>
                <option value="momo" ${order.paymentMethod === 'momo' ? 'selected' : ''}>Ví điện tử MoMo</option>
                <option value="banking" ${order.paymentMethod === 'banking' ? 'selected' : ''}>Chuyển khoản ngân hàng</option>
                <option value="vnpay" ${order.paymentMethod === 'vnpay' ? 'selected' : ''}>Cổng thanh toán VNPAY</option>
              </select>
            </div>
            <div>
              <label class="form-label" style="font-size: 0.8125rem;">Trạng thái thanh toán</label>
              <select id="editPaymentStatusSelect" class="form-select form-select-sm">
                <option value="pending" ${order.paymentStatus === 'pending' || !order.paymentStatus ? 'selected' : ''}>Chờ thanh toán (Pending)</option>
                <option value="paid" ${order.paymentStatus === 'paid' ? 'selected' : ''}>Đã thanh toán (Paid)</option>
                <option value="failed" ${order.paymentStatus === 'failed' ? 'selected' : ''}>Thất bại (Failed)</option>
                <option value="refunded" ${order.paymentStatus === 'refunded' ? 'selected' : ''}>Hoàn tiền (Refunded)</option>
              </select>
            </div>
            <div style="background: #ffffff; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-light); margin-top: 4px;">
              <div style="display: flex; justify-content: space-between; font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 2px;">
                <span>Tiền hàng:</span>
                <span>${formatPrice(totalAmount)}</span>
              </div>
              ${order.shippingFee ? `
                <div style="display: flex; justify-content: space-between; font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 2px;">
                  <span>Phí giao hàng (GHN):</span>
                  <span>+${formatPrice(order.shippingFee)}</span>
                </div>
              ` : ''}
              ${order.voucherCode ? `
                <div style="display: flex; justify-content: space-between; font-size: 0.8125rem; color: #16a34a; font-weight: 600; margin-bottom: 2px;">
                  <span><i class="ri-coupon-3-line"></i> Mã voucher (${order.voucherCode}):</span>
                  <span>-${formatPrice(voucherDiscount)}</span>
                </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; font-size: 0.8125rem; color: var(--text-muted); padding-top: 4px; border-top: 1px dashed var(--border-light); align-items: baseline;">
                <span style="font-weight: 700;">Tổng thanh toán:</span>
                <span id="editOrderTotalBadge" style="font-size: 1.25rem; font-weight: 800; color: var(--primary);">${formatPrice(finalAmount + (Number(order.shippingFee) || 0))}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="order-edit-section" style="margin-bottom: 20px; background: #fffaf0; border: 1px solid #feebc8; border-radius: 8px; padding: 14px 18px;">
        <div class="order-edit-title" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #fed7aa; padding-bottom: 8px;">
          <span style="color: #c2410c; font-weight: 700; font-size: 0.95rem;"><i class="ri-truck-line"></i> Vận Đơn Giao Hàng Nhanh (GHN)</span>
          ${order.ghnOrderCode ? `
            <a href="https://tracking.ghn.vn/?order_code=${order.ghnOrderCode}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline" style="border-color: #ea580c; color: #ea580c; text-decoration: none; padding: 3px 8px; font-size: 0.75rem;">
              <i class="ri-external-link-line"></i> Tra cứu vận đơn GHN
            </a>
          ` : ''}
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; font-size: 0.8125rem;">
          <div>
            <span style="color: var(--text-muted); display: block; margin-bottom: 2px;">Mã vận đơn GHN:</span>
            <strong style="color: #ea580c; font-size: 0.95rem;">${order.ghnOrderCode || 'Chưa tạo vận đơn'}</strong>
          </div>
          <div>
            <span style="color: var(--text-muted); display: block; margin-bottom: 2px;">Trạng thái vận chuyển GHN:</span>
            <span>
              ${order.ghnStatus ? `
                <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.75rem; background: ${GHN_STATUS_MAP[order.ghnStatus]?.bg || '#e0f2fe'}; color: ${GHN_STATUS_MAP[order.ghnStatus]?.color || '#0284c7'};">
                  ${GHN_STATUS_MAP[order.ghnStatus]?.label || order.ghnStatus}
                </span>
              ` : '<span style="color: var(--text-muted);">Chưa có</span>'}
            </span>
          </div>
          <div>
            <span style="color: var(--text-muted); display: block; margin-bottom: 2px;">Cước vận chuyển:</span>
            <strong>${order.shippingFee ? formatPrice(order.shippingFee) : '0 ₫'}</strong>
          </div>
          <div>
            <span style="color: var(--text-muted); display: block; margin-bottom: 2px;">Giao dự kiến:</span>
            <strong>${order.ghnExpectedDelivery ? formatDate(order.ghnExpectedDelivery) : 'Đang cập nhật'}</strong>
          </div>
        </div>
        ${order.ghnOrderCode ? `
          <div style="margin-top: 12px; display: flex; align-items: center; justify-content: flex-end; gap: 8px; border-top: 1px dashed #fed7aa; padding-top: 10px;">
            <button type="button" id="adminSyncGhnBtn" class="btn btn-sm btn-outline" style="border-color: #2563eb; color: #2563eb; font-weight: 600; padding: 4px 12px;">
              <i class="ri-refresh-line"></i> Đồng bộ trạng thái từ GHN
            </button>
          </div>
        ` : `
          <div style="margin-top: 14px; border-top: 1px dashed #fed7aa; padding-top: 14px;">
            <div style="font-weight: 700; color: #9a3412; font-size: 0.85rem; margin-bottom: 8px;">
              <i class="ri-scales-3-line"></i> Thông số kiện hàng & Trọng lượng gửi GHN:
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 12px;">
              <div>
                <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 3px;">Trọng lượng (gram):</label>
                <input type="number" id="adminGhnWeight" class="form-input form-input-sm" value="${Math.max(100, currentItems.reduce((acc, it) => acc + (Number(it.weight) || 300) * (it.quantity || 1), 0))}" min="50" step="50" style="width: 100%;">
              </div>
              <div>
                <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 3px;">Dài (cm):</label>
                <input type="number" id="adminGhnLength" class="form-input form-input-sm" value="20" min="1" style="width: 100%;">
              </div>
              <div>
                <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 3px;">Rộng (cm):</label>
                <input type="number" id="adminGhnWidth" class="form-input form-input-sm" value="15" min="1" style="width: 100%;">
              </div>
              <div>
                <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 3px;">Cao (cm):</label>
                <input type="number" id="adminGhnHeight" class="form-input form-input-sm" value="10" min="1" style="width: 100%;">
              </div>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); margin: 0;">Lưu ý giao hàng:</label>
                <select id="adminGhnRequiredNote" class="form-select form-select-sm" style="font-size: 0.75rem; padding: 3px 8px; width: auto;">
                  <option value="CHOXEMHANGKHONGTHU">Cho xem hàng không cho thử</option>
                  <option value="CHOXEMHANG">Cho xem hàng và cho thử</option>
                  <option value="KHONGCHOXEMHANG">Không cho xem hàng</option>
                </select>
              </div>
              <button type="button" id="adminCreateGhnBtn" class="btn btn-sm btn-primary" style="background: #ea580c; border-color: #ea580c; white-space: nowrap;">
                <i class="ri-truck-line"></i> Tạo vận đơn GHN
              </button>
            </div>
          </div>
        `}
      </div>

      <!-- Section: Chỉnh sửa các món trong đơn hàng -->
      <div class="order-edit-section">
        <div class="order-edit-title">
          <span><i class="ri-shopping-bag-3-line"></i> Danh Sách Món Trong Đơn (${currentItems.length} món)</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <label style="font-size: 0.8125rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0;">Lọc/Chọn món:</label>
            <select id="orderItemFilterDropdown" class="form-select form-select-sm" style="width: auto; min-width: 180px;">
              <option value="-1" ${filterItemIndex === -1 ? 'selected' : ''}>Tất cả các món (${currentItems.length})</option>
              ${currentItems.map((it, idx) => `
                <option value="${idx}" ${filterItemIndex === idx ? 'selected' : ''}>Món ${idx + 1}: ${it.name} ${it.variantName ? '(' + it.variantName + ')' : ''}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <div class="order-items-list" id="orderItemsEditList">
          ${displayedItems.length === 0 ? `
            <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 0.875rem;">
              Đơn hàng chưa có món nào. Vui lòng thêm sản phẩm vào đơn hàng bên dưới.
            </div>
          ` : displayedItems.map((it) => {
            const realIdx = filterItemIndex >= 0 ? filterItemIndex : currentItems.indexOf(it);
            const matchedProd = state.products.find(p => String(p.id) === String(it.productId) || p.name === it.name);
            const prodVariants = matchedProd && Array.isArray(matchedProd.variants) ? matchedProd.variants : [];
            return `
              <div class="order-item-edit-card ${filterItemIndex === realIdx ? 'highlighted' : ''}" data-index="${realIdx}">
                <img src="${it.imageUrl || (matchedProd ? matchedProd.imageUrl : 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80')}" class="order-item-thumb">
                <div class="order-item-details">
                  <div class="order-item-name" title="${it.name}">#${realIdx + 1}. ${it.name}</div>
                  <div class="order-item-variant-row">
                    ${prodVariants.length > 0 ? `
                      <span style="font-size: 0.75rem; color: var(--text-muted);">Phân loại:</span>
                      <select class="order-item-variant-select" data-index="${realIdx}">
                        ${prodVariants.map(v => {
                const vName = `${v.color} - ${v.type}`;
                const isSel = (it.variantId && String(v.id) === String(it.variantId)) || it.variantName === vName;
                return `<option value="${v.id}" data-price="${v.price}" data-name="${vName}" ${isSel ? 'selected' : ''}>${vName} (${formatPrice(v.price)})</option>`;
            }).join('')}
                      </select>
                    ` : `
                      <span style="font-size: 0.75rem; color: var(--text-muted);">Phân loại:</span>
                      <input type="text" class="form-input form-input-sm order-item-custom-variant" data-index="${realIdx}" value="${it.variantName || 'Tiêu chuẩn'}" style="width: 130px; padding: 2px 6px; font-size: 0.75rem;">
                    `}
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 0.75rem; color: var(--text-muted);">Số lượng:</span>
                  <div class="order-item-qty-wrap">
                    <button type="button" class="order-item-qty-btn dec-btn" data-index="${realIdx}">-</button>
                    <input type="number" min="1" class="order-item-qty-input" data-index="${realIdx}" value="${it.quantity}">
                    <button type="button" class="order-item-qty-btn inc-btn" data-index="${realIdx}">+</button>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                  <span style="font-size: 0.75rem; color: var(--text-muted);">Đơn giá:</span>
                  <input type="number" min="0" class="form-input form-input-sm order-item-price-input" data-index="${realIdx}" value="${it.price}" style="width: 100px; padding: 4px 6px;">
                </div>
                <div class="order-item-price-wrap">
                  <div class="order-item-subtotal">${formatPrice(it.price * it.quantity)}</div>
                  <div class="order-item-unitprice">${formatPrice(it.price)}/món</div>
                </div>
                <button type="button" class="btn btn-outline btn-sm delete-order-item-btn" data-index="${realIdx}" style="color: #ef4444; border-color: #fecdd3; padding: 6px 10px;" title="Xóa món này">
                  <i class="ri-delete-bin-line"></i>
                </button>
              </div>
            `;
        }).join('')}
        </div>

        <!-- Box thêm món mới vào đơn -->
        <div class="order-add-item-card">
          <div>
            <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 2px;">Thêm sản phẩm:</label>
            <select id="addOrderItemProductSelect" class="form-select form-select-sm">
              <option value="">-- Chọn sản phẩm thêm vào đơn --</option>
              ${state.products.map(p => `
                <option value="${p.id}">${p.name} - ${formatPrice(p.price)}</option>
              `).join('')}
            </select>
          </div>
          <div>
            <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 2px;">Phân loại (Biến thể):</label>
            <select id="addOrderItemVariantSelect" class="form-select form-select-sm" disabled>
              <option value="">-- Chọn biến thể --</option>
            </select>
          </div>
          <div>
            <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 2px;">Số lượng:</label>
            <input type="number" id="addOrderItemQtyInput" min="1" value="1" class="form-input form-input-sm">
          </div>
          <div>
            <label style="font-size: 0.75rem; display: block; margin-bottom: 2px; visibility: hidden;">Thao tác</label>
            <button type="button" id="addOrderItemBtn" class="btn btn-outline btn-sm" style="border-color: var(--primary); color: var(--primary); font-weight: 600;">
              <i class="ri-add-line"></i> Thêm món
            </button>
          </div>
        </div>
      </div>

      <div style="display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 20px;">
        <button type="button" class="btn btn-outline btn-md" data-close-modal="orderDetailModal">Hủy bỏ</button>
        <button type="button" id="saveOrderChangesBtn" class="btn btn-primary btn-md">
          <i class="ri-save-3-line"></i> Lưu Thay Đổi Đơn Hàng
        </button>
      </div>
    `;
        bindModalEvents();
    };
    const bindModalEvents = () => {
        const filterSelect = document.getElementById('orderItemFilterDropdown');
        if (filterSelect) {
            filterSelect.addEventListener('change', () => {
                filterItemIndex = parseInt(filterSelect.value, 10);
                renderModalContent();
            });
        }
        content.querySelectorAll('.order-item-variant-select').forEach((sel) => {
            sel.addEventListener('change', () => {
                const idx = parseInt(sel.getAttribute('data-index') || '-1', 10);
                const selOption = sel.selectedOptions[0];
                if (idx >= 0 && selOption) {
                    const varId = selOption.value;
                    const varPrice = parseFloat(selOption.getAttribute('data-price') || '0');
                    const varName = selOption.getAttribute('data-name') || '';
                    currentItems[idx].variantId = varId;
                    currentItems[idx].variantName = varName;
                    if (varPrice > 0)
                        currentItems[idx].price = varPrice;
                    renderModalContent();
                }
            });
        });
        content.querySelectorAll('.order-item-custom-variant').forEach((inp) => {
            inp.addEventListener('change', () => {
                const idx = parseInt(inp.getAttribute('data-index') || '-1', 10);
                if (idx >= 0) {
                    currentItems[idx].variantName = inp.value.trim();
                }
            });
        });
        content.querySelectorAll('.dec-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-index') || '-1', 10);
                if (idx >= 0 && currentItems[idx].quantity > 1) {
                    currentItems[idx].quantity -= 1;
                    renderModalContent();
                }
            });
        });
        content.querySelectorAll('.inc-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-index') || '-1', 10);
                if (idx >= 0) {
                    currentItems[idx].quantity += 1;
                    renderModalContent();
                }
            });
        });
        content.querySelectorAll('.order-item-qty-input').forEach((inp) => {
            inp.addEventListener('change', () => {
                const idx = parseInt(inp.getAttribute('data-index') || '-1', 10);
                const val = parseInt(inp.value || '1', 10);
                if (idx >= 0) {
                    currentItems[idx].quantity = val > 0 ? val : 1;
                    renderModalContent();
                }
            });
        });
        content.querySelectorAll('.order-item-price-input').forEach((inp) => {
            inp.addEventListener('change', () => {
                const idx = parseInt(inp.getAttribute('data-index') || '-1', 10);
                const val = parseFloat(inp.value || '0');
                if (idx >= 0) {
                    currentItems[idx].price = val >= 0 ? val : 0;
                    renderModalContent();
                }
            });
        });
        content.querySelectorAll('.delete-order-item-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-index') || '-1', 10);
                if (idx >= 0) {
                    if (currentItems.length <= 1) {
                        showToast('Cảnh báo', 'Đơn hàng phải có ít nhất 1 sản phẩm', 'warning');
                        return;
                    }
                    currentItems.splice(idx, 1);
                    filterItemIndex = -1;
                    renderModalContent();
                }
            });
        });
        const addProdSelect = document.getElementById('addOrderItemProductSelect');
        const addVarSelect = document.getElementById('addOrderItemVariantSelect');
        const addQtyInput = document.getElementById('addOrderItemQtyInput');
        const addBtn = document.getElementById('addOrderItemBtn');
        if (addProdSelect && addVarSelect) {
            addProdSelect.addEventListener('change', () => {
                const pId = addProdSelect.value;
                const matched = state.products.find(p => String(p.id) === pId);
                if (matched && Array.isArray(matched.variants) && matched.variants.length > 0) {
                    addVarSelect.disabled = false;
                    addVarSelect.innerHTML = matched.variants.map(v => `
            <option value="${v.id}" data-price="${v.price}" data-name="${v.color} - ${v.type}">${v.color} - ${v.type} (${formatPrice(v.price)})</option>
          `).join('');
                }
                else {
                    addVarSelect.disabled = true;
                    addVarSelect.innerHTML = `<option value="">-- Mặc định --</option>`;
                }
            });
        }
        if (addBtn && addProdSelect && addVarSelect && addQtyInput) {
            addBtn.addEventListener('click', () => {
                const pId = addProdSelect.value;
                if (!pId) {
                    showToast('Thông báo', 'Vui lòng chọn sản phẩm cần thêm', 'warning');
                    return;
                }
                const matched = state.products.find(p => String(p.id) === pId);
                if (!matched)
                    return;
                const qty = parseInt(addQtyInput.value || '1', 10);
                const selOption = addVarSelect.selectedOptions[0];
                let varId = '';
                let varName = '';
                let price = matched.price;
                if (selOption && !addVarSelect.disabled) {
                    varId = selOption.value;
                    varName = selOption.getAttribute('data-name') || '';
                    const p = parseFloat(selOption.getAttribute('data-price') || '0');
                    if (p > 0)
                        price = p;
                }
                currentItems.push({
                    productId: matched.id,
                    variantId: varId || undefined,
                    name: matched.name,
                    variantName: varName || 'Tiêu chuẩn',
                    price,
                    quantity: qty > 0 ? qty : 1,
                    imageUrl: matched.imageUrl
                });
                filterItemIndex = -1;
                showToast('Thành công', `Đã thêm món "${matched.name}" vào đơn`, 'success');
                renderModalContent();
            });
        }
        content.querySelectorAll('[data-close-modal="orderDetailModal"]').forEach((b) => {
            b.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        });
        const syncGhnBtn = document.getElementById('adminSyncGhnBtn');
        if (syncGhnBtn) {
            syncGhnBtn.addEventListener('click', async () => {
                syncGhnBtn.setAttribute('disabled', 'true');
                syncGhnBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Đang đồng bộ...`;
                try {
                    const res = await fetch(`${API_BASE}/api/orders/${order.id}/ghn/sync`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${state.token}`
                        }
                    });
                    const result = await res.json();
                    if (result.success) {
                        order.ghnStatus = result.data?.ghnStatus || order.ghnStatus;
                        order.ghnExpectedDelivery = result.data?.ghnExpectedDelivery || order.ghnExpectedDelivery;
                        showToast('Thành công', result.message || 'Đã đồng bộ trạng thái mới nhất từ GHN', 'success');
                        renderModalContent();
                        loadOrders();
                    }
                    else {
                        showToast('Lỗi đồng bộ', result.message || 'Không thể đồng bộ từ GHN', 'error');
                        syncGhnBtn.removeAttribute('disabled');
                        syncGhnBtn.innerHTML = `<i class="ri-refresh-line"></i> Đồng bộ trạng thái từ GHN`;
                    }
                }
                catch {
                    showToast('Lỗi', 'Không thể kết nối đến máy chủ', 'error');
                    syncGhnBtn.removeAttribute('disabled');
                    syncGhnBtn.innerHTML = `<i class="ri-refresh-line"></i> Đồng bộ trạng thái từ GHN`;
                }
            });
        }
        const createGhnBtn = document.getElementById('adminCreateGhnBtn');
        if (createGhnBtn) {
            createGhnBtn.addEventListener('click', async () => {
                const weightInput = document.getElementById('adminGhnWeight');
                const lengthInput = document.getElementById('adminGhnLength');
                const widthInput = document.getElementById('adminGhnWidth');
                const heightInput = document.getElementById('adminGhnHeight');
                const reqNoteSelect = document.getElementById('adminGhnRequiredNote');
                const weight = weightInput ? Number(weightInput.value) || 300 : 300;
                const length = lengthInput ? Number(lengthInput.value) || 20 : 20;
                const width = widthInput ? Number(widthInput.value) || 15 : 15;
                const height = heightInput ? Number(heightInput.value) || 10 : 10;
                const required_note = reqNoteSelect ? reqNoteSelect.value : 'CHOXEMHANGKHONGTHU';
                createGhnBtn.setAttribute('disabled', 'true');
                createGhnBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Đang tạo vận đơn GHN...`;
                try {
                    const res = await fetch(`${API_BASE}/api/orders/${order.id}/ghn/create`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${state.token}`
                        },
                        body: JSON.stringify({ weight, length, width, height, required_note })
                    });
                    const result = await res.json();
                    if (result.success) {
                        showToast('Thành công', `Đã tạo vận đơn GHN: ${result.data?.ghnOrderCode || ''}`, 'success');
                        order.ghnOrderCode = result.data?.ghnOrderCode;
                        order.ghnStatus = result.data?.ghnStatus || 'ready_to_pick';
                        order.ghnExpectedDelivery = result.data?.ghnExpectedDelivery;
                        renderModalContent();
                        loadOrders();
                    }
                    else {
                        showToast('Lỗi GHN', result.message || 'Không thể tạo vận đơn GHN', 'error');
                        createGhnBtn.removeAttribute('disabled');
                        createGhnBtn.innerHTML = `<i class="ri-truck-line"></i> Tạo vận đơn GHN`;
                    }
                }
                catch {
                    showToast('Lỗi', 'Không thể kết nối dịch vụ GHN', 'error');
                    createGhnBtn.removeAttribute('disabled');
                    createGhnBtn.innerHTML = `<i class="ri-truck-line"></i> Tạo vận đơn GHN`;
                }
            });
        }
        const saveBtn = document.getElementById('saveOrderChangesBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const customerName = document.getElementById('editCustomerName')?.value.trim() || '';
                const customerPhone = document.getElementById('editCustomerPhone')?.value.trim() || '';
                const shippingAddress = document.getElementById('editShippingAddress')?.value.trim() || '';
                const status = document.getElementById('editStatusSelect')?.value || order.status;
                const paymentMethod = document.getElementById('editPaymentMethodSelect')?.value || order.paymentMethod;
                const paymentStatus = document.getElementById('editPaymentStatusSelect')?.value || order.paymentStatus || 'pending';
                if (!customerName || !customerPhone || !shippingAddress) {
                    showToast('Lỗi', 'Vui lòng điền đầy đủ họ tên, điện thoại và địa chỉ giao hàng', 'error');
                    return;
                }
                if (currentItems.length === 0) {
                    showToast('Lỗi', 'Đơn hàng phải có ít nhất một món', 'error');
                    return;
                }
                saveBtn.setAttribute('disabled', 'true');
                saveBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Đang lưu...`;
                try {
                    const res = await fetch(`${API_BASE}/api/orders/${order.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${state.token}`
                        },
                        body: JSON.stringify({
                            customerName,
                            customerPhone,
                            shippingAddress,
                            paymentMethod,
                            paymentStatus,
                            status,
                            voucherCode: order.voucherCode,
                            discountAmount: order.discountAmount,
                            items: currentItems
                        })
                    });
                    const result = await res.json();
                    if (result.success) {
                        showToast('Thành công', 'Đã lưu toàn bộ thay đổi đơn hàng', 'success');
                        modal.classList.remove('active');
                        loadOrders();
                    }
                    else {
                        showToast('Lỗi', result.message || 'Không thể lưu đơn hàng', 'error');
                        saveBtn.removeAttribute('disabled');
                        saveBtn.innerHTML = `<i class="ri-save-3-line"></i> Lưu Thay Đổi Đơn Hàng`;
                    }
                }
                catch {
                    showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ', 'error');
                    saveBtn.removeAttribute('disabled');
                    saveBtn.innerHTML = `<i class="ri-save-3-line"></i> Lưu Thay Đổi Đơn Hàng`;
                }
            });
        }
    };
    renderModalContent();
    modal.classList.add('active');
};
const loadProducts = async () => {
    try {
        const res = await fetch(`${API_BASE}/api/products`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
            state.products = data.data;
            renderProducts();
            updateKPIs();
        }
    }
    catch { }
};
const renderProducts = () => {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody)
        return;
    if (state.products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">Không có sản phẩm nào</td></tr>`;
        return;
    }
    tbody.innerHTML = state.products.map(p => `
    <tr>
      <td>
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${p.imageUrl}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div>
            <div style="font-weight: 600; font-size: 0.875rem; line-height: 1.3;">${p.name}</div>
            <div style="display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap;">
              ${p.isFlashSale ? `<span style="font-size: 0.6875rem; background: #fef2f2; color: #dc2626; font-weight: 700; padding: 1px 6px; border-radius: 4px; border: 1px solid #fecaca;"><i class="ri-flashlight-fill"></i> Flash Sale -${p.flashSaleDiscount || 0}%</span>` : ''}
              ${p.featured ? `<span style="font-size: 0.6875rem; background: #fefce8; color: #ca8a04; font-weight: 700; padding: 1px 6px; border-radius: 4px; border: 1px solid #fef08a;"><i class="ri-star-fill"></i> Nổi bật</span>` : ''}
            </div>
          </div>
        </div>
      </td>
      <td><span class="pay-badge">${p.category}</span></td>
      <td style="font-weight: 700;">${formatPrice(p.price)}</td>
      <td>
        <div style="display: flex; flex-direction: column; gap: 3px;">
          <span style="font-weight: 700; font-size: 0.875rem; color: ${p.stock === 0 ? '#ef4444' : p.stock <= 10 ? '#d97706' : '#15803d'};">
            ${p.stock > 0 ? `${p.stock.toLocaleString('vi-VN')} cái` : 'Hết hàng'}
          </span>
          ${p.variants && p.variants.length > 0 ? `
            <span style="font-size: 0.6875rem; color: #475569; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; display: inline-block; width: fit-content; font-weight: 600;">
              ${p.variants.length} phân loại
            </span>
          ` : ''}
        </div>
      </td>
      <td>${p.sold || p.soldCount || 0}</td>
      <td>⭐ ${p.rating || '5.0'}</td>
      <td>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-outline btn-sm edit-prod-btn" data-id="${p.id}" type="button">Sửa</button>
          <button class="btn btn-outline btn-sm delete-prod-btn" data-id="${p.id}" style="color: var(--accent); border-color: #fecdd3;" type="button">Xóa</button>
        </div>
      </td>
    </tr>
  `).join('');
    tbody.querySelectorAll('.edit-prod-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const prod = state.products.find(p => p.id.toString() === id);
            if (prod)
                openEditProductModal(prod);
        });
    });
    tbody.querySelectorAll('.delete-prod-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            if (confirm('Bạn có chắc muốn xóa sản phẩm này khỏi hệ thống?')) {
                try {
                    const res = await fetch(`${API_BASE}/api/products/${id}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${state.token}` }
                    });
                    const result = await res.json();
                    if (result.success) {
                        showToast('Thành công', 'Đã xóa sản phẩm', 'success');
                        loadProducts();
                    }
                }
                catch {
                    showToast('Lỗi', 'Không thể xóa sản phẩm', 'error');
                }
            }
        });
    });
};
const openEditProductModal = (p) => {
    const modal = document.getElementById('productModal');
    const editId = document.getElementById('editProductId');
    const nameInput = document.getElementById('prodNameInput');
    const catSelect = document.getElementById('prodCategorySelect');
    const priceInput = document.getElementById('prodPriceInput');
    const origPriceInput = document.getElementById('prodOriginalPriceInput');
    const ratingDisplay = document.getElementById('prodRatingDisplayVal');
    const imgInput = document.getElementById('prodImageInput');
    const descInput = document.getElementById('prodDescInput');
    const weightInput = document.getElementById('prodWeightInput');
    const isFlashSaleInput = document.getElementById('prodIsFlashSaleInput');
    const flashDiscountInput = document.getElementById('prodFlashDiscountInput');
    const featuredInput = document.getElementById('prodFeaturedInput');
    const title = document.getElementById('productModalTitle');
    const btnText = document.getElementById('saveProductBtnText');
    if (editId)
        editId.value = p.id.toString();
    if (nameInput)
        nameInput.value = p.name;
    if (catSelect)
        catSelect.value = p.category;
    if (priceInput)
        priceInput.value = p.price.toString();
    if (origPriceInput)
        origPriceInput.value = p.originalPrice ? p.originalPrice.toString() : '';
    if (ratingDisplay)
        ratingDisplay.textContent = (p.rating || 5.0).toFixed(1);
    if (imgInput)
        imgInput.value = p.imageUrl;
    if (descInput)
        descInput.value = p.description || '';
    if (weightInput)
        weightInput.value = (p.weight || 300).toString();
    if (isFlashSaleInput)
        isFlashSaleInput.checked = Boolean(p.isFlashSale);
    if (flashDiscountInput)
        flashDiscountInput.value = (p.flashSaleDiscount || 0).toString();
    if (featuredInput)
        featuredInput.checked = Boolean(p.featured);
    if (title)
        title.textContent = 'Chỉnh Sửa Sản Phẩm';
    if (btnText)
        btnText.textContent = 'Cập Nhật Sản Phẩm';
    let varsToEdit = p.variants && p.variants.length > 0 ? JSON.parse(JSON.stringify(p.variants)) : [];
    if (varsToEdit.length === 0) {
        varsToEdit = [
            {
                id: `temp_${Date.now()}`,
                color: 'Mặc định',
                type: 'Tiêu chuẩn',
                price: p.price,
                originalPrice: p.originalPrice || p.price,
                stock: p.stock || 50,
                imageUrl: p.imageUrl || ''
            }
        ];
    }
    renderProductVariantsEditor(varsToEdit);
    if (modal)
        modal.classList.add('active');
};
const loadUsers = async () => {
    try {
        const res = await fetch(`${API_BASE}/api/auth/users`, {
            headers: { Authorization: `Bearer ${state.token}` }
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
            state.users = data.data;
            renderUsers();
            updateKPIs();
        }
    }
    catch { }
};
const renderUsers = () => {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody)
        return;
    if (state.users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">Chưa có tài khoản nào</td></tr>`;
        return;
    }
    tbody.innerHTML = state.users.map(u => `
    <tr>
      <td style="font-weight: 700;">#${u.id}</td>
      <td style="font-weight: 600;">${u.name}</td>
      <td>${u.email}</td>
      <td><span class="pay-badge">${u.role ? u.role.toUpperCase() : 'USER'}</span></td>
      <td>${u.phone || '—'}</td>
      <td style="font-size: 0.8125rem;">${u.address || '—'}</td>
      <td style="font-size: 0.8125rem; color: var(--text-muted);">${formatDate(u.createdAt)}</td>
    </tr>
  `).join('');
};
const loadSystemStatus = async () => {
    const grid = document.getElementById('servicesMeshGrid');
    if (!grid)
        return;
    try {
        const res = await fetch(`${API_BASE}/api/health`);
        const data = await res.json();
        const services = [
            { name: 'API Gateway', port: 8000, desc: 'Cổng định tuyến Microservices' },
            { name: 'Identity Service', port: 8001, desc: 'Xác thực & Người dùng' },
            { name: 'Product Service', port: 8002, desc: 'Quản lý kho & Danh mục' },
            { name: 'Order Service', port: 8003, desc: 'Đơn hàng & Giỏ hàng' },
            { name: 'Notification Service', port: 8004, desc: 'Thông báo & Email' },
            { name: 'Chat Service (Gemini AI)', port: 8005, desc: 'Live Chat & Trợ lý thông minh' }
        ];
        grid.innerHTML = services.map(s => `
      <div class="service-health-card">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div style="font-weight: 700; color: var(--text-main);">${s.name}</div>
          <span class="service-status-dot online"></span>
        </div>
        <div style="font-size: 0.8125rem; color: var(--text-muted);">${s.desc}</div>
        <div style="margin-top: 10px; font-size: 0.75rem; color: var(--primary); font-weight: 600;">Cổng Port: :${s.port} • MySQL Connected</div>
      </div>
    `).join('');
    }
    catch {
        grid.innerHTML = `<div style="color: var(--accent);">Không thể kiểm tra trạng thái sức khỏe của các service</div>`;
    }
};
const updateKPIs = () => {
    const kpiRevenue = document.getElementById('kpiRevenue');
    const kpiOrders = document.getElementById('kpiOrders');
    const kpiProducts = document.getElementById('kpiProducts');
    const kpiUsers = document.getElementById('kpiUsers');
    const totalRev = state.orders.reduce((sum, o) => sum + (o.status === 'completed' ? o.totalAmount : 0), 0);
    if (kpiRevenue)
        kpiRevenue.textContent = formatPrice(totalRev);
    if (kpiOrders)
        kpiOrders.textContent = state.orders.length.toString();
    if (kpiProducts)
        kpiProducts.textContent = state.products.length.toString();
    if (kpiUsers)
        kpiUsers.textContent = state.users.length.toString();
};
const ensureChartJsLoaded = async () => {
    if (typeof window.Chart !== 'undefined')
        return true;
    return new Promise((resolve) => {
        const existing = document.querySelector('script[src*="chart.umd.min.js"]');
        if (existing) {
            existing.addEventListener('load', () => resolve(true));
            existing.addEventListener('error', () => resolve(false));
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
    });
};
const loadStats = async () => {
    try {
        const res = await fetch(`${API_BASE}/api/orders/stats`);
        const json = await res.json();
        if (json.success && json.data) {
            state.stats = json.data;
            renderStatsData();
        }
    }
    catch (err) {
        console.error('Error loading stats:', err);
    }
};
const bindStatsHandlers = () => {
    const btnDays = document.getElementById('btnStatsRangeDays');
    const btnMonths = document.getElementById('btnStatsRangeMonths');
    if (btnDays && btnMonths) {
        btnDays.addEventListener('click', () => {
            if (currentStatsPeriod === 'days')
                return;
            currentStatsPeriod = 'days';
            btnDays.className = 'btn btn-sm btn-primary';
            btnMonths.className = 'btn btn-sm btn-outline';
            renderStatsCharts();
        });
        btnMonths.addEventListener('click', () => {
            if (currentStatsPeriod === 'months')
                return;
            currentStatsPeriod = 'months';
            btnMonths.className = 'btn btn-sm btn-primary';
            btnDays.className = 'btn btn-sm btn-outline';
            renderStatsCharts();
        });
    }
};
const renderStatsData = () => {
    if (!state.stats)
        return;
    const todayRevEl = document.getElementById('statsTodayRevenue');
    const todayOrdersEl = document.getElementById('statsTodayOrders');
    const compRevEl = document.getElementById('statsTotalCompletedRev');
    const compOrdersEl = document.getElementById('statsCompletedOrdersCount');
    const pendingCountEl = document.getElementById('statsPendingProcessingCount');
    const pendingSubEl = document.getElementById('statsPendingVal');
    const successRateEl = document.getElementById('statsSuccessRate');
    const cancelRateEl = document.getElementById('statsCancelRate');
    if (todayRevEl)
        todayRevEl.textContent = formatPrice(state.stats.todayRevenue || 0);
    if (todayOrdersEl)
        todayOrdersEl.textContent = `${state.stats.todayOrders || 0} đơn hôm nay`;
    if (compRevEl)
        compRevEl.textContent = formatPrice(state.stats.totalRevenue || 0);
    if (compOrdersEl)
        compOrdersEl.textContent = `${state.stats.countCompleted || 0} đơn hoàn thành`;
    const pending = Number(state.stats.countPending) || 0;
    const processing = Number(state.stats.countProcessing) || 0;
    if (pendingCountEl)
        pendingCountEl.textContent = `${pending + processing} đơn`;
    if (pendingSubEl)
        pendingSubEl.textContent = `Chờ duyệt: ${pending} • Đang đóng/giao: ${processing}`;
    const total = Number(state.stats.totalOrders) || 0;
    const completed = Number(state.stats.countCompleted) || 0;
    const cancelled = Number(state.stats.countCancelled) || 0;
    const sRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0';
    const cRate = total > 0 ? ((cancelled / total) * 100).toFixed(1) : '0';
    if (successRateEl)
        successRateEl.textContent = `${sRate}%`;
    if (cancelRateEl)
        cancelRateEl.textContent = `${cRate}% tỷ lệ huỷ (${cancelled}/${total})`;
    const tbody = document.getElementById('topProductsTableBody');
    if (tbody) {
        const topProducts = Array.isArray(state.stats.topProducts) ? state.stats.topProducts : [];
        if (topProducts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">Chưa có dữ liệu bán hàng</td></tr>`;
        }
        else {
            const maxQty = Math.max(...topProducts.map((p) => Number(p.quantity) || 1), 1);
            tbody.innerHTML = topProducts.map((p, idx) => {
                const qty = Number(p.quantity) || 0;
                const rev = Number(p.revenue) || 0;
                const percent = Math.min(100, Math.round((qty / maxQty) * 100));
                const rankClass = idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : '';
                const rankIcon = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                return `
          <tr>
            <td style="text-align: center;">
              <span class="top-rank-badge ${rankClass}">${rankIcon}</span>
            </td>
            <td>
              <strong style="color: var(--text-main); font-size: 0.875rem;">${escapeHtml(p.name)}</strong>
              <div style="font-size: 0.6875rem; color: var(--text-muted);">Mã SP: #${p.id}</div>
            </td>
            <td style="text-align: right; font-weight: 700; color: #4338ca;">
              ${qty.toLocaleString('vi-VN')} <span style="font-size: 0.75rem; font-weight: 400; color: var(--text-muted);">chiếc</span>
            </td>
            <td style="text-align: right; font-weight: 700; color: #16a34a;">
              ${formatPrice(rev)}
            </td>
            <td>
              <div class="stats-mini-bar-wrap">
                <div class="stats-mini-bar-fill" style="width: ${percent}%;"></div>
                <span class="stats-mini-bar-label">${percent}%</span>
              </div>
            </td>
          </tr>
        `;
            }).join('');
        }
    }
    renderStatsCharts();
};
const renderStatsCharts = async () => {
    if (!state.stats)
        return;
    await ensureChartJsLoaded();
    if (typeof Chart === 'undefined')
        return;
    const revCanvas = document.getElementById('revenueTrendChart');
    if (revCanvas) {
        if (revenueTrendChart) {
            revenueTrendChart.destroy();
            revenueTrendChart = null;
        }
        let labels = [];
        let revenueData = [];
        let orderData = [];
        if (currentStatsPeriod === 'days') {
            const daily = state.stats.dailyRevenue || [];
            labels = daily.map((d) => {
                const parts = (d.date || '').split('-');
                return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : d.date;
            });
            revenueData = daily.map((d) => Number(d.revenue) || 0);
            orderData = daily.map((d) => Number(d.orders) || 0);
        }
        else {
            const monthly = state.stats.monthlyRevenue || [];
            labels = monthly.map((m) => {
                const parts = (m.month || '').split('-');
                return parts.length >= 2 ? `T${parts[1]}/${parts[0].slice(2)}` : m.month;
            });
            revenueData = monthly.map((m) => Number(m.revenue) || 0);
            orderData = monthly.map((m) => Number(m.orders) || 0);
        }
        const ctx = revCanvas.getContext('2d');
        if (ctx) {
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(79, 70, 229, 0.35)');
            gradient.addColorStop(1, 'rgba(79, 70, 229, 0.01)');
            revenueTrendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Doanh Thu (VNĐ)',
                            data: revenueData,
                            borderColor: '#4f46e5',
                            backgroundColor: gradient,
                            borderWidth: 3,
                            pointBackgroundColor: '#ffffff',
                            pointBorderColor: '#4f46e5',
                            pointBorderWidth: 2,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            fill: true,
                            tension: 0.35,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Số Đơn Hàng',
                            data: orderData,
                            borderColor: '#06b6d4',
                            backgroundColor: 'rgba(6, 182, 212, 0.1)',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            pointBackgroundColor: '#06b6d4',
                            pointRadius: 3,
                            pointHoverRadius: 5,
                            fill: false,
                            tension: 0.25,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                boxWidth: 14,
                                font: { family: 'Inter', size: 12, weight: '600' }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    if (context.datasetIndex === 0) {
                                        return ` Doanh thu: ${Number(context.raw).toLocaleString('vi-VN')} đ`;
                                    }
                                    return ` Số đơn: ${context.raw} đơn`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { font: { family: 'Inter', size: 11 }, maxTicksLimit: 15 }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            grid: { color: '#f1f5f9' },
                            ticks: {
                                font: { family: 'Inter', size: 11 },
                                callback: (val) => {
                                    if (val >= 1000000)
                                        return (val / 1000000).toFixed(1) + 'M';
                                    if (val >= 1000)
                                        return (val / 1000).toFixed(0) + 'k';
                                    return val;
                                }
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            grid: { drawOnChartArea: false },
                            ticks: {
                                font: { family: 'Inter', size: 11 },
                                stepSize: 1
                            }
                        }
                    }
                }
            });
        }
    }
    const payCanvas = document.getElementById('paymentMethodsChart');
    if (payCanvas) {
        if (paymentMethodsChart) {
            paymentMethodsChart.destroy();
            paymentMethodsChart = null;
        }
        const pMethods = state.stats.paymentMethods || {};
        const methodNames = {
            COD: 'Tiền mặt (COD)',
            MOMO: 'Ví MoMo',
            SEPAY: 'Chuyển khoản (SePay)',
            BANK: 'Chuyển khoản NH',
            VNPAY: 'VNPay'
        };
        const labels = Object.keys(pMethods).map(k => methodNames[k] || k);
        const revData = Object.values(pMethods).map((m) => Number(m.revenue) || 0);
        const fallbackLabels = labels.length ? labels : ['Chưa có dữ liệu'];
        const fallbackData = revData.length ? revData : [1];
        const ctx = payCanvas.getContext('2d');
        if (ctx) {
            paymentMethodsChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: fallbackLabels,
                    datasets: [{
                            data: fallbackData,
                            backgroundColor: ['#10b981', '#ec4899', '#3b82f6', '#f59e0b', '#8b5cf6'],
                            borderWidth: 2,
                            borderColor: '#ffffff',
                            hoverOffset: 6
                        }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { boxWidth: 12, font: { family: 'Inter', size: 11, weight: '500' } }
                        },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => ` ${ctx.label}: ${Number(ctx.raw).toLocaleString('vi-VN')} đ`
                            }
                        }
                    },
                    cutout: '65%'
                }
            });
        }
    }
    const statusCanvas = document.getElementById('orderStatusDistributionChart');
    if (statusCanvas) {
        if (orderStatusChart) {
            orderStatusChart.destroy();
            orderStatusChart = null;
        }
        const ctx = statusCanvas.getContext('2d');
        if (ctx) {
            const completed = Number(state.stats.countCompleted) || 0;
            const processing = Number(state.stats.countProcessing) || 0;
            const pending = Number(state.stats.countPending) || 0;
            const cancelled = Number(state.stats.countCancelled) || 0;
            orderStatusChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Đã hoàn tất', 'Đang giao / xử lý', 'Chờ duyệt đơn', 'Đã huỷ'],
                    datasets: [{
                            data: [completed, processing, pending, cancelled],
                            backgroundColor: ['#16a34a', '#3b82f6', '#f59e0b', '#ef4444'],
                            borderWidth: 2,
                            borderColor: '#ffffff',
                            hoverOffset: 6
                        }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { boxWidth: 12, font: { family: 'Inter', size: 11, weight: '500' } }
                        },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => ` ${ctx.label}: ${ctx.raw} đơn`
                            }
                        }
                    },
                    cutout: '65%'
                }
            });
        }
    }
};
const bindChatHandlers = () => {
    const refreshBtn = document.getElementById('refreshChatSessionsBtn');
    const filterSelect = document.getElementById('filterChatStatus');
    const replyForm = document.getElementById('adminReplyForm');
    const replyInput = document.getElementById('adminReplyInput');
    const switchToAiBtn = document.getElementById('adminSwitchToAiBtn');
    const closeSessionBtn = document.getElementById('adminCloseSessionBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadChatSessions());
    }
    if (filterSelect) {
        filterSelect.addEventListener('change', () => {
            state.chatFilter = filterSelect.value;
            renderChatSessions();
        });
    }
    if (replyForm && replyInput) {
        replyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = replyInput.value.trim();
            if (!text || !state.selectedSessionId)
                return;
            try {
                const res = await fetch(`${API_BASE}/api/chat/session/${state.selectedSessionId}/messages`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${state.token}`
                    },
                    body: JSON.stringify({
                        sender: 'admin',
                        message: text
                    })
                });
                const result = await res.json();
                if (result.success) {
                    replyInput.value = '';
                    loadSessionMessages(state.selectedSessionId);
                    loadChatSessions();
                }
            }
            catch {
                showToast('Lỗi', 'Không thể gửi phản hồi', 'error');
            }
        });
    }
    if (switchToAiBtn) {
        switchToAiBtn.addEventListener('click', async () => {
            if (!state.selectedSessionId)
                return;
            try {
                const res = await fetch(`${API_BASE}/api/chat/session/${state.selectedSessionId}/status`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${state.token}`
                    },
                    body: JSON.stringify({ status: 'ai' })
                });
                const result = await res.json();
                if (result.success) {
                    showToast('Thành công', 'Đã chuyển cuộc trò chuyện lại cho Gemini AI', 'success');
                    loadSessionMessages(state.selectedSessionId);
                    loadChatSessions();
                }
            }
            catch { }
        });
    }
    if (closeSessionBtn) {
        closeSessionBtn.addEventListener('click', async () => {
            if (!state.selectedSessionId)
                return;
            try {
                const res = await fetch(`${API_BASE}/api/chat/session/${state.selectedSessionId}/status`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${state.token}`
                    },
                    body: JSON.stringify({ status: 'closed' })
                });
                const result = await res.json();
                if (result.success) {
                    showToast('Thành công', 'Đã đóng phiên trò chuyện', 'success');
                    loadSessionMessages(state.selectedSessionId);
                    loadChatSessions();
                }
            }
            catch { }
        });
    }
};
const startChatPolling = () => {
    if (state.chatPollingInterval)
        clearInterval(state.chatPollingInterval);
    state.chatPollingInterval = setInterval(() => {
        loadChatSessions(true);
        if (state.selectedSessionId) {
            loadSessionMessages(state.selectedSessionId, true);
        }
    }, 5000);
};
const loadChatSessions = async (silent = false) => {
    try {
        const res = await fetch(`${API_BASE}/api/chat/sessions`, {
            headers: { Authorization: `Bearer ${state.token}` }
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
            state.chatSessions = data.data;
            updateUnreadBadge();
            renderChatSessions();
        }
    }
    catch { }
};
const updateUnreadBadge = () => {
    const badge = document.getElementById('adminChatUnreadBadge');
    if (!badge)
        return;
    const count = state.chatSessions.filter(s => s.status === 'human_waiting').length;
    if (count > 0) {
        badge.textContent = count.toString();
        badge.style.display = 'inline-block';
    }
    else {
        badge.style.display = 'none';
    }
};
const renderChatSessions = () => {
    const listEl = document.getElementById('adminChatSessionsList');
    if (!listEl)
        return;
    const filtered = state.chatFilter === 'all'
        ? state.chatSessions
        : state.chatSessions.filter(s => s.status === state.chatFilter);
    if (filtered.length === 0) {
        listEl.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.8125rem;">Không có phiên trò chuyện nào</div>`;
        return;
    }
    const statusLabels = {
        human_waiting: { label: 'Cần hỗ trợ', class: 'pill-waiting' },
        human_active: { label: 'Đang chat', class: 'pill-active' },
        ai: { label: 'Gemini AI', class: 'pill-ai' },
        closed: { label: 'Đã đóng', class: 'pill-closed' }
    };
    listEl.innerHTML = filtered.map(s => {
        const isSelected = s.id === state.selectedSessionId;
        const info = statusLabels[s.status] || { label: s.status, class: 'pill-ai' };
        return `
      <div class="chat-session-item ${isSelected ? 'active' : ''}" data-id="${s.id}">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
          <div style="font-weight: 700; font-size: 0.875rem; color: var(--text-main);">${escapeHtml(s.guestName || 'Khách hàng')}</div>
          <span class="session-status-pill ${info.class}">${info.label}</span>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 6px;">${s.guestEmail || '#' + s.id}</div>
        <div style="font-size: 0.6875rem; color: #94a3b8;">${formatDate(s.updatedAt)}</div>
      </div>
    `;
    }).join('');
    listEl.querySelectorAll('.chat-session-item').forEach((item) => {
        item.addEventListener('click', () => {
            const id = item.getAttribute('data-id');
            if (id) {
                state.selectedSessionId = id;
                renderChatSessions();
                loadSessionMessages(id);
            }
        });
    });
};
const loadSessionMessages = async (sessionId, silent = false) => {
    const emptyEl = document.getElementById('chatConversationEmpty');
    const activeEl = document.getElementById('chatConversationActive');
    const nameEl = document.getElementById('activeCustomerName');
    const emailEl = document.getElementById('activeCustomerEmail');
    const badgeEl = document.getElementById('activeSessionStatusBadge');
    try {
        const res = await fetch(`${API_BASE}/api/chat/session/${sessionId}`, {
            headers: { Authorization: `Bearer ${state.token}` }
        });
        const data = await res.json();
        if (data.success && data.data) {
            state.selectedSession = data.data.session;
            state.selectedMessages = data.data.messages || [];
            if (emptyEl)
                emptyEl.style.display = 'none';
            if (activeEl)
                activeEl.style.display = 'flex';
            if (nameEl)
                nameEl.textContent = state.selectedSession?.guestName || 'Khách hàng';
            if (emailEl)
                emailEl.textContent = `Phiên #${sessionId} • ${state.selectedSession?.guestEmail || ''}`;
            const statusLabels = {
                human_waiting: { label: 'CẦN CSKH HỖ TRỢ', class: 'pill-waiting' },
                human_active: { label: 'ĐANG CSKH TRỰC TIẾP', class: 'pill-active' },
                ai: { label: 'TRỢ LÝ GEMINI AI', class: 'pill-ai' },
                closed: { label: 'PHIÊN ĐÃ ĐÓNG', class: 'pill-closed' }
            };
            const info = statusLabels[state.selectedSession?.status || 'ai'] || { label: 'AI', class: 'pill-ai' };
            if (badgeEl) {
                badgeEl.className = `session-status-pill ${info.class}`;
                badgeEl.textContent = info.label;
            }
            renderAdminMessages();
        }
    }
    catch { }
};
const renderAdminMessages = () => {
    const container = document.getElementById('adminChatMessagesContainer');
    if (!container)
        return;
    if (!state.selectedMessages || state.selectedMessages.length === 0) {
        container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 40px 20px;">
        <i class="ri-chat-smile-2-line" style="font-size: 2.5rem; display: block; margin-bottom: 8px; opacity: 0.5;"></i>
        Chưa có tin nhắn nào trong cuộc trò chuyện này
      </div>
    `;
        return;
    }
    container.innerHTML = state.selectedMessages.map(m => {
        if (m.sender === 'system') {
            return `
        <div class="admin-msg-system-pill">
          <i class="ri-information-line"></i>
          <span>${escapeHtml(m.message)} • ${formatDate(m.createdAt)}</span>
        </div>
      `;
        }
        if (m.sender === 'admin') {
            return `
        <div class="admin-msg-bubble-wrap staff">
          <div class="admin-msg-sender-tag tag-staff">
            <span class="sender-time">${formatDate(m.createdAt)}</span>
            <span class="sender-badge badge-staff">Quản Trị Viên</span>
            <span class="sender-name">CSKH (Bạn)</span>
            <span class="sender-avatar staff"><i class="ri-customer-service-2-fill"></i></span>
          </div>
          <div class="admin-msg-bubble">
            ${escapeHtml(m.message)}
          </div>
        </div>
      `;
        }
        if (m.sender === 'ai') {
            return `
        <div class="admin-msg-bubble-wrap ai">
          <div class="admin-msg-sender-tag tag-ai">
            <span class="sender-avatar ai"><i class="ri-robot-2-fill"></i></span>
            <span class="sender-name">NovaBot</span>
            <span class="sender-badge badge-ai">Gemini AI</span>
            <span class="sender-time">${formatDate(m.createdAt)}</span>
          </div>
          <div class="admin-msg-bubble">
            <div class="ai-meta-tag"><i class="ri-sparkling-fill"></i> AI Tự Động</div>
            ${escapeHtml(m.message)}
          </div>
        </div>
      `;
        }
        const guestName = state.selectedSession?.guestName || 'Khách Hàng';
        return `
      <div class="admin-msg-bubble-wrap customer">
        <div class="admin-msg-sender-tag tag-customer">
          <span class="sender-avatar customer"><i class="ri-user-smile-fill"></i></span>
          <span class="sender-name">${escapeHtml(guestName)}</span>
          <span class="sender-badge badge-customer">Khách Hàng</span>
          <span class="sender-time">${formatDate(m.createdAt)}</span>
        </div>
        <div class="admin-msg-bubble">
          ${escapeHtml(m.message)}
        </div>
      </div>
    `;
    }).join('');
    container.scrollTop = container.scrollHeight;
};
const loadReviews = async () => {
    try {
        const res = await fetch(`${API_BASE}/api/products/reviews/all`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
            state.reviews = data.data;
            updateReviewKPIs();
            renderReviews();
        }
    }
    catch { }
};
const updateReviewKPIs = () => {
    const totalEl = document.getElementById('kpiTotalReviews');
    const avgEl = document.getElementById('kpiAvgRating');
    const fiveStarEl = document.getElementById('kpi5StarReviews');
    const pendingEl = document.getElementById('kpiPendingReplyReviews');
    const badgeEl = document.getElementById('adminReviewsPendingBadge');
    const total = state.reviews.length;
    const pending = state.reviews.filter(r => !r.replyComment).length;
    const fiveStar = state.reviews.filter(r => Number(r.rating) === 5).length;
    const sumRating = state.reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0);
    const avg = total > 0 ? (sumRating / total).toFixed(1) : '5.0';
    if (totalEl)
        totalEl.textContent = total.toString();
    if (avgEl)
        avgEl.textContent = `${avg} ⭐`;
    if (fiveStarEl)
        fiveStarEl.textContent = fiveStar.toString();
    if (pendingEl)
        pendingEl.textContent = pending.toString();
    if (badgeEl) {
        if (pending > 0) {
            badgeEl.textContent = pending.toString();
            badgeEl.style.display = 'inline-block';
        }
        else {
            badgeEl.style.display = 'none';
        }
    }
};
const renderReviews = () => {
    const container = document.getElementById('reviewsListContainer');
    if (!container)
        return;
    const kw = state.reviewKeyword.toLowerCase().trim();
    const rFilter = state.reviewRatingFilter;
    const sFilter = state.reviewReplyStatusFilter;
    const filtered = state.reviews.filter(r => {
        if (rFilter && String(r.rating) !== rFilter)
            return false;
        if (sFilter === 'pending' && r.replyComment)
            return false;
        if (sFilter === 'replied' && !r.replyComment)
            return false;
        if (kw) {
            const matchUser = (r.userName || '').toLowerCase().includes(kw);
            const matchComment = (r.comment || '').toLowerCase().includes(kw);
            const matchProd = (r.productName || '').toLowerCase().includes(kw);
            if (!matchUser && !matchComment && !matchProd)
                return false;
        }
        return true;
    });
    if (filtered.length === 0) {
        container.innerHTML = `
      <div style="text-align: center; padding: 48px 20px; background: #ffffff; border-radius: 8px; border: 1px dashed #cbd5e1; color: var(--text-muted);">
        <i class="ri-star-smile-line" style="font-size: 2.5rem; color: #cbd5e1; display: block; margin-bottom: 8px;"></i>
        Không tìm thấy đánh giá nào phù hợp với bộ lọc tìm kiếm.
      </div>
    `;
        return;
    }
    container.innerHTML = filtered.map(r => {
        const starsHtml = [1, 2, 3, 4, 5].map(s => s <= r.rating
            ? '<i class="ri-star-fill" style="color: #f59e0b;"></i>'
            : '<i class="ri-star-line" style="color: #cbd5e1;"></i>').join('');
        const formattedDate = formatDate(r.createdAt);
        return `
      <div class="admin-review-card" data-id="${r.id}">
        <div class="review-top-bar">
          <div class="review-customer-info">
            <div class="review-user-avatar">
              ${r.userAvatar ? `<img src="${r.userAvatar}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : (r.userName ? r.userName.charAt(0).toUpperCase() : 'U')}
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 700; color: var(--text-main); font-size: 0.9375rem;">${r.userName || 'Khách hàng'}</span>
                ${r.isBuyer ? `<span class="badge" style="background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; font-size: 0.6875rem;"><i class="ri-checkbox-circle-fill"></i> Đã mua hàng</span>` : ''}
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
                Đánh giá ngày: ${formattedDate}
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="review-product-pill" title="${r.productName || 'Sản phẩm'}">
              <img src="${r.productImageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&q=80'}" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&q=80'">
              <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.8125rem; font-weight: 600;">
                ${r.productName || 'Sản phẩm #' + r.productId}
              </div>
            </div>
            <button type="button" class="btn btn-outline btn-sm delete-review-btn" data-id="${r.id}" style="color: #ef4444; border-color: #fecdd3;" title="Xóa đánh giá vi phạm này">
              <i class="ri-delete-bin-line"></i>
            </button>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="review-stars-wrap">${starsHtml}</div>
          <span style="font-weight: 700; font-size: 0.875rem; color: #b45309;">${r.rating}.0 / 5.0</span>
        </div>

        <div style="font-size: 0.9375rem; color: #1e293b; line-height: 1.6; background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #f1f5f9;">
          ${escapeHtml(r.comment)}
        </div>

        ${r.replyComment ? `
          <div class="review-shop-reply-box">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-weight: 700; color: #15803d; font-size: 0.8125rem;">
                <i class="ri-store-3-line"></i> Phản hồi từ Người bán (NovaShop):
              </span>
              <button type="button" class="btn btn-outline btn-sm reply-review-btn" data-id="${r.id}" style="padding: 2px 8px; font-size: 0.75rem; border-color: #86efac; color: #16a34a;">
                <i class="ri-edit-line"></i> Sửa phản hồi
              </button>
            </div>
            <div style="color: #166534; font-size: 0.875rem;">${escapeHtml(r.replyComment)}</div>
          </div>
        ` : `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
            <span style="font-size: 0.8125rem; color: #ea580c; font-weight: 600;">
              <i class="ri-time-line"></i> Chưa có phản hồi từ shop
            </span>
            <button type="button" class="btn btn-primary btn-sm reply-review-btn" data-id="${r.id}">
              <i class="ri-reply-line"></i> Phản Hồi Khách Hàng
            </button>
          </div>
        `}
      </div>
    `;
    }).join('');
    container.querySelectorAll('.reply-review-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const r = state.reviews.find(item => item.id === id);
            if (r)
                openReplyReviewModal(r);
        });
    });
    container.querySelectorAll('.delete-review-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            if (!id)
                return;
            if (confirm('Bạn có chắc muốn xóa đánh giá này? Hệ thống sẽ tự động tính lại điểm số sao thực tế của sản phẩm.')) {
                try {
                    const res = await fetch(`${API_BASE}/api/products/reviews/${id}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${state.token}` }
                    });
                    const result = await res.json();
                    if (result.success) {
                        showToast('Thành công', 'Đã xóa đánh giá', 'success');
                        loadReviews();
                        loadProducts();
                    }
                    else {
                        showToast('Lỗi', result.message || 'Không thể xóa đánh giá', 'error');
                    }
                }
                catch {
                    showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ', 'error');
                }
            }
        });
    });
};
const openReplyReviewModal = (r) => {
    const modal = document.getElementById('replyReviewModal');
    const contextEl = document.getElementById('replyReviewCustomerContext');
    const idInput = document.getElementById('replyReviewId');
    const commentInput = document.getElementById('replyReviewCommentInput');
    if (!modal || !contextEl || !idInput || !commentInput)
        return;
    idInput.value = r.id;
    commentInput.value = r.replyComment || '';
    const starsHtml = [1, 2, 3, 4, 5].map(s => s <= r.rating
        ? '<i class="ri-star-fill" style="color: #f59e0b;"></i>'
        : '<i class="ri-star-line" style="color: #cbd5e1;"></i>').join('');
    contextEl.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
      <span style="font-weight: 700; color: var(--text-main);">${r.userName}</span>
      <span style="display: flex; align-items: center; gap: 3px;">${starsHtml} (${r.rating} sao)</span>
    </div>
    <div style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 6px;">
      Sản phẩm: <strong>${r.productName || 'Sản phẩm #' + r.productId}</strong>
    </div>
    <div style="font-size: 0.875rem; color: #334155; font-style: italic; background: #ffffff; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
      "${escapeHtml(r.comment)}"
    </div>
  `;
    modal.classList.add('active');
};
const bindReviewEvents = () => {
    const searchInput = document.getElementById('reviewSearchKeyword');
    const ratingFilter = document.getElementById('reviewRatingFilter');
    const replyStatusFilter = document.getElementById('reviewReplyStatusFilter');
    const refreshBtn = document.getElementById('refreshReviewsBtn');
    const replyForm = document.getElementById('replyReviewForm');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            state.reviewKeyword = searchInput.value;
            renderReviews();
        });
    }
    if (ratingFilter) {
        ratingFilter.addEventListener('change', () => {
            state.reviewRatingFilter = ratingFilter.value;
            renderReviews();
        });
    }
    if (replyStatusFilter) {
        replyStatusFilter.addEventListener('change', () => {
            state.reviewReplyStatusFilter = replyStatusFilter.value;
            renderReviews();
        });
    }
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadReviews();
            showToast('Làm mới', 'Đã cập nhật danh sách đánh giá', 'success');
        });
    }
    document.querySelectorAll('.reply-preset-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const text = btn.getAttribute('data-text');
            const textarea = document.getElementById('replyReviewCommentInput');
            if (text && textarea) {
                textarea.value = text;
                textarea.focus();
            }
        });
    });
    if (replyForm) {
        replyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idInput = document.getElementById('replyReviewId');
            const commentInput = document.getElementById('replyReviewCommentInput');
            if (!idInput || !commentInput)
                return;
            const reviewId = idInput.value;
            const replyComment = commentInput.value.trim();
            if (!replyComment) {
                showToast('Thông báo', 'Vui lòng nhập nội dung phản hồi', 'warning');
                return;
            }
            try {
                const res = await fetch(`${API_BASE}/api/products/reviews/${reviewId}/reply`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${state.token}`
                    },
                    body: JSON.stringify({ replyComment })
                });
                const result = await res.json();
                if (result.success) {
                    showToast('Thành công', 'Đã gửi phản hồi đánh giá cho khách hàng', 'success');
                    const m = document.getElementById('replyReviewModal');
                    if (m)
                        m.classList.remove('active');
                    loadReviews();
                }
                else {
                    showToast('Lỗi', result.message || 'Không thể gửi phản hồi', 'error');
                }
            }
            catch {
                showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ', 'error');
            }
        });
    }
};
const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};
window.addEventListener('popstate', () => {
    state.currentRoute = window.location.pathname;
    renderAdminApp();
});
document.addEventListener('DOMContentLoaded', () => {
    renderAdminApp();
});
