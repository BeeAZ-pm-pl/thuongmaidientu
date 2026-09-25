const API_BASE = window.location.origin;

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

document.addEventListener('DOMContentLoaded', () => {
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
      } else {
        passwordInput.type = 'password';
        togglePassIcon.className = 'ri-eye-line';
      }
    });
  }

  if (loginForm) {
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
          localStorage.setItem('novashop_customer_token', result.data.token);
          localStorage.setItem('novashop_customer_user', JSON.stringify(result.data.user));
          showToast('Thành công', `Xin chào, ${result.data.user.name}!`, 'success');
          setTimeout(() => {
            window.location.href = '/';
          }, 800);
        } else {
          showToast('Đăng nhập thất bại', result.message || 'Sai thông tin đăng nhập', 'error');
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>Đăng Nhập Ngay</span> <i class="ri-arrow-right-line"></i>`;
        }
      } catch (err) {
        showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Đăng Nhập Ngay</span> <i class="ri-arrow-right-line"></i>`;
      }
    });
  }
});
