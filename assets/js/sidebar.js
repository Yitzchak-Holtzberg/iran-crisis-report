/* ===== LEFT SIDEBAR — scroll tracking, collapse, mobile toggle ===== */
(function () {
  var sectionIds = ['stats', 'last-24h', 'theater', 'air-power', 'naval', 'inside-iran', 'opposition', 'nuclear', 'hormuz', 'military', 'scenarios'];
  var sbLinks = document.querySelectorAll('.sb-link');

  function onScroll() {
    var scrollY = window.scrollY + 60;
    var active = sectionIds[0];
    for (var i = 0; i < sectionIds.length; i++) {
      var el = document.getElementById(sectionIds[i]);
      if (el && el.getBoundingClientRect().top + window.scrollY <= scrollY) { active = sectionIds[i]; }
    }
    sbLinks.forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-section') === active);
    });
    var pct = (window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight)) * 100;
    var fill = document.getElementById('sbProgressFill');
    if (fill) { fill.style.width = Math.min(100, Math.max(0, pct)) + '%'; }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* Desktop collapse toggle */
function toggleCollapse() {
  var sb = document.getElementById('leftSidebar');
  var btn = document.getElementById('sbCollapseBtn');
  var collapsed = sb.classList.toggle('collapsed');
  document.body.classList.toggle('sb-collapsed', collapsed);
  document.body.classList.toggle('sb-expanded', !collapsed);
  if (btn) { btn.innerHTML = collapsed ? '&#9654;' : '&#9668;'; }
}

/* Mobile slide-in toggle */
function toggleSidebar() {
  var sb = document.getElementById('leftSidebar');
  var ov = document.getElementById('sbOverlay');
  var open = sb.classList.toggle('open');
  ov.classList.toggle('open', open);
}

function closeSidebar() {
  document.getElementById('leftSidebar').classList.remove('open');
  document.getElementById('sbOverlay').classList.remove('open');
}

/* Close sidebar when a link is clicked on mobile */
document.querySelectorAll('.sb-link').forEach(function (a) {
  a.addEventListener('click', function () {
    if (window.innerWidth <= 900) { closeSidebar(); }
  });
});
