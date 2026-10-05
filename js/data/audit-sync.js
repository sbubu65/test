/* Status & proses sinkronisasi audit ke Spreadsheet.
   syncStatus di record: "pending" (sedang/ belum selesai dikirim) | "synced" | "failed".
   Audit lama (V0.4) belum punya syncStatus -> dianggap belum tersinkron. */
(function (AA) {
  var inFlight = {}; // id audit -> Promise; mencegah pengiriman ganda dari klik berulang

  function isSynced(rec) {
    return !!rec && rec.syncStatus === "synced";
  }

  /* Kirim (atau kirim ulang) satu audit yang tersimpan di localStorage.
     Selalu resolve dengan { ok, duplicate, message }. Data localStorage tidak pernah dihapus. */
  function push(id) {
    if (inFlight[id]) return inFlight[id];

    var rec = AA.storage.get(id);
    if (!rec) return Promise.resolve({ ok: false, message: "Data audit tidak ditemukan." });

    // Audit lama (V0.4) belum punya auditId: buat sekali, lalu pakai terus agar tidak terduplikasi
    if (!rec.auditId) {
      rec = AA.storage.update(id, { auditId: AA.api.newAuditId(new Date(rec.createdAt || rec.savedAt || Date.now())) });
    }
    rec = AA.storage.update(id, { syncStatus: "pending" });

    var promise = AA.api.send(rec)
      .then(function (res) {
        AA.storage.update(id, res.ok
          ? { syncStatus: "synced", syncMessage: "" }
          : { syncStatus: "failed", syncMessage: res.message });
        return res;
      })
      .then(function (res) { delete inFlight[id]; return res; }, function (err) {
        console.error("[AssetAudit] Kesalahan tak terduga saat sinkronisasi:", err);
        AA.storage.update(id, { syncStatus: "failed", syncMessage: AA.api.messages.fail });
        delete inFlight[id];
        return { ok: false, message: AA.api.messages.fail };
      });

    inFlight[id] = promise;
    return promise;
  }

  AA.sync = {
    isSynced: isSynced,
    isBusy: function (id) { return !!inFlight[id]; },
    label: function (rec) { return isSynced(rec) ? "Tersimpan ke Spreadsheet" : "Belum Tersinkron"; }, // halaman Hasil Audit
    shortLabel: function (rec) { return isSynced(rec) ? "Tersinkron" : "Belum Sinkron"; },             // kolom Sync di Riwayat
    push: push
  };
})(window.AssetAudit);
