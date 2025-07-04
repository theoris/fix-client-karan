// === Settrade API Integration ===

async function loadSettrade() {
  const output = document.getElementById('settrade-output');
  output.innerHTML = '📡 กำลังโหลด...';

  try {
    const res = await fetch('https://api.settrade.com/api/marketdata/quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'app_id': APP_ID,
        'app_secret': APP_SECRET
      },
      body: JSON.stringify({
        symbols: ['.SET50FF', 'S50M26', 'S50U25', 'S50Z25']
      })
    });

    const data = await res.json();
    output.innerHTML = '';

    Object.entries(data).forEach(([symbol, info]) => {
      const price = parseFloat(info.last);
      const div = document.createElement('div');
      div.innerHTML = `<strong>${symbol}</strong>: ${price}`;
      output.appendChild(div);

      // 🔔 เช็กราคาเป้าหมาย (mock alert = 900)
      if (price && price > 900) {
        sendTelegramAlert(`🚨 ${symbol} ขึ้นเกิน 900 แล้ว! ปัจจุบัน: ${price}`);
      }

      // วาดกราฟตัวอย่างย้อนหลัง (mock data)
      drawChart(symbol, generateMockPrices(price));
    });

  } catch (err) {
    output.textContent = '❌ ไม่สามารถโหลดข้อมูลได้';
    console.error(err);
  }
}

// === กราฟย้อนหลังด้วย Chart.js ===

function drawChart(symbol, prices) {
  const ctx = document.getElementById('setChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: prices.map((_, i) => `Day ${i + 1}`),
      datasets: [{
        label: symbol,
        data: prices,
        borderColor: '#ffaa00',
        fill: false
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: false }
      }
    }
  });
}

// 🔁 สร้างราคาจำลองย้อนหลัง
function generateMockPrices(current) {
  const prices = [];
  for (let i = 6; i >= 0; i--) {
    const fluctuation = Math.random() * 20 - 10;
    prices.push((current + fluctuation).toFixed(2));
  }
  return prices;
}