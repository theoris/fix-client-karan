let currentWatchlist = {};
let forexInterval = null;

// โหลด watchlist จาก backend
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

// โหลดราคาสดจาก backend และแสดงเฉพาะ symbol ที่เปิดอยู่
async function loadForexPrices() {
  const output = document.getElementById('forex-output');
  if (!output) return;

  output.innerHTML = '📡 กำลังโหลด...';

  try {
    const res = await fetch('/api/forex?t=' + Date.now());
    const data = await res.json();

    const visibleSymbols = Object.keys(currentWatchlist)
      .filter(sym => currentWatchlist[sym] && data[sym]);

    output.innerHTML = `
      <table>
        <thead><tr><th>Symbol</th><th>ราคาปิดล่าสุด</th></tr></thead>
        <tbody>
          ${visibleSymbols.map(code =>
            `<tr><td>${code}</td><td>${formatPrice(data[code])}</td></tr>`
          ).join('')}
        </tbody>
      </table>
      <p style="font-size: 0.8em; color: gray;">📡 Source: ${data.source}</p>
    `;
  } catch (err) {
    output.innerHTML = '❌ โหลดข้อมูลไม่สำเร็จ';
    console.error('❌ Error loading forex prices:', err);
  }
}

// โหลดและแสดง watchlist พร้อม checkbox
async function loadWatchlistTab() {
  const list = document.getElementById('watchlist-list');
  list.innerHTML = '📡 กำลังโหลด...';

  try {
    const res = await fetch('/api/watchlist?t=' + Date.now());
    const watchlist = await res.json();

    list.innerHTML = Object.entries(watchlist).map(([symbol, visible]) => `
      <li>
        <label>
          <input type="checkbox" data-symbol="${symbol}" ${visible ? 'checked' : ''}>
          ${symbol}
        </label>
      </li>
    `).join('');

    // เพิ่ม event listener
    list.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const updated = {};
        list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
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

// บันทึก watchlist กลับไปที่ backend
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

// เปลี่ยนแท็บ
function switchTab(tabId) {
  document.querySelectorAll('.tab').forEach(tab => {
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

function adjustFontSize(delta) {
  const html = document.documentElement;
  const body = document.body;

  const currentSize = parseFloat(getComputedStyle(html).fontSize);
  const newSize = Math.max(10, currentSize + delta); // ป้องกันเล็กเกินไป

  html.style.fontSize = newSize + 'px';
  body.style.fontSize = newSize + 'px';
}

function formatPrice(value) {
  const num = parseFloat(value);
  return isNaN(num) ? '-' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 });
}


// เริ่มโหลดราคาสดเมื่อเข้าแท็บ Forex
async function startForexUpdates() {
  clearInterval(forexInterval);
  await loadWatchlist();
  loadForexPrices();
  forexInterval = setInterval(loadForexPrices, 3000);
}

// ตั้งค่า event สำหรับปุ่ม nav
document.querySelectorAll('nav button').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.getAttribute('onclick').match(/switchTab\('(.+)'\)/)[1];
    switchTab(tab);
  });
});

// เริ่มต้นที่แท็บแรก
switchTab('set');
