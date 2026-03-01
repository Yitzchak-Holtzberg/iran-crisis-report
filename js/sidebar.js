// ===== LEFT SIDEBAR: active section + progress on scroll =====
(function() {
  var sectionIds = ['stats','last-24h','confirmed-unconfirmed','theater','nuclear','scenarios','analysis','strike-forces','military','inside-iran','reactions','opposition','opposition-landscape'];
  var sbLinks = document.querySelectorAll('.sb-link');
  function onScroll() {
    var scrollY = window.scrollY + 60;
    var active = sectionIds[0];
    for (var i = 0; i < sectionIds.length; i++) {
      var el = document.getElementById(sectionIds[i]);
      if (el && el.getBoundingClientRect().top + window.scrollY <= scrollY) active = sectionIds[i];
    }
    sbLinks.forEach(function(a) {
      var isActive = a.getAttribute('data-section') === active;
      a.classList.toggle('active', isActive);
      if (isActive) {
        a.setAttribute('aria-current', 'true');
      } else {
        a.removeAttribute('aria-current');
      }
    });
    var pct = (window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight)) * 100;
    var fill = document.getElementById('sbProgressFill');
    if (fill) fill.style.width = Math.min(100, Math.max(0, pct)) + '%';
  }
  window.addEventListener('scroll', onScroll, {passive: true});
  onScroll();
})();

// ===== LEFT SIDEBAR: page-pill active state =====
(function() {
  var pathname = window.location.pathname.replace(/.*\//, '') || 'index.html';
  var page = pathname.replace('.html', '') || 'index';
  document.querySelectorAll('.sb-page-pill').forEach(function(pill) {
    var isActive = pill.getAttribute('data-page') === page;
    pill.classList.toggle('active', isActive);
    if (isActive) {
      pill.setAttribute('aria-current', 'page');
    } else {
      pill.removeAttribute('aria-current');
    }
  });
})();

// Close sidebar when a nav link is clicked on mobile (fires the Alpine handler).
document.querySelectorAll('.sb-link').forEach(function(a) {
  a.addEventListener('click', function() {
    if (window.innerWidth <= 900) {
      document.body.dispatchEvent(new CustomEvent('close-sidebar'));
    }
  });
});

// ===== BACK TO TOP BUTTON =====
(function() {
  var backToTopBtn = document.getElementById('backToTop');
  if (!backToTopBtn) return;

  window.addEventListener('scroll', function() {
    backToTopBtn.classList.toggle('visible', window.scrollY > 300);
  }, {passive: true});

  backToTopBtn.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
