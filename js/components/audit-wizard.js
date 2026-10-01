/* Wizard audit yang bisa dipakai semua jenis perangkat.
   Pemakaian: AssetAudit.components.auditWizard(container, AssetAudit.auditDefs.laptop)

   Alur: tiap "step" di definisi -> satu layar isian, lalu satu layar Review -> Simpan.
   Data draft disimpan di AA.draft dengan bentuk:
     fields    -> data[section.id][field.id] = "teks"
     checklist -> data[section.id][item.id] = { status, note }
     license   -> data[section.id][item.id] = { status, extra, note } */
(function (AA) {
  var esc = AA.utils.escapeHtml;
  var STATUS_CLASS = { "OK": "ok", "Tidak OK": "bad", "N/A": "na" };
  var NOTE_WHEN = "Tidak OK";

  /* ---------- akses data bertingkat: "fisik.body.status" ---------- */
  function getVal(data, path) {
    var cur = data;
    var parts = path.split(".");
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return "";
      cur = cur[parts[i]];
    }
    return cur == null ? "" : cur;
  }

  function setVal(data, path, value) {
    var parts = path.split(".");
    var cur = data;
    for (var i = 0; i < parts.length - 1; i++) {
      if (typeof cur[parts[i]] !== "object" || cur[parts[i]] === null) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }

  /* ---------- potongan HTML form ---------- */
  function inputHtml(path, label, opts) {
    opts = opts || {};
    var id = "f-" + path.replace(/\./g, "-");
    var value = opts.value;
    var control = opts.multiline
      ? '<textarea class="field__input" id="' + id + '" rows="2" data-path="' + path + '">' + esc(value) + "</textarea>"
      : '<input class="field__input" id="' + id + '" type="' + (opts.type || "text") + '" data-path="' + path + '"' +
        ' value="' + esc(value) + '" placeholder="' + esc(opts.placeholder || "") + '" autocomplete="off"' +
        (opts.required ? ' aria-required="true"' : "") + ">";
    return (
      '<div class="field" data-field-path="' + path + '">' +
        '<label class="field__label" for="' + id + '">' + esc(label) +
          (opts.required ? ' <span class="field__req" aria-hidden="true">*</span>' : "") + "</label>" +
        control +
      "</div>"
    );
  }

  function statusHtml(path, value, label) {
    var options = AA.auditDefs.statuses.map(function (s) {
      return (
        '<label class="segmented__opt segmented__opt--' + STATUS_CLASS[s] + '">' +
          '<input type="radio" name="' + path + '" value="' + esc(s) + '" data-path="' + path + '"' +
          (value === s ? " checked" : "") + ">" +
          "<span>" + esc(s) + "</span>" +
        "</label>"
      );
    }).join("");
    return '<div class="segmented" role="radiogroup" aria-label="Status ' + esc(label) + '">' + options + "</div>";
  }

  function fieldsSection(sec, data) {
    return '<div class="fields">' + sec.fields.map(function (f) {
      var path = sec.id + "." + f.id;
      return inputHtml(path, f.label, {
        value: getVal(data, path), type: f.type, placeholder: f.placeholder, required: f.required
      });
    }).join("") + "</div>";
  }

  function checklistSection(sec, data) {
    return '<div class="audit-list">' + sec.items.map(function (item) {
      var base = sec.id + "." + item.id;
      var status = getVal(data, base + ".status");
      return (
        '<div class="audit-item" data-item-path="' + base + '">' +
          '<p class="audit-item__label">' + esc(item.label) + "</p>" +
          statusHtml(base + ".status", status, item.label) +
          '<div class="audit-item__extra" data-note-when="' + NOTE_WHEN + '"' + (status === NOTE_WHEN ? "" : " hidden") + ">" +
            inputHtml(base + ".note", "Catatan", { value: getVal(data, base + ".note"), multiline: true }) +
          "</div>" +
        "</div>"
      );
    }).join("") + "</div>";
  }

  function licenseSection(sec, data) {
    return '<div class="audit-list">' + sec.items.map(function (item) {
      var base = sec.id + "." + item.id;
      return (
        '<div class="audit-item" data-item-path="' + base + '">' +
          '<p class="audit-item__label">' + esc(item.label) + "</p>" +
          statusHtml(base + ".status", getVal(data, base + ".status"), item.label) +
          '<div class="audit-item__extra">' +
            inputHtml(base + ".extra", item.extraLabel, { value: getVal(data, base + ".extra") }) +
            inputHtml(base + ".note", "Catatan", { value: getVal(data, base + ".note"), multiline: true }) +
          "</div>" +
        "</div>"
      );
    }).join("") + "</div>";
  }

  var sectionRenderers = { fields: fieldsSection, checklist: checklistSection, license: licenseSection };

  function formSectionHtml(sec, data) {
    return '<section class="card"><h2>' + esc(sec.title) + "</h2>" + sectionRenderers[sec.type](sec, data) + "</section>";
  }

  /* ---------- tampilan Review (hanya baca) ---------- */
  function badge(status) {
    if (!status) return "-";
    return '<span class="badge badge--' + STATUS_CLASS[status] + '">' + esc(status) + "</span>";
  }

  function reviewRow(label, valueHtml) {
    return '<div class="review-row"><dt>' + esc(label) + "</dt><dd>" + valueHtml + "</dd></div>";
  }

  function review(sec, data) {
    var rows = "";
    if (sec.type === "fields") {
      rows = sec.fields.map(function (f) {
        var v = String(getVal(data, sec.id + "." + f.id)).trim();
        if (v && f.type === "date") v = AA.utils.formatDateID(v);
        return reviewRow(f.label, v ? esc(v) : "-");
      }).join("");
    } else if (sec.type === "checklist") {
      rows = sec.items.map(function (item) {
        var base = sec.id + "." + item.id;
        var status = getVal(data, base + ".status");
        var note = String(getVal(data, base + ".note")).trim();
        var noteHtml = status === NOTE_WHEN && note ? '<span class="review-note">' + esc(note) + "</span>" : "";
        return reviewRow(item.label, badge(status) + noteHtml);
      }).join("");
    } else if (sec.type === "license") {
      rows = sec.items.map(function (item) {
        var base = sec.id + "." + item.id;
        var extra = String(getVal(data, base + ".extra")).trim();
        var note = String(getVal(data, base + ".note")).trim();
        var detail = "";
        if (extra) detail += '<span class="review-note">' + esc(item.extraLabel) + ": " + esc(extra) + "</span>";
        if (note) detail += '<span class="review-note">Catatan: ' + esc(note) + "</span>";
        return reviewRow(item.label, badge(getVal(data, base + ".status")) + detail);
      }).join("");
    }
    return '<section class="card"><h2>' + esc(sec.title) + '</h2><dl class="review-list">' + rows + "</dl></section>";
  }

  /* ---------- validasi per langkah ---------- */
  function validate(step, data) {
    var missing = [];
    step.sections.forEach(function (sec) {
      if (sec.type === "fields") {
        sec.fields.forEach(function (f) {
          var path = sec.id + "." + f.id;
          if (f.required && !String(getVal(data, path)).trim()) {
            missing.push({ kind: "field", path: path, label: f.label });
          }
        });
      } else {
        sec.items.forEach(function (item) {
          var path = sec.id + "." + item.id;
          if (!getVal(data, path + ".status")) missing.push({ kind: "item", path: path, label: item.label });
        });
      }
    });
    return missing;
  }

  function errorMessage(missing) {
    var fields = missing.filter(function (m) { return m.kind === "field"; });
    var items = missing.filter(function (m) { return m.kind === "item"; });
    var parts = [];
    if (fields.length) parts.push("Isi dulu: " + fields.map(function (m) { return m.label; }).join(", ") + ".");
    if (items.length) parts.push("Pilih status untuk " + items.length + " item yang ditandai merah.");
    return parts.join(" ");
  }

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /* ---------- komponen utama ---------- */
  AA.components.auditWizard = function (container, def) {
    var draft = AA.draft.ensure(def.id);
    var total = def.steps.length + 1; // + layar Review
    var firstDraw = true;

    function progressHtml() {
      var title = draft.step < def.steps.length ? def.steps[draft.step].title : "Review";
      var segs = "";
      for (var i = 0; i < total; i++) segs += '<span' + (i <= draft.step ? ' class="is-done"' : "") + "></span>";
      return (
        '<div class="progress">' +
          '<p class="progress__text">Langkah ' + (draft.step + 1) + " dari " + total + " · " + esc(title) + "</p>" +
          '<div class="progress__bar" aria-hidden="true">' + segs + "</div>" +
        "</div>"
      );
    }

    function draw() {
      var isReview = draft.step >= def.steps.length;
      var body;

      if (isReview) {
        body =
          '<h2 class="wizard__title">Review Audit</h2>' +
          '<p class="wizard__hint">Periksa kembali data sebelum disimpan.</p>' +
          def.steps.map(function (st) {
            return st.sections.map(function (sec) { return review(sec, draft.data); }).join("");
          }).join("");
      } else {
        body = def.steps[draft.step].sections.map(function (sec) {
          return formSectionHtml(sec, draft.data);
        }).join("");
      }

      container.innerHTML =
        '<div class="wizard">' +
          '<div class="page-head"><h1>Audit ' + esc(def.label) + "</h1></div>" +
          progressHtml() +
          '<p class="notice notice--error" id="wizard-error" role="alert" hidden></p>' +
          body +
          '<div class="wizard-actions">' +
            '<button type="button" class="btn btn--secondary" data-action="back">Kembali</button>' +
            '<button type="button" class="btn" data-action="next">' + (isReview ? "Simpan Audit" : "Lanjut") + "</button>" +
          "</div>" +
        "</div>";

      bind(container.querySelector(".wizard"), isReview);

      if (!firstDraw) {
        window.scrollTo(0, 0);
        container.focus({ preventScroll: true });
      }
      firstDraw = false;
    }

    function bind(root, isReview) {
      var errorEl = root.querySelector("#wizard-error");

      function onInput(e) {
        var t = e.target;
        var path = t.getAttribute("data-path");
        if (!path) return;
        if (t.type === "radio" && !t.checked) return;

        setVal(draft.data, path, t.value);

        var holder = t.closest("[data-field-path],[data-item-path]");
        if (holder) holder.classList.remove("is-missing");

        // Catatan hanya muncul untuk status "Tidak OK"
        if (t.type === "radio") {
          var item = t.closest(".audit-item");
          var note = item && item.querySelector("[data-note-when]");
          if (note) note.hidden = t.value !== note.getAttribute("data-note-when");
        }
      }
      root.addEventListener("input", onInput);
      root.addEventListener("change", onInput);

      root.querySelector('[data-action="back"]').addEventListener("click", function () {
        if (draft.step === 0) {
          location.hash = "#/mulai-audit";
        } else {
          draft.step -= 1;
          draw();
        }
      });

      root.querySelector('[data-action="next"]').addEventListener("click", function () {
        if (isReview) return save();

        var missing = validate(def.steps[draft.step], draft.data);
        if (missing.length) {
          errorEl.textContent = errorMessage(missing);
          errorEl.hidden = false;
          missing.forEach(function (m) {
            var el = root.querySelector('[data-field-path="' + m.path + '"],[data-item-path="' + m.path + '"]');
            if (el) el.classList.add("is-missing");
          });
          errorEl.scrollIntoView({ block: "center" });
          return;
        }
        draft.step += 1;
        draw();
      });
    }

    function save() {
      var record = {
        id: newId(),
        deviceType: def.id,
        deviceLabel: def.label,
        status: "Selesai",
        savedAt: new Date().toISOString(),
        data: draft.data
      };
      AA.storage.add(record);
      AA.draft.clear(def.id);
      location.hash = "#/audit-selesai/" + record.id;
    }

    draw();
  };
})(window.AssetAudit);
