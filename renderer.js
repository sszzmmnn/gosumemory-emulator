const gmwsConnect = document.getElementById('gmws-connect');
const gmwsConnectBtn = document.getElementById('gmws-connect-btn');
const gmwsSaveBtn = document.getElementById('gmws-save-btn');

const tawsStart = document.getElementById('taws-start');
const tawsStartBtn = document.getElementById('taws-start-btn');
const tawsSendBtn = document.getElementById('taws-send-btn');
const tawsResetBtn = document.getElementById('taws-reset-index-btn');

gmwsConnectBtn.addEventListener('click', async () => {
    gmwsConnect.className = 'wait';
    gmwsConnectBtn.innerText = 'Updating client state...';
    gmwsConnectBtn.disabled = true;
    window.gosumemory.toggleClient();
    updateGmwsSaveBtn(false);
})

gmwsSaveBtn.addEventListener('click', async () => {
    const isSavingEnabled = await window.gosumemory.toggleSaving();
    updateGmwsSaveBtn(isSavingEnabled);
})

const updateGmwsSaveBtn = (state) => {
    gmwsSaveBtn.innerText = state ? 'Stop saving data' : 'Start saving data';
    gmwsSaveBtn.className = state ? 'on' : 'off';
}

tawsStartBtn.addEventListener('click', () => {
    tawsStartBtn.className = 'wait';
    tawsStartBtn.innerText = 'Updating server state...';
    tawsStartBtn.disabled = true;
    window.thisapp.toggleServer();
    updateTawsSendBtn(false);
})

tawsSendBtn.addEventListener('click', async () => {
    const isSendingEnabled = await window.thisapp.toggleSending();
    updateTawsSendBtn(isSendingEnabled);
})

tawsResetBtn.addEventListener('click', window.thisapp.resetSentMessagesIndex);

const updateTawsSendBtn = (state) => {
    tawsSendBtn.innerText = state ? 'Stop Sending data' : 'Start sending data';
    tawsSendBtn.className = state ? 'on' : 'off';
}

window.gosumemory.onGosumemoryMessage((message) => {
    switch(message.status) {
        case 0: // Running
            gmwsConnect.innerText = 'Connected';
            gmwsConnect.className = 'span-on';
            gmwsConnectBtn.className = 'on';
            gmwsConnectBtn.innerText = 'Close gosumemory connection';
            gmwsConnectBtn.disabled = false;
            gmwsSaveBtn.disabled = false;
            console.log(message.body);
            break;
        case 1: // Message
            console.log('websocket message');
            break;
        case 2: // Disconnect
            if (!gmwsConnect.innerText.startsWith('Error')) gmwsConnect.innerText = 'Disconnected';
            gmwsConnect.className = 'span-off';
            gmwsConnectBtn.className = 'off';
            gmwsConnectBtn.innerText = 'Connect to gosumemory';
            gmwsConnectBtn.disabled = false;
            gmwsSaveBtn.innerText = 'Collect gosumemory\'s data';
            gmwsSaveBtn.disabled = true;
            console.log('closed');
            break;
        case 3: // Error
            gmwsConnect.innerText = message.body;
            gmwsConnect.className = 'off';
            gmwsConnectBtn.innerText = 'Connect to gosumemory';
            console.error('WebSocket Client Error');
            break;
        default:
            console.log('unknown status');
    }
})

window.thisapp.onThisAppReturnMessage((message) => {
    switch (message.status) {
        case 0: // Reading files
            tawsStart.className = 'span-wait';
            tawsStartBtn.className = 'wait';
            tawsStart.innerText = message.body;
            break;
        case 1: // Running
            tawsStart.innerText = message.body;
            tawsStart.className = 'span-on';
            tawsStartBtn.className = 'on';
            tawsStartBtn.innerText = 'Close WebSocket Server';
            tawsStartBtn.disabled = false;
            tawsSendBtn.disabled = false;
            break;
        case 2: // Close
            if (!tawsStart.innerText.startsWith('Error')) tawsStart.innerText = message.body;
            tawsStart.className = 'span-off';
            tawsStartBtn.className = 'off';
            tawsStartBtn.innerText = 'Open WebSocket Server';
            tawsStartBtn.disabled = false;
            tawsSendBtn.innerText = 'Start sending data';
            tawsSendBtn.disabled = true;
            break;
        case 3: // Error
            tawsStart.innerText = message.body;
            tawsStartBtn.className = 'off';
            break;
        default:
            console.log('unknown status');
    }
})
