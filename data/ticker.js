/* ===== BREAKING NEWS TICKER HEADLINES — Feb 25, 2026 ===== *
 * Edit this array to update ticker content.               *
 * The script doubles the items automatically for the      *
 * seamless CSS translateX(-50%) loop animation.           */

var TICKER_ITEMS = [
  'BREAKING: Trump warns Iran in State of the Union \u2014 \u201cI will never allow the world\u2019s #1 sponsor of terror to have a nuclear weapon\u201d',
  'IRAN RESPONDS: Foreign Ministry calls Trump\u2019s claims \u201cbig lies\u201d \u2014 says deal \u201cwithin reach\u201d',
  'IRAN UN LETTER: \u201cAll bases, facilities and assets of the hostile force in the region would constitute legitimate targets\u201d',
  'CIA: Releases Farsi-language video recruiting Iranian informants \u2014 Tor, VPN, disposable device instructions published on X, Instagram & YouTube',
  'IRAN CONDEMNS CIA campaign \u2014 seizes Starlink equipment found in diplomat\u2019s luggage',
  'STUDENT PROTESTS: Day 5 \u2014 universities across all 31 provinces in revolt; Sharif Univ website hacked; 50K Iranians receive pro-Trump text messages',
  'PARCHIN: Satellite imagery shows Iran placed concrete/soil shield over nuclear site to protect against US strikes',
  'NAVY: 25+ US warships now in region \u2014 Ford CSG in Eastern Mediterranean (Souda Bay, Crete), Lincoln CSG in Arabian Sea \u2014 600+ Tomahawks ready',
  'JORDAN + SAUDI ARABIA: Both nations deny US use of their airspace for Iran strikes \u2014 despite hosting US aircraft',
  'GENEVA: Round 3 nuclear talks Thursday \u2014 Iran\u2019s Araghchi heading to Switzerland',
  'TRUMP DEADLINE: 10-day ultimatum expires early March \u2014 all US forces \u201cin place by mid-March\u201d',
  'CHINA: Anti-ship missile supply deal with Tehran raises stakes for US carrier groups',
  'UK: Starmer blocks US use of RAF Fairford & Diego Garcia for Iran strikes',
  'US PULLS F-35s from NATO Cold Response 2026 exercise in Norway \u2014 assets redirected to Middle East',
  'RIAL: Currency collapse \u2014 1.47 million rials to the dollar \u2014 Iran\u2019s largest bank ran dry in December',
  'USS GEORGE H.W. BUSH: Third carrier spinning up at Norfolk for possible deployment'
];

/* Inject ticker items into the .ticker element.
   Items are doubled so the CSS animation loops seamlessly. */
document.addEventListener('DOMContentLoaded', function () {
  var ticker = document.querySelector('.ticker');
  if (!ticker) { return; }
  var doubled = TICKER_ITEMS.concat(TICKER_ITEMS);
  doubled.forEach(function (item) {
    var span = document.createElement('span');
    span.textContent = item;
    ticker.appendChild(span);
  });
});
