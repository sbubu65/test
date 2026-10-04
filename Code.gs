/**
 * Asset Audit — Backend Google Apps Script (V0.5)
 *
 * Fungsi: menerima data audit dari web Asset Audit (POST) dan menambahkannya sebagai
 * satu baris di sheet "Audit" pada Google Spreadsheet.
 *
 * Cara pasang: Spreadsheet -> Extensions -> Apps Script -> tempel seluruh isi file ini.
 * Deploy -> New deployment -> Web app -> Execute as: Me, Who has access: Anyone.
 * (Panduan lengkap ada di README.md.)
 *
 * Catatan keamanan:
 *  - Tidak ada API key/secret di frontend maupun di file ini.
 *  - Semua data divalidasi di sini; hanya field yang dikenal yang disimpan.
 *  - Nilai audit DIHITUNG ULANG di sini dari checklist, nilai dari frontend diabaikan.
 *  - Web App "Anyone" berarti siapa pun yang tahu URL-nya bisa mengirim data. Validasi di bawah
 *    membatasi isi yang bisa masuk, tetapi ini BUKAN pengganti login (login belum ada di V0.5).
 *
 * Opsional: jika script ini TIDAK dibuat dari menu Extensions milik spreadsheet-nya, isi
 * Project Settings -> Script Properties dengan SPREADSHEET_ID = <ID spreadsheet>.
 */

/* ================== KONFIGURASI ================== */

var SHEET_NAME = 'Audit';

// Urutan kolom di sheet. JANGAN diubah urutannya tanpa mengubah header di spreadsheet.
var HEADERS = [
  'auditId', 'assetId', 'deviceType', 'auditor', 'auditDate',
  'brand', 'model', 'serialNumber', 'processor', 'ram', 'storage', 'operatingSystem', 'gpu',
  'checklistResult',
  'windowsStatus', 'windowsVersion', 'windowsNote',
  'officeStatus', 'officeVersion', 'officeNote',
  'antivirusStatus', 'antivirusName', 'antivirusNote',
  'totalItems', 'okCount', 'notOkCount', 'naCount', 'itemsCounted', 'score', 'condition',
  'status', 'createdAt'
];

var NUMBER_COLUMNS = { totalItems: '0', okCount: '0', notOkCount: '0', naCount: '0', itemsCounted: '0', score: '0.00' };

var ALLOWED_DEVICE_TYPES = ['Laptop']; // tambah 'Smartphone', 'Tablet', 'iMac' saat audit-nya dibuat
var VALID_STATUS = ['OK', 'Tidak OK', 'N/A'];
var UNRATED = 'Belum dapat dinilai';
var MAX_BODY_CHARS = 60000;
var MAX_CHECKLIST_ITEMS = 60;

// Kategori kondisi (sama dengan js/utils/scoring.js di frontend)
var CATEGORIES = [
  { min: 80, label: 'Baik' },
  { min: 60, label: 'Cukup' },
  { min: 40, label: 'Rusak Ringan' },
  { min: 0,  label: 'Rusak Berat' }
];

var AUDIT_ID_PATTERN = /^AUD-\d{8}-[A-Z0-9]{6,12}$/;

/* ================== ENDPOINT ================== */

/** GET: cek bahwa API aktif (buka URL Web App di browser). Pembacaan data audit dikerjakan di V0.6. */
function doGet(e) {
  return jsonResponse_({ success: true, message: 'Asset Audit API aktif', version: 'V0.5' });
}

/** POST: simpan satu audit. Body = JSON (dikirim sebagai text/plain agar tidak kena preflight CORS). */
function doPost(e) {
  var lock = LockService.getScriptLock();
  var locked = false;
  try {
    var payload = parseBody_(e);
    var audit = validateAudit_(payload);

    // Kunci agar dua request bersamaan dengan auditId sama tidak sama-sama lolos cek duplicate
    locked = lock.tryLock(15000);
    if (!locked) return jsonResponse_({ success: false, message: 'Server sedang sibuk. Coba lagi.' });

    var sheet = getAuditSheet_();

    if (findAuditRow_(sheet, audit.auditId) > 0) {
      return jsonResponse_({ success: true, message: 'Audit sudah tersimpan', duplicate: true, auditId: audit.auditId });
    }

    appendAuditRow_(sheet, audit);
    return jsonResponse_({ success: true, message: 'Audit berhasil disimpan', auditId: audit.auditId });

  } catch (err) {
    if (err && err.isUserError) return jsonResponse_({ success: false, message: err.message });
    Logger.log('doPost error: ' + (err && err.stack ? err.stack : err)); // detail teknis hanya di log
    return jsonResponse_({ success: false, message: 'Gagal menyimpan audit' });
  } finally {
    if (locked) lock.releaseLock();
  }
}

