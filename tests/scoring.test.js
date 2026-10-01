/* Uji rumus scoring. Jalankan:  node tests/scoring.test.js  (tanpa library tambahan) */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const sandbox = { window: { AssetAudit: { auditDefs: {} } } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/utils/scoring.js"), "utf8"), sandbox);
const S = sandbox.window.AssetAudit.scoring;

const cases = [
  // [nama, ok, tidakOk, na, nilai (null = belum dinilai), kondisi, teks tampil]
  ["Acceptance 1: 10 OK, 0 Tidak OK, 0 N/A",        10, 0, 0, 100,   "Baik",         "100.00%"],
  ["Acceptance 2: 10 OK, 0 Tidak OK, 5 N/A",        10, 0, 5, 100,   "Baik",         "100.00%"],
  ["Acceptance 3: 10 OK, 2 Tidak OK, 3 N/A",        10, 2, 3, 83.33, "Baik",         "83.33%"],
  ["Acceptance 4: 8 OK, 2 Tidak OK",                 8, 2, 0, 80,    "Baik",         "80.00%"],
  ["Acceptance 5: 7 OK, 3 Tidak OK",                 7, 3, 0, 70,    "Cukup",        "70.00%"],
  ["Acceptance 6: 5 OK, 5 Tidak OK",                 5, 5, 0, 50,    "Rusak Ringan", "50.00%"],
  ["Acceptance 7: 2 OK, 8 Tidak OK",                 2, 8, 0, 20,    "Rusak Berat",  "20.00%"],
  ["Acceptance 8: 0 OK, 0 Tidak OK, 10 N/A",         0, 0, 10, null, "Belum dapat dinilai", "-"],
  // contoh lain dari spesifikasi
  ["Contoh: 16 OK, 2 Tidak OK, 2 N/A",              16, 2, 2, 88.89, "Baik",  "88.89%"],
  ["Contoh: 17 OK, 3 Tidak OK, 2 N/A",              17, 3, 2, 85,    "Baik",  "85.00%"],
  // batas kategori
  ["Batas 79%: 79 OK, 21 Tidak OK",                 79, 21, 0, 79,   "Cukup",        "79.00%"],
  ["Batas 80%: 4 OK, 1 Tidak OK",                    4, 1, 0, 80,    "Baik",         "80.00%"],
  ["Batas 60%: 3 OK, 2 Tidak OK",                    3, 2, 0, 60,    "Cukup",        "60.00%"],
  ["Batas 59%: 59 OK, 41 Tidak OK",                 59, 41, 0, 59,   "Rusak Ringan", "59.00%"],
  ["Batas 40%: 2 OK, 3 Tidak OK",                    2, 3, 0, 40,    "Rusak Ringan", "40.00%"],
  ["Batas 39%: 39 OK, 61 Tidak OK",                 39, 61, 0, 39,   "Rusak Berat",  "39.00%"],
  ["Batas 0%: 0 OK, 5 Tidak OK",                     0, 5, 0, 0,     "Rusak Berat",  "0.00%"],
  // pembulatan 2 desimal
  ["Pembulatan: 1 OK, 2 Tidak OK",                   1, 2, 0, 33.33, "Rusak Berat",  "33.33%"],
  ["Pembulatan: 2 OK, 1 Tidak OK",                   2, 1, 0, 66.67, "Cukup",        "66.67%"],
  ["Pembulatan tidak boleh menaikkan kategori (79.998 -> 79.99, Cukup)", 79998, 20002, 0, 79.99, "Cukup", "79.99%"],
  // N/A & belum diisi tidak masuk hitungan
  ["N/A tidak menurunkan nilai: 9 OK, 1 Tidak OK, 50 N/A", 9, 1, 50, 90, "Baik", "90.00%"],
];

let failed = 0;
const check = (name, pass, detail) => { if (!pass) failed++; console.log((pass ? "PASS " : "FAIL ") + name + (detail ? "  ->  " + detail : "")); };

cases.forEach(([name, ok, bad, na, score, cond, text]) => {
  const r = S.calculate(ok, bad, na);
  const scoreOk = score === null ? r.score === null : r.score === score;
  check(name, scoreOk && r.condition === cond && r.scoreText === text, r.scoreText + " " + r.condition);
});

// Ringkasan angka (contoh spesifikasi: total 15, OK 10, Tidak OK 2, N/A 3, dinilai 12)
const r = S.calculate(10, 2, 3);
check("Ringkasan: total 15, dinilai 12 (bukan 15)", r.total === 15 && r.counted === 12 && r.ok === 10 && r.notOk === 2 && r.na === 3);
const u = S.calculate(5, 0, 0, 3);
check("Item belum diisi tidak ikut dinilai", u.counted === 5 && u.total === 8 && u.scoreText === "100.00%");
check("formatPercent(92) = 92.00%", S.formatPercent(92) === "92.00%");

console.log(failed ? `\n${failed} uji GAGAL` : `\nSemua ${cases.length + 3} uji lulus`);
process.exit(failed ? 1 : 0);
