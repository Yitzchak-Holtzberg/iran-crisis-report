function setThemeIcons(isLight) {
  var sun = document.getElementById('toggleIconSun');
  var moon = document.getElementById('toggleIconMoon');
  if (sun && moon) {
    sun.style.display = isLight ? 'block' : 'none';
    moon.style.display = isLight ? 'none' : 'block';
  }
}

function toggleTheme() {
  var html = document.documentElement;
  var isLight = html.getAttribute('data-theme') === 'light';
  if (isLight) {
    html.removeAttribute('data-theme');
    try { localStorage.setItem('theme', 'dark'); } catch(e) {}
  } else {
    html.setAttribute('data-theme', 'light');
    try { localStorage.setItem('theme', 'light'); } catch(e) {}
  }
  setThemeIcons(!isLight);
  // Swap MapLibre GL style between dark and light
  if (window._theaterMap) {
    var MAPTILER_KEY = '49tXbjeDRcPMglh4nc1s';
    var newStyle = isLight
      ? 'https://api.maptiler.com/maps/hybrid/style.json?key=' + MAPTILER_KEY
      : 'https://api.maptiler.com/maps/streets/style.json?key=' + MAPTILER_KEY;
    window._theaterMap.setStyle(newStyle);
    window._theaterMap.once('idle', function() {
      if (window._reloadMapData) window._reloadMapData();
    });
  }
}
(function() {
  try {
    var saved = localStorage.getItem('theme');
    if (saved === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      setThemeIcons(true);
    }
  } catch(e) {}
  var btn = document.getElementById('themeToggle');
  if (btn) {
    btn.addEventListener('click', toggleTheme);
    btn.addEventListener('touchend', function(e) {
      e.preventDefault();
      toggleTheme();
    }, {passive: false});
  }
})();
