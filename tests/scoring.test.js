/* Uji rumus scoring. Jalankan:  node tests/scoring.test.js  (tanpa library tambahan) */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const sandbox = { window: { AssetAudit: { auditDefs: {} } } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/utils/scoring.js"), "utf8"), sandbox);
const S = sandbox.window.AssetAudit.scoring;

const cases = [
  // [nama, ok, tidakOk, na, nilai(null=belum dinilai), kondisi, teks, teks kartu]
  ["Test 1: 10 OK",                 10, 0, 0, 100, "Baik",         "100%", "100%"],
  ["Test 2: 10 OK, 5 N/A",          10, 0, 5, 100, "Baik",         "100%", "100%"],
  ["Test 3: 8 OK, 2 Tidak OK",       8, 2, 0,  80, "Baik",         "80%",  "80%"],
  ["Test 4: 7 OK, 3 Tidak OK",       7, 3, 0,  70, "Cukup",        "70%",  "70%"],
  ["Test 5: 5 OK, 5 Tidak OK",       5, 5, 0,  50, "Rusak Ringan", "50%",  "50%"],
  ["Test 6: 2 OK, 8 Tidak OK",       2, 8, 0,  20, "Rusak Berat",  "20%",  "20%"],
  ["Test 7: 10 N/A",                 0, 0, 10, null, "Belum dapat dinilai", "-", "-"],
  // contoh dari spesifikasi
  ["Contoh: 10 OK, 2 Tidak OK, 3 N/A", 10, 2, 3, 83.3333, "Baik",  "83,33%", "83%"],
  ["Contoh: 16 OK, 2 Tidak OK, 2 N/A", 16, 2, 2, 88.8889, "Baik",  "88,89%", "89%"],
  ["Contoh: 17 OK, 3 Tidak OK, 2 N/A", 17, 3, 2, 85,      "Baik",  "85%",    "85%"],
  // batas kategori
  ["Batas: 79% (79 OK, 21 Tidak OK)", 79, 21, 0, 79, "Cukup", "79%", "79%"],
  ["Batas: 80% (4 OK, 1 Tidak OK)",    4, 1, 0, 80, "Baik",  "80%", "80%"],
  ["Batas: 60% (3 OK, 2 Tidak OK)",    3, 2, 0, 60, "Cukup", "60%", "60%"],
  ["Batas: 59% (59 OK, 41 Tidak OK)", 59, 41, 0, 59, "Rusak Ringan", "59%", "59%"],
  ["Batas: 40% (2 OK, 3 Tidak OK)",    2, 3, 0, 40, "Rusak Ringan", "40%", "40%"],
  ["Batas: 39% (39 OK, 61 Tidak OK)", 39, 61, 0, 39, "Rusak Berat",  "39%", "39%"],
  ["Batas: 0% (0 OK, 5 Tidak OK)",     0, 5, 0,  0, "Rusak Berat",  "0%",  "0%"],
  // pembulatan tidak boleh menaikkan kategori: 79,6% harus tetap Cukup dan tampil 79%
  ["Pembulatan: 398 OK, 102 Tidak OK", 398, 102, 0, 79.6, "Cukup", "79,60%", "79%"],
  // real-time: 80% -> 70% saat satu OK menjadi Tidak OK -> kembali 80% hitung saat jadi N/A
  ["Real-time awal: 8 OK, 2 Tidak OK",       8, 2, 0, 80, "Baik",  "80%", "80%"],
  ["Real-time OK -> Tidak OK: 7 OK, 3 Tidak", 7, 3, 0, 70, "Cukup", "70%", "70%"],
  ["Real-time OK -> N/A: 7 OK, 2 Tidak, 1 N/A", 7, 2, 1, 77.7778, "Cukup", "77,78%", "78%"],
];

let failed = 0;
cases.forEach(([name, ok, bad, na, score, cond, text, short]) => {
  const r = S.calculate(ok, bad, na);
  const scoreOk = score === null ? r.score === null : Math.abs(r.score - score) < 0.001;
  const pass = scoreOk && r.condition === cond && r.scoreText === text && r.scoreShort === short;
  if (!pass) failed++;
  console.log((pass ? "PASS " : "FAIL ") + name + "  ->  " + r.scoreText + " (kartu " + r.scoreShort + ") " + r.condition);
});

console.log(failed ? `\n${failed} uji GAGAL` : `\nSemua ${cases.length} uji lulus`);
process.exit(failed ? 1 : 0);
