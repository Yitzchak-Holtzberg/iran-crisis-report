/* ===== THEATER OF OPERATIONS MAP ===== *
 * Marker data lives in data/map-markers.js *
 * This file handles rendering only        */

document.addEventListener('DOMContentLoaded', function () {
  var map = L.map('theater-map', {
    zoomControl: true,
    scrollWheelZoom: false,
    attributionControl: false
  }).setView([28, 48], 4);

  var isLightNow = document.documentElement.getAttribute('data-theme') === 'light';
  var tileUrl = isLightNow
    ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  window._theaterTileLayer = L.tileLayer(tileUrl, { maxZoom: 19, subdomains: 'abcd' }).addTo(map);
  window._theaterMap = map;

  /* ---- Icon factory functions ---- */

  // Generic dot icon (protest / city markers)
  function dotIcon(color, size) {
    return L.divIcon({
      className: '',
      html: '<div style="width:' + size + 'px;height:' + size + 'px;background:' + color + ';border-radius:50%;border:2px solid rgba(255,255,255,0.5);box-shadow:0 0 ' + (size * 2) + 'px ' + color + ',0 0 ' + size + 'px ' + color + ',0 2px 4px rgba(0,0,0,0.55);"></div>',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
  }

  // Carrier (CVN)
  function shipIcon() {
    return L.divIcon({ className: '', html: '<div style="width:34px;height:34px;background:#0d2a50;border:2.5px solid #4a90d9;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:17px;line-height:1;box-shadow:0 0 12px rgba(74,144,217,0.55),0 2px 5px rgba(0,0,0,0.55);">&#9875;</div>', iconSize: [34, 34], iconAnchor: [17, 17] });
  }

  // Destroyer / Cruiser
  function ddgIcon() {
    return L.divIcon({ className: '', html: '<div style="width:22px;height:22px;background:#0d2a50;border:2px solid #4a90d9;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;line-height:1;box-shadow:0 0 8px rgba(74,144,217,0.45),0 1px 3px rgba(0,0,0,0.5);">&#128674;</div>', iconSize: [22, 22], iconAnchor: [11, 11] });
  }

  // Littoral Combat Ship
  function lcsIcon() {
    return L.divIcon({ className: '', html: '<div style="width:18px;height:18px;background:#0a2248;border:1.5px solid #5a95cc;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;line-height:1;box-shadow:0 0 6px rgba(90,149,204,0.4),0 1px 2px rgba(0,0,0,0.5);">&#128674;</div>', iconSize: [18, 18], iconAnchor: [9, 9] });
  }

  // Submarine
  function subIcon() {
    return L.divIcon({ className: '', html: '<div style="width:28px;height:28px;background:#160530;border:2px solid #7a5af0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:JetBrains Mono,monospace;font-size:7.5px;font-weight:700;color:#9a7af0;letter-spacing:-0.5px;box-shadow:0 0 10px rgba(122,90,240,0.5),0 2px 4px rgba(0,0,0,0.5);">SSN</div>', iconSize: [28, 28], iconAnchor: [14, 14] });
  }

  // Air base
  function jetIcon() {
    return L.divIcon({ className: '', html: '<div style="width:28px;height:28px;background:#081c30;border:2px solid #00d4ff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1;box-shadow:0 0 10px rgba(0,212,255,0.5),0 2px 4px rgba(0,0,0,0.5);">&#9992;</div>', iconSize: [28, 28], iconAnchor: [14, 14] });
  }

  // Nuclear facility
  function nukeIcon() {
    return L.divIcon({ className: '', html: '<div style="width:28px;height:28px;background:#1c0800;border:2px solid #ff8c42;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1;box-shadow:0 0 10px rgba(255,140,66,0.5),0 2px 4px rgba(0,0,0,0.5);">&#9762;&#65039;</div>', iconSize: [28, 28], iconAnchor: [14, 14] });
  }

  // Access-denied badge
  function blockedIcon() {
    return L.divIcon({ className: '', html: '<div class="map-badge map-badge-denied"><b>ACCESS DENIED</b></div>', iconSize: [100, 24], iconAnchor: [50, 12] });
  }

  // Spinning-up badge
  function spinupIcon() {
    return L.divIcon({ className: '', html: '<div class="map-badge map-badge-spinup"><b>SPINNING UP</b></div>', iconSize: [90, 24], iconAnchor: [45, 12] });
  }

  /* ---- Render layers from MAP_MARKERS data ---- */
  var m = window.MAP_MARKERS;
  if (!m) {
    console.error('MAP_MARKERS not found — check data/map-markers.js is loaded before map.js');
    return;
  }

  // Iran country highlight
  L.circle(m.iranHighlight.coords, { radius: m.iranHighlight.radius, color: '#ff3b3b', fillColor: '#ff3b3b', fillOpacity: 0.06, weight: 1, dashArray: '6,4' }).addTo(map);

  // Carriers
  m.carriers.forEach(function (d) {
    L.marker(d.coords, { icon: shipIcon() }).addTo(map).bindPopup(d.popup);
  });

  // Strike radii
  m.strikeRadii.forEach(function (d) {
    L.circle(d.coords, { radius: d.radius, color: '#4a90d9', fillColor: '#4a90d9', fillOpacity: 0.04, weight: 0.5, dashArray: '8,6' }).addTo(map).bindPopup(d.popup);
  });

  // Movement routes
  m.routes.forEach(function (r) {
    L.polyline(r.coords, { color: '#4a90d9', weight: 1.5, dashArray: '8,6', opacity: 0.5 }).addTo(map);
  });

  // Destroyers & cruisers
  m.destroyers.forEach(function (d) {
    L.marker(d.coords, { icon: ddgIcon() }).addTo(map).bindPopup(d.popup);
  });

  // LCS
  m.lcs.forEach(function (d) {
    L.marker(d.coords, { icon: lcsIcon() }).addTo(map).bindPopup(d.popup);
  });

  // Submarines
  m.submarines.forEach(function (d) {
    L.marker(d.coords, { icon: subIcon() }).addTo(map).bindPopup(d.popup);
  });

  // Spinning-up assets
  m.spinup.forEach(function (d) {
    L.marker(d.coords, { icon: spinupIcon() }).addTo(map).bindPopup(d.popup);
  });

  // Protest sites
  m.protestSites.forEach(function (d) {
    L.marker(d.coords, { icon: dotIcon('#ff3b3b', d.size) }).addTo(map).bindPopup(d.popup);
  });

  // Nuclear sites
  m.nuclearSites.forEach(function (d) {
    L.marker(d.coords, { icon: nukeIcon() }).addTo(map).bindPopup(d.popup);
  });

  // IRGC / Strait of Hormuz
  m.irgc.forEach(function (d) {
    L.marker(d.coords, { icon: dotIcon('#ff3b3b', d.size) }).addTo(map).bindPopup(d.popup);
  });

  // US & UK air bases
  m.airBases.forEach(function (d) {
    L.marker(d.coords, { icon: jetIcon() }).addTo(map).bindPopup(d.popup);
  });

  // Allied forces (Israel)
  m.allies.forEach(function (d) {
    L.marker(d.coords, { icon: dotIcon(d.color, d.size) }).addTo(map).bindPopup(d.popup);
  });

  // Blocked / denied UK bases
  m.blocked.forEach(function (d) {
    L.marker(d.coords, { icon: blockedIcon() }).addTo(map).bindPopup(d.popup);
  });

  // Attribution
  L.control.attribution({
    position: 'bottomright',
    prefix: '<span style="color:#6a6a7a;">Sources: USNI Fleet Tracker, CSIS, WaPo, Al Jazeera, PBS, MEF | Feb 25, 2026 20:00 UTC</span>'
  }).addTo(map);
});
