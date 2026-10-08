# Asset Audit — V0.7

Aplikasi audit perangkat perusahaan. V0.7: **Audit Laptop dan Audit Smartphone** dengan scoring otomatis, pengiriman audit ke Google Spreadsheet, dan **Riwayat yang dibaca dari Spreadsheet** (cari, filter, urutkan, pagination, Refresh) dengan localStorage sebagai cache/cadangan.
Tanpa backend, database, API, atau login. Data audit disimpan sementara di `localStorage` browser.

## Cara menjalankan
Buka `index.html` langsung di browser (klik dua kali). Tidak perlu server.

## Scoring
Nilai Audit = OK ÷ (OK + Tidak OK) × 100. N/A tidak dihitung. Selalu tampil 2 desimal (83.33%). Jika tidak ada item yang dihitung -> "Belum dapat dinilai".
80–100 Baik · 60–79 Cukup · 40–59 Rusak Ringan · 0–39 Rusak Berat.
Item yang dinilai = section berlabel `scored: true` di `js/audit-defs/*.js` (Laptop: Cek Fisik + Lisensi).
Semua perhitungan ada di satu tempat: `js/utils/scoring.js`. Uji rumus: `node tests/scoring.test.js`.


## Setup Google Spreadsheet (V0.5, tetap berlaku di V0.6)

Yang masuk ke Apps Script HANYA `apps-script/Code.gs`. Seluruh file lain (index.html, css/, js/) tetap di GitHub / hosting web Anda.

1. Buat Google Spreadsheet baru.
2. (Opsional) Buat sheet bernama `Audit`. Jika dilewati, script membuatnya otomatis.
3. Header: biarkan sheet kosong dan script menulis 32 header otomatis, ATAU isi sendiri persis seperti urutan `HEADERS` di `Code.gs`
   (auditId, assetId, deviceType, auditor, auditDate, brand, model, serialNumber, processor, ram, storage, operatingSystem, gpu,
   checklistResult, windowsStatus, windowsVersion, windowsNote, officeStatus, officeVersion, officeNote, antivirusStatus, antivirusName,
   antivirusNote, totalItems, okCount, notOkCount, naCount, itemsCounted, score, condition, status, createdAt).
   Jika header sudah ada tetapi berbeda, audit ditolak agar kolom tidak bergeser.
4. Buka **Extensions → Apps Script**.
5. Hapus kode bawaan, tempel seluruh isi `apps-script/Code.gs`, lalu Save.
6. **Deploy → New deployment → Web app**. Execute as: **Me**. Who has access: **Anyone**. Deploy lalu setujui izin akses.
7. Salin **Web app URL** (berakhiran `/exec`). Buka URL itu di browser: harus muncul `{"success":true,"message":"Asset Audit API aktif",...}`.
8. Tempel URL di `js/config.js` pada `api.API_URL` (satu-satunya tempat), lalu upload ulang `config.js` ke GitHub.
9. Uji: buat satu audit, Submit. Baris baru harus muncul di sheet `Audit`, dan Hasil Audit menampilkan "Tersimpan ke Spreadsheet".

Setiap kali `Code.gs` diubah: **Deploy → Manage deployments → Edit → Version: New version → Deploy** (URL tetap sama).

Uji logika Apps Script (Spreadsheet tiruan): `node tests/apps-script.test.js`

## Update ke V0.7 (Audit Smartphone)

1. **Apps Script**: tempel ulang seluruh `apps-script/Code.gs`, lalu **Deploy → Manage deployments → pensil → Version: New version → Deploy**.
   Sheet `Audit` lama (32 kolom) TIDAK perlu diubah manual: 9 kolom baru (imei1, imei2, osVersion, batteryCapacity, color, batteryHealth,
   requiredApps, checklistNotes, checklistValues) ditambahkan otomatis di sebelah kanan saat audit berikutnya dikirim. Data lama tetap utuh.
2. **GitHub**: upload file baru/diubah. `js/config.js` TIDAK perlu ditimpa (versi di `js/version.js`; Smartphone didaftarkan oleh `js/audit-defs/smartphone.js`).
3. Uji: `node tests/defs.test.js`, `node tests/apps-script.test.js`, `node tests/scoring.test.js`.

### Smartphone
- Langkah: Identitas → Spesifikasi → Physical Checklist (6 grup, 21 item) → Baterai & SIM → Biometrik & Software → Review.
- Wajib: Asset ID, Auditor, Tanggal, Serial Number (3–40 karakter), IMEI 1 (15 digit). IMEI 2 opsional (kosongkan jika single SIM; tidak boleh sama dengan IMEI 1).
- Fitur yang tidak dimiliki perangkat -> pilih **N/A** (tidak mengurangi nilai). Jangan memasukkan password/PIN.
- Required Application: daftar baris yang bisa ditambah/dihapus (maks. 10): nama, status, versi, catatan. Boleh kosong.
- Scoring memakai `js/utils/scoring.js` yang sama dengan Laptop.

