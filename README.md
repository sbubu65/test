# Asset Audit — V0.1

Kerangka UI aplikasi audit perangkat (laptop, smartphone, tablet, iMac).
Tanpa backend, tanpa database, tanpa login. Data masih dummy.

## Cara menjalankan
Buka `index.html` langsung di browser (klik dua kali). Tidak perlu server.

## Struktur
- `index.html` — kerangka halaman + urutan pemuatan script
- `css/` — `base.css` (warna, font), `layout.css` (header, menu), `components.css` (kartu, tombol, tabel)
- `js/config.js` — nama app, versi, daftar menu, daftar jenis perangkat
- `js/data/dummy-data.js` — data dummy (nanti diganti sumber data nyata)
- `js/utils/` — fungsi bantu
- `js/components/` — komponen UI yang dipakai ulang (ikon, kartu statistik, tabel)
- `js/pages/` — satu file per halaman
- `js/router.js`, `js/app.js` — navigasi & titik masuk

## Menambah halaman baru
1. Tambah satu baris di `routes` pada `js/config.js`
2. Buat `js/pages/nama-halaman.js` (daftar ke `AssetAudit.pages["id"]`)
3. Tambah `<script>` baru di `index.html` sebelum `router.js`
