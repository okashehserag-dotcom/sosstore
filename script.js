(() => {
  const STORE = {
    brand: "SOS STORE",
    instagram: "https://instagram.com/sos_sstorre",
    checkoutWhatsApp: "",
    tags: ["all","new","popular","limited","sale","accessory","classic"],
    collections: [
      { id:"c1", title:"إصدارات جديدة", sub:"ستايل جديد جاهز للتعبئة", tag:"new" },
      { id:"c2", title:"الأكثر طلبًا", sub:"اختيارات العملاء", tag:"popular" },
      { id:"c3", title:"إكسسوارات", sub:"لمسة فخمة", tag:"accessory" },
      { id:"c4", title:"Limited", sub:"كميات محدودة", tag:"limited" }
    ],
    products: seedProducts()
  };

  function seedProducts(){
    const make = (id, title, desc, price, tags, collection, createdAt) => ({
      id, title, desc, price, tags, collection, createdAt,
      image: placeholderImg(title)
    });

    const now = Date.now();
    const day = 86400000;

    const items = [];
    let idx = 1;

    const addBatch = (collection, baseTags) => {
      for(let i=0;i<12;i++){
        const n = idx++;
        const t = `${baseTags[0]}-${n}`;
        items.push(make(
          t,
          `منتج ${n}`,
          "وصف مختصر جاهز للتعبئة — قريبًا صور وتفاصيل حقيقية.",
          10 + (n % 9) * 5,
          Array.from(new Set(["new", ...baseTags, (n%3===0?"limited":"")].filter(Boolean))),
          collection,
          now - (n * day)
        ));
      }
    };

    addBatch("c1", ["new","classic"]);
    addBatch("c2", ["popular","sale"]);
    addBatch("c3", ["accessory","classic"]);
    addBatch("c4", ["limited","classic"]);

    return items;
  }

  function placeholderImg(text){
    const bg = encodeURIComponent("#E7D9C4");
    const fg = encodeURIComponent("#201810");
    const t = encodeURIComponent((text || "SOON").slice(0,16));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200"><rect width="1200" height="1200" fill="${bg}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="92" font-family="Arial" fill="${fg}" opacity="0.9">SOON</text><text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" font-size="32" font-family="Arial" fill="${fg}" opacity="0.55">${t}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${svg}`;
  }

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const LS = {
    theme: "sos_theme_v1",
    like: (id) => `sos_like_${id}`,
    wish: "sos_wish_v1",
    cart: "sos_cart_v1",
    comments: (id) => `sos_comments_${id}`
  };

  const state = {
    tag: "all",
    search: "",
    sort: "featured",
    pageSize: 12,
    page: 1,
    currentCollection: null,
    colIndex: 0,
    colPerView: 1,
    colItems: []
  };

  document.addEventListener("DOMContentLoaded", () => {
    $("#year").textContent = String(new Date().getFullYear());
    initTheme();
    initHeaderSearch();
    initTopButton();
    initReveal();
    buildCollections();
    buildTagChips();
    renderProducts();
    bindDrawers();
    bindGlobalActions();
  });

  function initTheme(){
    const saved = localStorage.getItem(LS.theme);
    if(saved) document.documentElement.setAttribute("data-theme", saved);
    $("#themeBtn").addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-theme") || "light";
      const next = cur === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem(LS.theme, next);
      toast(next === "dark" ? "تم تفعيل الوضع الليلي" : "تم تفعيل الوضع العادي");
    });
  }

  function initHeaderSearch(){
    const input = $("#globalSearch");
    const clear = $("#searchClear");

    input.addEventListener("input", debounce(() => {
      state.search = input.value.trim().toLowerCase();
      state.page = 1;
      renderProducts();
    }, 140));

    clear.addEventListener("click", () => {
      input.value = "";
      state.search = "";
      state.page = 1;
      renderProducts();
      toast("تم مسح البحث");
    });

    $("#sortSelect").addEventListener("change", (e) => {
      state.sort = e.target.value;
      state.page = 1;
      renderProducts();
    });

    $("#resetFilters").addEventListener("click", () => {
      state.tag = "all";
      state.search = "";
      state.sort = "featured";
      state.page = 1;
      input.value = "";
      $("#sortSelect").value = "featured";
      setChipActive("all");
      renderProducts();
      toast("تمت إعادة الضبط");
    });

    $("#loadMore").addEventListener("click", () => {
      state.page += 1;
      renderProducts(true);
    });
  }

  function initTopButton(){
    const btn = $("#toTop");
    const on = () => btn.classList.toggle("is-on", window.scrollY > 600);
    window.addEventListener("scroll", debounce(on, 80), {passive:true});
    btn.addEventListener("click", () => window.scrollTo({top:0, behavior:"smooth"}));
  }

  function initReveal(){
    const els = $$(".reveal");
    if(!("IntersectionObserver" in window)){ els.forEach(e=>e.classList.add("is-in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if(!en.isIntersecting) return;
        en.target.classList.add("is-in");
        io.unobserve(en.target);
      });
    }, {threshold:0.12});
    els.forEach(e=>io.observe(e));
  }

  function buildCollections(){
    const grid = $("#collectionsGrid");
    grid.innerHTML = "";
    STORE.collections.forEach(c => {
      const el = document.createElement("div");
      el.className = "collectionCard reveal";
      el.tabIndex = 0;
      el.setAttribute("role","button");
      el.innerHTML = `
        <div class="collectionCard__top">
          <div class="collectionCard__title">${esc(c.title)}</div>
          <div class="collectionCard__sub">${esc(c.sub)}</div>
        </div>
        <div class="collectionCard__bar"></div>
      `;
      el.addEventListener("click", () => openCollection(c.id));
      el.addEventListener("keydown", (e) => { if(e.key === "Enter") openCollection(c.id); });
      grid.appendChild(el);
    });
  }

  function openCollection(collectionId){
    const c = STORE.collections.find(x => x.id === collectionId);
    if(!c) return;

    state.currentCollection = c.id;
    $("#collectionTitle").textContent = c.title;
    $("#collectionSub").textContent = c.sub;

    const filter = $("#collectionFilter");
    filter.innerHTML = STORE.tags.map(t => `<option value="${t}">${t.toUpperCase()}</option>`).join("");
    filter.value = "all";

    $("#collectionSearch").value = "";
    state.colIndex = 0;
    state.colPerView = calcColPerView();

    state.colItems = STORE.products
      .filter(p => p.collection === c.id)
      .slice(0, 10);

    renderCollectionSlides();
    bindCollectionControls();
    openDrawer("collection");
    toast(`فتح: ${c.title}`);
  }

  function bindCollectionControls(){
    const search = $("#collectionSearch");
    const filter = $("#collectionFilter");

    search.oninput = debounce(() => {
      applyCollectionFilters();
    }, 140);

    filter.onchange = () => applyCollectionFilters();

    window.onresize = debounce(() => {
      if(!isDrawerOpen("collection")) return;
      state.colPerView = calcColPerView();
      clampColIndex();
      updateCollectionSlider();
    }, 140);

    $("#colPrev").onclick = () => { state.colIndex = Math.max(0, state.colIndex - 1); updateCollectionSlider(); };
    $("#colNext").onclick = () => { state.colIndex = Math.min(maxColIndex(), state.colIndex + 1); updateCollectionSlider(); };

    initSwipe($("#colViewport"), () => $("#colNext").click(), () => $("#colPrev").click());
  }

  function applyCollectionFilters(){
    const c = STORE.collections.find(x => x.id === state.currentCollection);
    if(!c) return;

    const q = $("#collectionSearch").value.trim().toLowerCase();
    const tag = $("#collectionFilter").value;

    let items = STORE.products.filter(p => p.collection === c.id).slice(0, 30);

    if(tag !== "all") items = items.filter(p => (p.tags||[]).includes(tag));
    if(q) items = items.filter(p => (p.title||"").toLowerCase().includes(q) || (p.desc||"").toLowerCase().includes(q));

    state.colItems = items.slice(0, 10);
    state.colIndex = 0;
    renderCollectionSlides();
  }

  function renderCollectionSlides(){
    const track = $("#colTrack");
    track.innerHTML = "";

    if(state.colItems.length === 0){
      track.innerHTML = `<div class="slide" style="min-width:100%"><div class="slide__inner"><div class="slide__body"><h3 class="slide__title">لا يوجد منتجات</h3><p class="slide__desc">القسم جاهز للتعبئة</p><div class="slide__foot"><span class="pill">SOON</span></div></div></div></div>`;
      $("#colCount").textContent = "0 نتيجة";
      updateCollectionSlider();
      return;
    }

    state.colItems.forEach(p => {
      const liked = isLiked(p.id);
      const el = document.createElement("div");
      el.className = "slide";
      el.innerHTML = `
        <div class="slide__inner">
          <div class="slide__media"><img src="${escAttr(p.image)}" alt="soon" loading="lazy" decoding="async"></div>
          <div class="slide__body">
            <h3 class="slide__title">${esc(p.title)}</h3>
            <p class="slide__desc">${esc(p.desc)}</p>
            <div class="slide__foot">
              <span class="pill">${formatPrice(p.price)}</span>
              <div class="product__actions">
                <button class="actionBtn" data-like="${escAttr(p.id)}" ${liked ? "disabled" : ""}>${liked ? "Liked" : "Like"}</button>
                <button class="actionBtn" data-comment="${escAttr(p.id)}">Comment</button>
                <button class="actionBtn" data-add="${escAttr(p.id)}">Add</button>
              </div>
            </div>
          </div>
        </div>
      `;
      track.appendChild(el);
    });

    track.onclick = onProductActionClick;
    $("#colCount").textContent = `${state.colItems.length} منتج`;
    state.colPerView = calcColPerView();
    clampColIndex();
    updateCollectionSlider();
  }

  function calcColPerView(){
    const w = window.innerWidth;
    if(w >= 1100) return 3;
    if(w >= 820) return 2;
    return 1;
  }

  function maxColIndex(){
    const total = state.colItems.length || 1;
    return Math.max(0, total - state.colPerView);
  }

  function clampColIndex(){
    state.colIndex = Math.max(0, Math.min(state.colIndex, maxColIndex()));
  }

  function updateCollectionSlider(){
    const viewport = $("#colViewport");
    const track = $("#colTrack");
    if(!viewport || !track) return;

    const vw = viewport.getBoundingClientRect().width;
    const gap = 12;
    const slideW = Math.max(240, (vw - gap * (state.colPerView + 1)) / state.colPerView);

    Array.from(track.children).forEach(s => s.style.minWidth = `${slideW}px`);
    track.style.transform = `translateX(${-state.colIndex * (slideW + gap)}px)`;

    $("#colPrev").disabled = state.colIndex <= 0;
    $("#colNext").disabled = state.colIndex >= maxColIndex();
  }

  function buildTagChips(){
    const wrap = $("#tagChips");
    wrap.innerHTML = "";
    STORE.tags.forEach(tg => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (tg === "all" ? " is-on" : "");
      b.dataset.tag = tg;
      b.textContent = tg.toUpperCase();
      b.addEventListener("click", () => {
        state.tag = tg;
        state.page = 1;
        setChipActive(tg);
        renderProducts();
        toast(`فلتر: ${tg.toUpperCase()}`);
      });
      wrap.appendChild(b);
    });
  }

  function setChipActive(tag){
    $$(".chip").forEach(c => c.classList.toggle("is-on", c.dataset.tag === tag));
  }

  function renderProducts(append=false){
    const grid = $("#productsGrid");
    if(!append) grid.innerHTML = "";

    const items = getFilteredSortedProducts();
    const slice = items.slice(0, state.page * state.pageSize);

    const existing = append ? grid.children.length : 0;
    const toRender = slice.slice(existing);

    toRender.forEach(p => grid.appendChild(productCard(p)));

    $("#loadMore").style.display = slice.length < items.length ? "inline-flex" : "none";

    grid.onclick = onProductActionClick;
    syncCounts();
  }

  function getFilteredSortedProducts(){
    let items = STORE.products.slice();

    if(state.tag !== "all") items = items.filter(p => (p.tags||[]).includes(state.tag));
    if(state.search){
      const q = state.search;
      items = items.filter(p =>
        (p.title||"").toLowerCase().includes(q) ||
        (p.desc||"").toLowerCase().includes(q) ||
        (p.tags||[]).some(t => t.includes(q))
      );
    }

    switch(state.sort){
      case "newest": items.sort((a,b)=> (b.createdAt||0) - (a.createdAt||0)); break;
      case "priceLow": items.sort((a,b)=> (a.price||0) - (b.price||0)); break;
      case "priceHigh": items.sort((a,b)=> (b.price||0) - (a.price||0)); break;
      case "nameAZ": items.sort((a,b)=> (a.title||"").localeCompare(b.title||"", "ar")); break;
      default:
        items.sort((a,b)=> scoreFeatured(b) - scoreFeatured(a));
    }

    return items;
  }

  function scoreFeatured(p){
    const t = new Set(p.tags||[]);
    return (t.has("popular")?5:0) + (t.has("limited")?3:0) + (t.has("new")?2:0);
  }

  function productCard(p){
    const liked = isLiked(p.id);
    const el = document.createElement("article");
    el.className = "product";
    el.innerHTML = `
      <div class="product__media">
        <img src="${escAttr(p.image)}" alt="soon" loading="lazy" decoding="async">
      </div>
      <div class="product__body">
        <h3 class="product__title">${esc(p.title)}</h3>
        <p class="product__desc">${esc(p.desc)}</p>
        <div class="product__row">
          <span class="pill">${formatPrice(p.price)}</span>
          <span class="pill">${(p.tags||[]).slice(0,2).join(" • ").toUpperCase()}</span>
        </div>
        <div class="product__actions">
          <button class="actionBtn" data-like="${escAttr(p.id)}" ${liked ? "disabled" : ""}>${liked ? "Liked" : "Like"}</button>
          <button class="actionBtn" data-comment="${escAttr(p.id)}">Comment</button>
          <button class="actionBtn" data-add="${escAttr(p.id)}">Add to Cart</button>
        </div>
      </div>
    `;
    return el;
  }

  function onProductActionClick(e){
    const likeBtn = e.target.closest("[data-like]");
    const commentBtn = e.target.closest("[data-comment]");
    const addBtn = e.target.closest("[data-add]");

    if(likeBtn){
      const id = likeBtn.dataset.like;
      if(!id || isLiked(id)) return;
      localStorage.setItem(LS.like(id), "1");
      likeBtn.textContent = "Liked";
      likeBtn.disabled = true;
      addToWish(id);
      toast("تم حفظ اللايك");
      syncCounts();
      return;
    }

    if(commentBtn){
      const id = commentBtn.dataset.comment;
      openComments(id);
      return;
    }

    if(addBtn){
      const id = addBtn.dataset.add;
      addToCart(id, 1);
      toast("تمت الإضافة للسلة");
      syncCounts();
      return;
    }
  }

  function addToWish(productId){
    const list = getJSON(LS.wish, []);
    if(!list.includes(productId)) list.unshift(productId);
    setJSON(LS.wish, list.slice(0, 200));
    renderWish();
  }

  function clearWish(){
    localStorage.removeItem(LS.wish);
    renderWish();
    syncCounts();
    toast("تم تفريغ المفضلة");
  }

  function renderWish(){
    const wrap = $("#wishItems");
    const ids = getJSON(LS.wish, []);
    if(ids.length === 0){
      wrap.innerHTML = `<div class="muted">لا يوجد عناصر في المفضلة</div>`;
      return;
    }
    wrap.innerHTML = "";
    ids.slice(0, 80).forEach(id => {
      const p = STORE.products.find(x => x.id === id);
      if(!p) return;
      const row = document.createElement("div");
      row.className = "drawer__link";
      row.innerHTML = `<strong>${esc(p.title)}</strong><div class="muted">${esc(p.desc)}</div>`;
      row.onclick = () => { closeDrawer("wish"); scrollToProduct(id); };
      wrap.appendChild(row);
    });
  }

  function scrollToProduct(productId){
    const el = $(`[data-like="${CSS.escape(productId)}"]`);
    if(el) el.scrollIntoView({behavior:"smooth", block:"center"});
  }

  function addToCart(productId, qty){
    const cart = getJSON(LS.cart, {});
    cart[productId] = (cart[productId] || 0) + qty;
    if(cart[productId] <= 0) delete cart[productId];
    setJSON(LS.cart, cart);
    renderCart();
  }

  function setQty(productId, qty){
    const cart = getJSON(LS.cart, {});
    if(qty <= 0) delete cart[productId];
    else cart[productId] = qty;
    setJSON(LS.cart, cart);
    renderCart();
  }

  function clearCart(){
    localStorage.removeItem(LS.cart);
    renderCart();
    syncCounts();
    toast("تم تفريغ السلة");
  }

  function renderCart(){
    const wrap = $("#cartItems");
    const cart = getJSON(LS.cart, {});
    const ids = Object.keys(cart);

    if(ids.length === 0){
      wrap.innerHTML = `<div class="muted">السلة فارغة</div>`;
      $("#cartTotal").textContent = "0";
      return;
    }

    let total = 0;
    wrap.innerHTML = "";

    ids.forEach(id => {
      const p = STORE.products.find(x => x.id === id);
      if(!p) return;
      const q = cart[id];
      total += (p.price || 0) * q;

      const row = document.createElement("div");
      row.className = "drawer__link";
      row.innerHTML = `
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
          <div>
            <strong>${esc(p.title)}</strong>
            <div class="muted">${formatPrice(p.price)} × ${q}</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <button class="actionBtn" data-qminus="${escAttr(id)}">-</button>
            <button class="actionBtn" data-qplus="${escAttr(id)}">+</button>
            <button class="actionBtn" data-remove="${escAttr(id)}">حذف</button>
          </div>
        </div>
      `;
      wrap.appendChild(row);
    });

    $("#cartTotal").textContent = String(total);

    wrap.onclick = (e) => {
      const minus = e.target.closest("[data-qminus]");
      const plus = e.target.closest("[data-qplus]");
      const remove = e.target.closest("[data-remove]");
      if(!minus && !plus && !remove) return;

      const cart = getJSON(LS.cart, {});
      if(minus){
        const id = minus.dataset.qminus;
        setQty(id, (cart[id]||1) - 1);
        syncCounts();
        return;
      }
      if(plus){
        const id = plus.dataset.qplus;
        setQty(id, (cart[id]||0) + 1);
        syncCounts();
        return;
      }
      if(remove){
        const id = remove.dataset.remove;
        setQty(id, 0);
        syncCounts();
      }
    };
  }

  function openComments(productId){
    const p = STORE.products.find(x => x.id === productId);
    if(!p) return;

    $("#commentTitle").textContent = `تعليقات: ${p.title}`;
    $("#commentSub").textContent = "بدون تقييم نجوم — فقط تعليق سريع";
    $("#commentModal").classList.add("is-open");
    $("#commentModal").setAttribute("aria-hidden","false");

    $("#commentName").value = "";
    $("#commentText").value = "";
    $("#commentForm").dataset.pid = productId;

    renderComments(productId);
  }

  function renderComments(productId){
    const list = $("#commentList");
    const items = getJSON(LS.comments(productId), []);

    if(items.length === 0){
      list.innerHTML = `<div class="comment"><div class="comment__top"><div class="comment__name">لا يوجد تعليقات</div><div class="comment__time">جاهز</div></div><div class="comment__text">كن أول من يضيف تعليقًا.</div></div>`;
      return;
    }

    list.innerHTML = items.slice(0, 60).map(c => `
      <div class="comment">
        <div class="comment__top">
          <div class="comment__name">${esc(c.name)}</div>
          <div class="comment__time">${esc(c.time)}</div>
        </div>
        <div class="comment__text">${esc(c.text)}</div>
      </div>
    `).join("");
  }

  function bindGlobalActions(){
    $("#commentForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const pid = e.currentTarget.dataset.pid;
      const name = $("#commentName").value.trim();
      const text = $("#commentText").value.trim();
      if(!pid || !name || !text) return;

      const items = getJSON(LS.comments(pid), []);
      items.unshift({ name, text, time: new Date().toLocaleString("ar-JO") });
      setJSON(LS.comments(pid), items.slice(0, 120));
      $("#commentName").value = "";
      $("#commentText").value = "";
      renderComments(pid);
      toast("تم حفظ التعليق");
    });

    $("#clearComments").addEventListener("click", () => {
      const pid = $("#commentForm").dataset.pid;
      if(!pid) return;
      localStorage.removeItem(LS.comments(pid));
      renderComments(pid);
      toast("تم مسح التعليقات");
    });

    $("#cartBtn").addEventListener("click", () => { renderCart(); openDrawer("cart"); });
    $("#wishBtn").addEventListener("click", () => { renderWish(); openDrawer("wish"); });

    $("#menuBtn").addEventListener("click", () => openDrawer("menu"));

    $("#clearCart").addEventListener("click", clearCart);
    $("#clearWish").addEventListener("click", clearWish);

    $("#checkoutBtn").addEventListener("click", () => {
      const cart = getJSON(LS.cart, {});
      const ids = Object.keys(cart);
      if(ids.length === 0){ toast("السلة فارغة"); return; }

      const lines = ids.map(id => {
        const p = STORE.products.find(x => x.id === id);
        const q = cart[id];
        return p ? `${p.title} × ${q}` : "";
      }).filter(Boolean);

      const msg = encodeURIComponent(`طلب جديد من ${STORE.brand}:\n` + lines.join("\n"));
      const whatsapp = STORE.checkoutWhatsApp ? STORE.checkoutWhatsApp : "";
      if(whatsapp){
        window.open(`https://wa.me/${whatsapp}?text=${msg}`, "_blank");
      }else{
        window.open(STORE.instagram, "_blank");
      }
    });

    document.addEventListener("click", (e) => {
      const close = e.target.closest("[data-close]");
      if(close){
        const key = close.dataset.close;
        if(key === "comment") closeComments();
        else closeDrawer(key);
      }
    });

    document.addEventListener("keydown", (e) => {
      if(e.key === "Escape"){
        closeComments();
        closeDrawer("cart");
        closeDrawer("wish");
        closeDrawer("collection");
        closeDrawer("menu");
      }
    });
  }

  function closeComments(){
    const m = $("#commentModal");
    if(!m.classList.contains("is-open")) return;
    m.classList.remove("is-open");
    m.setAttribute("aria-hidden","true");
  }

  function bindDrawers(){
    $("#cartDrawer").addEventListener("click", (e) => e.stopPropagation());
    $("#wishDrawer").addEventListener("click", (e) => e.stopPropagation());
    $("#collectionDrawer").addEventListener("click", (e) => e.stopPropagation());
    $("#menuDrawer").addEventListener("click", (e) => e.stopPropagation());
    renderCart();
    renderWish();
    syncCounts();
  }

  function openDrawer(key){
    const el = drawerEl(key);
    if(!el) return;
    el.classList.add("is-open");
    el.setAttribute("aria-hidden","false");
    if(key === "menu") $("#menuBtn").setAttribute("aria-expanded","true");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer(key){
    const el = drawerEl(key);
    if(!el) return;
    el.classList.remove("is-open");
    el.setAttribute("aria-hidden","true");
    if(key === "menu") $("#menuBtn").setAttribute("aria-expanded","false");
    if(!anyDrawerOpen() && !$("#commentModal").classList.contains("is-open")){
      document.body.style.overflow = "";
    }
  }

  function isDrawerOpen(key){
    const el = drawerEl(key);
    return el && el.classList.contains("is-open");
  }

  function anyDrawerOpen(){
    return ["menu","cart","wish","collection"].some(k => isDrawerOpen(k));
  }

  function drawerEl(key){
    if(key === "menu") return $("#menuDrawer");
    if(key === "cart") return $("#cartDrawer");
    if(key === "wish") return $("#wishDrawer");
    if(key === "collection") return $("#collectionDrawer");
    return null;
  }

  function syncCounts(){
    const wish = getJSON(LS.wish, []);
    $("#wishCount").textContent = String(wish.length);

    const cart = getJSON(LS.cart, {});
    const count = Object.values(cart).reduce((a,b)=>a+(b||0),0);
    $("#cartCount").textContent = String(count);
  }

  function isLiked(id){
    return localStorage.getItem(LS.like(id)) === "1";
  }

  function initSwipe(el, onNext, onPrev){
    if(!el) return;
    let x0 = null, t0 = 0;

    el.addEventListener("touchstart", (e) => {
      if(!e.touches || e.touches.length !== 1) return;
      x0 = e.touches[0].clientX;
      t0 = Date.now();
    }, {passive:true});

    el.addEventListener("touchend", (e) => {
      if(x0 === null) return;
      const x1 = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : x0;
      const dx = x1 - x0;
      const dt = Date.now() - t0;
      x0 = null;
      if(Math.abs(dx) < 38 || dt > 650) return;
      if(dx < 0) onNext(); else onPrev();
    }, {passive:true});
  }

  function toast(msg){
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("is-show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("is-show"), 1200);
  }

  function formatPrice(n){
    return `${Number(n||0)} JD`;
  }

  function debounce(fn, wait){
    let t=null;
    return (...args) => {
      clearTimeout(t);
      t=setTimeout(()=>fn(...args), wait);
    };
  }

  function esc(s){
    return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
  }

  function escAttr(s){
    return esc(s).replace(/`/g, "&#096;");
  }

  function getJSON(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      if(!raw) return fallback;
      return JSON.parse(raw);
    }catch{
      return fallback;
    }
  }

  function setJSON(key, val){
    localStorage.setItem(key, JSON.stringify(val));
  }
})();
