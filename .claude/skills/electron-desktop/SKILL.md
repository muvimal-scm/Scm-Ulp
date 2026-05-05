---
name: electron-desktop
description: Electron 28 LTS desktop wrapper for ULP Angular SPA. Use when configuring Electron main/preload/renderer architecture, IPC handlers, native menus, auto-updater, USB scanner integration, native printing. Critical for warehouse and CHA users who need offline-capable desktop app. Covers security best practices (contextIsolation, sandbox, no nodeIntegration).
---

# Electron 28 Desktop for ULP

## When this skill triggers
Building, packaging, or modifying the Electron desktop wrapper. ULP ships as Win/macOS/Linux desktop app for warehouse and CHA users (offline-capable, native printing, USB scanner integration).

## Top 3 reference repos
1. **electron/electron** (https://github.com/electron/electron) - Official. Read `docs/api/` for IPC and security patterns.
2. **electron-userland/electron-builder** (https://github.com/electron-userland/electron-builder) - Production packaging for Win/Mac/Linux. Auto-updater built in.
3. **electron-react-boilerplate/electron-react-boilerplate** (https://github.com/electron-react-boilerplate/electron-react-boilerplate) - Production-grade structure. Patterns translate to Angular.

## Standard ULP electron structure

```
desktop/
  main/                          # Electron main process (Node.js)
    main.ts                      # App entry
    ipc-handlers.ts              # IPC channel registry
    auto-updater.ts              # GitHub releases auto-update
    menu.ts                      # Native menu
  preload/                       # Preload script (bridges main + renderer)
    preload.ts                   # contextBridge exposes safe APIs
  renderer/                      # The Angular SPA (built output)
  package.json
  electron-builder.yml
```

## Main process entry

```typescript
// desktop/main/main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1200, minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,    // CRITICAL - never disable
      nodeIntegration: false,    // CRITICAL - never enable in renderer
      sandbox: true,             // Extra security
      webSecurity: true
    },
    show: false
  });

  if (process.env.NODE_ENV === 'development') {
    await mainWindow.loadURL('http://localhost:4200');
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow?.show());
}

app.whenReady().then(async () => {
  await createWindow();
  registerIpcHandlers();
  autoUpdater.checkForUpdatesAndNotify();
});
```

## Preload script (the security boundary)

```typescript
// desktop/preload/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

// CRITICAL: Only expose specific safe APIs - never `ipcRenderer` directly
contextBridge.exposeInMainWorld('ulpDesktop', {
  print: (options) => ipcRenderer.invoke('print:document', options),
  
  onBarcodeScanned: (callback) => {
    ipcRenderer.on('scanner:barcode', (_, code) => callback(code));
    return () => ipcRenderer.removeAllListeners('scanner:barcode');
  },
  
  saveFile: (options) => ipcRenderer.invoke('file:save', options),
  appVersion: () => ipcRenderer.invoke('app:version'),
  checkForUpdates: () => ipcRenderer.invoke('updater:check')
});
```

## Renderer (Angular) usage

```typescript
@Injectable({ providedIn: 'root' })
export class DesktopBridgeService {
  readonly isDesktop = !!(window as any).ulpDesktop;
  
  async print(html: string): Promise<void> {
    if (!this.isDesktop) { window.print(); return; }
    await (window as any).ulpDesktop.print({ html });
  }
  
  onBarcodeScanned(callback: (code: string) => void): () => void {
    if (!this.isDesktop) return () => {};
    return (window as any).ulpDesktop.onBarcodeScanned(callback);
  }
}
```

## Auto-updater (electron-builder.yml)

```yaml
appId: com.immortalfuture.ulp
productName: ULP
publish:
  provider: github
  owner: immortalfuture
  repo: ulp-desktop
mac:
  target: [{ target: dmg, arch: [x64, arm64] }]
win:
  target: [{ target: nsis, arch: [x64] }]
linux:
  target: [{ target: AppImage }, { target: deb }]
```

## Gotchas specific to ULP

1. **NEVER set `contextIsolation: false` or `nodeIntegration: true`** in renderer - any XSS becomes RCE.
2. **`sandbox: true` mandatory** - extra layer of security.
3. **Auto-updater requires code signing** - free for Linux (AppImage), paid for Win (~$200/yr) and Mac ($99/yr Apple Developer).
4. **NEVER bundle credentials in app** - all secrets via API. Refresh tokens stored in OS keychain (`keytar`).
5. **CSP header** - lock down to known origins. No `unsafe-eval`.
6. **Avoid `remote` module** - removed in Electron 14+. Use IPC.
7. **Update notifications** - silent download, prompt on next quit. Don't force restart.
