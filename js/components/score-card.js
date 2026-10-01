/* Kartu "NILAI AUDIT" + progress bar. Dipakai di halaman audit, Review, dan Hasil Audit.
   render(result, { hero })  -> HTML. hero: true = versi besar berlatar warna kondisi (Hasil Audit).
   update(el, result)        -> perbarui kartu yang sudah tampil (tanpa menggambar ulang form).
   Angka selalu berasal dari AssetAudit.scoring (2 desimal), tidak dihitung di sini. */
(function (AA) {
  var esc = AA.utils.escapeHtml;

  function view(result) {
    return {
      value: result.rated ? result.scoreText : "—",
      label: result.condition.toUpperCase(),
      width: result.rated ? result.score : 0,
      counts: "OK: " + result.ok + " · Tidak OK: " + result.notOk + " · N/A: " + result.na
    };
  }

  AA.components.scoreCard = {
    render: function (result, opts) {
      var v = view(result);
      var hero = opts && opts.hero ? " score-card--hero" : "";
      return (
        '<div class="score-card' + hero + '" data-tone="' + esc(result.tone) + '">' +
          '<div class="score-card__top">' +
            "<div>" +
              '<p class="score-card__label">NILAI AUDIT</p>' +
              '<p class="score-card__value" data-score-value>' + esc(v.value) + "</p>" +
            "</div>" +
            '<p class="score-card__cond" data-score-cond>' + esc(v.label) + "</p>" +
          "</div>" +
          '<div class="score-bar" role="progressbar" aria-label="Nilai audit" aria-valuemin="0" aria-valuemax="100"' +
            (result.rated ? ' aria-valuenow="' + Math.round(v.width) + '"' : "") + ">" +
            '<span data-score-bar style="width:' + v.width + '%"></span>' +
          "</div>" +
          '<p class="score-card__counts" data-score-counts>' + esc(v.counts) + "</p>" +
        "</div>"
      );
    },

    update: function (el, result) {
      var v = view(result);
      el.setAttribute("data-tone", result.tone);
      el.querySelector("[data-score-value]").textContent = v.value;
      el.querySelector("[data-score-cond]").textContent = v.label;
      el.querySelector("[data-score-bar]").style.width = v.width + "%";
      el.querySelector("[data-score-counts]").textContent = v.counts;
      var bar = el.querySelector(".score-bar");
      if (result.rated) bar.setAttribute("aria-valuenow", Math.round(v.width));
      else bar.removeAttribute("aria-valuenow");
    }
  };
})(window.AssetAudit);
