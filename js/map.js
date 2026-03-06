document.addEventListener('DOMContentLoaded', function(){
  var mapEl = document.getElementById('theater-map');
  if (!mapEl) return;

  var DARK_STYLE  = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
  var LIGHT_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
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
  window._theaterMap = map;

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

  // ── Category → group color mapping (for popup accent) ──
  var CAT_GROUP_COLOR = {};
  LAYER_GROUPS.forEach(function(g){
    g.cats.forEach(function(cat){ CAT_GROUP_COLOR[cat] = g.color; });
  });

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
      img.onerror = function() { resolve(null); };
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

  // ── Register all icons then load data ──
  function registerIcons() {
    var promises = [];
    Object.keys(ICONS).forEach(function(key) {
      var icon = ICONS[key];
      promises.push(
        createIcon(icon.svg, icon.size).then(function(result) {
          if (result && !map.hasImage('icon-' + key)) {
            map.addImage('icon-' + key, result.data, {sdf: false});
          }
        })
      );
    });
    return Promise.all(promises);
  }

  // ── Category to icon mapping ──
  var CAT_ICON = {};
  Object.keys(ICONS).forEach(function(k){ CAT_ICON[k] = 'icon-' + k; });

  // ── Color map (fallback for categories without icons) ──
  var CAT_COLORS = {
    'us-carrier':'#4a90d9','french-carrier':'#0055a4','us-destroyer':'#4a90d9','us-lcs':'#6ab0ff',
    'us-submarine':'#7a5af0','air-base':'#00d4ff','nuclear-site':'#ff8c42','irgc-target':'#ff3b3b',
    'strike-confirmed':'#ff3b3b','strike-unconfirmed':'#ff8c42','iranian-city':'#ff3b3b',
    'deploying':'#4a90d9','blocked':'#ff3b3b','diplomatic':'#00c853','country-marker':'#aaaaaa',
    'israeli-forces':'#ffd700','saudi-forces':'#00c853','radius-circle':'transparent','spinup':'#ff8c42'
  };

  function loadMapData() {
    Promise.all([
      fetch('data/markers.geojson').then(function(r){return r.json();}),
      fetch('data/corridors.geojson').then(function(r){return r.json();}),
      registerIcons()
    ]).then(function(data){
      var markers = data[0];
      var corridors = data[1];

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

      var layersToRemove = ['clusters','cluster-count','corridors-line','strike-glow','strike-dot'];
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
              'icon-size': 1,
              'icon-allow-overlap': true,
              'icon-ignore-placement': true
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

      // ── Popups (with category-colored accent) ──
      var popup = new maplibregl.Popup({offset:12, maxWidth:'340px', closeButton:true});

      Object.keys(CAT_COLORS).forEach(function(cat){
        if (cat === 'radius-circle') return;
        var layerId = 'cat-' + cat;
        map.on('click', layerId, function(e){
          var f = e.features[0];
          var accentColor = CAT_GROUP_COLOR[f.properties.category] || '#888';
          var content = f.properties.popup || '<b>'+f.properties.label+'</b>';
          var html = '<div style="border-left:3px solid '+accentColor+';padding-left:10px;">'+content+'</div>';
          var coords = f.geometry.coordinates.slice();
          popup.setLngLat(coords).setHTML(html).addTo(map);
        });
        map.on('mouseenter', layerId, function(){ map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layerId, function(){ map.getCanvas().style.cursor = ''; });
      });

      map.on('click', 'corridors-line', function(e){
        var f = e.features[0];
        if (f.properties.popup) {
          var html = '<div style="border-left:3px solid '+(f.properties.color || '#ff5555')+';padding-left:10px;">'+f.properties.popup+'</div>';
          popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
        }
      });
      map.on('mouseenter', 'corridors-line', function(){ map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'corridors-line', function(){ map.getCanvas().style.cursor = ''; });

      // ── Cluster click → flyTo (cinematic zoom) ──
      map.on('click', 'clusters', function(e){
        var features = map.queryRenderedFeatures(e.point, {layers:['clusters']});
        var clusterId = features[0].properties.cluster_id;
        map.getSource('markers').getClusterExpansionZoom(clusterId, function(err, zoom){
          if (err) return;
          map.flyTo({center:features[0].geometry.coordinates, zoom:zoom, speed:0.8, curve:1.4});
        });
      });
      map.on('mouseenter', 'clusters', function(){ map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'clusters', function(){ map.getCanvas().style.cursor = ''; });

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

      // ── Strike dot popups ──
      map.on('click', 'strike-dot', function(e){
        var f = e.features[0];
        var accentColor = CAT_GROUP_COLOR[f.properties.category] || '#ff3b3b';
        var content = f.properties.popup || '<b>'+f.properties.label+'</b>';
        var html = '<div style="border-left:3px solid '+accentColor+';padding-left:10px;">'+content+'</div>';
        popup.setLngLat(f.geometry.coordinates.slice()).setHTML(html).addTo(map);
      });
      map.on('mouseenter', 'strike-dot', function(){ map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'strike-dot', function(){ map.getCanvas().style.cursor = ''; });

      // Track hidden categories and full point set for cluster filtering
      window._allPoints = points;
      window._allStrikePoints = strikePoints;
      window._hiddenCats = {};

      // Start gentle pulse on strike glow
      startStrikePulse();

      buildToggles();
    });
  }

  // ── Gentle breathing pulse on strike glow layer ──
  var pulseRaf;
  function startStrikePulse() {
    if (pulseRaf) cancelAnimationFrame(pulseRaf);
    var start = performance.now();
    function tick() {
      // Smooth sine wave: 4s cycle, subtle pulse scaled by zoom
      var t = Math.sin(((performance.now() - start) % 4000) / 4000 * Math.PI * 2) * 0.5 + 0.5;
      var z = map.getZoom();
      // Base glow radius at current zoom (matches the interpolation in paint)
      var baseR = z < 3 ? 3 : z > 7 ? 8 : 3 + (z - 3) / 4 * 5;
      var baseO = z < 3 ? 0.1 : z > 7 ? 0.25 : 0.1 + (z - 3) / 4 * 0.15;
      if (map.getLayer('strike-glow')) {
        map.setPaintProperty('strike-glow', 'circle-radius', baseR + 2 * t);
        map.setPaintProperty('strike-glow', 'circle-opacity', baseO + 0.1 * t);
      }
      pulseRaf = requestAnimationFrame(tick);
    }
    tick();
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
      });
      container.appendChild(btn);
    });
  }

  window._reloadMapData = loadMapData;
  map.on('load', loadMapData);
});
