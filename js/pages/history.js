/* Halaman Riwayat Audit */
(function (AA) {
  var esc = AA.utils.escapeHtml;

  AA.pages["riwayat"] = {
    title: "Riwayat Audit",

    render: function (container) {
      var columns = [
        { key: "tanggal", label: "Tanggal" },
        { key: "assetId", label: "Asset ID" },
        { key: "jenis",   label: "Jenis" },
        { key: "hasil",   label: "Hasil", render: function (r) { return '<span class="badge">' + esc(r.hasil) + "</span>"; } },
        { key: "nilai",   label: "Nilai", className: "is-num" }
      ];

      container.innerHTML =
        '<div class="page-head">' +
          "<h1>Riwayat Audit</h1>" +
          "<p>Daftar audit yang sudah dilakukan.</p>" +
        "</div>" +
        AA.components.dataTable(columns, AA.data.history);
    }
  };
})(window.AssetAudit);
