const API_BASE = window.location.origin;

const existingToken = localStorage.getItem('novashop_admin_token');
if (existingToken) {
  fetch(`${API_BASE}/api/auth/verify-admin`, {
    headers: { Authorization: `Bearer ${existingToken}` }
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        window.location.href = '/admin';
      }
    })
    .catch(() => {});
}

const showToast = (title, message, type = 'success') => {
  const icons = {
    success: 'ri-checkbox-circle-line',
    error: 'ri-error-warning-line',
    warning: 'ri-alert-line'
  };

  const container = document.getElementById('toastContainer');
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

const adminLoginForm = document.getElementById('adminLoginForm');
const adminUsername = document.getElementById('adminUsername');
const adminPassword = document.getElementById('adminPassword');

if (adminLoginForm) {
  adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = adminUsername.value.trim();
    const password = adminPassword.value;

    try {
      const res = await fetch(`${API_BASE}/api/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const result = await res.json();

      if (result.success) {
        localStorage.setItem('novashop_admin_token', result.data.token);
        localStorage.setItem('novashop_admin_user', JSON.stringify(result.data.user));

        showToast('Thành công', 'Xác thực quản trị viên thành công. Đang chuyển hướng...', 'success');
        setTimeout(() => {
          window.location.href = '/admin';
        }, 800);
      } else {
        showToast('Truy cập bị từ chối', result.message || 'Tài khoản không đủ thẩm quyền', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ xác thực', 'error');
    }
  });
}
