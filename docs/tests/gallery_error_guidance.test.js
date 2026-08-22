const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const scriptsRoot = path.resolve(__dirname, '../static/js');
const cases = [
  ['test_set.js', 'test_set/list.json', 'test_set/'],
  ['compare.js', 'compare/list.json', 'compare/'],
];

test('gallery failures reference deployed inputs instead of absent scripts', () => {
  for (const [file, listPath, assetRoot] of cases) {
    const source = fs.readFileSync(path.join(scriptsRoot, file), 'utf8');

    assert.doesNotMatch(source, /compress_[a-z_]+\.sh/);
    assert.doesNotMatch(source, /TableVerse\//);
    assert.match(source, new RegExp(listPath.replace('/', '\\/')));
    assert.match(source, new RegExp(`under <code>${assetRoot.replace('/', '\\/')}<\\/code>`));
  }
});
