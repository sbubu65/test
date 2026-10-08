/**
 * Asset Audit — Backend Google Apps Script (V0.7)
 *
 * Fungsi:
 *  - POST : menerima data audit dari web Asset Audit dan menambahkannya sebagai satu baris di sheet "Audit".
 *  - GET  : ?action=ping (cek API aktif) | ?action=list (daftar audit) | ?action=get&auditId=... (satu audit).
 *
 * Perangkat yang didukung: Laptop dan Smartphone (aturan per perangkat ada di DEVICE_RULES).
 * Sheet "Audit" lama (32 kolom, V0.5/V0.6) TIDAK perlu diubah manual: kolom tambahan V0.7 ditambahkan
 * otomatis di sebelah kanan saat audit pertama dikirim. Data lama tetap utuh.
 *
 * Cara pasang: Spreadsheet -> Extensions -> Apps Script -> tempel seluruh isi file ini.
 * Deploy -> New deployment -> Web app -> Execute as: Me, Who has access: Anyone.
 * (Panduan lengkap ada di README.md.)
 *
 * Catatan keamanan:
 *  - Tidak ada API key/secret di frontend maupun di file ini.
 *  - Semua data divalidasi di sini; hanya field yang dikenal yang disimpan.
 *  - Nilai audit DIHITUNG ULANG di sini dari checklist, nilai dari frontend diabaikan.
 *  - Web App "Anyone" berarti siapa pun yang tahu URL-nya bisa MENGIRIM data dan, sejak V0.6, juga
 *    MEMBACA daftar audit (?action=list). Validasi membatasi isi yang bisa masuk, tetapi ini BUKAN
 *    pengganti login (belum ada). Jangan membagikan URL Web App ini.
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
  'status', 'createdAt',
  // ---- Kolom tambahan V0.7 (ditambahkan di kanan; kosong untuk audit Laptop) ----
  'imei1', 'imei2', 'osVersion', 'batteryCapacity', 'color', 'batteryHealth',
  'requiredApps',     // JSON: [ { name, status, version, note } ]
  'checklistNotes',   // JSON: { "kunci item": "catatan" }
  'checklistValues'   // JSON: { "kunci item": "isian tambahan, mis. security patch level" }
];

var BASE_HEADER_COUNT = 32; // kolom V0.5/V0.6 (harus persis sama). Kolom setelahnya boleh belum ada di sheet lama.

var NUMBER_COLUMNS = { totalItems: '0', okCount: '0', notOkCount: '0', naCount: '0', itemsCounted: '0', score: '0.00' };

// Aturan per jenis perangkat. Tambahkan 'Tablet' / 'iMac' di sini saat audit-nya dibuat.
//   license: true  -> status Windows, Office, Antivirus wajib ada dan ikut dinilai (khusus Laptop)
//   mobile:  true  -> field khusus smartphone (IMEI, OS version, baterai, aplikasi) dibaca; Serial Number & IMEI 1 wajib
var DEVICE_RULES = {
  'Laptop':     { license: true,  mobile: false },
  'Smartphone': { license: false, mobile: true }
};

// Aturan format (sama dengan validator di js/audit-defs/common.js)
var IMEI_PATTERN = /^\d{15}$/;
var SERIAL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._\/-]{2,39}$/;
var MAX_APPS = 10;
var VALID_STATUS = ['OK', 'Tidak OK', 'N/A'];
var UNRATED = 'Belum dapat dinilai';
var MAX_BODY_CHARS = 60000;
var MAX_CHECKLIST_ITEMS = 60;
var MAX_LIST_ROWS = 2000; // batas jumlah audit yang dikembalikan oleh ?action=list (terbaru dulu)

// Kategori kondisi (sama dengan js/utils/scoring.js di frontend)
var CATEGORIES = [
  { min: 80, label: 'Baik' },
  { min: 60, label: 'Cukup' },
  { min: 40, label: 'Rusak Ringan' },
  { min: 0,  label: 'Rusak Berat' }
];

var AUDIT_ID_PATTERN = /^AUD-\d{8}-[A-Z0-9]{6,12}$/;

/* ================== ENDPOINT ================== */

