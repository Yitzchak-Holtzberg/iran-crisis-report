function toggleTheme() {
  var html = document.documentElement;
  var isLight = html.getAttribute('data-theme') === 'light';
  if (isLight) {
    html.removeAttribute('data-theme');
    document.getElementById('toggleIcon').textContent = '☀️';
    document.getElementById('toggleLabel').textContent = 'Light';
    localStorage.setItem('theme', 'dark');
  } else {
    html.setAttribute('data-theme', 'light');
    document.getElementById('toggleIcon').textContent = '🌙';
    document.getElementById('toggleLabel').textContent = 'Dark';
    localStorage.setItem('theme', 'light');
  }
  // Swap map tile layer between dark and light CartoDB styles
  if (window._theaterMap && window._theaterTileLayer) {
    window._theaterMap.removeLayer(window._theaterTileLayer);
    var newUrl = isLight
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    window._theaterTileLayer = L.tileLayer(newUrl,{maxZoom:19,subdomains:'abcd'}).addTo(window._theaterMap);
  }
}
(function() {
  var saved = localStorage.getItem('theme');
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    document.getElementById('toggleIcon').textContent = '🌙';
    document.getElementById('toggleLabel').textContent = 'Dark';
  }
})();
