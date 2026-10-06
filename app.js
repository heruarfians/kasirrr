// Ganti dengan URL deployment Web App Apps Script Anda
const API_URL = "https://script.google.com/macros/s/AKfycbywgdHVSXaSeaJvzuwzJO39aQRvcNKTOYzgr1lFB15U3kEqmjH7RlZzkO7FNuKnFw10/exec";

// Local Application State
let db = { products: [], outlets: [], customers: [], tables: [], ingredients: [] };
let cart = [];
let currentUser = null;
let bluetoothDevice = null;
let bluetoothCharacteristic = null;

// Barcode scanner trigger
document.getElementById('barcode-scanner').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    let sku = this.value;
    let prod = db.products.find(p => p.sku == sku);
    if(prod) { addToCart(prod.id); }
    this.value = '';
  }
});

async function syncDataFromCloud() {
  try {
    let res = await fetch(`${API_URL}?action=get_data`);
    db = await res.json();
    renderProducts();
    populateCustomerDropdown();
    renderInventory();
  } catch(e) {
    console.error("Gagal sinkronisasi data cloud. Menggunakan fallback lokal.", e);
  }
}

function handleLogin() {
  // Login bypass simulasi frontend
  currentUser = { id: "USR01", name: "Manager K.", role: "Admin/Kasir", outletId: "OUT01" };
  
  // Sembunyikan halaman login dan munculkan dashboard utama
  document.getElementById('login-page').classList.add('page-hidden');
  document.getElementById('main-dashboard').classList.remove('page-hidden');
  
  document.getElementById('active-user').innerText = currentUser.name;
  syncDataFromCloud();
}

function switchView(viewName) {
  // Sembunyikan semua views terlebih dahulu
  ['view-pos', 'view-inventory', 'view-reports'].forEach(v => {
    let el = document.getElementById(v);
    if(el) el.classList.add('page-hidden');
  });
  
  // Tampilkan view yang dipilih
  let activeEl = document.getElementById(`view-${viewName}`);
  if(activeEl) activeEl.classList.remove('page-hidden');
}

function renderProducts() {
  let grid = document.getElementById('product-grid');
  grid.innerHTML = db.products.map(p => `
    <div onclick="addToCart('${p.id}')" class="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-indigo-500 transition">
      <div class="h-24 w-full bg-slate-800 rounded-lg mb-2 flex items-center justify-center text-xs text-slate-500">🛒 Image / QR</div>
      <h4 class="font-bold text-sm text-slate-200">${p.name}</h4>
      <p class="text-xs text-indigo-400 mt-1 font-semibold">Rp ${Number(p.price).toLocaleString('id-ID')}</p>
      <span class="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">Stok: ${p.stock} ${p.unit}</span>
    </div>
  `).join('');
}

function addToCart(productId) {
  let prod = db.products.find(p => p.id === productId);
  if (!prod) return;

  // Cek ketersediaan stok dasar dari Google Sheets
  let availableStock = Number(prod.stock);
  let itemInCart = cart.find(c => c.id === productId);
  let currentCartQty = itemInCart ? itemInCart.qty : 0;

  // Validasi: Jika stok sudah 0 atau pesanan melebihi stok fisik
  if (availableStock <= 0 || currentCartQty >= availableStock) {
    showToastNotification(`⚠️ Stok Habis! Sisa stok untuk "${prod.name}" hanya tinggal ${availableStock} ${prod.unit}.`);
    return;
  }

  if (itemInCart) {
    itemInCart.qty++;
  } else {
    cart.push({ ...prod, qty: 1 });
  }
  
  showToastNotification(`✨ ${prod.name} berhasil ditambahkan.`);
  calculateCart();
}

