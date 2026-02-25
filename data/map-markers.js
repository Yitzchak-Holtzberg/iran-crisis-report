/* ===== MAP MARKER DATA — Feb 25, 2026 ===== *
 * Consumed by assets/js/map.js               *
 * Update this file to change map content     */

window.MAP_MARKERS = {

  /* Iran country highlight */
  iranHighlight: { coords: [32.5, 53], radius: 700000 },

  /* Carrier Strike Groups */
  carriers: [
    {
      coords: [23.5, 58],
      popup: '<b style="color:#4a90d9">USS Abraham Lincoln (CVN-72)</b><br>Nimitz-class carrier &bull; CVW-9<br>~80 aircraft &bull; 5,600 crew<br><b style="color:#ff3b3b">700km from Iranian coast</b><br>F/A-18E/F, EA-18G, E-2D, MH-60'
    },
    {
      coords: [35.2, 24.5],
      popup: '<b style="color:#4a90d9">USS Gerald R. Ford (CVN-78)</b><br>Ford-class &bull; World\'s largest warship<br>CVW-8 &bull; ~75 aircraft &bull; 4,500 crew<br><b style="color:#ff8c42">Souda Bay, Crete (docked Feb 24)</b><br>Transited Strait of Gibraltar Feb 20<br>F-35C, F/A-18E/F, E-2D, CMV-22B'
    }
  ],

  /* Strike-radius circles for each carrier */
  strikeRadii: [
    { coords: [23.5, 58],   radius: 700000, popup: 'CVW-9 strike radius (~700km)' },
    { coords: [35.2, 24.5], radius: 900000, popup: 'CVW-8 strike radius (~900km with F-35C)' }
  ],

  /* Ford movement route (Med → Suez) */
  routes: [
    { coords: [[35.2,24.5],[34,28],[33,30],[31.5,32.3]] }
  ],

  /* Destroyers & cruisers */
  destroyers: [
    { coords: [24.1,57.5], popup: '<b style="color:#4a90d9">USS Frank E. Petersen Jr. (DDG-121)</b><br>Arleigh Burke-class destroyer<br>Lincoln CSG escort &bull; DESRON 21<br>Tomahawk &bull; Aegis BMD' },
    { coords: [23.0,59.0], popup: '<b style="color:#4a90d9">USS Spruance (DDG-111)</b><br>Arleigh Burke-class destroyer<br>Lincoln CSG escort<br>Tomahawk &bull; Aegis BMD' },
    { coords: [22.8,57.2], popup: '<b style="color:#4a90d9">USS Mobile Bay (CG-53)</b><br>Ticonderoga-class cruiser<br>Lincoln CSG escort<br>SM-3 &bull; SM-6 &bull; Tomahawk &bull; Aegis BMD' },
    { coords: [35.5,25.5], popup: '<b style="color:#4a90d9">USS Winston S. Churchill (DDG-81)</b><br>Arleigh Burke-class destroyer<br>Ford CSG escort<br>Tomahawk &bull; Aegis BMD' },
    { coords: [34.8,23.8], popup: '<b style="color:#4a90d9">USS Bainbridge (DDG-96)</b><br>Arleigh Burke-class destroyer<br>Ford CSG escort<br>Tomahawk &bull; Aegis BMD' },
    { coords: [35.8,23.5], popup: '<b style="color:#4a90d9">USS Mahan (DDG-72)</b><br>Arleigh Burke-class destroyer<br>Ford CSG escort<br>Tomahawk &bull; Aegis BMD' },
    { coords: [26.2,56.8], popup: '<b style="color:#4a90d9">USS McFaul (DDG-74)</b><br>Arleigh Burke-class destroyer<br>Strait of Hormuz patrol<br>Tomahawk &bull; Aegis BMD' },
    { coords: [25.8,57.5], popup: '<b style="color:#4a90d9">USS Mitscher (DDG-57)</b><br>Arleigh Burke-class destroyer<br>Strait of Hormuz patrol<br>Tomahawk &bull; Aegis BMD' },
    { coords: [22.0,60.5], popup: '<b style="color:#4a90d9">USS Pinckney (DDG-91)</b><br>Arleigh Burke-class destroyer<br>North Arabian Sea<br>Tomahawk &bull; Aegis BMD' },
    { coords: [21.5,62.0], popup: '<b style="color:#4a90d9">USS John Finn (DDG-113)</b><br>Arleigh Burke-class destroyer<br>Arabian Sea<br>Tomahawk &bull; Aegis BMD' },
    { coords: [34.2,26.5], popup: '<b style="color:#4a90d9">USS Roosevelt (DDG-80)</b><br>Arleigh Burke-class destroyer<br>Eastern Mediterranean<br>Tomahawk &bull; Aegis BMD' },
    { coords: [33.8,28.0], popup: '<b style="color:#4a90d9">USS Bulkeley (DDG-84)</b><br>Arleigh Burke-class destroyer<br>Eastern Mediterranean<br>Tomahawk &bull; Aegis BMD' },
    { coords: [18.5,39.5], popup: '<b style="color:#4a90d9">USS Delbert D. Black (DDG-119)</b><br>Arleigh Burke-class destroyer<br>Red Sea patrol<br>Tomahawk &bull; Aegis BMD' }
  ],

  /* Littoral Combat Ships */
  lcs: [
    { coords: [26.8,51.5], popup: '<b style="color:#6ab0ff">USS Canberra (LCS-30)</b><br>Independence-class LCS<br>Persian Gulf patrol<br>Mine countermeasures &bull; ASW' },
    { coords: [26.2,50.8], popup: '<b style="color:#6ab0ff">USS Tulsa (LCS-16)</b><br>Independence-class LCS<br>Persian Gulf &bull; Homeported Bahrain<br>Mine countermeasures &bull; ASW' },
    { coords: [27.2,52.2], popup: '<b style="color:#6ab0ff">USS Santa Barbara (LCS-32)</b><br>Independence-class LCS<br>Persian Gulf patrol<br>Mine countermeasures &bull; ASW' }
  ],

  /* Submarines */
  submarines: [
    { coords: [21.0,59.0], popup: '<b style="color:#7a5af0">USS Georgia (SSGN-729)</b><br>Ohio-class guided-missile submarine<br>154 Tomahawk cruise missiles<br><b>Location undisclosed — approximate</b><br>+ unknown number of fast-attack subs' }
  ],

  /* Assets spinning up for deployment */
  spinup: [
    { coords: [36.9,-76.3], popup: '<b style="color:#ff8c42">USS George H.W. Bush (CVN-77)</b><br>Nimitz-class carrier<br><b>Preparing for possible deployment</b><br>Completing drills off Virginia coast<br>Could reach theater in ~1 week' }
  ],

  /* Iranian cities — active protest sites */
  protestSites: [
    { coords: [35.7,51.4],  size: 14, popup: '<b style="color:#ff3b3b">Tehran</b><br>Student protests Day 5<br>University of Tehran, Sharif, Amirkabir, Shahid Beheshti<br>Chanting: "Death to the dictator"<br>"Woman, life, freedom"' },
    { coords: [32.65,51.68], size: 10, popup: '<b style="color:#ff3b3b">Isfahan</b><br>Protests active &bull; Day 5<br>Nuclear facility tunnel sealing underway' },
    { coords: [36.3,59.6],  size: 10, popup: '<b style="color:#ff3b3b">Mashhad</b><br>Student protests active &bull; Day 5' },
    { coords: [29.6,52.5],  size: 8,  popup: '<b style="color:#ff3b3b">Shiraz</b><br>Protests reported' },
    { coords: [32.3,48.7],  size: 8,  popup: '<b style="color:#ff3b3b">Ahvaz (Khuzestan)</b><br>Arab minority protests<br>Heavy military suppression' },
    { coords: [35.3,46.9],  size: 8,  popup: '<b style="color:#ff3b3b">Sanandaj (Kurdistan)</b><br>Kurdish protests<br>2,000+ detained &bull; Reports of torture' }
  ],

  /* Iranian nuclear facilities */
  nuclearSites: [
    { coords: [33.72,51.73], popup: '<b style="color:#ff8c42">Natanz Nuclear Facility</b><br>Uranium enrichment<br>Underground centrifuge halls' },
    { coords: [32.6,51.7],   popup: '<b style="color:#ff8c42">Isfahan Nuclear Complex</b><br>Tunnel sealing operations in progress<br>Uranium conversion facility' },
    { coords: [33.3,52.5],   popup: '<b style="color:#ff8c42">"Pickaxe Mountain"</b><br>Deep underground facility south of Natanz<br>May contain centrifuges at extreme depth' },
    { coords: [34.4,50.1],   popup: '<b style="color:#ff8c42">Arak Heavy Water Reactor</b>' },
    { coords: [28.3,54.3],   popup: '<b style="color:#ff8c42">Bushehr Nuclear Power Plant</b>' }
  ],

  /* IRGC & Strait of Hormuz */
  irgc: [
    { coords: [26.6,56.2], size: 12, popup: '<b style="color:#ff3b3b">Strait of Hormuz</b><br>IRGC naval drills active<br>Khamenei: US Navy "could be sunk"<br><b>21% of global oil passes through here</b>' }
  ],

  /* US & UK air bases */
  airBases: [
    { coords: [25.3,51.5], popup: '<b style="color:#00d4ff">Al Udeid Air Base, Qatar</b><br>CENTCOM Forward HQ<br>F-35A, F-22A squadrons<br>20+ KC-135 tankers<br>UK Typhoons also deployed here' },
    { coords: [24.2,47.9], popup: '<b style="color:#00d4ff">Prince Sultan Air Base, Saudi Arabia</b><br>F-16 Fighting Falcons<br>E-3 AWACS (6 deployed)<br>KC-135 tankers' },
    { coords: [24.4,54.6], popup: '<b style="color:#00d4ff">Al Dhafra Air Base, UAE</b><br>F-22 Raptors<br>MQ-4C Triton ISR drones<br>KC-10 tankers' },
    { coords: [32.0,36.8], popup: '<b style="color:#00d4ff">Muwaffaq Salti Air Base, Jordan</b><br><b>EVERY tactical jet slot visible from satellite is full</b><br>Confirmed via satellite imagery (Feb 20):<br>18\u00d7 F-15E Strike Eagles &bull; 18\u00d7 F-35A Lightning II<br>12\u00d7 F-16 Fighting Falcons &bull; 6\u00d7 EA-18G Growlers<br>2\u00d7 MQ-9 Reapers (visible; shelters not counted)<br>Key deep-strike staging base<br><em>Jordan denied US airspace for Iran strikes</em>' },
    { coords: [34.6,33],   popup: '<b style="color:#00d4ff">RAF Akrotiri, Cyprus</b><br>UK F-35B Lightning II deployed<br>Defensive posture only' }
  ],

  /* Allied forces */
  allies: [
    { coords: [32,34.8], size: 14, color: '#ffd700', popup: '<b style="color:#ffd700">Israel - IDF</b><br>Highest readiness since June 2025 war<br>280,000 reservists authorized<br>IAF on full alert<br>Coordinating with US CENTCOM' }
  ],

  /* UK bases blocked from US use */
  blocked: [
    { coords: [51.67,-1.79], popup: '<b style="color:#ff3b3b">RAF Fairford, UK</b><br>B-52/B-2 bomber base<br><b>PM Starmer DENIED US access</b><br>Citing international law' },
    { coords: [-7.32,72.42], popup: '<b style="color:#ff3b3b">Diego Garcia</b><br>Indian Ocean staging base<br><b>PM Starmer DENIED US access</b><br>Trump retaliated: withdrew Chagos deal support' }
  ]
};
