document.addEventListener('DOMContentLoaded', function(){
  var mapEl = document.getElementById('theater-map');
  if (!mapEl) return;

  var MAPTILER_KEY = '49tXbjeDRcPMglh4nc1s';
  var DARK_STYLE  = 'https://api.maptiler.com/maps/hybrid/style.json?key=' + MAPTILER_KEY;
  var LIGHT_STYLE = 'https://api.maptiler.com/maps/streets/style.json?key=' + MAPTILER_KEY;
  var isLight = document.documentElement.getAttribute('data-theme') === 'light';

  var map = new maplibregl.Map({
    container: 'theater-map',
    style: isLight ? LIGHT_STYLE : DARK_STYLE,
    center: [46, 30],
    zoom: 3.5,
    attributionControl: false,
    scrollZoom: false
  });
  map.addControl(new maplibregl.NavigationControl({showCompass:false}), 'top-right');
  map.addControl(new maplibregl.FullscreenControl(), 'top-right');
  map.addControl(new maplibregl.ScaleControl({maxWidth:120, unit:'imperial'}), 'bottom-left');
  window._theaterMap = map;

  // ── 3D Terrain ──
  var terrainEnabled = false;
  var preterrainView = null;
  function enableTerrain() {
    if (terrainEnabled) return;
    try {
      preterrainView = {center: map.getCenter(), zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing()};
      if (!map.getSource('terrain-dem')) {
        map.addSource('terrain-dem', {
          type: 'raster-dem',
          url: 'https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=' + MAPTILER_KEY,
          tileSize: 256
        });
      }
      map.setTerrain({source: 'terrain-dem', exaggeration: 3});
      if (!map.getLayer('hillshade-layer')) {
        map.addLayer({
          id: 'hillshade-layer',
          type: 'hillshade',
          source: 'terrain-dem',
          paint: {
            'hillshade-exaggeration': 0.6,
            'hillshade-shadow-color': '#000000',
            'hillshade-highlight-color': '#ffffff',
            'hillshade-accent-color': '#444444'
          }
        }, map.getLayer('clusters') ? 'clusters' : undefined);
      } else {
        map.setLayoutProperty('hillshade-layer', 'visibility', 'visible');
      }
      var targetZoom = Math.max(map.getZoom(), 5.5);
      map.easeTo({pitch: 55, zoom: targetZoom, duration: 800});
      terrainEnabled = true;
    } catch(e) { /* terrain not supported in this browser */ }
  }
  function disableTerrain() {
    if (!terrainEnabled) return;
    try {
      map.setTerrain(null);
      if (map.getLayer('hillshade-layer')) map.setLayoutProperty('hillshade-layer', 'visibility', 'none');
      var restore = preterrainView || {pitch: 0};
      map.easeTo({pitch: restore.pitch, zoom: restore.zoom, duration: 800});
      terrainEnabled = false;
    } catch(e) {}
  }

  // ── Hover tooltip popup (lightweight, no close button) ──
  var hoverPopup = new maplibregl.Popup({closeButton:false, closeOnClick:false, className:'hover-tooltip', offset:14, maxWidth:'260px'});

  // ── Layer group config ──
  var LAYER_GROUPS = [
    {id:'navy',    label:'US Navy',       color:'#4a90d9', cats:['us-carrier','us-destroyer','us-lcs','us-submarine','french-carrier']},
    {id:'air',     label:'Air Bases',     color:'#00d4ff', cats:['air-base']},
    {id:'iran',    label:'Iranian Sites', color:'#ff8c42', cats:['nuclear-site','irgc-target']},
    {id:'strikes', label:'Strikes',       color:'#ff3b3b', cats:['strike-confirmed','strike-unconfirmed']},
    {id:'protests',label:'Protests',      color:'#e84040', cats:['iranian-city']},
    {id:'lines',   label:'Corridors',     color:'#ff5555', cats:['missile-corridor','strike-corridor','transit-route']},
    {id:'other',   label:'Other',         color:'#aaa',    cats:['deploying','blocked','diplomatic','country-marker','israeli-forces','saudi-forces','radius-circle','spinup']}
  ];

  // ── Default map center/zoom for reset button ──
  var DEFAULT_CENTER = [46, 30];
  var DEFAULT_ZOOM = 3.5;

  // ── Icon SVG templates (rendered to ImageData for MapLibre) ──
  function createIcon(svg, size) {
    return new Promise(function(resolve) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        resolve({data: ctx.getImageData(0, 0, size, size), size: size});
      };
      img.onerror = function() { console.warn('Map: failed to render icon SVG'); resolve(null); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }

  var ICONS = {
    'us-carrier': {size:40, svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#0d2a50" stroke="#4a90d9" stroke-width="2.5"/><path d="M20 8 L20 32 M14 14 L26 14 M12 20 L28 20 M16 26 Q20 30 24 26" fill="none" stroke="#4a90d9" stroke-width="2" stroke-linecap="round"/><text x="20" y="37" text-anchor="middle" font-size="7" font-weight="bold" fill="#7ab5ff" font-family="monospace">CVN</text></svg>'},
    'french-carrier': {size:40, svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#001840" stroke="#0055a4" stroke-width="2.5"/><path d="M20 8 L20 32 M14 14 L26 14 M12 20 L28 20 M16 26 Q20 30 24 26" fill="none" stroke="#0055a4" stroke-width="2" stroke-linecap="round"/><text x="20" y="37" text-anchor="middle" font-size="7" font-weight="bold" fill="#6090d0" font-family="monospace">PA</text></svg>'},
    'us-destroyer': {size:26, svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 26"><circle cx="13" cy="13" r="12" fill="#0d2a50" stroke="#4a90d9" stroke-width="2"/><path d="M7 15 L13 8 L19 15 M13 8 L13 19" fill="none" stroke="#6ab0ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'},
    'us-lcs': {size:20, svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#0a2248" stroke="#5a95cc" stroke-width="1.5"/><path d="M6 12 L10 6 L14 12" fill="none" stroke="#6ab0ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'},
    'us-submarine': {size:32, svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#1a0840" stroke="#7a5af0" stroke-width="2"/><ellipse cx="16" cy="17" rx="10" ry="5" fill="none" stroke="#9a7af0" stroke-width="1.5"/><rect x="14" y="10" width="4" height="7" rx="2" fill="#9a7af0"/><text x="16" y="29" text-anchor="middle" font-size="6" font-weight="bold" fill="#9a7af0" font-family="monospace">SSN</text></svg>'},
    'air-base': {size:30, svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30"><circle cx="15" cy="15" r="14" fill="#081c30" stroke="#00d4ff" stroke-width="2"/><path d="M15 7 L15 23 M9 15 L21 15 M10 11 L15 7 L20 11 M10 19 L15 23 L20 19" fill="none" stroke="#00d4ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'},
    'nuclear-site': {size:30, svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30"><circle cx="15" cy="15" r="14" fill="#2c1000" stroke="#ff8c42" stroke-width="2"/><circle cx="15" cy="15" r="3" fill="#ff8c42"/><path d="M15 5 A10 10 0 0 1 23.66 20 L15 15 Z" fill="#ff8c42" opacity="0.5"/><path d="M23.66 20 A10 10 0 0 1 6.34 20 L15 15 Z" fill="#ff8c42" opacity="0.5"/><path d="M6.34 20 A10 10 0 0 1 15 5 L15 15 Z" fill="#ff8c42" opacity="0.5"/></svg>'},
    'strike-confirmed': {size:18, svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18"><circle cx="9" cy="9" r="8" fill="#3a0000" stroke="#ff3b3b" stroke-width="1.5"/><line x1="9" y1="3" x2="9" y2="15" stroke="#ff3b3b" stroke-width="1.2"/><line x1="3" y1="9" x2="15" y2="9" stroke="#ff3b3b" stroke-width="1.2"/><circle cx="9" cy="9" r="2" fill="#ff3b3b"/></svg>'},
    'strike-unconfirmed': {size:16, svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="none" stroke="#ff8c42" stroke-width="1.5" stroke-dasharray="2.5,1.5"/><text x="8" y="11.5" text-anchor="middle" font-size="10" font-weight="bold" fill="#ff8c42">?</text></svg>'},
    'irgc-target': {size:24, svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#3a0505" stroke="#ff3b3b" stroke-width="1.5"/><path d="M12 4 L14 10 L20 12 L14 14 L12 20 L10 14 L4 12 L10 10 Z" fill="#ff3b3b" opacity="0.7"/></svg>'},
    'iranian-city': {size:18, svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18"><circle cx="9" cy="9" r="7" fill="#ff3b3b" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"/><circle cx="9" cy="9" r="3" fill="rgba(255,255,255,0.4)"/></svg>'},
    'diplomatic': {size:30, svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30"><circle cx="15" cy="15" r="14" fill="#003020" stroke="#00c853" stroke-width="2"/><rect x="10" y="8" width="10" height="14" rx="1" fill="none" stroke="#00c853" stroke-width="1.5"/><line x1="10" y1="12" x2="20" y2="12" stroke="#00c853" stroke-width="1"/><rect x="13" y="16" width="4" height="6" fill="#00c853" opacity="0.5"/></svg>'},
    'deploying': {size:24, svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="none" stroke="#4a90d9" stroke-width="2" stroke-dasharray="4,2"/><path d="M8 12 L16 12 M13 8 L17 12 L13 16" fill="none" stroke="#4a90d9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'},
    'blocked': {size:24, svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="none" stroke="#ff3b3b" stroke-width="2" stroke-dasharray="4,2"/><line x1="6" y1="6" x2="18" y2="18" stroke="#ff3b3b" stroke-width="2"/></svg>'},
    'country-marker': {size:18, svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18"><circle cx="9" cy="9" r="7" fill="#555" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/><circle cx="9" cy="9" r="2.5" fill="rgba(255,255,255,0.3)"/></svg>'},
    'israeli-forces': {size:24, svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#2a2000" stroke="#ffd700" stroke-width="2"/><polygon points="12,4 14,10 20,10 15,14 17,20 12,16 7,20 9,14 4,10 10,10" fill="none" stroke="#ffd700" stroke-width="1.2"/></svg>'},
    'saudi-forces': {size:22, svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22"><circle cx="11" cy="11" r="10" fill="#002a10" stroke="#00c853" stroke-width="2"/><path d="M7 11 L11 7 L15 11 L11 15 Z" fill="#00c853" opacity="0.6" stroke="#00c853" stroke-width="1"/></svg>'},
    'spinup': {size:22, svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22"><circle cx="11" cy="11" r="10" fill="none" stroke="#ff8c42" stroke-width="2" stroke-dasharray="4,2"/><path d="M11 5 L11 11 L15 14" fill="none" stroke="#ff8c42" stroke-width="1.8" stroke-linecap="round"/></svg>'}
  };


  // ── Category to icon mapping ──
  var CAT_ICON = {};
  Object.keys(ICONS).forEach(function(k){ CAT_ICON[k] = 'icon-' + k; });

  // ── Color map (derived from LAYER_GROUPS) ──
  var CAT_COLORS = {};
  LAYER_GROUPS.forEach(function(g){ g.cats.forEach(function(c){ CAT_COLORS[c] = g.color; }); });

  // ── Caches to avoid re-fetching/re-rendering on theme toggle ──
  var _cachedMarkers = null;
  var _cachedCorridors = null;
  var _cachedIconData = null; // {key: {data, size}}

  // Render SVG icons to ImageData once, then just re-register from cache
  function renderIconsOnce() {
    if (_cachedIconData) return Promise.resolve(_cachedIconData);
    var promises = [];
    var keys = Object.keys(ICONS);
    keys.forEach(function(key) {
      var icon = ICONS[key];
      promises.push(createIcon(icon.svg, icon.size).then(function(result) {
        return {key: key, result: result};
      }));
    });
    return Promise.all(promises).then(function(results) {
      _cachedIconData = {};
      results.forEach(function(r) { if (r.result) _cachedIconData[r.key] = r.result; });
      return _cachedIconData;
    });
  }

  function registerIconsFromCache(cache) {
    Object.keys(cache).forEach(function(key) {
      if (map.hasImage('icon-' + key)) map.removeImage('icon-' + key);
      map.addImage('icon-' + key, cache[key].data, {sdf: false});
    });
  }

  var loadGeneration = 0;
  function loadMapData() {
    // Re-read current theme (may have changed since initial load)
    isLight = document.documentElement.getAttribute('data-theme') === 'light';
    var thisGen = ++loadGeneration;

    // Fetch data + render icons only on first load; use cache after
    var dataPromise = (_cachedMarkers && _cachedCorridors)
      ? Promise.resolve([_cachedMarkers, _cachedCorridors])
      : Promise.all([
          fetch('data/markers.geojson').then(function(r){return r.json();}),
          fetch('data/corridors.geojson').then(function(r){return r.json();})
        ]);

    Promise.all([dataPromise, renderIconsOnce()]).then(function(results){
      // Skip if a newer load was triggered while we were fetching
      if (thisGen !== loadGeneration) return;
      var markers = results[0][0];
      var corridors = results[0][1];
      _cachedMarkers = markers;
      _cachedCorridors = corridors;
      registerIconsFromCache(results[1]);

      // Separate radius circles, strikes, and other point markers
      var STRIKE_CATS = ['strike-confirmed', 'strike-unconfirmed'];
      var points = {type:'FeatureCollection', features:[]};
      var strikePoints = {type:'FeatureCollection', features:[]};
      var circles = [];
      markers.features.forEach(function(f){
        var cat = f.properties.category;
        if (cat === 'radius-circle') {
          circles.push(f);
        } else if (STRIKE_CATS.indexOf(cat) !== -1) {
          strikePoints.features.push(f);  // strikes go to dedicated source only
        } else {
          points.features.push(f);        // everything else clusters normally
        }
      });

      var layersToRemove = ['clusters','cluster-count','corridors-line','strike-glow','strike-dot','strike-labels','strike-heatmap'];
      Object.keys(CAT_COLORS).forEach(function(cat){ layersToRemove.push('cat-'+cat); });
      for (var ri = 0; ri < 20; ri++) {
        layersToRemove.push('radius-fill-'+ri, 'radius-fill-'+ri+'-stroke');
      }
      layersToRemove.forEach(function(id){ try { if (map.getLayer(id)) map.removeLayer(id); } catch(e){} });
      ['markers','corridors','strike-dots-src'].forEach(function(id){ try { if (map.getSource(id)) map.removeSource(id); } catch(e){} });
      for (var ri2 = 0; ri2 < 20; ri2++) { try { if (map.getSource('radius-'+ri2)) map.removeSource('radius-'+ri2); } catch(e){} }

      map.addSource('markers', {
        type: 'geojson',
        data: points,
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 7
      });

      map.addSource('corridors', {
        type: 'geojson',
        data: corridors
      });

      // ── Strike dot source (separate, not clustered) ──
      map.addSource('strike-dots-src', {
        type: 'geojson',
        data: strikePoints
      });

      // ── Cluster layers ──
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'markers',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step',['get','point_count'], '#4a90d9', 10,'#ff8c42', 25,'#ff3b3b'],
          'circle-radius': ['step',['get','point_count'], 14, 10, 18, 25, 24],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': 'rgba(255,255,255,0.25)',
          'circle-opacity': 0.7
        }
      });
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'markers',
        filter: ['has', 'point_count'],
        layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 12 },
        paint: { 'text-color': '#ffffff' }
      });

      // ── Individual marker layers (symbol layers with icons) ──
      Object.keys(CAT_COLORS).forEach(function(cat){
        if (cat === 'radius-circle') return;
        var layerId = 'cat-' + cat;
        if (CAT_ICON[cat]) {
          map.addLayer({
            id: layerId,
            type: 'symbol',
            source: 'markers',
            filter: ['all', ['!', ['has', 'point_count']], ['==', ['get','category'], cat]],
            layout: {
              'icon-image': CAT_ICON[cat],
              'icon-size': ['interpolate',['linear'],['zoom'], 3,0.6, 5,0.8, 7,1.0, 9,1.3],
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
              'text-field': ['step',['zoom'], '', 5, ['get','label']],
              'text-size': ['interpolate',['linear'],['zoom'], 5,11, 7,13, 9,14],
              'text-offset': [0, 1.8],
              'text-anchor': 'top',
              'text-allow-overlap': false,
              'text-optional': true,
              'text-font': ['Open Sans Bold','Arial Unicode MS Bold'],
              'text-max-width': 12,
              'text-line-height': 1.2
            },
            paint: {
              'text-color': isLight ? '#1a1a2e' : (CAT_COLORS[cat] || '#ccc'),
              'text-halo-color': isLight ? 'rgba(255,255,255,0.95)' : 'rgba(10,10,15,0.92)',
              'text-halo-width': 2.5
            }
          });
        } else {
          map.addLayer({
            id: layerId,
            type: 'circle',
            source: 'markers',
            filter: ['all', ['!', ['has', 'point_count']], ['==', ['get','category'], cat]],
            paint: {
              'circle-color': CAT_COLORS[cat] || '#888',
              'circle-radius': 6,
              'circle-stroke-width': 2,
              'circle-stroke-color': 'rgba(255,255,255,0.5)',
              'circle-opacity': 0.9
            }
          });
        }
      });

      // ── Corridor lines ──
      map.addLayer({
        id: 'corridors-line',
        type: 'line',
        source: 'corridors',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'weight'],
          'line-opacity': ['get', 'opacity'],
          'line-dasharray': [5, 4]
        }
      });

      // ── Radius circles ──
      circles.forEach(function(c, i){
        var srcId = 'radius-' + i;
        var layerId = 'radius-fill-' + i;
        var center = c.geometry.coordinates;
        var km = c.properties.radiusKm;
        var pts = 64;
        var coords = [];
        for (var a = 0; a <= pts; a++) {
          var angle = (a / pts) * 2 * Math.PI;
          var dx = km / (111.32 * Math.cos(center[1] * Math.PI / 180));
          var dy = km / 110.574;
          coords.push([center[0] + dx * Math.cos(angle), center[1] + dy * Math.sin(angle)]);
        }
        map.addSource(srcId, {
          type: 'geojson',
          data: {type:'Feature', geometry:{type:'Polygon', coordinates:[coords]}, properties:c.properties}
        });
        map.addLayer({
          id: layerId, type: 'fill', source: srcId,
          paint: { 'fill-color': c.properties.fillColor || c.properties.color, 'fill-opacity': c.properties.fillOpacity || 0.05 }
        });
        map.addLayer({
          id: layerId + '-stroke', type: 'line', source: srcId,
          paint: { 'line-color': c.properties.color, 'line-width': c.properties.weight || 1, 'line-dasharray': [4, 3], 'line-opacity': 0.5 }
        });
      });

      wireMapEvents();

      // ── Strike glow + dot (rendered LAST so they sit on top of clusters) ──
      // Sizes scale with zoom: tiny at overview (z3), full at zoomed-in (z7+)
      map.addLayer({
        id: 'strike-glow',
        type: 'circle',
        source: 'strike-dots-src',
        paint: {
          'circle-color': '#ff3b3b',
          'circle-radius': ['interpolate',['linear'],['zoom'], 3, 3, 5, 5, 7, 8],
          'circle-opacity': ['interpolate',['linear'],['zoom'], 3, 0.1, 5, 0.15, 7, 0.25],
          'circle-stroke-width': 0
        }
      });
      map.addLayer({
        id: 'strike-dot',
        type: 'circle',
        source: 'strike-dots-src',
        paint: {
          'circle-color': '#ff3b3b',
          'circle-radius': ['interpolate',['linear'],['zoom'], 3, 1.5, 5, 2.5, 7, 4],
          'circle-opacity': 0.9,
          'circle-stroke-width': ['interpolate',['linear'],['zoom'], 3, 0, 5, 0.5, 7, 1],
          'circle-stroke-color': 'rgba(255,255,255,0.4)'
        }
      });

      // ── Strike labels (separate symbol layer since strikes use circle layers) ──
      map.addLayer({
        id: 'strike-labels',
        type: 'symbol',
        source: 'strike-dots-src',
        layout: {
          'text-field': ['step',['zoom'], '', 5, ['get','label']],
          'text-size': ['interpolate',['linear'],['zoom'], 5,10, 7,12, 9,13],
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-allow-overlap': false,
          'text-optional': true,
          'text-font': ['Open Sans Bold','Arial Unicode MS Bold'],
          'text-max-width': 12,
          'text-line-height': 1.2
        },
        paint: {
          'text-color': isLight ? '#6b1a1a' : '#ff6b6b',
          'text-halo-color': isLight ? 'rgba(255,255,255,0.95)' : 'rgba(10,10,15,0.92)',
          'text-halo-width': 2.5
        }
      });

      // Track hidden categories and full point set for cluster filtering
      window._allPoints = points;
      window._allStrikePoints = strikePoints;
      window._hiddenCats = {};

      // Start gentle pulse on strike glow
      startStrikePulse();
      addHeatmapLayer();

      buildToggles();
      updateStats();
      buildSearchIndex(markers, corridors);
    });
  }

  // ── Map event listeners (wired once, survive setStyle) ──
  var eventsWired = false;
  function wireMapEvents() {
    if (eventsWired) return;
    eventsWired = true;

    var popup = new maplibregl.Popup({offset:12, maxWidth:'340px', closeButton:true});

    // Helper: add click + hover events to a point layer
    function addPointEvents(layerId, getCat) {
      map.on('click', layerId, function(e){
        var f = e.features[0];
        var content = f.properties.popup || '<b>'+f.properties.label+'</b>';
        popup.setLngLat(f.geometry.coordinates.slice()).setHTML(formatPopup(getCat ? getCat(f) : f.properties.category, content)).addTo(map);
      });
      map.on('mouseenter', layerId, function(e){
        map.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features[0]) {
          var f = e.features[0];
          hoverPopup.setLngLat(f.geometry.coordinates.slice()).setHTML('<b>'+f.properties.label+'</b>').addTo(map);
        }
      });
      map.on('mouseleave', layerId, function(){ map.getCanvas().style.cursor = ''; hoverPopup.remove(); });
    }

    // Category marker layers + strike dots
    Object.keys(CAT_COLORS).forEach(function(cat){
      if (cat !== 'radius-circle') addPointEvents('cat-' + cat);
    });
    addPointEvents('strike-dot');

    // Corridor lines
    map.on('click', 'corridors-line', function(e){
      var f = e.features[0];
      if (f.properties.popup) popup.setLngLat(e.lngLat).setHTML(formatPopup('corridor', f.properties.popup)).addTo(map);
    });
    map.on('mouseenter', 'corridors-line', function(e){
      map.getCanvas().style.cursor = 'pointer';
      if (e.features && e.features[0]) hoverPopup.setLngLat(e.lngLat).setHTML('<b>'+(e.features[0].properties.label||'Corridor')+'</b>').addTo(map);
    });
    map.on('mouseleave', 'corridors-line', function(){ map.getCanvas().style.cursor = ''; hoverPopup.remove(); });

    // Cluster click → zoom in
    map.on('click', 'clusters', function(e){
      var features = map.queryRenderedFeatures(e.point, {layers:['clusters']});
      var clusterId = features[0].properties.cluster_id;
      map.getSource('markers').getClusterExpansionZoom(clusterId, function(err, zoom){
        if (err) return;
        map.flyTo({center:features[0].geometry.coordinates, zoom:zoom, speed:0.8, curve:1.4});
      });
    });
    map.on('mouseenter', 'clusters', function(e){
      map.getCanvas().style.cursor = 'pointer';
      var features = map.queryRenderedFeatures(e.point, {layers:['clusters']});
      if (!features.length) return;
      var clusterId = features[0].properties.cluster_id;
      var coords = features[0].geometry.coordinates.slice();
      map.getSource('markers').getClusterLeaves(clusterId, 100, 0, function(err, leaves) {
        if (err || !leaves) return;
        var counts = {};
        leaves.forEach(function(f) {
          var name = CAT_DISPLAY[f.properties.category] || f.properties.category;
          counts[name] = (counts[name] || 0) + 1;
        });
        var lines = Object.keys(counts).map(function(k) { return '<b>' + counts[k] + '</b> ' + k; });
        hoverPopup.setLngLat(coords).setHTML(
          '<div style="font-size:11px;line-height:1.5;"><b style="color:var(--text-primary);">' +
          features[0].properties.point_count + ' markers</b><br>' + lines.join('<br>') + '</div>'
        ).addTo(map);
      });
    });
    map.on('mouseleave', 'clusters', function(){ map.getCanvas().style.cursor = ''; hoverPopup.remove(); });
  }

  // ── Gentle breathing pulse on strike glow layer (throttled) ──
  var pulseRaf;
  function startStrikePulse() {
    if (pulseRaf) cancelAnimationFrame(pulseRaf);
    var start = performance.now();
    var lastUpdate = 0;
    function tick(now) {
      pulseRaf = requestAnimationFrame(tick);
      // Throttle to ~20fps (50ms) — no visual difference, big perf gain
      if (now - lastUpdate < 50) return;
      lastUpdate = now;
      var t = Math.sin(((now - start) % 4000) / 4000 * Math.PI * 2) * 0.5 + 0.5;
      var z = map.getZoom();
      var baseR = z < 3 ? 3 : z > 7 ? 8 : 3 + (z - 3) / 4 * 5;
      var baseO = z < 3 ? 0.1 : z > 7 ? 0.25 : 0.1 + (z - 3) / 4 * 0.15;
      if (map.getLayer('strike-glow')) {
        map.setPaintProperty('strike-glow', 'circle-radius', baseR + 2 * t);
        map.setPaintProperty('strike-glow', 'circle-opacity', baseO + 0.1 * t);
      }
    }
    pulseRaf = requestAnimationFrame(tick);
  }

  // ── Category display names for stats + popups ──
  var CAT_DISPLAY = {
    'us-carrier':'Carriers','french-carrier':'Carriers','us-destroyer':'Destroyers',
    'us-lcs':'LCS','us-submarine':'Submarines','air-base':'Air Bases',
    'nuclear-site':'Nuclear Sites','irgc-target':'IRGC Targets',
    'strike-confirmed':'Confirmed Strikes','strike-unconfirmed':'Unconfirmed Strikes',
    'iranian-city':'Protests','deploying':'Deploying','blocked':'Blocked',
    'diplomatic':'Diplomatic','country-marker':'Locations',
    'israeli-forces':'Israeli Forces','saudi-forces':'Saudi Forces','spinup':'Spinup'
  };

  // ── Stats bar: live counts per layer group ──
  function updateStats() {
    var el = document.getElementById('mapStats');
    if (!el) return;
    var hidden = window._hiddenCats || {};
    var html = '';
    LAYER_GROUPS.forEach(function(group) {
      if (group.id === 'lines' || group.id === 'other') return;
      var count = 0;
      var allFeatures = (window._allPoints ? window._allPoints.features : [])
        .concat(window._allStrikePoints ? window._allStrikePoints.features : []);
      allFeatures.forEach(function(f) {
        if (group.cats.indexOf(f.properties.category) !== -1 && !hidden[f.properties.category]) count++;
      });
      var dimClass = count === 0 ? ' map-stat-dim' : '';
      html += '<span class="map-stat-badge'+dimClass+'" style="--stat-color:'+group.color+'">'+count+' '+group.label+'</span>';
    });
    el.innerHTML = html;
  }

  function updateClusterFilter() {
    var src = map.getSource('markers');
    if (!src || !window._allPoints) return;
    var hidden = window._hiddenCats;
    var filtered = {
      type: 'FeatureCollection',
      features: window._allPoints.features.filter(function(f) {
        return !hidden[f.properties.category];
      })
    };
    src.setData(filtered);

    // Also update strike dots (separate source)
    var dotsSrc = map.getSource('strike-dots-src');
    if (dotsSrc) {
      dotsSrc.setData({
        type: 'FeatureCollection',
        features: window._allStrikePoints.features.filter(function(f) {
          return !hidden[f.properties.category];
        })
      });
    }
  }

  function buildToggles() {
    var container = document.getElementById('layerToggles');
    if (!container) return;
    container.innerHTML = '';

    // ── Reset View button ──
    var resetBtn = document.createElement('button');
    resetBtn.className = 'layer-toggle-btn';
    resetBtn.innerHTML = '&#8634; Reset View';
    resetBtn.style.setProperty('--toggle-color', '#666');
    resetBtn.style.borderStyle = 'dashed';
    resetBtn.addEventListener('click', function(){
      map.flyTo({center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, speed: 0.8, curve: 1.2});
    });
    container.appendChild(resetBtn);

    // ── Heatmap toggle button ──
    var heatBtn = document.createElement('button');
    heatBtn.className = 'layer-toggle-btn';
    heatBtn.textContent = 'Heatmap';
    heatBtn.title = 'Toggle strike density heatmap';
    heatBtn.style.setProperty('--toggle-color', '#ff3b3b');
    heatBtn.style.borderStyle = 'dashed';
    heatBtn.addEventListener('click', function(){ toggleHeatmap(heatBtn); });
    container.appendChild(heatBtn);

    // ── Measure distance button ──
    var measureBtn = document.createElement('button');
    measureBtn.className = 'layer-toggle-btn';
    measureBtn.textContent = 'Measure';
    measureBtn.title = 'Click two points to measure distance';
    measureBtn.style.setProperty('--toggle-color', '#00d4ff');
    measureBtn.style.borderStyle = 'dashed';
    measureBtn.addEventListener('click', function(){ toggleMeasure(measureBtn); });
    container.appendChild(measureBtn);

    // ── 3D Terrain toggle button ──
    var terrainBtn = document.createElement('button');
    terrainBtn.className = 'layer-toggle-btn';
    terrainBtn.textContent = '3D Terrain';
    terrainBtn.title = 'Toggle 3D terrain elevation';
    terrainBtn.style.setProperty('--toggle-color', '#8b6914');
    terrainBtn.style.borderStyle = 'dashed';
    terrainBtn.addEventListener('click', function(){
      if (terrainEnabled) { disableTerrain(); terrainBtn.classList.remove('active'); }
      else { enableTerrain(); terrainBtn.classList.add('active'); }
    });
    container.appendChild(terrainBtn);

    LAYER_GROUPS.forEach(function(group){
      var btn = document.createElement('button');
      btn.className = 'layer-toggle-btn active';
      btn.textContent = group.label;
      btn.style.setProperty('--toggle-color', group.color);
      btn.addEventListener('click', function(){
        var active = btn.classList.toggle('active');
        group.cats.forEach(function(cat){
          var layerId = 'cat-' + cat;
          if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', active ? 'visible' : 'none');
          if (map.getLayer('corridors-line') && (cat === 'missile-corridor' || cat === 'strike-corridor' || cat === 'transit-route'))
            map.setLayoutProperty('corridors-line', 'visibility', active ? 'visible' : 'none');
          if (active) { delete window._hiddenCats[cat]; } else { window._hiddenCats[cat] = true; }
        });
        updateClusterFilter();
        updateStats();
      });
      container.appendChild(btn);
    });

    // ── Preset view bookmarks ──
    // Remove existing preset/legend elements to prevent duplicates on reload
    var existingPresets = container.parentNode.querySelector('.map-presets');
    if (existingPresets) existingPresets.remove();
    var existingLegendBtn = container.parentNode.querySelector('.legend-toggle-btn');
    if (existingLegendBtn) existingLegendBtn.remove();

    var PRESETS = [
      {label:'Persian Gulf',    center:[51.5, 26.5], zoom:5.5},
      {label:'Strait of Hormuz',center:[56.3, 26.5], zoom:7},
      {label:'E. Mediterranean', center:[33.5, 34],   zoom:5.5},
      {label:'Iran Interior',   center:[53, 33],     zoom:5},
      {label:'Red Sea',         center:[40, 20],     zoom:4.5}
    ];
    var presetWrap = document.createElement('div');
    presetWrap.className = 'map-presets';
    presetWrap.innerHTML = '<span class="map-presets-label">Jump to:</span>';
    PRESETS.forEach(function(p) {
      var a = document.createElement('button');
      a.className = 'map-preset-btn';
      a.textContent = p.label;
      a.addEventListener('click', function() {
        map.flyTo({center:p.center, zoom:p.zoom, speed:0.8, curve:1.2});
      });
      presetWrap.appendChild(a);
    });
    container.parentNode.insertBefore(presetWrap, container.nextSibling);

    // ── Collapsible legend on mobile ──
    var legend = document.getElementById('mapLegend');
    if (legend) {
      var legendToggle = document.createElement('button');
      legendToggle.className = 'legend-toggle-btn';
      legendToggle.innerHTML = 'Legend <span class="legend-arrow">&#9660;</span>';
      legendToggle.addEventListener('click', function() {
        legend.classList.toggle('legend-collapsed');
        legendToggle.querySelector('.legend-arrow').innerHTML = legend.classList.contains('legend-collapsed') ? '&#9654;' : '&#9660;';
      });
      legend.parentNode.insertBefore(legendToggle, legend);
      // Start collapsed on mobile
      if (window.innerWidth <= 768) {
        legend.classList.add('legend-collapsed');
        legendToggle.querySelector('.legend-arrow').innerHTML = '&#9654;';
      }
    }
  }

  // ── Search / Locate ──
  var searchIndex = [];
  function buildSearchIndex(markers, corridors) {
    searchIndex = [];
    markers.features.forEach(function(f) {
      if (f.properties.label && f.properties.category !== 'radius-circle') {
        searchIndex.push({label:f.properties.label, category:f.properties.category, coords:f.geometry.coordinates, popup:f.properties.popup});
      }
    });
    corridors.features.forEach(function(f) {
      if (f.properties.label) {
        var mid = f.geometry.coordinates[Math.floor(f.geometry.coordinates.length/2)];
        searchIndex.push({label:f.properties.label, category:'corridor', coords:mid, popup:f.properties.popup});
      }
    });
    wireSearch();
  }

  var searchWired = false;
  function wireSearch() {
    var input = document.getElementById('mapSearch');
    var results = document.getElementById('mapSearchResults');
    if (!input || !results || searchWired) return;
    searchWired = true;

    input.addEventListener('input', function() {
      var q = input.value.trim().toLowerCase();
      if (q.length < 2) { results.innerHTML = ''; results.style.display = 'none'; return; }
      var matches = searchIndex.filter(function(item) {
        return item.label.toLowerCase().indexOf(q) !== -1;
      }).slice(0, 8);
      if (matches.length === 0) { results.innerHTML = '<div class="map-search-item map-search-empty">No results</div>'; results.style.display = 'block'; return; }
      results.innerHTML = matches.map(function(m, i) {
        var dotColor = CAT_COLORS[m.category] || CAT_COLORS[m.category] || '#888';
        return '<div class="map-search-item" data-idx="'+i+'"><span class="dot" style="background:'+dotColor+'"></span>'+escapeHtml(m.label)+'</div>';
      }).join('');
      results.style.display = 'block';
      // Click handlers for results
      var items = results.querySelectorAll('.map-search-item[data-idx]');
      items.forEach(function(el) {
        el.addEventListener('click', function() {
          var idx = parseInt(el.getAttribute('data-idx'));
          var match = matches[idx];
          results.style.display = 'none';
          input.value = '';
          map.flyTo({center:match.coords, zoom:7, speed:0.8, curve:1.2});
          // Open popup after fly completes
          map.once('moveend', function() {
            var content = match.popup || '<b>'+match.label+'</b>';
            var popupHtml = formatPopup(match.category, content);
            new maplibregl.Popup({offset:12, maxWidth:'340px'}).setLngLat(match.coords).setHTML(popupHtml).addTo(map);
          });
        });
      });
    });

    // Close results on click outside
    document.addEventListener('click', function(e) {
      if (!input.contains(e.target) && !results.contains(e.target)) {
        results.style.display = 'none';
      }
    });

    // Close on Escape
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { results.style.display = 'none'; input.blur(); }
    });
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Better popup content: wrap with category badge ──
  function formatPopup(category, content) {
    var accentColor = CAT_COLORS[category] || CAT_COLORS[category] || '#888';
    var displayName = CAT_DISPLAY[category] || category || '';
    var badge = displayName ? '<span class="map-popup-badge" style="background:'+accentColor+'">'+escapeHtml(displayName)+'</span>' : '';
    return '<div class="map-popup-card">' + badge + '<div style="border-left:3px solid '+accentColor+';padding-left:10px;">'+content+'</div></div>';
  }

  // ── Heatmap toggle ──
  var heatmapActive = false;
  function addHeatmapLayer() {
    if (map.getLayer('strike-heatmap')) return;
    map.addLayer({
      id: 'strike-heatmap',
      type: 'heatmap',
      source: 'strike-dots-src',
      paint: {
        'heatmap-weight': 1,
        'heatmap-intensity': ['interpolate',['linear'],['zoom'], 3,0.5, 7,2],
        'heatmap-color': [
          'interpolate',['linear'],['heatmap-density'],
          0,'rgba(0,0,0,0)',
          0.2,'rgba(255,140,66,0.3)',
          0.4,'rgba(255,100,50,0.5)',
          0.6,'rgba(255,59,59,0.6)',
          0.8,'rgba(255,30,30,0.8)',
          1,'rgba(255,20,20,1)'
        ],
        'heatmap-radius': ['interpolate',['linear'],['zoom'], 3,15, 5,25, 7,40],
        'heatmap-opacity': 0.7
      },
      layout: { 'visibility': 'none' }
    }, 'strike-glow'); // insert below strike glow
  }

  function toggleHeatmap(btn) {
    heatmapActive = !heatmapActive;
    btn.classList.toggle('active', heatmapActive);
    map.setLayoutProperty('strike-heatmap', 'visibility', heatmapActive ? 'visible' : 'none');
    map.setLayoutProperty('strike-glow', 'visibility', heatmapActive ? 'none' : 'visible');
    map.setLayoutProperty('strike-dot', 'visibility', heatmapActive ? 'none' : 'visible');
    if (map.getLayer('strike-labels')) {
      map.setLayoutProperty('strike-labels', 'visibility', heatmapActive ? 'none' : 'visible');
    }
  }

  // ── Distance Measurement Tool ──
  var measureActive = false;
  var measurePoints = [];
  var measureMarkers = [];
  var measurePopup = null;

  function haversine(a, b) {
    var R = 6371;
    var dLat = (b[1] - a[1]) * Math.PI / 180;
    var dLon = (b[0] - a[0]) * Math.PI / 180;
    var lat1 = a[1] * Math.PI / 180;
    var lat2 = b[1] * Math.PI / 180;
    var x = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
  }

  function clearMeasure() {
    measurePoints = [];
    measureMarkers.forEach(function(m) { m.remove(); });
    measureMarkers = [];
    if (measurePopup) { measurePopup.remove(); measurePopup = null; }
    if (map.getLayer('measure-line')) map.removeLayer('measure-line');
    if (map.getSource('measure-line')) map.removeSource('measure-line');
  }

  function onMeasureClick(e) {
    if (!measureActive) return;
    var coord = [e.lngLat.lng, e.lngLat.lat];
    measurePoints.push(coord);

    var el = document.createElement('div');
    el.style.cssText = 'width:12px;height:12px;border-radius:50%;background:#00d4ff;border:2px solid #fff;cursor:crosshair;';
    var marker = new maplibregl.Marker({element: el}).setLngLat(coord).addTo(map);
    measureMarkers.push(marker);

    if (measurePoints.length === 2) {
      var km = haversine(measurePoints[0], measurePoints[1]);
      var mi = km * 0.621371;
      var nm = km * 0.539957;
      var label = Math.round(km) + ' km / ' + Math.round(mi) + ' mi / ' + Math.round(nm) + ' nm';

      // Draw line
      if (map.getLayer('measure-line')) map.removeLayer('measure-line');
      if (map.getSource('measure-line')) map.removeSource('measure-line');
      map.addSource('measure-line', {
        type: 'geojson',
        data: {type:'Feature', geometry:{type:'LineString', coordinates: measurePoints}}
      });
      map.addLayer({
        id: 'measure-line', type: 'line', source: 'measure-line',
        paint: {'line-color':'#00d4ff', 'line-width': 2, 'line-dasharray': [4, 3]}
      });

      // Show label at midpoint
      var mid = [(measurePoints[0][0]+measurePoints[1][0])/2, (measurePoints[0][1]+measurePoints[1][1])/2];
      measurePopup = new maplibregl.Popup({closeButton:true, closeOnClick:false, className:'measure-popup', offset:0})
        .setLngLat(mid)
        .setHTML('<div style="font-size:13px;font-weight:bold;color:#00d4ff;text-shadow:0 1px 3px rgba(0,0,0,0.8);">' + label + '</div>')
        .addTo(map);
      measurePopup.on('close', function() { clearMeasure(); });

      // Reset for next measurement
      measurePoints = [];
      measureMarkers.forEach(function(m) { m.remove(); });
      measureMarkers = [];
    }
  }

  function toggleMeasure(btn) {
    measureActive = !measureActive;
    btn.classList.toggle('active', measureActive);
    map.getCanvas().style.cursor = measureActive ? 'crosshair' : '';
    if (!measureActive) clearMeasure();
    if (measureActive) {
      map.on('click', onMeasureClick);
    } else {
      map.off('click', onMeasureClick);
    }
  }

  window._toggleMeasure = toggleMeasure;

  window._reloadMapData = loadMapData;
  map.once('load', loadMapData);
});
