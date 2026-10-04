/* Komunikasi dengan Google Apps Script (Web App). Hanya modul ini yang tahu cara memanggil API.
   URL dibaca dari AssetAudit.config.api.API_URL (js/config.js).

   Catatan teknis: body dikirim sebagai "text/plain" (isinya tetap JSON). Ini disengaja: Apps Script
   Web App tidak menjawab preflight CORS, sedangkan request text/plain tidak memerlukan preflight. */
(function (AA) {
  var MSG_FAIL = "Gagal menyimpan ke Spreadsheet. Data audit tetap tersimpan di perangkat ini.";
  var MSG_NOT_CONFIGURED = "Koneksi ke Spreadsheet belum diatur. Data audit tetap tersimpan di perangkat ini.";

  // Kolom lisensi di Spreadsheet <- field di form (id item lisensi: windows | office | antivirus)
  var LICENSE_COLUMNS = {
    windows:   { status: "windowsStatus",   extra: "windowsVersion", note: "windowsNote" },
    office:    { status: "officeStatus",    extra: "officeVersion",  note: "officeNote" },
    antivirus: { status: "antivirusStatus", extra: "antivirusName",  note: "antivirusNote" }
  };

  function cfg() { return AA.config.api || {}; }

  function isConfigured() {
    var url = cfg().API_URL;
    return typeof url === "string" && /^https?:\/\//.test(url) && url.indexOf("PASTE_") === -1;
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  /* auditId unik, mis. AUD-20261001-K3F9ZQ. Bagian acak 6 karakter agar dua perangkat
     tidak mungkin menghasilkan id yang sama. */
  function newAuditId(date) {
    var d = date || new Date();
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    var bytes = new Uint8Array(6);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    var rand = "";
    for (var j = 0; j < bytes.length; j++) rand += chars.charAt(bytes[j] % chars.length);
    return "AUD-" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + rand;
  }

  /* Ubah record tersimpan menjadi data kiriman (nama field = nama kolom Spreadsheet).
     Nilai/kondisi sengaja TIDAK dikirim: Apps Script menghitungnya sendiri dari checklist. */
  function buildPayload(rec) {
    var def = AA.auditDefs[rec.deviceType];
    var data = rec.data || {};
    var b = AA.storage.basics(rec);
    var spec = {};
    [data.laptop, data.spec].forEach(function (part) { for (var k in (part || {})) spec[k] = part[k]; });

    var payload = {
      auditId: rec.auditId,
      assetId: b.assetId,
      deviceType: rec.deviceLabel,
      auditor: b.auditor,
      auditDate: b.tanggal,
      brand: spec.brand || "",
      model: spec.model || "",
      serialNumber: spec.serial || "",
      processor: spec.processor || "",
      ram: spec.ram || "",
      storage: spec.storage || "",
      operatingSystem: spec.os || "",
      gpu: spec.gpu || "",
      createdAt: b.createdAt
    };

    var checklistResult = {};
    (def ? def.steps : []).forEach(function (step) {
      step.sections.forEach(function (sec) {
        (sec.items || []).forEach(function (item) {
          var entry = data[sec.id] && data[sec.id][item.id];
          if (sec.role === "checklist") checklistResult[item.label] = entry && entry.status || "";
          if (sec.role === "license" && LICENSE_COLUMNS[item.id]) {
            var cols = LICENSE_COLUMNS[item.id];
            payload[cols.status] = entry && entry.status || "";
            payload[cols.extra] = entry && entry.extra || "";
            payload[cols.note] = entry && entry.note || "";
          }
        });
      });
    });
    payload.checklistResult = checklistResult;
    return payload;
  }

  function failure(reason, detail) {
    var e = new Error(detail);
    e.reason = reason;
    return e;
  }

  /* Kirim satu audit. Selalu resolve dengan { ok, duplicate, reason, message } — tidak pernah reject.
     message untuk pengguna sengaja sederhana; detail teknis hanya di console. */
  function send(rec) {
    if (!isConfigured()) {
      console.warn("[AssetAudit] API_URL belum diisi. Edit js/config.js (api.API_URL).");
      return Promise.resolve({ ok: false, reason: "not-configured", message: MSG_NOT_CONFIGURED });
    }

    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, cfg().timeoutMs || 20000) : null;

    return fetch(cfg().API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(buildPayload(rec)),
      redirect: "follow",
      signal: controller ? controller.signal : undefined
    })
      .then(function (resp) {
        return resp.text().then(function (text) { return { resp: resp, text: text }; });
      })
      .then(function (r) {
        if (!r.resp.ok) throw failure("http", "HTTP " + r.resp.status);
        var json;
        try { json = JSON.parse(r.text); }
        catch (e) { throw failure("bad-response", "Respons bukan JSON: " + String(r.text).slice(0, 120)); }
        if (!json || json.success !== true) throw failure("server", (json && json.message) || "success bukan true");
        return { ok: true, duplicate: !!json.duplicate, message: json.message || "" };
      })
      .catch(function (err) {
        var reason = err.reason || (err.name === "AbortError" ? "timeout" : "network");
        console.error("[AssetAudit] Sinkronisasi gagal (" + reason + "):", err.message || err);
        return { ok: false, reason: reason, message: MSG_FAIL };
      })
      .then(function (result) {
        if (timer) clearTimeout(timer);
        return result;
      });
  }

  AA.api = {
    messages: { fail: MSG_FAIL, notConfigured: MSG_NOT_CONFIGURED },
    isConfigured: isConfigured,
    newAuditId: newAuditId,
    buildPayload: buildPayload,
    send: send
  };
})(window.AssetAudit);
