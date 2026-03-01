/**
 * js/app.js — Alpine.js page component
 *
 * Defines pageApp(), the x-data component mounted on <body>.
 * Manages:
 *   • Sidebar collapse / mobile-open state (replaces imperative toggle fns)
 *   • Light / dark theme state (replaces theme.js state management)
 *   • Leaflet map tile swap on theme change (carried over from theme.js)
 *
 * Scroll tracking (active section + progress bar) and back-to-top remain as
 * vanilla JS in sidebar.js since they require raw scroll event listeners.
 */

function pageApp() {
  return {
    sidebarCollapsed: true,
    mobileOpen: false,
    theme: (function () {
      try { return localStorage.getItem('theme') || 'dark'; } catch (e) { return 'dark'; }
    }()),

    init() {
      // Restore theme immediately so the map tile layer initialises with the
      // correct style (map.js reads data-theme before adding the tile layer).
      this._applyTheme(this.theme);

      // Mobile: fire toggleTheme immediately on touchend to avoid the 300ms
      // tap delay on iOS Safari (matches previous behaviour in theme.js).
      var btn = document.getElementById('themeToggle');
      if (btn) {
        btn.addEventListener('touchend', (e) => {
          e.preventDefault();
          this.toggleTheme();
        }, { passive: false });
      }

      // Allow vanilla JS (sidebar.js mobile-link clicks) to close the panel.
      document.body.addEventListener('close-sidebar', () => {
        this.mobileOpen = false;
      });
    },

    toggleCollapse() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    },

    toggleMobile() {
      this.mobileOpen = !this.mobileOpen;
    },

    closeMobile() {
      this.mobileOpen = false;
    },

    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light';
      this._applyTheme(this.theme);
      try { localStorage.setItem('theme', this.theme); } catch (e) {}
      // Swap Leaflet basemap between dark and light CartoDB styles.
      // Uses the same tile URLs as map.js init so the style is consistent
      // whether the user loads in light mode or toggles to it.
      if (window._theaterMap && window._theaterTileLayer) {
        window._theaterMap.removeLayer(window._theaterTileLayer);
        var url = this.theme === 'light'
          ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}{r}.png';
        window._theaterTileLayer = L.tileLayer(url, { maxZoom: 19, subdomains: 'abcd' })
          .addTo(window._theaterMap);
      }
    },

    _applyTheme(t) {
      if (t === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    },
  };
}
