/* Titik masuk aplikasi */
(function (AA) {
  document.getElementById("app-name").textContent = AA.config.appName;
  document.getElementById("app-version").textContent = AA.config.version;
  AA.router.start(document.getElementById("app"), document.getElementById("main-nav"));
})(window.AssetAudit);
