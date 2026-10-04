/* Tampilan Hasil Audit (read-only). Dipakai oleh:
   - halaman Audit Selesai (mode "done")  : setelah submit
   - halaman Detail Hasil Audit (mode "detail") : dibuka dari Riwayat
   Semua angka berasal dari AssetAudit.scoring; tidak ada rumus di sini. */
(function (AA) {
  var esc = AA.utils.escapeHtml;

  function row(label, valueHtml) {
    return '<div class="review-row"><dt>' + esc(label) + "</dt><dd>" + valueHtml + "</dd></div>";
  }

  function itemList(items, modifier) {
    return '<ul class="item-list ' + modifier + '">' + items.map(function (i) {
      return (
        "<li>" +
          '<span class="item-list__name">' + esc(i.label) + "</span>" +
          '<span class="item-list__meta">' + esc(i.section) + "</span>" +
          (i.note ? '<span class="item-list__note">Catatan: ' + esc(i.note) + "</span>" : "") +
        "</li>"
      );
    }).join("") + "</ul>";
  }

  /* Panel status sinkronisasi. Sukses -> banner hijau (hanya setelah submit). Belum tersinkron ->
     pesan + tombol "Coba Sinkronkan Lagi" (mengirim ulang data dari localStorage dengan auditId yang sama). */
  function syncPanel(rec, mode) {
    if (AA.sync.isSynced(rec)) {
      return mode === "done"
        ? '<div class="notice notice--ok" role="status"><strong>Audit berhasil disimpan</strong><br>Tersimpan ke Spreadsheet.</div>'
        : "";
    }
    if (AA.sync.isBusy(rec.id)) {
      return '<div class="notice notice--info" role="status">Menyinkronkan audit...</div>';
    }
    var msg = rec.syncStatus === "failed"
      ? (rec.syncMessage || AA.api.messages.fail)
      : "Audit ini belum dikirim ke Spreadsheet. Data tersimpan di perangkat ini.";
    return (
      '<div class="notice notice--error" role="alert"><p>' + esc(msg) + "</p>" +
      '<button type="button" class="btn btn--secondary" data-action="retry-sync">Coba Sinkronkan Lagi</button></div>'
    );
  }

  function body(rec) {
    var b = AA.storage.basics(rec);
    var r = AA.scoring.forRecord(rec);
    var def = AA.auditDefs[rec.deviceType];
    var notOk = def ? AA.scoring.listByStatus(def, rec.data, "Tidak OK") : [];
    var na = def ? AA.scoring.listByStatus(def, rec.data, "N/A") : [];
    var stat = AA.components.statCard;
    var cond = '<span class="badge badge--' + esc(r.tone) + '">' + esc(r.condition) + "</span>";

    // Tidak OK
    var notOkBody;
    if (notOk.length) notOkBody = itemList(notOk, "item-list--bad");
    else if (r.counted === 0) notOkBody = '<p class="result-empty">Belum ada item yang dinilai.</p>';
    else notOkBody = '<p class="result-empty">Semua item yang dinilai dalam kondisi OK.</p>';

    return (
      '<div class="result-top">' +
        '<section class="card"><h2>Informasi Audit</h2><dl class="review-list">' +
          row("Asset ID", esc(b.assetId || "-")) +
          row("Nama Auditor", esc(b.auditor || "-")) +
          row("Tanggal Audit", esc(AA.utils.formatDateID(b.tanggal) || "-")) +
          row("Device Type", esc(rec.deviceLabel || "-")) +
          row("Sinkronisasi", '<span class="badge badge--' + (AA.sync.isSynced(rec) ? "synced" : "unsynced") + '">' + esc(AA.sync.label(rec)) + "</span>") +
        "</dl></section>" +
        AA.components.scoreCard.render(r, { hero: true }) +
      "</div>" +

      '<h2 class="section-title">Ringkasan Checklist</h2>' +
      '<div class="stat-grid stat-grid--5">' +
        stat({ label: "Total Item",         value: r.total }) +
        stat({ label: "OK",                 value: r.ok,    tone: "ok" }) +
        stat({ label: "Tidak OK",           value: r.notOk, tone: "bad" }) +
        stat({ label: "N/A",                value: r.na }) +
        stat({ label: "Item yang Dinilai",  value: r.counted, tone: "ok" }) +
      "</div>" +

      '<section class="card"><h2>Summary Detail</h2><dl class="review-list">' +
        row("Total Checklist", esc(r.total)) +
        row("OK", esc(r.ok)) +
        row("Tidak OK", esc(r.notOk)) +
        row("N/A", esc(r.na)) +
        row("Item Dinilai", esc(r.counted)) +
        row("Nilai Audit", esc(r.scoreText)) +
        row("Kondisi", cond) +
      "</dl></section>" +

      '<section class="card"><h2>Item Tidak OK</h2>' + notOkBody + "</section>" +

      (na.length
        ? '<section class="card"><h2>Item N/A</h2>' + itemList(na, "") +
          '<p class="result-note">Item N/A tidak mempengaruhi nilai audit.</p></section>'
        : "")
    );
  }

  /* mode: "done" | "detail" */
  AA.components.auditResult = {
    mount: function (container, id, mode) {
      var rec = id ? AA.storage.get(id) : null;

      if (!rec) {
        container.innerHTML =
          '<div class="page-head"><h1>Audit tidak ditemukan</h1>' +
          "<p>Data audit ini tidak ada di browser ini.</p></div>" +
          '<a class="btn btn--block" href="#/riwayat">Lihat Riwayat Audit</a>';
        return;
      }

      var head, action;
      if (mode === "done") {
        var warning = AA.storage.lastWriteOk ? "" :
          '<p class="notice notice--error">Browser memblokir penyimpanan. Audit hanya tersimpan selama halaman ini terbuka.</p>';
        head =
          '<div class="done">' +
            '<div class="done-mark">' + AA.components.icon("audit") + "</div>" +
            "<h1>Audit Selesai</h1>" +
            "<p>" + (AA.sync.isSynced(rec) ? "Data audit sudah disimpan." : "Data audit disimpan di perangkat ini.") + "</p>" +
          "</div>" + warning;
        action = '<a class="btn btn--block" href="#/riwayat">Lihat Riwayat Audit</a>';
      } else {
        head =
          '<div class="page-head"><h1>Detail Hasil Audit</h1>' +
          "<p>Hasil audit yang tersimpan. Data audit tidak dapat diubah.</p></div>";
        action = '<a class="btn btn--secondary btn--block" href="#/riwayat">Kembali ke Riwayat</a>';
      }

      container.innerHTML = head + syncPanel(rec, mode) + body(rec) + '<div class="result-action">' + action + "</div>";

      // Coba Sinkronkan Lagi: kirim ulang dari localStorage, lalu tampilkan status terbaru
      var retry = container.querySelector('[data-action="retry-sync"]');
      if (retry) {
        retry.addEventListener("click", function () {
          retry.disabled = true;
          retry.textContent = "Menyinkronkan...";
          var hash = location.hash;
          AA.sync.push(rec.id).then(function () {
            if (location.hash === hash) AA.components.auditResult.mount(container, id, mode); // jangan menimpa halaman lain
          });
        });
      }
    }
  };
})(window.AssetAudit);
