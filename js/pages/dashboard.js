/* Halaman Dashboard */
(function (AA) {
  AA.pages["dashboard"] = {
    title: "Dashboard",

    render: function (container) {
      var s = AA.data.summary;
      var card = AA.components.statCard;

      container.innerHTML =
        '<div class="page-head">' +
          "<h1>Dashboard</h1>" +
          "<p>Ringkasan audit perangkat perusahaan.</p>" +
        "</div>" +
        '<div class="stat-grid">' +
          card({ label: "Total Audit",          value: s.total }) +
          card({ label: "Audit Selesai",        value: s.selesai,       tone: "ok" }) +
          card({ label: "Audit Belum Selesai",  value: s.belumSelesai,  tone: "warn" }) +
          card({ label: "Rata-rata Nilai Audit", value: s.rataRataNilai + "%" }) +
        "</div>" +
        '<div class="section-action">' +
          '<a class="btn btn--block" href="#/mulai-audit">Mulai Audit</a>' +
        "</div>";
    }
  };
})(window.AssetAudit);
