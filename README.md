# Kasirrr 2.0 — POS bakmie & warkop

Aplikasi web bertema Windows klasik, responsif untuk HP, dengan Google Sheets sebagai penyimpanan. Frontend tanpa build/dependensi dan siap dipasang di GitHub Pages pada `https://heruarfians.github.io/kasirrr/`.

**Status 31 Oktober 2026:** frontend sudah diterbitkan ke GitHub Pages dan halaman login versi 2.0 berhasil diverifikasi. Backend Google Apps Script produksi masih perlu diperbarui oleh pemilik sebelum memakai data asli.

## Coba aplikasi

Buka `index.html`, lalu pilih demo Admin, Manager, atau Kasir pada halaman login. Data demo terpisah dari Sheets dan hanya tersimpan di browser. Akun demo tidak membuka data asli. Pada mode produksi, ID dan password diperiksa Apps Script sebelum data diambil.

### Perubahan yang diminta

| Permintaan | Implementasi |
| --- | --- |
| Login sebelum masuk | Halaman login; logout/ganti akun membersihkan data layar dan keranjang |
| Admin seluruh menu | Admin selalu mendapat 20 menu; pemeriksaan izin juga di backend |
| Hak akses tiap pengguna | Pengaturan → Hak akses → pilih pengguna → centang menu → simpan |
| Master kategori | Pengaturan → Master kategori; tambah, edit, hapus; kategori dipilih dari dropdown Produk |
| Edit akun | Pengguna → Edit; password kosong berarti tetap, password baru mencabut sesi lama |
| Dropdown outlet akun | Hanya outlet Aktif dapat dipilih saat tambah/edit pengguna |
| Hapus outlet | Tersedia; outlet yang masih terhubung pengguna/data dilindungi, gunakan status Tutup |
| Dropdown status outlet | Aktif / Tutup |
| Lima laporan | Transaksi, Pendapatan, Penjualan, Shift Kasir, Laba Rugi; rentang tanggal dan ekspor XLSX/CSV |
| ID shift pendek | S0001, S0002, dst.; ID lama tidak diubah agar referensi tetap utuh |
| Hapus pelanggan | Tersedia; pelanggan dengan riwayat transaksi/hutang/harga khusus dilindungi |
| Ganti akun dari kasir | Tombol Ganti akun kembali ke halaman login; shift dikelola pada menu Shift |
| Kanban/list | Tombol Kanban/List di Menu Warung; pilihan disimpan di perangkat |
| Karyawan | Data karyawan: nama, jabatan, telepon, tanggal masuk, gaji referensi, status; terpisah dari akun login |
| Bahan, resep, meja, produk, inventori | CRUD master, status meja, stok porsi, pengurangan bahan sesuai resep dan stock opname |
| Hutang dan kas | Piutang pelanggan/hutang supplier, cicilan, sisa, jatuh tempo; kas masuk/keluar, kas akhir dan selisih shift |
| QRIS | Unggah gambar QRIS warung, tampilkan pada pembayaran, konfirmasi masuk secara manual |
| Promo | Diskon nominal/persen; paket berbasis daftar produk wajib dan potongan sekali per transaksi |
| Harga khusus | Harga per pasangan pelanggan-produk, otomatis digunakan di kasir |
| Loyalti | Poin transaksi lunas, penukaran poin, konfigurasi nilai poin dan penyesuaian dengan catatan |
| Pembelian bahan | Menambah stok, biaya rata-rata tertimbang, pembayaran tunai/transfer atau hutang supplier |
| WhatsApp | Tombol pada nota membuka pesan siap kirim ke nomor pelanggan; pengguna menekan Kirim sendiri |
| Multi printer | Tiga profil: kasir/dapur/bar, lebar 58/80 mm atau A4; pilih printer fisik lewat dialog browser |

## Perbarui Google Apps Script