### Menambah perangkat lain (Tablet, iMac)
1. Salin `js/audit-defs/smartphone.js` -> ubah isi; panggil `AA.registerDevice(def, "audit-<nama>")` di akhir file.
2. Tambah `<script>` file itu di `index.html` (setelah `laptop.js`).
3. `apps-script/Code.gs`: tambahkan perangkat di `DEVICE_RULES` (dan kolom khusus jika perlu), lalu deploy versi baru.
4. Jalankan `node tests/defs.test.js` (mengecek id ganda, kunci Spreadsheet ganda, dan kolom yang tidak ada).
Wizard, Review, Hasil, sinkronisasi, dan Riwayat tidak perlu diubah.

## Update ke V0.6 (Riwayat dari Spreadsheet)

1. **Apps Script**: tempel ulang seluruh `apps-script/Code.gs` yang baru (menambah `doGet` untuk membaca data; `doPost` tidak berubah),
   lalu **Deploy → Manage deployments → ikon pensil → Version: New version → Deploy**. URL Web App tetap sama.
   Cek: buka `URL_ANDA/exec?action=ping` -> `"Asset Audit API aktif"`, dan `URL_ANDA/exec?action=list` -> `{"success":true,"data":[...]}`.
2. **GitHub**: upload file baru/diubah. `js/config.js` TIDAK perlu ditimpa (versi aplikasi diatur di `js/version.js`).
3. Endpoint GET: `?action=list` (daftar, maksimal 2000 audit terbaru), `?action=get&auditId=AUD-...` (satu audit, dicari berdasarkan auditId, bukan nomor baris), `?action=ping`.
4. Peringatan: Web App "Anyone" berarti siapa pun yang tahu URL-nya dapat MEMBACA seluruh data audit. Jangan sebarkan URL-nya.

Perilaku Riwayat: tampil dari cache/lokal lebih dulu, lalu mengambil data terbaru dari Spreadsheet (tidak diulang jika baru diambil <30 detik lalu). Jika gagal:
"Gagal mengambil data terbaru. Menampilkan data lokal." Filter **Status**: "Selesai" = audit selesai yang sudah tersinkron; "Belum Sinkron" = audit di perangkat ini yang belum terkirim.
"7 hari terakhir" = 7 hari termasuk hari ini; "30 hari terakhir" = 30 hari termasuk hari ini.

## Alur
Dashboard → Mulai Audit → Laptop → Identitas → Spesifikasi → Cek Fisik → Lisensi → Review → Submit Audit → Hasil Audit → Riwayat Audit → (klik baris) Detail Audit

## Struktur
- `index.html` — kerangka halaman + urutan pemuatan script
- `css/` — `base.css` (warna, font), `layout.css` (header, menu), `components.css` (kartu, tombol, tabel, form audit)
- `js/config.js` — nama app, versi, menu, halaman tersembunyi, jenis perangkat
- `apps-script/Code.gs` — backend Google Apps Script (tempel ke Apps Script, BUKAN ke GitHub Pages)
- `js/data/`
  - `dummy-data.js` — data dummy Dashboard (V0.1)
  - `audit-storage.js` — baca/tulis audit tersimpan (localStorage). Field record: id, assetId, deviceType, auditor, tanggal, specifications, checklist, license, scoring, condition, status, createdAt (+ `data` = salinan lengkap per section)
  - `audit-draft.js` — draft audit yang sedang diisi (memori)
  - `audit-api.js` — kirim audit ke Apps Script (URL dari `config.js`)
  - `audit-sync.js` — status sinkronisasi + kirim ulang
  - `audit-history.js` — sumber data Riwayat: Spreadsheet + cache + lokal, tanpa duplikat (kunci auditId)
- `js/utils/` — `dom.js` (escape HTML), `date.js` (tanggal), `scoring.js` (rumus nilai & kondisi)
- `js/components/` — `icons.js`, `stat-card.js`, `data-table.js`, `score-card.js` (kartu nilai), `audit-result.js` (Hasil Audit / Detail Audit), `audit-review.js` (daftar data audit yang dipakai Review dan Detail), `audit-wizard.js` (form audit untuk semua perangkat)
- `js/audit-defs/` — `common.js` (bagian umum, validator, `registerDevice`), `laptop.js`, `smartphone.js` (isi form per perangkat)
- `js/pages/` — `dashboard`, `start-audit`, `history`, `audit-laptop`, `audit-done`, `audit-detail`
- `tests/scoring.test.js`, `tests/apps-script.test.js`, `tests/defs.test.js` — uji rumus scoring dan logika Apps Script (Node, tanpa library)
- `js/router.js`, `js/app.js` — navigasi & titik masuk

## Menambah audit perangkat lain (Smartphone, Tablet, iMac)
1. Salin `js/audit-defs/laptop.js` → ubah isi step/checklist-nya
2. Salin `js/pages/audit-laptop.js` → arahkan ke definisi baru
3. `js/config.js`: tambah rute tersembunyi dan isi `auditRoute` pada perangkat tersebut
4. `index.html`: tambah dua `<script>` baru
Beri `scored: true` pada section yang ikut dinilai. Komponen `audit-wizard.js`, `scoring.js`, penyimpanan, Review, dan Riwayat tidak perlu diubah.
