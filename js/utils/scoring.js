/* Scoring audit — SATU utility untuk semua jenis perangkat.

   Rumus:  Nilai = OK ÷ (OK + Tidak OK) × 100      (N/A tidak dihitung sama sekali)
   Kategori (batas tepat):
     80–100 -> Baik | 60–79 -> Cukup | 40–59 -> Rusak Ringan | 0–39 -> Rusak Berat
   Jika OK + Tidak OK = 0 (semua N/A / belum diisi) -> "Belum dapat dinilai", bukan 100%.

   Section yang dinilai = section di definisi audit dengan  scored: true  (tipe checklist / license). */
(function (AA) {
  var CATEGORIES = [
    { min: 80, label: "Baik",         tone: "baik" },
    { min: 60, label: "Cukup",        tone: "cukup" },
    { min: 40, label: "Rusak Ringan", tone: "ringan" },
    { min: 0,  label: "Rusak Berat",  tone: "berat" }
  ];
  var UNRATED = { label: "Belum dapat dinilai", tone: "unrated" };

  // Pakai perbandingan bilangan bulat (ok × 100 >= batas × dihitung) supaya batas
  // seperti 80% / 60% tidak pernah meleset akibat pembulatan desimal komputer.
  function categoryFromCounts(ok, counted) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (ok * 100 >= CATEGORIES[i].min * counted) return CATEGORIES[i];
    }
    return CATEGORIES[CATEGORIES.length - 1];
  }

  function categoryFromValue(value) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (value >= CATEGORIES[i].min) return CATEGORIES[i];
    }
    return CATEGORIES[CATEGORIES.length - 1];
  }

  // 88,89% (2 desimal, koma). Angka bulat ditulis tanpa desimal: 80%
  function formatPrecise(score) {
    if (Math.round(score * 100) % 100 === 0) return Math.round(score) + "%";
    return score.toFixed(2).replace(".", ",") + "%";
  }

  // 83% (bulat) untuk kartu. Jika pembulatan membuat nilai masuk kategori lain
  // (mis. 79,6% -> 80%), dipakai pembulatan ke bawah agar angka dan kondisi tidak bertentangan.
  function formatShort(score, ok, counted) {
    var rounded = Math.round(score);
    if (categoryFromValue(rounded) !== categoryFromCounts(ok, counted)) rounded = Math.floor(score);
    return rounded + "%";
  }

  /* Fungsi inti. Murni: hanya angka masuk, hasil keluar. */
  function calculate(ok, notOk, na, unanswered) {
    ok = ok || 0; notOk = notOk || 0; na = na || 0; unanswered = unanswered || 0;
    var counted = ok + notOk;
    var result = {
      ok: ok, notOk: notOk, na: na, unanswered: unanswered,
      total: ok + notOk + na + unanswered,
      counted: counted
    };

    if (counted === 0) {
      result.rated = false;
      result.score = null;
      result.scoreText = "-";
      result.scoreShort = "-";
      result.condition = UNRATED.label;
      result.tone = UNRATED.tone;
      return result;
    }

    var cat = categoryFromCounts(ok, counted);
    result.rated = true;
    result.score = (ok * 100) / counted;
    result.scoreText = formatPrecise(result.score);
    result.scoreShort = formatShort(result.score, ok, counted);
    result.condition = cat.label;
    result.tone = cat.tone;
    return result;
  }

  /* Ambil semua status dari section yang dinilai di sebuah data audit. */
  function collectStatuses(def, data) {
    var statuses = [];
    def.steps.forEach(function (step) {
      step.sections.forEach(function (sec) {
        if (!sec.scored) return;
        sec.items.forEach(function (item) {
          var entry = data && data[sec.id] && data[sec.id][item.id];
          statuses.push(entry && entry.status ? entry.status : "");
        });
      });
    });
    return statuses;
  }

  function evaluate(def, data) {
    var ok = 0, notOk = 0, na = 0, unanswered = 0;
    collectStatuses(def, data).forEach(function (s) {
      if (s === "OK") ok++;
      else if (s === "Tidak OK") notOk++;
      else if (s === "N/A") na++;
      else unanswered++;
    });
    return calculate(ok, notOk, na, unanswered);
  }

  /* Hasil scoring untuk satu audit tersimpan. Audit lama (V0.2, belum ada scoring)
     dihitung ulang dari datanya, jadi tidak perlu migrasi. */
  function forRecord(rec) {
    var s = rec && rec.scoring;
    if (s && typeof s.ok === "number") return calculate(s.ok, s.notOk, s.na, 0);
    var def = rec && AA.auditDefs && AA.auditDefs[rec.deviceType];
    return def ? evaluate(def, rec.data) : calculate(0, 0, 0, 0);
  }

  AA.scoring = {
    categories: CATEGORIES,
    calculate: calculate,
    evaluate: evaluate,
    forRecord: forRecord
  };
})(window.AssetAudit);
