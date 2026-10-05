/* Penyimpanan audit di localStorage (sementara, sampai ada Google Spreadsheet).
   Hanya modul ini yang tahu cara menyimpan; halaman cukup memanggil list/get/add,
   jadi nanti bisa diganti sumber datanya tanpa mengubah halaman.

   Bentuk satu record (V0.4, schemaVersion 2):
   { schemaVersion, id (audit ID), assetId, deviceType, deviceLabel, auditor, tanggal,
     specifications, checklist, license, scoring, score, condition, status, createdAt,
     auditId, syncStatus ("pending" | "synced" | "failed"), syncMessage,
     data }   <- data = salinan lengkap per section; dipakai aplikasi untuk menampilkan ulang audit
   Record V0.2/V0.3 (tanpa field di atas, memakai savedAt) tetap terbaca lewat basics()/createdOf(). */
(function (AA) {
  var KEY = "assetAudit.audits.v1";
  var memory = []; // cadangan jika localStorage diblokir browser

  function createdOf(rec) {
    return rec.createdAt || rec.savedAt || "";
  }

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return memory;
    }
  }

  function write(list) {
    memory = list;
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      return false;
    }
  }

  AA.storage = {
    lastWriteOk: true,

    // Terbaru di atas
    list: function () {
      return read().slice().sort(function (a, b) {
        return createdOf(a) < createdOf(b) ? 1 : -1;
      });
    },

    // Data dasar audit, baik record lama maupun baru
    basics: function (rec) {
      var info = (rec && rec.data && rec.data.info) || {};
      return {
        assetId: info.assetId || rec.assetId || "",
        auditor: info.auditor || rec.auditor || "",
        tanggal: info.tanggal || rec.tanggal || "",
        createdAt: createdOf(rec)
      };
    },

    get: function (id) {
      return read().filter(function (r) { return r.id === id; })[0] || null;
    },

    // Ubah sebagian field satu audit (mis. syncStatus). Return record terbaru, atau null jika tidak ada.
    update: function (id, patch) {
      var list = read();
      var rec = list.filter(function (r) { return r.id === id; })[0];
      if (!rec) return null;
      for (var k in patch) rec[k] = patch[k];
      this.lastWriteOk = write(list);
      return rec;
    },

    add: function (record) {
      var list = read();
      list.push(record);
      this.lastWriteOk = write(list);
      return this.lastWriteOk;
    }
  };
})(window.AssetAudit);