1. **Cadangkan spreadsheet dan kode Apps Script lama.** Pasang versi baru terlebih dahulu di salinan spreadsheet untuk uji satu transaksi.
2. Buka spreadsheet milikmu → Ekstensi → Apps Script. Ganti kode POS lama dengan **seluruh isi `backend/Code.gs`** dari paket ini. Jangan menambahkan ke bawah kode lama karena nama fungsi akan bertabrakan.
3. `DEFAULT_SPREADSHEET_ID` sudah menunjuk spreadsheet yang kamu berikan. Untuk salinan uji, ubah ID itu, atau isi Script Property `SPREADSHEET_ID` dengan ID salinan.
4. Pastikan tab `Users` memiliki minimal satu Admin dengan ID unik, nama unik, outletId TKM dan password panjang. Ganti password contoh langsung di spreadsheet sebelum `setup`. Jangan masukkan data akun ke repository GitHub.
5. Jalankan fungsi **setup** satu kali. Fungsi menambah tab/kolom yang kurang, memigrasikan hash password, mengisi kategori dari produk lama, dan mempertahankan data. `status` dan `shift_id` harus dua kolom terpisah. Header meja cukup `status`. Jangan menulis judul di atas baris header.
6. Deploy → Manage deployments → Edit → Version: New version → Deploy. Atau buat Web app baru: Execute as Me, akses Anyone; pembacaan/perubahan data tetap memerlukan token login aplikasi. Spreadsheet itu sendiri tidak perlu dibagikan ke publik.
7. Isi URL `/exec` pada `config.js` (`apiUrl`) untuk seluruh perangkat, atau buka Koneksi Google Sheets pada halaman login untuk perangkat itu. URL API bukan password. Hanya domain `script.google.com` dan pola `/macros/s/.../exec` yang diterima.
8. Login Admin, periksa Outlet dan kategori, isi HPP/resep, lalu uji buka shift → satu pesanan → pembayaran → stok → kas → laporan → tutup shift. Pastikan data muncul di tab transaksi dan detail_transaksi.

Sesi versi lama tidak diteruskan. Login ulang setelah memperbarui backend. Data demo tidak pernah diimpor otomatis ke Sheets.

### Tab tambahan

`kategori`, `karyawan`, `hutang`, `pembayaran_hutang`, `kas`, `pembelian`, `promo`, `harga_khusus`, `poin`, `settings`, `requests`, `audit`. Struktur lengkap tercantum di `POS.SCHEMA` pada `core.js`. `Users` mendapat `menus`, `status`, `authVersion`; tabel operasional mendapat `outletId` dan beberapa mendapat `userId`. Data lama tanpa outlet dianggap TKM saat dibaca. Jangan menghapus tab requests karena dipakai untuk menolak pengiriman ulang transaksi.

## Jalankan di GitHub Pages

Repository tujuan sudah ada: `heruarfians/kasirrr`. Perubahan disiapkan berdasarkan branch main yang ada; tidak perlu membuat repository baru.

1. Unggah **isi folder paket ini**, bukan ZIP-nya, ke root repository `kasirrr`. `index.html`, `app.js`, `core.js`, `xlsx.js`, `config.js` dan `style.css` harus berada sejajar di root. File `.nojekyll` ikut disertakan. Tidak ada `.git`, token, password, atau data produksi di paket.
2. Pada repository → Settings → Pages → Build and deployment → Source: **Deploy from a branch** → branch **main** → folder **/(root)** → Save.
3. Tunggu proses Pages berhasil. Baru buka `https://heruarfians.github.io/kasirrr/` dan uji login. Ini target URL; selama publikasi belum berhasil, versi baru belum tersedia di URL itu.
4. Jika versi lama masih tampil, muat ulang paksa atau hapus data situs sekali. Service worker baru mengganti cache lama `omnipos-cache-v1`, menyimpan aset statis saja, dan tidak menyimpan respons API / sesi.

Panduan resmi: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

### Pengembangan

Node.js 18+; tanpa paket npm tambahan.

```sh
npm test
npm run build
```

`build.cjs` menggabungkan `core.js` dan `backend/adapter.js` menjadi `backend/Code.gs`. Sesudah mengubah aturan bisnis, bangun ulang dan redeploy Apps Script. Ekspor XLSX memakai OOXML ZIP sungguhan; teks dimasukkan sebagai inline string agar tidak menjadi formula.

## Aturan operasional

