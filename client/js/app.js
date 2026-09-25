const API_BASE = window.location.origin;

const state = {
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
  selectedQty: 1
};

const dom = {
  productsGrid: document.getElementById('productsGrid'),
  productTotalCount: document.getElementById('productTotalCount'),
  flashSaleGrid: document.getElementById('flashSaleGrid'),
  flashHour: document.getElementById('flashHour'),
  flashMin: document.getElementById('flashMin'),
  flashSec: document.getElementById('flashSec'),
  categoryTabs: document.getElementById('categoryTabs'),
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  sortSelect: document.getElementById('sortSelect'),
  userMenuWrapper: document.getElementById('userMenuWrapper'),
  cartCountBadge: document.getElementById('cartCountBadge'),
  quickviewModal: document.getElementById('quickviewModal'),
  quickviewContent: document.getElementById('quickviewContent'),
  toastContainer: document.getElementById('toastContainer')
};

const formatPrice = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
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

  if (dom.toastContainer) {
    dom.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};

const saveCart = () => {
  localStorage.setItem('novashop_cart', JSON.stringify(state.cart));
  updateCartBadge();
};

const updateCartBadge = () => {
  const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  if (dom.cartCountBadge) {
    dom.cartCountBadge.textContent = totalCount;
  }
};

window.addToCartQuick = (productId, event) => {
  if (event) event.stopPropagation();
  const product = state.products.find((p) => p.id === productId);
  if (!product) return;

  const defaultVariant = (product.variants && product.variants.length > 0) ? product.variants[0] : null;
  addCartItem(product, defaultVariant, 1);
};

window.buyNowQuick = (productId, event) => {
  if (event) event.stopPropagation();
  const product = state.products.find((p) => p.id === productId);
  if (!product) return;

  const defaultVariant = (product.variants && product.variants.length > 0) ? product.variants[0] : null;
  addCartItem(product, defaultVariant, 1, false);
  window.location.href = '/cart';
};

const addCartItem = (product, variant, quantity = 1, showFeedback = true) => {
  const variantId = variant ? variant.id : null;
  const variantName = variant ? `${variant.color} - ${variant.type}` : '';
  const price = variant ? variant.price : product.price;
  const imageUrl = variant && variant.imageUrl ? variant.imageUrl : product.imageUrl;

  const existingItem = state.cart.find(
    (item) => item.productId === product.id && item.variantId === variantId
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    state.cart.push({
      productId: product.id,
      variantId,
      name: product.name,
      variantName,
      color: variant ? variant.color : '',
      type: variant ? variant.type : '',
      price,
      imageUrl,
      quantity
    });
  }

  saveCart();
  if (showFeedback) {
    const itemName = variantName ? `"${product.name} (${variantName})"` : `"${product.name}"`;
    showToast('Giỏ hàng', `Đã thêm ${itemName} vào giỏ hàng`, 'success');
  }
};

let countdownSeconds = 2 * 3600 + 45 * 60 + 18;

