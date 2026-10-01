# Asset Audit — V0.2

Aplikasi audit perangkat perusahaan. V0.2: **Audit Laptop** (form, cek fisik, cek lisensi, review, simpan).
Tanpa backend, database, API, atau login. Data audit disimpan sementara di `localStorage` browser.

## Cara menjalankan
Buka `index.html` langsung di browser (klik dua kali). Tidak perlu server.

## Alur V0.2
Dashboard → Mulai Audit → Laptop → Identitas → Spesifikasi → Cek Fisik → Lisensi → Review → Simpan Audit → Audit Selesai → Riwayat Audit

## Struktur
- `index.html` — kerangka halaman + urutan pemuatan script
- `css/` — `base.css` (warna, font), `layout.css` (header, menu), `components.css` (kartu, tombol, tabel, form audit)
- `js/config.js` — nama app, versi, menu, halaman tersembunyi, jenis perangkat
- `js/data/`
  - `dummy-data.js` — data dummy Dashboard (V0.1)
  - `audit-storage.js` — baca/tulis audit tersimpan (localStorage)
  - `audit-draft.js` — draft audit yang sedang diisi (memori)
- `js/utils/` — `dom.js` (escape HTML), `date.js` (tanggal)
- `js/components/` — `icons.js`, `stat-card.js`, `data-table.js`, `audit-wizard.js` (form audit untuk semua perangkat)
- `js/audit-defs/` — `common.js` (bagian umum), `laptop.js` (isi form Audit Laptop)
- `js/pages/` — `dashboard`, `start-audit`, `history`, `audit-laptop`, `audit-done`
- `js/router.js`, `js/app.js` — navigasi & titik masuk

## Menambah audit perangkat lain (Smartphone, Tablet, iMac)
1. Salin `js/audit-defs/laptop.js` → ubah isi step/checklist-nya
2. Salin `js/pages/audit-laptop.js` → arahkan ke definisi baru
3. `js/config.js`: tambah rute tersembunyi dan isi `auditRoute` pada perangkat tersebut
4. `index.html`: tambah dua `<script>` baru
Komponen `audit-wizard.js`, penyimpanan, Review, dan Riwayat tidak perlu diubah.
