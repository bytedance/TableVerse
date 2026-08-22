// Scene categories browser: 7 categories x ~30 thumbnails each.
// Loads images_compressed/list.json, then renders tabs + a responsive
// masonry grid + lightbox.
(function () {
  const root = document.getElementById('scenes-root');
  if (!root) return;

  const BASE = 'images_compressed';
  const T = `${BASE}/thumbs`;
  const F = `${BASE}/full`;

  let data = null;       // {categories: [{name, items:[uid,...]}, ...]}
  let curCat = 0;
  let curIdx = 0;        // index into the current category's items (lightbox)
  let curPage = 0;       // page within current category
  const PER_PAGE = 8;

  // ---------- bootstrap ----------
  fetch(`${BASE}/list.json?v=2026-06-30`, { cache: 'no-cache' })
    .then(r => r.json())
    .then(json => {
      data = json;
      build();
    })
    .catch(err => {
      root.innerHTML = `<div style="color:#c33;font-size:0.9rem;">Failed to load scene categories: ${err}</div>`;
    });

  function build() {
    root.innerHTML = `
      <div class="scenes-toolbar">
        <div class="scenes-tabs" role="tablist"></div>
        <div class="scenes-meta"></div>
      </div>
      <div class="scenes-grid" id="scenes-grid"></div>
      <div class="scenes-pager" id="scenes-pager" hidden>
        <button class="scenes-pg-btn scenes-pg-prev" aria-label="Previous page">&larr; Prev</button>
        <div class="scenes-pg-dots" role="tablist"></div>
        <button class="scenes-pg-btn scenes-pg-next" aria-label="Next page">Next &rarr;</button>
      </div>
      <div class="scenes-lightbox" id="scenes-lightbox" hidden role="dialog" aria-modal="true" aria-label="Scene preview">
        <button class="scenes-lb-close" type="button" aria-label="Close">&times;</button>
        <button class="scenes-lb-arrow scenes-lb-prev" type="button" aria-label="Previous">&larr;</button>
        <div class="scenes-lb-stage">
          <img class="scenes-lb-img" alt="" />
          <div class="scenes-lb-meta"></div>
        </div>
        <button class="scenes-lb-arrow scenes-lb-next" type="button" aria-label="Next">&rarr;</button>
      </div>
    `;

    const tabsEl = root.querySelector('.scenes-tabs');
    data.categories.forEach((cat, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'scenes-tab' + (i === 0 ? ' is-active' : '');
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      b.tabIndex = i === 0 ? 0 : -1;
      b.setAttribute('data-i', i);
      b.innerHTML = `<span>${cat.name}</span>`;
      b.addEventListener('click', () => setCategory(i));
      b.addEventListener('keydown', (e) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        const count = data.categories.length;
        const next = e.key === 'Home' ? 0
          : e.key === 'End' ? count - 1
          : (i + (e.key === 'ArrowRight' ? 1 : -1) + count) % count;
        setCategory(next);
        root.querySelectorAll('.scenes-tab')[next].focus();
        e.preventDefault();
      });
      tabsEl.appendChild(b);
    });

    setCategory(0);

    // pager handlers
    root.querySelector('.scenes-pg-prev').addEventListener('click', () => stepPage(-1));
    root.querySelector('.scenes-pg-next').addEventListener('click', () => stepPage(+1));

    // lightbox handlers
    const lb = root.querySelector('#scenes-lightbox');
    lb.querySelector('.scenes-lb-close').addEventListener('click', closeLB);
    lb.querySelector('.scenes-lb-prev').addEventListener('click', () => stepLB(-1));
    lb.querySelector('.scenes-lb-next').addEventListener('click', () => stepLB(+1));
    lb.addEventListener('click', (e) => {
      if (!e.target.closest('.scenes-lb-img, .scenes-lb-meta, .scenes-lb-arrow, .scenes-lb-close')) {
        closeLB();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (lb.hidden) return;
      if (e.key === 'Tab') {
        const focusable = [...lb.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')]
          .filter(el => !el.hidden);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (first && e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (last && !e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
        return;
      }
      if (e.key === 'Escape') closeLB();
      else if (e.key === 'ArrowLeft') stepLB(-1);
      else if (e.key === 'ArrowRight') stepLB(+1);
    });
  }

  function setCategory(i) {
    curCat = i;
    curPage = 0;
    const tabs = root.querySelectorAll('.scenes-tab');
    tabs.forEach((b, j) => {
      const active = j === i;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
      b.tabIndex = active ? 0 : -1;
    });
    renderGrid();
  }

  function totalPages() {
    return Math.max(1, Math.ceil(data.categories[curCat].items.length / PER_PAGE));
  }

  function stepPage(d) {
    const tp = totalPages();
    curPage = (curPage + d + tp) % tp;
    renderGrid();
  }

  function renderGrid() {
    const cat = data.categories[curCat];
    const tp = totalPages();
    const start = curPage * PER_PAGE;
    const slice = cat.items.slice(start, start + PER_PAGE);

    root.querySelector('.scenes-meta').textContent =
      `${cat.items.length} curated samples · page ${curPage + 1} / ${tp}`;

    const grid = root.querySelector('#scenes-grid');
    grid.innerHTML = '';
    slice.forEach((uid, j) => {
      const idx = start + j;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'scenes-cell';
      card.setAttribute('data-i', idx);
      card.setAttribute('aria-label', `${cat.name} sample ${idx + 1}`);
      card.innerHTML = `
        <img loading="lazy" decoding="async" alt=""
             src="${T}/${cat.name}/${uid}.jpg" />
      `;
      card.addEventListener('click', () => openLB(idx, card));
      grid.appendChild(card);
    });

    renderPager(tp);
  }

  function renderPager(tp) {
    const pager = root.querySelector('#scenes-pager');
    if (tp <= 1) {
      pager.hidden = true;
      return;
    }
    pager.hidden = false;
    const dots = root.querySelector('.scenes-pg-dots');
    dots.innerHTML = '';
    for (let i = 0; i < tp; i++) {
      const d = document.createElement('button');
      d.className = 'scenes-pg-dot' + (i === curPage ? ' is-active' : '');
      d.textContent = i + 1;
      d.setAttribute('aria-label', `Go to page ${i + 1}`);
      d.addEventListener('click', () => { curPage = i; renderGrid(); });
      dots.appendChild(d);
    }
  }

  let lbTrigger = null;

  function openLB(idx, trigger) {
    curIdx = idx;
    const lb = root.querySelector('#scenes-lightbox');
    lbTrigger = trigger || document.activeElement;
    lb.hidden = false;
    document.body.classList.add('lb-open');
    paintLB();
    lb.querySelector('.scenes-lb-close').focus();
  }
  function closeLB() {
    const lb = root.querySelector('#scenes-lightbox');
    if (lb.hidden) return;
    lb.hidden = true;
    document.body.classList.remove('lb-open');
    const trigger = lbTrigger;
    lbTrigger = null;
    if (trigger && trigger.isConnected) trigger.focus();
  }
  function stepLB(d) {
    const items = data.categories[curCat].items;
    curIdx = (curIdx + d + items.length) % items.length;
    paintLB();
  }
  function paintLB() {
    const cat = data.categories[curCat];
    const uid = cat.items[curIdx];
    const img = root.querySelector('.scenes-lb-img');
    img.src = `${F}/${cat.name}/${uid}.jpg`;
    root.querySelector('.scenes-lb-meta').textContent =
      `${cat.name} · ${curIdx + 1} / ${cat.items.length}`;
  }
})();
