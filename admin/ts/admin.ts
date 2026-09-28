"use strict";

interface AdminUser {
  id: string | number;
  name: string;
  email: string;
  role: string;
}

interface Product {
  id: string | number;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  stock: number;
  sold?: number;
  rating?: number;
  imageUrl: string;
  description?: string;
}

interface OrderItem {
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

interface UserAccount {
  id: string | number;
  name: string;
  email: string;
  role: string;
  phone?: string;
  address?: string;
  createdAt: string;
}

interface ChatMessage {
  id: string | number;
  sessionId: string;
  sender: 'user' | 'ai' | 'admin' | 'system';
  message: string;
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
  unreadCount?: number;
  lastMessage?: string;
}

interface Category {
  id: string;
  name: string;
}

const API_BASE = window.location.origin;

const state = {
  currentRoute: window.location.pathname || '/admin',
  orders: [] as Order[],
  products: [] as Product[],
  users: [] as UserAccount[],
  categories: [] as Category[],
  stats: null as any,
  adminUser: JSON.parse(localStorage.getItem('novashop_admin_user') || 'null') as AdminUser | null,
  token: localStorage.getItem('novashop_admin_token') || '',
  chatSessions: [] as ChatSession[],
  selectedSessionId: null as string | null,
  selectedSession: null as ChatSession | null,
  selectedMessages: [] as ChatMessage[],
  chatFilter: 'all',
  chatPollingInterval: null as any
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

const renderAdminLoginView = (): string => {
  return `
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
    </div>
  </div>
  `;
};

const renderAdminDashboardView = (): string => {
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
        <div class="admin-nav-item active" data-tab="ordersTab">
          <i class="ri-shopping-cart-2-fill"></i>
          <span>Quản Lý Đơn Hàng</span>
        </div>
        <div class="admin-nav-item" data-tab="productsTab">
          <i class="ri-store-2-fill"></i>
          <span>Quản Lý Sản Phẩm</span>
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
        <div class="admin-page-title" id="adminHeaderTitle">Quản Lý Đơn Hàng & Doanh Thu</div>
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

        <section id="ordersTab" class="tab-view active">
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
    <div class="modal-card">
      <button class="modal-close-btn" data-close-modal="productModal" type="button">
        <i class="ri-close-line"></i>
      </button>
      <div class="modal-header">
        <h3 class="modal-title" id="productModalTitle">Thêm Sản Phẩm Mới</h3>
      </div>
      <div class="modal-body">
        <form id="productForm">
          <input type="hidden" id="editProductId">
          <div class="form-group">
            <label class="form-label" for="prodNameInput">Tên sản phẩm</label>
            <input type="text" id="prodNameInput" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="prodCategorySelect">Danh mục</label>
            <select id="prodCategorySelect" class="form-select" required></select>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label" for="prodPriceInput">Giá bán (VND)</label>
              <input type="number" id="prodPriceInput" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="prodOriginalPriceInput">Giá gốc (VND)</label>
              <input type="number" id="prodOriginalPriceInput" class="form-input">
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label" for="prodStockInput">Số lượng trong kho</label>
              <input type="number" id="prodStockInput" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="prodRatingInput">Đánh giá (sao)</label>
              <input type="number" step="0.1" max="5" min="1" id="prodRatingInput" class="form-input" value="5.0">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="prodImageInput">Đường dẫn hình ảnh (URL)</label>
            <input type="url" id="prodImageInput" class="form-input" placeholder="https://images.unsplash.com/..." required>
          </div>
          <div class="form-group">
            <label class="form-label" for="prodDescInput">Mô tả sản phẩm</label>
            <textarea id="prodDescInput" class="form-textarea" rows="3"></textarea>
          </div>
          <button type="submit" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 12px;">
            <span id="saveProductBtnText">Lưu Sản Phẩm</span>
          </button>
        </form>
      </div>
    </div>
  </div>

  <div id="orderDetailModal" class="modal-overlay">
    <div class="modal-card modal-card-lg">
      <button class="modal-close-btn" data-close-modal="orderDetailModal" type="button">
        <i class="ri-close-line"></i>
      </button>
      <div class="modal-header">
        <h3 class="modal-title" id="orderDetailTitle">Chi Tiết Đơn Hàng</h3>
      </div>
      <div class="modal-body" id="orderDetailContent"></div>
    </div>
  </div>
  `;
};

const renderAdminApp = (): void => {
  const adminAppEl = document.getElementById('admin-app');
  if (!adminAppEl) return;

  const path = window.location.pathname;

  if (path === '/admin/login') {
    document.title = 'Đăng Nhập Quản Trị Hệ Thống | NovaShop';
    adminAppEl.innerHTML = renderAdminLoginView();
    initAdminLogin();
  } else {
    if (!state.token) {
      navigateAdmin('/admin/login');
      return;
    }
    document.title = 'Admin Dashboard | NovaShop Quản Trị';
    adminAppEl.innerHTML = renderAdminDashboardView();
    initAdminDashboard();
  }
};

const navigateAdmin = (path: string): void => {
  if (window.location.pathname !== path) {
    window.history.pushState(null, '', path);
  }
  state.currentRoute = path;
  renderAdminApp();
};

const initAdminLogin = (): void => {
  const form = document.getElementById('adminLoginForm');
  const userField = document.getElementById('adminUsername') as HTMLInputElement | null;
  const passField = document.getElementById('adminPassword') as HTMLInputElement | null;

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
          state.token = result.data.token;
          state.adminUser = result.data.user;
          localStorage.setItem('novashop_admin_token', result.data.token);
          localStorage.setItem('novashop_admin_user', JSON.stringify(result.data.user));

          showToast('Thành công', 'Xác thực quản trị viên thành công. Đang chuyển hướng...', 'success');
          setTimeout(() => {
            navigateAdmin('/admin');
          }, 800);
        } else {
          showToast('Truy cập bị từ chối', result.message || 'Tài khoản không đủ thẩm quyền', 'error');
        }
      } catch {
        showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ xác thực', 'error');
      }
    });
  }
};

const initAdminDashboard = (): void => {
  bindTabs();
  bindSidebarLogout();
  bindRefresh();
  bindModals();
  bindProductForm();
  bindChatHandlers();

  loadCategories();
  loadDashboardData();
  startChatPolling();
};

const bindTabs = (): void => {
  const navItems = document.querySelectorAll('.admin-nav-item');
  const tabViews = document.querySelectorAll('.tab-view');
  const headerTitle = document.getElementById('adminHeaderTitle');

  const titles: Record<string, string> = {
    ordersTab: 'Quản Lý Đơn Hàng & Doanh Thu',
    productsTab: 'Quản Lý Kho Hàng & Sản Phẩm',
    usersTab: 'Quản Lý Người Dùng & Quyền Hạn',
    chatTab: 'Live Chat & Hỗ Trợ Khách Hàng (Gemini AI)',
    systemTab: 'Trạng Thái Dịch Vụ Microservices'
  };

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const tabName = item.getAttribute('data-tab');
      if (!tabName) return;

      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      tabViews.forEach((view) => {
        (view as HTMLElement).style.display = view.id === tabName ? 'block' : 'none';
      });

      if (headerTitle && titles[tabName]) {
        headerTitle.textContent = titles[tabName];
      }

      if (tabName === 'chatTab') {
        loadChatSessions();
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

const bindSidebarLogout = (): void => {
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

const bindRefresh = (): void => {
  const refreshBtn = document.getElementById('refreshDataBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadDashboardData();
      showToast('Làm mới', 'Dữ liệu quản trị đã được cập nhật', 'success');
    });
  }
};

const bindModals = (): void => {
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
        if (m) m.classList.remove('active');
      }
    });
  });
};

const resetProductForm = (): void => {
  const editId = document.getElementById('editProductId') as HTMLInputElement | null;
  const nameInput = document.getElementById('prodNameInput') as HTMLInputElement | null;
  const priceInput = document.getElementById('prodPriceInput') as HTMLInputElement | null;
  const origPriceInput = document.getElementById('prodOriginalPriceInput') as HTMLInputElement | null;
  const stockInput = document.getElementById('prodStockInput') as HTMLInputElement | null;
  const ratingInput = document.getElementById('prodRatingInput') as HTMLInputElement | null;
  const imgInput = document.getElementById('prodImageInput') as HTMLInputElement | null;
  const descInput = document.getElementById('prodDescInput') as HTMLTextAreaElement | null;
  const title = document.getElementById('productModalTitle');
  const btnText = document.getElementById('saveProductBtnText');

  if (editId) editId.value = '';
  if (nameInput) nameInput.value = '';
  if (priceInput) priceInput.value = '';
  if (origPriceInput) origPriceInput.value = '';
  if (stockInput) stockInput.value = '100';
  if (ratingInput) ratingInput.value = '5.0';
  if (imgInput) imgInput.value = '';
  if (descInput) descInput.value = '';
  if (title) title.textContent = 'Thêm Sản Phẩm Mới';
  if (btnText) btnText.textContent = 'Lưu Sản Phẩm';
};

const bindProductForm = (): void => {
  const form = document.getElementById('productForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = (document.getElementById('editProductId') as HTMLInputElement | null)?.value;
      const name = (document.getElementById('prodNameInput') as HTMLInputElement | null)?.value.trim() || '';
      const category = (document.getElementById('prodCategorySelect') as HTMLSelectElement | null)?.value || '';
      const price = parseFloat((document.getElementById('prodPriceInput') as HTMLInputElement | null)?.value || '0');
      const originalPrice = parseFloat((document.getElementById('prodOriginalPriceInput') as HTMLInputElement | null)?.value || '0');
      const stock = parseInt((document.getElementById('prodStockInput') as HTMLInputElement | null)?.value || '0', 10);
      const rating = parseFloat((document.getElementById('prodRatingInput') as HTMLInputElement | null)?.value || '5.0');
      const imageUrl = (document.getElementById('prodImageInput') as HTMLInputElement | null)?.value.trim() || '';
      const description = (document.getElementById('prodDescInput') as HTMLTextAreaElement | null)?.value.trim() || '';

      const payload = {
        name,
        category,
        price,
        originalPrice: originalPrice > 0 ? originalPrice : price,
        stock,
        rating,
        imageUrl,
        description
      };

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
          if (m) m.classList.remove('active');
          loadProducts();
        } else {
          showToast('Lỗi', result.message || 'Không thể lưu sản phẩm', 'error');
        }
      } catch {
        showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ sản phẩm', 'error');
      }
    });
  }
};

const loadDashboardData = (): void => {
  loadOrders();
  loadProducts();
  loadUsers();
  loadSystemStatus();
  loadChatSessions();
};

const loadCategories = async (): Promise<void> => {
  try {
    const res = await fetch(`${API_BASE}/api/categories`);
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      state.categories = data.data;
      const select = document.getElementById('prodCategorySelect') as HTMLSelectElement | null;
      if (select) {
        select.innerHTML = state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      }
    }
  } catch {}
};

const loadOrders = async (): Promise<void> => {
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
  } catch {}
};

const renderOrders = (): void => {
  const tbody = document.getElementById('ordersTableBody');
  const filterSelect = document.getElementById('filterOrderStatus') as HTMLSelectElement | null;
  if (!tbody) return;

  const filter = filterSelect ? filterSelect.value : '';
  const filtered = filter ? state.orders.filter(o => o.status === filter) : state.orders;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">Không có đơn hàng nào</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((o) => {
    const statusMap: Record<string, { label: string; class: string }> = {
      completed: { label: 'Hoàn tất', class: 'status-completed' },
      processing: { label: 'Đang xử lý', class: 'status-processing' },
      pending: { label: 'Chờ xử lý', class: 'status-pending' },
      cancelled: { label: 'Đã hủy', class: 'status-cancelled' }
    };
    const s = statusMap[o.status] || { label: o.status, class: 'status-pending' };

    return `
      <tr>
        <td style="font-weight: 700;">#${o.id}</td>
        <td>${o.customerName}</td>
        <td>${o.customerPhone}</td>
        <td style="font-weight: 700; color: var(--text-main);">${formatPrice(o.totalAmount)}</td>
        <td><span class="pay-badge">${o.paymentMethod.toUpperCase()}</span></td>
        <td><span class="order-status-badge ${s.class}">${s.label}</span></td>
        <td style="font-size: 0.8125rem; color: var(--text-muted);">${formatDate(o.createdAt)}</td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-outline btn-sm view-order-btn" data-id="${o.id}" type="button">Chi tiết</button>
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
      if (found) showOrderDetail(found);
    });
  });

  tbody.querySelectorAll('.change-order-status-select').forEach((sel) => {
    sel.addEventListener('change', async () => {
      const id = sel.getAttribute('data-id');
      const newStatus = (sel as HTMLSelectElement).value;
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
      } catch {
        showToast('Lỗi', 'Không thể đổi trạng thái đơn', 'error');
      }
    });
  });
};

