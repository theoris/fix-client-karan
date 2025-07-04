const net = require('net');
const { v4: uuidv4 } = require('uuid');

// ป้อนข้อมูลของคุณที่นี่
const config = {
  host: 'live-us-eqx-01.p.c-trader.com',
  port: 5201,
  senderCompID: 'live.pepperstone.1030165',  // ยังคงใช้ใน tag 49
  targetCompID: 'cServer',
  targetSubID: 'QUOTE',
  senderSubID: 'QUOTE',
  username: '1030165',                       // ✅ <- ใหม่
  password: 'Pl8$impaitoon$'
};

function sendMarketDataRequest() {
  const now = getUTCTimestamp();
  const mdReqId = 'REQ-' + Math.floor(Math.random() * 1e6);

  // ✅ ต้องเป็น symbolId ของ cTrader จริง ๆ ที่ server support (อาจแตกต่างตาม account)
  const symbolMap = {
    XAUUSD: '4001',
    EURUSD: '1',
    USDJPY: '3'
  };

  const symbols = Object.keys(symbolMap);

  // ✅ จัดกลุ่ม symbol ให้เป็น [55=name, 48=id, 22=8] × n
  const relatedSymbols = symbols.flatMap(symbol => [
    ['55', symbol],
    ['48', symbolMap[symbol]],
    ['22', '8']
  ]);

  const entryTypes = [['269', '0'], ['269', '1']]; // Bid & Offer

  const mdFields = [
    ['35', 'V'],
    ['34', msgSeqNum++],
    ['49', config.senderCompID],
    ['56', config.targetCompID],
    ['57', config.targetSubID],
    ['50', config.senderSubID],
    ['52', now],
    ['262', mdReqId],
    ['263', '1'],                 // 1 = streaming
    ['264', '1'],                 // 1 = top of book
    ['146', symbols.length],
    ...relatedSymbols,           // ✅ group ถูกต้องตาม FIX spec
    ['267', 2],
    ...entryTypes
  ];

  const mdRequest = buildFIXMessage(mdFields);
  console.log('📤 Sending MarketDataRequest...');
  socket.write(mdRequest);
}





// 💡 helper ฟังก์ชัน
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

function getUTCTimestamp() {
  const pad = (n) => n.toString().padStart(2, '0');
  const d = new Date();
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-` +
         `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

// 🧪 เริ่มเชื่อมต่อ
const socket = new net.Socket();
let msgSeqNum = 1;

socket.connect(config.port, config.host, () => {
  console.log('✅ Connected to FIX server');

//  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];

  const now = getUTCTimestamp(); // สร้าง timestamp ที่ถูกต้อง

  const logonMsg = buildFIXMessage([
    ['35', 'A'],
    ['34', msgSeqNum++],
    ['49', config.senderCompID],
    ['56', config.targetCompID],
    ['57', config.targetSubID],
    ['50', config.senderSubID],
    ['52', getUTCTimestamp()],     // ✅ ต้องมาก่อน tag 98
    ['98', '0'],
    ['108', '30'],
    ['141', 'Y'],
    ['553', config.username],      // ✅ ต้องเป็นเลขล้วน เช่น '1030165'
    ['554', config.password]
  ]);

  console.log('🔄 Sending Logon...');
  socket.write(logonMsg);
});



socket.on('data', (data) => {
  const raw = data.toString();

  // Split แต่ละ message ถ้ามีหลาย message ซ้อนกัน
  const messages = raw.split('8=FIX.4.4').filter(Boolean).map(m => '8=FIX.4.4' + m);

  for (const msg of messages) {
    const clean = msg.replace(/\x01/g, ' | ');
    console.log('📩 FIX:', clean);

    const fields = Object.fromEntries(
      msg.split('\x01')
         .map(pair => pair.split('='))
         .filter(([tag, val]) => tag && val)
    );

    if (fields['35'] === 'W') {
      const symbol = fields['55'];
      const price = fields['270'];
      const entryType = fields['269'] === '0' ? 'Bid' : fields['269'] === '1' ? 'Ask' : 'Other';

      console.log(`📊 ${symbol} → ${entryType}: ${price}`);
    }

    if (fields['35'] === 'A') {
      console.log('✅ FIX Logon successful');
      sendMarketDataRequest(); // 🔥 ส่ง request ทันทีหลัง logon
    }
  }
});


socket.on('error', (err) => {
  console.error('❌ Error:', err.message);
});

socket.on('close', () => {
  console.log('❎ Connection closed');
});


