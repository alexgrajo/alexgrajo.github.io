/* =========================================================
   MUNCHKIN MALL — STOREFRONT APP
   Vanilla JS SPA: hash router, persistent cart (localStorage),
   filters + sorting, gallery, reviews, drawer, checkout.
   ========================================================= */

(() => {
  'use strict';

  /* ---------- HELPERS ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const money = (n) => '$' + n.toFixed(2);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const FREE_SHIP = 50;
  const products = window.MM_PRODUCTS;
  const addons = window.MM_ADDONS;
  const collections = window.MM_COLLECTIONS;
  const ageCards = window.MM_AGES;

  const byId = (id) => products.find((p) => p.id === id);

  const starStr = (r) => '★★★★★'.slice(0, Math.round(r)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(r));

  const dateStr = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };
  const isoDate = (s) => new Date(s).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  /* ---------- STATE ---------- */
  const STORE_KEYS = { cart: 'mm-cart-v1', popup: 'mm-popup-seen-v1', wish: 'mm-wish-v1' };

  let cart = loadCart();
  let appliedDiscount = null;
  let lastOrder = null;
  let popupShown = false;

  function loadCart() {
    try {
      const raw = localStorage.getItem(STORE_KEYS.cart);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((l) => byId(l.id));
    } catch (e) { return []; }
  }
  function saveCart() {
    try { localStorage.setItem(STORE_KEYS.cart, JSON.stringify(cart)); } catch (e) { /* private mode */ }
  }

  function loadWish() {
    try { return new Set(JSON.parse(localStorage.getItem(STORE_KEYS.wish) || '[]')); }
    catch (e) { return new Set(); }
  }
  const wishlist = loadWish();
  const saveWish = () => { try { localStorage.setItem(STORE_KEYS.wish, JSON.stringify([...wishlist])); } catch (e) {} };

  /* ---------- CART LOGIC ---------- */
  const cartCount = () => cart.reduce((n, l) => n + l.qty, 0);
  const cartSubtotal = () => cart.reduce((s, l) => {
    const p = byId(l.id);
    return s + (p ? p.price * l.qty : 0);
  }, 0) + cart.filter((l) => l.gift).reduce((s, l) => s + 4.5, 0)
    + cart.filter((l) => l.card).reduce((s, l) => s + 3, 0);

  function addToCart(id, qty = 1, opts = {}) {
    const p = byId(id);
    if (!p) return;
    const existing = cart.find((l) => l.id === id && !l.gift && !l.card);
    if (existing) existing.qty = Math.min(99, existing.qty + qty);
    else cart.push({ id, qty, gift: !!opts.gift, card: !!opts.card });
    saveCart();
    renderCart();
    bumpCartCount();
    toast(`${p.name} added to cart`);
  }
  function removeLine(idx) { cart.splice(idx, 1); saveCart(); renderCart(); }
  function setQty(idx, qty) {
    if (qty <= 0) removeLine(idx);
    else { cart[idx].qty = Math.min(99, qty); saveCart(); renderCart(); }
  }
  function addAddon(addonId) {
    if (cart.some((l) => l.id === addonId)) { toast('Already in your cart'); return; }
    const a = addons.find((x) => x.id === addonId);
    if (!a) return;
    cart.push({ id: addonId, qty: 1, gift: false, card: false, addon: true });
    saveCart();
    renderCart();
    toast(`${a.name} added`);
  }

  function bumpCartCount() {
    const el = $('#cartCount');
    if (!el) return;
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  /* ---------- TOAST ---------- */
  let toastTimer = null;
  function toast(msg) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2200);
  }

  /* ---------- ICONS ---------- */
  const I = {
    check: '<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="m2.5 8 3.4 3.4L12.5 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    shield: '<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5 2.5 3.5v3.6c0 3 2.1 4.9 5 5.4 2.9-.5 5-2.4 5-5.4V3.5L7.5 1.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    truck: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 4h8v7H1zM9 6h3.5L15 8.5V11H9z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><circle cx="4" cy="12.5" r="1.6" stroke="currentColor" stroke-width="1.3"/><circle cx="11.5" cy="12.5" r="1.6" stroke="currentColor" stroke-width="1.3"/></svg>',
    lock: '<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2.5" y="6.5" width="10" height="6.5" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M5 6.5V4.8a2.5 2.5 0 0 1 5 0v1.7" stroke="currentColor" stroke-width="1.3"/></svg>',
    refresh: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3h-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    heart: '<svg width="17" height="17" viewBox="0 0 17 17" fill="none"><path d="M8.5 14.5S1.5 10.6 1.5 6a3.8 3.8 0 0 1 7-2.1 3.8 3.8 0 0 1 7 2.1c0 4.6-7 8.5-7 8.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    arrow: '<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M3 7.5h9m0 0L8 3.5M12 7.5 8 11.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    plus: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    cart: '<svg width="30" height="30" viewBox="0 0 20 20" fill="none"><path d="M4 6h12l-1.1 9.2a2 2 0 0 1-2 1.8H7.1a2 2 0 0 1-2-1.8L4 6Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M7.2 8V5.6a2.8 2.8 0 0 1 5.6 0V8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    search: '<svg width="34" height="34" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6.2" stroke="currentColor" stroke-width="1.4"/><path d="m13.5 13.5 3.2 3.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    play: '<svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor"><path d="M3 1.5v10l9-5z"/></svg>',
  };

  /* ---------- PRODUCT CARD ---------- */
  function productCard(p, opts = {}) {
    const inWish = wishlist.has(p.id);
    const discount = p.compareAt ? Math.round((1 - p.price / p.compareAt) * 100) : 0;
    const badge = p.badge || (discount ? `${discount}% off` : null);
    const badgeClass = p.tags.includes('new') && !p.badge ? 'new' : (discount ? 'sale' : '');
    return `
      <article class="product-card rv" data-id="${p.id}" style="--d:${opts.delay || 0}s">
        <a href="#/product/${p.id}" class="product-card-img" data-nav aria-label="${esc(p.name)}">
          <img src="${p.images[0]}" alt="${esc(p.name)} — ${esc(p.tagline)}" loading="lazy" />
          ${badge ? `<span class="product-badge ${badgeClass}">${esc(badge)}</span>` : ''}
          <button class="wish-btn ${inWish ? 'is-active' : ''}" data-wish="${p.id}" aria-label="Save ${esc(p.name)} to wishlist">${I.heart}</button>
          <span class="product-card-quick"><span class="btn" data-quick="${p.id}" role="button" tabindex="0">Quick add</span></span>
        </a>
        <div class="product-card-body">
          <span class="product-card-ages">${esc(p.ageLabel)}</span>
          <a href="#/product/${p.id}" data-nav><h3 class="product-card-name">${esc(p.name)}</h3></a>
          <p class="product-card-blurb">${esc(p.blurb)}</p>
          <span class="stars-wrap"><span class="stars">${starStr(p.rating)}</span>${p.rating} (${p.reviewCount.toLocaleString()})</span>
          <div class="product-card-foot">
            <span class="price">${money(p.price)}</span>
            ${p.compareAt ? `<span class="price-compare">${money(p.compareAt)}</span>` : ''}
          </div>
        </div>
      </article>`;
  }

  function productGrid(list, opts = {}) {
    if (!list.length) {
      return `<div class="empty-state">
        ${I.search}
        <h3>No toys match those filters</h3>
        <p>Try widening the age range or clearing a filter — or browse everything.</p>
        <button class="btn btn-primary" data-clear-filters>Clear all filters</button>
      </div>`;
    }
    return `<div class="product-grid ${opts.cols3 ? 'cols-3' : ''}">${list.map((p, i) => productCard(p, { delay: (i % 4) * 0.06 })).join('')}</div>`;
  }

  /* ---------- HOME ---------- */
  function viewHome() {
    const bestsellers = products.filter((p) => p.tags.includes('bestseller')).slice(0, 4);
    const newIn = products.filter((p) => p.tags.includes('new')).slice(0, 4);
    const under30 = products.filter((p) => p.price < 30).slice(0, 4);

    const homeReviews = [
      { name: 'Sarah M.', text: 'Bedtime went from 90 minutes to 20. Hugo the elephant genuinely changed our evenings.', stars: 5 },
      { name: 'Tomás G.', text: 'Best gift under $30. My nephew and his brother raced the RC car around the house for three hours.', stars: 5 },
      { name: 'Hannah B.', text: 'My daughter went from the balance bike straight to a pedal bike — no training wheels, no tears.', stars: 5 },
    ];

    const ugc = [
      { q: '“She built a castle taller than herself.”', who: '@mama.of.three', img: 'assets/p04-main.jpg' },
      { q: '“The science kit beat screen time this summer.”', who: '@kevin.runs', img: 'assets/p06-main.jpg' },
      { q: '“Tea party every single day at 4pm.”', who: '@graceandjune', img: 'assets/p08-main.jpg' },
      { q: '“Showtime is every night at 7.”', who: '@marta.plays', img: 'assets/p10-main.jpg' },
    ];

    return `
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-copy rv">
          <span class="eyebrow">Best gifts for ages 3–5</span>
          <h1>Toys that keep up with <em>busy little hands</em></h1>
          <p class="hero-sub">Hand-picked, safety-tested toys chosen by people who actually watch kids play. Free shipping over ${money(FREE_SHIP)}, easy returns, zero guesswork.</p>
          <div class="hero-cta">
            <a class="btn btn-primary btn-lg" href="#/shop?age=3-5" data-nav>Shop the 3–5 picks ${I.arrow}</a>
            <span class="hero-cta-note">${I.shield} Safety-tested · CPSIA &amp; ASTM F963</span>
          </div>
          <div class="hero-rating">
            <span class="stars">★★★★★</span>
            <p><strong>4.8/5</strong> from 12,000+ parent reviews</p>
          </div>
        </div>
        <div class="hero-art rv" style="--d:.15s">
          <div class="hero-img-main">
            <img src="assets/p01-main.jpg" alt="Child playing with colorful wooden building blocks" />
          </div>
          <div class="hero-float hero-float-1">
            <img src="assets/p02-main.jpg" alt="Weighted plush elephant" />
            <div><small>Bestseller</small><strong>Hugo the Elephant</strong></div>
          </div>
          <div class="hero-float hero-float-2">
            <img src="assets/p06-main.jpg" alt="Junior Lab science kit" />
            <div><small>Ages 5–8</small><strong>50 experiments</strong></div>
          </div>
        </div>
      </div>
    </section>

    <section class="trust-bar">
      <div class="trust-bar-inner">
        <div class="trust-item rv">${I.truck}<div><strong>Free shipping over ${money(FREE_SHIP)}</strong><span>Fast, tracked delivery</span></div></div>
        <div class="trust-item rv" style="--d:.08s">${I.refresh}<div><strong>30-day easy returns</strong><span>No questions asked</span></div></div>
        <div class="trust-item rv" style="--d:.16s">${I.lock}<div><strong>Secure checkout</strong><span>Encrypted payments</span></div></div>
        <div class="trust-item rv" style="--d:.24s">${I.shield}<div><strong>Safety-tested toys</strong><span>CPSIA &amp; ASTM F963</span></div></div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head rv">
          <div>
            <span class="eyebrow">Shop by age</span>
            <h2>Start with how old they are</h2>
            <p>Age is the first thing parents ask about — so we made it the first thing you see.</p>
          </div>
          <a class="section-link" href="#/shop" data-nav>All toys ${I.arrow}</a>
        </div>
        <div class="age-grid">
          ${ageCards.map((a, i) => `
            <a class="age-card rv" style="--d:${i * 0.07}s" href="#/shop?age=${a.filter.age}" data-nav>
              <div class="age-card-img"><img src="${a.image}" alt="Toys for ${esc(a.title.toLowerCase())}" loading="lazy" /></div>
              <div class="age-card-body">
                <span class="eyebrow">Ages ${a.label}</span>
                <h3>${esc(a.title)}</h3>
                <p>${esc(a.blurb)}</p>
              </div>
            </a>`).join('')}
        </div>
      </div>
    </section>

    <section class="section collections">
      <div class="container">
        <div class="section-head rv">
          <div>
            <span class="eyebrow">Shop by interest</span>
            <h2>What are they into right now?</h2>
          </div>
        </div>
        <div class="collection-grid">
          ${collections.map((c, i) => `
            <a class="collection-card rv" style="--d:${i * 0.07}s" href="#/shop?interest=${c.filter.interest}" data-nav>
              <img src="${c.image}" alt="${esc(c.title)}" loading="lazy" />
              <div class="collection-body">
                <h3>${esc(c.title)}</h3>
                <p>${esc(c.blurb)}</p>
                <span class="collection-cta">Shop now ${I.arrow}</span>
              </div>
            </a>`).join('')}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head rv">
          <div>
            <span class="eyebrow">Bestsellers</span>
            <h2>What other parents keep buying</h2>
            <p>Consistent 5-star sellers, month after month.</p>
          </div>
          <a class="section-link" href="#/shop?tag=bestseller" data-nav>See all bestsellers ${I.arrow}</a>
        </div>
        ${productGrid(bestsellers)}
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="gift-banner rv">
          <div>
            <span class="eyebrow" style="color:var(--glow)">Gift season is coming</span>
            <h2 style="margin-top:12px">Birthday or holiday — we’ll wrap it for you</h2>
            <p>Add gift wrapping and a handwritten note at checkout. Ships from our warehouse in 1 business day, arrives in time for the party — or we refund the shipping.</p>
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;position:relative;z-index:2">
            <a class="btn btn-light" href="#/shop?occasion=birthday" data-nav>Birthday gifts</a>
            <a class="btn btn-outline" style="color:#fff;border-color:rgba(255,255,255,.5)" href="#/shop?occasion=holiday" data-nav>Holiday gifts</a>
          </div>
        </div>
      </div>
    </section>

    <section class="section" style="padding-top:0">
      <div class="container">
        <div class="section-head rv">
          <div>
            <span class="eyebrow">New arrivals</span>
            <h2>Fresh on the shelves</h2>
          </div>
          <a class="section-link" href="#/shop?tag=new" data-nav>See all new in ${I.arrow}</a>
        </div>
        ${productGrid(newIn)}
      </div>
    </section>

    <section class="section ugc-strip">
      <div class="container">
        <div class="ugc-head rv">
          <span class="eyebrow">From our parents</span>
          <h2>Real play, real messes, real reviews</h2>
          <p>Tag <strong>@munchkinmall</strong> on TikTok or Instagram to be featured.</p>
        </div>
        <div class="ugc-grid">
          ${ugc.map((u, i) => `
            <div class="ugc-card rv" style="--d:${i * 0.07}s">
              <img src="${u.img}" alt="" loading="lazy" />
              <div class="ugc-quote"><strong>${u.q}</strong><small>${u.who}</small></div>
            </div>`).join('')}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head rv">
          <div>
            <span class="eyebrow">Great gifts under $30</span>
            <h2>Small budget, big reaction</h2>
          </div>
        </div>
        ${productGrid(under30)}
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head rv">
          <div>
            <span class="eyebrow">Reviews</span>
            <h2>Why parents trust us</h2>
          </div>
        </div>
        <div class="review-cards">
          ${homeReviews.map((r, i) => `
            <div class="review-card rv" style="--d:${i * 0.08}s">
              <span class="stars">${'★'.repeat(r.stars)}</span>
              <blockquote>“${esc(r.text)}”</blockquote>
              <footer>
                <span class="review-avatar">${r.name.charAt(0)}</span>
                <div><cite>${esc(r.name)}</cite><small>Verified buyer</small></div>
              </footer>
            </div>`).join('')}
        </div>
      </div>
    </section>

    <section class="section" style="padding-top:0">
      <div class="container">
        <div class="section-head rv">
          <div>
            <span class="eyebrow">Good to know</span>
            <h2>Questions parents ask</h2>
          </div>
        </div>
        <div class="faq-list" data-faq>
          ${FAQ_ITEMS.map((f, i) => `
            <div class="faq-item rv" style="--d:${i * 0.05}s">
              <button class="faq-q" aria-expanded="false">${esc(f.q)} ${I.plus}</button>
              <div class="faq-a"><p>${f.a}</p></div>
            </div>`).join('')}
        </div>
      </div>
    </section>`;
  }

  /* ---------- SHOP ---------- */
  function viewShop(query) {
    const params = new URLSearchParams(query || '');
    const state = {
      age: params.get('age') || '',
      interest: params.get('interest') || '',
      occasion: params.get('occasion') || '',
      tag: params.get('tag') || '',
      q: params.get('q') || '',
      max: params.get('max') || '',
      sort: params.get('sort') || 'featured',
    };

    const filtered = applyFilters(products.slice(), state);
    const sorted = sortProducts(filtered, state.sort);

    const chips = activeChips(state);

    const heading = shopHeading(state);

    return `
    <section class="shop-hero">
      <div class="container">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="#/" data-nav>Home</a> <span>/</span>
          <a href="#/shop" data-nav>Shop</a>
          ${heading.crumb ? `<span>/</span><span aria-current="page">${heading.crumb}</span>` : ''}
        </nav>
        <h1>${heading.title}</h1>
        <p>${heading.blurb}</p>
      </div>
    </section>

    <div class="container">
      <div class="shop-layout">
        <aside class="filters" id="filtersPanel" aria-label="Filters">
          <div class="filter-group">
            <p class="filter-title">Age</p>
            <div class="filter-options">
              ${AGE_FILTERS.map((a) => `
                <label class="filter-opt"><input type="checkbox" data-filter="age" value="${a.value}" ${state.age === a.value ? 'checked' : ''}> ${a.label} <span class="count">${countAge(a.value)}</span></label>`).join('')}
            </div>
          </div>
          <div class="filter-group">
            <p class="filter-title">Interest</p>
            <div class="filter-options">
              ${INTEREST_FILTERS.map((it) => `
                <label class="filter-opt"><input type="checkbox" data-filter="interest" value="${it.value}" ${state.interest === it.value ? 'checked' : ''}> ${it.label} <span class="count">${countInterest(it.value)}</span></label>`).join('')}
            </div>
          </div>
          <div class="filter-group">
            <p class="filter-title">Occasion</p>
            <div class="filter-options">
              ${OCCASION_FILTERS.map((o) => `
                <label class="filter-opt"><input type="checkbox" data-filter="occasion" value="${o.value}" ${state.occasion === o.value ? 'checked' : ''}> ${o.label} <span class="count">${countOccasion(o.value)}</span></label>`).join('')}
            </div>
          </div>
          <div class="filter-group">
            <p class="filter-title">Price</p>
            <div class="filter-price-row">
              <input type="number" min="0" placeholder="Min" data-filter="min" value="${params.get('min') || ''}" aria-label="Minimum price" />
              <span>–</span>
              <input type="number" min="0" placeholder="Max" data-filter="max" value="${state.max}" aria-label="Maximum price" />
            </div>
          </div>
          <div class="filter-group">
            <p class="filter-title">Collections</p>
            <div class="filter-options">
              <label class="filter-opt"><input type="checkbox" data-filter="tag" value="bestseller" ${state.tag === 'bestseller' ? 'checked' : ''}> Bestsellers <span class="count">${products.filter((p) => p.tags.includes('bestseller')).length}</span></label>
              <label class="filter-opt"><input type="checkbox" data-filter="tag" value="new" ${state.tag === 'new' ? 'checked' : ''}> New arrivals <span class="count">${products.filter((p) => p.tags.includes('new')).length}</span></label>
            </div>
          </div>
        </aside>

        <div>
          <div class="shop-toolbar">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
              <button class="btn btn-outline filter-toggle-mobile" id="filterToggle">Filters</button>
              <span class="shop-count">${filtered.length} ${filtered.length === 1 ? 'toy' : 'toys'}</span>
            </div>
            <div class="shop-sort">
              <label for="sortSelect">Sort</label>
              <select id="sortSelect" aria-label="Sort products">
                <option value="featured" ${state.sort === 'featured' ? 'selected' : ''}>Featured</option>
                <option value="price-asc" ${state.sort === 'price-asc' ? 'selected' : ''}>Price: low to high</option>
                <option value="price-desc" ${state.sort === 'price-desc' ? 'selected' : ''}>Price: high to low</option>
                <option value="rating" ${state.sort === 'rating' ? 'selected' : ''}>Top rated</option>
                <option value="reviews" ${state.sort === 'reviews' ? 'selected' : ''}>Most reviewed</option>
                <option value="new" ${state.sort === 'new' ? 'selected' : ''}>Newest</option>
              </select>
            </div>
          </div>

          <div class="filter-chips">
            ${chips.map((c) => `
              <button class="chip is-active" data-chip-remove="${c.key}">${esc(c.label)}
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="m2 2 7 7M9 2l-7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
              </button>`).join('')}
            ${chips.length ? '<button class="chip" data-clear-filters>Clear all</button>' : ''}
          </div>

          <div id="shopResults">${productGrid(sorted)}</div>
        </div>
      </div>
    </div>`;
  }

  const AGE_FILTERS = [
    { value: '0-1', label: 'Babies 0–1' },
    { value: '1-3', label: 'Toddlers 1–3' },
    { value: '3-5', label: 'Preschool 3–5' },
    { value: '5-8', label: 'Big kids 5–8' },
  ];
  const INTEREST_FILTERS = [
    { value: 'stem', label: 'STEM & learning' },
    { value: 'plush', label: 'Plush & comfort' },
    { value: 'outdoor', label: 'Outdoor & active' },
    { value: 'pretend', label: 'Pretend play' },
    { value: 'creative', label: 'Creative & art' },
  ];
  const OCCASION_FILTERS = [
    { value: 'birthday', label: 'Birthday' },
    { value: 'holiday', label: 'Christmas & holidays' },
    { value: 'newbaby', label: 'New baby' },
    { value: 'stocking', label: 'Stocking stuffers' },
  ];

  const countAge = (v) => products.filter((p) => p.ages.some((a) => inAgeRange(a, v))).length;
  const countInterest = (v) => products.filter((p) => p.interests.includes(v)).length;
  const countOccasion = (v) => products.filter((p) => p.occasions.includes(v)).length;

  function inAgeRange(age, range) {
    const [min, max] = range.split('-').map(Number);
    return age >= min && age <= max;
  }

  function applyFilters(list, state) {
    return list.filter((p) => {
      if (state.age && !p.ages.some((a) => inAgeRange(a, state.age))) return false;
      if (state.interest && !p.interests.includes(state.interest)) return false;
      if (state.occasion && !p.occasions.includes(state.occasion)) return false;
      if (state.tag && !p.tags.includes(state.tag)) return false;
      if (state.q) {
        const hay = `${p.name} ${p.tagline} ${p.blurb} ${p.interests.join(' ')}`.toLowerCase();
        if (!hay.includes(state.q.toLowerCase())) return false;
      }
      const min = parseFloat(state.min);
      const max = parseFloat(state.max);
      if (!isNaN(min) && p.price < min) return false;
      if (!isNaN(max) && p.price > max) return false;
      return true;
    });
  }

  function sortProducts(list, sort) {
    const arr = list.slice();
    if (sort === 'price-asc') arr.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') arr.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') arr.sort((a, b) => b.rating - a.rating);
    else if (sort === 'reviews') arr.sort((a, b) => b.reviewCount - a.reviewCount);
    else if (sort === 'new') arr.sort((a, b) => (b.tags.includes('new') ? 1 : 0) - (a.tags.includes('new') ? 1 : 0));
    return arr;
  }

  function activeChips(state) {
    const chips = [];
    if (state.age) chips.push({ key: 'age', label: AGE_FILTERS.find((a) => a.value === state.age)?.label });
    if (state.interest) chips.push({ key: 'interest', label: INTEREST_FILTERS.find((a) => a.value === state.interest)?.label });
    if (state.occasion) chips.push({ key: 'occasion', label: OCCASION_FILTERS.find((a) => a.value === state.occasion)?.label });
    if (state.tag) chips.push({ key: 'tag', label: state.tag === 'new' ? 'New arrivals' : 'Bestsellers' });
    if (state.q) chips.push({ key: 'q', label: `“${state.q}”` });
    if (state.max) chips.push({ key: 'max', label: `Under ${money(parseFloat(state.max))}` });
    return chips.filter((c) => c.label);
  }

  function shopHeading(state) {
    if (state.q) return { title: `Results for “${esc(state.q)}”`, blurb: 'Browse toys matching your search.', crumb: state.q };
    if (state.age) {
      const label = AGE_FILTERS.find((a) => a.value === state.age)?.label || state.age;
      return { title: `Best toys for ${label.replace('–', 'to')}`, blurb: 'Developmentally appropriate, safety-tested and parent-approved for this age group.', crumb: label };
    }
    if (state.interest) {
      const label = INTEREST_FILTERS.find((a) => a.value === state.interest)?.label || state.interest;
      return { title: label, blurb: 'Toys chosen for what they teach, not just how they look.', crumb: label };
    }
    if (state.occasion) {
      const label = OCCASION_FILTERS.find((a) => a.value === state.occasion)?.label || state.occasion;
      return { title: `${label} gifts`, blurb: 'Gifts that will actually get played with — wrapped and ready on request.', crumb: label };
    }
    if (state.tag === 'new') return { title: 'New arrivals', blurb: 'The freshest picks, just landed in the mall.', crumb: 'New' };
    if (state.tag === 'bestseller') return { title: 'Bestsellers', blurb: 'Our most-loved toys, based on thousands of parent reviews.', crumb: 'Bestsellers' };
    return { title: 'All toys', blurb: 'Every toy in the mall — filter by age, interest, occasion or price.', crumb: '' };
  }

  /* ---------- PRODUCT DETAIL ---------- */
  function viewProduct(id) {
    const p = byId(id);
    if (!p) return viewNotFound();

    const gallery = p.images;
    const inWish = wishlist.has(p.id);
    const discount = p.compareAt ? Math.round((1 - p.price / p.compareAt) * 100) : 0;
    const related = products.filter((x) => x.id !== p.id && (x.interests.some((i) => p.interests.includes(i)) || x.ages.some((a) => p.ages.includes(a)))).slice(0, 4);
    const fbtItems = p.upsells.map((u) => byId(u)).filter(Boolean).slice(0, 2);
    const fbtTotal = p.price + fbtItems.reduce((s, i) => s + i.price, 0);
    const fbtDiscounted = +(fbtTotal * 0.85).toFixed(2);

    const ratingBuckets = [5, 4, 3, 2, 1].map((star) => {
      const count = p.reviews.filter((r) => r.rating === star).length;
      const base = Math.max(p.reviews.length, 1);
      const pct = p.reviews.length ? Math.round((count / base) * 100) : 0;
      return { star, count, pct };
    });

    return `
    <div class="pdp">
      <div class="container">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="#/" data-nav>Home</a> <span>/</span>
          <a href="#/shop" data-nav>Shop</a> <span>/</span>
          <a href="#/shop?interest=${p.interests[0]}" data-nav>${INTEREST_FILTERS.find((i) => i.value === p.interests[0])?.label || p.interests[0]}</a> <span>/</span>
          <span aria-current="page">${esc(p.name)}</span>
        </nav>

        <div class="pdp-grid">
          <div class="gallery" id="gallery">
            <div class="gallery-main">
              ${p.badge ? `<span class="gallery-badge product-badge">${esc(p.badge)}</span>` : ''}
              <img id="galleryImg" src="${gallery[0]}" alt="${esc(p.name)} — product photo" />
              <button class="gallery-nav prev" data-gal="-1" aria-label="Previous image">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3 5 8l5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <button class="gallery-nav next" data-gal="1" aria-label="Next image">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <span class="gallery-tag" id="galleryTag">Studio shot</span>
            </div>
            <div class="gallery-thumbs">
              ${gallery.map((src, i) => `
                <button class="gallery-thumb ${i === 0 ? 'is-active' : ''}" data-thumb="${i}" aria-label="View image ${i + 1}">
                  <img src="${src}" alt="" loading="lazy" />
                </button>`).join('')}
            </div>
          </div>

          <div class="pdp-info">
            <span class="eyebrow">${esc(p.ageLabel)}</span>
            <h1>${esc(p.name)}</h1>
            <div class="pdp-rating-row">
              <span class="stars-wrap"><span class="stars">${starStr(p.rating)}</span><strong>${p.rating}</strong> · <a href="#reviews" data-scroll-reviews>${p.reviewCount.toLocaleString()} reviews</a></span>
            </div>
            <div class="pdp-price-row">
              <span class="pdp-price">${money(p.price)}</span>
              ${p.compareAt ? `<span class="pdp-compare">${money(p.compareAt)}</span><span class="pdp-save">Save ${discount}%</span>` : ''}
            </div>
            <p class="pdp-blurb">${esc(p.tagline)}. ${esc(p.blurb)}</p>

            <div class="spec-pills">
              ${p.specs.slice(0, 4).map(([k, v]) => `
                <div class="spec-pill"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}
            </div>

            <div class="delivery-note">
              ${I.truck}
              <span>${p.deliveryNote.replace('{date}', dateStr(3))}</span>
            </div>

            <div class="pdp-actions">
              <div class="qty">
                <button data-qty="-1" aria-label="Decrease quantity">−</button>
                <span id="pdpQty">1</span>
                <button data-qty="1" aria-label="Increase quantity">+</button>
              </div>
              <button class="btn btn-primary pdp-buy" id="pdpAdd">Add to cart · ${money(p.price)}</button>
              <button class="icon-btn wish-btn-inline ${inWish ? 'is-active' : ''}" data-wish="${p.id}" aria-label="Save to wishlist" style="border:1.5px solid var(--line);border-radius:12px;color:${inWish ? 'var(--red)' : 'var(--muted)'}">${I.heart}</button>
            </div>
            <p class="pdp-stock">
              <span class="dot ${p.stock < 20 ? 'low' : ''}"></span>
              ${p.stock < 20 ? `Only ${p.stock} left — order soon` : 'In stock, ships in 1 business day'}
            </p>

            <div class="pdp-trust">
              <div>${I.truck}<strong>Free shipping ${money(FREE_SHIP)}+</strong><small>Tracked delivery</small></div>
              <div>${I.refresh}<strong>30-day returns</strong><small>No questions asked</small></div>
              <div>${I.shield}<strong>Safety tested</strong><small>CPSIA &amp; ASTM F963</small></div>
            </div>

            ${fbtItems.length ? `
            <div class="pdp-bundle">
              <div class="pdp-bundle-head">
                <h3>Frequently bought together</h3>
                <small>${esc(p.bundleNote || 'Save 15% on the bundle')}</small>
              </div>
              <div class="bundle-row">
                <div class="bundle-item"><img src="${p.images[0]}" alt="" /><span>This item</span></div>
                ${fbtItems.map((i) => `<span class="bundle-plus">+</span><div class="bundle-item"><img src="${i.images[0]}" alt="" /><span>${esc(i.name.split(' — ')[0])}</span></div>`).join('')}
              </div>
              <div class="bundle-total">
                <span style="text-decoration:line-through">${money(fbtTotal)}</span>
                <strong>${money(fbtDiscounted)}</strong> — save ${money(fbtTotal - fbtDiscounted)}
              </div>
              <button class="btn btn-light btn-block" style="margin-top:12px" id="bundleAdd">Add bundle · ${money(fbtDiscounted)}</button>
            </div>` : ''}
          </div>
        </div>

        <div class="pdp-tabs">
          <div class="tab-heads">
            <button class="tab-head is-active" data-tab="details">Details &amp; specs</button>
            <button class="tab-head" data-tab="safety">Safety</button>
            <button class="tab-head" data-tab="reviews" id="reviewsTab">Reviews (${p.reviewCount.toLocaleString()})</button>
          </div>

          <div class="tab-panel" data-panel="details">
            <div class="pdp-prose">
              <h3>Why parents love it</h3>
              <p>${esc(p.description)}</p>
              <h3>What’s included</h3>
              <ul class="bullet-list">
                ${p.bullets.map((b) => `<li>${I.check}<span>${esc(b)}</span></li>`).join('')}
              </ul>
              <h3>Specifications</h3>
              <table class="spec-table">
                <tbody>
                  ${p.specs.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="tab-panel" data-panel="safety" hidden>
            <div class="safety-box">
              <h3>${I.shield} Safety information</h3>
              <ul>
                ${p.safety.map((s) => `<li>${I.check}<span>${esc(s)}</span></li>`).join('')}
              </ul>
            </div>
            <div class="pdp-prose" style="margin-top:22px">
              <h3>A note on testing</h3>
              <p>Every toy we sell is checked against US toy safety standards (ASTM F963) and CPSIA requirements. Where a manufacturer can verify compliance, we list it above. If you have a question about a specific material or test, email us and we’ll get the documentation from the supplier.</p>
            </div>
          </div>

          <div class="tab-panel" data-panel="reviews" hidden id="reviewsPanel">
            <div class="reviews-head">
              <div class="reviews-summary">
                <div class="reviews-score">
                  <strong>${p.rating}</strong>
                  <span class="stars">${starStr(p.rating)}</span>
                  <small>${p.reviewCount.toLocaleString()} reviews</small>
                </div>
                <div class="reviews-bars">
                  ${ratingBuckets.map((b) => `
                    <div class="review-bar-row">
                      <span>${b.star} ★</span>
                      <span class="review-bar"><span style="width:${b.pct}%"></span></span>
                      <span>${b.count}</span>
                    </div>`).join('')}
                </div>
              </div>
              <button class="btn btn-outline" id="writeReview">Write a review</button>
            </div>

            <div class="review-list">
              ${p.reviews.map((r) => `
                <div class="review-full rv">
                  <div class="review-full-head">
                    <span class="review-avatar">${r.name.charAt(0)}</span>
                    <div>
                      <strong>${esc(r.name)}</strong>
                      <small style="color:var(--muted)">${esc(r.location)} · ${isoDate(r.date)}</small><br/>
                      ${r.verified ? `<span class="verified">${I.check} Verified buyer</span>` : ''}
                    </div>
                    <span class="stars" style="margin-left:auto">${'★'.repeat(r.rating)}</span>
                  </div>
                  <h4>${esc(r.title)}</h4>
                  <p>${esc(r.body)}</p>
                  ${r.hasPhoto ? `<div class="review-photos"><img src="${p.images[1]}" alt="Customer photo" loading="lazy" /></div>` : ''}
                  <div class="review-foot">
                    <button class="review-helpful" data-helpful>${I.check} Helpful (${r.helpful})</button>
                    <span>Report</span>
                  </div>
                </div>`).join('')}
            </div>
          </div>
        </div>

        <section class="fbt">
          <div class="section-head">
            <div>
              <span class="eyebrow">You might also like</span>
              <h2>Pairs well with</h2>
            </div>
          </div>
          ${productGrid(related)}
        </section>
      </div>
    </div>

    <div class="pdp-sticky-bar" id="pdpSticky">
      <img src="${p.images[0]}" alt="" />
      <div class="sticky-info">
        <strong>${esc(p.name)}</strong>
        <small>${money(p.price)}</small>
      </div>
      <button class="btn btn-primary" id="stickyAdd">Add to cart</button>
    </div>`;
  }

  /* ---------- CART DRAWER RENDER ---------- */
  function renderCart() {
    const body = $('#cartBody');
    const countEl = $('#cartCount');
    if (countEl) {
      countEl.textContent = cartCount();
      countEl.hidden = cartCount() === 0;
    }
    const drawerCount = $('#cartDrawerCount');
    if (drawerCount) drawerCount.textContent = cartCount() ? `(${cartCount()})` : '';

    if (!body) return;

    if (!cart.length) {
      body.innerHTML = `
        <div class="cart-empty">
          ${I.cart}
          <h3>Your cart is empty</h3>
          <p>Looks like you haven’t picked anything yet — the good stuff is waiting.</p>
          <button class="btn btn-primary" data-close-cart>Start shopping</button>
        </div>`;
      const foot = $('#cartFoot');
      if (foot) foot.style.display = 'none';
      return;
    }

    const foot = $('#cartFoot');
    if (foot) foot.style.display = '';

    body.innerHTML = cart.map((line, idx) => {
      if (line.addon) {
        const a = addons.find((x) => x.id === line.id) || { name: 'Add-on', price: 0, image: '' };
        return `
          <div class="cart-line">
            <img class="cart-line-img" src="${a.image}" alt="" />
            <div class="cart-line-info">
              <span class="cart-line-name">${esc(a.name)}</span>
              <span class="cart-line-meta">Gift add-on</span>
              <div class="cart-line-controls">
                <span class="cart-line-price">${money(a.price)}</span>
                <button class="cart-line-remove" data-remove="${idx}">Remove</button>
              </div>
            </div>
          </div>`;
      }
      const p = byId(line.id);
      if (!p) return '';
      const giftAttr = line.gift ? `<span class="cart-line-gift">🎁 Gift wrapped</span>` : '';
      return `
        <div class="cart-line">
          <a href="#/product/${p.id}" data-nav data-close-cart><img class="cart-line-img" src="${p.images[0]}" alt="${esc(p.name)}" /></a>
          <div class="cart-line-info">
            <a href="#/product/${p.id}" data-nav data-close-cart class="cart-line-name">${esc(p.name)}</a>
            <span class="cart-line-meta">${esc(p.ageLabel)}</span>
            ${giftAttr}
            <div class="cart-line-controls">
              <div class="qty-sm">
                <button data-dec="${idx}" aria-label="Decrease">−</button>
                <span>${line.qty}</span>
                <button data-inc="${idx}" aria-label="Increase">+</button>
              </div>
              <span class="cart-line-price">${money(p.price * line.qty)}</span>
            </div>
          </div>
        </div>`;
    }).join('');

    // upsell row
    const upsellEl = $('#cartUpsell');
    if (upsellEl) {
      const notInCart = addons.filter((a) => !cart.some((l) => l.id === a.id));
      if (notInCart.length) {
        const a = notInCart[0];
        upsellEl.innerHTML = `
          <p class="cart-upsell-title">Make it a gift</p>
          <div class="cart-upsell-row">
            <img src="${a.image}" alt="" />
            <div class="upsell-info"><strong>${esc(a.name)}</strong><small>${money(a.price)}</small></div>
            <button class="cart-upsell-add" data-addon="${a.id}">Add</button>
          </div>`;
      } else upsellEl.innerHTML = '';
    }

    const subtotal = cartSubtotal();
    $('#cartSubtotal').textContent = money(subtotal);
    $('#checkoutTotal').textContent = money(subtotal);

    // shipping progress
    const fill = $('#shipProgressFill');
    const text = $('#shipProgressText');
    if (fill && text) {
      const pct = Math.min(100, (subtotal / FREE_SHIP) * 100);
      fill.style.width = pct + '%';
      if (subtotal >= FREE_SHIP) {
        text.innerHTML = `🎉 You’ve unlocked <strong>free shipping</strong>!`;
      } else {
        text.innerHTML = `You’re <strong>${money(FREE_SHIP - subtotal)}</strong> away from free shipping`;
      }
    }

    const note = $('#cartShippingNote');
    if (note) note.textContent = subtotal >= FREE_SHIP ? 'Free shipping applied at checkout' : 'Shipping calculated at checkout';
  }

  /* ---------- CHECKOUT ---------- */
  function viewCheckout() {
    if (!cart.length) {
      return `
      <div class="container">
        <div class="empty-state" style="padding:90px 20px">
          ${I.cart}
          <h3>Your cart is empty</h3>
          <p>Add a toy or two and come back — checkout takes about a minute.</p>
          <a class="btn btn-primary" href="#/shop" data-nav>Browse toys</a>
        </div>
      </div>`;
    }

    const subtotal = cartSubtotal();
    const shipMethods = [
      { id: 'standard', name: 'Standard', eta: `${dateStr(4)} – ${dateStr(7)}`, price: subtotal >= FREE_SHIP ? 0 : 5.95 },
      { id: 'express', name: 'Express', eta: `${dateStr(2)} – ${dateStr(3)}`, price: 12.95 },
    ];

    return `
    <div class="checkout">
      <div class="container">
        <div class="checkout-steps">
          <span class="step-pill is-done"><span class="num">${I.check}</span> Cart</span>
          <span class="step-divider"></span>
          <span class="step-pill is-active"><span class="num">2</span> Information</span>
          <span class="step-divider"></span>
          <span class="step-pill"><span class="num">3</span> Shipping</span>
          <span class="step-divider"></span>
          <span class="step-pill"><span class="num">4</span> Payment</span>
        </div>

        <div class="checkout-grid">
          <div>
            <div class="checkout-card">
              <h3>${I.lock} Express checkout</h3>
              <div class="express-pays">
                <button class="express-pay" data-express="Shop Pay"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 5.5h12v5H2z" stroke="currentColor" stroke-width="1.3"/><path d="M4 8h2M8 8h2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg> Shop Pay</button>
                <button class="express-pay" data-express="Apple Pay"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M11 8.4c0-1.5 1.2-2.2 1.3-2.3-.7-1-1.8-1.1-2.2-1.2-.9-.1-1.8.5-2.2.5s-1.2-.5-2-.5c-1 0-2 .6-2.6 1.6-1.1 1.9-.3 4.7.8 6.2.5.7 1.1 1.5 1.9 1.5.8 0 1-.5 2-.5s1.1.5 1.9.5 1.4-.8 1.9-1.5c.6-.9.8-1.7.8-1.8-.1 0-1.6-.6-1.6-2.5zM9.7 3.7c.4-.5.7-1.2.6-1.9-.6 0-1.4.4-1.8.9-.4.5-.7 1.2-.6 1.8.7.1 1.4-.3 1.8-.8z"/></svg> Pay</button>
                <button class="express-pay" data-express="Google Pay"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.4" stroke="currentColor" stroke-width="1.3"/><path d="M8 4.8v6.4M5.6 8h4.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg> G Pay</button>
              </div>
              <p style="font-size:0.82rem;color:var(--muted);text-align:center">Or check out as a guest below — no account needed.</p>
            </div>

            <form class="checkout-card" id="checkoutForm" novalidate>
              <h3>Contact &amp; shipping</h3>
              <div class="form-grid">
                <div class="form-field full">
                  <label for="ckEmail">Email</label>
                  <input id="ckEmail" name="email" type="email" autocomplete="email" placeholder="parent@email.com" required />
                  <span class="field-error">Enter a valid email for order updates</span>
                </div>
                <div class="form-field">
                  <label for="ckFirst">First name</label>
                  <input id="ckFirst" name="first" autocomplete="given-name" required />
                  <span class="field-error">Required</span>
                </div>
                <div class="form-field">
                  <label for="ckLast">Last name</label>
                  <input id="ckLast" name="last" autocomplete="family-name" required />
                  <span class="field-error">Required</span>
                </div>
                <div class="form-field full">
                  <label for="ckAddress">Street address</label>
                  <input id="ckAddress" name="address" autocomplete="street-address" required />
                  <span class="field-error">Required</span>
                </div>
                <div class="form-field">
                  <label for="ckCity">City</label>
                  <input id="ckCity" name="city" autocomplete="address-level2" required />
                  <span class="field-error">Required</span>
                </div>
                <div class="form-field">
                  <label for="ckZip">ZIP code</label>
                  <input id="ckZip" name="zip" autocomplete="postal-code" required />
                  <span class="field-error">Required</span>
                </div>
              </div>
            </form>

            <div class="checkout-card">
              <h3>Shipping method</h3>
              <div class="ship-methods" id="shipMethods">
                ${shipMethods.map((s, i) => `
                  <label class="ship-method ${i === 0 ? 'is-selected' : ''}">
                    <input type="radio" name="ship" value="${s.id}" ${i === 0 ? 'checked' : ''} />
                    <div>
                      <div class="ship-name">${s.name}</div>
                      <div class="ship-eta">Arrives ${s.eta}</div>
                    </div>
                    <span class="ship-price">${s.price === 0 ? 'Free' : money(s.price)}</span>
                  </label>`).join('')}
              </div>
            </div>
          </div>

          <aside class="order-summary">
            <h3>Order summary</h3>
            <div class="summary-lines">
              ${cart.map((line) => {
                if (line.addon) {
                  const a = addons.find((x) => x.id === line.id) || { name: 'Add-on', price: 0, image: '' };
                  return `<div class="summary-line"><img src="${a.image}" alt="" /><div class="s-name">${esc(a.name)}<small>Add-on</small></div><span class="s-price">${money(a.price)}</span></div>`;
                }
                const p = byId(line.id);
                if (!p) return '';
                return `<div class="summary-line">
                  <img src="${p.images[0]}" alt="" />
                  <div class="s-name">${esc(p.name)}<small>${line.qty} × ${money(p.price)}${line.gift ? ' · gift wrapped' : ''}</small></div>
                  <span class="s-price">${money(p.price * line.qty)}</span>
                </div>`;
              }).join('')}
            </div>
            <div class="summary-totals">
              <div class="summary-total-row"><span>Subtotal</span><span id="sumSubtotal">${money(subtotal)}</span></div>
              <div class="summary-total-row"><span>Shipping</span><span id="sumShipping">${subtotal >= FREE_SHIP ? 'Free' : money(5.95)}</span></div>
              ${appliedDiscount ? `<div class="summary-total-row" style="color:var(--forest)"><span>Discount (MALL10)</span><span id="sumDiscount">−${money(appliedDiscount)}</span></div>` : ''}
              <div class="summary-total-row grand"><span>Total</span><span id="sumTotal">${money(checkoutTotal(subtotal, subtotal >= FREE_SHIP ? 0 : 5.95, appliedDiscount))}</span></div>
            </div>
            <button class="btn btn-primary btn-block btn-lg place-order-btn" id="placeOrder">Pay ${money(checkoutTotal(subtotal, subtotal >= FREE_SHIP ? 0 : 5.95, appliedDiscount))}</button>
            <p class="checkout-secure">${I.lock} Payments are encrypted · ${I.shield} 30-day money-back guarantee</p>
          </aside>
        </div>
      </div>
    </div>`;
  }

  function checkoutTotal(subtotal, shipping, discount) {
    return Math.max(0, subtotal + shipping - (discount || 0));
  }

  function viewConfirmation() {
    const o = lastOrder;
    if (!o) return viewNotFound();
    return `
    <div class="order-confirm">
      <div class="confirm-icon">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="m9 20.5 7.5 7.5L31 12" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <span class="eyebrow" style="justify-content:center">Order confirmed</span>
      <h1>Thank you${o.name ? ', ' + esc(o.name.split(' ')[0]) : ''}!</h1>
      <p>We’ve emailed your receipt to <strong>${esc(o.email)}</strong>. A little someone is about to be very happy.</p>
      <span class="order-number">Order ${esc(o.number)}</span>
      <p style="font-size:0.9rem">Estimated delivery: <strong>${o.eta}</strong>. Tracking will arrive by email within 24 hours.</p>
      <div style="display:flex;gap:12px;justify-content:center;margin-top:26px;flex-wrap:wrap">
        <a class="btn btn-primary" href="#/shop" data-nav>Keep shopping</a>
        <a class="btn btn-outline" href="#/policies/returns" data-nav>Return policy</a>
      </div>
      <div style="margin-top:44px;padding:26px;background:var(--mint-soft);border:1px dashed var(--mint-border);border-radius:16px">
        <h3 style="font-size:1.05rem;margin-bottom:8px">One more thing — leave a review?</h3>
        <p style="font-size:0.9rem">Once your toys arrive, we’ll email you a link to share photos and feedback. Verified reviews help other parents choose.</p>
      </div>
    </div>`;
  }

  /* ---------- STATIC PAGES ---------- */
  function viewAbout() {
    return `
    <section class="about-hero">
      <div class="container">
        <div class="about-grid">
          <div class="rv">
            <span class="eyebrow">Our promise</span>
            <h1 style="margin:14px 0 16px">We only sell toys we’d give our own kids</h1>
            <p>Munchkin Mall started because toy shopping had become exhausting — thousands of listings, five-star reviews that are obviously fake, and no honest answer to “will my child actually play with this?”</p>
            <p>So we built the opposite: a small, curated catalog where every toy is checked for safety, playability and age-appropriateness before it goes on the shelf. If it wouldn’t survive a real playroom, we don’t sell it.</p>
            <p><strong>Questions? Email us:</strong> <a href="mailto:hello@munchkinmall.com" style="color:var(--forest);font-weight:700;text-decoration:underline;text-underline-offset:3px">hello@munchkinmall.com</a> — a real human replies within one business day.</p>
          </div>
          <div class="rv" style="--d:.12s">
            <img src="assets/p01-main.jpg" alt="Colorful wooden toys arranged for a child" style="border-radius:24px;border:1px solid var(--mint-border);box-shadow:var(--shadow)" />
          </div>
        </div>
        <div class="promise-grid">
          <div class="promise-card rv">${I.shield}<h3>Safety first</h3><p>ASTM F963 and CPSIA checked. Materials, choking hazards and finishes verified before anything is listed.</p></div>
          <div class="promise-card rv" style="--d:.08s">${I.refresh}<h3>Hassle-free returns</h3><p>Thirty days, any reason, no restocking fee. If a toy disappoints, we refund it.</p></div>
          <div class="promise-card rv" style="--d:.16s">${I.truck}<h3>Honest delivery</h3><p>Real ETAs on every product page. If we say it arrives by the birthday, it arrives by the birthday.</p></div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head">
          <div><span class="eyebrow">How we choose</span><h2>Four checks before a toy goes on the shelf</h2></div>
        </div>
        <div class="promise-grid">
          <div class="promise-card"><strong style="color:var(--forest)">01 · Playability</strong><p style="margin-top:8px">We watch real kids play with it. Open-ended beats single-purpose. Boring after day three doesn’t make the cut.</p></div>
          <div class="promise-card"><strong style="color:var(--forest)">02 · Safety</strong><p style="margin-top:8px">Materials, finishes, small parts and age grading verified against US standards.</p></div>
          <div class="promise-card"><strong style="color:var(--forest)">03 · Durability</strong><p style="margin-top:8px">Drop tests, wash tests, sibling tests. Toys that break in a month get rejected.</p></div>
          <div class="promise-card"><strong style="color:var(--forest)">04 · Value</strong><p style="margin-top:8px">If it costs more than it should for what it is, we leave it off — simple as that.</p></div>
        </div>
        <div class="contact-box">
          <h3>Still deciding? Ask us anything.</h3>
          <p>Not sure which toy fits a 4-year-old who loves dinosaurs and hates loud noises? Email <a href="mailto:hello@munchkinmall.com">hello@munchkinmall.com</a> with the child’s age and interests and we’ll suggest two or three options — no pressure to buy.</p>
        </div>
      </div>
    </section>`;
  }

  function viewGiftGuide() {
    const guides = [
      { t: 'Gifts for 3-year-olds', d: 'Pretend play starters, first puzzles and chunky building sets that survive daily use.', img: 'assets/p10-main.jpg', link: '#/shop?age=3-5' },
      { t: 'Gifts for 5-year-olds', d: 'STEM kits, first board games and outdoor toys that burn serious energy.', img: 'assets/p06-main.jpg', link: '#/shop?age=5-8' },
      { t: 'Under $30 winners', d: 'Big reactions, small budget — the stocking stuffers parents rate highest.', img: 'assets/p03-main.jpg', link: '#/shop?max=30' },
      { t: 'New baby picks', d: 'Sensory toys, soft friends and teethers chosen for the first year.', img: 'assets/p02-main.jpg', link: '#/shop?age=0-1' },
      { t: 'For the STEM kid', d: 'Experiments, magnetic building and geography puzzles that teach quietly.', img: 'assets/p09-main.jpg', link: '#/shop?interest=stem' },
      { t: 'Rainy day savers', d: 'Art easels, puppet theaters and pretend kitchens for stuck-indoor days.', img: 'assets/p05-main.jpg', link: '#/shop?interest=creative' },
    ];
    return `
    <section class="shop-hero">
      <div class="container">
        <nav class="breadcrumb"><a href="#/" data-nav>Home</a> <span>/</span> <span aria-current="page">Gift guide</span></nav>
        <h1>The gift guide</h1>
        <p>Stuck on what to buy? Start here — shortlists by age, budget and interest, chosen the same way we choose everything else.</p>
      </div>
    </section>
    <section class="section">
      <div class="container">
        <div class="guide-grid">
          ${guides.map((g, i) => `
            <a class="guide-card rv" style="--d:${i * 0.07}s" href="${g.link}" data-nav>
              <img src="${g.img}" alt="${esc(g.t)}" loading="lazy" />
              <div class="guide-card-body"><h3>${esc(g.t)}</h3><p>${esc(g.d)}</p></div>
            </a>`).join('')}
        </div>
      </div>
    </section>`;
  }

  const FAQ_ITEMS = [
    { q: 'Are your toys safe?', a: 'Every toy is checked against US toy safety standards (ASTM F963) and CPSIA requirements — including material, finish and choking-hazard reviews. Compliance information is listed on each product page under the Safety tab.' },
    { q: 'When will my order arrive?', a: 'Orders placed before 2pm ship the same business day. Standard delivery takes 4–7 days; express arrives in 2–3. A live delivery estimate appears on every product page, and gift wrapping is available at checkout.' },
    { q: 'What if my child doesn’t like it?', a: 'Return it within 30 days for a full refund — no restocking fee, no questions asked. If it arrived damaged, we’ll replace it immediately and pay return shipping.' },
    { q: 'Do you price match?', a: 'If you find the same toy cheaper elsewhere within 7 days of ordering, email us the link and we’ll refund the difference.' },
    { q: 'How do I choose by age?', a: 'Use the Shop by Age filter — it’s the first filter on every collection page. Every product also lists its age range on the card, so you can scan quickly.' },
    { q: 'Do you offer gift wrapping?', a: 'Yes — add gift wrapping plus a handwritten note at checkout for $4.50, and an illustrated card for $3.' },
  ];

  const POLICIES = {
    shipping: {
      title: 'Shipping & Delivery',
      updated: 'October 2026',
      body: `
        <h2>How fast will my order arrive?</h2>
        <p>Orders placed before 2pm ET on a business day ship the same day. You’ll receive a tracking email within 24 hours of dispatch.</p>
        <table>
          <thead><tr><th>Method</th><th>Delivery time</th><th>Cost</th></tr></thead>
          <tbody>
            <tr><td>Standard</td><td>4–7 business days</td><td>Free over ${money(FREE_SHIP)}, otherwise $5.95</td></tr>
            <tr><td>Express</td><td>2–3 business days</td><td>$12.95</td></tr>
            <tr><td>Overnight</td><td>1 business day</td><td>$24.95</td></tr>
          </tbody>
        </table>
        <h2>Where do you ship?</h2>
        <p>We ship across the United States, including Alaska, Hawaii and APO/FPO addresses. International shipping is available to Canada, the UK, Australia and the EU — calculated at checkout.</p>
        <h2>Cutoff times and holidays</h2>
        <p>Our warehouse closes on federal holidays, which can add a day to processing. During November and December we recommend ordering at least 10 days before any date you need the gift to arrive.</p>
        <h2>Honest expectations</h2>
        <p>The delivery estimate on every product page is calculated from our real carrier performance over the last 90 days — not marketing numbers. If your order is running late, we’ll email you before you have to ask.</p>
      `,
    },
    returns: {
      title: 'Returns & Refunds',
      updated: 'October 2026',
      body: `
        <h2>30-day happiness guarantee</h2>
        <p>If a toy isn’t right — for any reason — return it within 30 days of delivery for a full refund. No restocking fee, no return shipping fee on damaged or wrong items.</p>
        <h2>How to start a return</h2>
        <ul>
          <li>Email hello@munchkinmall.com with your order number.</li>
          <li>We’ll send a prepaid return label within one business day.</li>
          <li>Drop the package at any carrier location.</li>
        </ul>
        <h2>When do refunds arrive?</h2>
        <p>Refunds are issued within 2 business days of the package arriving back at our warehouse. Your bank typically takes 3–5 business days to post it.</p>
        <h2>Damaged or wrong items</h2>
        <p>Email us a photo within 48 hours and we’ll ship a replacement immediately — you don’t need to return the damaged item first.</p>
        <h2>Final sale items</h2>
        <p>Clearance items marked “final sale” can’t be returned unless damaged on arrival. Everything else in the catalog is covered by the 30-day guarantee.</p>
      `,
    },
    warranty: {
      title: 'Warranty',
      updated: 'October 2026',
      body: `
        <h2>One-year toy warranty</h2>
        <p>Every toy we sell comes with a one-year warranty against manufacturing defects. If a seam opens, a magnet detaches or a mechanism fails in normal play, email us a photo and we’ll replace it free.</p>
        <h2>What’s covered</h2>
        <ul>
          <li>Manufacturing and material defects</li>
          <li>Attachments (eyes, wheels, handles) that fail in normal use</li>
          <li>Finish peeling or chipping within the warranty period</li>
        </ul>
        <h2>What’s not covered</h2>
        <ul>
          <li>Normal wear from enthusiastic play</li>
          <li>Damage from misuse, pets or weather</li>
          <li>Toys modified or repaired outside our instructions</li>
        </ul>
        <h2>How to claim</h2>
        <p>Email hello@munchkinmall.com with your order number and a photo of the issue. Claims are typically approved within one business day.</p>
      `,
    },
    privacy: {
      title: 'Privacy Policy',
      updated: 'October 2026',
      body: `
        <h2>What we collect</h2>
        <p>We collect only what’s needed to run your order: your name, email, shipping address and payment details (processed by our PCI-compliant payment provider — we never see your card number).</p>
        <h2>How we use it</h2>
        <ul>
          <li>To fulfill and track your order</li>
          <li>To send order updates and, if you opt in, our weekly play-ideas email</li>
          <li>To improve the store based on what shoppers browse</li>
        </ul>
        <h2>What we never do</h2>
        <p>We don’t sell or rent your data. Ever. You can unsubscribe from marketing email in one click, and request deletion of your account data at any time by emailing hello@munchkinmall.com.</p>
      `,
    },
    terms: {
      title: 'Terms of Service',
      updated: 'October 2026',
      body: `
        <h2>Orders and pricing</h2>
        <p>All prices are in USD. We reserve the right to correct pricing errors and to cancel orders placed with incorrect prices, with a full refund issued either way.</p>
        <h2>Age guidance</h2>
        <p>Age ranges on product pages are safety guidelines. Toys with small parts are not suitable for children under 3. Adult supervision is recommended for all children’s products.</p>
        <h2>Limitation of liability</h2>
        <p>Munchkin Mall’s liability is limited to the amount paid for the product in question. We’re not responsible for indirect damages arising from product use.</p>
        <h2>Governing law</h2>
        <p>These terms are governed by the laws of the state of Delaware, without regard to conflict-of-law provisions.</p>
      `,
    },
  };

  function viewPolicy(key) {
    const p = POLICIES[key];
    if (!p) return viewNotFound();
    return `
    <div class="policy">
      <div class="container">
        <div class="policy-inner">
          <nav class="breadcrumb"><a href="#/" data-nav>Home</a> <span>/</span> <span aria-current="page">${esc(p.title)}</span></nav>
          <h1>${esc(p.title)}</h1>
          <p class="updated">Last updated: ${p.updated}</p>
          ${p.body}
        </div>
      </div>
    </div>`;
  }

  function viewNotFound() {
    return `
    <div class="container">
      <div class="empty-state" style="padding:100px 20px">
        ${I.search}
        <h3>We couldn’t find that page</h3>
        <p>The link may be old or mistyped — but the toy aisle is right this way.</p>
        <a class="btn btn-primary" href="#/shop" data-nav>Browse all toys</a>
      </div>
    </div>`;
  }

  /* ---------- ROUTER ---------- */
  function render() {
    const hash = location.hash || '#/';
    const [path, query = ''] = hash.slice(1).split('?');
    const parts = path.split('/').filter(Boolean);
    const app = $('#app');
    let html = '';

    if (!parts.length) html = viewHome();
    else if (parts[0] === 'shop') html = viewShop(query);
    else if (parts[0] === 'product' && parts[1]) html = viewProduct(parts[1]);
    else if (parts[0] === 'checkout') html = viewCheckout();
    else if (parts[0] === 'confirmation') html = viewConfirmation();
    else if (parts[0] === 'about') html = viewAbout();
    else if (parts[0] === 'gift-guide') html = viewGiftGuide();
    else if (parts[0] === 'policies' && parts[1]) html = viewPolicy(parts[1]);
    else html = viewNotFound();

    app.innerHTML = html;
    window.scrollTo({ top: 0, behavior: 'auto' });
    afterRender(hash);
    observeReveal();
    closeCart();
    closeMenu();
    closeSearch();
  }

  function afterRender(hash) {
    const path = hash.split('?')[0];
    if (path === '#/shop') bindShop();
    if (path.startsWith('#/product/')) bindProduct();
    if (path === '#/checkout') bindCheckout();
  }

  /* ---------- SHOP BINDINGS ---------- */
  function bindShop() {
    // live re-render on filter change (lightweight: recompute + patch grid only)
    const update = () => {
      const state = collectShopState();
      const filtered = applyFilters(products.slice(), state);
      const sorted = sortProducts(filtered, state.sort);
      const results = $('#shopResults');
      if (results) results.innerHTML = productGrid(sorted);
      const count = $('.shop-count');
      if (count) count.textContent = `${filtered.length} ${filtered.length === 1 ? 'toy' : 'toys'}`;
      const chips = $('.filter-chips');
      if (chips) {
        const active = activeChips(state);
        chips.innerHTML = active.map((c) => `
          <button class="chip is-active" data-chip-remove="${c.key}">${esc(c.label)}
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="m2 2 7 7M9 2l-7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>`).join('') + (active.length ? '<button class="chip" data-clear-filters>Clear all</button>' : '');
      }
    };

    $$('#filtersPanel input').forEach((input) => {
      input.addEventListener('change', update);
    });
    $$('#filtersPanel input[data-filter="max"], #filtersPanel input[data-filter="min"]').forEach((input) => {
      input.addEventListener('input', debounce(update, 350));
    });
    const sortSel = $('#sortSelect');
    if (sortSel) sortSel.addEventListener('change', update);

    const filterToggle = $('#filterToggle');
    if (filterToggle) filterToggle.addEventListener('click', () => $('#filtersPanel')?.classList.toggle('is-open'));

    // chip removes + clear (delegated)
    const chips = $('.filter-chips');
    if (chips) {
      chips.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('[data-chip-remove]');
        if (removeBtn) {
          const key = removeBtn.dataset.chipRemove;
          const panel = $('#filtersPanel');
          if (panel) {
            const input = panel.querySelector(`input[data-filter="${key}"]`);
            if (input) { input.checked = false; input.dispatchEvent(new Event('change')); return; }
            const num = panel.querySelector(`input[data-filter="${key}"]`);
            if (num) { num.value = ''; num.dispatchEvent(new Event('input')); return; }
          }
          // fallback: navigate to clean shop
          location.hash = '#/shop';
          return;
        }
        if (e.target.closest('[data-clear-filters]')) {
          location.hash = '#/shop';
        }
      });
    }
  }

  function collectShopState() {
    const panel = $('#filtersPanel');
    const state = { age: '', interest: '', occasion: '', tag: '', q: '', min: '', max: '', sort: 'featured' };
    if (!panel) {
      const params = new URLSearchParams(location.hash.split('?')[1] || '');
      return {
        age: params.get('age') || '', interest: params.get('interest') || '', occasion: params.get('occasion') || '',
        tag: params.get('tag') || '', q: params.get('q') || '', min: params.get('min') || '', max: params.get('max') || '', sort: params.get('sort') || 'featured',
      };
    }
    state.age = panel.querySelector('input[data-filter="age"]:checked')?.value || '';
    state.interest = panel.querySelector('input[data-filter="interest"]:checked')?.value || '';
    state.occasion = panel.querySelector('input[data-filter="occasion"]:checked')?.value || '';
    state.tag = panel.querySelector('input[data-filter="tag"]:checked')?.value || '';
    state.min = panel.querySelector('input[data-filter="min"]')?.value || '';
    state.max = panel.querySelector('input[data-filter="max"]')?.value || '';
    state.sort = $('#sortSelect')?.value || 'featured';
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    state.q = params.get('q') || '';
    return state;
  }

  function debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  /* ---------- PRODUCT BINDINGS ---------- */
  function bindProduct() {
    const p = byId(location.hash.split('/')[2]);
    if (!p) return;
    let galIdx = 0;
    const tags = ['Studio shot', 'In action', 'Size reference', 'Packaging'];

    const img = $('#galleryImg');
    const tag = $('#galleryTag');
    const setGal = (i) => {
      galIdx = (i + p.images.length) % p.images.length;
      if (img) { img.style.opacity = '0'; setTimeout(() => { img.src = p.images[galIdx]; img.style.opacity = '1'; }, 120); }
      if (tag) tag.textContent = tags[galIdx] || 'Product photo';
      $$('.gallery-thumb').forEach((t, ti) => t.classList.toggle('is-active', ti === galIdx));
    };
    if (img) img.style.transition = 'opacity .25s ease';

    $$('[data-gal]').forEach((b) => b.addEventListener('click', () => setGal(galIdx + Number(b.dataset.gal))));
    $$('[data-thumb]').forEach((b) => b.addEventListener('click', () => setGal(Number(b.dataset.thumb))));

    let qty = 1;
    const qtyEl = $('#pdpQty');
    $$('[data-qty]').forEach((b) => b.addEventListener('click', () => {
      qty = Math.max(1, Math.min(99, qty + Number(b.dataset.qty)));
      if (qtyEl) qtyEl.textContent = qty;
    }));

    const doAdd = (opts) => { addToCart(p.id, qty, opts); openCart(); };
    const addBtn = $('#pdpAdd');
    if (addBtn) addBtn.addEventListener('click', () => doAdd({}));
    const sticky = $('#stickyAdd');
    if (sticky) sticky.addEventListener('click', () => doAdd({}));

    const bundleBtn = $('#bundleAdd');
    if (bundleBtn) bundleBtn.addEventListener('click', () => {
      addToCart(p.id, 1, {});
      p.upsells.slice(0, 2).forEach((u) => { if (byId(u) && !cart.some((l) => l.id === u)) addToCart(u, 1, {}); });
      openCart();
      toast('Bundle added — 15% bundle savings applied at checkout');
    });

    // tabs
    $$('[data-tab]').forEach((btn) => btn.addEventListener('click', () => {
      $$('[data-tab]').forEach((b) => b.classList.toggle('is-active', b === btn));
      $$('[data-panel]').forEach((panel) => { panel.hidden = panel.dataset.panel !== btn.dataset.tab; });
      if (btn.id === 'reviewsTab') {
        const panel = $('#reviewsPanel');
        if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }));

    // review scroll link
    $$('[data-scroll-reviews]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = $('#reviewsTab');
      if (tab) tab.click();
    }));

    // helpful buttons
    $$('[data-helpful]').forEach((b) => b.addEventListener('click', () => {
      if (b.classList.contains('is-clicked')) return;
      b.classList.add('is-clicked');
      const m = b.textContent.match(/\((\d+)\)/);
      if (m) b.innerHTML = `${I.check} Helpful (${Number(m[1]) + 1})`;
    }));

    // write review stub
    const wr = $('#writeReview');
    if (wr) wr.addEventListener('click', () => toast('Review form would open here (Judge.me integration)'));

    // sticky bar visibility
    const stickyBar = $('#pdpSticky');
    if (stickyBar) {
      const onScroll = () => {
        const rect = addBtn?.getBoundingClientRect();
        const show = rect ? rect.bottom < 80 : false;
        stickyBar.classList.toggle('is-visible', show);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  }

  /* ---------- CHECKOUT BINDINGS ---------- */
  function bindCheckout() {
    const form = $('#checkoutForm');
    const place = $('#placeOrder');

    const recalc = () => {
      const subtotal = cartSubtotal();
      const selected = $('input[name="ship"]:checked');
      const shipId = selected?.value || 'standard';
      const shipping = shipId === 'express' ? 12.95 : (subtotal >= FREE_SHIP ? 0 : 5.95);
      const total = checkoutTotal(subtotal, shipping, appliedDiscount);
      const sumShip = $('#sumShipping');
      if (sumShip) sumShip.textContent = shipping === 0 ? 'Free' : money(shipping);
      const sumTotal = $('#sumTotal');
      if (sumTotal) sumTotal.textContent = money(total);
      if (place) place.textContent = `Pay ${money(total)}`;
    };

    $$('.ship-method').forEach((label) => {
      label.addEventListener('click', () => {
        $$('.ship-method').forEach((l) => l.classList.remove('is-selected'));
        label.classList.add('is-selected');
        recalc();
      });
    });

    $$('[data-express]').forEach((btn) => btn.addEventListener('click', () => {
      toast(`${btn.dataset.express} would open here — demo checkout completes below`);
    }));

    if (form) {
      form.addEventListener('submit', (e) => e.preventDefault());
      $$('input', form).forEach((input) => {
        input.addEventListener('input', () => {
          input.classList.remove('is-invalid');
          input.closest('.form-field')?.classList.remove('has-error');
        });
      });
    }

    if (place) place.addEventListener('click', () => {
      const email = $('#ckEmail');
      const first = $('#ckFirst');
      const last = $('#ckLast');
      const address = $('#ckAddress');
      const city = $('#ckCity');
      const zip = $('#ckZip');
      const fields = [email, first, last, address, city, zip];
      let valid = true;
      fields.forEach((f) => {
        if (!f) return;
        const ok = f.type === 'email' ? /\S+@\S+\.\S+/.test(f.value) : f.value.trim().length > 0;
        f.classList.toggle('is-invalid', !ok);
        f.closest('.form-field')?.classList.toggle('has-error', !ok);
        if (!ok && valid) { f.focus(); valid = false; }
      });
      if (!valid) { toast('Please complete the highlighted fields'); return; }

      place.disabled = true;
      place.textContent = 'Processing…';
      setTimeout(() => {
        const subtotal = cartSubtotal();
        const selected = $('input[name="ship"]:checked');
        const shipId = selected?.value || 'standard';
        const shipping = shipId === 'express' ? 12.95 : (subtotal >= FREE_SHIP ? 0 : 5.95);
        const total = checkoutTotal(subtotal, shipping, appliedDiscount);
        lastOrder = {
          number: 'MM-' + Math.random().toString(36).slice(2, 7).toUpperCase(),
          email: email.value,
          name: `${first.value} ${last.value}`.trim(),
          total,
          eta: shipId === 'express' ? `${dateStr(2)} – ${dateStr(3)}` : `${dateStr(4)} – ${dateStr(7)}`,
        };
        cart = [];
        saveCart();
        appliedDiscount = null;
        renderCart();
        location.hash = '#/confirmation';
      }, 900);
    });
  }

  /* ---------- CART DRAWER ---------- */
  function openCart() {
    const drawer = $('#cartDrawer');
    const overlay = $('#cartOverlay');
    if (!drawer || !overlay) return;
    overlay.hidden = false;
    drawer.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
      overlay.classList.add('is-visible');
      drawer.classList.add('is-open');
    });
    document.body.classList.add('no-scroll');
  }
  function closeCart() {
    const drawer = $('#cartDrawer');
    const overlay = $('#cartOverlay');
    if (!drawer || !overlay) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('is-visible');
    setTimeout(() => { if (!drawer.classList.contains('is-open')) overlay.hidden = true; }, 320);
    document.body.classList.remove('no-scroll');
  }

  /* ---------- MOBILE MENU / SEARCH ---------- */
  function closeMenu() {
    const menu = $('#mobileMenu');
    const toggle = $('#menuToggle');
    if (menu) menu.hidden = true;
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }
  function closeSearch() {
    const sheet = $('#searchSheet');
    if (sheet) sheet.hidden = true;
  }

  /* ---------- REVEAL OBSERVER ---------- */
  let revealObserver = null;
  function observeReveal() {
    if (revealObserver) revealObserver.disconnect();
    if (!('IntersectionObserver' in window)) { $$('.rv').forEach((el) => el.classList.add('in')); return; }
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('in'); revealObserver.unobserve(entry.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    $$('.rv').forEach((el) => revealObserver.observe(el));
  }

  /* ---------- GLOBAL DELEGATED EVENTS ---------- */
  function bindGlobal() {
    // cart open/close
    $('#cartToggle')?.addEventListener('click', openCart);
    $('#cartClose')?.addEventListener('click', closeCart);
    $('#cartOverlay')?.addEventListener('click', closeCart);

    // cart drawer body actions
    const body = $('#cartBody');
    if (body) {
      body.addEventListener('click', (e) => {
        const inc = e.target.closest('[data-inc]');
        const dec = e.target.closest('[data-dec]');
        const rem = e.target.closest('[data-remove]');
        const closeLink = e.target.closest('[data-close-cart]');
        if (inc) setQty(Number(inc.dataset.inc), cart[Number(inc.dataset.inc)].qty + 1);
        if (dec) setQty(Number(dec.dataset.dec), cart[Number(dec.dataset.dec)].qty - 1);
        if (rem) removeLine(Number(rem.dataset.remove));
        if (closeLink && !inc && !dec) closeCart();
      });
    }

    // cart foot
    const foot = $('#cartFoot');
    if (foot) {
      foot.addEventListener('click', (e) => {
        const addon = e.target.closest('[data-addon]');
        if (addon) {
          addAddon(addon.dataset.addon);
          addon.classList.add('is-added');
          addon.textContent = 'Added';
          setTimeout(() => { addon.classList.remove('is-added'); addon.textContent = 'Add'; }, 1800);
        }
      });
    }

    $('#checkoutBtn')?.addEventListener('click', () => {
      if (!cart.length) { toast('Your cart is empty'); return; }
      closeCart();
      location.hash = '#/checkout';
    });

    // empty-cart start shopping
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-close-cart]') && !e.target.closest('#cartBody')) closeCart();
    });

    // quick add + wishlist (delegated on app)
    const app = $('#app');
    if (app) {
      app.addEventListener('click', (e) => {
        const quick = e.target.closest('[data-quick]');
        if (quick) { e.preventDefault(); addToCart(quick.dataset.quick, 1, {}); openCart(); return; }
        const wish = e.target.closest('[data-wish]');
        if (wish) {
          e.preventDefault();
          const id = wish.dataset.wish;
          if (wishlist.has(id)) { wishlist.delete(id); wish.classList.remove('is-active'); }
          else { wishlist.add(id); wish.classList.add('is-active'); toast('Saved to wishlist'); }
          saveWish();
        }
        const clear = e.target.closest('[data-clear-filters]');
        if (clear) location.hash = '#/shop';
      });
      // keyboard support for quick-add
      app.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const quick = e.target.closest('[data-quick]');
        if (quick) { e.preventDefault(); addToCart(quick.dataset.quick, 1, {}); openCart(); }
      });
    }

    // mobile menu
    $('#menuToggle')?.addEventListener('click', () => {
      const menu = $('#mobileMenu');
      const toggle = $('#menuToggle');
      if (!menu) return;
      const open = menu.hidden;
      menu.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
    });

    // search
    const searchToggle = $('#searchToggle');
    const searchSheet = $('#searchSheet');
    const searchInput = $('#searchInput');
    searchToggle?.addEventListener('click', () => {
      searchSheet.hidden = !searchSheet.hidden;
      if (!searchSheet.hidden) searchInput?.focus();
    });
    $('#searchClose')?.addEventListener('click', () => { searchSheet.hidden = true; });
    searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        if (q) { location.hash = `#/shop?q=${encodeURIComponent(q)}`; searchSheet.hidden = true; searchInput.value = ''; }
      }
      if (e.key === 'Escape') { searchSheet.hidden = true; searchToggle?.focus(); }
    });

    // header shadow on scroll
    const header = $('#siteHeader');
    if (header) {
      const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    // newsletter
    $('#newsletterForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const note = $('#newsletterNote');
      if (note) note.hidden = false;
      e.target.reset();
      toast('Welcome aboard! Your 10% code is on its way');
    });

    // FAQ accordion
    document.addEventListener('click', (e) => {
      const q = e.target.closest('.faq-q');
      if (!q) return;
      const item = q.closest('.faq-item');
      const open = item.classList.contains('is-open');
      $$('.faq-item.is-open').forEach((i) => { i.classList.remove('is-open'); i.querySelector('.faq-a').style.maxHeight = null; i.querySelector('.faq-q').setAttribute('aria-expanded', 'false'); });
      if (!open) {
        item.classList.add('is-open');
        const a = item.querySelector('.faq-a');
        a.style.maxHeight = a.scrollHeight + 'px';
        q.setAttribute('aria-expanded', 'true');
      }
    });

    // popup
    const popupOverlay = $('#popupOverlay');
    const showPopup = () => {
      if (popupShown) return;
      let seen = false;
      try { seen = localStorage.getItem(STORE_KEYS.popup) === '1'; } catch (e) {}
      if (seen) return;
      popupShown = true;
      popupOverlay.hidden = false;
      requestAnimationFrame(() => popupOverlay.classList.add('is-visible'));
    };
    const hidePopup = () => {
      popupOverlay.classList.remove('is-visible');
      setTimeout(() => { popupOverlay.hidden = true; }, 320);
      try { localStorage.setItem(STORE_KEYS.popup, '1'); } catch (e) {}
    };
    $('#popupClose')?.addEventListener('click', hidePopup);
    $('#popupLater')?.addEventListener('click', hidePopup);
    popupOverlay?.addEventListener('click', (e) => { if (e.target === popupOverlay) hidePopup(); });
    $('#popupForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      e.target.innerHTML = '<p style="color:var(--forest);font-weight:700;text-align:center">🎉 Code <strong>MALL10</strong> sent — check your inbox!</p>';
      setTimeout(hidePopup, 1600);
    });
    setTimeout(showPopup, 9000);

    // escape closes drawers
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      closeCart();
      closeMenu();
      closeSearch();
      hidePopup();
    });

    // year
    const yearEl = $('#year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // announcement marquee content
    const track = $('#announceTrack');
    if (track) {
      const items = ['Free shipping over $50', '30-day easy returns', 'Safety-tested: CPSIA &amp; ASTM F963', 'Gift wrapping available', 'Ships in 1 business day'];
      const html = items.map((i) => `<span>${i}</span>`).join('');
      track.innerHTML = html + html;
    }
  }

  /* ---------- BOOT ---------- */
  function boot() {
    renderCart();
    bindGlobal();
    render();
    window.addEventListener('hashchange', render);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
