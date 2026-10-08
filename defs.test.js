/* Uji integritas definisi audit (js/audit-defs/*.js) dan kesesuaiannya dengan Apps Script.
   Jalankan:  node tests/defs.test.js   (tanpa library tambahan)
   Menangkap kesalahan umum saat menambah perangkat baru: id ganda, kunci Spreadsheet ganda,
   kolom yang tidak ada di Code.gs, section tanpa tipe yang dikenal. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");

// Frontend: muat config + definisi seperti di browser
const win = { crypto: {} };
const ctx = vm.createContext({ window: win, console });
["js/config.js", "js/audit-defs/common.js", "js/audit-defs/laptop.js", "js/audit-defs/smartphone.js"].forEach(f => vm.runInContext(read(f), ctx, { filename: f }));
const AA = win.AssetAudit;

// Backend: kolom & pola dari Code.gs
const gs = vm.createContext({ console });
vm.runInContext(read("apps-script/Code.gs"), gs);
const HEADERS = vm.runInContext("HEADERS", gs);
const SERVER_IMEI = vm.runInContext("IMEI_PATTERN", gs), SERVER_SERIAL = vm.runInContext("SERIAL_PATTERN", gs);
const RULES = vm.runInContext("DEVICE_RULES", gs);

let failed = 0;
const check = (name, pass, detail) => { if (!pass) failed++; console.log((pass ? "PASS " : "FAIL ") + name + (detail ? "  ->  " + detail : "")); };
const dupes = list => list.filter((x, i) => list.indexOf(x) !== i);
const TYPES = ["fields", "checklist", "license", "apps"];
const ROLES = ["specifications", "checklist", "license", "apps"];

["laptop", "smartphone"].forEach(id => {
  const def = AA.auditDefs[id];
  const sections = [], items = [], columns = [];
  def.steps.forEach(st => st.sections.forEach(sec => {
    sections.push(sec);
    (sec.items || []).forEach(it => items.push({ sec, it }));
    (sec.fields || []).forEach(f => f.sheet && columns.push(f.sheet));
    (sec.items || []).forEach(it => { if (it.sheet) columns.push(it.sheet.status, it.sheet.extra, it.sheet.note); if (it.extraSheet) columns.push(it.extraSheet); });
  }));

  check(`[${id}] id section unik`, dupes(sections.map(s => s.id)).length === 0, dupes(sections.map(s => s.id)).join());
  check(`[${id}] id langkah unik`, dupes(def.steps.map(s => s.id)).length === 0);
  check(`[${id}] id item unik di seluruh definisi (penggabungan per role aman)`, dupes(items.map(x => x.it.id)).length === 0, dupes(items.map(x => x.it.id)).join());
  const keys = items.filter(x => !x.it.sheet).map(x => x.it.key || x.it.label);
  check(`[${id}] kunci checklistResult unik`, dupes(keys).length === 0, dupes(keys).join());
  check(`[${id}] tipe section & role dikenal`, sections.every(s => TYPES.includes(s.type) && (!s.role || ROLES.includes(s.role))));
  check(`[${id}] section bernilai (scored) punya item atau bertipe apps`, sections.filter(s => s.scored).every(s => s.type === "apps" || (s.items && s.items.length)));
  check(`[${id}] semua kolom 'sheet' ada di HEADERS Code.gs`, columns.every(c => HEADERS.includes(c)), columns.filter(c => !HEADERS.includes(c)).join());
  check(`[${id}] tidak ada kolom Spreadsheet yang dipakai dua isian`, dupes(columns).length === 0, dupes(columns).join());
  check(`[${id}] field required/validate merujuk validator yang ada`, sections.every(s => (s.fields || []).every(f => !f.validate || typeof AA.auditDefs.validators[f.validate] === "function")));
  check(`[${id}] aturan perangkat ada di DEVICE_RULES Code.gs`, !!RULES[def.label], def.label);
});

const count = id => { let n = 0; AA.auditDefs[id].steps.forEach(st => st.sections.forEach(s => { if (s.scored && s.items) n += s.items.length; })); return n; };
check("Laptop: 16 item bernilai (13 fisik + 3 lisensi)", count("laptop") === 16);
check("Smartphone: 35 item bernilai + daftar aplikasi dinamis", count("smartphone") === 35 && AA.auditDefs.smartphone.steps.some(st => st.sections.some(s => s.type === "apps" && s.scored)));

const labels = AA.auditDefs.smartphone.steps.flatMap(st => st.sections.flatMap(s => (s.items || []).map(i => i.label)));
["Body / Casing","Back Cover","Frame","Layar","Touchscreen","Brightness","Dead Pixel","Kamera Belakang","Kamera Depan","Flash","Speaker","Microphone","Earpiece","Wi-Fi","Bluetooth","Cellular Network","GPS","NFC","USB Port","Charging","Wireless Charging",
 "Battery Health","Battery Condition","SIM Slot 1","SIM Slot 2","SIM Detection","Mobile Data","Fingerprint","Face Unlock","Operating System","OS Version","Security Update","Device Security"]
  .forEach(l => check(`Smartphone memuat item: ${l}`, labels.includes(l)));
const fieldLabels = AA.auditDefs.smartphone.steps.flatMap(st => st.sections.flatMap(s => (s.fields || []).map(f => f.label)));
["Asset ID","Nama Auditor","Tanggal Audit","Brand","Model","Serial Number","IMEI 1","IMEI 2","Operating System","OS Version","Processor","RAM","Storage","Battery Capacity","Color"]
  .forEach(l => check(`Smartphone memuat field: ${l}`, fieldLabels.includes(l)));
check("Smartphone memakai kata kunci Required Application (nama, status, versi, catatan)", AA.auditDefs.smartphone.steps.some(st => st.sections.some(s => s.type === "apps" && s.title === "Required Application")));

// Pendaftaran perangkat (tanpa mengubah config.js)
const types = Object.fromEntries(AA.config.deviceTypes.map(d => [d.id, d]));
check("Smartphone terdaftar: auditRoute + rute tersembunyi + halaman", types.smartphone.auditRoute === "audit-smartphone" && AA.config.routes.some(r => r.id === "audit-smartphone" && r.hidden && r.navParent === "mulai-audit") && !!AA.pages["audit-smartphone"]);
check("Laptop tetap terdaftar lewat config.js", types.laptop.auditRoute === "audit-laptop");
check("Tablet & iMac belum punya audit (Segera hadir)", !types.tablet.auditRoute && !types.imei && !types.imac.auditRoute);

// Validator frontend == pola Apps Script
const V = AA.auditDefs.validators;
const samples = ["352099001761481", "35209900176148", "3520990017614812", "35209900176148A", "352 099 001 761 48", "", "123456789012345"];
check("IMEI: frontend dan Apps Script sepakat", samples.every(v => (V.imei(v) === "") === SERVER_IMEI.test(v)));
const serials = ["R5CW30ABCDE", "ab", "-abc123", "A1_B2.C3/D4-E5", "x".repeat(40), "x".repeat(41), "abc def", "SN=1"];
check("Serial Number: frontend dan Apps Script sepakat", serials.every(v => (V.serial(v) === "") === SERVER_SERIAL.test(v)));
check("IMEI 2 tidak boleh sama dengan IMEI 1; boleh berbeda", V.imei2("352099001761481", { imei1: "352099001761481" }) !== "" && V.imei2("352099001761499", { imei1: "352099001761481" }) === "");

console.log(failed ? `\n${failed} uji GAGAL` : "\nSemua uji definisi lulus");
process.exit(failed ? 1 : 0);
