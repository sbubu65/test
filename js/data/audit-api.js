/* Komunikasi dengan Google Apps Script (Web App). Hanya modul ini yang tahu cara memanggil API.
   URL dibaca dari AssetAudit.config.api.API_URL (js/config.js).

   POST  -> simpan audit               (send)
   GET   -> ?action=list               (fetchList)   daftar audit
         -> ?action=get&auditId=...    (fetchById)   satu audit

   Catatan teknis: body POST dikirim sebagai "text/plain" (isinya tetap JSON). Ini disengaja: Apps Script
   Web App tidak menjawab preflight CORS, sedangkan request text/plain dan GET biasa tidak memerlukannya. */
(function (AA) {
  var MSG_FAIL = "Gagal menyimpan ke Spreadsheet. Data audit tetap tersimpan di perangkat ini.";
  var MSG_NOT_CONFIGURED = "Koneksi ke Spreadsheet belum diatur. Data audit tetap tersimpan di perangkat ini.";
  var MSG_LIST_FAIL = "Gagal mengambil data terbaru. Menampilkan data lokal.";
  var MSG_LIST_NOT_CONFIGURED = "Koneksi ke Spreadsheet belum diatur. Menampilkan data lokal.";

  // Kolom lisensi di Spreadsheet <- field di form (id item lisensi: windows | office | antivirus)
  var LICENSE_COLUMNS = {
    windows:   { status: "windowsStatus",   extra: "windowsVersion", note: "windowsNote" },
    office:    { status: "officeStatus",    extra: "officeVersion",  note: "officeNote" },
    antivirus: { status: "antivirusStatus", extra: "antivirusName",  note: "antivirusNote" }
  };

  // Kolom spesifikasi di Spreadsheet -> [id section, id field] di definisi audit laptop
  var SPEC_COLUMNS = {
    brand:           ["laptop", "brand"],
    model:           ["laptop", "model"],
    serialNumber:    ["laptop", "serial"],
    processor:       ["spec", "processor"],
    ram:             ["spec", "ram"],
    storage:         ["spec", "storage"],
    operatingSystem: ["spec", "os"],
    gpu:             ["spec", "gpu"]
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

  /* Kebalikan buildPayload: satu baris Spreadsheet (hasil ?action=list/get) -> record seperti yang
     disimpan lokal, supaya halaman Hasil/Detail Audit bisa memakainya tanpa perubahan.
     Data dari Spreadsheet diperlakukan tidak tepercaya: semua nilai dijadikan teks/angka dulu.
     Catatan checklist (kolom tidak ada di Spreadsheet) tidak tersedia untuk audit dari Spreadsheet. */
  function str(v) { return v === null || v === undefined ? "" : String(v); }
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }

  function rowToRecord(row) {
    var label = str(row.deviceType);
    var typeCfg = AA.config.deviceTypes.filter(function (d) { return d.label === label; })[0];
    var typeId = typeCfg ? typeCfg.id : label.toLowerCase();
    var def = AA.auditDefs[typeId];

    var data = { info: { assetId: str(row.assetId), auditor: str(row.auditor), tanggal: str(row.auditDate) } };
    Object.keys(SPEC_COLUMNS).forEach(function (col) {
      var target = SPEC_COLUMNS[col];
      if (!data[target[0]]) data[target[0]] = {};
      data[target[0]][target[1]] = str(row[col]);
    });

    var checklist = row.checklistResult && typeof row.checklistResult === "object" ? row.checklistResult : {};
    (def ? def.steps : []).forEach(function (step) {
      step.sections.forEach(function (sec) {
        if (sec.role === "checklist") {
          data[sec.id] = {};
          sec.items.forEach(function (item) { data[sec.id][item.id] = { status: str(checklist[item.label]), note: "" }; });
        }
        if (sec.role === "license") {
          data[sec.id] = {};
          sec.items.forEach(function (item) {
            var cols = LICENSE_COLUMNS[item.id];
            if (cols) data[sec.id][item.id] = { status: str(row[cols.status]), extra: str(row[cols.extra]), note: str(row[cols.note]) };
          });
        }
      });
    });

    return {
      id: str(row.auditId),
      auditId: str(row.auditId),
      deviceType: typeId,
      deviceLabel: label,
      status: str(row.status) || "Selesai",
      createdAt: str(row.createdAt),
      scoring: { ok: num(row.okCount), notOk: num(row.notOkCount), na: num(row.naCount), total: num(row.totalItems), counted: num(row.itemsCounted) },
      syncStatus: "synced",   // ada di Spreadsheet = sudah tersinkron
      source: "remote",
      data: data
    };
  }

  /* ---------- HTTP ---------- */

  function failure(reason, detail) {
    var e = new Error(detail);
    e.reason = reason;
    return e;
  }

  function classify(err) {
    return err.reason || (err.name === "AbortError" ? "timeout" : "network");
  }

  function withQuery(params) {
    var base = cfg().API_URL;
    var query = Object.keys(params).map(function (k) {
      return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
    }).join("&");
    return base + (base.indexOf("?") >= 0 ? "&" : "?") + query;
  }

  /* Satu permintaan ke Apps Script. Resolve dengan JSON (success === true), atau reject dengan error
     ber-"reason": http | bad-response | server | timeout | network. */
  function request(url, init) {
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, cfg().timeoutMs || 20000) : null;
    init = init || {};
    init.redirect = "follow";
    if (controller) init.signal = controller.signal;

    return fetch(url, init)
      .then(function (resp) {
        return resp.text().then(function (text) { return { resp: resp, text: text }; });
      })
      .then(function (r) {
        if (!r.resp.ok) throw failure("http", "HTTP " + r.resp.status);
        var json;
        try { json = JSON.parse(r.text); }
        catch (e) { throw failure("bad-response", "Respons bukan JSON: " + String(r.text).slice(0, 120)); }
        if (!json || json.success !== true) throw failure("server", (json && json.message) || "success bukan true");
        return json;
      })
      .then(function (json) { if (timer) clearTimeout(timer); return json; },
            function (err) { if (timer) clearTimeout(timer); throw err; });
  }

  /* Kirim satu audit. Selalu resolve dengan { ok, duplicate, reason, message } — tidak pernah reject.
     message untuk pengguna sengaja sederhana; detail teknis hanya di console. */
  function send(rec) {
    if (!isConfigured()) {
      console.warn("[AssetAudit] API_URL belum diisi. Edit js/config.js (api.API_URL).");
      return Promise.resolve({ ok: false, reason: "not-configured", message: MSG_NOT_CONFIGURED });
    }
    var body;
    try { body = JSON.stringify(buildPayload(rec)); }
    catch (e) {
      console.error("[AssetAudit] Gagal menyiapkan data audit:", e);
      return Promise.resolve({ ok: false, reason: "payload", message: MSG_FAIL });
    }

    return request(cfg().API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: body })
      .then(function (json) { return { ok: true, duplicate: !!json.duplicate, message: json.message || "" }; })
      .catch(function (err) {
        var reason = classify(err);
        console.error("[AssetAudit] Sinkronisasi gagal (" + reason + "):", err.message || err);
        return { ok: false, reason: reason, message: MSG_FAIL };
      });
  }

  /* Ambil daftar audit dari Spreadsheet. Resolve { ok, rows } atau { ok:false, reason, message }. */
  function fetchList() {
    if (!isConfigured()) return Promise.resolve({ ok: false, reason: "not-configured", message: MSG_LIST_NOT_CONFIGURED });
    return request(withQuery({ action: "list" }), { method: "GET" })
      .then(function (json) {
        if (!Array.isArray(json.data)) throw failure("bad-response", "data bukan array");
        return { ok: true, rows: json.data };
      })
      .catch(function (err) {
        var reason = classify(err);
        console.error("[AssetAudit] Gagal mengambil daftar audit (" + reason + "):", err.message || err);
        return { ok: false, reason: reason, message: MSG_LIST_FAIL };
      });
  }

  /* Ambil satu audit berdasarkan auditId. Resolve { ok:true, row } (row = null jika tidak ada) atau { ok:false }. */
  function fetchById(auditId) {
    if (!isConfigured()) return Promise.resolve({ ok: false, reason: "not-configured", message: MSG_LIST_NOT_CONFIGURED });
    return request(withQuery({ action: "get", auditId: auditId }), { method: "GET" })
      .then(function (json) { return { ok: true, row: json.data && typeof json.data === "object" ? json.data : null }; })
      .catch(function (err) {
        if (err.reason === "server" && /tidak ditemukan/i.test(err.message)) return { ok: true, row: null };
        var reason = classify(err);
        console.error("[AssetAudit] Gagal mengambil detail audit (" + reason + "):", err.message || err);
        return { ok: false, reason: reason, message: MSG_LIST_FAIL };
      });
  }

  AA.api = {
    messages: { fail: MSG_FAIL, notConfigured: MSG_NOT_CONFIGURED, listFail: MSG_LIST_FAIL, listNotConfigured: MSG_LIST_NOT_CONFIGURED },
    isConfigured: isConfigured,
    newAuditId: newAuditId,
    buildPayload: buildPayload,
    rowToRecord: rowToRecord,
    send: send,
    fetchList: fetchList,
    fetchById: fetchById
  };
})(window.AssetAudit);
