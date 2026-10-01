/* Kartu "NILAI AUDIT" + progress bar. Dipakai di halaman audit, Review, dan Audit Selesai.
   render(result, { precise })  -> HTML.  precise: true = 88,89%  |  false = 89% (default, untuk kartu real-time)
   update(el, result)           -> perbarui kartu yang sudah tampil (tanpa menggambar ulang form). */
(function (AA) {
  var esc = AA.utils.escapeHtml;

  function view(result, precise) {
    return {
      value: result.rated ? (precise ? result.scoreText : result.scoreShort) : "—",
      label: result.condition.toUpperCase(),
      width: result.rated ? result.score : 0,
      counts: "OK: " + result.ok + " · Tidak OK: " + result.notOk + " · N/A: " + result.na
    };
  }

  AA.components.scoreCard = {
    render: function (result, opts) {
      var precise = !!(opts && opts.precise);
      var v = view(result, precise);
      return (
        '<div class="score-card" data-tone="' + esc(result.tone) + '" data-precise="' + (precise ? "1" : "0") + '">' +
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
      var v = view(result, el.getAttribute("data-precise") === "1");
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
