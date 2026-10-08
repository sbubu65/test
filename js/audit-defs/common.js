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

  /* Validator isian untuk field dengan  validate: "<nama>".
     Bentuk: function (nilai, dataSection) -> pesan kesalahan ("" jika valid).
     Hanya dijalankan jika isian TIDAK kosong (kosong ditangani oleh required).
     Aturan yang sama dipakai di apps-script/Code.gs agar frontend dan server sepakat. */
  var validators = AA.auditDefs.validators = {
    serial: function (v) {
      return /^[A-Za-z0-9][A-Za-z0-9._\/-]{2,39}$/.test(v)
        ? "" : "harus 3–40 karakter: huruf, angka, titik, strip, atau garis miring";
    },
    imei: function (v) {
      return /^\d{15}$/.test(v) ? "" : "harus 15 digit angka (tanpa spasi atau tanda baca)";
    },
    imei2: function (v, sec) {
      var e = validators.imei(v);
      if (e) return e;
      return v === String((sec && sec.imei1) || "").trim() ? "tidak boleh sama dengan IMEI 1" : "";
    }
  };

  /* Daftarkan perangkat baru tanpa mengubah config.js:
       - mengisi "auditRoute" pada jenis perangkat di config.deviceTypes (kartu pilihan jadi aktif),
       - menambah rute tersembunyi,
       - membuat halaman audit-nya (memakai wizard yang sama dengan Laptop).
     Dipanggil di akhir file definisi perangkat. */
  AA.registerDevice = function (def, route) {
    var cfg = AA.config;
    var type = cfg.deviceTypes.filter(function (d) { return d.id === def.id; })[0];
    if (type && !type.auditRoute) type.auditRoute = route;
    if (!cfg.routes.some(function (r) { return r.id === route; })) {
      cfg.routes.push({ id: route, label: "Audit " + def.label, hidden: true, navParent: "mulai-audit" });
    }
    if (!AA.pages[route]) {
      AA.pages[route] = {
        title: "Audit " + def.label,
        render: function (container) { AA.components.auditWizard(container, def); }
      };
    }
  };
})(window.AssetAudit);
