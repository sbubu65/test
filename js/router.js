/* Router berbasis hash (#/dashboard, #/mulai-audit, #/riwayat) — tidak butuh server. */
(function (AA) {
  var container, nav;

  function currentId() {
    var id = location.hash.replace(/^#\/?/, "");
    var known = AA.config.routes.some(function (r) { return r.id === id; });
    return known ? id : AA.config.defaultRoute;
  }

  function renderNav(activeId) {
    nav.innerHTML = AA.config.routes.map(function (r) {
      var current = r.id === activeId ? ' aria-current="page"' : "";
      return '<a class="nav__link" href="#/' + r.id + '"' + current + ">" +
               AA.components.icon(r.icon) + "<span>" + r.label + "</span></a>";
    }).join("");
  }

  function navigate() {
    var id = currentId();
    var page = AA.pages[id];
    renderNav(id);
    page.render(container);
    document.title = page.title + " · " + AA.config.appName + " " + AA.config.version;
    window.scrollTo(0, 0);
  }

  AA.router = {
    start: function (containerEl, navEl) {
      container = containerEl;
      nav = navEl;
      window.addEventListener("hashchange", navigate);
      navigate();
    }
  };
})(window.AssetAudit);
