/* Draft audit yang sedang diisi (disimpan di memori selama halaman terbuka).
   Dipisah dari storage supaya data setengah jadi tidak masuk riwayat. */
(function (AA) {
  var drafts = {};

  AA.draft = {
    reset: function (deviceId) {
      drafts[deviceId] = {
        deviceId: deviceId,
        step: 0,
        data: { info: { tanggal: AA.utils.todayISO() } }
      };
      return drafts[deviceId];
    },

    ensure: function (deviceId) {
      return drafts[deviceId] || this.reset(deviceId);
    },

    clear: function (deviceId) {
      delete drafts[deviceId];
    }
  };
})(window.AssetAudit);
