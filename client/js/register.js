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
  const regForm = document.getElementById('customerRegisterForm');
  const submitBtn = document.getElementById('regSubmitBtn');
  const passwordInput = document.getElementById('regPassword');
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

  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('regName').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const password = passwordInput.value;
      const phone = document.getElementById('regPhone').value.trim();
      const address = document.getElementById('regAddress').value.trim();

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
          localStorage.setItem('novashop_customer_token', result.data.token);
          localStorage.setItem('novashop_customer_user', JSON.stringify(result.data.user));
          showToast('Thành công', 'Đăng ký tài khoản thành công! Đang chuyển hướng...', 'success');
          setTimeout(() => {
            window.location.href = '/';
          }, 1000);
        } else {
          showToast('Đăng ký thất bại', result.message || 'Lỗi đăng ký tài khoản', 'error');
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>Hoàn Tất Đăng Ký</span> <i class="ri-check-line"></i>`;
        }
      } catch (err) {
        showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Hoàn Tất Đăng Ký</span> <i class="ri-check-line"></i>`;
      }
    });
  }
});
