/* Wizard audit yang bisa dipakai semua jenis perangkat (Laptop, Smartphone, ...).
   Pemakaian: AssetAudit.components.auditWizard(container, AssetAudit.auditDefs.laptop)

   Alur: tiap "step" di definisi -> satu layar isian, lalu satu layar Review -> Submit.
   Data draft disimpan di AA.draft dengan bentuk:
     fields    -> data[section.id][field.id] = "teks"
     checklist -> data[section.id][item.id] = { status, extra?, note }
     license   -> data[section.id][item.id] = { status, extra, note }
     apps      -> data[section.id] = [ { name, status, version, note }, ... ]
   Semua angka nilai berasal dari AssetAudit.scoring (satu rumus untuk seluruh aplikasi). */
(function (AA) {
  var esc = AA.utils.escapeHtml;
  var STATUS_CLASS = { "OK": "ok", "Tidak OK": "bad", "N/A": "na" };
  var NOTE_WHEN = "Tidak OK";
  var DEFAULT_MAX_APPS = 10;

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
        (opts.inputMode ? ' inputmode="' + esc(opts.inputMode) + '"' : "") +
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
        value: getVal(data, path), type: f.type, placeholder: f.placeholder,
        required: f.required, inputMode: f.inputMode
      });
    }).join("") + "</div>";
  }

  // "always": catatan selalu tampil (license); "onFail": catatan hanya muncul saat status Tidak OK (checklist)
  function alwaysNote(sec) {
    return (sec.noteMode || (sec.type === "license" ? "always" : "onFail")) === "always";
  }

  // checklist & license: status + isian tambahan (jika item.extraLabel ada) + catatan
  function itemsSection(sec, data) {
    var always = alwaysNote(sec);
    return '<div class="audit-list">' + sec.items.map(function (item) {
      var base = sec.id + "." + item.id;
      var status = getVal(data, base + ".status");
      var extra = item.extraLabel
        ? '<div class="audit-item__extra">' +
            inputHtml(base + ".extra", item.extraLabel, { value: getVal(data, base + ".extra"), placeholder: item.extraPlaceholder }) +
          "</div>"
        : "";
      var note = inputHtml(base + ".note", "Catatan", { value: getVal(data, base + ".note"), multiline: true });
      var noteBox = always
        ? '<div class="audit-item__extra">' + note + "</div>"
        : '<div class="audit-item__extra" data-note-when="' + NOTE_WHEN + '"' + (status === NOTE_WHEN ? "" : " hidden") + ">" + note + "</div>";
      return (
        '<div class="audit-item" data-item-path="' + base + '">' +
          '<p class="audit-item__label">' + esc(item.label) + "</p>" +
          statusHtml(base + ".status", status, item.label) +
          extra + noteBox +
        "</div>"
      );
    }).join("") + "</div>";
  }

  // apps: daftar baris aplikasi yang bisa ditambah / dihapus
  function appsSection(sec, data) {
    var rows = data[sec.id];
    if (!Array.isArray(rows)) rows = data[sec.id] = [];
    var max = sec.max || DEFAULT_MAX_APPS;

    var list = rows.map(function (row, i) {
      var base = sec.id + "." + i;
      return (
        '<div class="app-row" data-item-path="' + base + '">' +
          '<div class="app-row__head">' +
            '<p class="audit-item__label">Aplikasi ' + (i + 1) + "</p>" +
            '<button type="button" class="link-btn" data-action="remove-app" data-sec="' + esc(sec.id) + '" data-index="' + i + '">Hapus</button>' +
          "</div>" +
          inputHtml(base + ".name", "Nama Aplikasi", { value: row.name, required: true }) +
          statusHtml(base + ".status", row.status || "", "Aplikasi " + (i + 1)) +
          inputHtml(base + ".version", "Versi", { value: row.version }) +
          inputHtml(base + ".note", "Catatan", { value: row.note, multiline: true }) +
        "</div>"
      );
    }).join("");

    return (
      '<div class="app-list">' + list + "</div>" +
      (rows.length === 0 ? '<p class="app-empty">Belum ada aplikasi ditambahkan.</p>' : "") +
      '<button type="button" class="btn btn--secondary" data-action="add-app" data-sec="' + esc(sec.id) + '"' +
        (rows.length >= max ? " disabled" : "") + ">+ Tambah Aplikasi</button>"
    );
  }

  var sectionRenderers = { fields: fieldsSection, checklist: itemsSection, license: itemsSection, apps: appsSection };

  function formSectionHtml(sec, data) {
    return '<section class="card"><h2>' + esc(sec.title) + "</h2>" +
      (sec.hint ? '<p class="section-hint">' + esc(sec.hint) + "</p>" : "") +
      sectionRenderers[sec.type](sec, data) + "</section>";
  }

  /* ---------- tampilan Review (hanya baca): komponen bersama dengan halaman Detail ---------- */
  var review = AA.components.auditReview;
  var reviewRow = review.row;

  function scoringPreviewHtml(r) {
    var rows =
      reviewRow("Total Item", esc(r.total)) +
      reviewRow("OK", esc(r.ok)) +
      reviewRow("Tidak OK", esc(r.notOk)) +
      reviewRow("N/A", esc(r.na)) +
      reviewRow("Item Dinilai", esc(r.counted)) +
      reviewRow("Nilai Audit", esc(r.scoreText)) +
      reviewRow("Kondisi", '<span class="badge badge--' + esc(r.tone) + '">' + esc(r.condition) + "</span>");
    return (
      '<h2 class="section-title">Scoring Preview</h2>' +
      AA.components.scoreCard.render(r) +
      '<section class="card"><dl class="review-list">' + rows + "</dl></section>"
    );
  }

  function hasScoredSections(step) {
    return step.sections.some(function (sec) { return sec.scored; });
  }

  /* ---------- validasi ---------- */
  function validateStep(step, stepIndex, data) {
    var missing = [];
    function add(kind, path, label, sec, message) {
      missing.push({ kind: kind, path: path, label: label, message: message || "", sectionTitle: sec.title, stepIndex: stepIndex });
    }

    step.sections.forEach(function (sec) {
      if (sec.type === "fields") {
        sec.fields.forEach(function (f) {
          var path = sec.id + "." + f.id;
          var v = String(getVal(data, path)).trim();
          if (!v) {
            if (f.required) add("field", path, f.label, sec);
          } else if (f.validate && AA.auditDefs.validators[f.validate]) {
            var msg = AA.auditDefs.validators[f.validate](v, data[sec.id] || {});
            if (msg) add("invalid", path, f.label, sec, msg);
          }
        });
      } else if (sec.type === "apps") {
        var rows = Array.isArray(data[sec.id]) ? data[sec.id] : [];
        rows.forEach(function (row, i) {
          var base = sec.id + "." + i;
          if (!String((row && row.name) || "").trim()) add("field", base + ".name", "Nama Aplikasi (baris " + (i + 1) + ")", sec);
          if (!(row && row.status)) add("item", base, String(row && row.name || "").trim() || "Aplikasi " + (i + 1), sec);
        });
      } else {
        sec.items.forEach(function (item) {
          var path = sec.id + "." + item.id;
          if (!getVal(data, path + ".status")) add("item", path, item.label, sec);
        });
      }
    });
    return missing;
  }

  // Semua langkah sekaligus: dipakai sebagai penjaga terakhir di Review/Submit.
  function validateAll(def, data) {
    var all = [];
    def.steps.forEach(function (step, i) { all = all.concat(validateStep(step, i, data)); });
    return all;
  }

  function errorHtml(missing, withSection) {
    var fields = missing.filter(function (m) { return m.kind === "field"; });
    var invalid = missing.filter(function (m) { return m.kind === "invalid"; });
    var items = missing.filter(function (m) { return m.kind === "item"; });
    var html = "";
    if (fields.length) {
      html += "<p>Data wajib belum diisi: " + esc(fields.map(function (m) { return m.label; }).join(", ")) + ".</p>";
    }
    if (invalid.length) {
      html += "<p>Periksa isian berikut:</p>" +
        '<ul class="notice__list">' + invalid.map(function (m) {
          return "<li>" + esc(m.label) + " " + esc(m.message) + "</li>";
        }).join("") + "</ul>";
    }
    if (items.length) {
      html += "<p>Masih ada item checklist yang belum diisi.</p>" +
        '<ul class="notice__list">' + items.map(function (m) {
          return "<li>" + esc(m.label) + (withSection ? " <span>(" + esc(m.sectionTitle) + ")</span>" : "") + "</li>";
        }).join("") + "</ul>";
    }
    return html;
  }

  /* ---------- record yang disimpan ---------- */
  function buildRecord(def, data, result) {
    var auditId = AA.api.newAuditId(); // unik; juga dipakai Apps Script untuk mencegah data ganda
    var info = data.info || (data.info = {});
    info.assetId = String(info.assetId || "").trim();
    info.auditor = String(info.auditor || "").trim();

    // Rapikan spasi di semua isian teks (mis. IMEI/Serial yang tertempel dengan spasi di ujung)
    def.steps.forEach(function (step) {
      step.sections.forEach(function (sec) {
        if (sec.type !== "fields" || !data[sec.id]) return;
        sec.fields.forEach(function (f) {
          if (typeof data[sec.id][f.id] === "string") data[sec.id][f.id] = data[sec.id][f.id].trim();
        });
      });
    });

    // Kelompokkan section menurut "role" di definisi: specifications / checklist / license
    var parts = { specifications: {}, checklist: {}, license: {} };
    def.steps.forEach(function (step) {
      step.sections.forEach(function (sec) {
        if (!sec.role || !parts[sec.role] || !data[sec.id]) return;
        for (var k in data[sec.id]) parts[sec.role][k] = data[sec.id][k];
      });
    });

    return {
      schemaVersion: 2,
      id: auditId,
      auditId: auditId,
      assetId: info.assetId,
      deviceType: def.id,
      deviceLabel: def.label,
      auditor: info.auditor,
      tanggal: info.tanggal,
      specifications: parts.specifications,
      checklist: parts.checklist,
      license: parts.license,
      scoring: {
        ok: result.ok,
        notOk: result.notOk,
        na: result.na,
        total: result.total,
        counted: result.counted,
        score: result.score,          // 2 desimal; null jika belum dapat dinilai
        condition: result.condition
      },
      score: result.score,
      condition: result.condition,
      status: "Selesai",
      syncStatus: "pending",  // pending | synced | failed (diubah oleh AA.sync)
      syncMessage: "",
      createdAt: new Date().toISOString(),
      data: data                      // salinan lengkap per section, dipakai untuk menampilkan ulang audit
    };
  }

  /* ---------- komponen utama ---------- */
  AA.components.auditWizard = function (container, def) {
    var draft = AA.draft.ensure(def.id);
    var total = def.steps.length + 1; // + layar Review
    var firstDraw = true;
    var submitting = false; // true selama audit sedang disimpan/dikirim: cegah submit ganda

    function progressHtml() {
      var title = draft.step < def.steps.length ? def.steps[draft.step].title : "Review";
      var segs = "";
      for (var i = 0; i < total; i++) segs += "<span" + (i <= draft.step ? ' class="is-done"' : "") + "></span>";
      return (
        '<div class="progress">' +
          '<p class="progress__text">Langkah ' + (draft.step + 1) + " dari " + total + " · " + esc(title) + "</p>" +
          '<div class="progress__bar" aria-hidden="true">' + segs + "</div>" +
        "</div>"
      );
    }

    // keepScroll: dipakai saat menambah/menghapus baris aplikasi agar halaman tidak melompat ke atas
    function draw(keepScroll) {
      var isReview = draft.step >= def.steps.length;
      var result = AA.scoring.evaluate(def, draft.data);
      var missingAll = isReview ? validateAll(def, draft.data) : [];
      var blocked = missingAll.length > 0;
      var body;

      if (isReview) {
        body =
          '<h2 class="wizard__title">Review Audit</h2>' +
          '<p class="wizard__hint">Periksa kembali data sebelum disubmit.</p>' +
          (blocked
            ? '<div class="notice notice--error" role="alert">' + errorHtml(missingAll, true) +
              '<button type="button" class="btn btn--secondary" data-action="fix">Lengkapi Sekarang</button></div>'
            : "") +
          review.groupsHtml(def, draft.data) +
          scoringPreviewHtml(result);
      } else {
        var step = def.steps[draft.step];
        body =
          (hasScoredSections(step) ? AA.components.scoreCard.render(result) : "") +
          step.sections.map(function (sec) { return formSectionHtml(sec, draft.data); }).join("");
      }

      container.innerHTML =
        '<div class="wizard">' +
          '<div class="page-head"><h1>Audit ' + esc(def.label) + "</h1></div>" +
          progressHtml() +
          '<div class="notice notice--error" id="wizard-error" role="alert" hidden></div>' +
          body +
          '<div class="wizard-actions">' +
            '<button type="button" class="btn btn--secondary" data-action="back">' + (isReview ? "Kembali Edit" : "Kembali") + "</button>" +
            '<button type="button" class="btn" data-action="next"' + (blocked ? " disabled" : "") + ">" +
              (isReview ? "Submit Audit" : "Lanjut") + "</button>" +
          "</div>" +
        "</div>";

      bind(container.querySelector(".wizard"), isReview, missingAll);

      if (!firstDraw && keepScroll !== true) {
        window.scrollTo(0, 0);
        container.focus({ preventScroll: true });
      }
      firstDraw = false;
    }

    function findSection(id) {
      var found = null;
      def.steps.forEach(function (step) {
        step.sections.forEach(function (sec) { if (sec.id === id) found = sec; });
      });
      return found;
    }

    function bind(root, isReview, missingAll) {
      var errorEl = root.querySelector("#wizard-error");

      function onInput(e) {
        var t = e.target;
        var path = t.getAttribute("data-path");
        if (!path) return;
        if (t.type === "radio" && !t.checked) return;

        setVal(draft.data, path, t.value);

        // Scoring real-time: hitung ulang setiap status berubah
        if (/\.status$/.test(path)) {
          var card = root.querySelector(".score-card");
          if (card) AA.components.scoreCard.update(card, AA.scoring.evaluate(def, draft.data));
        }

        var holder = t.closest("[data-field-path],[data-item-path]");
        if (holder) holder.classList.remove("is-missing");
        var appRow = t.closest(".app-row");
        if (appRow) appRow.classList.remove("is-missing");

        // Catatan hanya muncul untuk status "Tidak OK"
        if (t.type === "radio") {
          var item = t.closest(".audit-item");
          var note = item && item.querySelector("[data-note-when]");
          if (note) note.hidden = t.value !== note.getAttribute("data-note-when");
        }
      }
      root.addEventListener("input", onInput);
      root.addEventListener("change", onInput);

      // Tambah / hapus baris aplikasi (section bertipe "apps")
      root.addEventListener("click", function (e) {
        var btn = e.target.closest('[data-action="add-app"],[data-action="remove-app"]');
        if (!btn || btn.disabled) return;
        var sec = findSection(btn.getAttribute("data-sec"));
        if (!sec) return;
        var rows = Array.isArray(draft.data[sec.id]) ? draft.data[sec.id] : (draft.data[sec.id] = []);

        if (btn.getAttribute("data-action") === "add-app") {
          if (rows.length >= (sec.max || DEFAULT_MAX_APPS)) return;
          rows.push({ name: "", status: "", version: "", note: "" });
          draw(true);
          var input = container.querySelector('[data-path="' + sec.id + "." + (rows.length - 1) + '.name"]');
          if (input) input.focus();
        } else {
          rows.splice(Number(btn.getAttribute("data-index")), 1);
          draw(true);
        }
      });

      // Kembali / Kembali Edit: data draft tetap tersimpan di AA.draft
      root.querySelector('[data-action="back"]').addEventListener("click", function () {
        if (draft.step === 0) {
          location.hash = "#/mulai-audit";
        } else {
          draft.step -= 1;
          draw();
        }
      });

      var fix = root.querySelector('[data-action="fix"]');
      if (fix) {
        fix.addEventListener("click", function () {
          draft.step = missingAll[0].stepIndex;
          draw();
        });
      }

      root.querySelector('[data-action="next"]').addEventListener("click", function () {
        if (isReview) return save();

        var missing = validateStep(def.steps[draft.step], draft.step, draft.data);
        if (missing.length) {
          errorEl.innerHTML = errorHtml(missing, false);
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

    // Tampilan "sedang menyimpan": tombol dinonaktifkan agar tidak bisa di-submit berkali-kali
    function showSaving() {
      var root = container.querySelector(".wizard");
      var next = root.querySelector('[data-action="next"]');
      root.setAttribute("aria-busy", "true");
      next.disabled = true;
      next.classList.add("is-loading");
      next.textContent = "Menyimpan audit...";
      root.querySelector('[data-action="back"]').disabled = true;
      root.querySelector(".wizard-actions").insertAdjacentHTML("afterend",
        '<p class="loading-note" role="status">Menyimpan audit... Mohon tunggu, jangan tutup halaman ini.</p>');
    }

    function save() {
      if (submitting) return;

      // Penjaga terakhir: tidak boleh submit jika masih ada checklist/data wajib yang kosong
      if (validateAll(def, draft.data).length) { draw(); return; }

      submitting = true;
      showSaving();
      var routeAtSubmit = location.hash;

      // 1) Simpan ke localStorage dulu: data aman walaupun pengiriman gagal
      var record = buildRecord(def, draft.data, AA.scoring.evaluate(def, draft.data));
      AA.storage.add(record);
      AA.draft.clear(def.id);

      // 2) Kirim ke Spreadsheet (selalu selesai dengan sukses/gagal, tidak melempar error),
      //    lalu tampilkan Hasil Audit lengkap dengan status sinkronisasinya.
      AA.sync.push(record.id).then(function () {
        if (location.hash === routeAtSubmit) location.hash = "#/audit-selesai/" + record.id;
      });
    }

    draw();
  };
})(window.AssetAudit);
