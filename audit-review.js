/* Tampilan data audit hanya-baca, dibentuk dari definisi audit (js/audit-defs/*.js).
   Dipakai oleh halaman Review (sebelum submit) dan Detail Hasil Audit (dari Riwayat).
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

  function rowsFor(sec, data) {
    if (sec.type === "fields") {
      return sec.fields.map(function (f) {
        var v = String(getVal(data, sec.id + "." + f.id)).trim();
        if (v && f.type === "date") v = AA.utils.formatDateID(v);
        return row(f.label, v ? esc(v) : "-");
      }).join("");
    }

    if (sec.type === "checklist") {
      return sec.items.map(function (item) {
        var base = sec.id + "." + item.id;
        var status = getVal(data, base + ".status");
        var note = String(getVal(data, base + ".note")).trim();
        var noteHtml = status === NOTE_WHEN && note ? '<span class="review-note">' + esc(note) + "</span>" : "";
        return row(item.label, badge(status) + noteHtml);
      }).join("");
    }

    // license
    return sec.items.map(function (item) {
      var base = sec.id + "." + item.id;
      var extra = String(getVal(data, base + ".extra")).trim();
      var note = String(getVal(data, base + ".note")).trim();
      var detail = "";
      if (extra) detail += '<span class="review-note">' + esc(item.extraLabel) + ": " + esc(extra) + "</span>";
      if (note) detail += '<span class="review-note">Catatan: ' + esc(note) + "</span>";
      return row(item.label, badge(getVal(data, base + ".status")) + detail);
    }).join("");
  }

  // Section dengan reviewGroup yang sama digabung dalam satu kartu (mis. Identitas + Spesifikasi laptop).
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
