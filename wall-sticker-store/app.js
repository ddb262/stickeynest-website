let EMAIL_TO = 'ddbmaldini456@gmail.com';
let FORM_ENDPOINT = `https://formsubmit.co/ajax/${EMAIL_TO}`;
const CART_KEY = 'stickynest-cart-v1';
const ADDRESS_KEY = 'stickynest-address-v1';
const app = document.querySelector('#app');
const cartOverlay = document.querySelector('#cartOverlay');
const checkoutOverlay = document.querySelector('#checkoutOverlay');
const cartItemsEl = document.querySelector('#cartItems');
const cartFootEl = document.querySelector('#cartFoot');
const checkoutContent = document.querySelector('#checkoutContent');
const toastEl = document.querySelector('#toast');
const state = { products: [], category: 'All', search: '', sort: 'featured', cart: readStorage(CART_KEY, {}), address: readStorage(ADDRESS_KEY, {}), wishlist: readStorage('stickynest-wishlist-v1', []), offers: [], appliedOffer: '', settings: {}, animations: {} };
let checkoutStep = 1;
let checkoutCustomer = {};
let checkoutEditingAddress = false;
const currency = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value) || 0);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const routeName = () => (location.hash.replace('#', '').split('?')[0] || 'home');

function readStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function saveStorage(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function syncThemeControl() {
  const dark = document.documentElement.dataset.theme === 'dark';
  const button = document.querySelector('#themeToggle');
  button.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
  button.title = `Switch to ${dark ? 'light' : 'dark'} mode`;
  button.querySelector('.theme-icon').textContent = dark ? '☀' : '☾';
  button.querySelector('.theme-label').textContent = dark ? 'Light' : 'Dark';
  document.querySelector('#themeColorMeta').content = dark ? '#111a27' : '#2457a6';
}
function setTheme(theme) {
  const nextTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = nextTheme;
  try { localStorage.setItem('stickynest-theme', nextTheme); } catch {}
  syncThemeControl();
}
let revealObserver;
function initScrollAnimations() {
  const elements = app.querySelectorAll('.reveal-on-scroll:not(.is-visible)');
  if (!elements.length) return;
  if (state.animations.enabled === false || !('IntersectionObserver' in window)) {
    elements.forEach(element => element.classList.add('is-visible'));
    return;
  }
  revealObserver ||= new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -36px 0px', threshold: 0.04 });
  elements.forEach(element => revealObserver.observe(element));
}
function applyStoreSettings() {
  const store = state.settings.store || {};
  const name = String(store.storeName || 'StickyNest').trim().slice(0, 60) || 'StickyNest';
  const tagline = String(store.tagline || 'happy walls, happy homes').trim().slice(0, 90);
  EMAIL_TO = String(store.contactEmail || 'ddbmaldini456@gmail.com').trim();
  FORM_ENDPOINT = `https://formsubmit.co/ajax/${EMAIL_TO}`;
  document.querySelectorAll('.brand-name').forEach(element => { element.textContent = name; });
  document.querySelectorAll('.brand-tagline').forEach(element => { element.textContent = tagline; });
  document.querySelectorAll('.brand-initial').forEach(element => { element.textContent = name.charAt(0).toUpperCase(); });
  document.querySelector('#storeFooterName').textContent = name;
  const emailLink = document.querySelector('#storeEmailLink');
  emailLink.href = `mailto:${EMAIL_TO}`;
  document.querySelector('.brand').setAttribute('aria-label', `${name} home`);
  document.title = `${name} — Make room for lovely`;
  const hex = value => /^#[0-9a-fA-F]{6}$/.test(String(value || '')) ? value : '';
  if (hex(store.brandColor)) document.documentElement.style.setProperty('--store-blue', store.brandColor);
  if (hex(store.brandColorDark)) document.documentElement.style.setProperty('--store-blue-dark', store.brandColorDark);
  if (hex(store.accentColor)) document.documentElement.style.setProperty('--store-accent', store.accentColor);
  const motion = state.animations || {};
  const clamp = (value, min, max, fallback) => { const number = Number(value); return Math.max(min, Math.min(max, Number.isFinite(number) ? number : fallback)); };
  document.documentElement.style.setProperty('--page-animation-duration', `${clamp(motion.pageTransitionMs, 0, 1000, 300)}ms`);
  document.documentElement.style.setProperty('--card-stagger-ms', `${clamp(motion.cardStaggerMs, 0, 250, 35)}ms`);
  document.documentElement.style.setProperty('--hover-lift', `${clamp(motion.hoverLiftPx, 0, 12, 5)}px`);
  document.body.classList.toggle('motion-off', motion.enabled === false);
  document.body.classList.toggle('hero-float-off', motion.heroFloat === false);
  document.body.classList.toggle('button-feedback-off', motion.buttonFeedback === false);
  document.body.classList.toggle('respect-reduced-motion', motion.reducedMotionRespect !== false);
}
function getProduct(slug) { return state.products.find(product => product.slug === slug); }
function cartLines() { return Object.entries(state.cart).map(([slug, qty]) => ({ product: getProduct(slug), qty: Number(qty) })).filter(line => line.product && line.qty > 0); }
function cartCount() { return cartLines().reduce((sum, line) => sum + line.qty, 0); }
function cartTotal() { return cartLines().reduce((sum, line) => sum + line.product.price * line.qty, 0); }
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toastEl.classList.remove('show'), 2500);
}
function setNav() {
  const current = routeName();
  document.querySelectorAll('[data-nav]').forEach(link => link.classList.toggle('active', link.dataset.nav === current || (current === 'home' && link.dataset.nav === 'home')));
  document.querySelectorAll('[data-nav-filter]').forEach(link => link.classList.toggle('active', current === 'shop' && link.dataset.navFilter === state.category));
}
function renderCategoryNav() {
  const categories = ['All', ...new Set(state.products.map(product => product.category).filter(Boolean))];
  document.querySelector('#categoryNav').innerHTML = categories.map((name, index) => `<button class="category-nav-item ${index === 0 ? 'category-all' : ''}" data-nav-filter="${esc(name)}"><span class="category-nav-icon">${['✳', '❀', '⌂', '☼', '✦'][index % 5]}</span>${name === 'All' ? 'Explore all' : esc(name)}</button>`).join('');
}
function card(product) {
  const badge = product.badge ? `<span class="product-badge">${esc(product.badge)}</span>` : '';
  const compare = product.compareAt && Number(product.compareAt) > product.price ? `<span class="old-price">${currency(product.compareAt)}</span>` : '';
  const discount = product.compareAt && Number(product.compareAt) > product.price ? Math.round((1 - product.price / Number(product.compareAt)) * 100) : 0;
  const rating = product.rating ? `<span class="rating"><b>★</b> ${esc(product.rating)}${product.reviews ? ` <i>(${esc(product.reviews)})</i>` : ''}</span>` : '<span class="rating"><b>✳</b> <i>Easy-peel finish</i></span>';
  const saved = state.wishlist.includes(product.slug);
  return `<article class="product-card">
    <div class="product-photo"><img src="${esc(product.image)}" alt="${esc(product.name)} wall sticker" loading="lazy" decoding="async" width="700" height="820">${badge}<button class="favorite-button ${saved ? 'favorited' : ''}" data-wishlist="${esc(product.slug)}" aria-label="${saved ? 'Remove from' : 'Add to'} favourites" aria-pressed="${saved}">♥</button>${discount ? `<span class="discount-pill">${discount}% off</span>` : ''}<button class="quick-add" data-add="${esc(product.slug)}" aria-label="Add ${esc(product.name)} to bag"><span>+</span><b>Add to bag</b></button></div>
    <div class="product-info"><div class="product-category">${esc(product.category || 'Wall stickers')}</div><h3 class="product-name">${esc(product.name)}</h3><div class="product-bottom"><span class="price">${currency(product.price)}${compare}</span>${rating}</div><div class="product-card-foot"><span>✳ Easy to apply</span><span>Cash on delivery</span></div></div>
  </article>`;
}
function renderProducts(list, limit) {
  const shown = typeof limit === 'number' ? list.slice(0, limit) : list;
  if (!shown.length) return state.search && routeName() === 'shop' ? `<div class="empty-products"><b>No matches for “${esc(state.search)}”.</b>Try another word or browse all stickers.</div>` : `<div class="empty-products"><b>No stickers in this collection yet.</b>Add product photos to the products folder and refresh the page.</div>`;
  return shown.map(card).join('');
}
function homePage() {
  return `<section class="hero reveal-on-scroll">
    <div class="hero-copy"><p class="eyebrow"><span class="eyebrow-dot"></span> The little wall refresh event</p><h1>Make room for <em>lovely.</em></h1><p>Give that empty wall a story. Easy-to-apply stickers bring a little colour, calm and character to every corner.</p><div class="hero-badges"><span>✦ Curated for happy homes</span><span>✓ Easy peel & stick</span></div><a class="button" href="#shop">Shop wall stickers <span class="button-arrow">↗</span></a><div class="hero-note"><span>✳</span><span>Cash on delivery is available now. UPI is coming soon.</span></div></div>
    <div class="hero-visual"><div class="hero-scene"><div class="scene-wall-art"><svg viewBox="0 0 260 310" role="img" aria-label="Botanical wall sticker art"><rect width="260" height="310" fill="#f3e7d5"/><circle cx="183" cy="76" r="36" fill="#e7b784"/><path d="M42 255 Q120 184 204 255" fill="none" stroke="#8e9c72" stroke-width="6"/><path d="M126 257 C105 212 114 163 132 116" fill="none" stroke="#607b62" stroke-width="6" stroke-linecap="round"/><path d="M126 199 C89 190 80 167 83 148 C104 154 122 170 126 199Z" fill="#829b78"/><path d="M131 168 C164 155 174 131 171 112 C149 119 135 139 131 168Z" fill="#9bae86"/><path d="M114 228 C80 221 67 199 66 181 C91 185 109 202 114 228Z" fill="#bd967d"/><path d="M143 225 C172 209 180 187 177 168 C155 178 144 197 143 225Z" fill="#d69e7e"/><circle cx="133" cy="112" r="17" fill="#e8ba65"/><circle cx="100" cy="143" r="10" fill="#e5a585"/><circle cx="173" cy="102" r="9" fill="#d48e75"/></svg></div><div class="plant-pot"></div><div class="scene-books"></div><div class="scene-vase"></div><div class="scene-table"></div></div><div class="hero-sticker">Your walls<br>called<span>they want a little joy</span></div><div class="hero-caption">A home that feels a little more you.</div></div>
  </section>
  <div class="trust-strip reveal-on-scroll"><div class="trust-item"><span class="trust-icon">✳</span><span>Easy to apply</span></div><div class="trust-item"><span class="trust-icon">⌂</span><span>Made for happy homes</span></div><div class="trust-item"><span class="trust-icon">₹</span><span>Cash on delivery available</span></div><div class="trust-item"><span class="trust-icon">↗</span><span>Track your order</span></div></div>
  <section class="category-shortcuts reveal-on-scroll"><div class="shortcut-heading"><div><p class="eyebrow">Find your kind of lovely</p><h2>Shop by mood</h2></div><a class="text-link" href="#shop">See all stickers&nbsp; ↗</a></div><div class="shortcut-grid">${categoryTiles()}</div></section>
  <section class="section reveal-on-scroll"><div class="section-head"><div><p class="eyebrow">A good place to start</p><h2>Little wall wonders</h2></div><a class="text-link" href="#shop">Shop all stickers&nbsp; ↗</a></div><div class="product-grid">${renderProducts(state.products, 4)}</div></section>
  <section class="collection-banner reveal-on-scroll"><div class="collection-copy"><p class="eyebrow">Bring the outdoors in</p><h2>A softer wall, a calmer room.</h2><p>Botanical details, sunlit shades and a little breathing room. Find the one that feels like you.</p><a class="text-link" href="#shop">Find your favourite&nbsp; ↗</a></div><div class="collection-visual"><div class="collection-sun"></div><div class="collection-leaf"></div><div class="collection-sticker"><svg viewBox="0 0 180 170"><rect width="180" height="170" fill="#f4ebdc"/><circle cx="125" cy="45" r="25" fill="#e9c27a"/><path d="M38 142 Q91 96 148 140" fill="none" stroke="#7b9270" stroke-width="4"/><path d="M87 144 Q81 101 103 66" fill="none" stroke="#607b62" stroke-width="4"/><path d="M87 117 Q60 111 58 92 Q78 94 87 117Z" fill="#91a281"/><path d="M96 99 Q122 91 122 73 Q104 76 96 99Z" fill="#9da982"/><circle cx="104" cy="62" r="11" fill="#d99579"/><circle cx="104" cy="62" r="4" fill="#efd289"/></svg></div></div></section>
  <section class="section values-section reveal-on-scroll"><div class="values-grid"><div class="value-card"><span class="value-icon">✳</span><h3>Joy, without the project</h3><p>Peel, place and smooth. A tiny room refresh can be that easy.</p></div><div class="value-card"><span class="value-icon">⌂</span><h3>Made for your kind of home</h3><p>Playful details for bedrooms, hallways and all the in-between spaces.</p></div><div class="value-card"><span class="value-icon">♡</span><h3>Pay when it arrives</h3><p>Choose cash on delivery at checkout. UPI payments are coming soon.</p></div></div></section>`;
}
function categoryTiles() {
  const categories = [...new Set(state.products.map(product => product.category).filter(Boolean))];
  const icons = ['❀', '☾', '☼', '✦', '⌂'];
  const colors = ['tile-sage', 'tile-lavender', 'tile-peach', 'tile-yellow', 'tile-blue'];
  const items = categories.slice(0, 4);
  if (!items.length) return '';
  return items.map((category, index) => `<button class="shortcut-tile ${colors[index % colors.length]}" data-nav-filter="${esc(category)}"><span class="shortcut-tile-icon">${icons[index % icons.length]}</span><span><b>${esc(category)}</b><small>Explore the collection</small></span><span class="tile-arrow">↗</span></button>`).join('');
}
function shopPage() {
  const categories = ['All', ...new Set(state.products.map(p => p.category).filter(Boolean))];
  let products = state.category === 'All' ? [...state.products] : state.products.filter(p => p.category === state.category);
  if (state.search) products = products.filter(p => `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(state.search.toLowerCase()));
  if (state.sort === 'price-low') products.sort((a, b) => a.price - b.price);
  if (state.sort === 'price-high') products.sort((a, b) => b.price - a.price);
  if (state.sort === 'rating') products.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
  return `<section class="page-shell shop-page reveal-on-scroll"><div class="page-heading"><p class="eyebrow">Find your happy place</p><h1 class="page-title">Stickers for walls with a story.</h1><p>A little personality goes a long way. Browse the collection and find a favourite for your space.</p></div>${state.search ? `<div class="search-context">Search results for <b>“${esc(state.search)}”</b><button data-clear-search>Clear search ×</button></div>` : ''}<div class="shop-toolbar"><div class="filter-list">${categories.map(name => `<button class="filter-chip ${name === state.category ? 'active' : ''}" data-filter="${esc(name)}">${esc(name)}</button>`).join('')}</div><div class="shop-toolbar-right"><span class="result-count">${products.length} lovely ${products.length === 1 ? 'find' : 'finds'}</span><label class="sort-label">Sort by <select id="sortProducts"><option value="featured" ${state.sort === 'featured' ? 'selected' : ''}>Featured</option><option value="price-low" ${state.sort === 'price-low' ? 'selected' : ''}>Price: low to high</option><option value="price-high" ${state.sort === 'price-high' ? 'selected' : ''}>Price: high to low</option><option value="rating" ${state.sort === 'rating' ? 'selected' : ''}>Top rated</option></select></label></div></div><div class="product-grid">${renderProducts(products)}</div></section>`;
}
function addressPage() {
  const a = state.address || {};
  return `<section class="page-shell"><div class="page-heading"><p class="eyebrow">A smooth little delivery</p><h1 class="page-title">Where should we send the happy?</h1><p>Save your delivery details here for a quicker checkout. You can change them any time.</p></div><div class="delivery-layout"><div class="delivery-aside"><p class="eyebrow">At your doorstep, soon</p><h2>Made easy from checkout to doorstep.</h2><p>We’ll use these details only for your order. Pick cash on delivery at checkout and pay when your wall stickers arrive.</p><div class="delivery-benefit"><span>⌂</span><div><b>Address that finds you</b><small>Add your flat, street, area and a nearby landmark.</small></div></div><div class="delivery-benefit"><span>↗</span><div><b>Know where it is</b><small>Use your order number on the Track order page for the latest update.</small></div></div><div class="delivery-benefit"><span>♡</span><div><b>Pay at the door</b><small>Cash on delivery is ready. UPI is coming soon.</small></div></div></div><form class="form-card" id="addressForm"><h3>Your delivery details</h3>${addressFields(a, true)}<button class="button form-submit" type="submit">Save delivery details <span class="button-arrow">→</span></button><p class="form-hint">Your details stay in this browser and are added to the order email only when you place an order.</p></form></div></section>`;
}
function addressFields(a, includeContact = true) {
  return `<div class="form-grid">${includeContact ? `<div class="field"><label for="customerName">Full name *</label><input id="customerName" name="name" autocomplete="name" required maxlength="90" value="${esc(a.name || '')}" placeholder="Name for the delivery"></div><div class="field"><label for="contactEmail">Email address</label><input id="contactEmail" name="email" type="email" autocomplete="email" maxlength="120" value="${esc(a.email || '')}" placeholder="you@example.com"></div><div class="field"><label for="phone">Mobile number *</label><input id="phone" name="phone" inputmode="tel" autocomplete="tel" required pattern="[0-9+() -]{10,16}" maxlength="16" value="${esc(a.phone || '')}" placeholder="10-digit mobile number"></div>` : ''}<div class="field ${includeContact ? '' : 'full'}"><label for="streetAddress">House / flat, street, area *</label><textarea id="streetAddress" name="address" autocomplete="street-address" required maxlength="250" placeholder="Flat / house number, street, area">${esc(a.address || '')}</textarea></div><div class="field"><label for="landmark">Landmark</label><input id="landmark" name="landmark" maxlength="100" value="${esc(a.landmark || '')}" placeholder="Nearby landmark (optional)"></div><div class="field"><label for="city">City / town *</label><input id="city" name="city" autocomplete="address-level2" required maxlength="80" value="${esc(a.city || '')}" placeholder="City"></div><div class="field"><label for="stateName">State *</label><input id="stateName" name="state" autocomplete="address-level1" required maxlength="80" value="${esc(a.state || '')}" placeholder="State"></div><div class="field"><label for="pincode">PIN code *</label><input id="pincode" name="pincode" inputmode="numeric" autocomplete="postal-code" required pattern="[0-9]{6}" maxlength="6" value="${esc(a.pincode || '')}" placeholder="6-digit PIN code"></div></div>`;
}
function trackPage() {
  const orderId = new URLSearchParams(location.hash.split('?')[1] || '').get('id') || '';
  return `<section class="page-shell"><div class="page-heading"><p class="eyebrow">A little update, whenever you need one</p><h1 class="page-title">Your order, right where you left it.</h1><p>Enter the order number from your confirmation to see its latest status.</p></div><div class="track-card"><form id="trackForm" class="track-form"><input name="orderId" aria-label="Order number" required value="${esc(orderId)}" placeholder="Example: SN-20261102-A1B2C3"><button class="button" type="submit">Track order <span class="button-arrow">→</span></button></form><div class="track-result" id="trackResult">${orderId ? '<div class="track-empty">Looking up your order…</div>' : '<div class="track-empty">Your order number is in the confirmation after checkout. New orders start with “Order received”.</div>'}</div></div></section>`;
}
function render() {
  const route = routeName();
  app.innerHTML = route === 'shop' ? shopPage() : route === 'address' ? addressPage() : route === 'track' ? trackPage() : homePage();
  app.classList.remove('app-enter');
  void app.offsetWidth;
  app.classList.add('app-enter');
  document.querySelector('#searchInput').value = state.search;
  const addressLabel = document.querySelector('#headerAddressLabel');
  if (addressLabel) addressLabel.textContent = state.address?.city ? `To ${state.address.city}` : 'Your address';
  setNav();
  initScrollAnimations();
  if (route === 'track') {
    const id = new URLSearchParams(location.hash.split('?')[1] || '').get('id');
    if (id) lookupOrder(id);
  }
  if (route === 'address') app.querySelector('#addressForm')?.addEventListener('submit', saveAddressFromForm);
}
function refreshCartBadge() {
  document.querySelector('#cartCount').textContent = cartCount();
  document.querySelector('#drawerCount').textContent = cartCount() ? `(${cartCount()})` : '';
}
function persistCart() { saveStorage(CART_KEY, state.cart); refreshCartBadge(); }
function addToCart(slug) {
  state.cart[slug] = Math.min(20, (Number(state.cart[slug]) || 0) + 1);
  persistCart();
  const cartButton = document.querySelector('#openCart');
  cartButton.classList.remove('cart-bump');
  void cartButton.offsetWidth;
  cartButton.classList.add('cart-bump');
  showToast('Added to your bag ✳');
}
function drawCart() {
  const lines = cartLines();
  cartItemsEl.innerHTML = lines.length ? lines.map(({ product, qty }) => `<div class="cart-row"><img src="${esc(product.image)}" alt=""><div><h3 class="cart-product-name">${esc(product.name)}</h3><div class="cart-product-meta">${esc(product.category || 'Wall stickers')}</div><div class="quantity-control"><button data-qty="-1" data-slug="${esc(product.slug)}" aria-label="Remove one">−</button><span>${qty}</span><button data-qty="1" data-slug="${esc(product.slug)}" aria-label="Add one">+</button></div></div><div><button class="remove-item" data-remove="${esc(product.slug)}" aria-label="Remove ${esc(product.name)}">×</button><div class="cart-product-price">${currency(product.price * qty)}</div></div></div>`).join('') : `<div class="cart-empty"><div class="empty-icon">✳</div><h3>Your bag is taking a breather.</h3><p>Find a little something for your walls.</p><a class="button" href="#shop" data-close-cart>Explore stickers</a></div>`;
  cartFootEl.innerHTML = lines.length ? `<div class="subtotal-line"><span>Subtotal</span><strong>${currency(cartTotal())}</strong></div><div class="shipping-note">Delivery charges, if any, will be confirmed by the shop.</div><button class="button" id="goCheckout">Continue to delivery <span class="button-arrow">→</span></button>` : '';
  refreshCartBadge();
}
function openCart() { drawCart(); cartOverlay.classList.add('open'); cartOverlay.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
function closeCart() { cartOverlay.classList.remove('open'); cartOverlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
function hasCompleteAddress(customer) {
  return Boolean(customer?.name && customer?.phone && customer?.address && customer?.city && customer?.state && customer?.pincode);
}
function progressSteps() {
  const names = ['Confirm order', 'Delivery address', 'Payment & billing'];
  return `<div class="checkout-progress">${names.map((name, index) => `<div class="checkout-progress-step ${index + 1 < checkoutStep ? 'done' : ''} ${index + 1 === checkoutStep ? 'current' : ''}"><span>${index + 1 < checkoutStep ? '✓' : index + 1}</span><b>${name}</b></div>`).join('')}</div>`;
}
function cartSavings() {
  return cartLines().reduce((sum, { product, qty }) => sum + (Number(product.compareAt) > product.price ? (Number(product.compareAt) - product.price) * qty : 0), 0);
}
function findOffer(code) { return state.offers.find(offer => String(offer.code || '').toUpperCase() === String(code || '').toUpperCase()); }
function offerDiscount(offer, subtotal = cartTotal()) {
  if (offer?.active !== true || subtotal < Number(offer.minimumOrder || 0)) return 0;
  let amount = offer.discountType === 'percent' ? Math.round(subtotal * Number(offer.discountValue || 0) / 100) : Math.round(Number(offer.discountValue || 0));
  if (Number(offer.maximumDiscount) > 0) amount = Math.min(amount, Number(offer.maximumDiscount));
  return Math.max(0, Math.min(subtotal, amount));
}
function appliedOfferDiscount() { return offerDiscount(findOffer(state.appliedOffer)); }
function payableTotal() { return Math.max(0, cartTotal() - appliedOfferDiscount()); }
function renderOffersPanel() {
  const offers = state.offers;
  const active = offers.filter(offer => offer.active === true);
  const message = state.appliedOffer ? `<div class="offer-applied"><span>✓</span> ${esc(state.appliedOffer)} applied · You save ${currency(appliedOfferDiscount())} <button type="button" data-remove-offer>Remove</button></div>` : '';
  const cards = offers.map(offer => { const isActive = offer.active === true; return `<article class="offer-config-card ${isActive ? 'offer-live' : 'offer-preview'}"><span class="offer-ticket">${isActive ? '✓' : '✦'}</span><div><span class="demo-label">${isActive ? 'ACTIVE OFFER' : 'SAMPLE PREVIEW'}</span><b>${esc(offer.code)}</b><p>${esc(offer.title)}</p><small>${isActive ? esc(offer.description || 'Offer can be applied to this order.') : 'Preview only · Not active or applied.'}</small></div>${isActive ? `<button type="button" class="offer-apply" data-apply-offer-code="${esc(offer.code)}">Apply</button>` : ''}</article>`; }).join('');
  return `<aside class="offer-panel"><div class="offer-panel-heading"><span class="offer-panel-icon">✦</span><div><b>Offers for your order</b><small>${active.length ? 'Choose an active code to apply.' : 'Sample offers are previews only.'}</small></div></div>${active.length ? `<form id="offerForm" class="offer-code-form"><input name="offerCode" maxlength="32" placeholder="Enter offer code" aria-label="Offer code"><button type="submit">Apply</button></form>` : ''}${message}<div class="offer-config-list">${cards || '<div class="no-offers-note">No offers are set up yet. Add them in the offers folder.</div>'}</div><div class="offer-message" id="offerMessage" aria-live="polite"></div></aside>`;
}
function attemptOffer(code) {
  const normalized = String(code || '').trim().toUpperCase();
  const offer = findOffer(normalized);
  const message = document.querySelector('#offerMessage');
  if (!offer) { if (message) message.textContent = 'We could not find that offer code.'; return; }
  if (offer.active !== true) { if (message) message.textContent = 'That code is a sample preview and is not active.'; return; }
  if (cartTotal() < Number(offer.minimumOrder || 0)) { if (message) message.textContent = `Add items worth ${currency(Number(offer.minimumOrder))} to use this offer.`; return; }
  state.appliedOffer = offer.code;
  renderCheckoutStep();
  showToast(`${offer.code} applied · ${currency(appliedOfferDiscount())} off`);
}
function billingRows() {
  const savings = cartSavings();
  const offerSaving = appliedOfferDiscount();
  return `<div class="billing-box"><div class="billing-line"><span>Items (${cartCount()})</span><b>${currency(cartTotal() + savings)}</b></div>${savings ? `<div class="billing-line saving-line"><span>Listed price savings</span><b>− ${currency(savings)}</b></div>` : ''}${offerSaving ? `<div class="billing-line saving-line"><span>Offer ${esc(state.appliedOffer)}</span><b>− ${currency(offerSaving)}</b></div>` : ''}<div class="billing-line"><span>Delivery</span><b class="billing-muted">Confirmed by shop</b></div><div class="billing-total"><span>Order total</span><b>${currency(payableTotal())}</b></div><small>Delivery charges, if any, will be confirmed before dispatch.</small></div>`;
}
function checkoutOrderLines() {
  return cartLines().map(({ product, qty }) => `<div class="checkout-item"><img src="${esc(product.image)}" alt=""><div class="checkout-item-copy"><span class="product-category">${esc(product.category || 'Wall stickers')}</span><b>${esc(product.name)}</b><small>${currency(product.price)} each</small><div class="quantity-control"><button type="button" data-qty="-1" data-slug="${esc(product.slug)}" aria-label="Remove one ${esc(product.name)}">−</button><span>${qty}</span><button type="button" data-qty="1" data-slug="${esc(product.slug)}" aria-label="Add one ${esc(product.name)}">+</button><button type="button" class="checkout-remove" data-remove="${esc(product.slug)}">Remove</button></div></div><strong>${currency(product.price * qty)}</strong></div>`).join('');
}
function renderCheckoutStep() {
  if (state.appliedOffer) {
    const applied = findOffer(state.appliedOffer);
    if (applied?.active !== true || cartTotal() < Number(applied.minimumOrder || 0)) state.appliedOffer = '';
  }
  if (!cartLines().length) {
    checkoutContent.innerHTML = `<div class="empty-checkout"><span>✳</span><h3>Your bag is empty</h3><p>Add a wall sticker to continue.</p><a class="button" href="#shop" id="checkoutReturnShop">Browse stickers</a></div>`;
    checkoutContent.querySelector('#checkoutReturnShop').addEventListener('click', closeCheckout);
    return;
  }
  if (checkoutStep === 1) {
    checkoutContent.innerHTML = `${progressSteps()}<div class="checkout-step-heading"><p class="eyebrow">STEP 1 OF 3</p><h3>Confirm your order</h3><p>Check your stickers and adjust quantities before continuing.</p></div><div class="checkout-order-list">${checkoutOrderLines()}</div><div class="checkout-summary-layout">${billingRows()}${renderOffersPanel()}</div><div class="checkout-step-actions"><span class="checkout-step-total">Order total <b>${currency(payableTotal())}</b></span><button class="button" type="button" data-checkout-next="2">Continue to address <span class="button-arrow">→</span></button></div>`;
    checkoutContent.querySelector('#offerForm')?.addEventListener('submit', event => { event.preventDefault(); attemptOffer(new FormData(event.currentTarget).get('offerCode')); });
    return;
  }
  if (checkoutStep === 2) {
    const savedAddress = hasCompleteAddress(checkoutCustomer);
    const addressCard = savedAddress && !checkoutEditingAddress ? `<div class="saved-address-card"><div class="saved-address-top"><span class="saved-address-icon">⌖</span><div><b>${esc(checkoutCustomer.name)}</b><span class="address-badge">SAVED ADDRESS</span></div><button type="button" class="address-edit" data-edit-address>Edit</button></div><p>${esc(checkoutCustomer.phone)}${checkoutCustomer.email ? ` · ${esc(checkoutCustomer.email)}` : ''}</p><p>${esc(checkoutCustomer.address)}${checkoutCustomer.landmark ? `, ${esc(checkoutCustomer.landmark)}` : ''}, ${esc(checkoutCustomer.city)}, ${esc(checkoutCustomer.state)} ${esc(checkoutCustomer.pincode)}</p></div>` : `<form class="checkout-address-form" id="checkoutAddressForm"><h4>${savedAddress ? 'Change delivery address' : 'Add your delivery address'}</h4>${addressFields(checkoutCustomer, true)}<div class="checkout-step-actions"><button class="button button-light" type="button" data-checkout-back="1">Back to order</button><button class="button" type="submit">Save and continue <span class="button-arrow">→</span></button></div></form>`;
    checkoutContent.innerHTML = `${progressSteps()}<div class="checkout-step-heading"><p class="eyebrow">STEP 2 OF 3</p><h3>Where should we deliver?</h3><p>${savedAddress && !checkoutEditingAddress ? 'Use your saved address or change it for this order.' : 'Add a complete address so your order can find you.'}</p></div>${savedAddress && !checkoutEditingAddress ? `${addressCard}<div class="checkout-step-actions"><button class="button button-light" type="button" data-checkout-back="1">Back to order</button><button class="button" type="button" data-checkout-next="3">Continue to payment <span class="button-arrow">→</span></button></div>` : addressCard}`;
    checkoutContent.querySelector('#checkoutAddressForm')?.addEventListener('submit', event => {
      event.preventDefault();
      if (!event.currentTarget.reportValidity()) return;
      checkoutCustomer = formAddress(event.currentTarget, true);
      state.address = { ...checkoutCustomer };
      saveStorage(ADDRESS_KEY, state.address);
      checkoutEditingAddress = false;
      checkoutStep = 3;
      renderCheckoutStep();
    });
    return;
  }
  checkoutContent.innerHTML = `${progressSteps()}<div class="checkout-step-heading"><p class="eyebrow">STEP 3 OF 3</p><h3>Payment & billing</h3><p>Review the delivery address and amount due before placing your order.</p></div><div class="billing-address"><span>DELIVERING TO</span><b>${esc(checkoutCustomer.name)} · ${esc(checkoutCustomer.phone)}</b><p>${esc(checkoutCustomer.address)}${checkoutCustomer.landmark ? `, ${esc(checkoutCustomer.landmark)}` : ''}, ${esc(checkoutCustomer.city)}, ${esc(checkoutCustomer.state)} ${esc(checkoutCustomer.pincode)}</p><button type="button" data-edit-address>Change address</button></div><div class="payment-grid"><label class="payment-choice payment-choice-active"><input type="radio" checked disabled><span><b>Cash on delivery</b><small>Available now · Pay in cash when your order arrives.</small></span><span class="payment-selected">✓</span></label><div class="payment-coming payment-coming-card"><span class="upi-icon">UPI</span><span><b>UPI payment</b><small>Coming soon · Not available for this order.</small></span><span class="coming-pill">SOON</span></div></div><div class="billing-section"><h4>Billing details</h4><div class="billing-products">${cartLines().map(({ product, qty }) => `<div><span>${esc(product.name)} <small>× ${qty}</small></span><b>${currency(product.price * qty)}</b></div>`).join('')}</div>${billingRows()}</div>${renderOffersPanel()}<form id="paymentStep"><div class="checkout-step-actions"><button class="button button-light" type="button" data-checkout-back="2">Back to address</button><button class="button" id="placeOrder" type="submit">Place order · ${currency(payableTotal())} <span class="button-arrow">→</span></button></div><div class="checkout-status" id="checkoutStatus" aria-live="polite">Your order details will be sent to ${EMAIL_TO}.</div><p class="form-hint">Cash on delivery is available now. UPI is coming soon. By placing your order, you agree that your details can be used for delivery and order updates.</p></form>`;
  checkoutContent.querySelector('#offerForm')?.addEventListener('submit', event => { event.preventDefault(); attemptOffer(new FormData(event.currentTarget).get('offerCode')); });
  checkoutContent.querySelector('#paymentStep').addEventListener('submit', placeOrder);
}
function openCheckout() {
  if (!cartLines().length) return;
  closeCart();
  checkoutStep = 1;
  checkoutCustomer = { ...(state.address || {}) };
  checkoutEditingAddress = false;
  renderCheckoutStep();
  checkoutOverlay.classList.add('open'); checkoutOverlay.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
}
function closeCheckout() { checkoutOverlay.classList.remove('open'); checkoutOverlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
function formAddress(form, includeContact = true) {
  const data = new FormData(form);
  const address = { address: data.get('address')?.trim() || '', landmark: data.get('landmark')?.trim() || '', city: data.get('city')?.trim() || '', state: data.get('state')?.trim() || '', pincode: data.get('pincode')?.trim() || '' };
  if (includeContact) Object.assign(address, { name: data.get('name')?.trim() || '', email: data.get('email')?.trim() || '', phone: data.get('phone')?.trim() || '' });
  return address;
}
function saveAddressFromForm(event) {
  event.preventDefault();
  state.address = { ...state.address, ...formAddress(event.currentTarget, true) };
  saveStorage(ADDRESS_KEY, state.address);
  const addressLabel = document.querySelector('#headerAddressLabel');
  if (addressLabel) addressLabel.textContent = state.address.city ? `To ${state.address.city}` : 'Your address';
  showToast('Delivery details saved ✳');
}
async function placeOrder(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const submitButton = form.querySelector('#placeOrder');
  const statusEl = form.querySelector('#checkoutStatus');
  submitButton.disabled = true; submitButton.textContent = 'Placing your order…';
  statusEl.textContent = 'Saving your order…'; statusEl.className = 'checkout-status';
  const customer = { ...checkoutCustomer };
  if (!hasCompleteAddress(customer)) {
    checkoutStep = 2;
    checkoutEditingAddress = true;
    renderCheckoutStep();
    return;
  }
  state.address = customer; saveStorage(ADDRESS_KEY, customer);
  let order;
  try {
    const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer, items: cartLines().map(({ product, qty }) => ({ slug: product.slug, quantity: qty })), offerCode: state.appliedOffer, payment: 'Cash on Delivery' }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not save your order. Please try again.');
    order = result.order;
  } catch (error) {
    submitButton.disabled = false; submitButton.innerHTML = 'Place my order <span class="button-arrow">→</span>';
    statusEl.textContent = error.message.includes('Failed to fetch') ? 'The store server is not running. Please reopen the store using Start Store.' : error.message;
    statusEl.classList.add('checkout-error'); return;
  }
  statusEl.textContent = 'Sending your order details to the shop…';
  let sent = false;
  try {
    const message = [
      `New ${state.settings.storeName || 'StickyNest'} order: ${order.id}`,
      '', `Customer: ${order.customer.name}`, `Mobile: ${order.customer.phone}`, `Email: ${order.customer.email || 'Not provided'}`,
      `Delivery address: ${order.customer.address}`, `Landmark: ${order.customer.landmark || 'Not provided'}`,
      `${order.customer.city}, ${order.customer.state} ${order.customer.pincode}`,
      '', 'Items:', ...order.items.map(item => `• ${item.name} × ${item.quantity} — ${currency(item.price * item.quantity)}`),
      '', `Items subtotal: ${currency(order.subtotal ?? order.total)}`, ...(order.discount ? [`Offer ${order.offerCode}: − ${currency(order.discount)}`] : []), `Order total: ${currency(order.total)}`, `Payment: ${order.payment}`, `Order placed: ${new Date(order.createdAt).toLocaleString('en-IN')}`
    ].join('\n');
    const emailResponse = await fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ name: order.customer.name, ...(order.customer.email ? { email: order.customer.email, _replyto: order.customer.email } : {}), phone: order.customer.phone, order_number: order.id, items: order.items.map(item => `${item.name} × ${item.quantity} — ${currency(item.price * item.quantity)}`).join('\n'), subtotal: currency(order.subtotal ?? order.total), discount: currency(order.discount || 0), offer_code: order.offerCode || 'None', total: currency(order.total), payment_method: order.payment, delivery_address: `${order.customer.address}${order.customer.landmark ? `, landmark: ${order.customer.landmark}` : ''}, ${order.customer.city}, ${order.customer.state} ${order.customer.pincode}`, message, _subject: `New ${state.settings.storeName || 'StickyNest'} order ${order.id}`, _template: 'table', _captcha: 'false' }) });
    const emailResult = await emailResponse.json();
    sent = emailResponse.ok && (emailResult.success === true || emailResult.success === 'true');
  } catch { sent = false; }
  state.cart = {}; state.appliedOffer = ''; persistCart();
  renderSuccess(order, sent);
}
function renderSuccess(order, emailSent) {
  const message = [`New ${state.settings.storeName || 'StickyNest'} order: ${order.id}`, '', `Customer: ${order.customer.name}`, `Mobile: ${order.customer.phone}`, `Delivery address: ${order.customer.address}, ${order.customer.city}, ${order.customer.state} ${order.customer.pincode}`, '', ...order.items.map(item => `${item.name} × ${item.quantity} — ${currency(item.price * item.quantity)}`), '', `Items subtotal: ${currency(order.subtotal ?? order.total)}`, ...(order.discount ? [`Offer ${order.offerCode}: − ${currency(order.discount)}`] : []), `Total: ${currency(order.total)}`, `Payment: ${order.payment}`].join('\n');
  const mailto = `mailto:${EMAIL_TO}?subject=${encodeURIComponent(`New ${state.settings.storeName || 'StickyNest'} order ${order.id}`)}&body=${encodeURIComponent(message)}`;
  checkoutContent.innerHTML = `<div class="success-view"><div class="success-icon">✓</div><h3>Your walls are in for a treat.</h3><p>${emailSent ? 'Your order is on its way to the shop. We’ll confirm the delivery details with you shortly.' : 'Your order number is saved. Please tap below to send the order email to the shop.'} Your payment method is cash on delivery.</p><div class="order-id-box"><span>Your order number</span><b>${esc(order.id)}</b></div><div class="success-bill"><span>Cash due at delivery</span><b>${currency(order.total)}</b>${order.discount ? `<small>${esc(order.offerCode)} saved you ${currency(order.discount)}</small>` : ''}</div>${!emailSent ? `<a class="button" href="${mailto}">Email my order to the shop ↗</a>` : ''}<div class="success-actions"><a class="button ${emailSent ? '' : 'button-light'}" href="#track?id=${encodeURIComponent(order.id)}" id="successTrack">Track this order</a><button class="button button-light" id="finishCheckout">Keep browsing</button></div><p class="form-hint">UPI payments are coming soon. Your order will be delivered to the address you entered.</p></div>`;
  checkoutContent.querySelector('#finishCheckout').addEventListener('click', closeCheckout);
  checkoutContent.querySelector('#successTrack').addEventListener('click', closeCheckout);
}
async function lookupOrder(id) {
  const target = document.querySelector('#trackResult');
  if (!target) return;
  target.innerHTML = '<div class="track-empty">Finding your order…</div>';
  try {
    const response = await fetch(`/api/orders/${encodeURIComponent(id.trim())}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'We could not find that order number.');
    const order = result.order;
    const steps = ['Order received', 'Confirmed', 'Packed', 'Shipped', 'Out for delivery', 'Delivered'];
    const stage = Math.max(0, steps.indexOf(order.status));
    target.innerHTML = `<div class="order-summary"><div><h3>${esc(order.status)}</h3><p>Order ${esc(order.id)} · ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div><span class="order-total">${currency(order.total)}</span></div><div class="progress-line">${steps.map((label, index) => `<div class="progress-step ${index < stage ? 'done' : index === stage ? 'current done' : ''}"><div class="step-dot"></div>${label}</div>`).join('')}</div><div class="tracking-note">${order.status === 'Shipped' || order.status === 'Out for delivery' ? `Your order is on its way.${order.trackingCode ? ` Tracking reference: ${esc(order.trackingCode)}.` : ''} For a delivery update, email <a href="mailto:${EMAIL_TO}">${EMAIL_TO}</a>.` : order.status === 'Delivered' ? 'Your order has been delivered. We hope it makes your space feel a little more you.' : 'We’ll update this page as your order moves along. For help, email <a href="mailto:${EMAIL_TO}">${EMAIL_TO}</a>.'}</div><div class="checkout-mini">${order.items.map(item => `<span>${esc(item.name)} × ${item.quantity}</span>`).join('<br>')}<strong>${esc(order.payment)}</strong></div>`;
  } catch (error) { target.innerHTML = `<div class="track-empty">${esc(error.message)}<br>Check the number and try again, or email <a href="mailto:${EMAIL_TO}">${EMAIL_TO}</a>.</div>`; }
}

