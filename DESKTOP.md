# Sweety Desktop (Electron)

Sweety can now run as a native desktop app with real JARVIS-style powers:
local shell execution, app launching, clipboard control, native notifications,
and system info — all without going through any tunnel.

## Run in dev (live reload)

```bash
# Terminal 1 — Vite dev server
npm run dev

# Terminal 2 — Electron pointed at the dev server
npm install --no-save --save-dev electron
SWEETY_DEV_URL=http://localhost:8080 npx electron electron/main.cjs
```

## Build a distributable app

```bash
bash scripts/build-desktop.sh            # auto-detects your OS
bash scripts/build-desktop.sh darwin     # build for macOS
bash scripts/build-desktop.sh win32      # build for Windows
bash scripts/build-desktop.sh linux      # build for Linux
```

Output goes to `./electron-release/Sweety-<platform>-x64/`.
Double-click `Sweety` (or `Sweety.exe` on Windows) to launch.

## Desktop-only powers exposed to the UI

When running in Electron, `window.sweetyDesktop` is available:

| Method | What it does |
|---|---|
| `exec(cmd)` | Run a shell command locally (15s timeout) |
| `openExternal(url)` | Open URL in default browser |
| `openApp(name)` | Launch native app (cross-platform) |
| `clipboardRead/Write` | Read & write OS clipboard |
| `notify(title, body)` | Native OS notification |
| `systemInfo()` | CPU, memory, hostname, uptime |
| `readFile(path)` / `pickFile()` | File access with user confirmation |

The header shows a small **Desktop** badge when these powers are active.
The existing `run command: <cmd>` flow automatically uses the local bridge
instead of the Cloudflare tunnel.

## Security notes

- `contextIsolation: true`, `nodeIntegration: false` — renderer cannot touch Node directly
- Only the explicit methods in `electron/preload.cjs` are exposed
- Shell commands have a 15s timeout and 1MB output cap
