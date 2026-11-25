# Portfolio tools

Tools live here, separate from project posts. `registry.js` provides the shared registry, and `tools.css` styles the shared forms and results using the portfolio design tokens.

Each tool gets a folder with its UI module and calculation logic. Register `{ title, description, render, mount, getShareState }` in `window.portfolioTools` under a stable URL name. `render()` returns markup; `mount(container)` attaches local interactions after rendering. Keep listeners within the rendered container so removing the view also removes its interactions. Module state can retain inputs during navigation without storing user content in the browser.

Use `tool-workspace` for an open, borderless tool layout and shared `tool-form`, `tool-button`, and `tool-control` classes for controls. The app supplies compact cards and top back navigation. `window.copyToolText(text, status, fallbackField)` handles clipboard feedback and reveals/selects fallback output when needed. Bind listeners to elements inside the workspace, rather than the persistent `dynamic-content` container, so returning to a tool does not accumulate listeners.

The app also supplies a Share tool button. `getShareState()` returns a small object of URL-safe input values; `readToolState()` reads them from the link fragment. Tool modules validate values before restoring them. Share uses the native browser sheet when available, clipboard otherwise, and selectable text as a final fallback. Generating or typing does not rewrite browser history. The URL retains `?tools=name`, with shared state in the fragment.

Load new modules after the registry and before `assets/js/app.js` in `index.html`, and add their assets to `MANAGED_URLS` in `sw.js` for offline caching. The app builds the tools list from the registry and renders `?tools=name` without a refresh.

Subnet calculator checks: `node --test tools/subnet/calculator.test.js`.

The color palette generator lives in `palette/` and opens at `?tools=palette`. It supports direct color edits, automatic locking, lock-aware generation, a bounded undo history, presets, previews, and hex/CSS/JSON exports. Its pure color functions are in `generator.js`, its UI is in `index.js`, and its swatch styles are in `palette.css`. Checks: `node --test tools/palette/generator.test.js`.

The text generator lives in `text/` and opens at `?tools=text`. The earlier `?tools=gothic` URL remains an alias. Eighteen styles appear as live, filterable previews with independent copy controls. Mathematical alphabet exceptions use Unicode's legacy Letterlike Symbols mappings. Checks: `node --test tools/text/generator.test.js`.

The QR scanner lives in `qr/` and opens at `?tools=qr`. It scans webcam frames or local image files in the browser. Its bundled jsQR decoder is distributed under Apache-2.0; see `qr/JSQR-LICENSE.txt`.

The QR generator lives in `qr-generator/` and opens at `?tools=qr-generator`. It creates downloadable PNG and SVG codes locally for text, Wi-Fi, email, phone, SMS, contacts, and locations with the bundled Project Nayuki QR Code generator (MIT).

The acoustic sweep generator lives in `sweep/` and opens at `?tools=sweep`. It generates continuous frequency sweeps (20 Hz–20 kHz) with customizable waveforms (sine, triangle, square, sawtooth), logarithmic (exponential) or linear progression curves, real-time FFT spectrum and oscilloscope monitoring, acoustic band classification, musical pitch estimation, volume gain with dBFS scaling, hearing safety notices, and uncompressed 16-bit PCM WAV audio export. Its pure synthesis, math, and validation functions are in `generator.js`, its UI and audio controller are in `index.js`, and its styling is in `sweep.css`. Checks: `node --test tools/sweep/generator.test.js`.

The TOTP generator lives in `totp/` and opens at `?tools=totp`. It generates RFC 6238-compatible 6- or 8-digit codes from Base32 secrets or standard `otpauth://` URIs, using the browser's Web Crypto API. Secrets remain in memory only and are never added to share links. Checks: `node --test tools/totp/generator.test.js`.

The world clock lives in `world-clock/` and opens at `?tools=world-clock`. It shows a large live clock, lets users add and select IANA time zones, and syncs against UTCtime with a device-clock fallback.

The subnet calculator accepts CIDR prefixes and contiguous dotted-decimal masks. Its host-count helper chooses a conventional subnet with reserved network and broadcast addresses; /31 and /32 remain available through direct input.

Static project pages are generated into `project-pages/{slug}/` from `posts/index.json` and `posts/post{id}.json` with `node scripts/generate-project-pages.mjs`. They include crawler-ready metadata and project content, and link back to the existing `?post={id}` app view. Keep `sitemap.xml` in sync when adding or removing projects.

Design references: [Coolors generator workflow](https://coolors-help.zendesk.com/hc/en-us/articles/360010581980-Generate-a-palette), [Calculator.net subnet inputs](https://www.calculator.net/ip-subnet-calculator.html), [Unicode character mappings](https://www.unicode.org/charts/PDF/U1D400.pdf), and [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share).
