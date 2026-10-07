// Captures REAL before/after screenshots from a running ZCode instance
// that was started via the "ZCode RTL" shortcut (Chromium debug port 9222).
//
//   node capture-real.mjs [port]
//
// Writes docs/shot-before.png and docs/shot-after.png.
// Both shots come from the same real window: the script only toggles the
// injected RTL stylesheet off/on, so the pair is pixel-identical otherwise.

import { writeFileSync } from 'node:fs';

const PORT = process.argv[2] || '9222';

const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const pages = targets.filter((t) => t.type === 'page' && !t.url.startsWith('devtools://'));
console.log('page targets:', pages.map((p) => p.title || p.url));
const page = pages[0];
if (!page) {
  console.error('No page target found. Is ZCode running via the RTL shortcut?');
  process.exit(1);
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
let nextId = 1;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});
await new Promise((res, rej) => {
  ws.addEventListener('open', res);
  ws.addEventListener('error', () => rej(new Error('WebSocket connect failed')));
});
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const id = nextId++;
    pending.set(id, (m) => (m.error ? rej(new Error(m.error.message)) : res(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });

const evalJson = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true });
  return r.result.value;
};

// Own toggle style (independent of the injector's), so the script is self-sufficient.
const STYLE_ID = 'zcode-rtl-demo-capture';
const CSS =
  ':is(p,li,h1,h2,h3,h4,h5,h6,blockquote,td,th,dd,dt,figcaption,summary),textarea,[contenteditable="true"],[class*="whitespace-pre-wrap"]:not(pre):not(code){unicode-bidi:plaintext;text-align:start;}';
const ensureStyle = await evalJson(
  `(() => {
    let s = document.getElementById(${JSON.stringify(STYLE_ID)});
    if (!s) {
      s = document.createElement('style');
      s.id = ${JSON.stringify(STYLE_ID)};
      s.textContent = ${JSON.stringify(CSS)};
      document.head.appendChild(s);
    }
    return true;
  })()`,
);
if (!ensureStyle) throw new Error('could not create toggle style');

const toggle = async (on) =>
  evalJson(
    `(() => {
      const ids = [${JSON.stringify(STYLE_ID)}, 'zcode-rtl-fix'];
      let ok = true;
      for (const id of ids) {
        const s = document.getElementById(id);
        if (s) s.disabled = !${on};
        else if (id === ${JSON.stringify(STYLE_ID)}) ok = false;
      }
      return ok;
    })()`,
  );

const { width, height } = await evalJson(
  '({ width: window.innerWidth, height: window.innerHeight })',
);

async function shot(file) {
  const r = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
    clip: { x: 0, y: 0, width, height, scale: 2 },
  });
  writeFileSync(file, Buffer.from(r.data, 'base64'));
  console.log('saved', file);
}

await toggle(false); // real "before": base LTR (the bug)
await new Promise((r) => setTimeout(r, 250));
await shot('docs/shot-before.png');

await toggle(true); // real "after": RTL fix applied
await new Promise((r) => setTimeout(r, 250));
await shot('docs/shot-after.png');

console.log('done — both screenshots saved.');
