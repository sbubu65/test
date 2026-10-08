/* Uji logika Apps Script (apps-script/Code.gs) dengan Spreadsheet tiruan.
   Jalankan:  node tests/apps-script.test.js   (tanpa library tambahan)
   Catatan: ini menguji logika kode, BUKAN Spreadsheet Google sungguhan. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function makeEnv(opts = {}) {
  const rows = []; // rows[0] = header
  const formats = [];
  const out = { sheet: rows, formats, maxCols: opts.maxCols || 26 };
  const sheet = {
    getLastRow: () => rows.length,
    getMaxColumns: () => out.maxCols,
    insertColumnsAfter(after, n) { out.maxCols += n; },
    setFrozenRows() {},
    getRange(r, c, nr, nc) {
      if (c - 1 + nc > out.maxCols) throw new Error("The coordinates of the range are outside the dimensions of the sheet.");
      return {
        getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => (rows[r - 1 + i] || [])[c - 1 + j] ?? "")),
        setValues: v => { v.forEach((line, i) => { rows[r - 1 + i] = line.slice(); }); },
        setNumberFormats: f => { formats[r - 1] = f[0]; },
      };
    },
  };
  if (opts.rows) opts.rows.forEach(r => rows.push(r));
  const ctx = {
    console, Logger: { log: m => (out.logs = out.logs || []).push(String(m)) },
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => sheet, insertSheet: () => sheet }), openById: () => null, flush() {} },
    Utilities: { formatDate: (d, tz, f) => d.toISOString().slice(0, 10) }, Session: { getScriptTimeZone: () => 'Asia/Jakarta' },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
    LockService: { getScriptLock: () => ({ tryLock: () => opts.lockFails ? false : true, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: "application/json" }, createTextOutput: s => ({ content: s, mime: null, setMimeType(m) { this.mime = m; return this; }, getContent() { return this.content; } }) },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../apps-script/Code.gs"), "utf8"), ctx);
  out.post = body => { const r = ctx.doPost({ postData: { contents: typeof body === "string" ? body : JSON.stringify(body) } }); return { json: JSON.parse(r.getContent()), mime: r.mime }; };
  out.postRaw = e => { const r = ctx.doPost(e); return JSON.parse(r.getContent()); };
  out.get = (parameter = {}) => { const r = ctx.doGet({ parameter }); return { json: JSON.parse(r.getContent()), mime: r.mime }; };
  out.ctx = ctx;
  out.HEADERS = vm.runInContext("HEADERS", ctx);
  return out;
}

const FISIK = ["Body","Layar","Keyboard","Touchpad","Port USB","Port LAN","Wi-Fi","Bluetooth","Kamera","Speaker","Microphone","Charger","Battery"];
// statuses: 16 item (13 checklist + Windows, Office, Antivirus)
function payload(statuses, extra = {}) {
  const checklistResult = {}; FISIK.forEach((k, i) => { checklistResult[k] = statuses[i]; });
  return Object.assign({
    auditId: "AUD-20261004-ABC123", assetId: "AST-001", deviceType: "Laptop", auditor: "Budi", auditDate: "2026-10-04",
    brand: "Lenovo", model: "E14", serialNumber: "00123", processor: "i5", ram: "16 GB", storage: "512 GB", operatingSystem: "Win 11", gpu: "Iris Xe",
    checklistResult, windowsStatus: statuses[13], windowsVersion: "Windows 11 Pro", windowsNote: "",
    officeStatus: statuses[14], officeVersion: "2019", officeNote: "", antivirusStatus: statuses[15], antivirusName: "Defender", antivirusNote: "",
    createdAt: "2026-10-04T03:00:00.000Z",
  }, extra);
}
const rep = (s, n) => Array(n).fill(s);
let failed = 0;
const check = (name, pass, detail) => { if (!pass) failed++; console.log((pass ? "PASS " : "FAIL ") + name + (detail ? "  ->  " + detail : "")); };
const rowOf = (env, i) => Object.fromEntries(env.HEADERS.map((h, k) => [h, env.sheet[i][k]]));

// Test 1: 10 OK, 0 Tidak OK, 6 N/A (16 item)
let env = makeEnv();
let r = env.post(payload([...rep("OK", 10), ...rep("N/A", 6)]));
let row = rowOf(env, 1);
check("Test 1: berhasil, 100 / Baik / data masuk", r.json.success === true && r.json.message === "Audit berhasil disimpan" && r.json.auditId === "AUD-20261004-ABC123" && env.sheet.length === 2 && row.score === 100 && row.condition === "Baik" && row.okCount === 10 && row.notOkCount === 0 && row.naCount === 6 && row.itemsCounted === 10 && row.totalItems === 16, JSON.stringify([row.score, row.condition, row.totalItems, row.okCount, row.notOkCount, row.naCount, row.itemsCounted]));
check("Respons berformat JSON (Content-Type application/json)", r.mime === "application/json");
check("Header ditulis otomatis (41 kolom: 32 kolom V0.5 + 9 kolom V0.7)", env.sheet[0].length === 41 && env.sheet[0][0] === "auditId" && env.sheet[0][31] === "createdAt" && env.sheet[0][28] === "score" && env.sheet[0][32] === "imei1" && env.sheet[0][40] === "checklistValues");
check("checklistResult tersimpan sebagai JSON string label -> status", JSON.parse(row.checklistResult).Body === "OK" && JSON.parse(row.checklistResult)["Port USB"] === "OK" && Object.keys(JSON.parse(row.checklistResult)).length === 13);
check("Kolom teks diformat plain text (serial 00123 tetap teks)", env.formats[1][env.HEADERS.indexOf("serialNumber")] === "@" && row.serialNumber === "00123");

// Test 2: 10 OK, 2 Tidak OK, 4 N/A
env = makeEnv();
r = env.post(payload([...rep("OK", 10), ...rep("Tidak OK", 2), ...rep("N/A", 4)]));
row = rowOf(env, 1);
check("Test 2: 83.33 / Baik", r.json.success && row.score === 83.33 && row.condition === "Baik" && row.itemsCounted === 12, row.score + " " + row.condition);

// Test 3: semua N/A
env = makeEnv();
r = env.post(payload(rep("N/A", 16)));
row = rowOf(env, 1);
check("Test 3: semua N/A -> Belum dapat dinilai, tetap masuk", r.json.success && env.sheet.length === 2 && row.score === "Belum dapat dinilai" && row.condition === "Belum dapat dinilai" && row.itemsCounted === 0, row.score);

// Kategori
[[8, 2, "Baik", 80], [7, 3, "Cukup", 70], [5, 5, "Rusak Ringan", 50], [2, 8, "Rusak Berat", 20]].forEach(([ok, bad, cond, sc]) => {
  const e = makeEnv(); e.post(payload([...rep("OK", ok), ...rep("Tidak OK", bad), ...rep("N/A", 16 - ok - bad)]));
  const w = rowOf(e, 1); check(`Kategori ${ok} OK / ${bad} Tidak OK`, w.score === sc && w.condition === cond, w.score + " " + w.condition);
});

// Test 5: duplicate
env = makeEnv();
const p = payload([...rep("OK", 16)]);
const first = env.post(p), second = env.post(p);
check("Test 5: auditId sama dua kali -> hanya 1 baris", first.json.success && !first.json.duplicate && second.json.success === true && second.json.duplicate === true && second.json.message === "Audit sudah tersimpan" && env.sheet.length === 2);
const third = env.post(payload(rep("OK", 16), { auditId: "AUD-20261004-ZZZ999" }));
check("auditId berbeda -> baris baru", third.json.success && env.sheet.length === 3);

// Nilai dari frontend tidak dipercaya
env = makeEnv();
env.post(payload([...rep("OK", 5), ...rep("Tidak OK", 11)], { score: 100, condition: "Baik", okCount: 99, status: "Hack" }));
row = rowOf(env, 1);
check("Nilai/kondisi/status dari frontend diabaikan (dihitung ulang)", row.score === 31.25 && row.condition === "Rusak Berat" && row.okCount === 5 && row.status === "Selesai", row.score + " " + row.condition);

// Validasi
const bad = (name, body, expect) => { const e = makeEnv(); const res = e.post(body); check(name, res.json.success === false && e.sheet.length === 0 && (!expect || res.json.message.includes(expect)), res.json.message); };
bad("Tolak body bukan JSON", "bukan json {", "Format data");
bad("Tolak auditId tidak valid", payload(rep("OK", 16), { auditId: "abc" }), "auditId");
bad("Tolak Asset ID kosong", payload(rep("OK", 16), { assetId: "  " }), "Asset ID");
bad("Tolak auditor kosong", payload(rep("OK", 16), { auditor: "" }), "Auditor");
bad("Tolak device type tidak didukung", payload(rep("OK", 16), { deviceType: "Mobil" }), "Device Type");
bad("Tolak tanggal tidak valid", payload(rep("OK", 16), { auditDate: "2026-02-31" }), "Tanggal");
bad("Tolak status checklist tidak valid", payload([...rep("OK", 12), "Mungkin", ...rep("OK", 3)]), "Status");
bad("Tolak status lisensi tidak valid", payload(rep("OK", 16), { windowsStatus: "" }), "Windows");
bad("Tolak checklist kosong", payload(rep("OK", 16), { checklistResult: {} }), "Checklist");
bad("Tolak body terlalu besar", payload(rep("OK", 16), { windowsNote: "x".repeat(70000) }), "terlalu besar");
check("Request tanpa body tidak membuat crash", (() => { const e = makeEnv(); const a = e.postRaw({}); const b = e.postRaw(undefined); return a.success === false && b.success === false && e.sheet.length === 0; })());

// Keamanan dasar
env = makeEnv();
env.post(payload(rep("OK", 16), { assetId: "=HYPERLINK(\"http://x\")", brand: "+cmd", windowsNote: "@SUM(1)", unknownField: "x" }));
row = rowOf(env, 1);
check("Teks diawali = + @ dinetralkan agar bukan rumus", row.assetId.startsWith("'=") && row.brand.startsWith("'+") && row.windowsNote.startsWith("'@"));
check("Field tak dikenal tidak ikut disimpan", env.sheet[1].length === 41 && !env.sheet[1].includes("x"));
env = makeEnv(); env.post(payload(rep("OK", 16), { brand: "x".repeat(500) })); check("Panjang field dibatasi", rowOf(env, 1).brand.length === 100);

// Struktur sheet
env = makeEnv({ rows: [["salah", "header"]] });
r = env.post(payload(rep("OK", 16)));
check("Header sheet salah -> ditolak, data tidak masuk", r.json.success === false && env.sheet.length === 1 && /Struktur sheet/.test(r.json.message));
env = makeEnv({ lockFails: true });
r = env.post(payload(rep("OK", 16)));
check("Server sibuk (lock gagal) -> pesan sederhana, tidak crash", r.json.success === false && /sibuk/.test(r.json.message));

// ===== V0.6: GET =====
check("doGet tanpa parameter: ping (V0.5 tetap jalan)", (() => { const g = makeEnv().get(); return g.json.success === true && g.json.message === "Asset Audit API aktif" && g.mime === "application/json"; })());
check("doGet action=ping", makeEnv().get({ action: "ping" }).json.version === "V0.7");
check("doGet aksi tidak dikenal ditolak", makeEnv().get({ action: "hapus" }).json.success === false);

env = makeEnv();
const ids = ["AUD-20261001-AAA001", "AUD-20261002-AAA002", "AUD-20261003-AAA003", "AUD-20261004-AAA004", "AUD-20261005-AAA005"];
ids.forEach((id, i) => env.post(payload([...rep("OK", 10 + i), ...rep("Tidak OK", 2), ...rep("N/A", 4 - i)], { auditId: id, assetId: "AST-00" + (i + 1), createdAt: `2026-10-0${i + 1}T03:00:00.000Z`, auditDate: `2026-10-0${i + 1}` })));
let list = env.get({ action: "list" });
check("Test 1: list mengembalikan 5 audit", list.json.success === true && Array.isArray(list.json.data) && list.json.data.length === 5 && list.mime === "application/json", String(list.json.data && list.json.data.length));
check("List terbaru dulu (createdAt)", list.json.data.map(a => a.assetId).join() === "AST-005,AST-004,AST-003,AST-002,AST-001");
const a1 = list.json.data[4];
check("List: field & tipe benar (checklistResult objek, angka numerik)", typeof a1.checklistResult === "object" && a1.checklistResult.Body === "OK" && Object.keys(a1.checklistResult).length === 13 && typeof a1.score === "number" && typeof a1.okCount === "number" && a1.deviceType === "Laptop" && a1.auditDate === "2026-10-01" && a1.serialNumber === "00123" && a1.windowsStatus === "N/A", JSON.stringify([a1.score, a1.okCount, a1.condition]));
check("List memuat 41 kolom", Object.keys(a1).length === 41);
const one = env.get({ action: "get", auditId: "AUD-20261003-AAA003" });
check("get berdasarkan auditId (bukan nomor baris)", one.json.success && one.json.data.assetId === "AST-003" && one.json.data.auditId === "AUD-20261003-AAA003");
check("get: auditId tidak ada -> tidak ditemukan", (() => { const r = env.get({ action: "get", auditId: "AUD-20261003-NOPE99" }); return r.json.success === false && /tidak ditemukan/.test(r.json.message); })());
check("get: auditId tidak valid ditolak", env.get({ action: "get", auditId: "3" }).json.success === false && env.get({ action: "get" }).json.success === false);
check("POST V0.5 tetap jalan setelah ada GET (duplikat tetap ditolak)", (() => { const r = env.post(payload(rep("OK", 16), { auditId: ids[0] })); return r.json.success && r.json.duplicate === true && env.sheet.length === 6; })());

env = makeEnv();
check("list pada sheet kosong/belum ada -> [] dan tidak mengubah sheet", (() => { const r = env.get({ action: "list" }); return r.json.success && r.json.data.length === 0 && env.sheet.length === 0; })());
env = makeEnv(); env.post(payload(rep("N/A", 16)));
check("list: 'Belum dapat dinilai' tetap berupa teks", env.get({ action: "list" }).json.data[0].score === "Belum dapat dinilai");
env = makeEnv(); env.post(payload(rep("OK", 16), { assetId: "=CMD", brand: "+x" }));
check("list: awalan pengaman rumus dibuang saat dibaca", (() => { const d = env.get({ action: "list" }).json.data[0]; return d.assetId === "=CMD" && d.brand === "+x"; })());
env = makeEnv(); env.post(payload(rep("OK", 16)));
check("list: sel tanggal (Date) dinormalkan", (() => { env.sheet[1][4] = new Date(Date.UTC(2026, 9, 4)); return env.get({ action: "list" }).json.data[0].auditDate === "2026-10-04"; })());
env = makeEnv({ rows: [["salah", "header"]] });
check("list dengan header salah -> ditolak dengan pesan sederhana", (() => { const r = env.get({ action: "list" }); return r.json.success === false && /Struktur sheet/.test(r.json.message); })());


/* ================= V0.7: Smartphone + migrasi sheet lama ================= */
const PHONE_KEYS = ["Body / Casing","Back Cover","Frame","Layar","Touchscreen","Brightness","Dead Pixel","Kamera Belakang","Kamera Depan","Flash","Speaker","Microphone","Earpiece","Wi-Fi","Bluetooth","Cellular Network","GPS","NFC","USB Port","Charging","Wireless Charging","Battery Health","Battery Charging","Battery Condition","SIM Slot 1","SIM Slot 2","SIM Detection","Mobile Data","Fingerprint","Face Unlock","Operating System","OS Version","Security Update","Device Security","Google / Apple Account"]; // 35 item
function phone(statuses, extra = {}) {
  const checklistResult = {}; PHONE_KEYS.forEach((k, i) => { checklistResult[k] = statuses[i]; });
  return Object.assign({
    auditId: "AUD-20261005-PHONE1", assetId: "HP-001", deviceType: "Smartphone", auditor: "Budi", auditDate: "2026-10-05",
    brand: "Samsung", model: "A54", serialNumber: "R5CW30ABCDE", imei1: "352099001761481", imei2: "352099001761499",
    operatingSystem: "Android", osVersion: "14", processor: "Exynos 1380", ram: "8 GB", storage: "256 GB", batteryCapacity: "5000 mAh", color: "Hitam",
    batteryHealth: "87%", checklistResult, checklistNotes: { "Frame": "Lecet kecil", "Battery Health": "Turun" }, checklistValues: { "Security Update": "1 September 2026" },
    requiredApps: [{ name: "MDM Agent", status: "OK", version: "3.2", note: "" }, { name: "Email Kantor", status: "Tidak OK", version: "", note: "Belum login" }],
    createdAt: "2026-10-05T03:00:00.000Z",
  }, extra);
}
const P = (ok_, bad_) => [...rep("OK", ok_), ...rep("Tidak OK", bad_), ...rep("N/A", 35 - ok_ - bad_)];

