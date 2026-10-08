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

  function str(v) { return v === null || v === undefined ? "" : String(v); }
  function trim(v) { return str(v).trim(); }
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }

  // Kunci item di checklistResult (JSON). Default = label; item.key dipakai jika label ganda dalam satu perangkat.
  function sheetKey(item) { return item.key || item.label; }

  function alwaysNote(sec) {
    return (sec.noteMode || (sec.type === "license" ? "always" : "onFail")) === "always";
  }

  /* Ubah record tersimpan menjadi data kiriman (nama field = nama kolom Spreadsheet).
     Dibentuk dari definisi audit perangkat itu, jadi Laptop dan Smartphone memakai kode yang sama:
       field.sheet                  -> kolom khusus (brand, serialNumber, imei1, ...)
       item.sheet                   -> kolom status/versi/catatan khusus (lisensi laptop)
       item lain                    -> checklistResult[kunci] = status
       catatan item                 -> checklistNotes[kunci]   (Tidak OK, atau selalu untuk section noteMode "always")
       isian tambahan item          -> kolom item.extraSheet, atau checklistValues[kunci]
       section "apps"               -> requiredApps [ { name, status, version, note } ]
     Nilai/kondisi sengaja TIDAK dikirim: Apps Script menghitungnya sendiri dari status. */
  function buildPayload(rec) {
    var def = AA.auditDefs[rec.deviceType];
    var data = rec.data || {};
    var b = AA.storage.basics(rec);

    var payload = {
      auditId: rec.auditId,
      assetId: b.assetId,
      deviceType: rec.deviceLabel,
      auditor: b.auditor,
      auditDate: b.tanggal,
      createdAt: b.createdAt
    };
    var results = {}, notes = {}, values = {}, apps = [];

    (def ? def.steps : []).forEach(function (step) {
      step.sections.forEach(function (sec) {
        var secData = data[sec.id];

        if (sec.type === "fields") {
          sec.fields.forEach(function (f) {
            if (f.sheet) payload[f.sheet] = trim(secData && secData[f.id]);
          });
        } else if (sec.type === "apps") {
          (Array.isArray(secData) ? secData : []).forEach(function (row) {
            apps.push({ name: trim(row.name), status: str(row.status), version: trim(row.version), note: trim(row.note) });
          });
        } else if (sec.items) {
          var always = alwaysNote(sec);
          sec.items.forEach(function (item) {
            var entry = (secData && secData[item.id]) || {};
            var status = str(entry.status);
            var extra = trim(entry.extra);
            var note = trim(entry.note);

            if (item.sheet) { // kolom khusus (lisensi laptop)
              payload[item.sheet.status] = status;
              payload[item.sheet.extra] = extra;
              payload[item.sheet.note] = note;
              return;
            }
            var key = sheetKey(item);
            results[key] = status;
            if (note && (always || status === "Tidak OK")) notes[key] = note;
            if (extra) {
              if (item.extraSheet) payload[item.extraSheet] = extra;
              else values[key] = extra;
            }
          });
        }
      });
    });

    payload.checklistResult = results;
    payload.checklistNotes = notes;
    payload.checklistValues = values;
    payload.requiredApps = apps;
    return payload;
  }

  // Kolom JSON dari Spreadsheet bisa berupa objek/array (dari ?action=list) atau teks JSON
  function asObject(v) {
    if (typeof v === "string") { try { v = JSON.parse(v); } catch (e) { return {}; } }
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  }
  function asArray(v) {
    if (typeof v === "string") { try { v = JSON.parse(v); } catch (e) { return []; } }
    return Array.isArray(v) ? v : [];
  }

  /* Kebalikan buildPayload: satu baris Spreadsheet (hasil ?action=list/get) -> record seperti yang
     disimpan lokal, supaya halaman Hasil/Detail Audit bisa memakainya tanpa perubahan.
     Data dari Spreadsheet diperlakukan tidak tepercaya: semua nilai dijadikan teks/angka dulu.
     Baris lama (V0.5/V0.6) tanpa kolom catatan tetap terbaca; catatannya kosong. */
  function rowToRecord(row) {
    var label = str(row.deviceType);
    var typeCfg = AA.config.deviceTypes.filter(function (d) { return d.label === label; })[0];
    var typeId = typeCfg ? typeCfg.id : label.toLowerCase();
    var def = AA.auditDefs[typeId];

    var data = { info: { assetId: str(row.assetId), auditor: str(row.auditor), tanggal: str(row.auditDate) } };
    var results = asObject(row.checklistResult), notes = asObject(row.checklistNotes), values = asObject(row.checklistValues);
    var apps = asArray(row.requiredApps);

    (def ? def.steps : []).forEach(function (step) {
      step.sections.forEach(function (sec) {
        if (sec.id === "info") return;

        if (sec.type === "fields") {
          data[sec.id] = {};
          sec.fields.forEach(function (f) { data[sec.id][f.id] = f.sheet ? str(row[f.sheet]) : ""; });
        } else if (sec.type === "apps") {
          data[sec.id] = apps.map(function (a) {
            a = a || {};
            return { name: str(a.name), status: str(a.status), version: str(a.version), note: str(a.note) };
          });
        } else if (sec.items) {
          data[sec.id] = {};
          sec.items.forEach(function (item) {
            if (item.sheet) {
              data[sec.id][item.id] = { status: str(row[item.sheet.status]), extra: str(row[item.sheet.extra]), note: str(row[item.sheet.note]) };
            } else {
              var key = sheetKey(item);
              data[sec.id][item.id] = {
                status: str(results[key]),
                extra: item.extraSheet ? str(row[item.extraSheet]) : str(values[key]),
                note: str(notes[key])
              };
            }
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
