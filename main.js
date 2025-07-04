// ✅ รองรับทั้ง dev (localhost) และ prod (Render)
const API_BASE_URL = location.hostname.includes('localhost')
  ? 'http://localhost:3000'
  : 'https://fix-client-karan.onrender.com';

let currentWatchlist = {};
let forexInterval = null;

function adjustFontSize(delta) {
  const html = document.documentElement;
  const body = document.body;
  const current = parseFloat(getComputedStyle(html).fontSize);
  const newSize = Math.max(10, current + delta);
  html.style.fontSize = newSize + 'px';
  body.style.fontSize = newSize + 'px';
}

function formatPrice(value) {
  const num = parseFloat(value);
  return isNaN(num)
    ? '-'
    : num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 5
      });
}

async function loadForexPrices() {
  const output = document.getElementById('forex-output');
  if (!output) return;

  try {
    const res = await fetch(`${API_BASE_URL}/forex_data.json?t=${Date.now()}`);
    const data = await res.json();

    const visibleSymbols = Object.keys(currentWatchlist).filter(
      (sym) => currentWatchlist[sym] && data[sym]
    );

    // ✅ ถ้ายังไม่มีตาราง → สร้างใหม่
    if (!output.querySelector('table')) {
      output.innerHTML = `
        <table>
          <thead><tr><th>Symbol</th><th>ราคาปิดล่าสุด</th></tr></thead>
          <tbody>
            ${visibleSymbols
              .map(
                (code) =>
                  `<tr><td>${code}</td><td data-symbol="${code}">-</td></tr>`
              )
              .join('')}
          </tbody>
        </table>
        <p style="font-size: 0.8em; color: gray;">📡 Source: ${data.source || 'FIX Client'}</p>
      `;
    }

    // ✅ อัปเดตเฉพาะราคาที่เปลี่ยน
    visibleSymbols.forEach((code) => {
      const cell = output.querySelector(`td[data-symbol="${code}"]`);
      const newPrice = formatPrice(data[code]);
      if (cell && cell.textContent !== newPrice) {
        const oldPrice = parseFloat(cell.textContent.replace(/,/g, ''));
        const newVal = parseFloat(data[code]);

        // ✅ เพิ่มสีขึ้น/ลง
        cell.classList.remove('price-up', 'price-down');
        if (!isNaN(oldPrice)) {
          if (newVal > oldPrice) cell.classList.add('price-up');
          else if (newVal < oldPrice) cell.classList.add('price-down');
        }

        cell.textContent = newPrice;
      }
    });
  } catch (err) {
    output.innerHTML = '❌ โหลดข้อมูลไม่สำเร็จ';
    console.error(err);
  }
}


async function loadWatchlistTab() {
  const list = document.getElementById('watchlist-list');
  list.innerHTML = '📡 กำลังโหลด...';

  try {
    const res = await fetch(`${API_BASE_URL}/api/watchlist?t=${Date.now()}`);
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

async function saveWatchlist(data) {
  try {
    await fetch(`${API_BASE_URL}/api/watchlist`, {
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

async function startForexUpdates() {
  clearInterval(forexInterval);
  await loadWatchlist();
  loadForexPrices();
  forexInterval = setInterval(loadForexPrices, 3000);
}

async function loadWatchlist() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/watchlist?t=${Date.now()}`);
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

document.querySelectorAll('nav button').forEach((btn) => {
  btn.addEventListener('click', () => {
    const tab = btn.getAttribute('onclick').match(/switchTab\('(.+)'\)/)[1];
    switchTab(tab);
  });
});

switchTab('set');
