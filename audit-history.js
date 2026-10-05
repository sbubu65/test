/* Sumber data Riwayat Audit: Spreadsheet (lewat Apps Script) + localStorage.

   - Spreadsheet adalah sumber utama untuk audit yang sudah tersinkron (dari semua perangkat).
   - Hasil terakhir dari Spreadsheet disimpan sebagai cache di localStorage ("assetAudit.remoteCache.v1").
   - Audit di perangkat ini yang belum tersinkron selalu ikut tampil (status "Belum Sinkron").
   - Jika Spreadsheet tidak bisa diakses, yang tampil = cache + audit lokal. */
(function (AA) {
  var CACHE_KEY = "assetAudit.remoteCache.v1";
  var FRESH_MS = 30 * 1000;   // dalam 30 detik terakhir tidak perlu mengambil ulang saat membuka Riwayat

  var snap = readCache();     // { rows: [...] | null, fetchedAt: ISO }
  var lastError = null;
  var inFlight = null;

  function readCache() {
    try {
      var c = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (c && Array.isArray(c.rows)) return { rows: c.rows, fetchedAt: String(c.fetchedAt || "") };
    } catch (e) { /* abaikan cache rusak */ }
    return { rows: null, fetchedAt: "" };
  }

  function saveCache() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: snap.fetchedAt, rows: snap.rows })); }
    catch (e) { /* penyimpanan penuh/diblokir: cache hanya di memori */ }
  }

  /* Ringkasan satu audit untuk tabel Riwayat */
  function viewModel(rec) {
    var b = AA.storage.basics(rec);
    return {
      key: rec.auditId || rec.id,        // dipakai di URL detail
      assetId: b.assetId,
      device: rec.deviceLabel,
      auditor: b.auditor,
      tanggal: b.tanggal,
      createdAt: b.createdAt,
      result: AA.scoring.forRecord(rec), // nilai & kondisi: selalu dari satu rumus scoring
      status: rec.status || "Selesai",
      synced: AA.sync.isSynced(rec),
      source: rec.source || "local"
    };
  }

  /* Gabungan Spreadsheet + lokal, tanpa duplikat (kunci: auditId) */
  function items() {
    var locals = AA.storage.list();
    var rows = snap.rows;
    var localByAudit = {};
    locals.forEach(function (l) { if (l.auditId) localByAudit[l.auditId] = l; });

    var out = [];
    var seen = {};

    // 1) Dari Spreadsheet. Jika audit itu juga ada di perangkat ini, pakai salinan lokal
    //    (punya catatan checklist yang tidak ada di Spreadsheet) dan tandai tersinkron.
    (rows || []).forEach(function (row) {
      var id = String((row && row.auditId) || "");
      if (!id || seen[id]) return;
      seen[id] = true;
      var rec = localByAudit[id] ? Object.assign({}, localByAudit[id], { syncStatus: "synced" }) : AA.api.rowToRecord(row);
      out.push(viewModel(rec));
    });

    // 2) Audit lokal yang tidak ada di Spreadsheet
    locals.forEach(function (l) {
      if (l.auditId && seen[l.auditId]) return;
      // Pernah tersinkron tetapi barisnya sudah tidak ada di Spreadsheet (dihapus manual): jangan tampilkan.
      // Audit yang baru tersinkron SETELAH pengambilan data terakhir tetap ditampilkan.
      if (rows && AA.sync.isSynced(l) && (!l.syncedAt || l.syncedAt < snap.fetchedAt)) return;
      out.push(viewModel(l));
    });
    return out;
  }

  // Audit lokal yang ternyata sudah ada di Spreadsheet (mis. respons sebelumnya hilang) -> tandai synced
  function healLocal(rows) {
    var ids = {};
    rows.forEach(function (r) { if (r && r.auditId) ids[r.auditId] = true; });
    AA.storage.list().forEach(function (l) {
      if (l.auditId && ids[l.auditId] && !AA.sync.isSynced(l)) {
        AA.storage.update(l.id, { syncStatus: "synced", syncMessage: "", syncedAt: new Date().toISOString() });
      }
    });
  }

  /* Ambil data terbaru dari Spreadsheet, perbarui cache. Selalu resolve { ok, reason, message }. */
  function refresh() {
    if (inFlight) return inFlight;
    var startedAt = new Date().toISOString(); // dicatat SEBELUM request, lihat aturan syncedAt di items()
    inFlight = AA.api.fetchList().then(function (res) {
      if (res.ok) {
        snap = { rows: res.rows, fetchedAt: startedAt };
        lastError = null;
        saveCache();
        healLocal(res.rows);
      } else {
        lastError = res;
      }
      inFlight = null;
      return res;
    });
    return inFlight;
  }

  /* Satu audit: lokal -> cache Spreadsheet. (Jika belum ada: fetchRecord) */
  function getRecord(id) {
    var local = AA.storage.get(id);
    if (local) return local;
    var rows = snap.rows || [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i].auditId === id) return AA.api.rowToRecord(rows[i]);
    }
    return null;
  }

  /* Ambil satu audit langsung dari Spreadsheet (berdasarkan auditId). Resolve { rec, failed }. */
  function fetchRecord(id) {
    return AA.api.fetchById(id).then(function (res) {
      if (!res.ok) return { rec: null, failed: true };
      return { rec: res.row ? AA.api.rowToRecord(res.row) : null, failed: false };
    });
  }

  AA.history = {
    items: items,
    refresh: refresh,
    getRecord: getRecord,
    fetchRecord: fetchRecord,
    isBusy: function () { return !!inFlight; },
    // Cukup baru (berhasil diambil < 30 detik lalu)?
    isFresh: function () {
      return !lastError && !!snap.fetchedAt && Date.now() - Date.parse(snap.fetchedAt) < FRESH_MS;
    },
    hasRemote: function () { return snap.rows !== null; },
    fetchedAt: function () { return snap.fetchedAt; },
    lastError: function () { return lastError; }
  };
})(window.AssetAudit);