env = makeEnv();
r = env.post(phone(P(35, 0)));
row = rowOf(env, 1);
check("Smartphone: tersimpan dengan deviceType = Smartphone", r.json.success === true && row.deviceType === "Smartphone" && row.imei1 === "352099001761481" && row.osVersion === "14" && row.batteryHealth === "87%" && row.color === "Hitam", r.json.message);
check("Smartphone: 35 item + 2 aplikasi dinilai (36 OK, 1 Tidak OK)", row.totalItems === 37 && row.okCount === 36 && row.notOkCount === 1 && row.itemsCounted === 37, JSON.stringify([row.totalItems, row.okCount, row.notOkCount, row.naCount]));
check("Smartphone: kolom lisensi laptop kosong", row.windowsStatus === "" && row.officeStatus === "" && row.antivirusStatus === "" && row.gpu === "");
check("Smartphone: catatan, isian tambahan, aplikasi tersimpan sebagai JSON", JSON.parse(row.checklistNotes).Frame === "Lecet kecil" && JSON.parse(row.checklistValues)["Security Update"] === "1 September 2026" && JSON.parse(row.requiredApps)[1].name === "Email Kantor" && Object.keys(JSON.parse(row.checklistResult)).length === 35);

// Acceptance Smartphone (hitungan item): tanpa aplikasi agar angkanya persis
const sp = (st, extra) => { const e = makeEnv(); const res = e.post(phone(st, Object.assign({ requiredApps: [] }, extra))); return { res, row: e.sheet.length > 1 ? rowOf(e, 1) : null, e }; };
let t = sp(P(35, 0));
check("Smartphone Test 1: semua OK -> 100 / Baik", t.row.score === 100 && t.row.condition === "Baik");
t = sp(P(10, 2));
check("Smartphone Test 2: 10 OK, 2 Tidak OK, sisanya N/A -> 83.33 / Baik", t.row.score === 83.33 && t.row.condition === "Baik" && t.row.naCount === 23 && t.row.itemsCounted === 12);
t = sp(rep("N/A", 35));
check("Smartphone Test 3: semua N/A -> Belum dapat dinilai", t.res.json.success && t.row.score === "Belum dapat dinilai" && t.row.condition === "Belum dapat dinilai");
const nfcIdx = PHONE_KEYS.indexOf("NFC"), sim2Idx = PHONE_KEYS.indexOf("SIM Slot 2"), fpIdx = PHONE_KEYS.indexOf("Fingerprint");
[["NFC", nfcIdx], ["SIM Slot 2", sim2Idx], ["Fingerprint", fpIdx]].forEach(([nm, idx]) => {
  const st = rep("OK", 35); st[idx] = "N/A";
  const x = sp(st);
  check(`Smartphone: ${nm} = N/A tidak mengurangi nilai (100 / Baik)`, x.row.score === 100 && x.row.condition === "Baik" && x.row.naCount === 1 && x.row.itemsCounted === 34);
});

