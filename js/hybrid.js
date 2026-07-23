(function () {
  'use strict';

  const categoryGroups = {
    MILITARY: 'MILITARY',
    MARITIME: 'MARITIME',
    DIPLOMACY: 'DIPLOMACY',
    OTHER: 'OTHER',
  };

  const scenarioLabels = {
    scenarioDeclaredVictoryPct: 'Declared victory',
    scenarioNegotiatedDealPct: 'Negotiated deal',
    scenarioDemocraticRevolutionPct: 'Democratic revolution',
    scenarioManagedTransitionPct: 'Managed transition',
    scenarioRegimeCollapsePct: 'Regime collapse',
  };

  const state = {
    developments: [],
    activeFilter: 'ALL',
  };

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function normalizeCategory(rawCategory) {
    const category = rawCategory.toUpperCase();
    if (category.includes('MILITARY') || category.includes('CASUALTIES')) return categoryGroups.MILITARY;
    if (category.includes('MARITIME') || category.includes('ECONOMY')) return categoryGroups.MARITIME;
    if (category.includes('DIPLOMACY') || category.includes('POLICY') || category.includes('UN')) return categoryGroups.DIPLOMACY;
    return categoryGroups.OTHER;
  }

  function parseTickerItem(item, index) {
    const divider = item.indexOf(':');
    const rawLabel = divider >= 0 ? item.slice(0, divider).trim() : 'UPDATE';
    const titleAndSource = divider >= 0 ? item.slice(divider + 1).trim() : item;
    const sourceMatch = titleAndSource.match(/\(([^()]+)\)\s*$/);
    const sourceText = sourceMatch ? sourceMatch[1] : 'Source not named';
    const title = sourceMatch ? titleAndSource.slice(0, sourceMatch.index).trim() : titleAndSource;
    const labelParts = rawLabel.split('/');
    const category = labelParts[0] || 'UPDATE';
    const dateMatch = sourceText.match(/([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})/);
    const source = sourceText.replace(/,\s*[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}$/, '');

    return {
      id: index,
      category,
      group: normalizeCategory(category),
      title,
      source,
      date: dateMatch ? dateMatch[1] : '',
    };
  }

  function renderDevelopments() {
    const feed = document.getElementById('developmentFeed');
    const template = document.getElementById('developmentTemplate');
    if (!feed || !template) return;

    const filtered = state.activeFilter === 'ALL'
      ? state.developments
      : state.developments.filter((item) => item.group === state.activeFilter);

    feed.replaceChildren();
    filtered.slice(0, 8).forEach((item) => {
      const fragment = template.content.cloneNode(true);
      fragment.querySelector('.hybrid-category').textContent = item.category;
      fragment.querySelector('.hybrid-item-date').textContent = item.date || 'Current cycle';
      fragment.querySelector('h3').textContent = item.title;
      fragment.querySelector('.hybrid-source').textContent = item.source;
      feed.appendChild(fragment);
    });

    if (filtered.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'hybrid-loading';
      empty.textContent = 'No developments in this category.';
      feed.appendChild(empty);
    }

    setText('developmentCount', `${Math.min(filtered.length, 8)} of ${filtered.length}`);
  }

  function renderScenarios(data) {
    const chart = document.getElementById('scenarioChart');
    if (!chart) return;
    chart.replaceChildren();

    Object.entries(scenarioLabels).forEach(([key, label]) => {
      const value = Number(data[key]) || 0;
      const row = document.createElement('div');
      row.className = 'hybrid-scenario-row';
      row.setAttribute('aria-label', `${label}: ${value} percent`);

      const name = document.createElement('span');
      name.className = 'hybrid-scenario-name';
      name.textContent = label;

      const track = document.createElement('div');
      track.className = 'hybrid-scenario-track';
      const bar = document.createElement('div');
      bar.className = 'hybrid-scenario-bar';
      bar.style.width = `${Math.max(0, Math.min(value, 100))}%`;
      track.appendChild(bar);

      const output = document.createElement('strong');
      output.className = 'hybrid-scenario-value';
      output.textContent = `${value}%`;

      row.append(name, track, output);
      chart.appendChild(row);
    });
  }

  function phaseState(phase) {
    if (!phase) return { label: 'Unavailable', className: 'is-warning' };
    if (phase.status === 'ok') return { label: 'Healthy', className: 'is-ok' };
    if (phase.status === 'skipped') return { label: 'Skipped', className: 'is-warning' };
    return { label: 'Needs review', className: 'is-error' };
  }

  function renderManifest(manifest) {
    const latest = manifest?.updates?.at(-1);
    const search = latest?.phases?.search;
    setText('statResults', search?.uniqueResults ?? '—');
    setText('statDomains', search?.evidenceDomains ?? '—');

    const phases = [
      ['Search', latest?.phases?.search],
      ['Data refresh', latest?.phases?.dataJson],
      ['Timeline', latest?.phases?.timeline],
      ['Analysis zones', latest?.phases?.zones],
    ];

    const ledger = document.getElementById('updateLedger');
    if (ledger) {
      ledger.replaceChildren();
      phases.forEach(([name, phase]) => {
        const status = phaseState(phase);
        const row = document.createElement('div');
        row.className = 'hybrid-ledger-row';
        const label = document.createElement('span');
        label.textContent = name;
        const value = document.createElement('strong');
        value.className = status.className;
        value.textContent = status.label;
        row.append(label, value);
        ledger.appendChild(row);
      });
    }

    const hasError = phases.some(([, phase]) => phase && phase.status === 'error');
    const confidenceDot = document.getElementById('confidenceDot');
    if (hasError) confidenceDot?.classList.add('is-warning');
    setText(
      'confidenceLabel',
      hasError ? 'Moderate confidence · one update phase needs review' : 'High pipeline confidence · all phases healthy',
    );
  }

  function renderData(data) {
    setText('reportDateline', `${data.date} · ${data.lastUpdated}`);
    setText('statUpdated', data.lastUpdated || '—');
    setText('statUpdatedContext', data.date || 'From data.json');

    state.developments = (data.ticker || []).map(parseTickerItem);
    renderDevelopments();
    renderScenarios(data);

    if (state.developments.length > 0) {
      setText('briefingHeadline', state.developments[0].title);
      const second = state.developments[1];
      setText(
        'briefingSummary',
        second
          ? `The newest report leads with ${state.developments[0].group.toLowerCase()} activity. A second major signal concerns ${second.group.toLowerCase()}, while source and pipeline health remain visible alongside the reporting.`
          : 'The latest reporting is loaded from the current project data.',
      );
    }
  }

  function bindFilters() {
    document.querySelectorAll('[data-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        state.activeFilter = button.dataset.filter;
        document.querySelectorAll('[data-filter]').forEach((candidate) => {
          const isSelected = candidate === button;
          candidate.classList.toggle('is-selected', isSelected);
          candidate.setAttribute('aria-pressed', String(isSelected));
        });
        renderDevelopments();
      });
    });
  }

  function applySavedTheme() {
    try {
      if (localStorage.getItem('theme') === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      }
    } catch (_) {
      // Local storage is optional.
    }
  }

  function updateThemeButton() {
    const button = document.getElementById('hybridThemeToggle');
    if (!button) return;
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    button.textContent = isLight ? 'Dark theme' : 'Light theme';
  }

  function bindTheme() {
    const button = document.getElementById('hybridThemeToggle');
    if (!button) return;
    updateThemeButton();
    button.addEventListener('click', () => {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      if (isLight) {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
      }
      try {
        localStorage.setItem('theme', isLight ? 'dark' : 'light');
      } catch (_) {
        // Local storage is optional.
      }
      updateThemeButton();
    });
  }

  async function loadJson(path) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
    return response.json();
  }

  async function initialize() {
    applySavedTheme();
    bindTheme();
    bindFilters();

    try {
      const [data, manifest] = await Promise.all([
        loadJson('data.json'),
        loadJson('data/update-manifest.json'),
      ]);
      renderData(data);
      renderManifest(manifest);
    } catch (error) {
      console.error(error);
      setText('developmentCount', 'Unavailable');
      const feed = document.getElementById('developmentFeed');
      if (feed) {
        feed.innerHTML = '<p class="hybrid-loading">The live project data could not be loaded. Serve the repository over HTTP to view this preview.</p>';
      }
      setText('confidenceLabel', 'Pipeline status unavailable');
      document.getElementById('confidenceDot')?.classList.add('is-error');
    }
  }

  initialize();
})();