const initFlashSaleCountdown = () => {
  setInterval(() => {
    countdownSeconds--;
    if (countdownSeconds < 0) countdownSeconds = 4 * 3600;
    const h = String(Math.floor(countdownSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((countdownSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(countdownSeconds % 60).padStart(2, '0');

    if (dom.flashHour) dom.flashHour.textContent = h;
    if (dom.flashMin) dom.flashMin.textContent = m;
    if (dom.flashSec) dom.flashSec.textContent = s;
  }, 1000);
};

const renderFlashSale = () => {
  if (!dom.flashSaleGrid) return;

  const flashProducts = state.products.filter((p) => p.isFlashSale);
  if (flashProducts.length === 0) {
    const flashSection = document.getElementById('flashSaleSection');
    if (flashSection) flashSection.style.display = 'none';
    return;
  }

  const flashSection = document.getElementById('flashSaleSection');
  if (flashSection) flashSection.style.display = 'block';

  dom.flashSaleGrid.innerHTML = flashProducts.map((p) => {
    const discount = p.flashSaleDiscount || Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
    const soldProgress = Math.min(100, Math.max(20, Math.round(((p.soldCount || 100) / (p.soldCount + p.stock)) * 100)));

    return `
      <div class="flash-card" onclick="openShopeeDetail('${p.id}')">
        <div class="flash-card-media">
          <img src="${p.imageUrl}" alt="${p.name}" loading="lazy">
          <div class="flash-discount-tag">
            <span>-${discount}%</span>
            <span style="font-size: 0.6rem; font-weight: 600;">GIẢM</span>
          </div>
        </div>
        <div class="flash-card-body">
          <div class="flash-card-price">${formatPrice(p.price)}</div>
          <div class="flash-card-original">${formatPrice(p.originalPrice)}</div>
          <div class="flash-progress-wrapper">
            <div class="flash-progress-bar" style="width: ${soldProgress}%;"></div>
            <div class="flash-progress-text">
              <i class="ri-fire-fill" style="color: #ffd839;"></i> Đã bán ${p.soldCount}
            </div>
          </div>
          <div class="flash-card-btn-group">
            <button class="btn-card-cart" style="flex: 1; width: auto;" title="Thêm vào giỏ" onclick="addToCartQuick('${p.id}', event)">
              <i class="ri-shopping-cart-line"></i>
            </button>
            <button class="btn-card-buy" style="flex: 2;" onclick="buyNowQuick('${p.id}', event)">
              <span>Mua Ngay</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
};

const renderUserMenu = () => {
  if (!dom.userMenuWrapper) return;

  if (state.user && state.token) {
    dom.userMenuWrapper.innerHTML = `
      <div class="user-menu" style="position: relative;">
        <button id="userDropdownTrigger" class="btn btn-secondary btn-sm" style="gap: 8px;">
          <div style="width: 26px; height: 26px; border-radius: var(--radius-full); background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8125rem;">
            ${(state.user.name || 'U').charAt(0).toUpperCase()}
          </div>
          <span>${state.user.name}</span>
          <i class="ri-arrow-down-s-line"></i>
        </button>
        <div id="userDropdown" class="user-dropdown">
          <div style="padding: 10px 14px; border-bottom: 1px solid var(--border-light); font-size: 0.8125rem;">
            <div style="font-weight: 700; color: var(--text-main);">${state.user.name}</div>
            <div style="color: var(--text-muted);">${state.user.email}</div>
          </div>
          <a href="/orders" class="dropdown-item">
            <i class="ri-file-list-3-line"></i>
            <span>Đơn Mua Của Tôi</span>
          </a>
          <a href="/cart" class="dropdown-item">
            <i class="ri-shopping-cart-line"></i>
            <span>Giỏ Hàng</span>
          </a>
          <div class="dropdown-divider"></div>
          <button id="logoutBtn" class="dropdown-item" style="width: 100%; border: none; background: none; text-align: left; cursor: pointer; color: var(--accent);">
            <i class="ri-logout-box-r-line"></i>
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('userDropdownTrigger').addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('userDropdown').classList.toggle('show');
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
      state.token = '';
      state.user = null;
      localStorage.removeItem('novashop_customer_token');
      localStorage.removeItem('novashop_customer_user');
      renderUserMenu();
      showToast('Đăng xuất', 'Bạn đã đăng xuất tài khoản', 'warning');
    });
  } else {
    dom.userMenuWrapper.innerHTML = `
      <a href="/login" class="btn btn-secondary btn-sm">
        <i class="ri-user-line"></i>
        <span>Đăng Nhập</span>
      </a>
      <a href="/register" class="btn btn-primary btn-sm">
        <span>Đăng Ký</span>
      </a>
    `;
  }
};

const renderCategories = () => {
  if (!dom.categoryTabs) return;

  dom.categoryTabs.innerHTML = state.categories.map((cat) => `
    <button class="category-pill ${state.activeCategory === cat.id ? 'active' : ''}" data-cat-id="${cat.id}">
      <i class="${cat.icon}"></i>
      <span>${cat.name}</span>
    </button>
  `).join('');

  document.querySelectorAll('.category-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      state.activeCategory = pill.getAttribute('data-cat-id');
      document.querySelectorAll('.category-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      fetchProducts();
    });
  });
};

const renderProducts = () => {
  if (!dom.productsGrid) return;
  if (dom.productTotalCount) dom.productTotalCount.textContent = `${state.products.length} sản phẩm`;

  if (state.products.length === 0) {
    dom.productsGrid.innerHTML = `
      <div class="empty-state">
        <i class="ri-search-eye-line empty-icon"></i>
        <div class="empty-title">Không tìm thấy sản phẩm phù hợp</div>
        <div class="empty-desc">Hãy thử thay đổi từ khoá tìm kiếm hoặc chuyển danh mục khác.</div>
      </div>
    `;
    return;
  }

  dom.productsGrid.innerHTML = state.products.map((product) => `
    <div class="product-card" onclick="openShopeeDetail('${product.id}')">
      <div class="card-media">
        <img src="${product.imageUrl}" alt="${product.name}" class="card-image" loading="lazy">
        <div class="card-badge-container">
          ${product.originalPrice > product.price ? `
            <span class="badge badge-sale">
              -${Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
            </span>
          ` : ''}
          ${product.featured ? `
            <span class="badge badge-primary">Nổi bật</span>
          ` : ''}
        </div>
      </div>
      <div class="card-body">
        <div class="card-category">${product.categoryName}</div>
        <h3 class="card-title" title="${product.name}">${product.name}</h3>
        <div class="card-meta">
          <div class="rating-badge">
            <i class="ri-star-fill"></i>
            <span>${product.rating}</span>
          </div>
          <span class="sold-text">• Đã bán ${product.soldCount || 0}</span>
        </div>
        <div class="card-footer">
          <div class="price-wrapper">
            <div class="current-price">${formatPrice(product.price)}</div>
            ${product.originalPrice > product.price ? `
              <div class="original-price">${formatPrice(product.originalPrice)}</div>
            ` : ''}
          </div>
          <div class="card-actions-group">
            <button class="btn-card-cart" title="Thêm vào giỏ" onclick="addToCartQuick('${product.id}', event)">
              <i class="ri-shopping-cart-line"></i>
            </button>
            <button class="btn-card-buy" onclick="buyNowQuick('${product.id}', event)">
              <span>Mua Ngay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
};

window.openShopeeDetail = (productId) => {
  const product = state.products.find((p) => p.id === productId);
  if (!product) return;

  state.activeProduct = product;
  const variants = product.variants && product.variants.length > 0 ? product.variants : [];

  const uniqueColors = [...new Set(variants.map((v) => v.color))];
  const uniqueTypes = [...new Set(variants.map((v) => v.type))];

  state.selectedColor = uniqueColors.length > 0 ? uniqueColors[0] : 'Tiêu chuẩn';
  state.selectedType = uniqueTypes.length > 0 ? uniqueTypes[0] : 'Tiêu chuẩn';
  state.selectedQty = 1;

  const findCurrentVariant = () => {
    if (variants.length === 0) return null;
    return variants.find((v) => v.color === state.selectedColor && v.type === state.selectedType)
      || variants.find((v) => v.color === state.selectedColor)
      || variants[0];
  };

  state.selectedVariant = findCurrentVariant();

  const renderModalContent = () => {
    const v = state.selectedVariant;
    const currentPrice = v ? v.price : product.price;
    const originalPrice = v ? v.originalPrice : product.originalPrice;
    const stock = v ? v.stock : product.stock;
    const activeImage = v && v.imageUrl ? v.imageUrl : product.imageUrl;
    const discount = originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;

    const allThumbnails = variants.length > 0
      ? variants.map((varItem) => varItem.imageUrl)
      : [product.imageUrl];
    const uniqueThumbs = [...new Set(allThumbnails)];

    dom.quickviewContent.innerHTML = `
      <div class="shopee-main-grid">
        <div class="shopee-gallery">
          <div class="shopee-main-image-wrap">
            <img id="shopeeMainImg" src="${activeImage}" alt="${product.name}" class="shopee-main-image">
          </div>
          <div class="shopee-thumbnails">
            ${uniqueThumbs.map((imgUrl) => `
              <img src="${imgUrl}" alt="Thumbnail" class="shopee-thumb-item ${imgUrl === activeImage ? 'active' : ''}" onclick="window.selectShopeeImage('${imgUrl}')">
            `).join('')}
          </div>
          <div class="shopee-commitments">
            <div class="shopee-commit-item">
              <i class="ri-arrow-go-back-line"></i>
              <span>7 ngày miễn phí đổi trả</span>
            </div>
            <div class="shopee-commit-item">
              <i class="ri-shield-star-line"></i>
              <span>Hàng chính hãng 100%</span>
            </div>
            <div class="shopee-commit-item">
              <i class="ri-truck-line"></i>
              <span>Miễn phí vận chuyển</span>
            </div>
          </div>
        </div>

        <div class="shopee-info-col">
          <div class="shopee-title-area">
            <span class="shopee-mall-tag">Yêu Thích+</span>
            <h2 class="shopee-product-title">${product.name}</h2>
          </div>

          <div class="shopee-rating-strip">
            <div class="shopee-rating-val">
              <span>${product.rating}</span>
              <i class="ri-star-fill shopee-rating-stars"></i>
            </div>
            <div class="shopee-meta-divider"></div>
            <div><strong>1.2k</strong> Đánh Giá</div>
            <div class="shopee-meta-divider"></div>
            <div><strong>${product.soldCount || 0}</strong> Đã Bán</div>
          </div>

          <div class="shopee-price-box">
            ${product.isFlashSale ? `
              <div class="shopee-flash-banner">
                <span><i class="ri-flashlight-fill" style="color: #ffd839;"></i> FLASH SALE GIÁ SỐC</span>
                <span>KẾT THÚC TRONG 02:45:18</span>
              </div>
            ` : ''}
            ${originalPrice > currentPrice ? `
              <div class="shopee-price-original">${formatPrice(originalPrice)}</div>
            ` : ''}
            <div id="shopeeDisplayPrice" class="shopee-price-current">${formatPrice(currentPrice)}</div>
            ${discount > 0 ? `
              <span id="shopeeDisplayDiscount" class="shopee-price-discount">-${discount}% GIẢM</span>
            ` : ''}
          </div>

          <div class="shopee-shipping-strip">
            <div class="shipping-badge">
              <i class="ri-truck-line"></i> Vận Chuyển
            </div>
            <div>Miễn phí vận chuyển cho đơn hàng từ 0 đ</div>
          </div>

          <div class="shopee-variant-group">
            ${uniqueColors.length > 0 ? `
              <div class="shopee-variant-row">
                <div class="shopee-variant-label">Màu Sắc</div>
                <div class="shopee-variant-options">
                  ${uniqueColors.map((color) => `
                    <button class="shopee-option-btn ${color === state.selectedColor ? 'active' : ''}" onclick="window.selectShopeeColor('${color}')">
                      ${color}
                    </button>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${uniqueTypes.length > 0 ? `
              <div class="shopee-variant-row">
                <div class="shopee-variant-label">Phân Loại</div>
                <div class="shopee-variant-options">
                  ${uniqueTypes.map((type) => `
                    <button class="shopee-option-btn ${type === state.selectedType ? 'active' : ''}" onclick="window.selectShopeeType('${type}')">
                      ${type}
                    </button>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <div class="shopee-quantity-row">
              <div class="shopee-variant-label">Số Lượng</div>
              <div class="shopee-qty-wrapper">
                <button class="shopee-qty-btn" onclick="window.changeShopeeModalQty(-1)">-</button>
                <input id="shopeeModalQtyInput" type="text" class="shopee-qty-input" value="${state.selectedQty}" readonly>
                <button class="shopee-qty-btn" onclick="window.changeShopeeModalQty(1)">+</button>
              </div>
              <div id="shopeeModalStockText" class="shopee-stock-text">
                ${stock > 0 ? `Kho: còn ${stock} sản phẩm có sẵn` : '<span style="color: var(--accent); font-weight: 700;">Tạm hết hàng</span>'}
              </div>
            </div>
          </div>

          <div class="shopee-actions-row">
            <button id="shopeeAddCartBtn" class="shopee-btn-add-cart" ${stock <= 0 ? 'disabled' : ''} onclick="window.handleShopeeAddToCart()">
              <i class="ri-shopping-cart-2-line" style="font-size: 1.25rem;"></i>
              <span>Thêm Vào Giỏ Hàng</span>
            </button>
            <button id="shopeeBuyNowBtn" class="shopee-btn-buy-now" ${stock <= 0 ? 'disabled' : ''} onclick="window.handleShopeeBuyNow()">
              <i class="ri-flashlight-fill"></i>
              <span>Mua Ngay</span>
            </button>
          </div>
        </div>
      </div>

      <div class="shopee-detail-tabs">
        <div class="shopee-section-heading">
          <i class="ri-file-list-3-line" style="color: #ee4d2d;"></i>
          <span>CHI TIẾT SẢN PHẨM</span>
        </div>
        <table class="shopee-specs-table">
          <tbody>
            <tr>
              <td>Danh Mục</td>
              <td>${product.categoryName}</td>
            </tr>
            <tr>
              <td>Số Lượng Kho</td>
              <td>${stock} sản phẩm</td>
            </tr>
            <tr>
              <td>Thương Hiệu</td>
              <td>Chính Hãng NovaShop</td>
            </tr>
            <tr>
              <td>Gửi Từ</td>
              <td>TP. Hồ Chí Minh / Hà Nội</td>
            </tr>
          </tbody>
        </table>

        <div class="shopee-section-heading">
          <i class="ri-article-line" style="color: #ee4d2d;"></i>
          <span>MÔ TẢ SẢN PHẨM</span>
        </div>
        <div class="shopee-desc-content">
          <p>${product.description}</p>
        </div>
      </div>
    `;
  };

  window.selectShopeeImage = (imgUrl) => {
    const mainImg = document.getElementById('shopeeMainImg');
    if (mainImg) mainImg.src = imgUrl;
    document.querySelectorAll('.shopee-thumb-item').forEach((thumb) => {
      thumb.classList.toggle('active', thumb.src === imgUrl);
    });
  };

  window.selectShopeeColor = (color) => {
    state.selectedColor = color;
    state.selectedVariant = findCurrentVariant();
    renderModalContent();
  };

  window.selectShopeeType = (type) => {
    state.selectedType = type;
    state.selectedVariant = findCurrentVariant();
    renderModalContent();
  };

  window.changeShopeeModalQty = (delta) => {
    const v = state.selectedVariant;
    const maxStock = v ? v.stock : product.stock;
    const nextQty = state.selectedQty + delta;
    if (nextQty >= 1 && nextQty <= maxStock) {
      state.selectedQty = nextQty;
      const input = document.getElementById('shopeeModalQtyInput');
      if (input) input.value = state.selectedQty;
    }
  };

  window.handleShopeeAddToCart = () => {
    addCartItem(state.activeProduct, state.selectedVariant, state.selectedQty);
  };

  window.handleShopeeBuyNow = () => {
    addCartItem(state.activeProduct, state.selectedVariant, state.selectedQty, false);
    dom.quickviewModal.classList.remove('active');
    window.location.href = '/cart';
  };

  renderModalContent();
  dom.quickviewModal.classList.add('active');
};

const fetchCategories = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/categories`);
    const data = await res.json();
    if (data.success) {
      state.categories = data.data;
      renderCategories();
    }
  } catch (error) {}
};

const fetchProducts = async () => {
  try {
    if (dom.productsGrid) {
      dom.productsGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <i class="ri-loader-4-line ri-spin empty-icon" style="font-size: 2.5rem; color: var(--primary);"></i>
          <div class="empty-title">Đang tải danh sách sản phẩm...</div>
        </div>
      `;
    }

    const params = new URLSearchParams();
    if (state.activeCategory && state.activeCategory !== 'cat_all') {
      params.append('category', state.activeCategory);
    }
    if (state.searchQuery) {
      params.append('search', state.searchQuery);
    }
    if (state.sortBy) {
      params.append('sort', state.sortBy);
    }

    const res = await fetch(`${API_BASE}/api/products?${params.toString()}`);
    const data = await res.json();

    if (data.success) {
      state.products = data.data;
      renderProducts();
      renderFlashSale();
    } else {
      if (dom.productsGrid) {
        dom.productsGrid.innerHTML = `
          <div class="empty-state">
            <i class="ri-error-warning-line empty-icon" style="color: var(--accent);"></i>
            <div class="empty-title">${data.message || 'Không thể tải danh sách sản phẩm'}</div>
          </div>
        `;
      }
    }
  } catch (error) {
    if (dom.productsGrid) {
      dom.productsGrid.innerHTML = `
        <div class="empty-state">
          <i class="ri-wifi-off-line empty-icon" style="color: var(--accent);"></i>
          <div class="empty-title">Không thể kết nối đến máy chủ</div>
          <div class="empty-desc">Vui lòng kiểm tra lại kết nối mạng và thử lại sau.</div>
        </div>
      `;
    }
  }
};

const setupEventListeners = () => {
  document.addEventListener('click', (e) => {
    const userDropdown = document.getElementById('userDropdown');
    if (userDropdown && !e.target.closest('#userDropdownTrigger') && !e.target.closest('#userDropdown')) {
      userDropdown.classList.remove('show');
    }
  });

  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close-modal');
      const target = document.getElementById(modalId);
      if (target) target.classList.remove('active');
    });
  });

  document.querySelectorAll('.modal-overlay').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });

  if (dom.searchBtn && dom.searchInput) {
    dom.searchBtn.addEventListener('click', () => {
      state.searchQuery = dom.searchInput.value.trim();
      fetchProducts();
    });

    dom.searchInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        state.searchQuery = dom.searchInput.value.trim();
        fetchProducts();
      }
    });
  }

  if (dom.sortSelect) {
    dom.sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      fetchProducts();
    });
  }
};

const init = () => {
  renderUserMenu();
  updateCartBadge();
  initFlashSaleCountdown();
  fetchCategories();
  fetchProducts();
  setupEventListeners();
};

document.addEventListener('DOMContentLoaded', init);
