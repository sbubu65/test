/* Tabel generik.
   columns: [{ key, label, className?, render?(row) }]
   Atribut data-label dipakai CSS agar tabel menjadi kartu di layar HP. */
(function (AA) {
  var esc = AA.utils.escapeHtml;

  AA.components.dataTable = function (columns, rows) {
    var head = columns.map(function (c) {
      var cls = c.className ? ' class="' + c.className + '"' : "";
      return '<th scope="col"' + cls + ">" + esc(c.label) + "</th>";
    }).join("");

    var body = rows.map(function (row) {
      var cells = columns.map(function (c) {
        var content = c.render ? c.render(row) : esc(row[c.key]);
        var cls = c.className ? ' class="' + c.className + '"' : "";
        return '<td data-label="' + esc(c.label) + '"' + cls + ">" + content + "</td>";
      }).join("");
      return "<tr>" + cells + "</tr>";
    }).join("");

    return (
      '<div class="table-wrap"><table class="data-table">' +
        "<thead><tr>" + head + "</tr></thead>" +
        "<tbody>" + body + "</tbody>" +
      "</table></div>"
    );
  };
})(window.AssetAudit);
