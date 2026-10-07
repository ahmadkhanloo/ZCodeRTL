// ZCode RTL — injects an RTL-friendly stylesheet into ZCode (Electron) via CDP.
// Each block (p, li, headings, ...) gets `unicode-bidi: plaintext`, so its
// direction follows its first strong character: Persian -> RTL, English -> LTR.
// Code blocks (pre/code) are excluded on purpose so they stay LTR.

import { createServer } from 'node:net';

const PORT = 9222;      // Chromium DevTools port ZCode is started with
const LOCK_PORT = 9223; // ensures only one injector instance runs
const POLL_MS = 2000;

const CSS = `
:is(p,li,h1,h2,h3,h4,h5,h6,blockquote,td,th,dd,dt,figcaption,summary),
textarea,
[contenteditable="true"],
[class*="whitespace-pre-wrap"]:not(pre):not(code) {
  unicode-bidi: plaintext;
  text-align: start;
}
`;

const INJECT_SOURCE = `(() => {
  const ID = 'zcode-rtl-fix';
  const CSS = ${JSON.stringify(CSS)};
  const add = () => {
    if (document.getElementById(ID)) return;
    const s = document.createElement('style');
    s.id = ID;
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  };
  if (document.head) add();
  else document.addEventListener('DOMContentLoaded', add, { once: true });
})();`;

// exit early if another injector instance is already running
const lock = createServer();
lock.once('error', () => {
  console.log('[zcode-rtl] injector already running, exiting.');
  process.exit(0);
});
lock.listen(LOCK_PORT, '127.0.0.1', () => lock.close());

const injected = new Set();

async function listPages() {
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
    if (!res.ok) return [];
    const targets = await res.json();
    return targets.filter(
      (t) => t.type === 'page' && t.webSocketDebuggerUrl && !t.url.startsWith('devtools://'),
    );
  } catch {
    return []; // app not started (yet) via the RTL shortcut
  }
}

function attach(target) {
  return new Promise((resolve) => {
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    let nextId = 1;
    const pending = new Map();
    const send = (method, params = {}) =>
      new Promise((res) => {
        const id = nextId++;
        pending.set(id, res);
        ws.send(JSON.stringify({ id, method, params }));
      });

    ws.addEventListener('open', async () => {
      try {
        await send('Page.enable');
        await send('Runtime.evaluate', { expression: INJECT_SOURCE });
        // survives page reloads for as long as this connection lives
        await send('Page.addScriptToEvaluateOnNewDocument', { source: INJECT_SOURCE });
        injected.add(target.id);
        console.log(`[zcode-rtl] injected: ${target.title || target.url}`);
        resolve();
      } catch (e) {
        console.log(`[zcode-rtl] inject failed on "${target.title}": ${e.message}`);
        resolve();
      }
    });
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg.result ?? msg.error);
        pending.delete(msg.id);
      }
    });
    ws.addEventListener('close', () => injected.delete(target.id));
    ws.addEventListener('error', () => resolve());
  });
}

console.log(`[zcode-rtl] waiting for ZCode on port ${PORT}...`);
setInterval(async () => {
  for (const t of await listPages()) {
    if (!injected.has(t.id)) await attach(t);
  }
}, POLL_MS);
