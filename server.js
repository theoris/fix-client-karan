const express = require('express');
const cors = require('cors');
const fs = require('fs');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

const SET_WATCHLIST_PATH = 'set_watchlist.json';
let setCache = { data: {}, timestamp: 0 };

app.use(cors({ origin: '*' }));
app.use(express.json());

// ✅ หน้า root
app.get('/', (req, res) => {
  res.send(`<h2>✅ FIX Client is running</h2><p>Try <a href="/forex_data.json">/forex_data.json</a></p>`);
});

// ✅ Forex data
app.get('/forex_data.json', (req, res) => {
  try {
    const data = fs.readFileSync('forex_data.json', 'utf8');
    res.setHeader('Cache-Control', 'no-store');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: 'ไม่สามารถโหลดข้อมูล' });
  }
});

// ✅ Mock SET data (optional)
app.get('/set_data.json', (req, res) => {
  try {
    const data = fs.readFileSync('set_data.json', 'utf8');
    res.setHeader('Cache-Control', 'no-store');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: 'ไม่สามารถโหลดข้อมูล SET' });
  }
});

// ✅ ดึงราคาหุ้นจาก SET ด้วย Puppeteer
async function getSETPrice(symbol) {
  try {
    const url = `https://www.set.or.th/en/market/product/stock/quote/${symbol}/price`;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    const price = await page.evaluate(() => {
      const el = document.querySelector('.stock-info');
      return el ? el.textContent.trim() : null;
    });

    await browser.close();
    return price;
  } catch (err) {
    console.error(`❌ Failed to fetch SET price for ${symbol}:`, err.message);
    return null;
  }
}

// ✅ GET: ราคาหุ้นจาก watchlist + cache
app.get('/api/set-prices', async (req, res) => {
  const now = Date.now();
  const cacheAge = (now - setCache.timestamp) / 1000;

  if (cacheAge < 60 && Object.keys(setCache.data).length > 0) {
    return res.json({ ...setCache.data, cached: true });
  }

  try {
    const raw = fs.readFileSync(SET_WATCHLIST_PATH, 'utf8');
    const symbols = JSON.parse(raw);

    console.log('📡 SET watchlist:', symbols);

    const results = {};
    for (const symbol of symbols) {
      const price = await getSETPrice(symbol);
      results[symbol] = price || 'N/A';
    }

    setCache = { data: results, timestamp: now };
    res.json(results);
  } catch (err) {
    console.error('❌ Error fetching SET prices:', err);
    res.status(500).json({ error: 'โหลดราคาหุ้น SET ไม่สำเร็จ' });
  }
});

// ✅ Forex watchlist
app.get('/api/watchlist', (req, res) => {
  try {
    const data = fs.readFileSync('watchlist.json', 'utf8');
    res.setHeader('Cache-Control', 'no-store');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: 'ไม่สามารถโหลด watchlist' });
  }
});

app.post('/api/watchlist', (req, res) => {
  try {
    fs.writeFileSync('watchlist.json', JSON.stringify(req.body, null, 2));
    res.json({ status: '✅ saved' });
  } catch (err) {
    res.status(500).json({ error: 'ไม่สามารถบันทึก watchlist' });
  }
});

// ✅ SET watchlist
app.get('/api/set-watchlist', (req, res) => {
  try {
    const raw = fs.readFileSync(SET_WATCHLIST_PATH, 'utf8');
    const symbols = JSON.parse(raw);
    res.json(symbols);
  } catch (err) {
    res.status(500).json({ error: 'ไม่สามารถโหลด watchlist SET' });
  }
});

app.post('/api/set-watchlist', (req, res) => {
  const symbols = req.body.symbols;
  if (!Array.isArray(symbols)) {
    return res.status(400).json({ error: 'symbols ต้องเป็น array' });
  }

  try {
    fs.writeFileSync(SET_WATCHLIST_PATH, JSON.stringify(symbols, null, 2));
    setCache = { data: {}, timestamp: 0 };
    res.json({ status: '✅ saved' });
  } catch (err) {
    res.status(500).json({ error: 'ไม่สามารถบันทึก watchlist SET' });
  }
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🌐 Express server running on port ${PORT}`);
});
