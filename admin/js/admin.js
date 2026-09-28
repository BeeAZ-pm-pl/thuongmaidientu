"use strict";
const API_BASE = window.location.origin;
const adminToken = localStorage.getItem('novashop_admin_token');
if (!adminToken) {
    window.location.href = '/admin/login';
}
const state = {
    orders: [],
    products: [],
    users: [],
    categories: [],
    stats: null,
    adminUser: JSON.parse(localStorage.getItem('novashop_admin_user') || 'null'),
    token: adminToken,
    chatSessions: [],
    selectedSessionId: null,
    selectedSession: null,
    selectedMessages: [],
    chatFilter: 'all',
    chatPollingInterval: null
};
const dom = {
    kpiRevenue: document.getElementById('kpiRevenue'),
    kpiOrders: document.getElementById('kpiOrders'),
    kpiProducts: document.getElementById('kpiProducts'),
    kpiUsers: document.getElementById('kpiUsers'),
    adminHeaderTitle: document.getElementById('adminHeaderTitle'),
    refreshDataBtn: document.getElementById('refreshDataBtn'),
    filterOrderStatus: document.getElementById('filterOrderStatus'),
    ordersTableBody: document.getElementById('ordersTableBody'),
    productsTableBody: document.getElementById('productsTableBody'),
    usersTableBody: document.getElementById('usersTableBody'),
    servicesMeshGrid: document.getElementById('servicesMeshGrid'),
    productModal: document.getElementById('productModal'),
    productModalTitle: document.getElementById('productModalTitle'),
    productForm: document.getElementById('productForm'),
    editProductId: document.getElementById('editProductId'),
    prodNameInput: document.getElementById('prodNameInput'),
    prodCategorySelect: document.getElementById('prodCategorySelect'),
    prodPriceInput: document.getElementById('prodPriceInput'),
    prodOriginalPriceInput: document.getElementById('prodOriginalPriceInput'),
    prodStockInput: document.getElementById('prodStockInput'),
    prodRatingInput: document.getElementById('prodRatingInput'),
    prodImageInput: document.getElementById('prodImageInput'),
    prodDescInput: document.getElementById('prodDescInput'),
    saveProductBtnText: document.getElementById('saveProductBtnText'),
    openAddProductModalBtn: document.getElementById('openAddProductModalBtn'),
    orderDetailModal: document.getElementById('orderDetailModal'),
    orderDetailTitle: document.getElementById('orderDetailTitle'),
    orderDetailContent: document.getElementById('orderDetailContent'),
    toastContainer: document.getElementById('toastContainer'),
    adminChatUnreadBadge: document.getElementById('adminChatUnreadBadge'),
    refreshChatSessionsBtn: document.getElementById('refreshChatSessionsBtn'),
    filterChatStatus: document.getElementById('filterChatStatus'),
    adminChatSessionsList: document.getElementById('adminChatSessionsList'),
    chatConversationEmpty: document.getElementById('chatConversationEmpty'),
    chatConversationActive: document.getElementById('chatConversationActive'),
    activeCustomerName: document.getElementById('activeCustomerName'),
    activeCustomerEmail: document.getElementById('activeCustomerEmail'),
    activeSessionStatusBadge: document.getElementById('activeSessionStatusBadge'),
    adminSwitchToAiBtn: document.getElementById('adminSwitchToAiBtn'),
    adminCloseSessionBtn: document.getElementById('adminCloseSessionBtn'),
    adminChatMessagesContainer: document.getElementById('adminChatMessagesContainer'),
    adminReplyForm: document.getElementById('adminReplyForm'),
    adminReplyInput: document.getElementById('adminReplyInput')
};
const formatPrice = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount || 0);
};
const formatDate = (isoString) => {
    if (!isoString)
        return '';
    const d = new Date(isoString);
    return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};
