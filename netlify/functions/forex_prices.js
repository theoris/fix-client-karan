const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
  const origin = event.headers.origin || '';
  const isLocal = origin.includes('localhost');

  let prices = {};
  try {
    const data = fs.readFileSync(path.join(__dirname, '..', 'forex_data.json'), 'utf8');
    prices = JSON.parse(data);
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'ไม่สามารถโหลดข้อมูลจาก FIX client' })
    };
  }

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ...prices, source: isLocal ? 'local' : 'netlify' })
  };
};