/* ================== VALIDASI ================== */

function userError_(message) {
  var err = new Error(message);
  err.isUserError = true;
  return err;
}

function parseBody_(e) {
  if (!e || !e.postData || typeof e.postData.contents !== 'string') throw userError_('Data audit tidak diterima.');
  if (e.postData.contents.length > MAX_BODY_CHARS) throw userError_('Data audit terlalu besar.');
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    throw userError_('Format data tidak valid.');
  }
}

function text_(value, max) {
  if (value === undefined || value === null) return '';
  var s = String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  return s.length > max ? s.substring(0, max) : s;
}

// Teks bebas yang diawali = + - @ diberi awalan ' agar tidak pernah dibaca sebagai rumus spreadsheet.
function safe_(s) {
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function free_(value, max) {
  return safe_(text_(value, max));
}

function required_(value, label, max) {
  var s = text_(value, max);
  if (!s) throw userError_('Data wajib belum lengkap: ' + label + '.');
  return safe_(s);
}

function status_(value, label) {
  var s = text_(value, 20);
  if (VALID_STATUS.indexOf(s) < 0) throw userError_('Status tidak valid: ' + label + '.');
  return s;
}

function date_(value) {
  var s = text_(value, 10);
  var d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T00:00:00Z') : null;
  if (!d || isNaN(d.getTime()) || d.toISOString().substring(0, 10) !== s) throw userError_('Tanggal audit tidak valid.');
  return s;
}

function createdAt_(value) {
  var t = Date.parse(value);
  var now = Date.now();
  if (isNaN(t) || t > now + 86400000 || t < Date.UTC(2020, 0, 1)) return new Date(now).toISOString();
  return new Date(t).toISOString();
}

function cleanChecklist_(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw userError_('Checklist tidak valid.');
  var keys = Object.keys(obj);
  if (keys.length === 0 || keys.length > MAX_CHECKLIST_ITEMS) throw userError_('Checklist tidak valid.');
  var clean = {};
  keys.forEach(function (k) {
    var label = text_(k, 60);
    if (!label) throw userError_('Checklist tidak valid.');
    clean[label] = status_(obj[k], label);
  });
  return clean;
}

/**
 * Validasi + normalisasi satu audit. Hasilnya objek dengan kunci = nama kolom (HEADERS).
 * Hanya field yang dikenal yang dibaca; field lain dari request diabaikan.
 */
function validateAudit_(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) throw userError_('Format data tidak valid.');

  var a = {};
  a.auditId = text_(p.auditId, 40);
  if (!AUDIT_ID_PATTERN.test(a.auditId)) throw userError_('auditId tidak valid.');

  a.assetId = required_(p.assetId, 'Asset ID', 50);
  a.deviceType = text_(p.deviceType, 30);
  if (ALLOWED_DEVICE_TYPES.indexOf(a.deviceType) < 0) throw userError_('Device Type tidak didukung.');
  a.auditor = required_(p.auditor, 'Nama Auditor', 100);
  a.auditDate = date_(p.auditDate);

  a.brand = free_(p.brand, 100);
  a.model = free_(p.model, 100);
  a.serialNumber = free_(p.serialNumber, 100);
  a.processor = free_(p.processor, 100);
  a.ram = free_(p.ram, 50);
  a.storage = free_(p.storage, 100);
  a.operatingSystem = free_(p.operatingSystem, 100);
  a.gpu = free_(p.gpu, 100);

  var checklist = cleanChecklist_(p.checklistResult);
  a.checklistResult = JSON.stringify(checklist);

  a.windowsStatus = status_(p.windowsStatus, 'Windows');
  a.windowsVersion = free_(p.windowsVersion, 100);
  a.windowsNote = free_(p.windowsNote, 500);
  a.officeStatus = status_(p.officeStatus, 'Microsoft Office');
  a.officeVersion = free_(p.officeVersion, 100);
  a.officeNote = free_(p.officeNote, 500);
  a.antivirusStatus = status_(p.antivirusStatus, 'Antivirus');
  a.antivirusName = free_(p.antivirusName, 100);
  a.antivirusNote = free_(p.antivirusNote, 500);

  // Item yang dinilai = semua item checklist + status Windows, Office, Antivirus
  // (sama dengan item "scored" di frontend). Nilai dari frontend sengaja tidak dipakai.
  var statuses = Object.keys(checklist).map(function (k) { return checklist[k]; })
    .concat([a.windowsStatus, a.officeStatus, a.antivirusStatus]);
  var r = calculateScore_(statuses);
  a.totalItems = r.total;
  a.okCount = r.ok;
  a.notOkCount = r.notOk;
  a.naCount = r.na;
  a.itemsCounted = r.counted;
  a.score = r.score;
  a.condition = r.condition;

  a.status = 'Selesai';
  a.createdAt = createdAt_(p.createdAt);
  return a;
}

