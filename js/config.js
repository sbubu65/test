/* Namespace global + konfigurasi aplikasi.
   Semua modul mendaftar ke window.AssetAudit (tanpa ES module, agar bisa dibuka langsung dari file). */
window.AssetAudit = {
  config: {
    appName: "Asset Audit",
    version: "V0.1",
    defaultRoute: "dashboard",

    // Menu utama. Tambah menu baru cukup menambah satu baris di sini + satu file di js/pages/.
    routes: [
      { id: "dashboard",   label: "Dashboard",      icon: "dashboard" },
      { id: "mulai-audit", label: "Mulai Audit",    icon: "audit" },
      { id: "riwayat",     label: "Riwayat Audit",  icon: "history" }
    ],

    // Jenis perangkat yang bisa diaudit. Checklist per jenis perangkat bisa ditambahkan di versi berikutnya.
    deviceTypes: [
      { id: "laptop",     label: "Laptop",     icon: "laptop" },
      { id: "smartphone", label: "Smartphone", icon: "smartphone" },
      { id: "tablet",     label: "Tablet",     icon: "tablet" },
      { id: "imac",       label: "iMac",       icon: "imac" }
    ]
  },

  data: {},        // sumber data (dummy sekarang, Google Spreadsheet nanti)
  utils: {},       // fungsi bantu
  components: {},  // potongan UI yang bisa dipakai ulang
  pages: {}        // satu modul per halaman
};
