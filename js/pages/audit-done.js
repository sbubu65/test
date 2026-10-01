/* Halaman Audit Selesai (setelah submit). URL: #/audit-selesai/<id> */
(function (AA) {
  AA.pages["audit-selesai"] = {
    title: "Audit Selesai",
    render: function (container, ctx) {
      AA.components.auditResult.mount(container, ctx && ctx.param, "done");
    }
  };
})(window.AssetAudit);