- Menu Pengguna, Pengaturan dan Outlet khusus Admin. Untuk Manager/Kasir, daftar menu lain dapat diatur per akun. Pengguna berperan Admin tidak dapat dibatasi melalui centang menu.
- Pengguna terikat satu outlet. Admin melihat seluruh master pengguna/outlet; catatan operasional dan laporan mengikuti outlet akun yang login. Buat akun Admin per outlet jika perlu mengelola operasional beberapa cabang.
- Kasir tanpa menu Laporan hanya membaca transaksi dan shift sendiri. Mengaktifkan Laporan memberi akses laporan outlet. Hak yang dicabut berlaku pada permintaan API berikutnya; muat ulang agar menu di perangkat segera disesuaikan.
- Akun sendiri dan Admin terakhir dilindungi. Tutup shift sebelum menghapus pengguna atau mengubah nama/outlet. Penghapusan/password baru mencabut akses sesi pada permintaan berikutnya; perubahan role/izin dibaca langsung dari spreadsheet.
- Stok produk adalah batas porsi tersedia, stok bahan dikurangi melalui resep. Pembelian menambah stok bahan, bukan stok porsi produk.
- Harga khusus diterapkan sebelum promo. Satu promo aktif per transaksi; paket mensyaratkan setiap produk terpilih hadir minimal sekali, diskon paket hanya sekali. Diskon manual memerlukan akses menu Promo. Promo dapat dipakai kasir tanpa izin mengedit promo.
- Poin: default 1 poin per Rp10.000 belanja bersih, nilai tukar Rp100/poin. Poin hasil transaksi hutang tidak diperoleh otomatis ketika hutang kemudian lunas. Penukaran tidak boleh melebihi saldo / nilai belanja.
- Pembayaran pelanggan berjenis Hutang membuat piutang; stok tetap berkurang, penjualan tetap masuk laporan. Cicilan dicatat sebagai kas masuk pada tanggal pembayaran, bukan penjualan baru. Pembelian Hutang membuat hutang supplier.
- Kas sistem shift = modal awal + mutasi kas Tunai yang ditautkan ke shift. QRIS/transfer tidak masuk laci tunai. Mutasi di luar shift tetap tercatat dalam laporan kas tetapi tidak masuk rekonsiliasi shift.
- Pendapatan adalah **semua kas masuk tercatat**, termasuk cicilan dan penerimaan manual. Laporan Penjualan per produk menampilkan nilai sebelum diskon. Laba Rugi adalah penjualan bersih termasuk piutang − HPP saat penjualan − beban operasional kas tercatat. Pembelian bahan/pembayaran hutang tidak dibebankan ulang karena biaya persediaan masuk melalui HPP.
- Transaksi lama tidak memiliki HPP historis; laporan menampilkan jumlah transaksi tanpa HPP lengkap. Isi HPP/resep untuk transaksi selanjutnya. Laporan ini belum menghitung penyusutan, pajak, akrual gaji, retur/refund, atau penyesuaian akuntansi lain.

## Batas integrasi dan verifikasi

QRIS **bukan payment gateway otomatis**, WhatsApp **bukan pengiriman otomatis**, dan profil printer **bukan pencetakan diam-diam ke printer Bluetooth/network**. Penggunaan perangkat nyata perlu diuji pada browser dan driver printer masing-masing. Manajemen karyawan adalah master data, belum mencakup absensi atau perhitungan payroll.

Apps Script memakai penguncian, validasi server, request ID, audit dan rollback untuk kesalahan tulis yang terdeteksi. Sheets bukan database transaksional: penghentian paksa/timeout saat menulis dapat meninggalkan perubahan parsial. Cocokkan stok, transaksi dan kas ketika menutup shift; jangan mengedit stok lewat spreadsheet bersamaan dengan transaksi. Sesuaikan dengan kuota dan volume akun Google.

Password disimpan sebagai SHA-256 bersalt agar kompatibel dengan data lama; ini bukan KDF lambat. Gunakan password panjang unik dan lindungi akses edit spreadsheet. Semua akses akun/data aplikasi harus melalui HTTPS dan token sesi (maksimal 6 jam, cache bisa berakhir lebih cepat).

Browser demo diuji untuk login, pemisahan menu Admin/Kasir, ganti akun, shift dan pembayaran/struk. Unit test memeriksa aturan akses, outlet, harga/promo/poin, hutang, persediaan, laporan, pencabutan sesi dan ekspor. Halaman login GitHub Pages juga sudah diverifikasi. Koneksi Google Sheets produksi, pembayaran sungguhan, printer fisik, dan WhatsApp terkirim tetap memerlukan verifikasi setelah pemasangan akun pemilik.

