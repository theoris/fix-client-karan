let currentWatchlist = {};
let forexInterval = null;

// ✅ URL ของ backend (Render)
const API_URL = 'https://fix-client-karan.onrender.com/forex_data.json';

// ✅ ปรับขนาดฟอนต์
function adjustFontSize(delta) {
  const html = document.documentElement;
  const body = document.body;
  const current = parseFloat(getComputedStyle(html).fontSize);
  const newSize = Math.max(10, current + delta);
  html.style.fontSize = newSize + 'px';
  body.style.fontSize = newSize + 'px';
}

// ✅ แปลงราคาให้มี comma
function formatPrice(value) {
  const num = parseFloat(value);
  return isNaN(num)
    ? '-'
    : num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 5
      });
}

// ✅ โหลดราคาสดจาก backend
async function loadForexPrices() {
  const output = document.getElementById('forex-output');
  if (!output) return;

  output.innerHTML = '📡 กำลังโหลด...';

  try {
    const res = await fetch(API_URL + '?t=' + Date.now());
    const data = await res.json();

    const visibleSymbols = Object.keys(currentWatchlist).filter(
      (sym) => currentWatchlist[sym] && data[sym]
    );

    output.innerHTML = `
      <table>
        <thead><tr><th>Symbol</th><th>ราคาปิดล่าสุด</th></tr></thead>
        <tbody>
          ${visibleSymbols
            .map(
              (code) =>
                `<tr><td>${code}</td><td>${formatPrice(data[code])}</td></tr>`
            )
            .join('')}
        </tbody>
      </table>
      <p style="font-size: 0.8em; color: gray;">📡 Source: ${data.source}</p>
    `;
  } catch (err) {
    output.innerHTML = '❌ โหลดข้อมูลไม่สำเร็จ';
    console.error(err);
  }
}

// ✅ โหลด watchlist และแสดง checkbox
async function loadWatchlistTab() {
  const list = document.getElementById('watchlist-list');
  list.innerHTML = '📡 กำลังโหลด...';

  try {
    const res = await fetch('/api/watchlist?t=' + Date.now());
    const watchlist = await res.json();
    currentWatchlist = watchlist;

    list.innerHTML = Object.entries(watchlist)
      .map(
        ([symbol, visible]) => `
      <li>
        <label>
          <input type="checkbox" data-symbol="${symbol}" ${
          visible ? 'checked' : ''
        }>
          ${symbol}
        </label>
      </li>`
      )
      .join('');

    list.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const updated = {};
        list.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
          updated[cb.dataset.symbol] = cb.checked;
        });
        saveWatchlist(updated);
      });
    });
  } catch (err) {
    list.innerHTML = '❌ โหลด watchlist ไม่สำเร็จ';
    console.error(err);
  }
}

// ✅ บันทึก watchlist กลับไปที่ backend
async function saveWatchlist(data) {
  try {
    await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    console.log('✅ Watchlist saved');
    currentWatchlist = data;
  } catch (err) {
    console.error('❌ บันทึก watchlist ไม่สำเร็จ:', err);
  }
}

// ✅ เปลี่ยนแท็บ
function switchTab(tabId) {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.style.display = 'none';
  });
  document.getElementById(`${tabId}-tab`).style.display = 'block';

  if (tabId === 'forex') {
    startForexUpdates();
  } else {
    clearInterval(forexInterval);
  }

  if (tabId === 'watchlist') {
    loadWatchlistTab();
  }
}

// ✅ เริ่มโหลดราคาสดเมื่อเข้าแท็บ Forex
async function startForexUpdates() {
  clearInterval(forexInterval);
  await loadWatchlist();
  loadForexPrices();
  forexInterval = setInterval(loadForexPrices, 3000);
}

// ✅ โหลด watchlist สำหรับแท็บ Forex
async function loadWatchlist() {
  try {
    const res = await fetch('/api/watchlist?t=' + Date.now());
    currentWatchlist = await res.json();
  } catch (err) {
    console.error('❌ โหลด watchlist ไม่สำเร็จ:', err);
    currentWatchlist = {
      XAUUSD: true,
      EURUSD: true,
      USDJPY: true
    };
  }
}

// ✅ ตั้งค่า event สำหรับปุ่ม nav
document.querySelectorAll('nav button').forEach((btn) => {
  btn.addEventListener('click', () => {
    const tab = btn.getAttribute('onclick').match(/switchTab\('(.+)'\)/)[1];
    switchTab(tab);
  });
});

// ✅ เริ่มต้นที่แท็บแรก
switchTab('set');
