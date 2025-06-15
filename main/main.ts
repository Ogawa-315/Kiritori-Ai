// main/main.ts
import { app, BrowserWindow, globalShortcut, ipcMain, screen } from 'electron';
import path from 'path';
import fs from 'fs';
import screenshot from 'screenshot-desktop';
import sharp from 'sharp';

const isDev = process.env.NODE_ENV !== 'production';

let mainWindow: BrowserWindow | null = null;
let captureWindow: BrowserWindow | null = null;

// メインウィンドウがキャプチャ開始時に表示されていたかを記憶するフラグ
let wasMainWindowVisibleBeforeCapture = false;
let isMainWindowReady = false;


// メインウィンドウ　App.tsxでルートディレクトリにルーティング
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
    const url = isDev
      ? `http://localhost:5173`
      : `file://${path.join(__dirname, `../renderer/index.html`)}`;

    mainWindow.loadURL(url);
    mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createCaptureWindow() {
  if (captureWindow) return;

  const tempScreenshotPath = path.join(app.getPath('temp'), `screenshot-${Date.now()}.png`);

  screenshot({ filename: tempScreenshotPath }).then((imgPath) => {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;

    captureWindow = new BrowserWindow({
      width,
      height,
      x: 0,
      y: 0,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    const screenshotUrl = `file://${imgPath}`;
    const query = `?screenshotPath=${encodeURIComponent(screenshotUrl)}`;
    
    const url = isDev
      ? `http://localhost:5173/overlay${query}`
      : `file://${path.join(__dirname, `../renderer/index.html`)}/overlay/${query}`;

    captureWindow.loadURL(url);

    // --- 追加: ウィンドウ表示後にBase64データを送信 ---
//     captureWindow.webContents.once('did-finish-load', () => {
//       // 画像ファイルをBase64として読み込み
//       if (!captureWindow) return; // ウィンドウが既に閉じられていた場合

//   fs.readFile(imgPath, (err, data) => {
//     if (err) {
//       console.error('Failed to read screenshot:', err);
//       return;
//     }
//     const base64 = data.toString('base64');

//     if (isMainWindowReady && mainWindow && mainWindow.webContents) {
//       mainWindow.webContents.send('screenshot-base64', base64);
//     } else {
//       console.error("MainWindow is not ready to receive the screenshot.");
//       // ここでエラー通知や再試行ロジックを実装することも可能です
//     }
//   });
//     });

    // キャプチャウィンドウが閉じた時の処理
    captureWindow.on('closed', () => {
      captureWindow = null;
      fs.unlink(tempScreenshotPath, (err) => {
        if (err) console.error("Failed to delete temp screenshot:", err);
      });

      // キャプチャ開始前にメインウィンドウが表示されていた場合のみ再表示する
      if (wasMainWindowVisibleBeforeCapture && mainWindow) {
        mainWindow.show();
      }
    });

  }).catch(err => {
    console.error("Screenshot failed:", err);
    // エラーが発生した場合も、メインウィンドウを元に戻す
    if (wasMainWindowVisibleBeforeCapture && mainWindow) {
      mainWindow.show();
    }
  });
}

app.whenReady().then(() => {
  // --- ▼ 変更点 4: アプリ起動時にメインウィンドウを作成 ---
  createMainWindow();

  // ショートカットが押された時の処理
  globalShortcut.register('CommandOrControl+Shift+A', () => {
    // メインウィンドウが表示されているか確認し、状態を保存
    if (mainWindow && mainWindow.isVisible() && !mainWindow.isMinimized()) {
      wasMainWindowVisibleBeforeCapture = true;
      mainWindow.hide();
    } else {
      wasMainWindowVisibleBeforeCapture = false;
    }

    // ウィンドウが非表示になるのを待つための短いディレイ
    // これがないと、非表示になる途中のメインウィンドウが写り込む可能性がある
    setTimeout(() => {
      createCaptureWindow();
    }, 200); // 200ミリ秒待機
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

ipcMain.on('main-window-ready', () => {
  console.log('Main window is ready.');
  isMainWindowReady = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// captureWindow.close()が呼ばれると、上記で設定した 'closed' イベントが発火するため
ipcMain.on('capture-rect', (event, rect: { x: number, y: number, width: number, height: number }, screenshotPath: string) => {
  if (captureWindow) {
    captureWindow.close();
  }

  // スクリーンの画質によって画素が変わるため、修正
  const primaryDisplay = screen.getPrimaryDisplay();
  const scaleFactor = primaryDisplay.scaleFactor;
  const scaledRect = {
    left: Math.round(rect.x * scaleFactor),
    top: Math.round(rect.y * scaleFactor),
    width: Math.round(rect.width * scaleFactor),
    height: Math.round(rect.height * scaleFactor)
  };

  const filePath = decodeURIComponent(screenshotPath.replace('file://', ''));
  
  sharp(filePath)
    .extract({ ...scaledRect })
    .toBuffer() // ファイルではなくBufferとして画像を取得
    .then(buffer => {
      // BufferをBase64に変換
      const base64Image = buffer.toString('base64');
      
      // mainWindowにBase64エンコードされた画像を送信
      if (mainWindow) {
        mainWindow.webContents.send('screenshot-base64', base64Image);
        console.log('Cropped screenshot sent to main window.');
      }
    })
    .catch(err => console.error("Failed to process image:", err));
});

ipcMain.on('close-capture-window', () => {
  if (captureWindow) {
    captureWindow.close(); // これで 'closed' イベントがトリガーされる
  }
});