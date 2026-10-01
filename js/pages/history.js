/* Halaman Riwayat Audit: audit tersimpan di browser (localStorage), lengkap dengan Nilai dan Kondisi
   dari hasil scoring. */
(function (AA) {
  var esc = AA.utils.escapeHtml;

  AA.pages["riwayat"] = {
    title: "Riwayat Audit",

    render: function (container) {
      var rows = AA.storage.list().map(function (rec) {
        var info = (rec.data && rec.data.info) || {};
        var sc = AA.scoring.forRecord(rec);
        return {
          tanggal: AA.utils.formatDateID(info.tanggal),
          assetId: info.assetId,
          jenis: rec.deviceLabel,
          auditor: info.auditor,
          nilai: sc.scoreText,
          kondisi: sc.condition,
          tone: sc.tone,
          status: rec.status
        };
      });

      var content;
      if (rows.length === 0) {
        content =
          '<div class="empty">' +
            "<p>Belum ada audit yang tersimpan.</p>" +
            '<a class="btn" href="#/mulai-audit">Mulai Audit</a>' +
          "</div>";
      } else {
        content = AA.components.dataTable([
          { key: "tanggal", label: "Tanggal" },
          { key: "assetId", label: "Asset ID" },
          { key: "jenis",   label: "Jenis" },
          { key: "auditor", label: "Auditor" },
          { key: "nilai",   label: "Nilai", className: "is-num" },
          { key: "kondisi", label: "Kondisi", render: function (r) { return '<span class="badge badge--' + esc(r.tone) + '">' + esc(r.kondisi) + "</span>"; } },
          { key: "status",  label: "Status", render: function (r) { return '<span class="badge">' + esc(r.status) + "</span>"; } }
        ], rows);
      }

      container.innerHTML =
        '<div class="page-head">' +
          "<h1>Riwayat Audit</h1>" +
          "<p>Daftar audit yang sudah dilakukan.</p>" +
        "</div>" + content;
    }
  };
})(window.AssetAudit);
