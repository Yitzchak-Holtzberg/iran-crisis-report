document.addEventListener('DOMContentLoaded', function(){
  var map = L.map('theater-map',{zoomControl:true,scrollWheelZoom:false,attributionControl:false}).setView([28,48],4);
  var isLightNow = document.documentElement.getAttribute('data-theme')==='light';
  var tileUrl = isLightNow
    ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}{r}.png';
  window._theaterTileLayer = L.tileLayer(tileUrl,{maxZoom:19,subdomains:'abcd'}).addTo(map);
  window._theaterMap = map;

  // Protest/city dot — pulsing ring animation via .map-dot CSS class
  // color is always a hardcoded hex literal in this file; validate to prevent accidental injection
  function icon(color,size){var c=/^#[0-9a-fA-F]{3,8}$/.test(color)?color:'#888888';var h=size/2;return L.divIcon({className:'',html:'<div class="map-dot" style="--c:'+c+';width:'+size+'px;height:'+size+'px;background:'+c+';border:2px solid rgba(255,255,255,0.65);box-shadow:0 0 '+(size*1.5)+'px '+c+',0 2px 4px rgba(0,0,0,0.55);"></div>',iconSize:[size,size],iconAnchor:[h,h]});}
  // Carrier (CVN) — anchor SVG badge
  function shipIcon(){return L.divIcon({className:'',html:'<div class="map-icon map-icon-cvn"><svg viewBox="0 0 20 20" width="17" height="17" fill="none"><circle cx="10" cy="4" r="2.2" fill="#4a90d9"/><line x1="10" y1="6.2" x2="10" y2="17.5" stroke="#4a90d9" stroke-width="1.8" stroke-linecap="round"/><line x1="4.5" y1="10" x2="15.5" y2="10" stroke="#4a90d9" stroke-width="1.8" stroke-linecap="round"/><path d="M5 17C5 14.2 10 15.6 10 15.6S15 14.2 15 17" stroke="#4a90d9" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg><span class="badge-label">CVN</span></div>',iconSize:[44,44],iconAnchor:[22,22]});}
  // Destroyer / Cruiser (DDG/CG) — ship-hull SVG
  function ddgIcon(){return L.divIcon({className:'',html:'<div class="map-icon map-icon-ddg"><svg viewBox="0 0 18 13" width="13" height="10" fill="none"><path d="M1 12L3.5 8L9 6.5L14.5 8L17 12Z" fill="rgba(74,144,217,0.25)" stroke="#4a90d9" stroke-width="1.3" stroke-linejoin="round"/><rect x="7.5" y="3.5" width="3" height="3" rx="0.5" fill="rgba(74,144,217,0.2)" stroke="#4a90d9" stroke-width="1"/></svg></div>',iconSize:[26,26],iconAnchor:[13,13]});}
  // LCS — smaller ship-hull SVG
  function lcsIcon(){return L.divIcon({className:'',html:'<div class="map-icon map-icon-lcs"><svg viewBox="0 0 14 10" width="10" height="8" fill="none"><path d="M1 9L3 6L7 5L11 6L13 9Z" fill="rgba(90,149,204,0.2)" stroke="#5a95cc" stroke-width="1.2" stroke-linejoin="round"/><rect x="6" y="3.5" width="2" height="2" rx="0.5" stroke="#5a95cc" stroke-width="1"/></svg></div>',iconSize:[20,20],iconAnchor:[10,10]});}
  // Submarine (SSN/SSGN) — torpedo-hull SVG + label
  function subIcon(){return L.divIcon({className:'',html:'<div class="map-icon map-icon-sub"><svg viewBox="0 0 22 14" width="17" height="11" fill="none"><ellipse cx="11" cy="9" rx="8.5" ry="3.5" fill="rgba(122,90,240,0.2)" stroke="#7a5af0" stroke-width="1.3"/><rect x="8" y="4.5" width="6" height="4.5" rx="1" fill="rgba(122,90,240,0.15)" stroke="#7a5af0" stroke-width="1"/><line x1="20" y1="9" x2="22" y2="7.5" stroke="#7a5af0" stroke-width="1.2" stroke-linecap="round"/></svg><span class="badge-label">SSN</span></div>',iconSize:[34,34],iconAnchor:[17,17]});}
  // Air base — top-down fighter-jet SVG
  function jetIcon(){return L.divIcon({className:'',html:'<div class="map-icon map-icon-jet"><svg viewBox="0 0 20 21" width="14" height="15" fill="none"><ellipse cx="10" cy="10.5" rx="2" ry="8" fill="rgba(0,212,255,0.25)" stroke="#00d4ff" stroke-width="1.2"/><path d="M8 8.5L1 13L1 14.5L8 11Z" fill="rgba(0,212,255,0.18)" stroke="#00d4ff" stroke-width="1.1" stroke-linejoin="round"/><path d="M12 8.5L19 13L19 14.5L12 11Z" fill="rgba(0,212,255,0.18)" stroke="#00d4ff" stroke-width="1.1" stroke-linejoin="round"/><path d="M8.5 16.5L5 19L5.5 19.5L8.5 17.5Z" fill="rgba(0,212,255,0.12)" stroke="#00d4ff" stroke-width="1"/><path d="M11.5 16.5L15 19L14.5 19.5L11.5 17.5Z" fill="rgba(0,212,255,0.12)" stroke="#00d4ff" stroke-width="1"/></svg></div>',iconSize:[32,32],iconAnchor:[16,16]});}
  // Nuclear facility — 6-spoke radiation SVG + pulsing glow (.map-icon-nuke)
  function nukeIcon(){return L.divIcon({className:'',html:'<div class="map-icon map-icon-nuke"><svg viewBox="0 0 20 20" width="15" height="15" fill="none"><circle cx="10" cy="10" r="2.5" fill="#ff8c42"/><circle cx="10" cy="10" r="6" stroke="#ff8c42" stroke-width="1.1" stroke-dasharray="2.5 1.5" fill="none"/><line x1="10" y1="7.5" x2="10" y2="3.5" stroke="#ff8c42" stroke-width="2.2" stroke-linecap="round"/><line x1="7.2" y1="8.6" x2="4.2" y2="5.6" stroke="#ff8c42" stroke-width="2.2" stroke-linecap="round"/><line x1="12.8" y1="8.6" x2="15.8" y2="5.6" stroke="#ff8c42" stroke-width="2.2" stroke-linecap="round"/><line x1="7.2" y1="11.4" x2="4.2" y2="14.4" stroke="#ff8c42" stroke-width="2.2" stroke-linecap="round"/><line x1="12.8" y1="11.4" x2="15.8" y2="14.4" stroke="#ff8c42" stroke-width="2.2" stroke-linecap="round"/><line x1="10" y1="12.5" x2="10" y2="16.5" stroke="#ff8c42" stroke-width="2.2" stroke-linecap="round"/></svg></div>',iconSize:[32,32],iconAnchor:[16,16]});}
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
