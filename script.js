document.addEventListener('DOMContentLoaded', function(){
  var map = L.map('theater-map',{zoomControl:true,scrollWheelZoom:false,attributionControl:false}).setView([28,48],4);
  var isLightNow = document.documentElement.getAttribute('data-theme')==='light';
  var tileUrl = isLightNow
    ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  window._theaterTileLayer = L.tileLayer(tileUrl,{maxZoom:19,subdomains:'abcd'}).addTo(map);
  window._theaterMap = map;

  // Dot icon for protest/city markers — drop-shadow added for visibility on light tiles
  function icon(color,size){return L.divIcon({className:'',html:'<div style="width:'+size+'px;height:'+size+'px;background:'+color+';border-radius:50%;border:2px solid rgba(255,255,255,0.5);box-shadow:0 0 '+(size*2)+'px '+color+',0 0 '+(size)+'px '+color+',0 2px 4px rgba(0,0,0,0.55);"></div>',iconSize:[size,size],iconAnchor:[size/2,size/2]});}
  // Carrier (CVN) — anchor in solid circle
  function shipIcon(){return L.divIcon({className:'',html:'<div style="width:34px;height:34px;background:#0d2a50;border:2.5px solid #4a90d9;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:17px;line-height:1;box-shadow:0 0 12px rgba(74,144,217,0.55),0 2px 5px rgba(0,0,0,0.55);">&#9875;</div>',iconSize:[34,34],iconAnchor:[17,17]});}
  // Destroyer / Cruiser — ship in solid circle
  function ddgIcon(){return L.divIcon({className:'',html:'<div style="width:22px;height:22px;background:#0d2a50;border:2px solid #4a90d9;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;line-height:1;box-shadow:0 0 8px rgba(74,144,217,0.45),0 1px 3px rgba(0,0,0,0.5);">&#128674;</div>',iconSize:[22,22],iconAnchor:[11,11]});}
  // LCS — smaller ship circle
  function lcsIcon(){return L.divIcon({className:'',html:'<div style="width:18px;height:18px;background:#0a2248;border:1.5px solid #5a95cc;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;line-height:1;box-shadow:0 0 6px rgba(90,149,204,0.4),0 1px 2px rgba(0,0,0,0.5);">&#128674;</div>',iconSize:[18,18],iconAnchor:[9,9]});}
  // Submarine — SSN badge (no whale emoji)
  function subIcon(){return L.divIcon({className:'',html:'<div style="width:28px;height:28px;background:#160530;border:2px solid #7a5af0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:JetBrains Mono,monospace;font-size:7.5px;font-weight:700;color:#9a7af0;letter-spacing:-0.5px;box-shadow:0 0 10px rgba(122,90,240,0.5),0 2px 4px rgba(0,0,0,0.5);">SSN</div>',iconSize:[28,28],iconAnchor:[14,14]});}
  // Air base — plane in solid circle
  function jetIcon(){return L.divIcon({className:'',html:'<div style="width:28px;height:28px;background:#081c30;border:2px solid #00d4ff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1;box-shadow:0 0 10px rgba(0,212,255,0.5),0 2px 4px rgba(0,0,0,0.5);">&#9992;</div>',iconSize:[28,28],iconAnchor:[14,14]});}
  // Nuclear facility — radioactive in solid circle
  function nukeIcon(){return L.divIcon({className:'',html:'<div style="width:28px;height:28px;background:#1c0800;border:2px solid #ff8c42;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1;box-shadow:0 0 10px rgba(255,140,66,0.5),0 2px 4px rgba(0,0,0,0.5);">&#9762;&#65039;</div>',iconSize:[28,28],iconAnchor:[14,14]});}
  // Blocked / Denied — CSS-class badge (theme-aware via stylesheet)
  function blockedIcon(){return L.divIcon({className:'',html:'<div class="map-badge map-badge-denied"><b>ACCESS DENIED</b></div>',iconSize:[100,24],iconAnchor:[50,12]});}
  function spinupIcon(){return L.divIcon({className:'',html:'<div class="map-badge map-badge-spinup"><b>SPINNING UP</b></div>',iconSize:[90,24],iconAnchor:[45,12]});}

  // Iran - red highlight
  L.circle([32.5,53],{radius:700000,color:'#ff3b3b',fillColor:'#ff3b3b',fillOpacity:0.06,weight:1,dashArray:'6,4'}).addTo(map);

  // ===== ABRAHAM LINCOLN CARRIER STRIKE GROUP (Arabian Sea) =====
  L.marker([23.5,58],{icon:shipIcon()}).addTo(map).bindPopup('<b style="color:#4a90d9">USS Abraham Lincoln (CVN-72)</b><br>Nimitz-class carrier &bull; CVW-9<br>~80 aircraft &bull; 5,600 crew<br><b style="color:#ff3b3b">700km from Iranian coast</b><br>F/A-18E/F, EA-18G, E-2D, MH-60');
  L.circle([23.5,58],{radius:700000,color:'#4a90d9',fillColor:'#4a90d9',fillOpacity:0.04,weight:0.5,dashArray:'8,6'}).addTo(map).bindPopup('CVW-9 strike radius (~700km)');
  // Lincoln escorts
  L.marker([24.1,57.5],{icon:ddgIcon()}).addTo(map).bindPopup('<b style="color:#4a90d9">USS Frank E. Petersen Jr. (DDG-121)</b><br>Arleigh Burke-class destroyer<br>Lincoln CSG escort &bull; DESRON 21<br>Tomahawk &bull; Aegis BMD');
  L.marker([23.0,59.0],{icon:ddgIcon()}).addTo(map).bindPopup('<b style="color:#4a90d9">USS Spruance (DDG-111)</b><br>Arleigh Burke-class destroyer<br>Lincoln CSG escort<br>Tomahawk &bull; Aegis BMD');
  L.marker([22.8,57.2],{icon:ddgIcon()}).addTo(map).bindPopup('<b style="color:#4a90d9">USS Mobile Bay (CG-53)</b><br>Ticonderoga-class cruiser<br>Lincoln CSG escort<br>SM-3 &bull; SM-6 &bull; Tomahawk &bull; Aegis BMD');

  // ===== GERALD R. FORD CARRIER STRIKE GROUP (Eastern Mediterranean) =====
  L.marker([35.2,24.5],{icon:shipIcon()}).addTo(map).bindPopup('<b style="color:#4a90d9">USS Gerald R. Ford (CVN-78)</b><br>Ford-class &bull; World\'s largest warship<br>CVW-8 &bull; ~75 aircraft &bull; 4,500 crew<br><b style="color:#ff8c42">Souda Bay, Crete (docked Feb 24)</b><br>Transited Strait of Gibraltar Feb 20<br>F-35C, F/A-18E/F, E-2D, CMV-22B');
  L.circle([35.2,24.5],{radius:900000,color:'#4a90d9',fillColor:'#4a90d9',fillOpacity:0.03,weight:0.5,dashArray:'8,6'}).addTo(map).bindPopup('CVW-8 strike radius (~900km with F-35C)');
  // Ford movement arrow (Med → Suez → Gulf)
  L.polyline([[35.2,24.5],[34,28],[33,30],[31.5,32.3]],{color:'#4a90d9',weight:1.5,dashArray:'8,6',opacity:0.5}).addTo(map);
  // Ford escorts
  L.marker([35.5,25.5],{icon:ddgIcon()}).addTo(map).bindPopup('<b style="color:#4a90d9">USS Winston S. Churchill (DDG-81)</b><br>Arleigh Burke-class destroyer<br>Ford CSG escort<br>Tomahawk &bull; Aegis BMD');
  L.marker([34.8,23.8],{icon:ddgIcon()}).addTo(map).bindPopup('<b style="color:#4a90d9">USS Bainbridge (DDG-96)</b><br>Arleigh Burke-class destroyer<br>Ford CSG escort<br>Tomahawk &bull; Aegis BMD');
  L.marker([35.8,23.5],{icon:ddgIcon()}).addTo(map).bindPopup('<b style="color:#4a90d9">USS Mahan (DDG-72)</b><br>Arleigh Burke-class destroyer<br>Ford CSG escort<br>Tomahawk &bull; Aegis BMD');

  // ===== INDEPENDENT DESTROYERS (Arabian Sea / Strait of Hormuz) =====
  L.marker([26.2,56.8],{icon:ddgIcon()}).addTo(map).bindPopup('<b style="color:#4a90d9">USS McFaul (DDG-74)</b><br>Arleigh Burke-class destroyer<br>Strait of Hormuz patrol<br>Tomahawk &bull; Aegis BMD');
  L.marker([25.8,57.5],{icon:ddgIcon()}).addTo(map).bindPopup('<b style="color:#4a90d9">USS Mitscher (DDG-57)</b><br>Arleigh Burke-class destroyer<br>Strait of Hormuz patrol<br>Tomahawk &bull; Aegis BMD');
  L.marker([22.0,60.5],{icon:ddgIcon()}).addTo(map).bindPopup('<b style="color:#4a90d9">USS Pinckney (DDG-91)</b><br>Arleigh Burke-class destroyer<br>North Arabian Sea<br>Tomahawk &bull; Aegis BMD');
  L.marker([21.5,62.0],{icon:ddgIcon()}).addTo(map).bindPopup('<b style="color:#4a90d9">USS John Finn (DDG-113)</b><br>Arleigh Burke-class destroyer<br>Arabian Sea<br>Tomahawk &bull; Aegis BMD');

  // ===== MEDITERRANEAN DESTROYERS =====
  L.marker([34.2,26.5],{icon:ddgIcon()}).addTo(map).bindPopup('<b style="color:#4a90d9">USS Roosevelt (DDG-80)</b><br>Arleigh Burke-class destroyer<br>Eastern Mediterranean<br>Tomahawk &bull; Aegis BMD');
  L.marker([33.8,28.0],{icon:ddgIcon()}).addTo(map).bindPopup('<b style="color:#4a90d9">USS Bulkeley (DDG-84)</b><br>Arleigh Burke-class destroyer<br>Eastern Mediterranean<br>Tomahawk &bull; Aegis BMD');

  // ===== RED SEA DESTROYER =====
  L.marker([18.5,39.5],{icon:ddgIcon()}).addTo(map).bindPopup('<b style="color:#4a90d9">USS Delbert D. Black (DDG-119)</b><br>Arleigh Burke-class destroyer<br>Red Sea patrol<br>Tomahawk &bull; Aegis BMD');

  // ===== LITTORAL COMBAT SHIPS (Persian Gulf) =====
  L.marker([26.8,51.5],{icon:lcsIcon()}).addTo(map).bindPopup('<b style="color:#6ab0ff">USS Canberra (LCS-30)</b><br>Independence-class LCS<br>Persian Gulf patrol<br>Mine countermeasures &bull; ASW');
  L.marker([26.2,50.8],{icon:lcsIcon()}).addTo(map).bindPopup('<b style="color:#6ab0ff">USS Tulsa (LCS-16)</b><br>Independence-class LCS<br>Persian Gulf &bull; Homeported Bahrain<br>Mine countermeasures &bull; ASW');
  L.marker([27.2,52.2],{icon:lcsIcon()}).addTo(map).bindPopup('<b style="color:#6ab0ff">USS Santa Barbara (LCS-32)</b><br>Independence-class LCS<br>Persian Gulf patrol<br>Mine countermeasures &bull; ASW');

  // ===== SUBMARINE (location approximate/undisclosed) =====
  L.marker([21.0,59.0],{icon:subIcon()}).addTo(map).bindPopup('<b style="color:#7a5af0">USS Georgia (SSGN-729)</b><br>Ohio-class guided-missile submarine<br>154 Tomahawk cruise missiles<br><b>Location undisclosed — approximate</b><br>+ unknown number of fast-attack subs');

  // ===== USS GEORGE H.W. BUSH (spinning up at Norfolk) =====
  L.marker([36.9,-76.3],{icon:spinupIcon()}).addTo(map).bindPopup('<b style="color:#ff8c42">USS George H.W. Bush (CVN-77)</b><br>Nimitz-class carrier<br><b>Preparing for possible deployment</b><br>Completing drills off Virginia coast<br>Could reach theater in ~1 week');

  // ===== IRANIAN CITIES — PROTEST SITES =====
  L.marker([35.7,51.4],{icon:icon('#ff3b3b',14)}).addTo(map).bindPopup('<b style="color:#ff3b3b">Tehran</b><br>Student protests Day 5<br>University of Tehran, Sharif, Amirkabir, Shahid Beheshti<br>Chanting: "Death to the dictator"<br>"Woman, life, freedom"');
  L.marker([32.65,51.68],{icon:icon('#ff3b3b',10)}).addTo(map).bindPopup('<b style="color:#ff3b3b">Isfahan</b><br>Protests active &bull; Day 5<br>Nuclear facility tunnel sealing underway');
  L.marker([36.3,59.6],{icon:icon('#ff3b3b',10)}).addTo(map).bindPopup('<b style="color:#ff3b3b">Mashhad</b><br>Student protests active &bull; Day 5');
  L.marker([29.6,52.5],{icon:icon('#ff3b3b',8)}).addTo(map).bindPopup('<b style="color:#ff3b3b">Shiraz</b><br>Protests reported');
  L.marker([32.3,48.7],{icon:icon('#ff3b3b',8)}).addTo(map).bindPopup('<b style="color:#ff3b3b">Ahvaz (Khuzestan)</b><br>Arab minority protests<br>Heavy military suppression');
  L.marker([35.3,46.9],{icon:icon('#ff3b3b',8)}).addTo(map).bindPopup('<b style="color:#ff3b3b">Sanandaj (Kurdistan)</b><br>Kurdish protests<br>2,000+ detained &bull; Reports of torture');

  // ===== NUCLEAR SITES =====
  L.marker([33.72,51.73],{icon:nukeIcon()}).addTo(map).bindPopup('<b style="color:#ff8c42">Natanz Nuclear Facility</b><br>Uranium enrichment<br>Underground centrifuge halls');
  L.marker([32.6,51.7],{icon:nukeIcon()}).addTo(map).bindPopup('<b style="color:#ff8c42">Isfahan Nuclear Complex</b><br>Tunnel sealing operations in progress<br>Uranium conversion facility');
  L.marker([33.3,52.5],{icon:nukeIcon()}).addTo(map).bindPopup('<b style="color:#ff8c42">"Pickaxe Mountain"</b><br>Deep underground facility south of Natanz<br>May contain centrifuges at extreme depth');
  L.marker([34.4,50.1],{icon:nukeIcon()}).addTo(map).bindPopup('<b style="color:#ff8c42">Arak Heavy Water Reactor</b>');
  L.marker([28.3,54.3],{icon:nukeIcon()}).addTo(map).bindPopup('<b style="color:#ff8c42">Bushehr Nuclear Power Plant</b>');

  // ===== IRGC — STRAIT OF HORMUZ =====
  L.marker([26.6,56.2],{icon:icon('#ff3b3b',12)}).addTo(map).bindPopup('<b style="color:#ff3b3b">Strait of Hormuz</b><br>IRGC naval drills active<br>Khamenei: US Navy "could be sunk"<br><b>21% of global oil passes through here</b>');

  // ===== US/UK AIR BASES =====
  L.marker([25.3,51.5],{icon:jetIcon()}).addTo(map).bindPopup('<b style="color:#00d4ff">Al Udeid Air Base, Qatar</b><br>CENTCOM Forward HQ<br>F-35A, F-22A squadrons<br>20+ KC-135 tankers<br>UK Typhoons also deployed here');
  L.marker([24.2,47.9],{icon:jetIcon()}).addTo(map).bindPopup('<b style="color:#00d4ff">Prince Sultan Air Base, Saudi Arabia</b><br>F-16 Fighting Falcons<br>E-3 AWACS (6 deployed)<br>KC-135 tankers');
  L.marker([24.4,54.6],{icon:jetIcon()}).addTo(map).bindPopup('<b style="color:#00d4ff">Al Dhafra Air Base, UAE</b><br>F-22 Raptors<br>MQ-4C Triton ISR drones<br>KC-10 tankers');
  L.marker([32.0,36.8],{icon:jetIcon()}).addTo(map).bindPopup('<b style="color:#00d4ff">Muwaffaq Salti Air Base, Jordan</b><br><b>EVERY tactical jet slot visible from satellite is full</b><br>Confirmed via satellite imagery (Feb 20):<br>18× F-15E Strike Eagles &bull; 18× F-35A Lightning II<br>12× F-16 Fighting Falcons &bull; 6× EA-18G Growlers<br>2× MQ-9 Reapers (visible; shelters not counted)<br>Key deep-strike staging base<br><em>Jordan denied US airspace for Iran strikes</em>');

  // ===== ISRAEL =====
  L.marker([32,34.8],{icon:icon('#ffd700',14)}).addTo(map).bindPopup('<b style="color:#ffd700">Israel - IDF</b><br>Highest readiness since June 2025 war<br>280,000 reservists authorized<br>IAF on full alert<br>Coordinating with US CENTCOM');

  // ===== UK CYPRUS =====
  L.marker([34.6,33],{icon:icon('#00d4ff',10)}).addTo(map).bindPopup('<b style="color:#00d4ff">RAF Akrotiri, Cyprus</b><br>UK F-35B Lightning II deployed<br>Defensive posture only');

  // ===== BLOCKED UK BASES =====
  L.marker([51.67,-1.79],{icon:blockedIcon()}).addTo(map).bindPopup('<b style="color:#ff3b3b">RAF Fairford, United Kingdom</b><br>B-52/B-2 bomber base<br><b>PM Starmer DENIED US access</b><br>Citing international law');
  L.marker([-7.32,72.42],{icon:blockedIcon()}).addTo(map).bindPopup('<b style="color:#ff3b3b">Diego Garcia</b><br>Indian Ocean staging base<br><b>PM Starmer DENIED US access</b><br>Trump retaliated: withdrew Chagos deal support');

  // Info box
  L.control.attribution({position:'bottomright',prefix:'<span style="color:#6a6a7a;">Sources: USNI Fleet Tracker, CSIS, WaPo, Al Jazeera, PBS, MEF | Feb 25, 2026 20:00 UTC</span>'}).addTo(map);
});

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

  // ===== NAVIGATION: mobile toggle =====
  // ===== LEFT SIDEBAR: active section + progress on scroll =====
  (function() {
    var sectionIds = ['stats','last-24h','theater','air-power','naval','inside-iran','opposition','opposition-landscape','nuclear','nuclear-deal-terms','hormuz','military','iran-retaliation','scenarios'];
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
