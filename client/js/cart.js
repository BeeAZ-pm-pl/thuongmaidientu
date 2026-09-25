const API_BASE = window.location.origin;

let cart = JSON.parse(localStorage.getItem('novashop_cart') || '[]');
const user = JSON.parse(localStorage.getItem('novashop_customer_user') || 'null');
const token = localStorage.getItem('novashop_customer_token') || '';

const formatPrice = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
};

const showToast = (title, message, type = 'success') => {
  const container = document.getElementById('toastContainer');
  if (!container) return;

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
  localStorage.setItem('novashop_cart', JSON.stringify(cart));
  renderCart();
};

window.changeCartQty = (index, delta) => {
  if (cart[index]) {
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) {
      cart.splice(index, 1);
    }
    saveCart();
  }
};

window.removeCartItem = (index) => {
  if (cart[index]) {
    cart.splice(index, 1);
    saveCart();
    showToast('Giỏ hàng', 'Đã xóa sản phẩm khỏi giỏ hàng', 'warning');
  }
};

const renderCart = () => {
  const emptyView = document.getElementById('emptyCartView');
  const activeView = document.getElementById('activeCartView');
  const itemsList = document.getElementById('cartItemsList');
  const headerCount = document.getElementById('cartHeaderCount');
  const summarySubtotal = document.getElementById('summarySubtotal');
  const summaryGrandTotal = document.getElementById('summaryGrandTotal');

  if (cart.length === 0) {
    if (emptyView) emptyView.style.display = 'block';
    if (activeView) activeView.style.display = 'none';
    return;
  }

  if (emptyView) emptyView.style.display = 'none';
  if (activeView) activeView.style.display = 'grid';

  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (headerCount) headerCount.textContent = `${totalCount} sản phẩm`;
  if (summarySubtotal) summarySubtotal.textContent = formatPrice(totalAmount);
  if (summaryGrandTotal) summaryGrandTotal.textContent = formatPrice(totalAmount);

  if (itemsList) {
    itemsList.innerHTML = cart.map((item, index) => `
      <div class="cart-item-row">
        <img src="${item.imageUrl}" alt="${item.name}" class="cart-row-img">
        <div class="cart-row-info">
          <div class="cart-row-name">${item.name}</div>
          ${item.variantName ? `<div class="cart-row-variant">Phân loại: ${item.variantName}</div>` : ''}
          <div class="cart-row-price">${formatPrice(item.price)}</div>
        </div>
        <div class="cart-row-controls">
          <div class="qty-control">
            <button class="qty-btn" type="button" onclick="window.changeCartQty(${index}, -1)">-</button>
            <input type="text" class="qty-input" value="${item.quantity}" readonly>
            <button class="qty-btn" type="button" onclick="window.changeCartQty(${index}, 1)">+</button>
          </div>
          <button class="btn-icon" type="button" style="color: var(--accent);" title="Xóa" onclick="window.removeCartItem(${index})">
            <i class="ri-delete-bin-line"></i>
          </button>
        </div>
      </div>
    `).join('');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  renderCart();

  const nameInput = document.getElementById('checkoutName');
  const phoneInput = document.getElementById('checkoutPhone');
  const addressInput = document.getElementById('checkoutAddress');
  const checkoutForm = document.getElementById('checkoutSubmitForm');
  const confirmBtn = document.getElementById('confirmOrderBtn');

  if (user) {
    if (nameInput) nameInput.value = user.name || '';
    if (phoneInput) phoneInput.value = user.phone || '';
    if (addressInput) addressInput.value = user.address || '';
  }

  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (cart.length === 0) {
        showToast('Thông báo', 'Giỏ hàng đang trống', 'warning');
        return;
      }

      const orderData = {
        userId: user ? user.id : 'guest_' + Date.now(),
        customerName: nameInput.value.trim(),
        customerPhone: phoneInput.value.trim(),
        shippingAddress: addressInput.value.trim(),
        paymentMethod: document.getElementById('checkoutPayment').value,
        items: cart
      };

      confirmBtn.disabled = true;
      confirmBtn.innerHTML = `<span>Đang xử lý đơn hàng...</span> <i class="ri-loader-4-line ri-spin"></i>`;

      try {
        const res = await fetch(`${API_BASE}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(orderData)
        });
        const result = await res.json();

        if (result.success) {
          cart = [];
          saveCart();
          showToast('Thành công', `Đặt hàng thành công! Mã đơn: #${result.data.id}`, 'success');
          setTimeout(() => {
            window.location.href = '/orders';
          }, 1200);
        } else {
          showToast('Lỗi đặt hàng', result.message || 'Không thể tạo đơn hàng', 'error');
          confirmBtn.disabled = false;
          confirmBtn.innerHTML = `<span>Xác Nhận Đặt Hàng</span> <i class="ri-check-double-line"></i>`;
        }
      } catch (err) {
        showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ', 'error');
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = `<span>Xác Nhận Đặt Hàng</span> <i class="ri-check-double-line"></i>`;
      }
    });
  }
});