const showToast = (title, message, type = 'success') => {
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
    dom.toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
};
const verifyAdminAccess = async () => {
    try {
        const res = await fetch(`${API_BASE}/api/auth/verify-admin`, {
            headers: { Authorization: `Bearer ${state.token}` }
        });
        const result = await res.json();
        if (!result.success) {
            localStorage.removeItem('novashop_admin_token');
            localStorage.removeItem('novashop_admin_user');
            window.location.href = '/admin/login';
        }
    }
    catch (err) {
        localStorage.removeItem('novashop_admin_token');
        localStorage.removeItem('novashop_admin_user');
        window.location.href = '/admin/login';
    }
};
const renderAdminHeader = () => {
    const container = document.querySelector('.admin-header-actions');
    if (!container)
        return;
    const adminName = state.adminUser ? state.adminUser.name : 'Quản Trị Viên';
    container.innerHTML = `
    <button id="refreshDataBtn" class="btn btn-outline btn-sm">
      <i class="ri-refresh-line"></i>
      <span>Làm Mới</span>
    </button>
    <div style="display: flex; align-items: center; gap: 10px; padding: 4px 12px; background: #f8fafc; border: 1px solid var(--border-light); border-radius: var(--radius-full);">
      <div class="user-avatar-circle" style="background: var(--primary); width: 28px; height: 28px; font-size: 0.75rem;">
        <i class="ri-shield-check-fill"></i>
      </div>
      <div style="display: flex; flex-direction: column;">
        <span style="font-size: 0.8125rem; font-weight: 700; color: var(--text-main);">${adminName}</span>
        <span style="font-size: 0.625rem; font-weight: 800; color: var(--primary); text-transform: uppercase;">ADMINISTRATOR</span>
      </div>
    </div>
    <button id="adminLogoutBtn" class="btn btn-outline btn-sm" style="color: var(--accent); border-color: #fecdd3;" title="Đăng xuất quản trị">
      <i class="ri-logout-box-r-line"></i>
      <span>Đăng Xuất</span>
    </button>
  `;
    document.getElementById('refreshDataBtn').addEventListener('click', () => {
        fetchStats();
        fetchOrders();
        fetchProducts();
        fetchUsers();
        showToast('Làm mới', 'Đã đồng bộ lại dữ liệu mới nhất', 'success');
    });
    const performLogout = () => {
        localStorage.removeItem('novashop_admin_token');
        localStorage.removeItem('novashop_admin_user');
        showToast('Đăng xuất', 'Đã đăng xuất khỏi cổng quản trị', 'success');
        setTimeout(() => {
            window.location.href = '/admin/login';
        }, 600);
    };
    document.getElementById('adminLogoutBtn').addEventListener('click', performLogout);
    const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');
    if (sidebarLogoutBtn) {
        sidebarLogoutBtn.addEventListener('click', performLogout);
    }
};
const fetchCategories = async () => {
    try {
        const res = await fetch(`${API_BASE}/api/categories`);
        const data = await res.json();
        if (data.success) {
            state.categories = data.data;
            dom.prodCategorySelect.innerHTML = state.categories
                .filter((c) => c.id !== 'cat_all')
                .map((c) => `<option value="${c.id}">${c.name}</option>`)
                .join('');
        }
    }
    catch (error) {
        console.error(error);
    }
};
const fetchStats = async () => {
    try {
        const res = await fetch(`${API_BASE}/api/orders/stats`);
        const data = await res.json();
        if (data.success) {
            state.stats = data.data;
            dom.kpiRevenue.textContent = formatPrice(state.stats.totalRevenue);
            dom.kpiOrders.textContent = state.stats.totalOrders;
        }
    }
    catch (err) {
        console.error(err);
    }
};
const fetchOrders = async () => {
    try {
        const status = dom.filterOrderStatus.value;
        const url = status ? `${API_BASE}/api/orders?status=${status}` : `${API_BASE}/api/orders`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) {
            state.orders = data.data;
            renderOrders();
        }
    }
    catch (err) {
        dom.ordersTableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: var(--accent); padding: 32px;">
          Không thể kết nối đến máy chủ
        </td>
      </tr>
    `;
    }
};
const getStatusBadge = (status) => {
    const map = {
        pending: '<span class="status-pill status-pending"><i class="ri-time-line"></i> Chờ xử lý</span>',
        processing: '<span class="status-pill status-processing"><i class="ri-loader-2-line"></i> Đang giao</span>',
        completed: '<span class="status-pill status-completed"><i class="ri-checkbox-circle-line"></i> Hoàn tất</span>',
        cancelled: '<span class="status-pill status-cancelled"><i class="ri-close-circle-line"></i> Đã huỷ</span>'
    };
    return map[status] || status;
};
const renderOrders = () => {
    if (state.orders.length === 0) {
        dom.ordersTableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 32px;">
          Chưa có đơn hàng nào trong hệ thống
        </td>
      </tr>
    `;
        return;
    }
    dom.ordersTableBody.innerHTML = state.orders.map((o) => `
    <tr>
      <td><strong>#${o.id}</strong></td>
      <td>${o.customerName}</td>
      <td>${o.customerPhone}</td>
      <td><strong style="color: var(--primary);">${formatPrice(o.totalAmount)}</strong></td>
      <td><span class="badge badge-primary">${o.paymentMethod.toUpperCase()}</span></td>
      <td>${getStatusBadge(o.status)}</td>
      <td style="font-size: 0.8125rem; color: var(--text-muted);">${formatDate(o.createdAt)}</td>
      <td>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-outline btn-sm" onclick="viewOrderDetail('${o.id}')" title="Xem chi tiết">
            <i class="ri-eye-line"></i>
          </button>
          <select onchange="updateOrderStatus('${o.id}', this.value)" class="form-select btn-sm" style="width: auto; padding: 4px 8px;">
            <option value="" disabled selected>Đổi trạng thái</option>
            <option value="pending">Chờ xử lý</option>
            <option value="processing">Đang giao</option>
            <option value="completed">Hoàn tất</option>
            <option value="cancelled">Huỷ đơn</option>
          </select>
        </div>
      </td>
    </tr>
  `).join('');
};
window.viewOrderDetail = (orderId) => {
    const order = state.orders.find((o) => o.id === orderId);
    if (!order)
        return;
    dom.orderDetailTitle.textContent = `Chi Tiết Đơn Hàng #${order.id}`;
    dom.orderDetailContent.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--border-light);">
      <div>
        <div style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 4px;">Thông tin khách hàng</div>
        <div style="font-weight: 700; font-size: 1.05rem;">${order.customerName}</div>
        <div style="color: var(--text-main);">${order.customerPhone}</div>
        <div style="color: var(--text-muted); font-size: 0.875rem; margin-top: 4px;">${order.shippingAddress}</div>
      </div>
      <div>
        <div style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 4px;">Thông tin đơn</div>
        <div>Trạng thái: ${getStatusBadge(order.status)}</div>
        <div style="margin-top: 4px;">Phương thức: <span class="badge badge-primary">${order.paymentMethod.toUpperCase()}</span></div>
        <div style="font-size: 0.8125rem; color: var(--text-muted); margin-top: 4px;">Thời gian đặt: ${formatDate(order.createdAt)}</div>
      </div>
    </div>
    <div style="font-weight: 700; margin-bottom: 12px;">Danh Sách Sản Phẩm Đã Mua:</div>
    <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
      ${order.items.map((i) => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: #f8fafc; border-radius: var(--radius-md);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${i.imageUrl}" style="width: 44px; height: 44px; object-fit: cover; border-radius: var(--radius-sm);">
            <div>
              <div style="font-weight: 600; font-size: 0.875rem;">${i.name}</div>
              <div style="font-size: 0.8125rem; color: var(--text-muted);">${formatPrice(i.price)} × ${i.quantity}</div>
            </div>
          </div>
          <div style="font-weight: 700; color: var(--primary);">${formatPrice(i.price * i.quantity)}</div>
        </div>
      `).join('')}
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 1.15rem; font-weight: 800; padding-top: 16px; border-top: 1px dashed var(--border-light);">
      <span>Tổng thanh toán:</span>
      <span style="color: var(--primary);">${formatPrice(order.totalAmount)}</span>
    </div>
  `;
    dom.orderDetailModal.classList.add('active');
};
window.updateOrderStatus = async (orderId, newStatus) => {
    if (!newStatus)
        return;
    try {
        const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${state.token}`
            },
            body: JSON.stringify({ status: newStatus })
        });
        const result = await res.json();
        if (result.success) {
            showToast('Cập nhật', `Đơn hàng #${orderId} chuyển sang trạng thái "${newStatus}"`, 'success');
            fetchOrders();
            fetchStats();
        }
        else {
            showToast('Lỗi', result.message, 'error');
        }
    }
    catch (err) {
        showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ', 'error');
    }
};
const fetchProducts = async () => {
    try {
        const res = await fetch(`${API_BASE}/api/products`);
        const data = await res.json();
        if (data.success) {
            state.products = data.data;
            dom.kpiProducts.textContent = String(state.products.length);
            renderProducts();
        }
    }
    catch (err) {
        dom.productsTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--accent); padding: 32px;">
          Không thể kết nối đến máy chủ
        </td>
      </tr>
    `;
    }
};
const renderProducts = () => {
    if (state.products.length === 0) {
        dom.productsTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 32px;">
          Chưa có sản phẩm nào trong kho
        </td>
      </tr>
    `;
        return;
    }
    dom.productsTableBody.innerHTML = state.products.map((p) => `
    <tr>
      <td>
        <div class="table-product-cell">
          <img src="${p.imageUrl}" alt="${p.name}" class="table-thumb">
          <div>
            <div style="font-weight: 600;">${p.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${p.id}</div>
          </div>
        </div>
      </td>
      <td><span class="badge badge-primary">${p.categoryName}</span></td>
      <td><strong>${formatPrice(p.price)}</strong></td>
      <td>
        <span class="badge ${p.stock < 10 ? 'badge-accent' : 'badge-success'}">
          ${p.stock} cái
        </span>
      </td>
      <td>${p.soldCount || 0}</td>
      <td>⭐ ${p.rating}</td>
      <td>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-outline btn-sm" onclick="openEditProductModal('${p.id}')">
            <i class="ri-edit-line"></i>
          </button>
          <button class="btn btn-outline btn-sm" style="color: var(--accent);" onclick="deleteProduct('${p.id}')">
            <i class="ri-delete-bin-line"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
};
window.openEditProductModal = (productId) => {
    const p = state.products.find((item) => item.id === productId);
    if (!p)
        return;
    dom.editProductId.value = p.id;
    dom.productModalTitle.textContent = 'Chỉnh Sửa Sản Phẩm';
    dom.saveProductBtnText.textContent = 'Cập Nhật Sản Phẩm';
    dom.prodNameInput.value = p.name;
    dom.prodCategorySelect.value = p.categoryId;
    dom.prodPriceInput.value = p.price;
    dom.prodOriginalPriceInput.value = p.originalPrice || p.price;
    dom.prodStockInput.value = p.stock;
    dom.prodRatingInput.value = p.rating || 5.0;
    dom.prodImageInput.value = p.imageUrl;
    dom.prodDescInput.value = p.description || '';
    dom.productModal.classList.add('active');
};
window.deleteProduct = async (productId) => {
    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này?'))
        return;
    try {
        const res = await fetch(`${API_BASE}/api/products/${productId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${state.token}` }
        });
        const result = await res.json();
        if (result.success) {
            showToast('Đã xóa', 'Xóa sản phẩm thành công', 'success');
            fetchProducts();
        }
        else {
            showToast('Lỗi', result.message, 'error');
        }
    }
    catch (err) {
        showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ', 'error');
    }
};
const fetchUsers = async () => {
    try {
        const res = await fetch(`${API_BASE}/api/auth/users`, {
            headers: { Authorization: `Bearer ${state.token}` }
        });
        const data = await res.json();
        if (data.success) {
            state.users = data.data;
            dom.kpiUsers.textContent = String(state.users.length);
            renderUsers();
        }
        else {
            dom.usersTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--accent); padding: 32px;">
            ${data.message || 'Không có quyền truy cập dữ liệu người dùng'}
          </td>
        </tr>
      `;
        }
    }
    catch (err) {
        dom.usersTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--accent); padding: 32px;">
          Lỗi khi tải danh sách người dùng
        </td>
      </tr>
    `;
    }
};
const renderUsers = () => {
    if (state.users.length === 0) {
        dom.usersTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 32px;">
          Chưa có người dùng nào được đăng ký
        </td>
      </tr>
    `;
        return;
    }
    dom.usersTableBody.innerHTML = state.users.map((u) => `
    <tr>
      <td><code>${u.id}</code></td>
      <td><strong>${u.name}</strong></td>
      <td>${u.email}</td>
      <td>
        <span class="badge ${u.role === 'admin' ? 'badge-accent' : 'badge-primary'}">
          ${u.role.toUpperCase()}
        </span>
      </td>
      <td>${u.phone || 'Chưa cập nhật'}</td>
      <td>${u.address || 'Chưa cập nhật'}</td>
      <td style="font-size: 0.8125rem; color: var(--text-muted);">${formatDate(u.createdAt)}</td>
    </tr>
  `).join('');
};
const checkServicesHealth = async () => {
    const services = [
        { name: 'Cổng Điều Phối (Gateway)', port: 8000, desc: 'Tiếp nhận và phục vụ giao diện' },
        { name: 'Dịch Vụ Xác Thực & Tài Khoản', port: 8001, desc: 'Quản lý tài khoản và phân quyền' },
        { name: 'Dịch Vụ Kho Hàng & Sản Phẩm', port: 8002, desc: 'Danh mục, tìm kiếm và quản lý kho' },
        { name: 'Dịch Vụ Đơn Hàng & Doanh Thu', port: 8003, desc: 'Xử lý giỏ hàng và thanh toán' },
        { name: 'Dịch Vụ Thông Báo Sự Kiện', port: 8004, desc: 'Tiếp nhận và lưu trữ thông báo' },
        { name: 'Dịch Vụ Live Chat & Gemini AI', port: 8005, desc: 'Tư vấn thông minh & hỗ trợ trực tuyến' },
        { name: 'Cơ Sở Dữ Liệu MySQL (XAMPP)', port: 3306, desc: 'Lưu trữ dữ liệu ecommerce_db' }
    ];
    dom.servicesMeshGrid.innerHTML = services.map((s) => `
    <div class="service-card">
      <div class="service-card-header">
        <div class="service-name">${s.name}</div>
        <div class="service-port">:${s.port}</div>
      </div>
      <div class="service-status-line">
        <span class="status-dot"></span>
        <span style="color: var(--success);">Đang hoạt động (Ready)</span>
      </div>
      <div style="font-size: 0.75rem; color: var(--text-muted);">
        ${s.desc}
      </div>
    </div>
  `).join('');
};
const fetchAdminChatSessions = async (silent = false) => {
    try {
        const filter = dom.filterChatStatus ? dom.filterChatStatus.value : 'all';
        const res = await fetch(`${API_BASE}/api/chat/admin/sessions?status=${filter}`);
        const data = await res.json();
        if (data.success) {
            state.chatSessions = data.data || [];
            const unreadTotal = data.totalUnread || 0;
            if (dom.adminChatUnreadBadge) {
                if (unreadTotal > 0) {
                    dom.adminChatUnreadBadge.textContent = unreadTotal;
                    dom.adminChatUnreadBadge.style.display = 'inline-block';
                }
                else {
                    dom.adminChatUnreadBadge.style.display = 'none';
                }
            }
            renderAdminChatSessions();
            if (state.selectedSessionId) {
                fetchAdminMessagesSilently(state.selectedSessionId);
            }
        }
    }
    catch (err) {
        if (!silent && dom.adminChatSessionsList) {
            dom.adminChatSessionsList.innerHTML = `
        <div class="empty-state" style="padding: 24px; color: var(--accent);">
          <i class="ri-error-warning-line"></i>
          <div>Không thể kết nối dịch vụ Live Chat (Port 8005)</div>
        </div>
      `;
        }
    }
};
const renderAdminChatSessions = () => {
    if (!dom.adminChatSessionsList)
        return;
    if (state.chatSessions.length === 0) {
        dom.adminChatSessionsList.innerHTML = `
      <div class="empty-state" style="padding: 32px 16px; text-align: center;">
        <i class="ri-inbox-line" style="font-size: 2rem; color: #94a3b8;"></i>
        <div style="font-size: 0.875rem; font-weight: 600; margin-top: 8px;">Không có phiên trò chuyện nào</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">Khách hàng nhắn tin qua storefront sẽ hiển thị tại đây.</div>
      </div>
    `;
        return;
    }
    dom.adminChatSessionsList.innerHTML = state.chatSessions.map((s) => {
        const isActive = s.id === state.selectedSessionId;
        const timeFormatted = formatDate(s.updatedAt || s.createdAt);
        let statusClass = 'pill-ai';
        let statusLabel = '🤖 Trợ lý AI';
        if (s.status === 'human_waiting') {
            statusClass = 'pill-human-waiting';
            statusLabel = '⚠️ Chờ CSKH';
        }
        else if (s.status === 'human_active') {
            statusClass = 'pill-human-active';
            statusLabel = '💬 Đang chat';
        }
        else if (s.status === 'closed') {
            statusClass = 'pill-closed';
            statusLabel = '🔒 Đã đóng';
        }
        const unreadHtml = s.unreadByAdmin > 0
            ? `<span class="session-unread-tag">${s.unreadByAdmin}</span>`
            : '';
        return `
      <div class="chat-session-card ${isActive ? 'active' : ''}" onclick="window.selectAdminChatSession('${s.id}')">
        <div class="chat-session-avatar">
          <i class="ri-user-smile-line"></i>
        </div>
        <div class="chat-session-body">
          <div class="chat-session-header-line">
            <span class="chat-session-name">${s.customerName || 'Khách hàng'}</span>
            <span class="chat-session-time">${timeFormatted.split(' ')[0]}</span>
          </div>
          <div class="chat-session-snippet">${s.lastMessage || 'Chưa có tin nhắn...'}</div>
          <div class="chat-session-footer-line">
            <span class="session-status-pill ${statusClass}">${statusLabel}</span>
            ${unreadHtml}
          </div>
        </div>
      </div>
    `;
    }).join('');
};
window.selectAdminChatSession = async (sessionId) => {
    state.selectedSessionId = sessionId;
    state.selectedSession = state.chatSessions.find((s) => s.id === sessionId);
    renderAdminChatSessions();
    if (dom.chatConversationEmpty)
        dom.chatConversationEmpty.style.display = 'none';
    if (dom.chatConversationActive)
        dom.chatConversationActive.style.display = 'flex';
    if (state.selectedSession) {
        dom.activeCustomerName.textContent = state.selectedSession.customerName || 'Khách hàng';
        dom.activeCustomerEmail.textContent = `Phiên: ${state.selectedSession.id} ${state.selectedSession.customerEmail ? '• ' + state.selectedSession.customerEmail : ''}`;
        updateActiveSessionBadge(state.selectedSession.status);
    }
    if (dom.adminChatMessagesContainer) {
        dom.adminChatMessagesContainer.innerHTML = `
      <div class="empty-state" style="padding: 24px;">
        <i class="ri-loader-4-line ri-spin" style="font-size: 1.5rem; color: var(--primary);"></i>
        <div style="font-size: 0.8125rem; margin-top: 8px;">Đang tải tin nhắn...</div>
      </div>
    `;
    }
    await fetchAdminMessages(sessionId);
};
const updateActiveSessionBadge = (status) => {
    if (!dom.activeSessionStatusBadge)
        return;
    if (status === 'human_waiting') {
        dom.activeSessionStatusBadge.className = 'session-status-pill pill-human-waiting';
        dom.activeSessionStatusBadge.textContent = '⚠️ Yêu cầu CSKH hỗ trợ';
    }
    else if (status === 'human_active') {
        dom.activeSessionStatusBadge.className = 'session-status-pill pill-human-active';
        dom.activeSessionStatusBadge.textContent = '💬 Nhân viên đang tư vấn';
    }
    else if (status === 'closed') {
        dom.activeSessionStatusBadge.className = 'session-status-pill pill-closed';
        dom.activeSessionStatusBadge.textContent = '🔒 Phiên đã đóng';
    }
    else {
        dom.activeSessionStatusBadge.className = 'session-status-pill pill-ai';
        dom.activeSessionStatusBadge.textContent = '🤖 Gemini AI phụ trách';
    }
};
const fetchAdminMessages = async (sessionId) => {
    try {
        const res = await fetch(`${API_BASE}/api/chat/messages/${sessionId}`);
        const data = await res.json();
        if (data.success) {
            state.selectedSession = data.data.session;
            state.selectedMessages = data.data.messages || [];
            renderAdminChatMessages();
            updateActiveSessionBadge(state.selectedSession.status);
        }
    }
    catch (err) {
        console.error('Lỗi tải tin nhắn admin:', err);
    }
};
const fetchAdminMessagesSilently = async (sessionId) => {
    try {
        const res = await fetch(`${API_BASE}/api/chat/messages/${sessionId}`);
        const data = await res.json();
        if (data.success) {
            const msgs = data.data.messages || [];
            if (msgs.length !== state.selectedMessages.length) {
                state.selectedMessages = msgs;
                state.selectedSession = data.data.session;
                renderAdminChatMessages();
                updateActiveSessionBadge(state.selectedSession.status);
            }
        }
    }
    catch (e) { }
};
const renderAdminChatMessages = () => {
    if (!dom.adminChatMessagesContainer)
        return;
    dom.adminChatMessagesContainer.innerHTML = state.selectedMessages.map((m) => {
        const isCustomer = m.sender === 'customer';
        const isStaff = m.sender === 'staff';
        const roleClass = isCustomer ? 'customer' : (isStaff ? 'staff' : 'ai');
        const senderTitle = isCustomer
            ? (m.senderName || 'Khách hàng')
            : (isStaff ? `NV: ${m.senderName || 'CSKH'}` : 'NovaBot (Gemini AI)');
        const senderIcon = isCustomer ? 'ri-user-3-line' : (isStaff ? 'ri-shield-user-line' : 'ri-robot-2-line');
        let productsHtml = '';
        if (m.suggestedProducts && Array.isArray(m.suggestedProducts) && m.suggestedProducts.length > 0) {
            productsHtml = `
        <div style="margin-top: 8px; font-size: 0.75rem; color: #0284c7; background: #e0f2fe; padding: 6px 10px; border-radius: 6px;">
          <i class="ri-lightbulb-line"></i> Đã gợi ý ${m.suggestedProducts.length} sản phẩm: <strong>${m.suggestedProducts.map((p) => p.name).join(', ')}</strong>
        </div>
      `;
        }
        return `
      <div class="admin-msg-bubble-wrap ${roleClass}">
        <div class="admin-msg-sender">
          <i class="${senderIcon}"></i>
          <span>${senderTitle}</span>
        </div>
        <div class="admin-msg-bubble">
          <div>${m.message.replace(/\n/g, '<br>')}</div>
          ${productsHtml}
        </div>
        <span class="admin-msg-time">${formatDate(m.createdAt)}</span>
      </div>
    `;
    }).join('');
    dom.adminChatMessagesContainer.scrollTop = dom.adminChatMessagesContainer.scrollHeight;
};
const startAdminChatPolling = () => {
    if (state.chatPollingInterval)
        clearInterval(state.chatPollingInterval);
    state.chatPollingInterval = setInterval(() => {
        fetchAdminChatSessions(true);
    }, 4000);
};
const setupEventListeners = () => {
    document.querySelectorAll('.admin-nav-item').forEach((item) => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');
            document.querySelectorAll('.admin-nav-item').forEach((i) => i.classList.remove('active'));
            item.classList.add('active');
            document.querySelectorAll('.tab-view').forEach((sec) => (sec.style.display = 'none'));
            const targetSec = document.getElementById(tabId);
            if (targetSec)
                targetSec.style.display = 'block';
            const titles = {
                ordersTab: 'Quản Lý Đơn Hàng & Doanh Thu',
                productsTab: 'Quản Lý Kho Hàng & Sản Phẩm',
                usersTab: 'Quản Lý Người Dùng & Phân Quyền',
                chatTab: 'Live Chat & Chăm Sóc Khách Hàng (Gemini AI)',
                systemTab: 'Trạng Thái Hệ Thống'
            };
            dom.adminHeaderTitle.textContent = titles[tabId] || 'Quản Trị Hệ Thống';
            if (tabId === 'chatTab') {
                fetchAdminChatSessions();
            }
        });
    });
    if (dom.filterChatStatus) {
        dom.filterChatStatus.addEventListener('change', () => {
            fetchAdminChatSessions();
        });
    }
    if (dom.refreshChatSessionsBtn) {
        dom.refreshChatSessionsBtn.addEventListener('click', () => {
            fetchAdminChatSessions();
            showToast('Đồng bộ', 'Đã làm mới danh sách hội thoại', 'success');
        });
    }
    if (dom.adminSwitchToAiBtn) {
        dom.adminSwitchToAiBtn.addEventListener('click', async () => {
            if (!state.selectedSessionId)
                return;
            try {
                const res = await fetch(`${API_BASE}/api/chat/switch-mode`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId: state.selectedSessionId, mode: 'ai' })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('Chế độ AI', 'Đã chuyển phiên trò chuyện lại cho Gemini AI', 'success');
                    fetchAdminChatSessions();
                    fetchAdminMessages(state.selectedSessionId);
                }
            }
            catch (e) {
                showToast('Lỗi', 'Không thể chuyển chế độ', 'error');
            }
        });
    }
    if (dom.adminCloseSessionBtn) {
        dom.adminCloseSessionBtn.addEventListener('click', async () => {
            if (!state.selectedSessionId)
                return;
            if (!confirm('Bạn có chắc chắn muốn đóng phiên hỗ trợ này?'))
                return;
            try {
                const res = await fetch(`${API_BASE}/api/chat/switch-mode`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId: state.selectedSessionId, mode: 'closed' })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('Đã đóng phiên', 'Phiên hỗ trợ đã hoàn tất', 'success');
                    fetchAdminChatSessions();
                    fetchAdminMessages(state.selectedSessionId);
                }
            }
            catch (e) {
                showToast('Lỗi', 'Không thể đóng phiên', 'error');
            }
        });
    }
    if (dom.adminReplyForm && dom.adminReplyInput) {
        dom.adminReplyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = dom.adminReplyInput.value.trim();
            if (!message || !state.selectedSessionId)
                return;
            dom.adminReplyInput.value = '';
            try {
                const staffName = state.adminUser ? state.adminUser.name : 'Chuyên viên CSKH';
                const res = await fetch(`${API_BASE}/api/chat/admin/reply`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: state.selectedSessionId,
                        message,
                        staffName
                    })
                });
                const data = await res.json();
                if (data.success) {
                    fetchAdminMessages(state.selectedSessionId);
                    fetchAdminChatSessions(true);
                }
                else {
                    showToast('Lỗi', data.message, 'error');
                }
            }
            catch (err) {
                showToast('Lỗi', 'Không thể gửi phản hồi', 'error');
            }
        });
    }
    dom.filterOrderStatus.addEventListener('change', fetchOrders);
    dom.openAddProductModalBtn.addEventListener('click', () => {
        dom.editProductId.value = '';
        dom.productModalTitle.textContent = 'Thêm Sản Phẩm Mới';
        dom.saveProductBtnText.textContent = 'Thêm Sản Phẩm';
        dom.productForm.reset();
        dom.productModal.classList.add('active');
    });
    dom.productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = dom.editProductId.value;
        const payload = {
            name: dom.prodNameInput.value.trim(),
            categoryId: dom.prodCategorySelect.value,
            price: Number(dom.prodPriceInput.value),
            originalPrice: Number(dom.prodOriginalPriceInput.value || dom.prodPriceInput.value),
            stock: Number(dom.prodStockInput.value),
            rating: Number(dom.prodRatingInput.value || 5.0),
            imageUrl: dom.prodImageInput.value.trim(),
            description: dom.prodDescInput.value.trim(),
            featured: true
        };
        try {
            const url = id ? `${API_BASE}/api/products/${id}` : `${API_BASE}/api/products`;
            const method = id ? 'PUT' : 'POST';
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
                showToast('Thành công', id ? 'Cập nhật sản phẩm thành công' : 'Thêm sản phẩm mới thành công', 'success');
                dom.productModal.classList.remove('active');
                fetchProducts();
            }
            else {
                showToast('Lỗi', result.message, 'error');
            }
        }
        catch (err) {
            showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ', 'error');
        }
    });
    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-close-modal');
            const target = document.getElementById(modalId);
            if (target)
                target.classList.remove('active');
        });
    });
    document.querySelectorAll('.modal-overlay').forEach((modal) => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
};
const init = async () => {
    await verifyAdminAccess();
    renderAdminHeader();
    setupEventListeners();
    fetchCategories();
    fetchStats();
    fetchOrders();
    fetchProducts();
    fetchUsers();
    checkServicesHealth();
    fetchAdminChatSessions(true);
    startAdminChatPolling();
};
document.addEventListener('DOMContentLoaded', init);