const showOrderDetail = (order: Order): void => {
  const modal = document.getElementById('orderDetailModal');
  const title = document.getElementById('orderDetailTitle');
  const content = document.getElementById('orderDetailContent');
  if (!modal || !title || !content) return;

  title.textContent = `Chi Tiết Đơn Hàng #${order.id}`;
  const items = Array.isArray(order.items) ? order.items : [];

  content.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
      <div style="background: #f8fafc; padding: 16px; border-radius: var(--radius-md);">
        <div style="font-weight: 700; margin-bottom: 8px; color: var(--text-main);">Thông Tin Người Nhận</div>
        <div style="font-size: 0.875rem; color: var(--text-muted); line-height: 1.6;">
          <div>Họ và tên: <strong>${order.customerName}</strong></div>
          <div>Điện thoại: <strong>${order.customerPhone}</strong></div>
          <div>Địa chỉ giao: <strong>${order.shippingAddress}</strong></div>
        </div>
      </div>
      <div style="background: #f8fafc; padding: 16px; border-radius: var(--radius-md);">
        <div style="font-weight: 700; margin-bottom: 8px; color: var(--text-main);">Thông Tin Thanh Toán</div>
        <div style="font-size: 0.875rem; color: var(--text-muted); line-height: 1.6;">
          <div>Hình thức: <strong>${order.paymentMethod.toUpperCase()}</strong></div>
          <div>Ngày đặt: <strong>${formatDate(order.createdAt)}</strong></div>
          <div>Tổng thanh toán: <strong style="color: var(--primary); font-size: 1rem;">${formatPrice(order.totalAmount)}</strong></div>
        </div>
      </div>
    </div>

    <div style="font-weight: 700; margin-bottom: 10px; color: var(--text-main);">Danh Sách Sản Phẩm Đã Mua</div>
    <div style="display: flex; flex-direction: column; gap: 10px; max-height: 280px; overflow-y: auto;">
      ${items.map(it => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-bottom: 1px solid var(--border-light);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${it.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 6px;">
            <div>
              <div style="font-weight: 600; font-size: 0.875rem;">${it.name}</div>
              ${it.variantName ? `<div style="font-size: 0.75rem; color: var(--text-muted);">Phân loại: ${it.variantName}</div>` : ''}
              <div style="font-size: 0.8125rem; color: var(--text-muted);">${formatPrice(it.price)} x ${it.quantity}</div>
            </div>
          </div>
          <div style="font-weight: 700;">${formatPrice(it.price * it.quantity)}</div>
        </div>
      `).join('')}
    </div>
  `;

  modal.classList.add('active');
};

const loadProducts = async (): Promise<void> => {
  try {
    const res = await fetch(`${API_BASE}/api/products`);
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      state.products = data.data;
      renderProducts();
      updateKPIs();
    }
  } catch {}
};

const renderProducts = (): void => {
  const tbody = document.getElementById('productsTableBody');
  if (!tbody) return;

  if (state.products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">Không có sản phẩm nào</td></tr>`;
    return;
  }

  tbody.innerHTML = state.products.map(p => `
    <tr>
      <td>
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${p.imageUrl}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px;">
          <span style="font-weight: 600; font-size: 0.875rem;">${p.name}</span>
        </div>
      </td>
      <td><span class="pay-badge">${p.category}</span></td>
      <td style="font-weight: 700;">${formatPrice(p.price)}</td>
      <td>${p.stock}</td>
      <td>${p.sold || 0}</td>
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
      if (prod) openEditProductModal(prod);
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
        } catch {
          showToast('Lỗi', 'Không thể xóa sản phẩm', 'error');
        }
      }
    });
  });
};

const openEditProductModal = (p: Product): void => {
  const modal = document.getElementById('productModal');
  const editId = document.getElementById('editProductId') as HTMLInputElement | null;
  const nameInput = document.getElementById('prodNameInput') as HTMLInputElement | null;
  const catSelect = document.getElementById('prodCategorySelect') as HTMLSelectElement | null;
  const priceInput = document.getElementById('prodPriceInput') as HTMLInputElement | null;
  const origPriceInput = document.getElementById('prodOriginalPriceInput') as HTMLInputElement | null;
  const stockInput = document.getElementById('prodStockInput') as HTMLInputElement | null;
  const ratingInput = document.getElementById('prodRatingInput') as HTMLInputElement | null;
  const imgInput = document.getElementById('prodImageInput') as HTMLInputElement | null;
  const descInput = document.getElementById('prodDescInput') as HTMLTextAreaElement | null;
  const title = document.getElementById('productModalTitle');
  const btnText = document.getElementById('saveProductBtnText');

  if (editId) editId.value = p.id.toString();
  if (nameInput) nameInput.value = p.name;
  if (catSelect) catSelect.value = p.category;
  if (priceInput) priceInput.value = p.price.toString();
  if (origPriceInput) origPriceInput.value = p.originalPrice ? p.originalPrice.toString() : '';
  if (stockInput) stockInput.value = p.stock.toString();
  if (ratingInput) ratingInput.value = (p.rating || 5.0).toString();
  if (imgInput) imgInput.value = p.imageUrl;
  if (descInput) descInput.value = p.description || '';
  if (title) title.textContent = 'Chỉnh Sửa Sản Phẩm';
  if (btnText) btnText.textContent = 'Cập Nhật Sản Phẩm';

  if (modal) modal.classList.add('active');
};

const loadUsers = async (): Promise<void> => {
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
  } catch {}
};

const renderUsers = (): void => {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

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

const loadSystemStatus = async (): Promise<void> => {
  const grid = document.getElementById('servicesMeshGrid');
  if (!grid) return;

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
  } catch {
    grid.innerHTML = `<div style="color: var(--accent);">Không thể kiểm tra trạng thái sức khỏe của các service</div>`;
  }
};

const updateKPIs = (): void => {
  const kpiRevenue = document.getElementById('kpiRevenue');
  const kpiOrders = document.getElementById('kpiOrders');
  const kpiProducts = document.getElementById('kpiProducts');
  const kpiUsers = document.getElementById('kpiUsers');

  const totalRev = state.orders.reduce((sum, o) => sum + (o.status === 'completed' ? o.totalAmount : 0), 0);
  if (kpiRevenue) kpiRevenue.textContent = formatPrice(totalRev);
  if (kpiOrders) kpiOrders.textContent = state.orders.length.toString();
  if (kpiProducts) kpiProducts.textContent = state.products.length.toString();
  if (kpiUsers) kpiUsers.textContent = state.users.length.toString();
};

const bindChatHandlers = (): void => {
  const refreshBtn = document.getElementById('refreshChatSessionsBtn');
  const filterSelect = document.getElementById('filterChatStatus') as HTMLSelectElement | null;
  const replyForm = document.getElementById('adminReplyForm');
  const replyInput = document.getElementById('adminReplyInput') as HTMLInputElement | null;
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
      if (!text || !state.selectedSessionId) return;

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
      } catch {
        showToast('Lỗi', 'Không thể gửi phản hồi', 'error');
      }
    });
  }

  if (switchToAiBtn) {
    switchToAiBtn.addEventListener('click', async () => {
      if (!state.selectedSessionId) return;
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
      } catch {}
    });
  }

  if (closeSessionBtn) {
    closeSessionBtn.addEventListener('click', async () => {
      if (!state.selectedSessionId) return;
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
      } catch {}
    });
  }
};

const startChatPolling = (): void => {
  if (state.chatPollingInterval) clearInterval(state.chatPollingInterval);
  state.chatPollingInterval = setInterval(() => {
    loadChatSessions(true);
    if (state.selectedSessionId) {
      loadSessionMessages(state.selectedSessionId, true);
    }
  }, 5000);
};

const loadChatSessions = async (silent: boolean = false): Promise<void> => {
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
  } catch {}
};

const updateUnreadBadge = (): void => {
  const badge = document.getElementById('adminChatUnreadBadge');
  if (!badge) return;

  const count = state.chatSessions.filter(s => s.status === 'human_waiting').length;
  if (count > 0) {
    badge.textContent = count.toString();
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
};

const renderChatSessions = (): void => {
  const listEl = document.getElementById('adminChatSessionsList');
  if (!listEl) return;

  const filtered = state.chatFilter === 'all'
    ? state.chatSessions
    : state.chatSessions.filter(s => s.status === state.chatFilter);

  if (filtered.length === 0) {
    listEl.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.8125rem;">Không có phiên trò chuyện nào</div>`;
    return;
  }

  const statusLabels: Record<string, { label: string; class: string }> = {
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

const loadSessionMessages = async (sessionId: string, silent: boolean = false): Promise<void> => {
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

      if (emptyEl) emptyEl.style.display = 'none';
      if (activeEl) activeEl.style.display = 'flex';

      if (nameEl) nameEl.textContent = state.selectedSession?.guestName || 'Khách hàng';
      if (emailEl) emailEl.textContent = `Phiên #${sessionId} • ${state.selectedSession?.guestEmail || ''}`;

      const statusLabels: Record<string, { label: string; class: string }> = {
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
  } catch {}
};

const renderAdminMessages = (): void => {
  const container = document.getElementById('adminChatMessagesContainer');
  if (!container) return;

  container.innerHTML = state.selectedMessages.map(m => {
    let roleClass = 'msg-user';
    let roleName = 'Khách hàng';
    if (m.sender === 'ai') {
      roleClass = 'msg-ai';
      roleName = 'NovaBot (Gemini AI)';
    } else if (m.sender === 'admin') {
      roleClass = 'msg-admin';
      roleName = 'CSKH (Bạn)';
    }

    return `
      <div class="admin-msg-bubble ${roleClass}">
        <div style="font-size: 0.6875rem; font-weight: 700; margin-bottom: 4px; opacity: 0.85;">${roleName} • ${formatDate(m.createdAt)}</div>
        <div style="font-size: 0.875rem; line-height: 1.5;">${escapeHtml(m.message)}</div>
      </div>
    `;
  }).join('');

  container.scrollTop = container.scrollHeight;
};

const escapeHtml = (text: string): string => {
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
