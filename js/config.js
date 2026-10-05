/* Namespace global + konfigurasi aplikasi.
   Semua modul mendaftar ke window.AssetAudit (tanpa ES module, agar bisa dibuka langsung dari file). */
window.AssetAudit = {
  config: {
    appName: "Asset Audit",
    version: "V0.5",
    defaultRoute: "dashboard",

    // ============================================================================================
    // KONFIGURASI GOOGLE APPS SCRIPT  —  SATU-SATUNYA tempat URL API diisi.
    //
    // WAJIB DIGANTI: setelah Anda men-deploy Apps Script sebagai Web App, salin URL-nya
    // (berakhiran /exec) lalu tempel di bawah, menggantikan teks PASTE_...
    //   Contoh: "https://script.google.com/macros/s/AKfycb.../exec"
    //
    // Selama masih berisi PASTE_..., audit tetap tersimpan di perangkat tetapi
    // statusnya "Belum Tersinkron".
    // JANGAN menaruh API key / password di sini: file ini bisa dibaca siapa pun yang membuka web.
    // ============================================================================================
    api: {
      API_URL: https://script.googleusercontent.com/macros/echo?user_content_key=AUkAhnTN9YCYi0jU01sCjkN7VmpFJaOvlefzmxcZkYjsGLDqCT2PUKJBQYlUoYfrqjTeIv2OLoAn7HaaWztOztyE0bZT6Ppz8shV7WXvM_bB-IZwpIlvv4IMh9VuEROwTdfvAQelgibKvbIDBmYXyl-p5dhHL_dDuonD48vynAQt48hl5nubJLaLr8BUfw_RV4M63piarzN9Ev13gXYqICScV51I2XQjyWxXod26IPspovjBoY-AmBRGus_SAc772lnL8qqy2Y_FLlf9cz7R0Uc&lib=MZssjaXV810r9hhBDG0ioSvQq_tZ4bSk_,
      timeoutMs: 20000   // batas waktu menunggu respons (milidetik)
    },

    // Daftar halaman.
    // - Tanpa "hidden": tampil di menu utama.
    // - "hidden: true": halaman yang dibuka dari alur lain (tidak ada di menu).
    //   "navParent" menentukan menu mana yang tetap ditandai aktif.
    routes: [
      { id: "dashboard",    label: "Dashboard",      icon: "dashboard" },
      { id: "mulai-audit",  label: "Mulai Audit",    icon: "audit" },
      { id: "riwayat",      label: "Riwayat Audit",  icon: "history" },

      { id: "audit-laptop", label: "Audit Laptop",   hidden: true, navParent: "mulai-audit" },
      { id: "audit-selesai", label: "Audit Selesai", hidden: true, navParent: "mulai-audit" },
      { id: "hasil-audit",   label: "Detail Hasil Audit", hidden: true, navParent: "riwayat" }
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