// Fungsi pembantu untuk memunculkan pesan peringatan halus (Toast)
function showToastNotification(message) {
  let toast = document.createElement('div');
  toast.className = 'fixed bottom-6 right-6 bg-slate-900 border border-slate-700 text-slate-200 px-5 py-3.5 rounded-xl shadow-2xl z-50 text-sm font-medium transition-all duration-300 transform translate-y-10 opacity-0';
  toast.innerText = message;
  document.body.appendChild(toast);

  // Animasi masuk
  setTimeout(() => {
    toast.classList.remove('translate-y-10', 'opacity-0');
  }, 50);

  // Animasi keluar dan hapus elemen setelah 3.5 detik
  setTimeout(() => {
    toast.classList.add('translate-y-10', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function calculateCart() {
  let subtotal = 0;
  let discount = 0;
  let points = 0;
  
  cart.forEach(item => {
    // Logika Harga Grosir / Tier Jumlah Satuan
    let itemPrice = Number(item.price);
    if(item.qty >= 10 && item.wholesale_price) {
      itemPrice = Number(item.wholesale_price);
    }
    
    subtotal += itemPrice * item.qty;
    
    // Logika Promo Beli 2 Gratis 1 (Simulasi Engine)
    if(item.promo_type === "B2G1" && item.qty >= 2) {
      let freeItems = Math.floor(item.qty / 2);
      discount += freeItems * itemPrice;
    }
  });

  let total = subtotal - discount;
  points = Math.floor(total / 10000); // 1 Poin per Kelipatan Rp10.000

  document.getElementById('txt-subtotal').innerText = `Rp ${subtotal.toLocaleString('id-ID')}`;
  document.getElementById('txt-discount').innerText = `- Rp ${discount.toLocaleString('id-ID')}`;
  document.getElementById('txt-points').innerText = `+${points} Poin`;
  document.getElementById('txt-total').innerText = `Rp ${total.toLocaleString('id-ID')}`;
  
  renderCartList();
}

function renderCartList() {
  let list = document.getElementById('cart-list');
  list.innerHTML = cart.map(item => `
    <div class="flex justify-between items-center bg-slate-850 p-2.5 rounded-lg border border-slate-800 text-xs">
      <div>
        <h5 class="font-bold text-slate-200">${item.name}</h5>
        <p class="text-slate-400 mt-0.5">${item.qty} x Rp ${Number(item.price).toLocaleString('id-ID')}</p>
      </div>
      <div class="flex items-center space-x-2">
        <button onclick="adjustQty('${item.id}', -1)" class="px-2 py-1 bg-slate-700 rounded">-</button>
        <span class="font-bold">${item.qty}</span>
        <button onclick="adjustQty('${item.id}', 1)" class="px-2 py-1 bg-slate-700 rounded">+</button>
      </div>
    </div>
  `).join('');
}

function adjustQty(id, amt) {
  let item = cart.find(c => c.id === id);
  if(item) {
    item.qty += amt;
    if(item.qty <= 0) cart = cart.filter(c => c.id !== id);
  }
  calculateCart();
}

// Integrasi Hardware: Printer Thermal Bluetooth via Web Bluetooth API
async function connectBluetoothPrinter() {
  try {
    bluetoothDevice = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }] // Standard POS printer service uuid
    });
    let server = await bluetoothDevice.gatt.connect();
    let service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
    bluetoothCharacteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
    document.getElementById('printer-status').innerText = "✅ Printer Thermal Terhubung";
  } catch (e) {
    alert("Koneksi printer dibatalkan/gagal. Pastikan Bluetooth aktif.");
  }
}

// Kirim Nota via WhatsApp API Gateway
function sendWhatsAppReceipt(phone, txId, total) {
  let msg = window.encodeURIComponent(`Halo, Terima kasih telah berbelanja.\nNota Transaksi: #${txId}\nTotal Tagihan: Rp ${total.toLocaleString('id-ID')}\nStatus: LUNAS.`);
  window.open(`https://whatsapp.com{phone}&text=${msg}`, '_blank');
}

