// ===== NAVIGATION: mobile toggle =====
// ===== LEFT SIDEBAR: active section + progress on scroll =====
(function() {
  var sectionIds = ['stats','last-24h','confirmed-unconfirmed','theater','scenarios','analysis','nuclear','strike-forces','military','inside-iran','reactions','opposition','opposition-landscape'];
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
  var scrollTicking = false;
  window.addEventListener('scroll', function() {
    if (!scrollTicking) {
      scrollTicking = true;
      requestAnimationFrame(function() { onScroll(); scrollTicking = false; });
    }
  }, {passive: true});
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

// ===== LEFT SIDEBAR: mobile toggle =====
function toggleSidebar() {
  var sb = document.getElementById('leftSidebar');
  var ov = document.getElementById('sbOverlay');
  var open = sb.classList.toggle('open');
  ov.classList.toggle('open', open);
  setSidebarToggleState(open);
}
function closeSidebar() {
  document.getElementById('leftSidebar').classList.remove('open');
  document.getElementById('sbOverlay').classList.remove('open');
  setSidebarToggleState(false);
}
function setSidebarToggleState(open) {
  var icon = document.querySelector('#sbToggle .sb-toggle-icon');
  var label = document.querySelector('#sbToggle .sb-toggle-label');
  if (icon) icon.textContent = open ? '\u2715' : '\u2630';
  if (label) label.textContent = open ? 'Close' : 'Menu';
}
// Close sidebar when a link is clicked on mobile
document.querySelectorAll('.sb-link').forEach(function(a) {
  a.addEventListener('click', function() {
    if (window.innerWidth <= 900) closeSidebar();
  });
});

// ===== BACK TO TOP BUTTON =====
(function() {
  var backToTopBtn = document.getElementById('backToTop');
  if (!backToTopBtn) return;

  function toggleBackToTop() {
    backToTopBtn.classList.toggle('visible', window.scrollY > 300);
  }

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  var bttTicking = false;
  window.addEventListener('scroll', function() {
    if (!bttTicking) {
      bttTicking = true;
      requestAnimationFrame(function() { toggleBackToTop(); bttTicking = false; });
    }
  }, {passive: true});
  backToTopBtn.addEventListener('click', scrollToTop);

  toggleBackToTop();
})();
