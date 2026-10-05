/* Titik masuk aplikasi */
(function (AA) {
  document.getElementById("app-name").textContent = AA.config.appName;
  document.getElementById("app-version").textContent = AA.config.version;
  AA.router.start(document.getElementById("app"), document.getElementById("main-nav"));

  // Setelah sebuah audit selesai disinkronkan (otomatis atau manual), segarkan halaman yang menampilkan
  // statusnya. Formulir audit sengaja TIDAK disegarkan agar isian yang sedang diketik tidak hilang.
  window.addEventListener("assetaudit:sync", function () {
    var route = location.hash.replace(/^#\/?/, "").split("/")[0];
    if (["riwayat", "hasil-audit", "audit-selesai"].indexOf(route) >= 0) AA.router.refresh();
  });

  // Kirim otomatis audit yang belum tersinkron: saat aplikasi dibuka, saat internet kembali,
  // saat tab dibuka kembali, dan berkala.
  AA.sync.startAuto();
})(window.AssetAudit);