// Validasi khusus smartphone
const badPhone = (name, extra, expect) => { const e = makeEnv(); const res = e.post(phone(P(35, 0), extra)); check(name, res.json.success === false && e.sheet.length <= 1 && res.json.message.includes(expect), res.json.message); };
badPhone("Smartphone: IMEI 1 kosong ditolak", { imei1: "" }, "IMEI 1");
badPhone("Smartphone: IMEI 1 bukan 15 digit ditolak", { imei1: "12345" }, "IMEI 1");
badPhone("Smartphone: IMEI 2 salah format ditolak", { imei2: "abc" }, "IMEI 2");
badPhone("Smartphone: IMEI 2 sama dengan IMEI 1 ditolak", { imei2: "352099001761481" }, "tidak boleh sama");
badPhone("Smartphone: Serial Number kosong ditolak", { serialNumber: "" }, "Serial");
badPhone("Smartphone: status aplikasi tidak valid ditolak", { requiredApps: [{ name: "X", status: "Mungkin" }] }, "Status");
badPhone("Smartphone: nama aplikasi kosong ditolak", { requiredApps: [{ name: "", status: "OK" }] }, "Nama aplikasi");
badPhone("Smartphone: lebih dari 10 aplikasi ditolak", { requiredApps: Array.from({ length: 11 }, (_, i) => ({ name: "A" + i, status: "OK" })) }, "aplikasi");
t = sp(P(35, 0), { imei2: "" }); check("Smartphone: IMEI 2 boleh kosong (single SIM)", t.res.json.success === true && t.row.imei2 === "");
t = sp(P(35, 0), { imei1: "=1+1" }); check("IMEI berisi rumus ditolak (bukan 15 digit)", t.res.json.success === false);