async function processPayment(method) {
  if(cart.length === 0) return alert("Keranjang masih kosong");
  let txId = "TX" + Date.now();
  let totalText = document.getElementById('txt-total').innerText;
  let subtotalText = document.getElementById('txt-subtotal').innerText;
  let discountText = document.getElementById('txt-discount').innerText;

  let payload = {
    action: "save_transaction",
    txId: txId,
    outletId: currentUser.outletId,
    userId: currentUser.id,
    customerId: document.getElementById('select-customer').value,
    items: cart,
    total: totalText,
    paymentMethod: method
  };

  // 1. Bunyikan efek suara "Cha-Ching!" arcade
  playChaChingSound();

  // 2. Tampilkan Struk Belanja Retro Hitam-Putih di Layar (Print Preview)
  renderRetroReceipt(txId, method, subtotalText, discountText, totalText);

  // 3. Simpan ke Google Sheets via REST API (Berjalan di latar belakang)
  try {
    fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  } catch(e) {
    console.error("Gagal sinkronisasi transaksi ke cloud:", e);
  }

  // 4. Reset Keranjang Belanja
  cart = [];
  calculateCart();
}

// Fungsi Membuat Layout Struk Kasir Dot-Matrix Jadul
function renderRetroReceipt(txId, method, subtotal, discount, total) {
  // Cek jika modal struk lama sudah ada, hapus dahulu
  let oldModal = document.getElementById('receipt-modal');
  if(oldModal) oldModal.remove();

  // Susun manifest baris belanjaan
  let itemsHtml = cart.map(item => {
    let namaBarang = item.name.padEnd(20, ' ').substring(0, 20);
    let qtyHarga = `${item.qty}x${Number(item.price).toLocaleString('id-ID')}`;
    let totalItem = (item.qty * Number(item.price)).toLocaleString('id-ID');
    return `<div class="flex justify-between"><span>${namaBarang}</span><span>${totalItem}</span></div><div class="text-xs text-slate-600 pl-2">${qtyHarga}</div>`;
  }).join('');

  // Buat element modal struk popup layar
  let modal = document.createElement('div');
  modal.id = 'receipt-modal';
  modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-white text-black p-6 w-full max-w-sm font-mono border-4 border-black shadow-[8px_8px_0px_#000] space-y-4">
      <div class="text-center border-b-2 border-dashed border-black pb-2">
        <h3 class="text-lg font-black tracking-widest">=== OMNIPOS ===</h3>
        <p class="text-xs">RETRO ARCADE STATION</p>
        <p class="text-[10px] text-slate-700">${new Date().toLocaleString('id-ID')}</p>
      </div>
      
      <div class="text-xs space-y-1">
        <p>ID NOTA : #${txId}</p>
        <p>KASIR   : ${currentUser.name}</p>
        <p>METODE  : ${method}</p>
      </div>
      
      <div class="border-b-2 border-dashed border-black py-2 space-y-1 text-xs">
        ${itemsHtml}
      </div>
      
      <div class="text-xs space-y-1 pt-1">
        <div class="flex justify-between"><span>SUBTOTAL</span><span>${subtotal}</span></div>
        <div class="flex justify-between text-slate-700"><span>POTONGAN</span><span>${discount}</span></div>
        <div class="flex justify-between font-bold text-sm pt-1 border-t border-black"><span>TOTAL</span><span>${total}</span></div>
      </div>
      
      <div class="text-center text-[10px] pt-4 border-t border-dashed border-black">
        <p>TERIMA KASIH TELAH BERBELANJA</p>
        <p>*** LAYANAN DIGITAL ENTERPRISE ***</p>
      </div>

      <div class="pt-2 flex space-x-2">
        <button onclick="window.print()" class="flex-1 bg-black text-white text-xs py-2 font-bold hover:bg-slate-800 border-0">🖨️ Cetak Struk</button>
        <button onclick="document.getElementById('receipt-modal').remove()" class="flex-1 bg-slate-200 text-black text-xs py-2 font-bold hover:bg-slate-300 border-2 border-black">Tutup</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Jika printer thermal bluetooth aktif terhubung, kirim raw text ke hardware device
  if (bluetoothCharacteristic) {
    let rawText = `=== OMNIPOS ===\nID: #${txId}\nTotal: ${total}\n================\nTERIMA KASIH\n\n\n`;
    let encoder = new TextEncoder();
    bluetoothCharacteristic.writeValue(encoder.encode(rawText));
  }
}

function exportToExcel(tableId) {
  let table = document.getElementById(tableId);
  let wb = XLSX.utils.table_to_book(table, { sheet: "Laporan Kategori" });
  XLSX.writeFile(wb, `Laporan_OmniPOS_${Date.now()}.xlsx`);
}

function playChaChingSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  
  const ctx = new AudioContext();
  
  // Suara Koin 1 (Nada Rendah)
  let osc1 = ctx.createOscillator();
  let gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(850, ctx.currentTime); // Nada dasar koin
  osc1.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
  gain1.gain.setValueAtTime(0.3, ctx.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  
  // Suara Koin 2 (Nada Tinggi Khas Kasir)
  let osc2 = ctx.createOscillator();
  let gain2 = ctx.createGain();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(1500, ctx.currentTime + 0.05); // Jeda sedikit agar bergemerincing
  osc2.frequency.exponentialRampToValueAtTime(2200, ctx.currentTime + 0.15);
  gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.05);
  gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  
  // Jalankan Synth Koin Arcade
  osc1.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.15);
  osc2.start(ctx.currentTime + 0.05);
  osc2.stop(ctx.currentTime + 0.4);
}

