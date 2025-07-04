const API_BASE_URL = location.hostname.includes('localhost')
  ? 'http://localhost:3000'
  : 'https://fix-client-karan.onrender.com';

let currentWatchlist = {};
let forexInterval = null;
let setPriceInterval = null;
let previousSETPrices = {};

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

    if (visibleSymbols.length === 0) {
      output.innerHTML = '<p>⚠️ ไม่มี symbol ที่เลือกไว้ใน watchlist</p>';
      return;
    }

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

    visibleSymbols.forEach((code) => {
      const cell = output.querySelector(`td[data-symbol="${code}"]`);
      const newPrice = formatPrice(data[code]);
      if (cell && cell.textContent !== newPrice) {
        const oldPrice = parseFloat(cell.textContent.replace(/,/g, ''));
        const newVal = parseFloat(data[code]);

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

async function loadSETPrices() {
  const output = document.getElementById('set-output');
  if (!output) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/set-prices?t=${Date.now()}`);
    const data = await res.json();

    const symbols = Object.keys(data).filter(sym => sym !== 'cached');
    if (symbols.length === 0) {
      output.innerHTML = '<p>⚠️ ไม่มีหุ้นใน SET Watchlist</p>';
      return;
    }

    const now = new Date().toLocaleTimeString();
    output.innerHTML = `
      <table>
        <thead><tr><th>หุ้น</th><th>ราคา</th></tr></thead>
        <tbody>
          ${symbols.map(symbol => {
            const price = data[symbol];
            const prev = previousSETPrices[symbol];
            let cls = '';
            if (prev && !isNaN(price) && !isNaN(prev)) {
              if (parseFloat(price) > parseFloat(prev)) cls = 'price-up';
              else if (parseFloat(price) < parseFloat(prev)) cls = 'price-down';
            }
            return `<tr><td>${symbol}</td><td class="${cls}">${price}</td></tr>`;
          }).join('')}
        </tbody>
      </table>
      <p style="font-size: 0.8em; color: gray;">📡 Source: SET — อัปเดตล่าสุด ${now}</p>
    `;

    previousSETPrices = data;
  } catch (err) {
    output.innerHTML = '❌ โหลดราคาหุ้น SET ไม่สำเร็จ';
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

async function loadSETWatchlist() {
  const input = document.getElementById('set-watchlist-input');
  try {
    const res = await fetch(`${API_BASE_URL}/api/set-watchlist`);
    const symbols = await res.json();
    input.value = symbols.join(',');
  } catch (err) {
    console.error('❌ โหลด SET watchlist ไม่สำเร็จ:', err);
  }
}

async function saveSETWatchlist() {
  const input = document.getElementById('set-watchlist-input');
  const symbols = input.value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  try {
    await fetch(`${API_BASE_URL}/api/set-watchlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols })
    });
    console.log('✅ SET watchlist saved');
  } catch (err) {
    console.error('❌ บันทึก SET watchlist ไม่สำเร็จ:', err);
  }
}

function switchTab(tabId) {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.style.display = 'none';
  });

  const tabEl = document.getElementById(`${tabId}-tab`);
  if (tabEl) tabEl.style.display = 'block';

  if (tabId === 'forex') {
    startForexUpdates();
  } else {
    clearInterval(forexInterval);
    clearInterval(setPriceInterval);
  }

  if (tabId === 'watchlist') {
    loadWatchlistTab();
    loadSETWatchlist();
  }
}

async function startForexUpdates() {
  clearInterval(forexInterval);
  clearInterval(setPriceInterval);

  await loadWatchlist();
  loadForexPrices();
  loadSETPrices();

  forexInterval = setInterval(loadForexPrices, 3000);
  setPriceInterval = setInterval(loadSETPrices, 15 * 60 * 1000);
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
