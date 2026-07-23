(function () {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const menuButton = document.getElementById('atlasMenuToggle');
  const globalNav = document.getElementById('atlasGlobalNav');
  const themeButton = document.getElementById('atlasThemeToggle');
  const backToTop = document.getElementById('atlasBackToTop');
  const localLinks = Array.from(document.querySelectorAll('.atlas-local-link'));

  function updateThemeLabel() {
    if (!themeButton) return;
    const isLight = root.getAttribute('data-theme') === 'light';
    const label = themeButton.querySelector('span');
    const icon = themeButton.querySelector('i');
    const nextTheme = isLight ? 'Dark theme' : 'Light theme';
    if (label) label.textContent = nextTheme;
    if (icon) icon.className = isLight ? 'ph ph-moon' : 'ph ph-sun';
    themeButton.setAttribute('aria-label', nextTheme);
  }

  function setMenu(open) {
    if (!menuButton || !globalNav) return;
    body.classList.toggle('atlas-menu-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close report menu' : 'Open report menu');
    const label = menuButton.querySelector('span');
    const icon = menuButton.querySelector('i');
    if (label) label.textContent = open ? 'Close' : 'Menu';
    if (icon) icon.className = open ? 'ph ph-x' : 'ph ph-list';
  }

  function enhanceLatestTimeline() {
    if (body.dataset.page !== 'index') return;
    const header = document.getElementById('last-24h');
    const card = header?.nextElementSibling;
    if (!card?.classList.contains('card')) return;

    card.classList.add('atlas-latest-card');

    card.querySelectorAll('.tl-item').forEach((item, index) => {
      if (index >= 3) item.classList.add('atlas-latest-extra');
    });

    Array.from(card.querySelectorAll('.last24-day-header'))
      .slice(1)
      .forEach((dayHeader) => dayHeader.classList.add('atlas-latest-secondary'));

    card.querySelectorAll('.tl-show-more').forEach((button) => {
      button.hidden = true;
    });

    const toggle = document.createElement('button');
    toggle.className = 'atlas-latest-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = 'Show the full latest timeline';
    toggle.addEventListener('click', () => {
      const expanded = card.classList.toggle('is-expanded');
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.textContent = expanded ? 'Show the concise timeline' : 'Show the full latest timeline';
      if (expanded) {
        card.querySelectorAll('.timeline').forEach((timeline) => timeline.classList.remove('collapsed'));
      }
    });
    card.insertAdjacentElement('afterend', toggle);
  }

  function buildAreaInterface(mapContainer) {
    const areas = window.IRAN_REPORT_ATLAS_AREAS || [];
    if (!areas.length || mapContainer.querySelector('.atlas-area-dock')) return;

    const caption = document.createElement('div');
    caption.className = 'atlas-map-caption';
    caption.innerHTML = '<span>Regional picture</span><strong>Select an important area</strong>';

    const dock = document.createElement('nav');
    dock.className = 'atlas-area-dock';
    dock.setAttribute('aria-label', 'Important areas on the map');

    const buttons = new Map();
    areas.forEach((area) => {
      const button = document.createElement('button');
      const number = document.createElement('span');
      const copy = document.createElement('span');
      const label = document.createElement('strong');
      const kicker = document.createElement('small');

      button.type = 'button';
      button.className = 'atlas-area-dock-button';
      button.dataset.areaId = area.id;
      button.setAttribute('aria-pressed', 'false');
      number.className = 'atlas-area-dock-number';
      copy.className = 'atlas-area-dock-copy';
      number.textContent = area.number;
      label.textContent = area.label;
      kicker.textContent = area.kicker;
      copy.append(label, kicker);
      button.append(number, copy);

      button.addEventListener('click', () => {
        if (window._selectAtlasArea) window._selectAtlasArea(area.id, true);
        else window._pendingAtlasAreaId = area.id;
      });

      buttons.set(area.id, button);
      dock.appendChild(button);
    });

    const panel = document.createElement('aside');
    panel.className = 'atlas-area-panel';
    panel.id = 'atlasAreaPanel';
    panel.setAttribute('aria-live', 'polite');
    panel.setAttribute('aria-hidden', 'true');

    const panelRule = document.createElement('span');
    panelRule.className = 'atlas-area-panel-rule';
    const panelClose = document.createElement('button');
    panelClose.className = 'atlas-area-panel-close';
    panelClose.type = 'button';
    panelClose.setAttribute('aria-label', 'Close area summary');
    panelClose.innerHTML = '<i class="ph ph-x" aria-hidden="true"></i>';
    const panelKicker = document.createElement('p');
    panelKicker.className = 'atlas-area-panel-kicker';
    const panelTitle = document.createElement('h2');
    const panelSummary = document.createElement('p');
    panelSummary.className = 'atlas-area-panel-summary';
    const panelLink = document.createElement('a');
    panelLink.className = 'atlas-area-panel-link';
    panelLink.innerHTML = '<span></span><i class="ph ph-arrow-up-right" aria-hidden="true"></i>';

    panel.append(panelRule, panelClose, panelKicker, panelTitle, panelSummary, panelLink);

    function renderArea(area) {
      panel.style.setProperty('--area-color', area.color);
      panelKicker.textContent = `${area.number} · ${area.kicker}`;
      panelTitle.textContent = area.label;
      panelSummary.textContent = area.summary;
      panelLink.href = area.href;
      panelLink.querySelector('span').textContent = area.linkLabel;
      panel.setAttribute('aria-hidden', 'false');
      panel.classList.add('is-visible');
      mapContainer.classList.add('has-selected-area');

      buttons.forEach((button, id) => {
        const selected = id === area.id;
        button.classList.toggle('is-active', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
    }

    function resetInterface() {
      panel.setAttribute('aria-hidden', 'true');
      panel.classList.remove('is-visible');
      mapContainer.classList.remove('has-selected-area');
      buttons.forEach((button) => {
        button.classList.remove('is-active');
        button.setAttribute('aria-pressed', 'false');
      });
    }

    panelClose.addEventListener('click', () => {
      if (window._resetAtlasAreas) window._resetAtlasAreas(true);
      else resetInterface();
    });

    document.addEventListener('atlas:area-selected', (event) => renderArea(event.detail));
    document.addEventListener('atlas:area-reset', resetInterface);

    mapContainer.append(caption, panel, dock);
  }

  function mountOverviewMap() {
    if (body.dataset.page !== 'index') return;

    const slot = document.getElementById('atlasOverviewMapSlot');
    const theaterHeading = document.getElementById('theater');
    const mapContainer = theaterHeading?.nextElementSibling;
    if (!slot || !mapContainer?.classList.contains('map-container')) return;

    theaterHeading.hidden = true;
    mapContainer.classList.add('atlas-overview-map');
    slot.replaceChildren(mapContainer);

    const details = Array.from(mapContainer.children)
      .find((child) => child !== mapContainer.querySelector('.map-search-wrap')
        && child.id !== 'theater-map');

    if (details) {
      details.classList.add('atlas-map-details');

      const toggle = document.createElement('button');
      const icon = document.createElement('i');
      const label = document.createElement('span');
      toggle.className = 'atlas-map-details-toggle';
      toggle.id = 'atlasMapDetailsToggle';
      toggle.type = 'button';
      toggle.setAttribute('aria-expanded', 'false');
      icon.className = 'ph ph-sliders-horizontal';
      icon.setAttribute('aria-hidden', 'true');
      label.textContent = 'Map details';
      toggle.append(icon, label);

      toggle.addEventListener('click', () => {
        const expanded = mapContainer.classList.toggle('is-map-details-open');
        toggle.setAttribute('aria-expanded', String(expanded));
        label.textContent = expanded ? 'Close details' : 'Map details';
        window.setTimeout(() => window._theaterMap?.resize(), 40);
      });

      mapContainer.appendChild(toggle);
    }

    buildAreaInterface(mapContainer);
    window.setTimeout(() => window._theaterMap?.resize(), 160);
  }

  function observeSections() {
    if (!localLinks.length || !('IntersectionObserver' in window)) return;

    const linksById = new Map(localLinks.map((link) => [link.dataset.section, link]));
    const sections = localLinks
      .map((link) => document.getElementById(link.dataset.section))
      .filter(Boolean);

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!visible) return;
      localLinks.forEach((link) => link.classList.remove('is-active'));
      const active = linksById.get(visible.target.id);
      active?.classList.add('is-active');
    }, { rootMargin: '-18% 0px -70% 0px', threshold: 0 });

    sections.forEach((section) => observer.observe(section));
  }

  function enhanceScenarioCharts() {
    document.querySelectorAll('.treemap-container').forEach((chart) => {
      const scenarioHeading = document.getElementById('scenarios');
      if (scenarioHeading && scenarioHeading.nextElementSibling !== chart) {
        scenarioHeading.insertAdjacentElement('afterend', chart);
      }
    });

    document.querySelectorAll('.treemap-cell').forEach((cell) => {
      const valueText = cell.querySelector('.treemap-cell-pct')?.textContent || '0';
      const value = Math.max(0, Math.min(100, Number.parseFloat(valueText) || 0));
      const meter = document.createElement('div');
      const fill = document.createElement('span');
      meter.className = 'atlas-scenario-meter';
      meter.setAttribute('aria-hidden', 'true');
      fill.style.width = `${value}%`;
      meter.appendChild(fill);
      cell.appendChild(meter);
      cell.setAttribute('aria-label', `${cell.querySelector('.treemap-cell-label')?.textContent || 'Scenario'}: ${value} percent`);
    });

    document.querySelectorAll('.treemap-footnote').forEach((footnote) => {
      footnote.textContent = `Bars show the current analyst consensus probability. Reassessed ${document.querySelector('.atlas-header-meta span')?.textContent || 'for this briefing'}. Percentages sum to 100%.`;
    });
  }

  menuButton?.addEventListener('click', () => {
    setMenu(!body.classList.contains('atlas-menu-open'));
  });

  globalNav?.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenu(false);
  });

  themeButton?.addEventListener('click', () => {
    const isLight = root.getAttribute('data-theme') === 'light';
    if (isLight) root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', 'light');
    try {
      localStorage.setItem('atlas-theme', isLight ? 'dark' : 'light');
    } catch (_) {
      // Theme persistence is optional.
    }
    updateThemeLabel();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1040) setMenu(false);
  });

  window.addEventListener('scroll', () => {
    backToTop?.classList.toggle('is-visible', window.scrollY > 900);
  }, { passive: true });

  backToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  setMenu(false);
  mountOverviewMap();
  updateThemeLabel();
  enhanceLatestTimeline();
  enhanceScenarioCharts();
  observeSections();
})();
