const net = require('net');
const fs = require('fs');
//const config = require('./config');

const config = {
  host: process.env.FIX_HOST,
  port: parseInt(process.env.FIX_PORT),
  senderCompID: process.env.FIX_SENDER,
  targetCompID: process.env.FIX_TARGET,
  senderSubID: process.env.FIX_SENDER_SUB,
  targetSubID: process.env.FIX_TARGET_SUB,
  username: process.env.FIX_USER,
  password: process.env.FIX_PASS
};


// ✅ Symbol map
const symbolIdMap = {
  XAUUSD: '41',
  XAGUSD: '42',
  BTCUSD: '10026',
  AUDUSD: '5',
  EURUSD: '1',
  GBPUSD: '2',
  NZDUSD: '12',
  USDCAD: '8',
  USDCHF: '6',
  USDJPY: '3',
  AUDCAD: '18',
  AUDCHF: '23',
  AUDJPY: '11',
  AUDNZD: '20',
  CADCHF: '27',
  CADJPY: '15',
  CHFJPY: '13',
  EURAUD: '14',
  EURCAD: '17',
  EURCHF: '10',
  EURGBP: '9',
  EURJPY: '3',
  EURNZD: '26',
  GBPAUD: '16',
  GBPCAD: '19',
  GBPCHF: '40',
  GBPJPY: '7',
  GBPNZD: '25',
  NZDCAD: '30',
  NZDCHF: '39',
  NZDJPY: '21',
  HK50: '10004',
  US500: '10013',
  SPOTCRUDE: '10053'
};

const reverseSymbolMap = Object.fromEntries(
  Object.entries(symbolIdMap).map(([sym, id]) => [id, sym])
);

let latestPrices = {};
Object.keys(symbolIdMap).forEach(sym => latestPrices[sym] = null);

function getVisibleSymbols() {
  try {
    const raw = fs.readFileSync('watchlist.json', 'utf8');
    const visible = JSON.parse(raw);
    return Object.keys(visible).filter(sym => visible[sym] && symbolIdMap[sym]);
  } catch (err) {
    console.error('⚠️ Failed to load watchlist.json, fallback to default');
    return ['XAUUSD', 'EURUSD', 'USDJPY'];
  }
}

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

function savePrices() {
  fs.writeFileSync('forex_data.json', JSON.stringify(latestPrices, null, 2));
}

function updatePrice(symbolId, entryType, price) {
  const symbol = reverseSymbolMap[symbolId];
  if (!symbol || entryType !== '1') return; // เก็บเฉพาะ Ask
  latestPrices[symbol] = price;
  savePrices();
}

function parseFIXMessage(raw) {
  const fields = raw.split('\x01').filter(Boolean).map(p => p.split('='));
  const result = {};
  const mdEntries = [];

  let currentEntry = null;
  for (const [tag, val] of fields) {
    if (tag === '269') {
      if (currentEntry) mdEntries.push(currentEntry);
      currentEntry = { '269': val };
    } else if (tag === '270' && currentEntry) {
      currentEntry['270'] = val;
    } else if (tag === '55' && currentEntry) {
      currentEntry['55'] = val;
    } else {
      result[tag] = val;
    }
  }
  if (currentEntry) mdEntries.push(currentEntry);
  if (mdEntries.length > 0) result['MDEntries'] = mdEntries;

  return result;
}

function sendMarketDataRequest(socket, msgSeqNum, visibleSymbols) {
  const now = getUTCTimestamp();
  const mdReqId = 'REQ-' + Math.floor(Math.random() * 1e6);

  const relatedSymbols = visibleSymbols.flatMap(sym => [['55', symbolIdMap[sym]]]);
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
    ['146', visibleSymbols.length],
    ...relatedSymbols,
    ['267', 2],
    ...entryTypes
  ];

  const mdRequest = buildFIXMessage(mdFields);
  console.log('📤 Subscribing to:', visibleSymbols.join(', '));
  socket.write(mdRequest);
}

function startFIXClient() {
  const socket = new net.Socket();
  let msgSeqNum = 1;
  const visibleSymbols = getVisibleSymbols();

  socket.connect({
    port: config.port,
    host: config.host
  }, () => {
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

    socket.write(logonMsg);
  });

  socket.on('data', (data) => {
    const raw = data.toString();
    const messages = raw.split('8=FIX.4.4').filter(Boolean).map(m => '8=FIX.4.4' + m);

    for (const msg of messages) {
      const parsed = parseFIXMessage(msg);
      const msgType = parsed['35'];

      if (msgType === 'A') {
        console.log('✅ FIX Logon successful');
        sendMarketDataRequest(socket, msgSeqNum++, visibleSymbols);
      }

      if ((msgType === 'W' || msgType === 'X') && parsed.MDEntries) {
        for (const entry of parsed.MDEntries) {
          const symbolId = entry['55'] || parsed['55'];
          const entryType = entry['269'];
          const price = entry['270'];
          if (symbolId && entryType && price) {
            updatePrice(symbolId, entryType, price);
            const symbol = reverseSymbolMap[symbolId];
            const type = entryType === '0' ? 'Bid' : 'Ask';
            console.log(`🔁 ${symbol} → ${type}: ${price}`);
          }
        }
      }

      if (msgType === '3') {
        console.error('❌ Reject:', parsed['58']);
      }
    }
  });

  socket.on('error', (err) => {
    console.error('❌ Socket error:', err.message);
  });

  socket.on('close', () => {
    console.log('❎ Connection closed');
    reconnect();
  });
}

function reconnect() {
  console.log('🔁 Reconnecting in 5 seconds...');
  setTimeout(() => {
    startFIXClient();
  }, 5000);
}

// ✅ เริ่มต้น
startFIXClient();
