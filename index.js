const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(path.join(app.getPath('userData'), 'ControlDeDeudas.db'));
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT, income REAL)");
});

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    transparent: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  win.loadFile('index.html');

  // Handlers para los controles de la ventana personalizados
  ipcMain.on('minimize-window', () => win.minimize());
  ipcMain.on('maximize-window', () => {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });
  ipcMain.on('close-window', () => win.close());
}

// --- Handlers de la Base de Datos ---
ipcMain.handle('get-users', async () => new Promise((resolve, reject) => db.all("SELECT * FROM users", [], (err, rows) => err ? reject(err) : resolve(rows))));

ipcMain.handle('add-user', async (event, user) => new Promise((resolve, reject) => {
  db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    if (err) return reject(err);
    if (row.count >= 3) return reject(new Error('Límite de 3 usuarios alcanzado.'));
    db.run("INSERT INTO users (name, email, income) VALUES (?, ?, ?)", [user.name, user.email, user.income], function(err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, ...user });
    });
  });
}));

ipcMain.handle('delete-user', async (event, userId) => new Promise((resolve, reject) => {
    db.run("DELETE FROM users WHERE id = ?", [userId], function(err) {
        if (err) return reject(err);
        resolve({ success: true });
    });
}));

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  db.close();
  if (process.platform !== 'darwin') app.quit();
});
