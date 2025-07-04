const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// ✅ ให้บริการไฟล์ static เช่น index.html, main.js
app.use(express.static(__dirname));

// ✅ รองรับ JSON body สำหรับ POST
app.use(bodyParser.json());

// ✅ API: โหลดราคาสดจาก FIX client
app.get('/api/forex', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const data = fs.readFileSync(path.join(__dirname, 'forex_data.json'), 'utf8');
    const prices = JSON.parse(data);
    res.json({ ...prices, source: 'local' });
  } catch (err) {
    console.error('❌ อ่าน forex_data.json ไม่สำเร็จ:', err);
    res.status(500).json({ error: 'ไม่สามารถโหลดข้อมูลจาก FIX client' });
  }
});

// ✅ API: โหลด watchlist
app.get('/api/watchlist', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const data = fs.readFileSync(path.join(__dirname, 'watchlist.json'), 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    console.error('❌ อ่าน watchlist.json ไม่สำเร็จ:', err);
    res.status(500).json({ error: 'ไม่สามารถโหลด watchlist' });
  }
});

// ✅ API: บันทึก watchlist
app.post('/api/watchlist', (req, res) => {
  try {
    const json = JSON.stringify(req.body, null, 2);
    fs.writeFileSync(path.join(__dirname, 'watchlist.json'), json);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ เขียน watchlist.json ไม่สำเร็จ:', err);
    res.status(500).json({ error: 'ไม่สามารถบันทึก watchlist' });
  }
});

// ✅ เริ่มเซิร์ฟเวอร์
app.listen(PORT, () => {
  console.log(`🌐 Local server running at http://localhost:${PORT}`);
});
