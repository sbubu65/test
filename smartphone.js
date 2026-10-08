/* Definisi Audit Smartphone (V0.7).
   Memakai komponen yang sama dengan Laptop (wizard, review, hasil, scoring, sinkronisasi, riwayat);
   yang berbeda hanya data di file ini. Penjelasan properti: lihat js/audit-defs/laptop.js.
   Semua item bersatus (OK / Tidak OK / N/A) ikut dihitung dalam Nilai Audit oleh AssetAudit.scoring. */
(function (AA) {
  var NA_HINT = "Pilih N/A jika perangkat tidak memiliki fitur ini. N/A tidak mengurangi nilai audit.";

  AA.auditDefs.smartphone = {
    id: "smartphone",
    label: "Smartphone",

    steps: [
      {
        id: "identitas",
        title: "Identitas",
        sections: [
          AA.auditDefs.makeInfoSection("HP-001"),
          {
            id: "identitas",
            title: "Identitas Smartphone",
            type: "fields",
            role: "specifications", reviewGroup: "Spesifikasi Smartphone",
            fields: [
              { id: "brand",  label: "Brand", sheet: "brand" },
              { id: "model",  label: "Model", sheet: "model" },
              { id: "serial", label: "Serial Number", sheet: "serialNumber", required: true, validate: "serial" },
              { id: "imei1",  label: "IMEI 1", sheet: "imei1", required: true, validate: "imei", inputMode: "numeric",
                placeholder: "15 digit (tekan *#06# di HP)" },
              { id: "imei2",  label: "IMEI 2", sheet: "imei2", validate: "imei2", inputMode: "numeric",
                placeholder: "Kosongkan jika single SIM" }
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
            role: "specifications", reviewGroup: "Spesifikasi Smartphone",
            fields: [
              { id: "os",              label: "Operating System",  sheet: "operatingSystem", placeholder: "Android / iOS" },
              { id: "osVersion",       label: "OS Version",        sheet: "osVersion" },
              { id: "processor",       label: "Processor",         sheet: "processor" },
              { id: "ram",             label: "RAM",               sheet: "ram" },
              { id: "storage",         label: "Storage",           sheet: "storage" },
              { id: "batteryCapacity", label: "Battery Capacity",  sheet: "batteryCapacity", placeholder: "Contoh: 5000 mAh" },
              { id: "color",           label: "Color",             sheet: "color" }
            ]
          }
        ]
      },
      {
        id: "fisik",
        title: "Physical Checklist",
        sections: [
          {
            id: "body", title: "Body", type: "checklist", scored: true,
            role: "checklist", reviewGroup: "Physical Checklist",
            items: [
              { id: "body-casing", label: "Body / Casing" },
              { id: "back-cover",  label: "Back Cover" },
              { id: "frame",       label: "Frame" }
            ]
          },
          {
            id: "display", title: "Display", type: "checklist", scored: true,
            role: "checklist", reviewGroup: "Physical Checklist",
            items: [
              { id: "layar",       label: "Layar" },
              { id: "touchscreen", label: "Touchscreen" },
              { id: "brightness",  label: "Brightness" },
              { id: "dead-pixel",  label: "Dead Pixel" }
            ]
          },
          {
            id: "camera", title: "Camera", type: "checklist", scored: true,
            role: "checklist", reviewGroup: "Physical Checklist",
            hint: NA_HINT,
            items: [
              { id: "cam-rear",  label: "Kamera Belakang" },
              { id: "cam-front", label: "Kamera Depan" },
              { id: "flash",     label: "Flash" }
            ]
          },
          {
            id: "audio", title: "Audio", type: "checklist", scored: true,
            role: "checklist", reviewGroup: "Physical Checklist",
            items: [
              { id: "speaker",    label: "Speaker" },
              { id: "microphone", label: "Microphone" },
              { id: "earpiece",   label: "Earpiece" }
            ]
          },
          {
            id: "conn", title: "Connectivity", type: "checklist", scored: true,
            role: "checklist", reviewGroup: "Physical Checklist",
            hint: "Contoh: smartphone tanpa NFC -> NFC = N/A. " + NA_HINT,
            items: [
              { id: "wifi",      label: "Wi-Fi" },
              { id: "bluetooth", label: "Bluetooth" },
              { id: "cellular",  label: "Cellular Network" },
              { id: "gps",       label: "GPS" },
              { id: "nfc",       label: "NFC" }
            ]
          },
          {
            id: "port", title: "Port & Charging", type: "checklist", scored: true,
            role: "checklist", reviewGroup: "Physical Checklist",
            hint: NA_HINT,
            items: [
              { id: "usb-port",          label: "USB Port" },
              { id: "charging",          label: "Charging" },
              { id: "wireless-charging", label: "Wireless Charging" }
            ]
          }
        ]
      },
      {
        id: "baterai-sim",
        title: "Baterai & SIM",
        sections: [
          {
            id: "battery", title: "Battery Check", type: "checklist", scored: true,
            role: "checklist", reviewGroup: "Battery Check",
            items: [
              { id: "battery-health", label: "Battery Health", key: "Battery Health",
                extraLabel: "Battery Health (persen atau teks)", extraPlaceholder: "Contoh: 87% atau Baik", extraSheet: "batteryHealth" },
              { id: "battery-charging",  label: "Charging",          key: "Battery Charging" },
              { id: "battery-condition", label: "Battery Condition" }
            ]
          },
          {
            id: "sim", title: "SIM Check", type: "checklist", scored: true,
            role: "checklist", reviewGroup: "SIM Check",
            hint: "Contoh: HP single SIM -> SIM Slot 2 = N/A. " + NA_HINT,
            items: [
              { id: "sim-1",         label: "SIM Slot 1" },
              { id: "sim-2",         label: "SIM Slot 2" },
              { id: "sim-detection", label: "SIM Detection" },
              { id: "mobile-data",   label: "Mobile Data" }
            ]
          }
        ]
      },
      {
        id: "software",
        title: "Biometrik & Software",
        sections: [
          {
            id: "bio", title: "Biometric", type: "checklist", scored: true,
            role: "checklist", reviewGroup: "Biometric",
            hint: "Contoh: tanpa sensor sidik jari -> Fingerprint = N/A. " + NA_HINT,
            items: [
              { id: "fingerprint", label: "Fingerprint" },
              { id: "face-unlock", label: "Face Unlock" }
            ]
          },
          {
            id: "sw", title: "Software Check", type: "checklist", scored: true,
            role: "checklist", reviewGroup: "Software Check",
            hint: "Jangan memasukkan password, PIN, atau kode verifikasi akun.",
            items: [
              { id: "os-status",       label: "Operating System" },
              { id: "os-version",      label: "OS Version" },
              { id: "security-update", label: "Security Update", extraLabel: "Security patch level", extraPlaceholder: "Contoh: 1 September 2026" },
              { id: "device-security", label: "Device Security" },
              { id: "account-status",  label: "Google / Apple Account" }
            ]
          },
          {
            id: "apps", title: "Required Application", type: "apps", scored: true, max: 10,
            role: "apps", reviewGroup: "Software Check",
            hint: "Daftarkan aplikasi wajib (mis. MDM, email kantor). Boleh dikosongkan jika tidak ada."
          }
        ]
      }
    ]
  };

  AA.registerDevice(AA.auditDefs.smartphone, "audit-smartphone");
})(window.AssetAudit);
