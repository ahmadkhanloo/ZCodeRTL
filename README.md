# ZCode RTL 🇮🇷

<!--
GitHub About / description (copy into the repo "About" field):
Make ZCode chat render Persian/Arabic RTL — per-paragraph auto-direction, code stays LTR. No app patching, survives updates, one-command install.
-->

Make [ZCode](https://z.ai) — Z.ai's AI coding IDE — render Persian (and any RTL language) correctly in its chat.

AI tools assume English. ZCode renders every message left-to-right, so Persian answers look scrambled: punctuation lands on the wrong side and English words jump around mid-sentence. **ZCode RTL fixes that with one CSS rule, injected at runtime — the app itself is never modified.**

نسخهٔ فارسی: [README.fa.md](README.fa.md)

## ✨ What you get

- **Auto RTL per paragraph** — each block follows its first strong character: Persian → RTL, English → LTR, even inside a single message
- **Mixed text handled** — Persian paragraphs containing English words, numbers and file paths stay readable
- **Code blocks stay LTR** — `pre`/`code` are deliberately excluded
- **Composer too** — the input box auto-switches direction while you type
- **Self-healing** — re-injects into reloaded pages and new windows automatically
- **Invisible** — runs hidden in the background: no console window, no taskbar entry
- **Lightweight & single-instance** — one local HTTP request every 2 s, a few MB of RAM; duplicates exit automatically

## 🆚 Why not just patch the app?

| Approach | The problem |
|---|---|
| Patching `app.asar` | Breaks on **every app update**, needs **admin rights**, can corrupt the install |
| Injecting CSS by hand in DevTools | Gone after **every reload or restart** |
| Copy-pasting answers elsewhere to read them | Leaves your workflow every time |
| Waiting for official RTL support | 🙂 |

ZCode RTL **touches nothing inside the app**: it uses the app's own Chromium DevTools port to inject one stylesheet at runtime. App updates don't affect it, no admin rights are needed, and uninstalling is one command.

## 🚀 Install (pick one)

**One command** — PowerShell:

```powershell
irm https://raw.githubusercontent.com/ahmadkhanloo/ZCodeRTL/main/install.ps1 | iex
```

**or** clone and install:

```powershell
git clone https://github.com/ahmadkhanloo/ZCodeRTL.git
cd ZCodeRTL
powershell -ExecutionPolicy Bypass -File install.ps1
```

**or** grab the zip from [Releases](../../releases), extract, and run `install.ps1`.

Requirements: **Windows**, [ZCode](https://z.ai) installed, **Node.js ≥ 21** (uses its built-in WebSocket).

## ▶️ Use

Fully quit ZCode (also from the system tray), then start it with the new **ZCode RTL** desktop shortcut. That's it — Persian messages now render RTL.

> The debug port only exists when ZCode is started through the shortcut, so use the shortcut instead of the normal icon.

## 🧰 Troubleshooting

- **Still LTR?** ZCode was started from the normal icon. Close it completely and start via **ZCode RTL**.
- **Worked before, stopped after an update?** The updater relaunched ZCode without the port. Same fix: close fully → start via the shortcut.
- **Is it running?** Task Manager → look for `node.exe` (the hidden injector).
- **Uninstall:** `powershell -ExecutionPolicy Bypass -File install.ps1 -Uninstall` — removes the shortcut and any downloaded copy.

## 🔒 Security note

While ZCode runs via the shortcut it exposes a DevTools port (`127.0.0.1:9222`) that **any local process** can reach. It is localhost-only, but keep it in mind on shared machines.

## ⚙️ How it works

`ZCode-RTL.cmd` starts ZCode with `--remote-debugging-port=9222` and launches a ~100-line Node script (`injector.mjs`) that connects to the Chromium DevTools Protocol and injects one CSS rule into every window:

```css
:is(p, li, h1, h2, h3, blockquote, td, textarea, ...) {
  unicode-bidi: plaintext; /* direction = first strong character */
  text-align: start;
}
```

`plaintext` lets every paragraph pick its own direction, so one message can contain a Persian paragraph and an English one — each rendered correctly. Code blocks are excluded and stay LTR.

## License

[MIT](LICENSE)
