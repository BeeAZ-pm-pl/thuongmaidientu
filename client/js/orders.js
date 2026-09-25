const API_BASE = window.location.origin;

const user = JSON.parse(localStorage.getItem('novashop_customer_user') || 'null');
const token = localStorage.getItem('novashop_customer_token') || '';

const formatPrice = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
};

const formatDate = (dateStr) => {
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

const fetchOrders = async () => {
  const loadingEl = document.getElementById('ordersLoading');
  const emptyEl = document.getElementById('ordersEmpty');
  const listEl = document.getElementById('ordersList');

  try {
    const endpoint = (user && user.id)
      ? `${API_BASE}/api/orders/user/${user.id}`
      : `${API_BASE}/api/orders`;

    const res = await fetch(endpoint, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    const data = await res.json();

    if (loadingEl) loadingEl.style.display = 'none';

    if (data.success && data.data && data.data.length > 0) {
      if (emptyEl) emptyEl.style.display = 'none';
      if (listEl) {
        listEl.innerHTML = data.data.map((order) => {
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
    } else {
      if (emptyEl) emptyEl.style.display = 'block';
    }
  } catch (err) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'block';
  }
};

document.addEventListener('DOMContentLoaded', fetchOrders);
