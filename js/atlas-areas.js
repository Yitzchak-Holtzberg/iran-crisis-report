(function () {
  'use strict';

  window.IRAN_REPORT_ATLAS_AREAS = [
    {
      id: 'iran-interior',
      number: '01',
      label: 'Iran interior',
      kicker: 'State and society',
      color: '#f05a4f',
      fillColor: '#eadfc7',
      opacity: 0.78,
      center: [53.4, 32.8],
      zoom: 5.05,
      labelPoint: [56.1, 33.3],
      href: 'inside-iran.html',
      linkLabel: 'Open the Inside Iran briefing',
      summary: 'The country’s political, economic, infrastructure, and human pressures are converging inside the same geography.',
      polygon: [
        [53.921598, 37.198918], [54.800304, 37.392421], [55.511578, 37.964117],
        [56.180375, 37.935127], [56.619366, 38.121394], [57.330434, 38.029229],
        [58.436154, 37.522309], [59.234762, 37.412988], [60.377638, 36.527383],
        [61.123071, 36.491597], [61.210817, 35.650072], [60.803193, 34.404102],
        [60.52843, 33.676446], [60.9637, 33.528832], [60.536078, 32.981269],
        [60.863655, 32.18292], [60.941945, 31.548075], [61.699314, 31.379506],
        [61.781222, 30.73585], [60.874248, 29.829239], [61.369309, 29.303276],
        [61.771868, 28.699334], [62.72783, 28.259645], [62.755426, 27.378923],
        [63.233898, 27.217047], [63.316632, 26.756532], [61.874187, 26.239975],
        [61.497363, 25.078237], [59.616134, 25.380157], [58.525761, 25.609962],
        [57.397251, 25.739902], [56.970766, 26.966106], [56.492139, 27.143305],
        [55.72371, 26.964633], [54.71509, 26.480658], [53.493097, 26.812369],
        [52.483598, 27.580849], [51.520763, 27.86569], [50.852948, 28.814521],
        [50.115009, 30.147773], [49.57685, 29.985715], [48.941333, 30.31709],
        [48.567971, 29.926778], [48.014568, 30.452457], [48.004698, 30.985137],
        [47.685286, 30.984853], [47.849204, 31.709176], [47.334661, 32.469155],
        [46.109362, 33.017287], [45.416691, 33.967798], [45.64846, 34.748138],
        [46.151788, 35.093259], [46.07634, 35.677383], [45.420618, 35.977546],
        [44.77267, 37.17045], [44.225756, 37.971584], [44.421403, 38.281281],
        [44.109225, 39.428136], [44.79399, 39.713003], [44.952688, 39.335765],
        [45.457722, 38.874139], [46.143623, 38.741201], [46.50572, 38.770605],
        [47.685079, 39.508364], [48.060095, 39.582235], [48.355529, 39.288765],
        [48.010744, 38.794015], [48.634375, 38.270378], [48.883249, 38.320245],
        [49.199612, 37.582874], [50.147771, 37.374567], [50.842354, 36.872814],
        [52.264025, 36.700422], [53.82579, 36.965031], [53.921598, 37.198918]
      ]
    },
    {
      id: 'nuclear-belt',
      number: '02',
      label: 'Nuclear & military belt',
      kicker: 'Sites and strike pressure',
      color: '#ff5b4d',
      fillColor: '#f05a4f',
      opacity: 0.2,
      center: [51.3, 34.2],
      zoom: 6.35,
      labelPoint: [50.4, 34.1],
      href: 'iran-military.html',
      linkLabel: 'Open Iran’s military position',
      summary: 'Tehran, Fordow, Natanz, Isfahan, and nearby military infrastructure form the most consequential concentration of targets and capability.',
      polygon: [
        [49.4, 36.3], [52.3, 36.5], [53.5, 34.7], [52.8, 32.2],
        [50.7, 31.6], [48.8, 33.2], [49.4, 36.3]
      ]
    },
    {
      id: 'western-front',
      number: '03',
      label: 'Western regional front',
      kicker: 'Iraq, Syria, and the Levant',
      color: '#f0a33b',
      fillColor: '#e6a22f',
      opacity: 0.14,
      center: [40.5, 34.0],
      zoom: 5.05,
      labelPoint: [39.5, 34.1],
      href: 'reactions.html',
      linkLabel: 'Open regional reactions',
      summary: 'Militia networks, air corridors, and retaliatory pressure connect Iraq and Syria to the wider regional confrontation.',
      polygon: [
        [33.4, 30.2], [37.0, 29.5], [42.2, 31.0], [45.5, 33.0],
        [45.4, 38.6], [41.0, 39.4], [36.1, 37.5], [33.4, 34.1],
        [33.4, 30.2]
      ]
    },
    {
      id: 'gulf-posture',
      number: '04',
      label: 'Gulf force posture',
      kicker: 'Bases, partners, and exposure',
      color: '#e6a22f',
      fillColor: '#dca23b',
      opacity: 0.15,
      center: [50.7, 25.8],
      zoom: 5.45,
      labelPoint: [48.7, 25.3],
      href: 'forces.html',
      linkLabel: 'Open the Regional Forces briefing',
      summary: 'Coalition bases, naval headquarters, partner states, and exposed cities sit close together along the western Gulf.',
      polygon: [
        [42.0, 20.6], [47.0, 20.1], [52.3, 22.0], [55.2, 24.1],
        [54.5, 27.7], [50.8, 30.3], [46.3, 28.8], [43.2, 25.6],
        [42.0, 20.6]
      ]
    },
    {
      id: 'hormuz',
      number: '05',
      label: 'Strait of Hormuz',
      kicker: 'The maritime chokepoint',
      color: '#45a8d8',
      fillColor: '#45a8d8',
      opacity: 0.24,
      center: [56.3, 26.4],
      zoom: 6.35,
      labelPoint: [56.6, 26.4],
      href: 'iran-military.html#hormuz',
      linkLabel: 'Open the Hormuz assessment',
      summary: 'The narrow passage concentrates shipping risk, Iranian maritime leverage, and the region’s largest global economic exposure.',
      polygon: [
        [54.6, 25.1], [55.7, 24.8], [58.6, 25.6], [58.7, 26.9],
        [57.0, 27.5], [55.3, 27.0], [54.6, 25.1]
      ]
    },
    {
      id: 'sea-lanes',
      number: '06',
      label: 'Gulf of Oman sea lanes',
      kicker: 'Access and maritime pressure',
      color: '#4d9fc7',
      fillColor: '#4d9fc7',
      opacity: 0.15,
      center: [59.7, 24.0],
      zoom: 5.8,
      labelPoint: [60.0, 23.4],
      href: 'forces.html#naval',
      linkLabel: 'Open the naval forces picture',
      summary: 'Carrier operations, commercial traffic, and access to the Arabian Sea converge immediately beyond Hormuz.',
      polygon: [
        [55.5, 21.7], [61.8, 21.2], [64.6, 24.8], [61.3, 27.4],
        [58.4, 27.2], [56.0, 25.9], [55.5, 21.7]
      ]
    }
  ];
}());
