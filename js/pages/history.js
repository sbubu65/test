/* Halaman Riwayat Audit: audit tersimpan di browser (localStorage).
   Klik satu baris untuk membuka detail hasil audit (hanya baca). */
(function (AA) {
  var esc = AA.utils.escapeHtml;

  AA.pages["riwayat"] = {
    title: "Riwayat Audit",

    render: function (container) {
      var rows = AA.storage.list().map(function (rec) {
        var b = AA.storage.basics(rec);
        var sc = AA.scoring.forRecord(rec);
        return {
          id: rec.id,
          tanggal: AA.utils.formatDateID(b.tanggal),
          assetId: b.assetId,
          device: rec.deviceLabel,
          auditor: b.auditor,
          nilai: sc.scoreText,
          kondisi: sc.condition,
          tone: sc.tone,
          status: rec.status
        };
      });

      if (rows.length === 0) {
        container.innerHTML =
          '<div class="page-head"><h1>Riwayat Audit</h1><p>Daftar audit yang sudah dilakukan.</p></div>' +
          '<div class="empty">' +
            "<p>Belum ada data audit.</p>" +
            '<a class="btn" href="#/mulai-audit">Mulai Audit</a>' +
          "</div>";
        return;
      }

      var table = AA.components.dataTable([
        { key: "tanggal", label: "Tanggal" },
        { key: "assetId", label: "Asset ID", render: function (r) {
            return '<a class="row-link" href="#/hasil-audit/' + esc(r.id) + '">' + esc(r.assetId) + "</a>";
        } },
        { key: "device",  label: "Device" },
        { key: "auditor", label: "Auditor" },
        { key: "nilai",   label: "Nilai", className: "is-num" },
        { key: "kondisi", label: "Kondisi", render: function (r) {
            return '<span class="badge badge--' + esc(r.tone) + '">' + esc(r.kondisi) + "</span>";
        } },
        { key: "status",  label: "Status", render: function (r) { return '<span class="badge">' + esc(r.status) + "</span>"; } }
      ], rows, { rowHref: function (r) { return "#/hasil-audit/" + r.id; } });

      container.innerHTML =
        '<div class="page-head">' +
          "<h1>Riwayat Audit</h1>" +
          "<p>Ketuk satu audit untuk melihat detail hasilnya.</p>" +
        "</div>" + table;

      // Seluruh baris (kartu di HP) bisa diklik; link di kolom Asset ID tetap bisa dipakai keyboard.
      container.querySelector(".data-table").addEventListener("click", function (e) {
        var tr = e.target.closest("tr[data-href]");
        if (tr && !e.target.closest("a")) location.hash = tr.getAttribute("data-href");
      });
    }
  };
})(window.AssetAudit);