/**
 * GET. Parameter:
 *   (kosong) atau action=ping  -> cek API aktif
 *   action=list                -> { success, data: [audit, ...] }  terbaru dulu
 *   action=get&auditId=XXXX    -> { success, data: audit }
 * Detail dicari berdasarkan auditId, BUKAN nomor baris spreadsheet.
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    var action = text_(params.action, 20) || 'ping';

    if (action === 'ping') {
      return jsonResponse_({ success: true, message: 'Asset Audit API aktif', version: 'V0.7' });
    }
    if (action === 'list') {
      return jsonResponse_({ success: true, data: getAudits() });
    }
    if (action === 'get') {
      var audit = getAuditById(params.auditId);
      if (!audit) return jsonResponse_({ success: false, message: 'Audit tidak ditemukan.' });
      return jsonResponse_({ success: true, data: audit });
    }
    return jsonResponse_({ success: false, message: 'Aksi tidak dikenal.' });

  } catch (err) {
    if (err && err.isUserError) return jsonResponse_({ success: false, message: err.message });
    Logger.log('doGet error: ' + (err && err.stack ? err.stack : err));
    return jsonResponse_({ success: false, message: 'Gagal mengambil data audit' });
  }
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

    var sheet = getAuditSheet_(true);

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

// Peta kecil { kunci: teks } untuk checklistNotes / checklistValues: hanya kunci yang ada di checklist.
function cleanTextMap_(obj, allowedKeys, max) {
  var clean = {};
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return clean;
  Object.keys(obj).forEach(function (k) {
    var key = text_(k, 60);
    var value = text_(obj[k], max); // di dalam JSON: tanpa awalan pengaman rumus (sel diawali '{')
    if (value && allowedKeys.indexOf(key) >= 0) clean[key] = value;
  });
  return clean;
}

// Daftar aplikasi wajib (smartphone): [ { name, status, version, note } ], maksimal MAX_APPS.
function cleanApps_(list) {
  if (list === undefined || list === null || list === '') return [];
  if (!Array.isArray(list) || list.length > MAX_APPS) throw userError_('Daftar aplikasi tidak valid.');
  return list.map(function (item, i) {
    if (!item || typeof item !== 'object') throw userError_('Daftar aplikasi tidak valid.');
    var name = text_(item.name, 100);
    if (!name) throw userError_('Nama aplikasi baris ' + (i + 1) + ' wajib diisi.');
    return { name: name, status: status_(item.status, 'Aplikasi ' + name), version: text_(item.version, 50), note: text_(item.note, 500) };
  });
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
  var rules = DEVICE_RULES[a.deviceType];
  if (!rules) throw userError_('Device Type tidak didukung.');
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

  // Kolom khusus smartphone: kosong untuk perangkat lain
  a.imei1 = a.imei2 = a.osVersion = a.batteryCapacity = a.color = a.batteryHealth = '';
  var apps = [];
  if (rules.mobile) {
    var serial = text_(p.serialNumber, 100);
    if (!SERIAL_PATTERN.test(serial)) throw userError_('Serial Number tidak valid.');
    var imei1 = text_(p.imei1, 20);
    if (!IMEI_PATTERN.test(imei1)) throw userError_('IMEI 1 harus 15 digit angka.');
    var imei2 = text_(p.imei2, 20);
    if (imei2 && !IMEI_PATTERN.test(imei2)) throw userError_('IMEI 2 harus 15 digit angka.');
    if (imei2 && imei2 === imei1) throw userError_('IMEI 2 tidak boleh sama dengan IMEI 1.');
    a.imei1 = imei1;
    a.imei2 = imei2;
    a.osVersion = free_(p.osVersion, 50);
    a.batteryCapacity = free_(p.batteryCapacity, 50);
    a.color = free_(p.color, 50);
    a.batteryHealth = free_(p.batteryHealth, 50);
    apps = cleanApps_(p.requiredApps);
  }

  var checklist = cleanChecklist_(p.checklistResult);
  var checklistKeys = Object.keys(checklist);
  a.checklistResult = JSON.stringify(checklist);
  var notes = cleanTextMap_(p.checklistNotes, checklistKeys, 500);
  var values = cleanTextMap_(p.checklistValues, checklistKeys, 200);
  a.checklistNotes = Object.keys(notes).length ? JSON.stringify(notes) : '';
  a.checklistValues = Object.keys(values).length ? JSON.stringify(values) : '';
  a.requiredApps = apps.length ? JSON.stringify(apps) : '';

  // Status lisensi: hanya untuk perangkat yang memakainya (Laptop); kosong untuk lainnya
  a.windowsStatus = a.officeStatus = a.antivirusStatus = '';
  a.windowsVersion = a.windowsNote = a.officeVersion = a.officeNote = a.antivirusName = a.antivirusNote = '';
  var licenseStatuses = [];
  if (rules.license) {
    a.windowsStatus = status_(p.windowsStatus, 'Windows');
    a.windowsVersion = free_(p.windowsVersion, 100);
    a.windowsNote = free_(p.windowsNote, 500);
    a.officeStatus = status_(p.officeStatus, 'Microsoft Office');
    a.officeVersion = free_(p.officeVersion, 100);
    a.officeNote = free_(p.officeNote, 500);
    a.antivirusStatus = status_(p.antivirusStatus, 'Antivirus');
    a.antivirusName = free_(p.antivirusName, 100);
    a.antivirusNote = free_(p.antivirusNote, 500);
    licenseStatuses = [a.windowsStatus, a.officeStatus, a.antivirusStatus];
  }

  // Item yang dinilai = semua item di checklistResult + status lisensi (Laptop) + status tiap aplikasi (Smartphone).
  // Sama dengan item "scored" di frontend. Nilai dari frontend sengaja tidak dipakai.
  var statuses = checklistKeys.map(function (k) { return checklist[k]; })
    .concat(licenseStatuses)
    .concat(apps.map(function (app) { return app.status; }));
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

/**
 * Ambil sheet "Audit". create = true (untuk POST): buat sheet/header jika belum ada.
 * create = false (untuk GET): tidak mengubah apa pun; return null jika sheet belum ada.
 */
