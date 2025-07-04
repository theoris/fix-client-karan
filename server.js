const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json()); // ✅ รองรับ JSON body

app.get('/', (req, res) => {
  res.send(`<h2>✅ FIX Client is running</h2><p>Try <a href="/forex_data.json">/forex_data.json</a></p>`);
});

app.get('/forex_data.json', (req, res) => {
  try {
    const data = fs.readFileSync('forex_data.json', 'utf8');
    res.setHeader('Cache-Control', 'no-store');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: 'ไม่สามารถโหลดข้อมูล' });
  }
});

app.get('/set_data.json', (req, res) => {
  try {
    const data = fs.readFileSync('set_data.json', 'utf8');
    res.setHeader('Cache-Control', 'no-store');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: 'ไม่สามารถโหลดข้อมูล SET' });
  }
});


// ✅ GET watchlist
app.get('/api/watchlist', (req, res) => {
  try {
    const data = fs.readFileSync('watchlist.json', 'utf8');
    res.setHeader('Cache-Control', 'no-store');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: 'ไม่สามารถโหลด watchlist' });
  }
});

// ✅ POST watchlist
app.post('/api/watchlist', (req, res) => {
  try {
    fs.writeFileSync('watchlist.json', JSON.stringify(req.body, null, 2));
    res.json({ status: '✅ saved' });
  } catch (err) {
    res.status(500).json({ error: 'ไม่สามารถบันทึก watchlist' });
  }
});

app.listen(PORT, () => {
  console.log(`🌐 Express server running on port ${PORT}`);
});