// Laptop tidak terganggu: field smartphone diabaikan, lisensi tetap wajib
env = makeEnv();
env.post(payload(rep("OK", 16), { imei1: "352099001761481", requiredApps: [{ name: "X", status: "Tidak OK" }], checklistNotes: { Body: "baret" } }));
row = rowOf(env, 1);
check("Laptop: field smartphone diabaikan & tidak ikut dinilai", row.imei1 === "" && row.requiredApps === "" && row.totalItems === 16 && row.okCount === 16 && row.score === 100);
check("Laptop: catatan item (checklistNotes) kini tersimpan", JSON.parse(row.checklistNotes).Body === "baret");
bad("Laptop: lisensi tetap wajib", payload(rep("OK", 16), { windowsStatus: "" }), "Windows");

// List & detail memuat Smartphone dan Laptop berdampingan
env = makeEnv();
env.post(payload(rep("OK", 16)));
env.post(phone(P(30, 5)));
const lst = env.get({ action: "list" }).json.data;
check("List: Laptop dan Smartphone berdampingan", lst.length === 2 && lst.map(a => a.deviceType).sort().join() === "Laptop,Smartphone");
const phoneOne = env.get({ action: "get", auditId: "AUD-20261005-PHONE1" }).json.data;
check("Detail Smartphone via auditId: JSON dikembalikan sebagai objek/array", phoneOne.deviceType === "Smartphone" && phoneOne.checklistResult["Frame"] === "OK" && phoneOne.checklistNotes.Frame === "Lecet kecil" && Array.isArray(phoneOne.requiredApps) && phoneOne.requiredApps.length === 2 && phoneOne.imei1 === "352099001761481");

