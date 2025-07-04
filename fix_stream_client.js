const net = require('net');

// ข้อมูลเชื่อมต่อ FIX QUOTE session (Port 5201)
const config = {
  host: 'live-us-eqx-01.p.c-trader.com',
  port: 5201,
  senderCompID: 'live.pepperstone.1030165',
  targetCompID: 'cServer',
  targetSubID: 'QUOTE',
  senderSubID: 'QUOTE',
  username: '1030165',
  password: 'Pl8$impaitoon$'
};

const symbolNameMap = {
'41': 'XAUUSD',
'1': 'EURUSD',
'4': 'USDJPY'
};

let msgSeqNum = 1;

// 🔧 ฟังก์ชัน helper
function getUTCTimestamp() {
  const pad = n => n.toString().padStart(2, '0');
  const d = new Date();
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}-` +
         `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function calculateBodyLength(msg) {
  const start = msg.indexOf('35=');
  return Buffer.byteLength(msg.slice(start), 'utf8');
}

function calculateChecksum(msg) {
  const sum = Buffer.from(msg, 'utf8').reduce((acc, b) => acc + b, 0);
  return ('00' + (sum % 256)).slice(-3);
}

function buildFIXMessage(fields) {
  const SOH = String.fromCharCode(1);
  const head = `8=FIX.4.4${SOH}`;
  let body = '';
  for (const [tag, val] of fields) {
    body += `${tag}=${val}${SOH}`;
  }
  const len = calculateBodyLength(body);
  const fullMsg = `${head}9=${len}${SOH}${body}`;
  const checksum = calculateChecksum(fullMsg);
  return `${fullMsg}10=${checksum}${SOH}`;
}

// 📤 ส่งคำสั่งราคาสด
function sendMarketDataRequest() {
  const now = getUTCTimestamp();
  const mdReqId = 'REQ-' + Math.floor(Math.random() * 1e6);

  const symbolMap = {
    XAUUSD: '41',
    EURUSD: '1',
    USDJPY: '4'
  };

  const symbols = Object.keys(symbolMap);

  const relatedSymbols = symbols.flatMap(symbol => [
    ['55', symbolMap[symbol]]  // ✅ ใส่ symbolId เป็นเลขใน tag 55
  ]);

  const entryTypes = [['269', '0'], ['269', '1']];

  const mdFields = [
    ['35', 'V'],
    ['34', msgSeqNum++],
    ['49', config.senderCompID],
    ['56', config.targetCompID],
    ['57', config.targetSubID],
    ['50', config.senderSubID],
    ['52', now],
    ['262', mdReqId],
    ['263', '1'],
    ['264', '1'],
    ['146', symbols.length],
    ...relatedSymbols,
    ['267', 2],
    ...entryTypes
  ];

  const mdRequest = buildFIXMessage(mdFields);
  console.log('📤 Sending MarketDataRequest...');
  socket.write(mdRequest);
}





// 🛠 สร้าง Socket และ Logon
const socket = new net.Socket();

socket.connect(config.port, config.host, () => {
  console.log('✅ Connected to FIX server');

  const logonMsg = buildFIXMessage([
    ['35', 'A'],
    ['34', msgSeqNum++],
    ['49', config.senderCompID],
    ['56', config.targetCompID],
    ['57', config.targetSubID],
    ['50', config.senderSubID],
    ['52', getUTCTimestamp()],
    ['98', '0'],
    ['108', '30'],
    ['141', 'Y'],
    ['553', config.username],
    ['554', config.password]
  ]);

  console.log('🔄 Sending Logon...');
  socket.write(logonMsg);
});

// 🧠 รับและ parse ข้อมูลจาก FIX Server
socket.on('data', (data) => {
  const raw = data.toString();
  const messages = raw.split('8=FIX.4.4').filter(Boolean).map(m => '8=FIX.4.4' + m);

  for (const msg of messages) {
    const clean = msg.replace(/\x01/g, ' | ');
    //console.log('📩 FIX:', clean);

    const fields = Object.fromEntries(
      msg.split('\x01')
         .map(p => p.split('='))
         .filter(([t, v]) => t && v)
    );

    
    // 📬 Logon success
    if (fields['35'] === 'A') {
      console.log('✅ FIX Logon successful');
      sendMarketDataRequest();
    }

    // 📊 MarketDataSnapshotFullRefresh
    if (fields['35'] === 'W') {
      const symbolId = fields['55'];
      const symbolName = symbolNameMap[symbolId] || symbolId;

      const entryType = fields['269'] === '0' ? 'Bid' : fields['269'] === '1' ? 'Ask' : 'Unknown';
      const price = fields['270'];

      console.log(`📊 ${symbolName} → ${entryType}: ${price}`);
    }

    // ❌ Reject
    if (fields['35'] === '3') {
      console.error('❌ Reject:', fields['58']);
    }
  }
});

socket.on('error', (err) => {
  console.error('❌ Error:', err.message);
});

socket.on('close', () => {
  console.log('❎ Connection closed');
});
