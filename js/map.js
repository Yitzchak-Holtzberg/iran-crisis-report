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
  // Carrier (CVN) — bold anchor SVG (26×27 in 44px circle)
  function shipIcon(){return L.divIcon({className:'',html:'<div class="map-icon map-icon-cvn"><svg viewBox="0 0 22 23" width="26" height="27" fill="none"><circle cx="11" cy="4" r="2.7" stroke="#4a90d9" stroke-width="2.2" fill="none"/><line x1="11" y1="6.7" x2="11" y2="20" stroke="#4a90d9" stroke-width="2.5" stroke-linecap="round"/><line x1="3.5" y1="11" x2="18.5" y2="11" stroke="#4a90d9" stroke-width="2.2" stroke-linecap="round"/><path d="M11 20 L5 18.5 L5 21.5" stroke="#4a90d9" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 20 L17 18.5 L17 21.5" stroke="#4a90d9" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="badge-label">CVN</span></div>',iconSize:[44,44],iconAnchor:[22,22]});}
  // Destroyer / Cruiser (DDG/CG) — bold ship-hull SVG (21×14 in 26px circle)
  function ddgIcon(){return L.divIcon({className:'',html:'<div class="map-icon map-icon-ddg"><svg viewBox="0 0 22 14" width="21" height="14" fill="none"><path d="M2 13 L4 8.5 L11 7 L18 8.5 L20 13 Z" fill="rgba(74,144,217,0.35)" stroke="#4a90d9" stroke-width="2" stroke-linejoin="round"/><rect x="9" y="3.5" width="4" height="4" rx="1" fill="rgba(74,144,217,0.3)" stroke="#4a90d9" stroke-width="1.8"/><line x1="11" y1="3.5" x2="11" y2="1.5" stroke="#4a90d9" stroke-width="2" stroke-linecap="round"/></svg></div>',iconSize:[26,26],iconAnchor:[13,13]});}
  // LCS — smaller ship-hull SVG (17×11 in 20px circle)
  function lcsIcon(){return L.divIcon({className:'',html:'<div class="map-icon map-icon-lcs"><svg viewBox="0 0 18 12" width="17" height="11" fill="none"><path d="M1.5 11 L4 7.5 L9 6 L14 7.5 L16.5 11 Z" fill="rgba(90,149,204,0.32)" stroke="#5a95cc" stroke-width="1.8" stroke-linejoin="round"/><rect x="7.5" y="3.5" width="3" height="3" rx="0.8" fill="rgba(90,149,204,0.25)" stroke="#5a95cc" stroke-width="1.5"/></svg></div>',iconSize:[20,20],iconAnchor:[10,10]});}
  // Submarine (SSN/SSGN) — torpedo hull + conning tower SVG (27×15 in 34px circle)
  function subIcon(){return L.divIcon({className:'',html:'<div class="map-icon map-icon-sub"><svg viewBox="0 0 28 16" width="27" height="15" fill="none"><path d="M5 12 Q5 9 8 9 L20 9 Q25 9 25 12 Q25 15 20 15 L8 15 Q5 15 5 12 Z" fill="rgba(122,90,240,0.3)" stroke="#7a5af0" stroke-width="2"/><rect x="11" y="4" width="7" height="6" rx="1.5" fill="rgba(122,90,240,0.25)" stroke="#7a5af0" stroke-width="1.8"/><line x1="14.5" y1="4" x2="14.5" y2="2" stroke="#7a5af0" stroke-width="1.8" stroke-linecap="round"/><line x1="14.5" y1="2" x2="18" y2="2" stroke="#7a5af0" stroke-width="1.5" stroke-linecap="round"/></svg><span class="badge-label">SSN</span></div>',iconSize:[34,34],iconAnchor:[17,17]});}
  // Air base — top-down fighter-jet SVG (21×25 in 32px circle)
  function jetIcon(){return L.divIcon({className:'',html:'<div class="map-icon map-icon-jet"><svg viewBox="0 0 22 26" width="21" height="25" fill="none"><ellipse cx="11" cy="12" rx="2.5" ry="10.5" fill="rgba(0,212,255,0.35)" stroke="#00d4ff" stroke-width="2"/><path d="M8.5 9.5 L1 16.5 L1 18.5 L8.5 14 Z" fill="rgba(0,212,255,0.28)" stroke="#00d4ff" stroke-width="1.8" stroke-linejoin="round"/><path d="M13.5 9.5 L21 16.5 L21 18.5 L13.5 14 Z" fill="rgba(0,212,255,0.28)" stroke="#00d4ff" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 20 L6 25 L8 25 L10.5 21 Z" fill="rgba(0,212,255,0.22)" stroke="#00d4ff" stroke-width="1.5" stroke-linejoin="round"/><path d="M13 20 L16 25 L14 25 L11.5 21 Z" fill="rgba(0,212,255,0.22)" stroke="#00d4ff" stroke-width="1.5" stroke-linejoin="round"/></svg></div>',iconSize:[32,32],iconAnchor:[16,16]});}
  // Nuclear facility — radiation trefoil SVG (22×22 in 32px circle) + pulsing glow
  function nukeIcon(){return L.divIcon({className:'',html:'<div class="map-icon map-icon-nuke"><svg viewBox="0 0 22 22" width="22" height="22" fill="none"><circle cx="11" cy="11" r="3" fill="#ff8c42"/><path d="M9.25 7.97 L6.5 3.2 A9 9 0 0 1 15.5 3.2 L12.75 7.97 A3.5 3.5 0 0 0 9.25 7.97 Z" fill="rgba(255,140,66,0.7)" stroke="#ff8c42" stroke-width="0.8"/><path d="M14.5 11 L20 11 A9 9 0 0 1 15.5 18.8 L12.75 14.03 A3.5 3.5 0 0 0 14.5 11 Z" fill="rgba(255,140,66,0.7)" stroke="#ff8c42" stroke-width="0.8"/><path d="M9.25 14.03 L6.5 18.8 A9 9 0 0 1 2 11 L7.5 11 A3.5 3.5 0 0 0 9.25 14.03 Z" fill="rgba(255,140,66,0.7)" stroke="#ff8c42" stroke-width="0.8"/></svg></div>',iconSize:[32,32],iconAnchor:[16,16]});}
  // Blocked / Denied — CSS-class badge (theme-aware via stylesheet)
  function blockedIcon(){return L.divIcon({className:'',html:'<div class="map-badge map-badge-denied"><b>ACCESS DENIED</b></div>',iconSize:[100,24],iconAnchor:[50,12]});}
  function spinupIcon(){return L.divIcon({className:'',html:'<div class="map-badge map-badge-spinup"><b>SPINNING UP</b></div>',iconSize:[90,24],iconAnchor:[45,12]});}
  function deployingIcon(){return L.divIcon({className:'',html:'<div class="map-badge map-badge-deploying"><b>DEPLOYING</b></div>',iconSize:[90,24],iconAnchor:[45,12]});}
  // Diplomatic venue — building/flag SVG (22×22 in 32px circle)
  function diplomacyIcon(){return L.divIcon({className:'',html:'<div class="map-icon map-icon-diplomacy"><svg viewBox="0 0 22 22" width="22" height="22" fill="none"><rect x="3" y="9" width="16" height="11" rx="1" fill="rgba(0,212,255,0.25)" stroke="#00d4ff" stroke-width="1.8"/><rect x="7" y="13" width="3" height="4" rx="0.5" fill="rgba(0,212,255,0.3)" stroke="#00d4ff" stroke-width="1.2"/><rect x="12" y="13" width="3" height="4" rx="0.5" fill="rgba(0,212,255,0.3)" stroke="#00d4ff" stroke-width="1.2"/><path d="M2 9 L11 3 L20 9" stroke="#00d4ff" stroke-width="1.8" stroke-linejoin="round" fill="rgba(0,212,255,0.15)"/><line x1="11" y1="3" x2="11" y2="1" stroke="#00d4ff" stroke-width="1.5" stroke-linecap="round"/><rect x="10" y="1" width="4" height="2.5" rx="0.3" fill="rgba(0,212,255,0.5)" stroke="#00d4ff" stroke-width="0.8"/></svg><span class="badge-label" style="color:#00d4ff;border-color:rgba(0,212,255,0.4);">IAEA</span></div>',iconSize:[44,44],iconAnchor:[22,22]});}

  // Iran - red highlight
  L.circle([32.5,53],{radius:700000,color:'#ff3b3b',fillColor:'#ff3b3b',fillOpacity:0.06,weight:1,dashArray:'6,4'}).addTo(map);

  // ===== ABRAHAM LINCOLN CARRIER STRIKE GROUP (Arabian Sea) =====
  L.marker([23.5,58],{icon:shipIcon()}).addTo(map).bindPopup('<b style="color:#4a90d9">USS Abraham Lincoln (CVN-72)</b><br>Nimitz-class carrier &bull; CVW-11<br>~80 aircraft &bull; 5,600 crew<br><b style="color:#ff3b3b">700km from Iranian coast</b><br>F-35C, F/A-18E/F, EA-18G, E-2D, MH-60');
  L.circle([23.5,58],{radius:700000,color:'#4a90d9',fillColor:'#4a90d9',fillOpacity:0.04,weight:0.5,dashArray:'8,6'}).addTo(map).bindPopup('CVW-11 strike radius (~700km)');
  // Lincoln escorts
  L.marker([24.1,57.5],{icon:ddgIcon()}).addTo(map).bindPopup('<b style="color:#4a90d9">USS Frank E. Petersen Jr. (DDG-121)</b><br>Arleigh Burke-class destroyer<br>Lincoln CSG escort &bull; DESRON 21<br>Tomahawk &bull; Aegis BMD');
  L.marker([23.0,59.0],{icon:ddgIcon()}).addTo(map).bindPopup('<b style="color:#4a90d9">USS Spruance (DDG-111)</b><br>Arleigh Burke-class destroyer<br>Lincoln CSG escort<br>Tomahawk &bull; Aegis BMD');
  L.marker([22.8,57.2],{icon:ddgIcon()}).addTo(map).bindPopup('<b style="color:#4a90d9">USS Michael Murphy (DDG-112)</b><br>Arleigh Burke-class destroyer<br>Lincoln CSG escort &bull; DESRON 21<br>Tomahawk &bull; Aegis BMD');

  // ===== GERALD R. FORD CARRIER STRIKE GROUP (Eastern Mediterranean — transiting east) =====
  L.marker([34.8,28.5],{icon:shipIcon()}).addTo(map).bindPopup('<b style="color:#4a90d9">USS Gerald R. Ford (CVN-78)</b><br>Ford-class &bull; World\'s largest warship<br>CVW-8 &bull; ~75 aircraft &bull; 4,500 crew<br><b style="color:#ff8c42">~500 km west of Cyprus — eastward transit (Feb 27)</b><br>Departed Souda Bay, Crete on Feb 26; repositioning toward strike corridor<br>F-35C, F/A-18E/F, E-2D, CMV-22B');
  L.circle([34.8,28.5],{radius:900000,color:'#4a90d9',fillColor:'#4a90d9',fillOpacity:0.03,weight:0.5,dashArray:'8,6'}).addTo(map).bindPopup('CVW-8 strike radius (~900km with F-35C)');
  // Ford movement arrow (Med → Suez → Gulf)
  L.polyline([[34.8,28.5],[33.5,30],[31.5,32.3]],{color:'#4a90d9',weight:1.5,dashArray:'8,6',opacity:0.5}).addTo(map);
  // Ford escorts
  L.marker([35.3,29.0],{icon:ddgIcon()}).addTo(map).bindPopup('<b style="color:#4a90d9">USS Winston S. Churchill (DDG-81)</b><br>Arleigh Burke-class destroyer<br>Ford CSG escort<br>Tomahawk &bull; Aegis BMD');
  L.marker([34.3,28.0],{icon:ddgIcon()}).addTo(map).bindPopup('<b style="color:#4a90d9">USS Bainbridge (DDG-96)</b><br>Arleigh Burke-class destroyer<br>Ford CSG escort<br>Tomahawk &bull; Aegis BMD');
  L.marker([35.5,29.5],{icon:ddgIcon()}).addTo(map).bindPopup('<b style="color:#4a90d9">USS Mahan (DDG-72)</b><br>Arleigh Burke-class destroyer<br>Ford CSG escort<br>Tomahawk &bull; Aegis BMD');

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

  // ===== USS GEORGE H.W. BUSH (transiting Atlantic — deployed, approaching Gibraltar) =====
  L.marker([36.5,-10.0],{icon:deployingIcon()}).addTo(map).bindPopup('<b style="color:#ff8c42">USS George H.W. Bush (CVN-77)</b><br>Nimitz-class carrier &bull; CVW-7<br><b>FORMALLY DEPLOYED — transiting Atlantic (Feb 27)</b><br>Pentagon confirmed deployment order; COMPTUEX complete<br>Approaching Strait of Gibraltar; expected in theater mid-March<br>Third carrier confirms unprecedented triple-carrier posture');

  // ===== IRANIAN CITIES — PROTEST SITES =====
  L.marker([35.7,51.4],{icon:icon('#ff3b3b',14)}).addTo(map).bindPopup('<b style="color:#ff3b3b">Tehran</b><br>Student protests <b>Day 7</b> — 63 overnight arrests; 410+ detained since Feb 21<br>University of Tehran, Sharif, Amirkabir, Shahid Beheshti<br>IRGC Basij deployed to all 31 provinces<br>"Woman, life, freedom" &bull; Chants for Reza Pahlavi<br><b style="color:#ff8c42">UK withdrew entire embassy staff (Feb 27)</b><br><b style="color:#ff8c42">China advising nationals to evacuate Iran (Feb 27)</b>');
  L.marker([32.65,51.68],{icon:icon('#ff3b3b',10)}).addTo(map).bindPopup('<b style="color:#ff3b3b">Isfahan</b><br>Protests active &bull; Day 7<br>Nuclear facility tunnel sealing underway');
  L.marker([36.3,59.6],{icon:icon('#ff3b3b',10)}).addTo(map).bindPopup('<b style="color:#ff3b3b">Mashhad</b><br>Student protests active &bull; Day 7');
  L.marker([29.6,52.5],{icon:icon('#ff3b3b',8)}).addTo(map).bindPopup('<b style="color:#ff3b3b">Shiraz</b><br>Protests reported');
  L.marker([32.3,48.7],{icon:icon('#ff3b3b',8)}).addTo(map).bindPopup('<b style="color:#ff3b3b">Ahvaz (Khuzestan)</b><br>Arab minority protests<br>Heavy military suppression');
  L.marker([35.3,46.9],{icon:icon('#ff3b3b',8)}).addTo(map).bindPopup('<b style="color:#ff3b3b">Sanandaj (Kurdistan)</b><br>Kurdish protests<br>2,000+ detained &bull; Reports of torture');

  // ===== NUCLEAR SITES =====
  L.marker([33.72,51.73],{icon:nukeIcon()}).addTo(map).bindPopup('<b style="color:#ff8c42">Natanz Nuclear Facility</b><br>Uranium enrichment<br>Underground centrifuge halls<br>Heavily damaged in June 2025 strikes');
  L.marker([32.6,51.7],{icon:nukeIcon()}).addTo(map).bindPopup('<b style="color:#ff8c42">Isfahan Nuclear Complex</b><br>Tunnel sealing operations in progress<br>Uranium conversion facility');
  L.marker([33.3,52.5],{icon:nukeIcon()}).addTo(map).bindPopup('<b style="color:#ff8c42">"Pickaxe Mountain"</b><br>Deep underground facility south of Natanz<br>May contain centrifuges at extreme depth (~80m+)');
  L.marker([34.18,49.22],{icon:nukeIcon()}).addTo(map).bindPopup('<b style="color:#ff8c42">Arak Heavy Water Reactor</b>');
  L.marker([28.83,50.88],{icon:nukeIcon()}).addTo(map).bindPopup('<b style="color:#ff8c42">Bushehr Nuclear Power Plant</b>');
  L.marker([35.54,51.77],{icon:nukeIcon()}).addTo(map).bindPopup('<b style="color:#ff8c42">Parchin Military Complex</b><br><b style="color:#ff3b3b">NEW (Feb 20):</b> Satellite imagery confirms expanded soil-and-concrete hardening — direct countermeasure against GBU-57 bunker busters<br>Located ~35 km SE of Tehran<br><em>Source: The War Zone, Feb 20</em>');

  // ===== IRGC — STRAIT OF HORMUZ =====
  L.marker([26.6,56.2],{icon:icon('#ff3b3b',12)}).addTo(map).bindPopup('<b style="color:#ff3b3b">Strait of Hormuz</b><br>IRGC naval drills active<br>Khamenei: US Navy "could be sunk"<br><b>21% of global oil passes through here</b>');

  // ===== US/UK AIR BASES =====
  L.marker([25.3,51.5],{icon:jetIcon()}).addTo(map).bindPopup('<b style="color:#00d4ff">Al Udeid Air Base, Qatar</b><br>CENTCOM Forward HQ<br>F-35A, F-22A squadrons<br>20+ KC-135 tankers<br>UK Typhoons also deployed here');
  L.marker([24.2,47.9],{icon:jetIcon()}).addTo(map).bindPopup('<b style="color:#00d4ff">Prince Sultan Air Base, Saudi Arabia</b><br>F-16 Fighting Falcons<br>E-3 AWACS (6 deployed)<br>KC-135 tankers');
  L.marker([24.4,54.6],{icon:jetIcon()}).addTo(map).bindPopup('<b style="color:#00d4ff">Al Dhafra Air Base, UAE</b><br>F-22 Raptors<br>MQ-4C Triton ISR drones<br>KC-10 tankers');
  L.marker([32.0,36.8],{icon:jetIcon()}).addTo(map).bindPopup('<b style="color:#00d4ff">Muwaffaq Salti Air Base, Jordan</b><br><b>EVERY tactical jet slot visible from satellite is full</b><br>Confirmed via satellite imagery (Feb 20):<br>18× F-15E Strike Eagles &bull; 18× F-35A Lightning II<br>12× F-16 Fighting Falcons &bull; 6× EA-18G Growlers<br>2× MQ-9 Reapers (visible; shelters not counted)<br>Key deep-strike staging base<br><em>Jordan denied US airspace for Iran strikes</em>');

  // ===== ISRAEL =====
  L.marker([32,34.8],{icon:icon('#ffd700',14)}).addTo(map).bindPopup('<b style="color:#ffd700">Israel - IDF</b><br>Highest readiness since June 2025 war<br>280,000 reservists authorized<br>IAF on full alert<br>Coordinating with US CENTCOM');
  // F-22 Raptors at Ovda Air Base (southern Israel, ~30km north of Eilat)
  L.marker([29.9,34.9],{icon:jetIcon()}).addTo(map).bindPopup('<b style="color:#00d4ff">Ovda Air Base, Israel</b><br><b style="color:#ff8c42">24× F-22A Raptor</b> — world\'s most advanced stealth fighter<br><b>First-ever F-22 deployment to Israeli soil</b><br>Arrived Feb 24–26 from RAF Lakenheath, UK<br>Vanguard of any Iran strike<br><em>Sources: Times of Israel, ABC News</em>');

  // ===== UK CYPRUS =====
  L.marker([34.6,33],{icon:icon('#00d4ff',10)}).addTo(map).bindPopup('<b style="color:#00d4ff">RAF Akrotiri, Cyprus</b><br>UK F-35B Lightning II deployed<br>Defensive posture only');

  // ===== BLOCKED UK BASES =====
  L.marker([51.67,-1.79],{icon:blockedIcon()}).addTo(map).bindPopup('<b style="color:#ff3b3b">RAF Fairford, United Kingdom</b><br>B-52/B-2 bomber base<br><b>PM Starmer DENIED US access</b><br>Citing international law');
  L.marker([-7.32,72.42],{icon:blockedIcon()}).addTo(map).bindPopup('<b style="color:#ff3b3b">Diego Garcia</b><br>Indian Ocean staging base<br><b>PM Starmer DENIED US access</b><br>Trump retaliated: withdrew Chagos deal support');

  // ===== VIENNA — IAEA DIPLOMATIC TALKS =====
  L.marker([48.2,16.4],{icon:diplomacyIcon()}).addTo(map).bindPopup('<b style="color:#00d4ff">Vienna — IAEA Headquarters</b><br><b style="color:#4a90d9">US–Iran Technical Talks begin Monday, Mar 2</b><br>Expert working groups on enrichment verification &amp; sanctions sequencing<br>IAEA DG Grossi confirms hosting<br>US lead: Steve Witkoff &bull; Iran lead: Araghchi<br><em>Sources: Reuters, AP, Al Jazeera, Feb 27</em>');

  // Info box
  L.control.attribution({position:'bottomright',prefix:'<span style="color:#6a6a7a;">Sources: USNI Fleet Tracker, CSIS, WaPo, Al Jazeera, PBS, MEF | Feb 27, 2026 16:37 UTC</span>'}).addTo(map);
});
