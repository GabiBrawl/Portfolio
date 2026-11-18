const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function setup(navigator = {}) {
  const window = { location: { href: 'https://example.com/portfolio/?post=1#old', hash: '#text=A%26B+%F0%9F%96%A4' } };
  vm.runInNewContext(fs.readFileSync(__dirname + '/registry.js', 'utf8'), { window, navigator, URL, URLSearchParams });
  const input = { focus() { this.focused = true; }, select() { this.selected = true; } };
  const fallback = { hidden: true, querySelector: () => input };
  const status = { isConnected: true };
  const tool = { title: 'Palette', getShareState: () => ({ colors: 'FFAB07-000000', locks: '10' }) };
  return { window, input, fallback, status, tool };
}

test('shared links keep the deployment path and round-trip reserved characters', () => {
  const { window } = setup();
  const url = new URL(window.buildToolShareURL('text', { text: 'A&B 🖤\n#name' }));
  assert.equal(url.pathname, '/portfolio/');
  assert.equal(url.search, '?tools=text');
  assert.equal(new URLSearchParams(url.hash.slice(1)).get('text'), 'A&B 🖤\n#name');
  assert.equal(window.readToolState().get('text'), 'A&B 🖤');
  assert.equal(window.location.href, 'https://example.com/portfolio/?post=1#old');
});

test('shares the current tool state through the native share sheet', async () => {
  let shared;
  const context = setup({ async share(data) { shared = data; } });
  await context.window.sharePortfolioTool('palette', context.tool, context.status, context.fallback);
  assert.equal(shared.title, 'Palette');
  const url = new URL(shared.url);
  assert.equal(url.search, '?tools=palette');
  assert.equal(new URLSearchParams(url.hash.slice(1)).get('locks'), '10');
  assert.equal(context.status.textContent, 'Shared.');
});

test('cancelling the share sheet does not copy a link unexpectedly', async () => {
  let copied = false;
  const context = setup({ async share() { throw Object.assign(new Error(), { name: 'AbortError' }); }, clipboard: { async writeText() { copied = true; } } });
  await context.window.sharePortfolioTool('palette', context.tool, context.status, context.fallback);
  assert.equal(copied, false);
  assert.equal(context.status.hidden, true);
});

test('copies a link when native sharing is unavailable', async () => {
  let copied;
  const context = setup({ clipboard: { async writeText(text) { copied = text; } } });
  await context.window.sharePortfolioTool('palette', context.tool, context.status, context.fallback);
  assert(copied.includes('?tools=palette#'));
  assert.equal(context.fallback.hidden, true);
});

test('reveals and selects the link when neither sharing nor clipboard works', async () => {
  const context = setup();
  await context.window.sharePortfolioTool('palette', context.tool, context.status, context.fallback);
  assert.equal(context.fallback.hidden, false);
  assert(context.input.value.includes('?tools=palette#'));
  assert(context.input.focused && context.input.selected);
});
