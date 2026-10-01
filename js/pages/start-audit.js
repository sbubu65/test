/* Halaman Mulai Audit: pilih jenis perangkat, lalu tekan "Mulai Audit".
   V0.1: tombol belum menjalankan audit. Di versi berikutnya, handler tombol
   akan membuka form audit untuk jenis perangkat yang dipilih. */
(function (AA) {
  var esc = AA.utils.escapeHtml;

  AA.pages["mulai-audit"] = {
    title: "Mulai Audit",

    render: function (container) {
      var options = AA.config.deviceTypes.map(function (d) {
        return (
          '<label class="device-option">' +
            '<input type="radio" name="device-type" value="' + esc(d.id) + '">' +
            '<span class="device-option__body">' +
              AA.components.icon(d.icon) +
              "<span>" + esc(d.label) + "</span>" +
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
        notice.textContent = "Perangkat dipilih: " + selected.label +
          ". Form audit akan tersedia di versi berikutnya.";
        notice.hidden = false;
      });
    }
  };
})(window.AssetAudit);
