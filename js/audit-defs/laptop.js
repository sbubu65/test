/* Definisi Audit Laptop.
   Form, Review, Hasil, pengiriman ke Spreadsheet, dan Riwayat dibuat otomatis dari data ini.

   Tipe section:
     "fields"    -> kolom isian teks. field: { id, label, type?, placeholder?, required?, inputMode?, validate?, sheet? }
     "checklist" -> OK / Tidak OK / N/A. item: { id, label, key?, extraLabel?, extraSheet?, sheet? }
                    catatan muncul jika Tidak OK (noteMode "onFail"); "always" = catatan selalu tampil
     "license"   -> seperti checklist tetapi catatan selalu tampil (noteMode "always")
     "apps"      -> daftar baris aplikasi yang bisa ditambah/dihapus (nama, status, versi, catatan)
   Properti section lain:
     scored: true      -> ikut dihitung dalam Nilai Audit
     role              -> pengelompokan di record: "specifications" | "checklist" | "license" | "apps"
     reviewGroup       -> judul kartu di Review/Detail (section dengan judul sama digabung)
     hint              -> teks bantuan di bawah judul section
   Pemetaan ke Spreadsheet:
     field.sheet       -> nama kolom Spreadsheet untuk isian itu
     item.sheet        -> { status, extra, note }: kolom khusus per item (dipakai lisensi laptop)
     item.key          -> kunci di checklistResult (JSON); default = label. Harus unik dalam satu perangkat.
     item.extraSheet   -> kolom khusus untuk isian tambahan item (mis. batteryHealth); default masuk checklistValues
   Id item harus unik di seluruh definisi satu perangkat (dicek oleh tests/defs.test.js). */
(function (AA) {
  AA.auditDefs.laptop = {
    id: "laptop",
    label: "Laptop",

    steps: [
      {
        id: "identitas",
        title: "Identitas",
        sections: [
          AA.auditDefs.makeInfoSection("LAP-001"),
          {
            id: "laptop",
            title: "Identitas Laptop",
            type: "fields",
            role: "specifications", reviewGroup: "Spesifikasi",
            fields: [
              { id: "brand",  label: "Brand",         sheet: "brand" },
              { id: "model",  label: "Model",         sheet: "model" },
              { id: "serial", label: "Serial Number", sheet: "serialNumber" }
            ]
          }
        ]
      },
      {
        id: "spesifikasi",
        title: "Spesifikasi",
        sections: [
          {
            id: "spec",
            title: "Spesifikasi",
            type: "fields",
            role: "specifications", reviewGroup: "Spesifikasi",
            fields: [
              { id: "processor", label: "Processor",        sheet: "processor" },
              { id: "ram",       label: "RAM",              sheet: "ram" },
              { id: "storage",   label: "Storage",          sheet: "storage" },
              { id: "os",        label: "Operating System", sheet: "operatingSystem" },
              { id: "gpu",       label: "GPU",              sheet: "gpu" }
            ]
          }
        ]
      },
      {
        id: "fisik",
        title: "Cek Fisik",
        sections: [
          {
            id: "fisik",
            title: "Cek Fisik",
            type: "checklist",
            role: "checklist", reviewGroup: "Checklist",
            scored: true, // ikut dihitung dalam Nilai Audit
            items: [
              { id: "body",       label: "Body" },
              { id: "layar",      label: "Layar" },
              { id: "keyboard",   label: "Keyboard" },
              { id: "touchpad",   label: "Touchpad" },
              { id: "port-usb",   label: "Port USB" },
              { id: "port-lan",   label: "Port LAN" },
              { id: "wifi",       label: "Wi-Fi" },
              { id: "bluetooth",  label: "Bluetooth" },
              { id: "kamera",     label: "Kamera" },
              { id: "speaker",    label: "Speaker" },
              { id: "microphone", label: "Microphone" },
              { id: "charger",    label: "Charger" },
              { id: "battery",    label: "Battery" }
            ]
          }
        ]
      },
      {
        id: "lisensi",
        title: "Lisensi",
        sections: [
          {
            id: "lisensi",
            title: "Pemeriksaan Lisensi",
            type: "license",
            role: "license", reviewGroup: "Lisensi",
            scored: true,
            items: [
              { id: "windows",   label: "Windows",          extraLabel: "Versi Windows",  sheet: { status: "windowsStatus",   extra: "windowsVersion", note: "windowsNote" } },
              { id: "office",    label: "Microsoft Office", extraLabel: "Versi",          sheet: { status: "officeStatus",    extra: "officeVersion",  note: "officeNote" } },
              { id: "antivirus", label: "Antivirus",        extraLabel: "Nama Antivirus", sheet: { status: "antivirusStatus", extra: "antivirusName",  note: "antivirusNote" } }
            ]
          }
        ]
      }
    ]
  };
})(window.AssetAudit);
