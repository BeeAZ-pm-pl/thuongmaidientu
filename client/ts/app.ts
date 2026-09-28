"use strict";
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
    selectedQty: 1,
    minPrice: null,
    maxPrice: null,
    minRating: null,
    inStock: false,
    flashSaleFilter: false,
    chatSessionId: localStorage.getItem('novashop_chat_session') || '',
    chatSession: null,
    chatMessages: [],
    chatOpen: false,
    chatLoading: false,
    chatPollingTimer: null
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
    toastContainer: document.getElementById('toastContainer'),
    searchActiveBanner: document.getElementById('searchActiveBanner'),
    searchKeywordDisplay: document.getElementById('searchKeywordDisplay'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    priceFilterPills: document.getElementById('priceFilterPills'),
    minPriceInput: document.getElementById('minPriceInput'),
    maxPriceInput: document.getElementById('maxPriceInput'),
    applyPriceBtn: document.getElementById('applyPriceBtn'),
    ratingFilterPills: document.getElementById('ratingFilterPills'),
    inStockCheckbox: document.getElementById('inStockCheckbox'),
    flashSaleCheckbox: document.getElementById('flashSaleCheckbox'),
    resetAllFiltersBtn: document.getElementById('resetAllFiltersBtn'),
    chatLauncherBtn: document.getElementById('chatLauncherBtn'),
    chatWidgetWindow: document.getElementById('chatWidgetWindow'),
    chatCloseBtn: document.getElementById('chatCloseBtn'),
    chatModeToggleBtn: document.getElementById('chatModeToggleBtn'),
    chatModeToggleLabel: document.getElementById('chatModeToggleLabel'),
    chatTitleText: document.getElementById('chatTitleText'),
    chatModeBadge: document.getElementById('chatModeBadge'),
    chatSubtitleText: document.getElementById('chatSubtitleText'),
    chatMessagesContainer: document.getElementById('chatMessagesContainer'),
    chatMessageForm: document.getElementById('chatMessageForm'),
    chatInput: document.getElementById('chatInput'),
    chatSendBtn: document.getElementById('chatSendBtn')
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
(window as any).addToCartQuick = (productId, event) => {
    if (event)
        event.stopPropagation();
    const product = state.products.find((p) => p.id === productId);
    if (!product)
        return;
    const defaultVariant = (product.variants && product.variants.length > 0) ? product.variants[0] : null;
    addCartItem(product, defaultVariant, 1);
};
(window as any).buyNowQuick = (productId, event) => {
    if (event)
        event.stopPropagation();
    const product = state.products.find((p) => p.id === productId);
    if (!product)
        return;
    const defaultVariant = (product.variants && product.variants.length > 0) ? product.variants[0] : null;
    addCartItem(product, defaultVariant, 1, false);
    window.location.href = '/cart';
};
const addCartItem = (product, variant, quantity = 1, showFeedback = true) => {
    const variantId = variant ? variant.id : null;
    const variantName = variant ? `${variant.color} - ${variant.type}` : '';
    const price = variant ? variant.price : product.price;
    const imageUrl = variant && variant.imageUrl ? variant.imageUrl : product.imageUrl;
    const existingItem = state.cart.find((item) => item.productId === product.id && item.variantId === variantId);
    if (existingItem) {
        existingItem.quantity += quantity;
    }
    else {
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
        if (countdownSeconds < 0)
            countdownSeconds = 4 * 3600;
        const h = String(Math.floor(countdownSeconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((countdownSeconds % 3600) / 60)).padStart(2, '0');
        const s = String(countdownSeconds % 60).padStart(2, '0');
        if (dom.flashHour)
            dom.flashHour.textContent = h;
        if (dom.flashMin)
            dom.flashMin.textContent = m;
        if (dom.flashSec)
            dom.flashSec.textContent = s;
    }, 1000);
};
const renderFlashSale = () => {
    if (!dom.flashSaleGrid)
        return;
    const flashProducts = state.products.filter((p) => p.isFlashSale);
    if (flashProducts.length === 0) {
        const flashSection = document.getElementById('flashSaleSection');
        if (flashSection)
            flashSection.style.display = 'none';
        return;
    }
    const flashSection = document.getElementById('flashSaleSection');
    if (flashSection)
        flashSection.style.display = 'block';
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
    if (!dom.userMenuWrapper)
        return;
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
    }
    else {
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
    if (!dom.categoryTabs)
        return;
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
    if (!dom.productsGrid)
        return;
    if (dom.productTotalCount)
        dom.productTotalCount.textContent = `${state.products.length} sản phẩm`;
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
(window as any).openShopeeDetail = (productId) => {
    const product = state.products.find((p) => p.id === productId);
    if (!product)
        return;
    state.activeProduct = product;
    const variants = product.variants && product.variants.length > 0 ? product.variants : [];
    const uniqueColors = [...new Set(variants.map((v) => v.color))];
    const uniqueTypes = [...new Set(variants.map((v) => v.type))];
    state.selectedColor = (uniqueColors.length > 0 ? uniqueColors[0] : 'Tiêu chuẩn') as string;
    state.selectedType = (uniqueTypes.length > 0 ? uniqueTypes[0] : 'Tiêu chuẩn') as string;
    state.selectedQty = 1;
    const findCurrentVariant = () => {
        if (variants.length === 0)
            return null;
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
    (window as any).selectShopeeImage = (imgUrl) => {
        const mainImg = document.getElementById('shopeeMainImg');
        if (mainImg)
            (mainImg as any).src = imgUrl;
        document.querySelectorAll('.shopee-thumb-item').forEach((thumb) => {
            thumb.classList.toggle('active', (thumb as any).src === imgUrl);
        });
    };
    (window as any).selectShopeeColor = (color) => {
        state.selectedColor = color;
        state.selectedVariant = findCurrentVariant();
        renderModalContent();
    };
    (window as any).selectShopeeType = (type) => {
        state.selectedType = type;
        state.selectedVariant = findCurrentVariant();
        renderModalContent();
    };
    (window as any).changeShopeeModalQty = (delta) => {
        const v = state.selectedVariant;
        const maxStock = v ? v.stock : product.stock;
        const nextQty = state.selectedQty + delta;
        if (nextQty >= 1 && nextQty <= maxStock) {
            state.selectedQty = nextQty;
            const input = document.getElementById('shopeeModalQtyInput');
            if (input)
                (input as any).value = state.selectedQty;
        }
    };
    (window as any).handleShopeeAddToCart = () => {
        addCartItem(state.activeProduct, state.selectedVariant, state.selectedQty);
    };
    (window as any).handleShopeeBuyNow = () => {
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
    }
    catch (error) { }
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
        if (state.minPrice) {
            params.append('minPrice', state.minPrice);
        }
        if (state.maxPrice) {
            params.append('maxPrice', state.maxPrice);
        }
        if (state.minRating) {
            params.append('minRating', state.minRating);
        }
        if (state.inStock) {
            params.append('inStock', '1');
        }
        if (state.flashSaleFilter) {
            params.append('flashSale', '1');
        }
        if (dom.searchActiveBanner && dom.searchKeywordDisplay) {
            if (state.searchQuery) {
                dom.searchKeywordDisplay.textContent = `"${state.searchQuery}"`;
                dom.searchActiveBanner.classList.add('active');
            }
            else {
                dom.searchActiveBanner.classList.remove('active');
            }
        }
        const res = await fetch(`${API_BASE}/api/products?${params.toString()}`);
        const data = await res.json();
        if (data.success) {
            state.products = data.data;
            renderProducts();
            renderFlashSale();
        }
        else {
            if (dom.productsGrid) {
                dom.productsGrid.innerHTML = `
          <div class="empty-state">
            <i class="ri-error-warning-line empty-icon" style="color: var(--accent);"></i>
            <div class="empty-title">${data.message || 'Không thể tải danh sách sản phẩm'}</div>
          </div>
        `;
            }
        }
    }
    catch (error) {
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
const formatChatMessage = (text) => {
    if (!text)
        return '';
    let formatted = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/^\s*[-•]\s*(.*)$/gm, '<li style="margin-left: 16px; margin-bottom: 3px;">$1</li>');
    formatted = formatted.replace(/(<li.*<\/li>)/s, '<ul style="margin: 6px 0; padding-left: 4px;">$1</ul>');
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
};
const updateChatHeader = () => {
    if (!state.chatSession)
        return;
    const status = state.chatSession.status;
    if (dom.chatModeBadge && dom.chatModeToggleLabel && dom.chatSubtitleText) {
        if (status === 'human_waiting') {
            dom.chatModeBadge.textContent = 'CHỜ CSKH';
            dom.chatModeBadge.style.background = 'rgba(245, 158, 11, 0.2)';
            dom.chatModeBadge.style.color = '#f59e0b';
            dom.chatSubtitleText.textContent = 'Đang chờ nhân viên hỗ trợ kết nối...';
            dom.chatModeToggleLabel.textContent = 'Chuyển về AI';
        }
        else if (status === 'human_active') {
            dom.chatModeBadge.textContent = 'NHÂN VIÊN CSKH';
            dom.chatModeBadge.style.background = 'rgba(16, 185, 129, 0.2)';
            dom.chatModeBadge.style.color = '#10b981';
            dom.chatSubtitleText.textContent = 'Đang trò chuyện cùng chuyên viên tư vấn';
            dom.chatModeToggleLabel.textContent = 'Chuyển về AI';
        }
        else {
            dom.chatModeBadge.textContent = 'GEMINI AI';
            dom.chatModeBadge.style.background = 'rgba(56, 189, 248, 0.2)';
            dom.chatModeBadge.style.color = '#38bdf8';
            dom.chatSubtitleText.textContent = 'Trợ lý mua sắm trực tuyến 24/7';
            dom.chatModeToggleLabel.textContent = 'Gặp CSKH';
        }
    }
};
const initChatSession = async () => {
    try {
        const payload = {
            sessionId: state.chatSessionId || undefined,
            userId: state.user ? state.user.id : undefined,
            customerName: state.user ? state.user.name : 'Khách hàng',
            customerEmail: state.user ? state.user.email : ''
        };
        const res = await fetch(`${API_BASE}/api/chat/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            state.chatSession = data.data.session;
            state.chatSessionId = data.data.session.id;
            localStorage.setItem('novashop_chat_session', state.chatSessionId);
            state.chatMessages = data.data.messages || [];
            renderChatMessages();
            updateChatHeader();
            startChatPolling();
        }
    }
    catch (error) {
        console.error('Lỗi khởi tạo chat session:', error);
    }
};
const renderChatMessages = () => {
    if (!dom.chatMessagesContainer)
        return;
    dom.chatMessagesContainer.innerHTML = state.chatMessages.map((m) => {
        const isCustomer = m.sender === 'customer';
        const isStaff = m.sender === 'staff';
        const senderRole = isCustomer ? 'customer' : (isStaff ? 'staff' : 'ai');
        const senderTitle = isCustomer ? 'Bạn' : (isStaff ? 'Chuyên viên CSKH' : 'NovaBot AI');
        const senderIcon = isCustomer ? 'ri-user-3-line' : (isStaff ? 'ri-headphone-line' : 'ri-robot-2-line');
        let productsHtml = '';
        if (m.suggestedProducts && Array.isArray(m.suggestedProducts) && m.suggestedProducts.length > 0) {
            productsHtml = `
        <div class="chat-products-grid">
          ${m.suggestedProducts.map((p) => `
            <div class="chat-product-item">
              <img src="${p.imageUrl}" alt="${p.name}" class="chat-product-thumb" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'">
              <div class="chat-product-details">
                <div class="chat-product-title">${p.name}</div>
                <div class="chat-product-price">${formatPrice(p.price)}</div>
              </div>
              <button class="chat-product-action-btn" onclick="window.openShopeeDetail('${p.id}')">
                <i class="ri-eye-line"></i> Xem
              </button>
            </div>
          `).join('')}
        </div>
      `;
        }
        return `
      <div class="chat-bubble-wrap ${senderRole}">
        <div class="chat-bubble-sender">
          <i class="${senderIcon}"></i>
          <span>${senderTitle}</span>
        </div>
        <div class="chat-bubble">
          <div>${formatChatMessage(m.message)}</div>
          ${productsHtml}
        </div>
      </div>
    `;
    }).join('');
    dom.chatMessagesContainer.scrollTop = dom.chatMessagesContainer.scrollHeight;
};
const sendChatMessage = async (text) => {
    if (!text || !text.trim() || state.chatLoading)
        return;
    const messageText = text.trim();
    if (!state.chatSessionId) {
        await initChatSession();
    }
    const tempUserMsg = {
        id: `temp_${Date.now()}`,
        sessionId: state.chatSessionId,
        sender: 'customer',
        senderName: state.user ? state.user.name : 'Bạn',
        message: messageText,
        createdAt: new Date().toISOString()
    };
    state.chatMessages.push(tempUserMsg);
    renderChatMessages();
    state.chatLoading = true;
    const typingElement = document.createElement('div');
    typingElement.className = 'chat-bubble-wrap ai';
    typingElement.id = 'chatTypingIndicator';
    typingElement.innerHTML = `
    <div class="chat-bubble-sender">
      <i class="ri-robot-2-line"></i>
      <span>NovaBot AI</span>
    </div>
    <div class="chat-bubble" style="background: #ffffff; border: 1px solid var(--border-light);">
      <div class="typing-dots">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    </div>
  `;
    dom.chatMessagesContainer.appendChild(typingElement);
    dom.chatMessagesContainer.scrollTop = dom.chatMessagesContainer.scrollHeight;
    try {
        const res = await fetch(`${API_BASE}/api/chat/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: state.chatSessionId,
                message: messageText,
                sender: 'customer',
                senderName: state.user ? state.user.name : 'Khách hàng'
            })
        });
        const result = await res.json();
        const indicator = document.getElementById('chatTypingIndicator');
        if (indicator)
            indicator.remove();
        if (result.success) {
            if (result.data.aiMessage) {
                state.chatMessages.push(result.data.aiMessage);
            }
            if (result.data.session) {
                state.chatSession = result.data.session;
                updateChatHeader();
            }
            renderChatMessages();
        }
    }
    catch (error) {
        const indicator = document.getElementById('chatTypingIndicator');
        if (indicator)
            indicator.remove();
        showToast('Lỗi chat', 'Không thể kết nối đến máy chủ trợ lý', 'error');
    }
    finally {
        state.chatLoading = false;
    }
};
const handleChatModeToggle = async () => {
    if (!state.chatSessionId)
        return;
    const currentStatus = state.chatSession ? state.chatSession.status : 'ai';
    if (currentStatus === 'ai') {
        try {
            const res = await fetch(`${API_BASE}/api/chat/request-human`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: state.chatSessionId })
            });
            const data = await res.json();
            if (data.success) {
                state.chatSession = data.data.session;
                if (data.data.systemMessage) {
                    state.chatMessages.push(data.data.systemMessage);
                }
                updateChatHeader();
                renderChatMessages();
                showToast('CSKH', 'Đã chuyển yêu cầu đến nhân viên tư vấn', 'success');
            }
        }
        catch (e) {
            showToast('Lỗi', 'Không thể chuyển chế độ', 'error');
        }
    }
    else {
        try {
            const res = await fetch(`${API_BASE}/api/chat/switch-mode`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: state.chatSessionId, mode: 'ai' })
            });
            const data = await res.json();
            if (data.success) {
                state.chatSession = data.data;
                updateChatHeader();
                fetchChatMessagesSilently();
                showToast('Trợ lý AI', 'Đã bật lại trợ lý thông minh NovaBot', 'success');
            }
        }
        catch (e) {
            showToast('Lỗi', 'Không thể chuyển chế độ', 'error');
        }
    }
};
const fetchChatMessagesSilently = async () => {
    if (!state.chatSessionId)
        return;
    try {
        const res = await fetch(`${API_BASE}/api/chat/messages/${state.chatSessionId}`);
        const data = await res.json();
        if (data.success) {
            state.chatSession = data.data.session;
            const newMessages = data.data.messages || [];
            if (newMessages.length !== state.chatMessages.length) {
                state.chatMessages = newMessages;
                renderChatMessages();
                updateChatHeader();
            }
        }
    }
    catch (e) { }
};
const startChatPolling = () => {
    if (state.chatPollingTimer)
        clearInterval(state.chatPollingTimer);
    state.chatPollingTimer = setInterval(() => {
        if (state.chatOpen && state.chatSessionId) {
            fetchChatMessagesSilently();
        }
    }, 4000);
};
const setupEventListeners = () => {
    document.addEventListener('click', (e) => {
        const userDropdown = document.getElementById('userDropdown');
        if (userDropdown && !(e.target as any)?.closest('#userDropdownTrigger') && !(e.target as any)?.closest('#userDropdown')) {
            userDropdown.classList.remove('show');
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
    if (dom.searchBtn && dom.searchInput) {
        dom.searchBtn.addEventListener('click', () => {
            state.searchQuery = (dom.searchInput as any).value.trim();
            fetchProducts();
        });
        dom.searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                state.searchQuery = (dom.searchInput as any).value.trim();
                fetchProducts();
            }
        });
    }
    if (dom.clearSearchBtn) {
        dom.clearSearchBtn.addEventListener('click', () => {
            state.searchQuery = '';
            if (dom.searchInput)
                (dom.searchInput as any).value = '';
            fetchProducts();
        });
    }
    if (dom.sortSelect) {
        dom.sortSelect.addEventListener('change', (e) => {
            state.sortBy = (e.target as any).value;
            fetchProducts();
        });
    }
    if (dom.priceFilterPills) {
        dom.priceFilterPills.querySelectorAll('.filter-pill').forEach((pill) => {
            pill.addEventListener('click', () => {
                dom.priceFilterPills.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
                pill.classList.add('active');
                const priceType = pill.getAttribute('data-price');
                if (priceType === 'all') {
                    state.minPrice = null;
                    state.maxPrice = null;
                }
                else if (priceType === 'under-1m') {
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
                if (dom.minPriceInput)
                    (dom.minPriceInput as any).value = '';
                if (dom.maxPriceInput)
                    (dom.maxPriceInput as any).value = '';
                fetchProducts();
            });
        });
    }
    if (dom.applyPriceBtn) {
        dom.applyPriceBtn.addEventListener('click', () => {
            const minVal = dom.minPriceInput ? (dom.minPriceInput as any).value.trim() : '';
            const maxVal = dom.maxPriceInput ? (dom.maxPriceInput as any).value.trim() : '';
            state.minPrice = minVal ? Number(minVal) : null;
            state.maxPrice = maxVal ? Number(maxVal) : null;
            if (dom.priceFilterPills) {
                dom.priceFilterPills.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
            }
            fetchProducts();
        });
    }
    if (dom.ratingFilterPills) {
        dom.ratingFilterPills.querySelectorAll('.filter-pill').forEach((pill) => {
            pill.addEventListener('click', () => {
                dom.ratingFilterPills.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
                pill.classList.add('active');
                const r = Number(pill.getAttribute('data-rating') || 0);
                state.minRating = r > 0 ? r : null;
                fetchProducts();
            });
        });
    }
    if (dom.inStockCheckbox) {
        dom.inStockCheckbox.addEventListener('change', (e) => {
            state.inStock = (e.target as any).checked;
            fetchProducts();
        });
    }
    if (dom.flashSaleCheckbox) {
        dom.flashSaleCheckbox.addEventListener('change', (e) => {
            state.flashSaleFilter = (e.target as any).checked;
            fetchProducts();
        });
    }
    if (dom.resetAllFiltersBtn) {
        dom.resetAllFiltersBtn.addEventListener('click', () => {
            state.searchQuery = '';
            state.minPrice = null;
            state.maxPrice = null;
            state.minRating = null;
            state.inStock = false;
            state.flashSaleFilter = false;
            state.activeCategory = 'cat_all';
            state.sortBy = 'newest';
            if (dom.searchInput)
                (dom.searchInput as any).value = '';
            if (dom.minPriceInput)
                (dom.minPriceInput as any).value = '';
            if (dom.maxPriceInput)
                (dom.maxPriceInput as any).value = '';
            if (dom.inStockCheckbox)
                (dom.inStockCheckbox as any).checked = false;
            if (dom.flashSaleCheckbox)
                (dom.flashSaleCheckbox as any).checked = false;
            if (dom.sortSelect)
                (dom.sortSelect as any).value = 'newest';
            if (dom.priceFilterPills) {
                dom.priceFilterPills.querySelectorAll('.filter-pill').forEach((p, idx) => p.classList.toggle('active', idx === 0));
            }
            if (dom.ratingFilterPills) {
                dom.ratingFilterPills.querySelectorAll('.filter-pill').forEach((p, idx) => p.classList.toggle('active', idx === 0));
            }
            if (dom.categoryTabs) {
                dom.categoryTabs.querySelectorAll('.category-tab').forEach((tab) => {
                    tab.classList.toggle('active', tab.getAttribute('data-id') === 'cat_all');
                });
            }
            fetchProducts();
            showToast('Bộ lọc', 'Đã đặt lại tất cả tiêu chí lọc', 'success');
        });
    }
    if (dom.chatLauncherBtn) {
        dom.chatLauncherBtn.addEventListener('click', () => {
            state.chatOpen = !state.chatOpen;
            if (dom.chatWidgetWindow) {
                dom.chatWidgetWindow.classList.toggle('active', state.chatOpen);
            }
            if (state.chatOpen) {
                if (!state.chatSession) {
                    initChatSession();
                }
                else {
                    renderChatMessages();
                }
                if (dom.chatInput)
                    (dom.chatInput as any).focus();
            }
        });
    }
    if (dom.chatCloseBtn) {
        dom.chatCloseBtn.addEventListener('click', () => {
            state.chatOpen = false;
            if (dom.chatWidgetWindow) {
                dom.chatWidgetWindow.classList.remove('active');
            }
        });
    }
    if (dom.chatModeToggleBtn) {
        dom.chatModeToggleBtn.addEventListener('click', handleChatModeToggle);
    }
    if (dom.chatMessageForm && dom.chatInput) {
        dom.chatMessageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = (dom.chatInput as any).value.trim();
            if (!text)
                return;
            (dom.chatInput as any).value = '';
            sendChatMessage(text);
        });
    }
    document.querySelectorAll('.quick-chip-btn').forEach((chip) => {
        chip.addEventListener('click', () => {
            const q = chip.getAttribute('data-query');
            if (q)
                sendChatMessage(q);
        });
    });
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
