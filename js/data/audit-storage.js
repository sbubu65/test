/* Penyimpanan audit di localStorage (sementara, sampai ada Google Spreadsheet).
   Hanya modul ini yang tahu cara menyimpan; halaman cukup memanggil list/get/add,
   jadi nanti bisa diganti sumber datanya tanpa mengubah halaman.

   Bentuk satu record:
   { id, deviceType, deviceLabel, status: "Selesai", savedAt, data: { info: {...}, ... } } */
(function (AA) {
  var KEY = "assetAudit.audits.v1";
  var memory = []; // cadangan jika localStorage diblokir browser

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
        return a.savedAt < b.savedAt ? 1 : -1;
      });
    },

    get: function (id) {
      return read().filter(function (r) { return r.id === id; })[0] || null;
    },

    add: function (record) {
      var list = read();
      list.push(record);
      this.lastWriteOk = write(list);
      return this.lastWriteOk;
    }
  };
})(window.AssetAudit);