document.querySelector('#openCart').addEventListener('click', openCart);
document.querySelector('#themeToggle').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
syncThemeControl();
document.querySelector('#closeCart').addEventListener('click', closeCart);
document.querySelector('#closeCheckout').addEventListener('click', closeCheckout);
document.querySelector('#searchForm').addEventListener('submit', event => {
  event.preventDefault();
  state.search = document.querySelector('#searchInput').value.trim();
  state.category = 'All';
  if (routeName() === 'shop') render(); else location.hash = '#shop';
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
cartOverlay.addEventListener('click', event => { if (event.target === cartOverlay) closeCart(); });
checkoutOverlay.addEventListener('click', event => { if (event.target === checkoutOverlay) closeCheckout(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeCart(); closeCheckout(); } });
document.addEventListener('click', event => {
  const navFilter = event.target.closest('[data-nav-filter]');
  if (navFilter) {
    state.category = navFilter.dataset.navFilter;
    state.search = '';
    if (routeName() === 'shop') render(); else location.hash = '#shop';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  const add = event.target.closest('[data-add]');
  if (add) addToCart(add.dataset.add);
  const favorite = event.target.closest('[data-wishlist]');
  if (favorite) {
    const slug = favorite.dataset.wishlist;
    state.wishlist = state.wishlist.includes(slug) ? state.wishlist.filter(item => item !== slug) : [...state.wishlist, slug];
    saveStorage('stickynest-wishlist-v1', state.wishlist);
    render();
    showToast(state.wishlist.includes(slug) ? 'Saved to your favourites ♥' : 'Removed from your favourites');
  }
  const qty = event.target.closest('[data-qty]');
  if (qty) { const slug = qty.dataset.slug; state.cart[slug] = Math.max(0, Math.min(20, (Number(state.cart[slug]) || 0) + Number(qty.dataset.qty))); if (!state.cart[slug]) delete state.cart[slug]; persistCart(); drawCart(); if (checkoutOverlay.classList.contains('open')) renderCheckoutStep(); }
  const remove = event.target.closest('[data-remove]');
  if (remove) { delete state.cart[remove.dataset.remove]; persistCart(); drawCart(); if (checkoutOverlay.classList.contains('open')) renderCheckoutStep(); }
  const offerApply = event.target.closest('[data-apply-offer-code]');
  if (offerApply) attemptOffer(offerApply.dataset.applyOfferCode);
  if (event.target.closest('[data-remove-offer]')) { state.appliedOffer = ''; renderCheckoutStep(); }
  const nextCheckout = event.target.closest('[data-checkout-next]');
  if (nextCheckout) { checkoutStep = Number(nextCheckout.dataset.checkoutNext); checkoutEditingAddress = false; renderCheckoutStep(); }
  const backCheckout = event.target.closest('[data-checkout-back]');
  if (backCheckout) { checkoutStep = Number(backCheckout.dataset.checkoutBack); checkoutEditingAddress = false; renderCheckoutStep(); }
  if (event.target.closest('[data-edit-address]')) { checkoutStep = 2; checkoutEditingAddress = true; renderCheckoutStep(); }
  if (event.target.closest('#goCheckout')) openCheckout();
  if (event.target.closest('[data-close-cart]')) closeCart();
  const filter = event.target.closest('[data-filter]');
  if (filter) { state.category = filter.dataset.filter; render(); }
  if (event.target.closest('[data-clear-search]')) { state.search = ''; render(); }
});
app.addEventListener('change', event => {
  if (event.target.id === 'sortProducts') { state.sort = event.target.value; render(); }
});
app.addEventListener('submit', event => {
  if (event.target.id === 'trackForm') { event.preventDefault(); const id = new FormData(event.target).get('orderId'); lookupOrder(id); }
});
window.addEventListener('hashchange', () => { render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
document.querySelector('#year').textContent = new Date().getFullYear();

Promise.all([fetch('/api/products').then(response => response.json()), fetch('/api/settings').then(response => response.json()), fetch('/api/offers').then(response => response.json())]).then(([productData, settingsData, offerData]) => {
  state.products = Array.isArray(productData.products) ? productData.products : [];
  state.settings = settingsData.store || {};
  state.animations = settingsData.animations || {};
  state.offers = Array.isArray(offerData.offers) ? offerData.offers : [];
  applyStoreSettings();
  renderCategoryNav();
  render();
}).catch(() => { app.innerHTML = `<section class="page-shell"><div class="page-heading"><p class="eyebrow">A little setup first</p><h1 class="page-title">Start your store to see the collection.</h1><p>Open the Start Store file in this folder. It will open your shop in a browser window.</p></div></section>`; });
