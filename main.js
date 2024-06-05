const { app, BrowserWindow, ipcMain, Menu } = require('electron/main');
const path = require('node:path');
const { parse } = require('url');
const {WebSocket, WebSocketServer} = require('ws');
const {writeFile} = require('./websocket/client');
const {loadFiles} = require('./websocket/server');

const INTERVAL = 250;

let win;
let wsCli, wsSrv;
let isServerListening = false, sendDataInterval;
let msgs = [], wsSrvClients = [];
let lastMsgTimestamp;
let isSavingEnabled = false, isSendingEnabled = false;
let readObjects = [], objIndex = 0;

const handleGosumemoryToggle = () => {
    if(wsCli === undefined || wsCli.readyState !== WebSocket.OPEN) {
        wsCli = new WebSocket('ws://127.0.0.1:24050/ws');
    } else {
        isSavingEnabled = false;
        wsCli.terminate();
    }

    wsCli.on('open', () => sendToRenderer('cli', 0, 'Connected to Gosumemory'));
    wsCli.on('message', (message) => handleGosumemoryMessage(message));
    wsCli.on('close', () => sendToRenderer('cli', 2, 'Closed the connection'));
    wsCli.on('error', (error) => sendToRenderer('cli', 3, `Error: ${error.code}`));
}

const handleGosumemoryMessage = (message) => {
    const clearMsgs = () => msgs.length = 0;

    if(!isSavingEnabled) return;
    if (lastMsgTimestamp === undefined) {
        lastMsgTimestamp = new Date().getTime();
        return;
    }

    const currentTimestamp = new Date().getTime();
    if (currentTimestamp - lastMsgTimestamp >= INTERVAL) {
        lastMsgTimestamp = Math.floor(currentTimestamp / INTERVAL) * INTERVAL + (lastMsgTimestamp % INTERVAL);
        // console.log('last: %d\tcurr: %d\tdiff: %d\tlast%: %d\tcurr%: %d', lastMsgTimestamp, currentTimestamp, currentTimestamp - lastMsgTimestamp, lastMsgTimestamp % INTERVAL, currentTimestamp % INTERVAL);
        if (msgs.length < 4) { // 250ms per each message -> 4 msgs per 1 second
            msgs.push(JSON.parse(message.toString()));
            return;
        }
        writeFile(currentTimestamp, JSON.stringify(msgs), clearMsgs);
    }
}

const handleGosumemorySaving = () => {
    isSavingEnabled = !isSavingEnabled;
    return isSavingEnabled;
}

const handleThisAppServerToggle = () => {
    if (wsSrv === undefined || !isServerListening) {
        if (!readObjects.length) {
            try {
                loadFiles(fileLoadingCallback);
            } catch (err) {
                sendToRenderer('srv', 3, `Error: ${err.message}`);
                return;
            }
        }
        wsSrv = new WebSocketServer({port: 24050});
        isServerListening = true;
    } else {
        clearInterval(sendDataInterval);
        sendDataInterval = null;
        isSendingEnabled = false;

        wsSrvClients.forEach(client => {
            client.close();
        });
        wsSrv.close();

        isServerListening = false;
        sendToRenderer('srv', 2, 'Not running');
    }

    wsSrv.on('listening', () => sendToRenderer('srv', 1, 'Running'));

    wsSrv.on('connection', (ws, req) => {
        if(req.url !== '/ws') {
            ws.close();
            console.log('Client requested invalid path.');
        }
        console.log('New client');
        wsSrvClients.push(ws);

        ws.on('message', (message) => console.log('Message from client:', message.data));
        ws.on('close', () => console.log('Client disconnected'));
    })

    wsSrv.on('error', (error) => {
        sendToRenderer('srv', 3, `Error: ${error.code}`);
    });
}

const fileLoadingCallback = (current, all, array) => {
    readObjects.push(...array);
    sendToRenderer('srv', 0, `Reading files [${current}/${all}]`);
}

const handleThisAppSendMessages = () => {
    isSendingEnabled = !isSendingEnabled;

    if(sendDataInterval) {
        clearInterval(sendDataInterval);
        sendDataInterval = null;
    } else {
        sendToWsClients();
    }

    return isSendingEnabled;
}

function handleThisAppResetIndex() {
    objIndex = 0;
}

const sendToWsClients = () => {
    const delay = 330;
    sendDataInterval = setInterval(() => {
        wsSrvClients.forEach(client => {
            client.send(JSON.stringify(readObjects[objIndex]));
        });
        objIndex >= readObjects.length
            ? objIndex = 0
            : objIndex++;
        console.log(objIndex);
    }, delay)
}

const sendToRenderer = (type, status, body) => {
    const obj = {
        status,
        body
    }
    if(type === 'cli') {
        if (!win.isDestroyed()) win.webContents.send('gosumemory:message', obj);
    } else if (type === 'srv') {
        if (!win.isDestroyed()) win.webContents.send('thisapp:returnMessage', obj);
    } else console.error('sendToRenderer: unknown type');
}

const createWindow = () => {
    win = new BrowserWindow({
        width: 610,
        height: 300,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    Menu.setApplicationMenu(null);
    win.resizable = false;
    win.loadFile('index.html');

    // win.webContents.openDevTools();
}

app.whenReady().then(() => {
    ipcMain.on('gosumemory:client', handleGosumemoryToggle);
    ipcMain.handle('gosumemory:save', handleGosumemorySaving);

    ipcMain.on('thisapp:server', handleThisAppServerToggle);
    ipcMain.on('thisapp:resetIndex', handleThisAppResetIndex);
    ipcMain.handle('thisapp:send', handleThisAppSendMessages);

    createWindow();

    app.on('activate', () => {
        if(BrowserWindow.getAllWindows().length === 0) createWindow();
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
})