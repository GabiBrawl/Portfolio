// Each tool registers its metadata, markup, and mount function here.
window.portfolioTools = new Map();

window.readToolState = function () {
  return new URLSearchParams(window.location.hash.slice(1));
};

window.buildToolShareURL = function (id, state = {}) {
  const url = new URL(window.location.href);
  url.search = `?tools=${encodeURIComponent(id)}`;
  const params = new URLSearchParams();
  Object.entries(state).forEach(([key, value]) => params.set(key, String(value)));
  url.hash = params.toString();
  return url.href;
};

window.sharePortfolioTool = async function (id, tool, status, fallback, button) {
  const url = window.buildToolShareURL(id, tool.getShareState?.());
  fallback.hidden = true;
  status.textContent = '';
  status.hidden = true;
  const originalText = button?.textContent || '';
  const feedback = text => {
    if (!button?.isConnected) return;
    button.textContent = text;
    button.classList.add('copied');
    setTimeout(() => { if (button.isConnected) { button.textContent = originalText; button.classList.remove('copied'); } }, 2000);
  };
  if (navigator.share) {
    try {
      await navigator.share({ title: tool.title, url });
      feedback('Shared!');
      return;
    } catch (error) {
      if (error.name === 'AbortError') { status.hidden = true; return; }
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    feedback('Copied!');
  } catch {
    if (!status.isConnected) return;
    status.textContent = 'Copy this link to share your current settings.';
    fallback.hidden = false;
    const input = fallback.querySelector('textarea');
    input.value = url;
    input.focus();
    input.select();
  }
};

// Shared copy feedback, with selectable output when clipboard access is unavailable.
window.copyToolText = async function (text, status, fallback) {
  try {
    await navigator.clipboard.writeText(text);
    if (status.isConnected) status.textContent = 'Copied to clipboard.';
  } catch {
    if (!status.isConnected) return;
    status.textContent = 'Select the text below and copy it.';
    const details = fallback?.closest('details');
    if (details) details.open = true;
    fallback?.focus();
    fallback?.select();
  }
};
