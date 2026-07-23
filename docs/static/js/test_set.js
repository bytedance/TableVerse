// Test-set marquee (display only).
// Reads test_set/list.json, renders 3 horizontally-scrolling rows of
// thumbnails (looped twice for seamless wrap). Hover to pause; no click action.

(async function () {
  const root = document.getElementById('test-set-root');
  if (!root) return;

  // ---------- 1. Load list ----------
  let uids;
  try {
    const r = await fetch('test_set/list.json', { cache: 'no-store' });
    if (!r.ok) throw new Error('list.json HTTP ' + r.status);
    uids = await r.json();
  } catch (e) {
    root.innerHTML = `
      <p class="content has-text-centered" style="color:var(--ink-mute);">
        Run <code>bash compress_test_set.sh</code> first to populate
        <code>TableVerse/test_set/</code>.
      </p>`;
    return;
  }
  if (!Array.isArray(uids) || uids.length === 0) return;

  // ---------- 2. Split into N rows; build infinite marquees ----------
  const ROW_COUNT = 3;
  const rows = Array.from({ length: ROW_COUNT }, () => []);
  uids.forEach((u, i) => rows[i % ROW_COUNT].push(u));

  // px/sec speed; tune for taste. Larger row -> faster duration.
  const PX_PER_SEC = 60;
  const ITEM_WIDTH = 200 + 14; // width + gap

  rows.forEach((row, idx) => {
    const marquee = document.createElement('div');
    marquee.className = 'marquee';
    if (idx % 2 === 1) marquee.dataset.dir = 'right';

    const track = document.createElement('div');
    track.className = 'marquee-track';
    // Duplicate the list once: the keyframe translates -50% so the second
    // copy appears seamlessly when the first scrolls out.
    const cells = [...row, ...row];
    cells.forEach((uid) => {
      const cell = document.createElement('div');
      cell.className = 'marquee-item';
      const img = document.createElement('img');
      img.src = `test_set/thumbs/${uid}.jpg`;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      cell.appendChild(img);
      track.appendChild(cell);
    });

    // Duration: time to scroll the *first* copy off-screen.
    const totalPx = ITEM_WIDTH * row.length;
    const duration = Math.max(40, Math.round(totalPx / PX_PER_SEC));
    track.style.setProperty('--d', duration + 's');

    marquee.appendChild(track);
    root.appendChild(marquee);
  });
})();
