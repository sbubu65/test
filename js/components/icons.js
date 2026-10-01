/* Kumpulan ikon SVG (gaya garis). Pakai: AssetAudit.components.icon("laptop") */
(function (AA) {
  var paths = {
    dashboard:  '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    audit:      '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    history:    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    laptop:     '<rect x="4" y="5" width="16" height="11" rx="2"/><path d="M2 20h20"/>',
    smartphone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    tablet:     '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M11 18h2"/>',
    imac:       '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>'
  };

  AA.components.icon = function (name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
           (paths[name] || "") + "</svg>";
  };
})(window.AssetAudit);
