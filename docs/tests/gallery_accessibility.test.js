const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const scriptsRoot = path.resolve(__dirname, '../static/js');
const compare = fs.readFileSync(path.join(scriptsRoot, 'compare.js'), 'utf8');
const scenes = fs.readFileSync(path.join(scriptsRoot, 'scenes.js'), 'utf8');

test('comparison panels use native buttons and modal focus management', () => {
  assert.match(compare, /<button class="cmp-cell-img" type="button"/);
  assert.match(compare, /<button class="cmp-grid-cell[^>]*type="button"/);
  assert.match(compare, /role="dialog" aria-modal="true"/);
  assert.match(compare, /\.cmp-lb-close'\)\.focus\(\)/);
  assert.match(compare, /trigger && trigger\.isConnected/);
  assert.match(compare, /e\.key === 'Tab'/);
});

test('scene tabs and lightbox expose state and manage focus', () => {
  assert.match(scenes, /role="dialog" aria-modal="true"/);
  assert.match(scenes, /setAttribute\('aria-selected'/);
  assert.match(scenes, /\['ArrowLeft', 'ArrowRight', 'Home', 'End'\]/);
  assert.match(scenes, /\.scenes-lb-close'\)\.focus\(\)/);
  assert.match(scenes, /trigger && trigger\.isConnected/);
  assert.match(scenes, /e\.key === 'Tab'/);
});
