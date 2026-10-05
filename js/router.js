/* Router berbasis hash — tidak butuh server.
   #/dashboard           -> halaman "dashboard"
   #/audit-selesai/abc12 -> halaman "audit-selesai" dengan ctx.param = "abc12" */
(function (AA) {
  var container, nav;

  function parseHash() {
    var parts = location.hash.replace(/^#\/?/, "").split("/");
    var id = parts[0];
    var known = AA.config.routes.some(function (r) { return r.id === id; });
    return known ? { id: id, param: parts[1] || null } : { id: AA.config.defaultRoute, param: null };
  }

  function findRoute(id) {
    return AA.config.routes.filter(function (r) { return r.id === id; })[0];
  }

  function renderNav(activeId) {
    var active = findRoute(activeId);
    var activeMenu = active.navParent || active.id; // halaman tersembunyi menandai menu induknya

    nav.innerHTML = AA.config.routes.filter(function (r) { return !r.hidden; }).map(function (r) {
      var current = r.id === activeMenu ? ' aria-current="page"' : "";
      return '<a class="nav__link" href="#/' + r.id + '"' + current + ">" +
               AA.components.icon(r.icon) + "<span>" + r.label + "</span></a>";
    }).join("");
  }

  function navigate(keepScroll) {
    var route = parseHash();
    var page = AA.pages[route.id];
    renderNav(route.id);
    page.render(container, { param: route.param });
    document.title = page.title + " · " + AA.config.appName + " " + AA.config.version;
    if (keepScroll !== true) window.scrollTo(0, 0);
  }

  AA.router = {
    start: function (containerEl, navEl) {
      container = containerEl;
      nav = navEl;
      window.addEventListener("hashchange", function () { navigate(false); });
      navigate(false);
    },

    // Gambar ulang halaman yang sedang tampil tanpa menggeser posisi scroll
    refresh: function () { navigate(true); }
  };
})(window.AssetAudit);
