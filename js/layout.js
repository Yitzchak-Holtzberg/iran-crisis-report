(function () {
  var NAV_ITEMS = [
    { num: '01', id: 'stats',        label: 'Key Statistics',        href: 'index.html' },
    { num: '02', id: 'last-24h',     label: 'The Last 24 Hours',     href: 'pages/last-24h.html' },
    { num: '03', id: 'theater',      label: 'Theater Map',           href: 'pages/theater.html' },
    { num: '04', id: 'air-power',    label: 'Air Power',             href: 'pages/air-power.html' },
    { num: '05', id: 'naval',        label: 'Naval Forces',          href: 'pages/naval.html' },
    { num: '06', id: 'inside-iran',  label: 'Inside Iran',           href: 'pages/inside-iran.html' },
    { num: '07', id: 'opposition',   label: 'Opposition',            href: 'pages/opposition.html' },
    { num: '08', id: 'nuclear',      label: 'Nuclear Talks',         href: 'pages/nuclear.html' },
    { num: '09', id: 'hormuz',       label: 'Strait of Hormuz',      href: 'pages/hormuz.html' },
    { num: '10', id: 'military',     label: 'Iran Military',         href: 'pages/military.html' },
    { num: '11', id: 'scenarios',    label: 'Scenarios',             href: 'pages/scenarios.html' }
  ];

  var TICKER_ITEMS = [
    'BREAKING: Trump warns Iran in State of the Union \u2014 \u201cI will never allow the world\u2019s #1 sponsor of terror to have a nuclear weapon\u201d',
    'IRAN RESPONDS: Foreign Ministry calls Trump\u2019s claims \u201cbig lies\u201d \u2014 says deal \u201cwithin reach\u201d',
    'IRAN UN LETTER: \u201cAll bases, facilities and assets of the hostile force in the region would constitute legitimate targets\u201d',
    'CIA: Releases Farsi-language video recruiting Iranian informants \u2014 Tor, VPN, disposable device instructions published on X, Instagram &amp; YouTube',
    'IRAN CONDEMNS CIA campaign \u2014 seizes Starlink equipment found in diplomat\u2019s luggage',
    'STUDENT PROTESTS: Day 5 \u2014 universities across all 31 provinces in revolt; Sharif Univ website hacked; 50K Iranians receive pro-Trump text messages',
    'PARCHIN: Satellite imagery shows Iran placed concrete/soil shield over nuclear site to protect against US strikes',
    'NAVY: 25+ US warships now in region \u2014 Ford CSG in Eastern Mediterranean (Souda Bay, Crete), Lincoln CSG in Arabian Sea \u2014 600+ Tomahawks ready',
    'JORDAN + SAUDI ARABIA: Both nations deny US use of their airspace for Iran strikes \u2014 despite hosting US aircraft',
    'GENEVA: Round 3 nuclear talks Thursday \u2014 Iran\u2019s Araghchi heading to Switzerland',
    'TRUMP DEADLINE: 10-day ultimatum expires early March \u2014 all US forces \u201cin place by mid-March\u201d',
    'CHINA: Anti-ship missile supply deal with Tehran raises stakes for US carrier groups',
    'United Kingdom: Starmer blocks US use of RAF Fairford &amp; Diego Garcia for Iran strikes',
    'US PULLS F-35s from NATO Cold Response 2026 exercise in Norway \u2014 assets redirected to Middle East',
    'RIAL: Currency collapse \u2014 1.47 million rials to the dollar \u2014 Iran\u2019s largest bank ran dry in December',
    'USS GEORGE H.W. BUSH: Third carrier spinning up at Norfolk for possible deployment'
  ];

  var SOURCES_HTML = [
    ['https://www.cnbc.com/2026/02/25/the-cia-urges-iranians-to-reach-out-as-informants-in-rare-move.html', 'CNBC: CIA urges Iranians to reach out as informants'],
    ['https://www.usnews.com/news/world/articles/2026-02-24/cia-offers-tips-to-potential-informants-in-iran-as-trump-considers-military-action', 'US News: CIA offers tips to potential informants in Iran'],
    ['https://www.twz.com/news-features/supercarrier-uss-gerald-r-ford-has-crossed-into-the-mediterranean', 'The War Zone: Ford CSG enters Mediterranean'],
    ['https://www.nbcnews.com/world/iran/us-iran-hold-high-stakes-nuclear-talks-geneva-threat-war-looms-rcna259304', 'NBC: US-Iran hold high-stakes Geneva nuclear talks'],
    ['https://www.aljazeera.com/news/2026/2/25/trump-says-preference-is-to-solve-iran-tensions-through-diplomacy', 'Al Jazeera: Trump SOTU \u2014 Iran \u201cbig lies\u201d response'],
    ['https://www.cnbc.com/2026/02/25/us-iran-talks-nuclear-trump-oil-prices-war-conflict.html', 'CNBC: Trump says Iran wants deal more than US'],
    ['https://news.usni.org/2026/02/23/usni-news-fleet-and-marine-tracker-feb-23-2026', 'USNI: Fleet and Marine Tracker Feb 23'],
    ['https://www.stripes.com/branches/navy/2026-02-20/ford-middle-east-mediterranean-iran-20813486.html', 'Stars &amp; Stripes: Ford CSG arrives in Mediterranean'],
    ['https://www.meforum.org/mef-reports/americas-military-buildup-around-iran-what-we-know-and-what-it-means', 'MEF: Complete military buildup inventory'],
    ['https://gulfnews.com/world/mena/us-navy-makes-staggering-mideast-force-buildup-one-third-of-deployed-fleet-now-aimed-at-iran-1.500445245', 'Gulf News: 1/3 of deployed fleet aimed at Iran'],
    ['https://www.csis.org/analysis/us-military-middle-east-numbers-behind-trumps-threats-against-iran', 'CSIS: US Military in the Middle East by the Numbers'],
    ['https://www.washingtonpost.com/investigations/2026/02/24/united-states-iran-buildup/', 'WaPo: 150+ US aircraft surge into Middle East'],
    ['https://www.pbs.org/newshour/world/heres-what-we-know-about-the-buildup-of-u-s-military-assets-in-the-middle-east', 'PBS: Military buildup details'],
    ['https://www.nbcnews.com/world/iran/iran-hit-new-protests-us-builds-pressure-nuclear-talks-rcna260211', 'NBC: Iran hit by resurgent protests'],
    ['https://www.aljazeera.com/news/2026/2/24/irans-government-stresses-red-lines-as-students-protest-in-universities', 'Al Jazeera: Iran \u201cred lines\u201d for students'],
    ['https://www.npr.org/2026/02/23/nx-s1-5708935/trumps-sanctions-on-iran-have-dramatically-affected-its-economy-and-led-to-protests', 'NPR: Sanctions and Iran\u2019s economic crisis'],
    ['https://www.amnesty.org/en/latest/news/2026/01/iran-massacre-of-protesters-demands-global-diplomatic-action-to-signal-an-end-to-impunity/', 'Amnesty: Iran protest massacres'],
    ['https://israel-alma.org/iran-situation-assessment-february-2026-the-race-to-rebuild-the-nuclear-and-missile-array-casual-terror-and-the-crink/', 'Alma Center: Iran assessment Feb 2026'],
    ['https://www.axios.com/2026/01/13/pahlavi-witkoff-iran-protest-meeting-trump', 'Axios: Pahlavi secret meeting with Witkoff'],
    ['https://foreignpolicy.com/2026/02/24/tehran-internet-tiered-connectivity-shutdown/', 'Foreign Policy: Iran\u2019s two-tiered internet'],
    ['https://www.britannica.com/event/2026-Iranian-Protests', 'Britannica: 2026 Iranian Protests'],
    ['https://nationalinterest.org/blog/middle-east-watch/the-day-after-khamenei-irans-liberation-will-begin-as-an-irgc-power-struggle', 'National Interest: IRGC power struggle'],
    ['https://www.cnn.com/2026/02/20/europe/britain-air-base-access-us-iran-intl-hnk-ml', 'CNN: Britain blocking air bases'],
    ['https://news.usni.org/2026/02/02/destroyer-uss-truxtun-to-deploy-as-navy-maintains-warship-build-up-in-southern-central-commands', 'USNI: Destroyer buildup in CENTCOM'],
    ['https://www.twz.com/news-features/supercarrier-uss-gerald-r-ford-has-crossed-into-the-mediterranean', 'The War Zone: Ford crosses into Mediterranean'],
    ['https://news.usni.org/2026/01/29/destroyer-delbert-d-black-now-in-red-sea-following-lincoln-strike-group-shift-to-middle-east', 'USNI: Delbert D. Black shifts to Red Sea']
  ];

  function initLayout(activeSection) {
    var BASE = document.documentElement.dataset.basePath || '';

    // Build ticker items (doubled for continuous scroll)
    var tickerItems = TICKER_ITEMS.concat(TICKER_ITEMS).map(function (t) {
      return '<span>' + t + '</span>';
    }).join('');

    // Build nav links
    var navLinks = NAV_ITEMS.map(function (item) {
      var isActive = item.id === activeSection;
      return '<a class="sb-link' + (isActive ? ' active' : '') + '" href="' + BASE + item.href +
        '" data-section="' + item.id + '"><span class="sb-num">' + item.num +
        '</span><span class="sb-dot"></span>' + item.label + '</a>';
    }).join('\n');

    // Build sources HTML for footer
    var sourcesLinks = SOURCES_HTML.map(function (s) {
      return '<a href="' + s[0] + '">' + s[1] + '</a>';
    }).join('\n      ');

    var sharedHTML =
      '<header class="masthead">\n' +
      '  <button class="theme-toggle" id="themeToggle" onclick="toggleTheme()" aria-label="Toggle light/dark mode">\n' +
      '    <span class="toggle-icon" id="toggleIcon">\u2600\uFE0F</span>\n' +
      '    <span id="toggleLabel">Light</span>\n' +
      '  </button>\n' +
      '  <div class="label"><div class="pulse"></div>Developing Situation \u2014 Persian Gulf Theater</div>\n' +
      '  <h1>Iran on the Brink:<br>A Nation at War With Itself</h1>\n' +
      '  <div class="dateline">February 25, 2026 &nbsp;|&nbsp; Compiled from 40+ international sources &nbsp;|&nbsp; Last updated 20:00 UTC</div>\n' +
      '</header>\n' +
      '<div class="ticker-wrap"><div class="ticker">' + tickerItems + '</div></div>\n' +
      '<aside class="left-sidebar collapsed" id="leftSidebar" aria-label="Page navigation">\n' +
      '  <div class="sb-progress"><div class="sb-progress-fill" id="sbProgressFill"></div></div>\n' +
      '  <div class="sb-header" onclick="toggleCollapse()">\n' +
      '    <div><div class="sb-brand">&#9632; Iran Report</div><div class="sb-subtitle">Feb 25, 2026<br>Persian Gulf Theater</div></div>\n' +
      '    <button class="sb-collapse-btn" id="sbCollapseBtn" aria-label="Toggle navigation panel">&#9654;</button>\n' +
      '  </div>\n' +
      '  <nav class="sb-nav">\n' + navLinks + '\n  </nav>\n' +
      '</aside>\n' +
      '<div class="sb-overlay" id="sbOverlay" onclick="closeSidebar()"></div>\n' +
      '<button class="sb-toggle" id="sbToggle" onclick="toggleSidebar()" aria-label="Toggle navigation">' +
      '<span class="sb-toggle-icon">&#x2630;</span><span class="sb-toggle-label">Menu</span></button>';

    var footerHTML =
      '<footer>\n' +
      '  <div class="container">\n' +
      '    <h4 style="font-family:\'JetBrains Mono\',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:16px;color:var(--text-secondary);">Sources</h4>\n' +
      '    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 32px;text-align:left;max-width:900px;margin:0 auto;font-size:12px;">\n' +
      '      ' + sourcesLinks + '\n' +
      '    </div>\n' +
      '    <div style="margin-top:24px;font-size:11px;">Compiled February 25, 2026 &bull; For informational purposes only &bull; 40+ international sources</div>\n' +
      '  </div>\n' +
      '</footer>';

    // Inject shared header elements before the first .container
    var body = document.body;
    var container = body.querySelector('.container');
    var tmp = document.createElement('div');
    tmp.innerHTML = sharedHTML;
    while (tmp.firstChild) {
      body.insertBefore(tmp.firstChild, container);
    }

    // Inject footer after .container
    tmp.innerHTML = footerHTML;
    while (tmp.firstChild) {
      body.appendChild(tmp.firstChild);
    }
  }

  window.initLayout = initLayout;
})();
