const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const docsRoot = path.resolve(__dirname, '..');

test('mobile comparison rows keep each viewpoint with its four method cells', () => {
  const script = fs.readFileSync(path.join(docsRoot, 'static/js/compare.js'), 'utf8');
  const css = fs.readFileSync(path.join(docsRoot, 'static/css/paper.css'), 'utf8');

  assert.match(script, /cellsHTML\.push\('<div class="cmp-view-row">'\)/);
  assert.match(script, /cellsHTML\.push\('<\/div>'\)/);
  assert.match(css, /\.cmp-view-row\s*\{\s*display:\s*contents;/);
  assert.match(
    css,
    /@media \(max-width:\s*720px\)[\s\S]*?\.cmp-view-row\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,/,
  );
  assert.match(
    css,
    /@media \(max-width:\s*720px\)[\s\S]*?\.cmp-row-label\s*\{[\s\S]*?grid-column:\s*1\s*\/\s*-1;/,
  );
});
