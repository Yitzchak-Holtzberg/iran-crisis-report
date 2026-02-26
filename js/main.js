function toggleTheme() {
  var html = document.documentElement;
  var isLight = html.getAttribute('data-theme') === 'light';
  if (isLight) {
    html.removeAttribute('data-theme');
    document.getElementById('toggleIcon').textContent = '\u2600\uFE0F';
    document.getElementById('toggleLabel').textContent = 'Light';
    localStorage.setItem('theme', 'dark');
  } else {
    html.setAttribute('data-theme', 'light');
    document.getElementById('toggleIcon').textContent = '\uD83C\uDF19';
    document.getElementById('toggleLabel').textContent = 'Dark';
    localStorage.setItem('theme', 'light');
  }
  if (window._theaterMap && window._theaterTileLayer) {
    window._theaterMap.removeLayer(window._theaterTileLayer);
    var newUrl = isLight
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    window._theaterTileLayer = L.tileLayer(newUrl, {maxZoom: 19, subdomains: 'abcd'}).addTo(window._theaterMap);
  }
}

// Apply saved theme immediately (data-theme only; icons set after layout injection)
(function () {
  if (localStorage.getItem('theme') === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();

function toggleCollapse() {
  var sb = document.getElementById('leftSidebar');
  var btn = document.getElementById('sbCollapseBtn');
  var collapsed = sb.classList.toggle('collapsed');
  document.body.classList.toggle('sb-collapsed', collapsed);
  document.body.classList.toggle('sb-expanded', !collapsed);
  if (btn) btn.innerHTML = collapsed ? '&#9654;' : '&#9668;';
}

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
  var sb = document.getElementById('leftSidebar');
  var ov = document.getElementById('sbOverlay');
  if (sb) sb.classList.remove('open');
  if (ov) ov.classList.remove('open');
  var icon = document.querySelector('#sbToggle .sb-toggle-icon');
  var label = document.querySelector('#sbToggle .sb-toggle-label');
  if (icon) icon.textContent = '\u2630';
  if (label) label.textContent = 'Menu';
}

// Set up scroll tracking and event listeners after layout is injected
document.addEventListener('DOMContentLoaded', function () {
  // Sync theme toggle icons now that layout is in DOM
  if (localStorage.getItem('theme') === 'light') {
    var icon = document.getElementById('toggleIcon');
    var label = document.getElementById('toggleLabel');
    if (icon) icon.textContent = '\uD83C\uDF19';
    if (label) label.textContent = 'Dark';
  }

  // Sidebar active section + scroll progress
  var sectionIds = ['stats', 'last-24h', 'theater', 'air-power', 'naval', 'inside-iran', 'opposition', 'nuclear', 'hormuz', 'military', 'scenarios'];
  var sbLinks = document.querySelectorAll('.sb-link');

  function onScroll() {
    var scrollY = window.scrollY + 60;
    var active = null;
    for (var i = 0; i < sectionIds.length; i++) {
      var el = document.getElementById(sectionIds[i]);
      if (el && el.getBoundingClientRect().top + window.scrollY <= scrollY) {
        active = sectionIds[i];
      }
    }
    if (!active) {
      // Fallback: first section that exists on this page
      for (var j = 0; j < sectionIds.length; j++) {
        if (document.getElementById(sectionIds[j])) { active = sectionIds[j]; break; }
      }
    }
    sbLinks.forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-section') === active);
    });
    var pct = (window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight)) * 100;
    var fill = document.getElementById('sbProgressFill');
    if (fill) fill.style.width = Math.min(100, Math.max(0, pct)) + '%';
  }

  window.addEventListener('scroll', onScroll, {passive: true});
  onScroll();

  // Close sidebar when a link is clicked on mobile
  sbLinks.forEach(function (a) {
    a.addEventListener('click', function () {
      if (window.innerWidth <= 900) closeSidebar();
    });
  });
});
