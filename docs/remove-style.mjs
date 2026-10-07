// One-off: remove the currently injected style so the updated injector re-creates it.
const targets = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = targets.filter((t) => t.type === 'page' && !t.url.startsWith('devtools://'))[0];
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
ws.send(JSON.stringify({
  id: nextId++,
  method: 'Runtime.evaluate',
  params: { expression: "document.getElementById('zcode-rtl-fix')?.remove(); 'removed'" },
}));
await new Promise((r) => setTimeout(r, 300));
console.log('style removed');
ws.close();
process.exit(0);
