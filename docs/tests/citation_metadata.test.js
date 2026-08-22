const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const readme = fs.readFileSync(path.resolve(__dirname, '../../README.md'), 'utf8');
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const authors = ['Boyuan Wang', 'Yue Zhang', 'Xutao Xue', 'Xueyu Song', 'Yu Sun'];

test('README and project page expose the same BibTeX entry', () => {
  const normalize = value => value.replace(/\r\n/g, '\n').trim();
  const readmeBibtex = normalize(readme.match(/```bibtex\s*([\s\S]*?)```/)[1]);
  const pageBibtex = normalize(html.match(/<pre id="bibtex-content">([\s\S]*?)<\/pre>/)[1]);

  assert.equal(readmeBibtex, pageBibtex);
});

test('project page exposes every paper author in visible and metadata surfaces', () => {
  const authorBlock = html.match(/<div class="publication-authors reveal">([\s\S]*?)<\/div>/)[1];
  const metaAuthors = html.match(/<meta name="author" content="([^"]+)">/)[1];

  for (const author of authors) {
    assert.match(authorBlock, new RegExp(`>${author}<`));
    assert.match(metaAuthors, new RegExp(author));
  }
});
