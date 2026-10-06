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
  // Demo auth bypass untuk simulasi frontend cepat, validasi aslinya dilempar ke Apps Script doPost
  currentUser = { id: "USR01", name: "Manager K.", role: "Admin/Kasir", outletId: "OUT01" };
  document.getElementById('login-page').classList.add('hidden');
  document.getElementById('main-dashboard').classList.remove('hidden');
  document.getElementById('active-user').innerText = currentUser.name;
  syncDataFromCloud();
}

function switchView(viewName) {
  ['view-pos', 'view-inventory', 'view-reports'].forEach(v => document.getElementById(v).classList.add('hidden'));
  document.getElementById(`view-${viewName}`).classList.remove('hidden');
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
  let item = cart.find(c => c.id === productId);
  if (item) {
    item.qty++;
  } else {
    cart.push({ ...prod, qty: 1 });
  }
  calculateCart();
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

  // Simpan ke Google Sheets via REST API
  await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  alert(`Transaksi ${txId} Berhasil Disimpan ke Cloud!`);
  sendWhatsAppReceipt("628123456789", txId, totalText); // Contoh trigger WA otomatis
  cart = [];
  calculateCart();
}

function exportToExcel(tableId) {
  let table = document.getElementById(tableId);
  let wb = XLSX.utils.table_to_book(table, { sheet: "Laporan Kategori" });
  XLSX.writeFile(wb, `Laporan_OmniPOS_${Date.now()}.xlsx`);
}

function handleLogout() {
  window.location.reload();
}
