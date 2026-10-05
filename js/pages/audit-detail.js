/* Halaman Detail Hasil Audit (dibuka dari Riwayat). URL: #/hasil-audit/<id> */
(function (AA) {
  AA.pages["hasil-audit"] = {
    title: "Detail Audit",
    render: function (container, ctx) {
      AA.components.auditResult.mount(container, ctx && ctx.param, "detail");
    }
  };
})(window.AssetAudit);
