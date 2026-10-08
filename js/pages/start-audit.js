/* Halaman Mulai Audit: pilih jenis perangkat, lalu tekan "Mulai Audit".
   Perangkat yang sudah punya audit (auditRoute, diisi oleh AA.registerDevice / config.js) bisa dipilih;
   yang belum ditampilkan nonaktif dengan label "Segera hadir". */
(function (AA) {
  var esc = AA.utils.escapeHtml;

  AA.pages["mulai-audit"] = {
    title: "Mulai Audit",

    render: function (container) {
      var options = AA.config.deviceTypes.map(function (d) {
        var ready = !!d.auditRoute;
        return (
          '<label class="device-option' + (ready ? "" : " is-disabled") + '">' +
            '<input type="radio" name="device-type" value="' + esc(d.id) + '"' + (ready ? "" : " disabled") + ">" +
            '<span class="device-option__body">' +
              AA.components.icon(d.icon) +
              "<span>" + esc(d.label) + "</span>" +
              (ready ? "" : '<span class="device-soon">Segera hadir</span>') +
            "</span>" +
          "</label>"
        );
      }).join("");

      container.innerHTML =
        '<div class="page-head">' +
          "<h1>Mulai Audit</h1>" +
          "<p>Pilih jenis perangkat yang akan diaudit.</p>" +
        "</div>" +
        '<fieldset class="device-grid">' +
          '<legend class="visually-hidden" style="position:absolute;left:-9999px">Jenis perangkat</legend>' +
          options +
        "</fieldset>" +
        '<div class="start-action">' +
          '<button type="button" class="btn btn--block" id="start-btn" disabled>Mulai Audit</button>' +
          '<p class="notice" id="start-notice" role="status" hidden></p>' +
        "</div>";

      var btn = container.querySelector("#start-btn");
      var notice = container.querySelector("#start-notice");
      var selected = null;

      container.querySelectorAll('input[name="device-type"]').forEach(function (input) {
        input.addEventListener("change", function () {
          selected = AA.config.deviceTypes.filter(function (d) { return d.id === input.value; })[0];
          btn.disabled = false;
          notice.hidden = true;
        });
      });

      btn.addEventListener("click", function () {
        if (!selected) return;

        if (selected.auditRoute) {
          AA.draft.reset(selected.id); // mulai dari form kosong
          location.hash = "#/" + selected.auditRoute;
          return;
        }

        notice.textContent = "Audit " + selected.label + " belum tersedia.";
        notice.hidden = false;
      });
    }
  };
})(window.AssetAudit);
