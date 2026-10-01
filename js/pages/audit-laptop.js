/* Halaman Audit Laptop: seluruh isi form berasal dari AssetAudit.auditDefs.laptop */
(function (AA) {
  AA.pages["audit-laptop"] = {
    title: "Audit Laptop",
    render: function (container) {
      AA.components.auditWizard(container, AA.auditDefs.laptop);
    }
  };
})(window.AssetAudit);
