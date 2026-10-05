/* Halaman Riwayat Audit.
   Data: Spreadsheet (lewat Apps Script) + audit lokal, lihat js/data/audit-history.js.
   Fitur: cari (Asset ID / Auditor), filter (Device, Kondisi, Status, Tanggal), urutkan, pagination,
   tombol Refresh. Klik satu baris membuka Detail Audit. */
(function (AA) {
  var esc = AA.utils.escapeHtml;
  var PAGE_SIZE = 10;

  // Pilihan filter dibuat dari konfigurasi, jadi device baru otomatis muncul di filter.
  var DEVICES = AA.config.deviceTypes.map(function (d) { return d.label; });
  var CONDITIONS = AA.scoring.categories.map(function (c) { return c.label; }).concat(AA.scoring.unratedLabel);
  var RANGES = [["", "Semua"], ["today", "Hari ini"], ["7d", "7 hari terakhir"], ["30d", "30 hari terakhir"], ["custom", "Custom tanggal"]];
  var STATUSES = [["", "Semua"], ["selesai", "Selesai"], ["unsynced", "Belum Sinkron"]];
  var SORTS = [["newest", "Tanggal terbaru"], ["oldest", "Tanggal terlama"], ["high", "Nilai tertinggi"], ["low", "Nilai terendah"]];

  // Filter & urutan diingat selama aplikasi terbuka (kembali dari Detail tidak mengulang dari awal)
  var state = { q: "", device: "", kondisi: "", status: "", range: "", from: "", to: "", sort: "newest", page: 1 };

  /* ---------- logika filter / urutan (tanpa DOM) ---------- */

  function addDays(iso, n) {
    var p = iso.split("-");
    var d = new Date(Number(p[0]), Number(p[1]) - 1 + 0, Number(p[2]) + n);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  // Rentang tanggal aktif: { from, to, invalid }. Kosong = tidak dibatasi.
  function dateRange() {
    var today = AA.utils.todayISO();
    if (state.range === "today") return { from: today, to: today };
    if (state.range === "7d")    return { from: addDays(today, -6),  to: today };
    if (state.range === "30d")   return { from: addDays(today, -29), to: today };
    if (state.range === "custom") {
      return { from: state.from, to: state.to, invalid: !!(state.from && state.to && state.from > state.to) };
    }
    return { from: "", to: "" };
  }

  function applyFilters(list) {
    var q = state.q.trim().toLowerCase();
    var range = dateRange();
    if (range.invalid) return [];

    return list.filter(function (it) {
      if (q && (String(it.assetId).toLowerCase().indexOf(q) < 0 && String(it.auditor).toLowerCase().indexOf(q) < 0)) return false;
      if (state.device && it.device !== state.device) return false;
      if (state.kondisi && it.result.condition !== state.kondisi) return false;
      if (state.status === "selesai" && !(it.status === "Selesai" && it.synced)) return false;
      if (state.status === "unsynced" && it.synced) return false;
      if ((range.from || range.to) && !it.tanggal) return false;
      if (range.from && it.tanggal < range.from) return false;
      if (range.to && it.tanggal > range.to) return false;
      return true;
    });
  }

  function newestFirst(a, b) {
    return String(b.tanggal || "").localeCompare(String(a.tanggal || "")) ||
           String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
  }

  function byScore(dir) { // dir: -1 tertinggi dulu, 1 terendah dulu. "Belum dapat dinilai" selalu di akhir.
    return function (a, b) {
      var x = a.result.score, y = b.result.score;
      if (x === null && y === null) return newestFirst(a, b);
      if (x === null) return 1;
      if (y === null) return -1;
      return (x - y) * dir || newestFirst(a, b);
    };
  }

  function applySort(list) {
    var cmp = state.sort === "oldest" ? function (a, b) { return newestFirst(b, a); }
            : state.sort === "high" ? byScore(-1)
            : state.sort === "low" ? byScore(1)
            : newestFirst;
    return list.slice().sort(cmp);
  }

  function hasActiveFilter() {
    return !!(state.q.trim() || state.device || state.kondisi || state.status || state.range);
  }

  /* ---------- tampilan ---------- */

  function options(list, selected) {
    return list.map(function (o) {
      var value = Array.isArray(o) ? o[0] : o;
      var label = Array.isArray(o) ? o[1] : o;
      return '<option value="' + esc(value) + '"' + (value === selected ? " selected" : "") + ">" + esc(label) + "</option>";
    }).join("");
  }

  function selectField(id, label, list, selected) {
    return (
      '<div class="field"><label class="field__label" for="' + id + '">' + esc(label) + "</label>" +
      '<select class="field__input" id="' + id + '">' + options(list, selected) + "</select></div>"
    );
  }

  function skeleton() {
    var devices = [["", "Semua"]].concat(DEVICES.map(function (d) { return [d, d]; }));
    var conditions = [["", "Semua"]].concat(CONDITIONS.map(function (c) { return [c, c]; }));
    return (
      '<div class="page-head page-head--row">' +
        "<div><h1>Riwayat Audit</h1><p>Ketuk satu audit untuk melihat detailnya.</p></div>" +
        '<button type="button" class="btn btn--secondary btn--small" data-action="refresh">Refresh</button>' +
      "</div>" +
      '<div id="history-status"></div>' +
      '<div class="filters">' +
        '<div class="field field--search"><label class="field__label" for="h-q">Cari Asset ID / Auditor</label>' +
          '<input class="field__input" id="h-q" type="search" placeholder="Cari Asset ID / Auditor" autocomplete="off" value="' + esc(state.q) + '"></div>' +
        selectField("h-device", "Device Type", devices, state.device) +
        selectField("h-kondisi", "Kondisi", conditions, state.kondisi) +
        selectField("h-status", "Status", STATUSES, state.status) +
        selectField("h-range", "Tanggal", RANGES, state.range) +
        selectField("h-sort", "Urutkan", SORTS, state.sort) +
        '<div class="filters__custom" id="h-custom"' + (state.range === "custom" ? "" : " hidden") + ">" +
          '<div class="field"><label class="field__label" for="h-from">Dari tanggal</label><input class="field__input" id="h-from" type="date" value="' + esc(state.from) + '"></div>' +
          '<div class="field"><label class="field__label" for="h-to">Sampai tanggal</label><input class="field__input" id="h-to" type="date" value="' + esc(state.to) + '"></div>' +
        "</div>" +
      "</div>" +
      '<div id="history-results"></div>'
    );
  }

  function two(n) { return String(n).padStart(2, "0"); }

  function timeText(iso) {
    var d = new Date(iso);
    return isNaN(d.getTime()) ? "" : two(d.getHours()) + "." + two(d.getMinutes());
  }

  /* ---------- halaman ---------- */

  AA.pages["riwayat"] = {
    title: "Riwayat Audit",

    render: function (container) {
      container.innerHTML = skeleton();

      var statusEl = container.querySelector("#history-status");
      var resultsEl = container.querySelector("#history-results");
      var refreshBtn = container.querySelector('[data-action="refresh"]');
      var loading = false;

      /* Baris status di atas daftar */
      function paintStatus(hasData) {
        var html = "";
        var err = AA.history.lastError();
        if (loading) {
          html = '<div class="notice notice--info" role="status"><span class="spinner" aria-hidden="true"></span> Memuat data terbaru dari Spreadsheet...</div>';
        } else if (err && hasData) {
          html = '<div class="notice notice--error" role="alert">' + esc(err.message) + "</div>";
        } else if (!err && AA.history.hasRemote() && AA.history.fetchedAt()) {
          html = '<p class="history-status">Data dari Spreadsheet · diperbarui ' + esc(timeText(AA.history.fetchedAt())) + "</p>";
        }
        statusEl.innerHTML = html;
      }

      /* Daftar + pagination (dipanggil setiap data/filter berubah; kontrol di atas tidak digambar ulang) */
      function paint() {
        var all = AA.history.items();
        var filtered = applySort(applyFilters(all));
        paintStatus(all.length > 0);

        if (all.length === 0) {
          if (loading) { resultsEl.innerHTML = ""; return; }
          var failed = !!AA.history.lastError();
          resultsEl.innerHTML = failed
            ? '<div class="empty"><p>Data audit belum dapat ditampilkan.</p></div>'
            : '<div class="empty"><p>Belum ada data audit.</p><a class="btn" href="#/mulai-audit">Mulai Audit</a></div>';
          return;
        }

        if (dateRange().invalid) {
          resultsEl.innerHTML = '<div class="empty"><p>Tanggal awal tidak boleh setelah tanggal akhir.</p></div>';
          return;
        }

        if (filtered.length === 0) {
          resultsEl.innerHTML =
            '<div class="empty"><p>Tidak ada audit yang sesuai dengan filter.</p>' +
            (hasActiveFilter() ? '<button type="button" class="btn btn--secondary" data-action="reset">Reset Filter</button>' : "") + "</div>";
          return;
        }

        var pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
        if (state.page > pages) state.page = pages;
        if (state.page < 1) state.page = 1;
        var start = (state.page - 1) * PAGE_SIZE;
        var shown = filtered.slice(start, start + PAGE_SIZE);

        var table = AA.components.dataTable([
          { key: "tanggal", label: "Tanggal", render: function (r) { return esc(AA.utils.formatDateID(r.tanggal)); } },
          { key: "assetId", label: "Asset ID", render: function (r) {
              return '<a class="row-link" href="#/hasil-audit/' + esc(r.key) + '">' + esc(r.assetId) + "</a>";
          } },
          { key: "device",  label: "Device" },
          { key: "auditor", label: "Auditor" },
          { key: "nilai",   label: "Nilai", className: "is-num", render: function (r) { return esc(r.result.scoreText); } },
          { key: "kondisi", label: "Kondisi", render: function (r) {
              return '<span class="badge badge--' + esc(r.result.tone) + '">' + esc(r.result.condition) + "</span>";
          } },
          { key: "status",  label: "Status", render: function (r) { return '<span class="badge">' + esc(r.status) + "</span>"; } },
          { key: "sync",    label: "Sync", render: function (r) {
              return '<span class="badge badge--' + (r.synced ? "synced" : "unsynced") + '">' + (r.synced ? "Tersinkron" : "Belum Sinkron") + "</span>";
          } }
        ], shown, { rowHref: function (r) { return "#/hasil-audit/" + r.key; } });

        var count = "Menampilkan " + (start + 1) + "–" + (start + shown.length) + " dari " + filtered.length + " audit" +
          (filtered.length !== all.length ? " (total " + all.length + ")" : "");

        var pager = pages > 1
          ? '<nav class="pager" aria-label="Halaman riwayat">' +
              '<button type="button" class="btn btn--secondary btn--small" data-page="prev"' + (state.page <= 1 ? " disabled" : "") + ">Sebelumnya</button>" +
              '<span class="pager__info">Halaman ' + state.page + " dari " + pages + "</span>" +
              '<button type="button" class="btn btn--secondary btn--small" data-page="next"' + (state.page >= pages ? " disabled" : "") + ">Berikutnya</button>" +
            "</nav>"
          : "";

        resultsEl.innerHTML = '<p class="history-count">' + esc(count) + "</p>" + table + pager;
      }

      /* Ambil data terbaru dari Spreadsheet */
      function load() {
        loading = true;
        refreshBtn.disabled = true;
        refreshBtn.classList.add("is-loading");
        refreshBtn.textContent = "Memuat...";
        paint();
        AA.history.refresh().then(function () {
          loading = false;
          if (!refreshBtn.isConnected) return; // user sudah pindah halaman
          refreshBtn.disabled = false;
          refreshBtn.classList.remove("is-loading");
          refreshBtn.textContent = "Refresh";
          paint();
        });
      }

      /* ----- kontrol ----- */
      function bindSelect(id, key) {
        container.querySelector(id).addEventListener("change", function (e) {
          state[key] = e.target.value;
          state.page = 1;
          if (key === "range") container.querySelector("#h-custom").hidden = state.range !== "custom";
          paint();
        });
      }
      bindSelect("#h-device", "device");
      bindSelect("#h-kondisi", "kondisi");
      bindSelect("#h-status", "status");
      bindSelect("#h-range", "range");
      bindSelect("#h-sort", "sort");
      bindSelect("#h-from", "from");
      bindSelect("#h-to", "to");
      container.querySelector("#h-q").addEventListener("input", function (e) { state.q = e.target.value; state.page = 1; paint(); });

      refreshBtn.addEventListener("click", load);

      resultsEl.addEventListener("click", function (e) {
        var tr = e.target.closest("tr[data-href]");
        if (tr && !e.target.closest("a")) { location.hash = tr.getAttribute("data-href"); return; }

        var pageBtn = e.target.closest("[data-page]");
        if (pageBtn && !pageBtn.disabled) {
          state.page += pageBtn.getAttribute("data-page") === "next" ? 1 : -1;
          paint();
          container.querySelector(".filters").scrollIntoView({ block: "start" });
          return;
        }

        if (e.target.closest('[data-action="reset"]')) {
          state = { q: "", device: "", kondisi: "", status: "", range: "", from: "", to: "", sort: "newest", page: 1 };
          container.innerHTML = skeleton();
          AA.pages["riwayat"].render(container);
        }
      });

      /* ----- tampilan awal ----- */
      if (AA.api.isConfigured() && !AA.history.isFresh()) load();
      else paint();
    }
  };
})(window.AssetAudit);
