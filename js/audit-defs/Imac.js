/* Definisi Audit iMac (V0.9). Versi sederhana: satu checklist 16 item.
   Memakai komponen yang sama dengan perangkat lain; penjelasan properti: lihat js/audit-defs/laptop.js.
   Kolom Spreadsheet memakai kolom yang sudah ada (macOS Version -> osVersion, Processor / Chip -> processor). */
(function (AA) {
  AA.auditDefs.imac = {
    id: "imac",
    label: "iMac",

    steps: [
      {
        id: "identitas",
        title: "Identitas",
        sections: [
          AA.auditDefs.makeInfoSection("IMAC-001"),
          {
            id: "identitas",
            title: "Identitas iMac",
            type: "fields",
            role: "specifications", reviewGroup: "Spesifikasi iMac",
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
            role: "specifications", reviewGroup: "Spesifikasi iMac",
            fields: [
              { id: "processor",    label: "Processor / Chip", sheet: "processor", placeholder: "Contoh: Apple M1" },
              { id: "ram",          label: "RAM",              sheet: "ram" },
              { id: "storage",      label: "Storage",          sheet: "storage" },
              { id: "macosVersion", label: "macOS Version",    sheet: "osVersion" },
              { id: "gpu",          label: "GPU (opsional)",   sheet: "gpu" }
            ]
          }
        ]
      },
      {
        id: "checklist",
        title: "Checklist",
        sections: [
          {
            id: "cek",
            title: "Checklist iMac",
            type: "checklist",
            role: "checklist", reviewGroup: "Checklist iMac",
            scored: true,
            hint: "Jika item tidak tersedia atau tidak relevan, pilih N/A. N/A tidak mengurangi nilai audit.",
            items: [
              { id: "body",         label: "Body" },
              { id: "display",      label: "Display / Layar" },
              { id: "keyboard",     label: "Keyboard" },
              { id: "pointer",      label: "Mouse / Trackpad" },
              { id: "usb",          label: "USB Port" },
              { id: "thunderbolt",  label: "Thunderbolt / Port lainnya" },
              { id: "wifi",         label: "Wi-Fi" },
              { id: "bluetooth",    label: "Bluetooth" },
              { id: "camera",       label: "Kamera" },
              { id: "speaker",      label: "Speaker" },
              { id: "microphone",   label: "Microphone" },
              { id: "power-cable",  label: "Power Cable" },
              { id: "power-button", label: "Tombol Power" },
              { id: "storage-check", label: "Storage" },
              { id: "ram-check",    label: "RAM" },
              { id: "macos",        label: "macOS" }
            ]
          }
        ]
      }
    ]
  };

  AA.registerDevice(AA.auditDefs.imac, "audit-imac");
})(window.AssetAudit);
