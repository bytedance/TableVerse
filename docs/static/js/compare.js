// Qualitative comparison: 100 scenes x 4 methods x 3 viewpoints.
// Main stage: 4 columns (methods) x 3 rows (viewpoints), all shown at once.
// Click any cell to open a fullscreen lightbox (left/right switch method,
// up/down switch viewpoint, Esc closes).
// The bottom filmstrip switches scene; R randomizes; Compact mode collapses
// to a 4-column front-viewpoint overview.

(async function () {
  const root = document.getElementById('compare-root');
  if (!root) return;

  let uids;
  try {
    const r = await fetch('compare/list.json', { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    uids = await r.json();
  } catch (e) {
    root.innerHTML = `
      <p class="content has-text-centered" style="color:var(--ink-mute);">
        Run <code>bash compress_compare.sh</code> first to populate
        <code>TableVerse/compare/</code>.
      </p>`;
    return;
  }
  if (!Array.isArray(uids) || uids.length === 0) return;

  // Columns: methods. Ours is highlighted.
  const COLS = [
    { key: 'midi',       label: 'MIDI' },
    { key: 'sam3d',      label: 'SAM3D' },
    { key: 'scenemaker', label: 'SceneMaker' },
    { key: 'ours',       label: 'Ours',  highlight: true },
  ];
  // Rows: viewpoints.
  const VIEWS = [
    { key: 'front',          label: 'Front' },
    { key: 'top',            label: 'Top' },
    { key: 'front_straight', label: 'Straight' },
  ];
  const fullURL  = (uid, col, view) => `compare/full/${uid}_${col}_${view}.jpg`;
  const thumbURL = (uid) => `compare/thumbs/${uid}.jpg`;

  // ---------- Skeleton ----------
  const cellsHTML = [];
  // First row: empty top-left corner + 4 column labels.
  cellsHTML.push('<div class="cmp-corner"></div>');
  COLS.forEach(c => {
    cellsHTML.push(`<div class="cmp-col-label${c.highlight ? ' is-ours' : ''}">${c.label}</div>`);
  });
  // Following 3 rows: row label + 4 images.
  VIEWS.forEach(v => {
    cellsHTML.push(`<div class="cmp-row-label">${v.label}</div>`);
    COLS.forEach(c => {
      cellsHTML.push(`
        <figure class="cmp-cell${c.highlight ? ' is-ours' : ''}" data-col="${c.key}" data-view="${v.key}">
          <button class="cmp-cell-img" type="button" data-zoom aria-label="Enlarge ${c.label}, ${v.label} view">
            <img alt="${c.label} · ${v.label}" loading="lazy" decoding="async">
          </button>
        </figure>`);
    });
  });

  root.innerHTML = `
    <div class="cmp-toolbar">
      <div class="cmp-counter"><span id="cmp-idx">1</span><span class="cmp-counter-sep">/</span><span id="cmp-total">${uids.length}</span></div>
      <div class="cmp-legend">
        <span class="cmp-legend-item"><span class="cmp-legend-dot"></span>4 methods</span>
        <span class="cmp-legend-sep">·</span>
        <span class="cmp-legend-item"><span class="cmp-legend-dot is-ours"></span>3 viewpoints</span>
      </div>
      <div class="cmp-actions">
        <button class="cmp-btn" id="cmp-prev" type="button" aria-label="Previous scene"><i class="fas fa-chevron-left"></i></button>
        <button class="cmp-btn" id="cmp-shuffle" type="button" title="Random scene (R)"><i class="fas fa-shuffle"></i><span>Shuffle</span></button>
        <button class="cmp-btn" id="cmp-compact" type="button" title="Toggle Compact / Grid view"><i class="fas fa-table-cells"></i><span>Compact</span></button>
        <button class="cmp-btn" id="cmp-next" type="button" aria-label="Next scene"><i class="fas fa-chevron-right"></i></button>
      </div>
    </div>

    <div class="cmp-stage" id="cmp-stage">
      ${cellsHTML.join('')}
    </div>

    <div class="cmp-strip-wrap">
      <button class="cmp-strip-arrow is-left"  type="button" aria-label="Strip left"><i class="fas fa-chevron-left"></i></button>
      <div class="cmp-strip" id="cmp-strip" tabindex="0" aria-label="Scene filmstrip"></div>
      <button class="cmp-strip-arrow is-right" type="button" aria-label="Strip right"><i class="fas fa-chevron-right"></i></button>
    </div>

    <!-- Compact overview: one scene per row, 4 columns of the front view -->
    <div class="cmp-grid" id="cmp-grid" hidden></div>

    <!-- Lightbox -->
    <div class="cmp-lightbox" id="cmp-lightbox" hidden role="dialog" aria-modal="true" aria-label="Comparison lightbox">
      <button class="cmp-lb-close"  type="button" aria-label="Close (Esc)"><i class="fas fa-xmark"></i></button>
      <button class="cmp-lb-arrow is-left"  type="button" aria-label="Previous method"><i class="fas fa-chevron-left"></i></button>
      <button class="cmp-lb-arrow is-right" type="button" aria-label="Next method"><i class="fas fa-chevron-right"></i></button>
      <div class="cmp-lb-stage">
        <img class="cmp-lb-img" alt="">
        <div class="cmp-lb-meta">
          <div class="cmp-lb-method"></div>
          <div class="cmp-lb-info"></div>
        </div>
      </div>
      <div class="cmp-lb-hint">← → method · ↑ ↓ view · Esc close</div>
    </div>
  `;

  // ---------- Filmstrip ----------
  const strip = root.querySelector('#cmp-strip');
  uids.forEach((uid, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cmp-strip-item';
    b.dataset.idx = i;
    b.title = uid;
    b.innerHTML = `
      <img src="${thumbURL(uid)}" alt="" loading="lazy" decoding="async">
      <span class="cmp-strip-num">${i + 1}</span>
    `;
    strip.appendChild(b);
  });

  // ---------- State ----------
  const state = { idx: 0, firstRender: true };

  const stage = root.querySelector('#cmp-stage');
  const cells = Array.from(stage.querySelectorAll('.cmp-cell'));
  const idxEl = root.querySelector('#cmp-idx');

  function render() {
    const uid = uids[state.idx];
    cells.forEach((cell) => {
      const col  = cell.dataset.col;
      const view = cell.dataset.view;
      const img  = cell.querySelector('img');
      const url  = fullURL(uid, col, view);
      if (img.dataset.url !== url) {
        img.dataset.url = url;
        img.src = url;
      }
    });
    idxEl.textContent = (state.idx + 1).toString();
    Array.from(strip.children).forEach((b, i) => {
      b.classList.toggle('is-active', i === state.idx);
    });
    const active = strip.children[state.idx];
    if (active) {
      // Scroll only the strip itself (horizontally); scrollIntoView would
      // also jump the page vertically to Results.
      const target = active.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2;
      const max = strip.scrollWidth - strip.clientWidth;
      const clamped = Math.max(0, Math.min(max, target));
      strip.scrollTo({ left: clamped, behavior: state.firstRender ? 'auto' : 'smooth' });
    }
    state.firstRender = false;
    if (!grid.hidden) paintGrid();
  }

  function setIdx(i) {
    state.idx = ((i % uids.length) + uids.length) % uids.length;
    render();
  }

  // ---------- Toolbar and filmstrip interaction ----------
  strip.addEventListener('click', (e) => {
    const item = e.target.closest('.cmp-strip-item');
    if (!item) return;
    setIdx(parseInt(item.dataset.idx, 10));
  });
  root.querySelector('#cmp-prev').addEventListener('click', () => setIdx(state.idx - 1));
  root.querySelector('#cmp-next').addEventListener('click', () => setIdx(state.idx + 1));
  root.querySelector('#cmp-shuffle').addEventListener('click', () => {
    let n; do { n = Math.floor(Math.random() * uids.length); } while (n === state.idx && uids.length > 1);
    setIdx(n);
  });
  root.querySelector('.cmp-strip-arrow.is-left' ).addEventListener('click', () => strip.scrollBy({ left: -strip.clientWidth * 0.8, behavior: 'smooth' }));
  root.querySelector('.cmp-strip-arrow.is-right').addEventListener('click', () => strip.scrollBy({ left:  strip.clientWidth * 0.8, behavior: 'smooth' }));
  strip.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      strip.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, { passive: false });

  // ---------- Cell hover local zoom + click to open lightbox ----------
  cells.forEach((cell) => {
    const wrap = cell.querySelector('.cmp-cell-img');
    const img  = wrap.querySelector('img');
    let active = false;
    wrap.addEventListener('mouseenter', () => { active = true; wrap.classList.add('is-zoom'); });
    wrap.addEventListener('mouseleave', () => {
      active = false;
      wrap.classList.remove('is-zoom');
      img.style.transformOrigin = '';
    });
    wrap.addEventListener('mousemove', (e) => {
      if (!active) return;
      const r = wrap.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width)  * 100;
      const y = ((e.clientY - r.top)  / r.height) * 100;
      img.style.transformOrigin = `${x}% ${y}%`;
    });
    wrap.addEventListener('click', () => openLightbox(cell.dataset.col, cell.dataset.view, wrap));
  });

  // ---------- Lightbox ----------
  const lb       = root.querySelector('#cmp-lightbox');
  const lbImg    = lb.querySelector('.cmp-lb-img');
  const lbMethod = lb.querySelector('.cmp-lb-method');
  const lbInfo   = lb.querySelector('.cmp-lb-info');
  let lbCol  = 'ours';
  let lbView = 'front';
  let lbTrigger = null;

  function paintLB() {
    const uid = uids[state.idx];
    const c   = COLS.find(c => c.key === lbCol)  || COLS[0];
    const v   = VIEWS.find(v => v.key === lbView) || VIEWS[0];
    lbImg.src = fullURL(uid, lbCol, lbView);
    lbMethod.textContent = c.label;
    lbInfo.textContent = `Scene ${state.idx + 1}/${uids.length} · ${v.label} view · ${uid}`;
  }
  function openLightbox(col, view, trigger) {
    lbCol  = col;
    lbView = view || lbView;
    lbTrigger = trigger || document.activeElement;
    lb.hidden = false;
    document.body.classList.add('cmp-lb-open');
    paintLB();
    lb.querySelector('.cmp-lb-close').focus();
  }
  function closeLightbox() {
    if (lb.hidden) return;
    lb.hidden = true;
    document.body.classList.remove('cmp-lb-open');
    const trigger = lbTrigger;
    lbTrigger = null;
    if (trigger && trigger.isConnected) trigger.focus();
  }
  function lbStepMethod(d) {
    const i = COLS.findIndex(c => c.key === lbCol);
    lbCol = COLS[((i + d) % COLS.length + COLS.length) % COLS.length].key;
    paintLB();
  }
  function lbStepView(d) {
    const i = VIEWS.findIndex(v => v.key === lbView);
    lbView = VIEWS[((i + d) % VIEWS.length + VIEWS.length) % VIEWS.length].key;
    paintLB();
  }
  lb.querySelector('.cmp-lb-close').addEventListener('click', closeLightbox);
  lb.querySelector('.cmp-lb-arrow.is-left' ).addEventListener('click', () => lbStepMethod(-1));
  lb.querySelector('.cmp-lb-arrow.is-right').addEventListener('click', () => lbStepMethod( 1));
  lb.addEventListener('click', (e) => {
    if (e.target.closest('.cmp-lb-img, .cmp-lb-meta, .cmp-lb-arrow, .cmp-lb-close')) return;
    closeLightbox();
  });

  // ---------- Compact overview: fixed front viewpoint ----------
  const grid       = root.querySelector('#cmp-grid');
  const compactBtn = root.querySelector('#cmp-compact');
  const COMPACT_VIEW = 'front';
  let gridBuilt = false;
  function buildGrid() {
    if (gridBuilt) return;
    gridBuilt = true;
    const html = [];
    html.push(`
      <div class="cmp-grid-head">
        <div class="cmp-grid-cell is-h">#</div>
        ${COLS.map(c => `<div class="cmp-grid-cell is-h${c.highlight ? ' is-ours' : ''}">${c.label}</div>`).join('')}
      </div>`);
    uids.forEach((_uid, i) => {
      html.push(`
        <div class="cmp-grid-row" data-idx="${i}">
          <div class="cmp-grid-cell is-num">${i + 1}</div>
          ${COLS.map(c => `
            <button class="cmp-grid-cell${c.highlight ? ' is-ours' : ''}" type="button" data-col="${c.key}" aria-label="Enlarge ${c.label}, front view">
              <img loading="lazy" decoding="async" alt="">
            </button>`).join('')}
        </div>`);
    });
    grid.innerHTML = html.join('');
  }
  function paintGrid() {
    grid.querySelectorAll('.cmp-grid-row').forEach((row) => {
      const i = parseInt(row.dataset.idx, 10);
      const uid = uids[i];
      row.querySelectorAll('.cmp-grid-cell[data-col]').forEach((cell) => {
        const col = cell.dataset.col;
        const img = cell.querySelector('img');
        const url = fullURL(uid, col, COMPACT_VIEW);
        if (img.dataset.url !== url) {
          img.dataset.url = url;
          img.src = url;
        }
      });
    });
  }
  function setCompact(on) {
    if (on) {
      buildGrid();
      paintGrid();
      grid.hidden = false;
      stage.hidden = true;
      compactBtn.classList.add('is-active');
    } else {
      grid.hidden = true;
      stage.hidden = false;
      compactBtn.classList.remove('is-active');
    }
  }
  compactBtn.addEventListener('click', () => setCompact(grid.hidden));
  grid.addEventListener('click', (e) => {
    const cell = e.target.closest('.cmp-grid-cell[data-col]');
    if (!cell) return;
    const row = cell.closest('.cmp-grid-row');
    setIdx(parseInt(row.dataset.idx, 10));
    openLightbox(cell.dataset.col, COMPACT_VIEW, cell);
  });

  // ---------- Keyboard ----------
  document.addEventListener('keydown', (e) => {
    const lbOpen = !lb.hidden;
    if (lbOpen && e.key === 'Tab') {
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
    if (!lbOpen) {
      const rect = root.getBoundingClientRect();
      const inView = rect.top < window.innerHeight * 0.9 && rect.bottom > window.innerHeight * 0.1;
      if (!inView) return;
      if (/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
    }
    switch (e.key) {
      case 'ArrowLeft':
        if (lbOpen) lbStepMethod(-1); else setIdx(state.idx - 1);
        e.preventDefault(); break;
      case 'ArrowRight':
        if (lbOpen) lbStepMethod( 1); else setIdx(state.idx + 1);
        e.preventDefault(); break;
      case 'ArrowUp':
        if (lbOpen) { lbStepView(-1); e.preventDefault(); }
        break;
      case 'ArrowDown':
        if (lbOpen) { lbStepView( 1); e.preventDefault(); }
        break;
      case 'r': case 'R':
        if (!lbOpen) root.querySelector('#cmp-shuffle').click();
        break;
      case 'Escape':
        if (lbOpen) closeLightbox();
        break;
    }
  });

  setIdx(0);
})();