// Migrasi: sheet lama V0.5/V0.6 (32 kolom) berisi audit Laptop
const legacyHeader = env.HEADERS.slice(0, 32);
const legacyRow = new Array(32).fill("");
legacyRow[0] = "AUD-20261001-OLD001"; legacyRow[1] = "AST-OLD"; legacyRow[2] = "Laptop"; legacyRow[3] = "Lama"; legacyRow[4] = "2026-10-01";
legacyRow[13] = JSON.stringify({ Body: "OK" }); legacyRow[14] = "OK"; legacyRow[17] = "OK"; legacyRow[20] = "OK";
legacyRow[23] = 4; legacyRow[24] = 4; legacyRow[25] = 0; legacyRow[26] = 0; legacyRow[27] = 4; legacyRow[28] = 100; legacyRow[29] = "Baik"; legacyRow[30] = "Selesai"; legacyRow[31] = "2026-10-01T03:00:00.000Z";
env = makeEnv({ rows: [legacyHeader, legacyRow], maxCols: 32 });
const legacyList = env.get({ action: "list" });
check("Migrasi: sheet lama 32 kolom tetap bisa dibaca (list)", legacyList.json.success === true && legacyList.json.data.length === 1 && legacyList.json.data[0].assetId === "AST-OLD" && legacyList.json.data[0].requiredApps.length === 0 && legacyList.json.data[0].imei1 === "", legacyList.json.message);
const legacyGet = env.get({ action: "get", auditId: "AUD-20261001-OLD001" });
check("Migrasi: detail audit lama tetap bisa dibaca", legacyGet.json.success === true && legacyGet.json.data.checklistResult.Body === "OK");
r = env.post(phone(P(35, 0)));
check("Migrasi: POST pertama menambah 9 kolom header di kanan, data lama utuh", r.json.success === true && env.sheet[0].length === 41 && env.sheet[0][32] === "imei1" && env.sheet[0][40] === "checklistValues" && env.sheet[1][1] === "AST-OLD" && env.sheet[1][28] === 100 && env.sheet.length === 3, r.json.message);
check("Migrasi: baris baru Smartphone benar di sheet yang sudah dimigrasi", rowOf(env, 2).deviceType === "Smartphone" && rowOf(env, 2).imei1 === "352099001761481");
env = makeEnv({ rows: [legacyHeader.slice(0, 31).concat(["salah"]), legacyRow], maxCols: 32 });
check("Migrasi: header lama yang tidak cocok tetap ditolak", env.post(phone(P(35, 0))).json.success === false);
env = makeEnv({ rows: [legacyHeader.concat(["imei1"]), legacyRow.concat([""])], maxCols: 33 });
check("Migrasi: sheet yang separuh dimigrasi (33 kolom) dilengkapi", env.post(phone(P(35, 0))).json.success === true && env.sheet[0].length === 41);

console.log(failed ? `\n${failed} uji GAGAL` : "\nSemua uji Apps Script lulus");
process.exit(failed ? 1 : 0);
