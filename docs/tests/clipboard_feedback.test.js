const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const source = html.match(/\/\/ ---------- BibTeX copy ----------([\s\S]*?)\/\/ ---------- Reading-progress bar ----------/)[1];

async function runCopy({ writeText, fallbackResult }) {
  const classes = new Set();
  const label = { innerText: 'Copy' };
  let click;
  const button = {
    addEventListener: (_type, handler) => { click = handler; },
    classList: {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
    },
    querySelector: () => label,
  };
  const textarea = { select() {}, value: '' };
  const context = {
    document: {
      body: { appendChild() {}, removeChild() {} },
      createElement: () => textarea,
      execCommand: () => fallbackResult,
      getElementById: id => id === 'bibtex-copy' ? button : { innerText: '@article{}' },
    },
    navigator: { clipboard: writeText ? { writeText } : null },
    setTimeout() {},
  };

  vm.runInNewContext(source, context);
  click();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  return { classes, label: label.innerText };
}

test('shows success after a confirmed Clipboard API write', async () => {
  const result = await runCopy({ writeText: () => Promise.resolve(), fallbackResult: false });
  assert.equal(result.label, 'Copied!');
  assert.equal(result.classes.has('is-done'), true);
  assert.equal(result.classes.has('is-error'), false);
});

test('uses the fallback after Clipboard API rejection', async () => {
  const result = await runCopy({ writeText: () => Promise.reject(new Error('denied')), fallbackResult: true });
  assert.equal(result.label, 'Copied!');
  assert.equal(result.classes.has('is-done'), true);
});

test('reports failure when neither copy mechanism succeeds', async () => {
  const result = await runCopy({ writeText: () => Promise.reject(new Error('denied')), fallbackResult: false });
  assert.equal(result.label, 'Copy failed');
  assert.equal(result.classes.has('is-error'), true);
  assert.equal(result.classes.has('is-done'), false);
});
