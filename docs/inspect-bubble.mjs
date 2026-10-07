// One-off diagnostic: find the exact element rendering the user's message text.
const targets = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = targets.filter((t) => t.type === 'page' && !t.url.startsWith('devtools://'))[0];
if (!page) { console.error('no page target'); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
let nextId = 1;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
await new Promise((res, rej) => {
  ws.addEventListener('open', res);
  ws.addEventListener('error', () => rej(new Error('ws failed')));
});
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const id = nextId++;
    pending.set(id, (m) => (m.error ? rej(new Error(m.error.message)) : res(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });

const r = await send('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const out = [];
    // 1) every text node that contains the needle
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let tn;
    const hits = new Set();
    while ((tn = walker.nextNode())) {
      if ((tn.nodeValue || '').includes('واقعی نیست')) {
        let el = tn.parentElement;
        // climb to the closest element whose own text is short (the real bubble/paragraph)
        while (el && el.textContent.length > 200) el = el.parentElement;
        if (el && !hits.has(el)) hits.add(el);
      }
    }
    for (const el of hits) {
      const cs = getComputedStyle(el);
      out.push({
        tag: el.tagName, cls: (el.className || '').toString().slice(0, 90),
        contentEditable: el.isContentEditable,
        dir: cs.direction, bidi: cs.unicodeBidi, align: cs.textAlign, ws: cs.whiteSpace,
        text: (el.innerText || el.textContent || '').slice(0, 80).replace(/\\n/g, ' | ')
      });
    }
    // 2) composer: any contenteditable
    const ce = [...document.querySelectorAll('[contenteditable="true"], [contenteditable=""]')].slice(0, 3);
    const composer = ce.map((el) => {
      const cs = getComputedStyle(el);
      return { cls: (el.className || '').toString().slice(0, 90), dir: cs.direction, bidi: cs.unicodeBidi, align: cs.textAlign };
    });
    return { bubbles: out, composer };
  })()`,
});
console.log(JSON.stringify(r.result.value, null, 2));
ws.close();
