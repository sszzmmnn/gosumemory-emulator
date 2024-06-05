const { contextBridge, ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector);
        if(element) element.innerText = text;
    }

    for (const dependency of ['chrome', 'node', 'electron']) {
        replaceText(`${dependency}-version`, process.versions[dependency]);
    }
})

contextBridge.exposeInMainWorld('electronAPI', {
    setTitle: (title) => ipcRenderer.send('set-title', title),
    ping: () => ipcRenderer.invoke('ping'),
    onUpdateButton: (callback) => ipcRenderer.on('update-button', (_event, value) => callback(value)),
    returnMessage: (msg) => ipcRenderer.send('return-message', msg)
});

contextBridge.exposeInMainWorld('gosumemory', {
    toggleClient: () => ipcRenderer.send('gosumemory:client'),
    toggleSaving: () => ipcRenderer.invoke('gosumemory:save'),
    onGosumemoryMessage: (callback) => ipcRenderer.on('gosumemory:message', (_event, message) => callback(message))
});

contextBridge.exposeInMainWorld('thisapp', {
    toggleServer: () => ipcRenderer.send('thisapp:server'),
    resetSentMessagesIndex: () => ipcRenderer.send('thisapp:resetIndex'),
    toggleSending: () => ipcRenderer.invoke('thisapp:send'),
    onThisAppReturnMessage: (callback) => ipcRenderer.on('thisapp:returnMessage', (_event, message) => callback(message))
})