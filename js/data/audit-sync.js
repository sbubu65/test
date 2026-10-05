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
          ? { syncStatus: "synced", syncMessage: "", syncedAt: new Date().toISOString() }
          : { syncStatus: "failed", syncMessage: res.message });
        window.dispatchEvent(new CustomEvent("assetaudit:sync", { detail: { id: id, ok: res.ok } }));
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

  /* ---------- Sinkronisasi otomatis ---------- */
  var AUTO_INTERVAL_MS = 2 * 60 * 1000; // cek ulang tiap 2 menit selama aplikasi terbuka
  var running = false;
  var started = false;

  // Kegagalan karena jaringan/URL menghentikan antrean (percuma mencoba sisanya sekarang).
  // Kegagalan karena data/respons server hanya melewati audit itu dan lanjut ke berikutnya.
  var STOP_REASONS = ["network", "timeout", "not-configured"];

  /* Kirim semua audit yang belum tersinkron, satu per satu, dari yang paling lama.
     Aman dipanggil berulang: tidak berjalan ganda, dan Apps Script menolak auditId yang sudah ada. */
  function syncAll() {
    if (running || !AA.api.isConfigured() || navigator.onLine === false) return Promise.resolve();
    var queue = AA.storage.list().filter(function (r) { return !isSynced(r); }).reverse();
    if (queue.length === 0) return Promise.resolve();

    running = true;
    function next() {
      var rec = queue.shift();
      if (!rec) return Promise.resolve();
      return push(rec.id).then(function (res) {
        if (!res.ok && STOP_REASONS.indexOf(res.reason) >= 0) return null;
        return next();
      });
    }
    return next().then(function () { running = false; }, function () { running = false; });
  }

  function startAuto() {
    if (started) return;
    started = true;
    syncAll();
    window.addEventListener("online", syncAll);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) syncAll(); });
    setInterval(syncAll, AUTO_INTERVAL_MS);
  }

  AA.sync = {
    isSynced: isSynced,
    syncAll: syncAll,
    startAuto: startAuto,
    isBusy: function (id) { return !!inFlight[id]; },
    label: function (rec) { return isSynced(rec) ? "Tersimpan ke Spreadsheet" : "Belum Tersinkron"; }, // halaman Hasil Audit
    shortLabel: function (rec) { return isSynced(rec) ? "Tersinkron" : "Belum Sinkron"; },             // kolom Sync di Riwayat
    push: push
  };
})(window.AssetAudit);
