const express = require('express');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send(`
    <h2>✅ FIX Client is running</h2>
    <p>Try <a href="/forex_data.json">/forex_data.json</a> to see live data.</p>
  `);
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

app.listen(PORT, () => {
  console.log(`🌐 Express server running on port ${PORT}`);
});
