/* Uji logika Apps Script (apps-script/Code.gs) dengan Spreadsheet tiruan.
   Jalankan:  node tests/apps-script.test.js   (tanpa library tambahan)
   Catatan: ini menguji logika kode, BUKAN Spreadsheet Google sungguhan. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function makeEnv(opts = {}) {
  const rows = []; // rows[0] = header
  const formats = [];
  const sheet = {
    getLastRow: () => rows.length,
    setFrozenRows() {},
    getRange(r, c, nr, nc) {
      return {
        getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => (rows[r - 1 + i] || [])[c - 1 + j] ?? "")),
        setValues: v => { v.forEach((line, i) => { rows[r - 1 + i] = line.slice(); }); },
        setNumberFormats: f => { formats[r - 1] = f[0]; },
      };
    },
  };
  if (opts.rows) opts.rows.forEach(r => rows.push(r));
  const out = { sheet: rows, formats };
  const ctx = {
    console, Logger: { log: m => (out.logs = out.logs || []).push(String(m)) },
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => sheet, insertSheet: () => sheet }), openById: () => null, flush() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
    LockService: { getScriptLock: () => ({ tryLock: () => opts.lockFails ? false : true, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: "application/json" }, createTextOutput: s => ({ content: s, mime: null, setMimeType(m) { this.mime = m; return this; }, getContent() { return this.content; } }) },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../apps-script/Code.gs"), "utf8"), ctx);
  out.post = body => { const r = ctx.doPost({ postData: { contents: typeof body === "string" ? body : JSON.stringify(body) } }); return { json: JSON.parse(r.getContent()), mime: r.mime }; };
  out.postRaw = e => { const r = ctx.doPost(e); return JSON.parse(r.getContent()); };
  out.get = () => { const r = ctx.doGet({}); return { json: JSON.parse(r.getContent()), mime: r.mime }; };
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
check("Header ditulis otomatis (32 kolom, urutan sesuai spesifikasi)", env.sheet[0].length === 32 && env.sheet[0][0] === "auditId" && env.sheet[0][31] === "createdAt" && env.sheet[0][28] === "score");
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
check("Field tak dikenal tidak ikut disimpan", env.sheet[1].length === 32 && !env.sheet[1].includes("x"));
env = makeEnv(); env.post(payload(rep("OK", 16), { brand: "x".repeat(500) })); check("Panjang field dibatasi", rowOf(env, 1).brand.length === 100);

// Struktur sheet
env = makeEnv({ rows: [["salah", "header"]] });
r = env.post(payload(rep("OK", 16)));
check("Header sheet salah -> ditolak, data tidak masuk", r.json.success === false && env.sheet.length === 1 && /Struktur sheet/.test(r.json.message));
env = makeEnv({ lockFails: true });
r = env.post(payload(rep("OK", 16)));
check("Server sibuk (lock gagal) -> pesan sederhana, tidak crash", r.json.success === false && /sibuk/.test(r.json.message));

// doGet
check("doGet: API aktif (JSON)", (() => { const g = makeEnv().get(); return g.json.success === true && g.mime === "application/json"; })());

console.log(failed ? `\n${failed} uji GAGAL` : "\nSemua uji Apps Script lulus");
process.exit(failed ? 1 : 0);
