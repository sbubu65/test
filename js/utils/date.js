/* Fungsi bantu tanggal.
   Format simpan: YYYY-MM-DD (cocok dengan <input type="date">). Format tampil: DD/MM/YYYY. */
(function (AA) {
  // Pakai tanggal lokal perangkat (bukan UTC) agar tidak meleset sehari di zona waktu Indonesia.
  AA.utils.todayISO = function () {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  };

  AA.utils.formatDateID = function (iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    return m ? m[3] + "/" + m[2] + "/" + m[1] : (iso || "");
  };
})(window.AssetAudit);