function getAuditSheet_(create) {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  var ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Spreadsheet tidak ditemukan. Isi Script Property SPREADSHEET_ID.');

  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    if (!create) return null;
    sheet = ss.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) { // sheet kosong
    if (create) {
      if (sheet.getMaxColumns() < HEADERS.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), HEADERS.length - sheet.getMaxColumns());
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      sheet.setFrozenRows(1);
    }
  } else {
    checkHeader_(sheet);
    if (create) addMissingHeaders_(sheet);
  }
  return sheet;
}

// Header sheet: 32 kolom pertama HARUS persis sama; kolom tambahan V0.7 boleh belum ada (kosong) atau persis sama.
function readHeader_(sheet) {
  var width = Math.min(HEADERS.length, sheet.getMaxColumns());
  var header = sheet.getRange(1, 1, 1, width).getValues()[0];
  while (header.length < HEADERS.length) header.push('');
  return header;
}

function checkHeader_(sheet) {
  var header = readHeader_(sheet);
  for (var i = 0; i < HEADERS.length; i++) {
    var actual = String(header[i]);
    if (actual === HEADERS[i]) continue;
    if (i >= BASE_HEADER_COUNT && actual === '') continue; // kolom tambahan belum dibuat
    Logger.log('Header kolom ' + (i + 1) + ' harus "' + HEADERS[i] + '" tetapi "' + actual + '"');
    throw userError_('Struktur sheet Audit tidak sesuai. Hubungi admin.');
  }
}

// Sheet lama (32 kolom): tambahkan header kolom baru di kanan. Data lama tidak disentuh.
function addMissingHeaders_(sheet) {
  if (sheet.getMaxColumns() < HEADERS.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), HEADERS.length - sheet.getMaxColumns());
  var header = readHeader_(sheet);
  var changed = false;
  for (var i = BASE_HEADER_COUNT; i < HEADERS.length; i++) {
    if (String(header[i]) === '') { header[i] = HEADERS[i]; changed = true; }
  }
  if (changed) sheet.getRange(1, 1, 1, HEADERS.length).setValues([header.slice(0, HEADERS.length)]);
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

/* ================== MEMBACA DATA (GET) ================== */

function isDate_(v) {
  return Object.prototype.toString.call(v) === '[object Date]';
}

// Satu sel -> nilai bersih untuk JSON
function cell_(header, v) {
  if (v === null || v === undefined) return '';
  if (isDate_(v)) { // jika seseorang mengetik tanggal manual dan sheet mengubahnya jadi Date
    return header === 'auditDate'
      ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : v.toISOString();
  }
  if (typeof v === 'string') {
    if (NUMBER_COLUMNS[header] && v !== '' && !isNaN(Number(v))) return Number(v);
    return v.replace(/^'([=+\-@])/, '$1'); // buang awalan pengaman rumus (lihat safe_)
  }
  return v;
}

function parseJson_(value, wantArray) {
  try {
    var parsed = JSON.parse(value);
    if (wantArray ? Array.isArray(parsed) : (parsed && typeof parsed === 'object' && !Array.isArray(parsed))) return parsed;
  } catch (err) { /* kosong / rusak */ }
  return wantArray ? [] : {};
}

// Satu baris sheet -> objek audit (kunci = nama kolom). Kolom JSON dijadikan objek/array.
function rowToAudit_(row) {
  var audit = {};
  HEADERS.forEach(function (h, i) { audit[h] = cell_(h, row[i]); });
  // Kolom JSON dijadikan objek / array (kosong jika belum ada atau rusak)
  ['checklistResult', 'checklistNotes', 'checklistValues'].forEach(function (h) { audit[h] = parseJson_(audit[h], false); });
  audit.requiredApps = parseJson_(audit.requiredApps, true);
  return audit;
}

/** Daftar audit, terbaru dulu (berdasarkan createdAt), maksimal MAX_LIST_ROWS. */
function getAudits() {
  var sheet = getAuditSheet_(false);
  if (!sheet || sheet.getLastRow() < 2) return [];
  var width = Math.min(HEADERS.length, sheet.getMaxColumns()); // sheet lama bisa lebih sempit dari HEADERS
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getValues();
  var audits = values.map(rowToAudit_).filter(function (a) { return a.auditId; });
  audits.sort(function (a, b) {
    var x = String(a.createdAt), y = String(b.createdAt);
    return x < y ? 1 : (x > y ? -1 : 0);
  });
  return audits.slice(0, MAX_LIST_ROWS);
}

/** Satu audit berdasarkan auditId (bukan nomor baris). Return null jika tidak ada. */
function getAuditById(auditId) {
  var id = text_(auditId, 40);
  if (!AUDIT_ID_PATTERN.test(id)) throw userError_('auditId tidak valid.');
  var sheet = getAuditSheet_(false);
  var row = sheet ? findAuditRow_(sheet, id) : 0;
  if (!row) return null;
  return rowToAudit_(sheet.getRange(row, 1, 1, Math.min(HEADERS.length, sheet.getMaxColumns())).getValues()[0]);
}

/* ================== UTIL ================== */

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
