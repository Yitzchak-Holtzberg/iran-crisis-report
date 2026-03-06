function toggleTheme() {
  var html = document.documentElement;
  var isLight = html.getAttribute('data-theme') === 'light';
  if (isLight) {
    html.removeAttribute('data-theme');
    document.getElementById('toggleIcon').textContent = '☀️';
    document.getElementById('toggleLabel').textContent = 'Light';
    try { localStorage.setItem('theme', 'dark'); } catch(e) {}
  } else {
    html.setAttribute('data-theme', 'light');
    document.getElementById('toggleIcon').textContent = '🌙';
    document.getElementById('toggleLabel').textContent = 'Dark';
    try { localStorage.setItem('theme', 'light'); } catch(e) {}
  }
  // Swap MapLibre GL style between dark and light
  if (window._theaterMap) {
    var newStyle = isLight
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
    window._theaterMap.setStyle(newStyle);
    window._theaterMap.once('styledata', function() {
      if (window._reloadMapData) window._reloadMapData();
    });
  }
}
(function() {
  try {
    var saved = localStorage.getItem('theme');
    if (saved === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      document.getElementById('toggleIcon').textContent = '🌙';
      document.getElementById('toggleLabel').textContent = 'Dark';
    }
  } catch(e) {}
  // Attach touchend listener so the toggle fires immediately on mobile
  // (prevents the 300ms click delay and fixes tap-target issues on iOS Safari)
  var btn = document.getElementById('themeToggle');
  if (btn) btn.addEventListener('touchend', function(e) {
    e.preventDefault();
    toggleTheme();
  }, {passive: false});
})();
