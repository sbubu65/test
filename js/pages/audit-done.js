/* Halaman Audit Selesai (Hasil Audit). Menerima id audit dari URL: #/audit-selesai/<id> */
(function (AA) {
  var esc = AA.utils.escapeHtml;

  function row(label, value) {
    return '<div class="review-row"><dt>' + esc(label) + "</dt><dd>" + esc(value || "-") + "</dd></div>";
  }

  AA.pages["audit-selesai"] = {
    title: "Audit Selesai",

    render: function (container, ctx) {
      var rec = ctx && ctx.param ? AA.storage.get(ctx.param) : null;

      if (!rec) {
        container.innerHTML =
          '<div class="page-head"><h1>Audit tidak ditemukan</h1>' +
          "<p>Data audit ini tidak ada di browser ini.</p></div>" +
          '<a class="btn btn--block" href="#/riwayat">Lihat Riwayat Audit</a>';
        return;
      }

      var info = (rec.data && rec.data.info) || {};
      var result = AA.scoring.forRecord(rec);
      var warning = AA.storage.lastWriteOk ? "" :
        '<p class="notice notice--error">Browser memblokir penyimpanan. Audit hanya tersimpan selama halaman ini terbuka.</p>';

      container.innerHTML =
        '<div class="done">' +
          '<div class="done-mark">' + AA.components.icon("audit") + "</div>" +
          "<h1>Audit Selesai</h1>" +
          "<p>Data audit sudah disimpan.</p>" +
        "</div>" +
        warning +
        '<h2 class="section-title">Hasil Audit</h2>' +
        AA.components.scoreCard.render(result, { precise: true }) +
        '<section class="card"><dl class="review-list">' +
          row("Asset ID", info.assetId) +
          row("Jenis Perangkat", rec.deviceLabel) +
          row("Tanggal Audit", AA.utils.formatDateID(info.tanggal)) +
          row("Nama Auditor", info.auditor) +
        "</dl></section>" +
        '<a class="btn btn--block" href="#/riwayat">Lihat Riwayat Audit</a>';
    }
  };
})(window.AssetAudit);