/* ================== SCORING (aturan sama dengan frontend) ================== */

function categoryByCounts_(ok, counted) {
  for (var i = 0; i < CATEGORIES.length; i++) {
    if (ok * 100 >= CATEGORIES[i].min * counted) return CATEGORIES[i];
  }
  return CATEGORIES[CATEGORIES.length - 1];
}

function categoryByHundredths_(h) {
  for (var i = 0; i < CATEGORIES.length; i++) {
    if (h >= CATEGORIES[i].min * 100) return CATEGORIES[i];
  }
  return CATEGORIES[CATEGORIES.length - 1];
}

/** Nilai = OK / (OK + Tidak OK) x 100. N/A tidak dihitung. Jika OK + Tidak OK = 0 -> "Belum dapat dinilai". */
function calculateScore_(statuses) {
  var ok = 0, notOk = 0, na = 0;
  statuses.forEach(function (s) {
    if (s === 'OK') ok++;
    else if (s === 'Tidak OK') notOk++;
    else if (s === 'N/A') na++;
  });
  var counted = ok + notOk;
  var result = { total: statuses.length, ok: ok, notOk: notOk, na: na, counted: counted };

  if (counted === 0) {
    result.score = UNRATED;
    result.condition = UNRATED;
    return result;
  }

  // Pembulatan 2 desimal; tidak boleh "naik kelas" karena pembulatan (mis. 79.998 -> 79.99)
  var exact = (ok * 10000) / counted;
  var h = Math.round(exact);
  var cat = categoryByCounts_(ok, counted);
  if (categoryByHundredths_(h) !== cat) h = Math.floor(exact);

  result.score = h / 100;
  result.condition = cat.label;
  return result;
}

/* ================== SPREADSHEET ================== */

function getAuditSheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  var ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Spreadsheet tidak ditemukan. Isi Script Property SPREADSHEET_ID.');

  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) { // sheet kosong: tulis header otomatis
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  } else {
    var header = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
    for (var i = 0; i < HEADERS.length; i++) {
      if (String(header[i]) !== HEADERS[i]) {
        Logger.log('Header kolom ' + (i + 1) + ' harus "' + HEADERS[i] + '" tetapi "' + header[i] + '"');
        throw userError_('Struktur sheet Audit tidak sesuai. Hubungi admin.');
      }
    }
  }
  return sheet;
}

/** Cari baris berdasarkan auditId (kolom A). Return nomor baris, atau 0 jika tidak ada. */
function findAuditRow_(sheet, auditId) {
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === auditId) return i + 2;
  }
  return 0;
}

function appendAuditRow_(sheet, audit) {
  var row = sheet.getLastRow() + 1;
  var range = sheet.getRange(row, 1, 1, HEADERS.length);
  // Kolom teks diformat "plain text" dulu agar serial number seperti 00123 tidak berubah jadi angka
  range.setNumberFormats([HEADERS.map(function (h) { return NUMBER_COLUMNS[h] || '@'; })]);
  range.setValues([HEADERS.map(function (h) { return audit[h]; })]);
  SpreadsheetApp.flush();
}

/* ================== UTIL ================== */

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
