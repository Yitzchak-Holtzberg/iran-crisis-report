// ===== NAVIGATION: mobile toggle =====
// ===== LEFT SIDEBAR: active section + progress on scroll =====
(function() {
  var sectionIds = ['stats','last-24h','confirmed-unconfirmed','theater','nuclear','nuclear-deal-terms','scenarios','air-power','naval','military','iran-retaliation','hormuz','inside-iran','opposition','opposition-landscape'];
  var sbLinks = document.querySelectorAll('.sb-link');
  function onScroll() {
    var scrollY = window.scrollY + 60;
    var active = sectionIds[0];
    for (var i = 0; i < sectionIds.length; i++) {
      var el = document.getElementById(sectionIds[i]);
      if (el && el.getBoundingClientRect().top + window.scrollY <= scrollY) active = sectionIds[i];
    }
    sbLinks.forEach(function(a) {
      a.classList.toggle('active', a.getAttribute('data-section') === active);
    });
    var pct = (window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight)) * 100;
    var fill = document.getElementById('sbProgressFill');
    if (fill) fill.style.width = Math.min(100, Math.max(0, pct)) + '%';
  }
  window.addEventListener('scroll', onScroll, {passive: true});
  onScroll();
})();

// ===== LEFT SIDEBAR: collapse toggle (desktop) =====
function toggleCollapse() {
  var sb = document.getElementById('leftSidebar');
  var btn = document.getElementById('sbCollapseBtn');
  var collapsed = sb.classList.toggle('collapsed');
  document.body.classList.toggle('sb-collapsed', collapsed);
  document.body.classList.toggle('sb-expanded', !collapsed);
  if (btn) btn.innerHTML = collapsed ? '&#9654;' : '&#9668;';
}
// ===== LEFT SIDEBAR: mobile toggle =====
function toggleSidebar() {
  var sb = document.getElementById('leftSidebar');
  var ov = document.getElementById('sbOverlay');
  var open = sb.classList.toggle('open');
  ov.classList.toggle('open', open);
  var icon = document.querySelector('#sbToggle .sb-toggle-icon');
  var label = document.querySelector('#sbToggle .sb-toggle-label');
  if (icon) icon.textContent = open ? '\u2715' : '\u2630';
  if (label) label.textContent = open ? 'Close' : 'Menu';
}
function closeSidebar() {
  document.getElementById('leftSidebar').classList.remove('open');
  document.getElementById('sbOverlay').classList.remove('open');
  var icon = document.querySelector('#sbToggle .sb-toggle-icon');
  var label = document.querySelector('#sbToggle .sb-toggle-label');
  if (icon) icon.textContent = '\u2630';
  if (label) label.textContent = 'Menu';
}
// Close sidebar when a link is clicked on mobile
document.querySelectorAll('.sb-link').forEach(function(a) {
  a.addEventListener('click', function() {
    if (window.innerWidth <= 900) closeSidebar();
  });
});
