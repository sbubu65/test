/* Namespace global + konfigurasi aplikasi.
   Semua modul mendaftar ke window.AssetAudit (tanpa ES module, agar bisa dibuka langsung dari file). */
window.AssetAudit = {
  config: {
    appName: "Asset Audit",
    version: "V0.3",
    defaultRoute: "dashboard",

    // Daftar halaman.
    // - Tanpa "hidden": tampil di menu utama.
    // - "hidden: true": halaman yang dibuka dari alur lain (tidak ada di menu).
    //   "navParent" menentukan menu mana yang tetap ditandai aktif.
    routes: [
      { id: "dashboard",    label: "Dashboard",      icon: "dashboard" },
      { id: "mulai-audit",  label: "Mulai Audit",    icon: "audit" },
      { id: "riwayat",      label: "Riwayat Audit",  icon: "history" },

      { id: "audit-laptop", label: "Audit Laptop",   hidden: true, navParent: "mulai-audit" },
      { id: "audit-selesai", label: "Audit Selesai", hidden: true, navParent: "mulai-audit" }
    ],

    // Jenis perangkat. "auditRoute" diisi jika audit untuk perangkat itu sudah tersedia.
    // Perangkat lain tinggal ditambah auditRoute + definisi di js/audit-defs/ + satu file di js/pages/.
    deviceTypes: [
      { id: "laptop",     label: "Laptop",     icon: "laptop",     auditRoute: "audit-laptop" },
      { id: "smartphone", label: "Smartphone", icon: "smartphone" },
      { id: "tablet",     label: "Tablet",     icon: "tablet" },
      { id: "imac",       label: "iMac",       icon: "imac" }
    ]
  },

  data: {},        // sumber data (dummy sekarang, Google Spreadsheet nanti)
  utils: {},       // fungsi bantu
  components: {},  // potongan UI yang bisa dipakai ulang
  auditDefs: {},   // definisi form audit per jenis perangkat
  pages: {}        // satu modul per halaman
};
