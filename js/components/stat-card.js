/* Kartu statistik sederhana. tone: "ok" | "warn" | (kosong) */
(function (AA) {
  var esc = AA.utils.escapeHtml;

  AA.components.statCard = function (opts) {
    var tone = opts.tone ? " stat-card--" + esc(opts.tone) : "";
    return (
      '<div class="stat-card' + tone + '">' +
        '<p class="stat-card__label">' + esc(opts.label) + "</p>" +
        '<p class="stat-card__value">' + esc(opts.value) + "</p>" +
      "</div>"
    );
  };
})(window.AssetAudit);
