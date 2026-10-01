/* Definisi Audit Laptop.
   Form dibuat otomatis dari data ini oleh components/audit-wizard.js.
   Tipe section:
     "fields"    -> kolom isian teks            (fields: [{ id, label, type?, placeholder?, required? }])
     "checklist" -> OK / Tidak OK / N/A, catatan muncul jika Tidak OK   (items: [{ id, label }])
     "license"   -> status + satu isian tambahan + catatan              (items: [{ id, label, extraLabel }])
   Untuk perangkat lain (V0.x berikutnya): salin file ini dan ubah isinya. */
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
            fields: [
              { id: "brand",  label: "Brand" },
              { id: "model",  label: "Model" },
              { id: "serial", label: "Serial Number" }
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
            fields: [
              { id: "processor", label: "Processor" },
              { id: "ram",       label: "RAM" },
              { id: "storage",   label: "Storage" },
              { id: "os",        label: "Operating System" },
              { id: "gpu",       label: "GPU" }
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
            items: [
              { id: "windows",   label: "Windows",          extraLabel: "Versi Windows" },
              { id: "office",    label: "Microsoft Office", extraLabel: "Versi" },
              { id: "antivirus", label: "Antivirus",        extraLabel: "Nama Antivirus" }
            ]
          }
        ]
      }
    ]
  };
})(window.AssetAudit);
