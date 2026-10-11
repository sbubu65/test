/* Definisi Audit Tablet (V0.8). Versi sederhana: satu checklist 16 item.
   Memakai komponen yang sama dengan perangkat lain; penjelasan properti: lihat js/audit-defs/laptop.js.
   Kolom Spreadsheet memakai kolom yang sudah ada (IMEI -> imei1, OS Version -> osVersion). */
(function (AA) {
  AA.auditDefs.tablet = {
    id: "tablet",
    label: "Tablet",

    steps: [
      {
        id: "identitas",
        title: "Identitas",
        sections: [
          AA.auditDefs.makeInfoSection("TAB-001"),
          {
            id: "identitas",
            title: "Identitas Tablet",
            type: "fields",
            role: "specifications", reviewGroup: "Spesifikasi Tablet",
            fields: [
              { id: "brand",  label: "Brand",         sheet: "brand" },
              { id: "model",  label: "Model",         sheet: "model" },
              { id: "serial", label: "Serial Number", sheet: "serialNumber" },
              { id: "imei",   label: "IMEI (opsional)", sheet: "imei1", validate: "imei", inputMode: "numeric",
                placeholder: "15 digit, untuk tablet yang memakai SIM" }
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
            role: "specifications", reviewGroup: "Spesifikasi Tablet",
            fields: [
              { id: "os",        label: "Operating System", sheet: "operatingSystem", placeholder: "Android / iPadOS" },
              { id: "osVersion", label: "OS Version",       sheet: "osVersion" },
              { id: "ram",       label: "RAM",              sheet: "ram" },
              { id: "storage",   label: "Storage",          sheet: "storage" }
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
            title: "Checklist Tablet",
            type: "checklist",
            role: "checklist", reviewGroup: "Checklist Tablet",
            scored: true,
            hint: "Jika fitur tidak tersedia, pilih N/A. N/A tidak mengurangi nilai audit.",
            items: [
              { id: "body",         label: "Body / Casing" },
              { id: "layar",        label: "Layar" },
              { id: "touchscreen",  label: "Touchscreen" },
              { id: "cam-front",    label: "Kamera Depan" },
              { id: "cam-rear",     label: "Kamera Belakang" },
              { id: "speaker",      label: "Speaker" },
              { id: "microphone",   label: "Microphone" },
              { id: "wifi",         label: "Wi-Fi" },
              { id: "bluetooth",    label: "Bluetooth" },
              { id: "cellular",     label: "Cellular / SIM" },
              { id: "port",         label: "USB / Charging Port" },
              { id: "battery",      label: "Battery" },
              { id: "power-button", label: "Tombol Power" },
              { id: "volume-button", label: "Tombol Volume" },
              { id: "biometric",    label: "Fingerprint / Face Unlock" },
              { id: "charger",      label: "Charger / Accessories" }
            ]
          }
        ]
      }
    ]
  };

  AA.registerDevice(AA.auditDefs.tablet, "audit-tablet");
})(window.AssetAudit);
