/* Scoring audit — SATU utility untuk semua jenis perangkat dan semua halaman
   (checklist, review, hasil audit, riwayat). Jangan membuat rumus scoring di tempat lain.

   Rumus:  Nilai = OK ÷ (OK + Tidak OK) × 100      (N/A tidak dihitung sama sekali)
   Tampilan: selalu 2 desimal dengan titik, mis. 83.33% / 100.00% / 80.00%
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

  // Kategori ditentukan dengan bilangan bulat (ok × 100 >= batas × dihitung), bukan desimal,
  // supaya batas 80% / 60% / 40% tidak pernah meleset akibat pembulatan komputer.
  function categoryFromCounts(ok, counted) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (ok * 100 >= CATEGORIES[i].min * counted) return CATEGORIES[i];
    }
    return CATEGORIES[CATEGORIES.length - 1];
  }

  function categoryFromHundredths(h) { // h = nilai × 100 (bilangan bulat)
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (h >= CATEGORIES[i].min * 100) return CATEGORIES[i];
    }
    return CATEGORIES[CATEGORIES.length - 1];
  }

  // Nilai dibulatkan ke 2 desimal dalam bentuk bilangan bulat (ratusan): 83.33% -> 8333.
  // Jika pembulatan membuat nilai "naik kelas" (mis. 79.998 -> 80.00), dipakai pembulatan ke bawah.
  function hundredths(ok, counted) {
    var exact = (ok * 10000) / counted;
    var h = Math.round(exact);
    if (categoryFromHundredths(h) !== categoryFromCounts(ok, counted)) h = Math.floor(exact);
    return h;
  }

  function formatHundredths(h) {
    var frac = h % 100;
    return Math.floor(h / 100) + "." + (frac < 10 ? "0" : "") + frac + "%";
  }

  // Format persen standar aplikasi untuk angka apa pun (mis. data dummy Dashboard): 92 -> "92.00%"
  function formatPercent(value) {
    return formatHundredths(Math.round(value * 100));
  }

  /* Fungsi inti. Murni: hanya angka masuk, hasil keluar. */
  function calculate(ok, notOk, na, unanswered) {
    ok = ok || 0; notOk = notOk || 0; na = na || 0; unanswered = unanswered || 0;
    var counted = ok + notOk; // item yang dinilai
    var result = {
      ok: ok, notOk: notOk, na: na, unanswered: unanswered,
      total: ok + notOk + na + unanswered,
      counted: counted
    };

    if (counted === 0) {
      result.rated = false;
      result.score = null;
      result.scoreText = "-";
      result.condition = UNRATED.label;
      result.tone = UNRATED.tone;
      return result;
    }

    var h = hundredths(ok, counted);
    var cat = categoryFromCounts(ok, counted);
    result.rated = true;
    result.score = h / 100;            // sudah 2 desimal
    result.scoreText = formatHundredths(h);
    result.condition = cat.label;
    result.tone = cat.tone;
    return result;
  }

  function eachScoredItem(def, data, fn) {
    def.steps.forEach(function (step) {
      step.sections.forEach(function (sec) {
        if (!sec.scored) return;
        sec.items.forEach(function (item) {
          var entry = data && data[sec.id] && data[sec.id][item.id];
          fn(sec, item, entry || {});
        });
      });
    });
  }

  function evaluate(def, data) {
    var ok = 0, notOk = 0, na = 0, unanswered = 0;
    eachScoredItem(def, data, function (sec, item, entry) {
      if (entry.status === "OK") ok++;
      else if (entry.status === "Tidak OK") notOk++;
      else if (entry.status === "N/A") na++;
      else unanswered++;
    });
    return calculate(ok, notOk, na, unanswered);
  }

  /* Daftar item dengan status tertentu: [{ label, section, note }] (note hanya untuk "Tidak OK"). */
  function listByStatus(def, data, status) {
    var out = [];
    eachScoredItem(def, data, function (sec, item, entry) {
      if (entry.status !== status) return;
      out.push({
        label: item.label,
        section: sec.title,
        note: status === "Tidak OK" ? String(entry.note || "").trim() : ""
      });
    });
    return out;
  }

  /* Hasil scoring untuk satu audit tersimpan. Audit lama (V0.2, belum ada scoring) dihitung ulang
     dari datanya; audit V0.3+ dihitung dari jumlah yang tersimpan. Rumusnya tetap yang ini. */
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
    listByStatus: listByStatus,
    forRecord: forRecord,
    formatPercent: formatPercent
  };
})(window.AssetAudit);
