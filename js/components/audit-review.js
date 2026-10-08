/* Tampilan data audit hanya-baca, dibentuk dari definisi audit (js/audit-defs/*.js).
   Dipakai oleh halaman Review (sebelum submit) dan Detail Audit (dari Riwayat).
   groupsHtml(def, data, { skipSections: ["info"] }) -> kartu per grup (Spesifikasi, Checklist, Lisensi, ...). */
(function (AA) {
  var esc = AA.utils.escapeHtml;
  var STATUS_CLASS = { "OK": "ok", "Tidak OK": "bad", "N/A": "na" };
  var NOTE_WHEN = "Tidak OK";

  function getVal(data, path) {
    var cur = data;
    var parts = path.split(".");
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return "";
      cur = cur[parts[i]];
    }
    return cur == null ? "" : cur;
  }

  function badge(status) {
    if (!STATUS_CLASS[status]) return "-";
    return '<span class="badge badge--' + STATUS_CLASS[status] + '">' + esc(status) + "</span>";
  }

  function row(label, valueHtml) {
    return '<div class="review-row"><dt>' + esc(label) + "</dt><dd>" + valueHtml + "</dd></div>";
  }

  // "always": catatan selalu ditampilkan; "onFail": hanya jika status Tidak OK
  function alwaysNote(sec) {
    return (sec.noteMode || (sec.type === "license" ? "always" : "onFail")) === "always";
  }

  function detailLine(text) {
    return '<span class="review-note">' + esc(text) + "</span>";
  }

  function rowsFor(sec, data) {
    if (sec.type === "fields") {
      return sec.fields.map(function (f) {
        var v = String(getVal(data, sec.id + "." + f.id)).trim();
        if (v && f.type === "date") v = AA.utils.formatDateID(v);
        return row(f.label, v ? esc(v) : "-");
      }).join("");
    }

    if (sec.type === "apps") {
      var apps = Array.isArray(data && data[sec.id]) ? data[sec.id] : [];
      if (apps.length === 0) return row(sec.title, "-");
      return apps.map(function (a, i) {
        var detail = "";
        if (String(a.version || "").trim()) detail += detailLine("Versi: " + String(a.version).trim());
        if (String(a.note || "").trim()) detail += detailLine("Catatan: " + String(a.note).trim());
        return row(String(a.name || "").trim() || "Aplikasi " + (i + 1), badge(a.status) + detail);
      }).join("");
    }

    // checklist & license: status + isian tambahan (jika ada) + catatan
    var always = alwaysNote(sec);
    return sec.items.map(function (item) {
      var base = sec.id + "." + item.id;
      var status = getVal(data, base + ".status");
      var extra = String(getVal(data, base + ".extra")).trim();
      var note = String(getVal(data, base + ".note")).trim();
      var detail = "";
      if (extra) detail += detailLine((item.extraLabel || "Detail") + ": " + extra);
      if (note && (always || status === NOTE_WHEN)) detail += detailLine(always ? "Catatan: " + note : note);
      return row(item.label, badge(status) + detail);
    }).join("");
  }

  // Section dengan reviewGroup yang sama digabung dalam satu kartu (mis. Identitas + Spesifikasi).
  function groupsHtml(def, data, opts) {
    var skip = (opts && opts.skipSections) || [];
    var groups = [];
    var index = {};
    def.steps.forEach(function (step) {
      step.sections.forEach(function (sec) {
        if (skip.indexOf(sec.id) >= 0) return;
        var title = sec.reviewGroup || sec.title;
        if (!(title in index)) { index[title] = groups.length; groups.push({ title: title, html: "" }); }
        groups[index[title]].html += rowsFor(sec, data);
      });
    });
    return groups.map(function (g) {
      return '<section class="card"><h2>' + esc(g.title) + '</h2><dl class="review-list">' + g.html + "</dl></section>";
    }).join("");
  }

  AA.components.auditReview = { badge: badge, row: row, groupsHtml: groupsHtml };
})(window.AssetAudit);
