/* Halaman Riwayat Audit: menampilkan audit yang tersimpan di browser (localStorage). */
(function (AA) {
  var esc = AA.utils.escapeHtml;

  AA.pages["riwayat"] = {
    title: "Riwayat Audit",

    render: function (container) {
      var rows = AA.storage.list().map(function (rec) {
        var info = (rec.data && rec.data.info) || {};
        return {
          tanggal: AA.utils.formatDateID(info.tanggal),
          assetId: info.assetId,
          jenis: rec.deviceLabel,
          auditor: info.auditor,
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
