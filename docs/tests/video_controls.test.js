const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

test('every autoplaying demo exposes native pause controls', () => {
  const videos = [...html.matchAll(/<video\b([^>]*)>/g)].map(match => match[1]);

  assert.equal(videos.length, 16);
  for (const attributes of videos) {
    assert.match(attributes, /\bautoplay\b/);
    assert.match(attributes, /\bcontrols\b/);
  }
});