function handleLogout() {
  window.location.reload();
}

let trendChartInstance = null;
let pieChartInstance = null;

// Modifikasi fungsi ganti halaman bawaan agar memicu kalkulasi grafik
const originalSwitchView = switchView;
switchView = function(viewName) {
  originalSwitchView(viewName);
  if (viewName === 'reports') {
    renderBusinessCharts();
  }
};

function renderBusinessCharts() {
  // 1. Data Dummy / Simulasi Penjualan (Nantinya tersinkronisasi dari data sheet transaksi)
  const salesData =;
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  
  // Hitung total pendapatan kotor untuk kartu ringkasan atas
  let grossTotal = salesData.reduce((a, b) => a + b, 0);
  let hppTotal = grossTotal * 0.4; // Estimasi HPP bahan baku sebesar 40%
  let netTotal = grossTotal - hppTotal;

  document.getElementById('rep-gross').innerText = `Rp ${grossTotal.toLocaleString('id-ID')}`;
  document.getElementById('rep-hpp').innerText = `Rp ${hppTotal.toLocaleString('id-ID')}`;
  document.getElementById('rep-net').innerText = `Rp ${netTotal.toLocaleString('id-ID')}`;

  // Hancurkan grafik lama jika sudah ada untuk menghindari tumpang tindih memori browser
  if (trendChartInstance) trendChartInstance.destroy();
  if (pieChartInstance) pieChartInstance.destroy();

  // 2. Inisialisasi Grafik Garis Modern (Tren Penjualan)
  const ctxTrend = document.getElementById('salesTrendChart').getContext('2d');
  trendChartInstance = new Chart(ctxTrend, {
    type: 'line',
    data: {
      labels: days,
      datasets: [{
        label: 'Pendapatan Harian',
        data: salesData,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#6366f1'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
      }
    }
  });

  // 3. Inisialisasi Grafik Lingkaran Modern (Kategori Produk Terlaris)
  const ctxPie = document.getElementById('categoryPieChart').getContext('2d');
  pieChartInstance = new Chart(ctxPie, {
    type: 'doughnut',
    data: {
      labels: ['Makanan', 'Minuman/Bar', 'Paket Promo'],
      datasets: [{
        data:,
        backgroundColor: ['#6366f1', '#10b981', '#f59e0b'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } }
        }
      }
    }
  });
}


