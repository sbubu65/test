/* Bagian definisi audit yang dipakai semua jenis perangkat. */
(function (AA) {
  AA.auditDefs.statuses = ["OK", "Tidak OK", "N/A"];

  // Bagian "Informasi Audit" sama untuk semua perangkat; hanya contoh Asset ID yang berbeda.
  AA.auditDefs.makeInfoSection = function (assetIdExample) {
    return {
      id: "info",
      title: "Informasi Audit",
      type: "fields",
      fields: [
        { id: "assetId", label: "Asset ID",     placeholder: "Contoh: " + assetIdExample, required: true },
        { id: "auditor", label: "Nama Auditor", placeholder: "Contoh: Budi",              required: true },
        { id: "tanggal", label: "Tanggal Audit", type: "date",                            required: true }
      ]
    };
  };
})(window.AssetAudit);
