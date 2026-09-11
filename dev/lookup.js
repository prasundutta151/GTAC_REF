/**
 * GTAC Referee Directory & Lookup Application Logic
 * Giant Metrewave Radio Telescope (NCRA-TIFR)
 */

(function () {
  'use strict';

  // State
  let database = {
    cycle: '52',
    affiliations: [],
    expertise: [],
    career_status: [],
    referees: []
  };

  let activeFilters = {
    name: '',
    email: '',
    affiliation: '',
    career_status: '',
    expertise: [], // Array of selected expertise IDs
    status: 'all'  // 'all', 'verified', 'suggested', 'unavailable'
  };

  // Lookup maps for human-readable translation
  const affMap = new Map();
  const expMap = new Map();
  const carMap = new Map();

  // DOM Elements
  const elConnectionBadge = document.getElementById('connection-status-badge');
  const elFilterName = document.getElementById('filter-name');
  const elFilterEmail = document.getElementById('filter-email');
  const elFilterAffiliation = document.getElementById('filter-affiliation');
  const elFilterCareer = document.getElementById('filter-career');
  const elFilterExpertise = document.getElementById('filter-expertise-select');
  const elSelectedExpTags = document.getElementById('selected-expertise-tags');
  const elStatusPills = document.querySelectorAll('.status-pill');
  const elBtnReset = document.getElementById('btn-reset-filters');
  const elResultsCount = document.getElementById('results-count');
  const elRefereesList = document.getElementById('referees-list');

  /**
   * Initialize Application
   */
  async function init() {
    setupEventListeners();
    await loadDatabase();
    populateFilterDropdowns();
    applyFilters();
  }

  /**
   * Load Database from API or embedded fallback
   */
  async function loadDatabase() {
    updateConnectionBadge('loading', 'Connecting to database...');

    let loaded = false;

    // 1. Attempt API fetch (Server mode)
    try {
      const resp = await fetch('/api/database', { cache: 'no-cache' });
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.referees && data.referees.length > 0) {
          database = data;
          loaded = true;
          updateConnectionBadge('server', 'Live Server Mode');
        }
      }
    } catch (e) {
      // Offline or file:// mode, fallback gracefully
    }

    // 2. Fallback to embedded window.GTAC_DATABASE (db_data.js)
    if (!loaded) {
      if (window.GTAC_DATABASE && window.GTAC_DATABASE.referees) {
        database = window.GTAC_DATABASE;
        updateConnectionBadge('local', 'Offline / Standalone Bundle');
      } else {
        updateConnectionBadge('offline', 'Database Offline');
      }
    }

    // Populate Translation Maps
    affMap.clear();
    (database.affiliations || []).forEach(a => affMap.set(a.id, a.label));

    expMap.clear();
    (database.expertise || []).forEach(e => expMap.set(e.id, e.label));

    carMap.clear();
    (database.career_status || []).forEach(c => carMap.set(c.id, c.label));
  }

  /**
   * Update Connection Status Badge
   */
  function updateConnectionBadge(state, text) {
    if (!elConnectionBadge) return;
    elConnectionBadge.className = 'connection-badge';
    if (state === 'server') {
      elConnectionBadge.classList.add('status-connected');
      elConnectionBadge.textContent = `● ${text}`;
    } else if (state === 'local') {
      elConnectionBadge.classList.add('status-local');
      elConnectionBadge.textContent = `● ${text}`;
    } else if (state === 'loading') {
      elConnectionBadge.classList.add('status-checking');
      elConnectionBadge.textContent = `⏳ ${text}`;
    } else {
      elConnectionBadge.classList.add('status-offline');
      elConnectionBadge.textContent = `⚠️ ${text}`;
    }
  }

  /**
   * Strip honorific prefixes (Dr, Prof, etc.)
   */
  function stripTitles(name) {
    if (!name) return '';
    return name
      .replace(/^(Dr\.?|Prof\.?|Professor|Mr\.?|Ms\.?|Mrs\.?|Shri|Smt\.?)\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Match half-initials with full surname (e.g. "Y. Gupta" matches "Yashwant Gupta")
   */
  function matchHalfInitials(query, target) {
    if (!query || !target) return false;
    const cleanQ = stripTitles(query).toLowerCase();
    const cleanT = stripTitles(target).toLowerCase();

    if (cleanT.includes(cleanQ)) return true;

    const qTokens = cleanQ.split(/\s+/).filter(Boolean);
    const tTokens = cleanT.split(/\s+/).filter(Boolean);

    if (qTokens.length < 2 || tTokens.length < 2) return false;

    const qLast = qTokens[qTokens.length - 1];
    const tLast = tTokens[tTokens.length - 1];

    if (qLast !== tLast) return false;

    // Check initials of first name(s)
    const qInitials = qTokens.slice(0, -1).map(tok => tok.replace(/\./g, '')[0]);
    const tInitials = tTokens.slice(0, -1).map(tok => tok[0]);

    if (qInitials.length <= tInitials.length) {
      return qInitials.every((init, i) => init === tInitials[i]);
    }
    return false;
  }

  /**
   * Populate Filter Dropdowns with Human-Readable Labels
   */
  function populateFilterDropdowns() {
    // 1. Affiliations
    if (elFilterAffiliation) {
      const sortedAffs = [...(database.affiliations || [])].sort((a, b) => a.label.localeCompare(b.label));
      elFilterAffiliation.innerHTML = '<option value="">All Affiliations / Institutions</option>';
      sortedAffs.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = a.label;
        elFilterAffiliation.appendChild(opt);
      });
    }

    // 2. Career Statuses
    if (elFilterCareer) {
      elFilterCareer.innerHTML = '<option value="">All Career Statuses</option>';
      (database.career_status || []).forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.label;
        elFilterCareer.appendChild(opt);
      });
    }

    // 3. Expertise Areas
    if (elFilterExpertise) {
      const sortedExp = [...(database.expertise || [])].sort((a, b) => a.label.localeCompare(b.label));
      elFilterExpertise.innerHTML = '<option value="">+ Add Expertise Filter Area...</option>';
      sortedExp.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = e.label;
        elFilterExpertise.appendChild(opt);
      });
    }
  }

  /**
   * Setup Event Listeners
   */
  function setupEventListeners() {
    // Debounced text inputs
    if (elFilterName) {
      elFilterName.addEventListener('input', () => {
        activeFilters.name = elFilterName.value.trim();
        applyFilters();
      });
    }

    if (elFilterEmail) {
      elFilterEmail.addEventListener('input', () => {
        activeFilters.email = elFilterEmail.value.trim().toLowerCase();
        applyFilters();
      });
    }

    // Dropdown filters
    if (elFilterAffiliation) {
      elFilterAffiliation.addEventListener('change', () => {
        activeFilters.affiliation = elFilterAffiliation.value;
        applyFilters();
      });
    }

    if (elFilterCareer) {
      elFilterCareer.addEventListener('change', () => {
        activeFilters.career_status = elFilterCareer.value;
        applyFilters();
      });
    }

    // Expertise filter multi-select
    if (elFilterExpertise) {
      elFilterExpertise.addEventListener('change', () => {
        const expId = elFilterExpertise.value;
        if (expId && !activeFilters.expertise.includes(expId)) {
          activeFilters.expertise.push(expId);
          renderSelectedExpertiseTags();
          applyFilters();
        }
        elFilterExpertise.value = '';
      });
    }

    // Status Pill Buttons
    elStatusPills.forEach(pill => {
      pill.addEventListener('click', () => {
        elStatusPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeFilters.status = pill.dataset.status || 'all';
        applyFilters();
      });
    });

    // Reset Filters Button
    if (elBtnReset) {
      elBtnReset.addEventListener('click', resetFilters);
    }
  }

  /**
   * Render Selected Expertise Tags in Filter Bar
   */
  function renderSelectedExpertiseTags() {
    if (!elSelectedExpTags) return;
    elSelectedExpTags.innerHTML = '';

    activeFilters.expertise.forEach(expId => {
      const label = expMap.get(expId) || expId;
      const chip = document.createElement('span');
      chip.className = 'filter-tag-chip';
      chip.innerHTML = `
        <span>🏷️ ${escapeHtml(label)}</span>
        <button type="button" title="Remove filter" data-id="${expId}">&times;</button>
      `;
      chip.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        activeFilters.expertise = activeFilters.expertise.filter(id => id !== expId);
        renderSelectedExpertiseTags();
        applyFilters();
      });
      elSelectedExpTags.appendChild(chip);
    });
  }

  /**
   * Reset All Filters
   */
  function resetFilters() {
    activeFilters = {
      name: '',
      email: '',
      affiliation: '',
      career_status: '',
      expertise: [],
      status: 'all'
    };

    if (elFilterName) elFilterName.value = '';
    if (elFilterEmail) elFilterEmail.value = '';
    if (elFilterAffiliation) elFilterAffiliation.value = '';
    if (elFilterCareer) elFilterCareer.value = '';
    if (elFilterExpertise) elFilterExpertise.value = '';

    elStatusPills.forEach(p => {
      p.classList.toggle('active', p.dataset.status === 'all');
    });

    renderSelectedExpertiseTags();
    applyFilters();
  }

  /**
   * Filter and Render Referee Cards
   */
  function applyFilters() {
    const referees = database.referees || [];

    const filtered = referees.filter(r => {
      // 1. Status & Availability Filter
      const isAvailable = String(r.available).toLowerCase() === 'true';
      const refStatus = (r.referee_status || '').toLowerCase();

      if (activeFilters.status === 'verified') {
        if (refStatus !== 'verified' || !isAvailable) return false;
      } else if (activeFilters.status === 'suggested') {
        if (refStatus !== 'suggested' || !isAvailable) return false;
      } else if (activeFilters.status === 'unavailable') {
        if (isAvailable) return false;
      }

      // 2. Name Search
      if (activeFilters.name) {
        const qName = activeFilters.name;
        const rName = r.referee_name || '';
        if (!rName.toLowerCase().includes(qName.toLowerCase()) && !matchHalfInitials(qName, rName)) {
          return false;
        }
      }

      // 3. Email Search
      if (activeFilters.email) {
        const rEmail = (r.email || '').toLowerCase();
        if (!rEmail.includes(activeFilters.email)) {
          return false;
        }
      }

      // 4. Affiliation Filter
      if (activeFilters.affiliation) {
        if (r.affiliation !== activeFilters.affiliation) {
          return false;
        }
      }

      // 5. Career Status Filter
      if (activeFilters.career_status) {
        if (r.career_status !== activeFilters.career_status) {
          return false;
        }
      }

      // 6. Expertise Multi-Select Filter (OR match: referee must have at least one of selected areas)
      if (activeFilters.expertise.length > 0) {
        const rExpList = (r.expertise || '').split(';').map(x => x.trim()).filter(Boolean);
        const hasAny = activeFilters.expertise.some(eId => rExpList.includes(eId));
        if (!hasAny) return false;
      }

      return true;
    });

    renderResultsCount(filtered.length, referees.length);
    renderRefereeCards(filtered);
  }

  /**
   * Render Results Count Summary
   */
  function renderResultsCount(count, total) {
    if (!elResultsCount) return;
    if (count === total) {
      elResultsCount.innerHTML = `Showing all <strong>${total}</strong> referees`;
    } else {
      elResultsCount.innerHTML = `Showing <strong>${count}</strong> of <strong>${total}</strong> referees`;
    }
  }

  /**
   * Render Referee List as Color-Coded Rectangular Row Cards
   */
  function renderRefereeCards(list) {
    if (!elRefereesList) return;
    elRefereesList.innerHTML = '';

    if (list.length === 0) {
      elRefereesList.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-state-icon">🔍</div>
          <h3>No Referees Found</h3>
          <p>No referee records match your current filter selection. Try removing some filters or clicking "Reset Filters".</p>
          <button type="button" class="btn-reset" onclick="document.getElementById('btn-reset-filters').click()">
            ↺ Clear All Filters
          </button>
        </div>
      `;
      return;
    }

    list.forEach(ref => {
      const isAvailable = String(ref.available).toLowerCase() === 'true';
      const refStatus = (ref.referee_status || '').toLowerCase();

      // Determine Card Color Scheme:
      // - Red: not available
      // - Orange: verified (and available)
      // - Yellow: suggested (and available)
      let cardClass = '';
      let statusBadgeHtml = '';
      let availBadgeHtml = '';

      if (!isAvailable) {
        cardClass = 'card-unavailable';
        statusBadgeHtml = '<span class="badge-status">🔴 Not Available</span>';
        availBadgeHtml = '<span class="badge-availability available-no">⛔ Unavailable this Cycle</span>';
      } else if (refStatus === 'verified') {
        cardClass = 'card-verified';
        statusBadgeHtml = '<span class="badge-status">🟠 Verified Referee</span>';
        availBadgeHtml = '<span class="badge-availability available-yes">🟢 Available for Review</span>';
      } else {
        // suggested
        cardClass = 'card-suggested';
        statusBadgeHtml = '<span class="badge-status">🟡 Suggested Referee</span>';
        availBadgeHtml = '<span class="badge-availability available-yes">🟢 Available for Review</span>';
      }

      // Human-readable values
      const affLabel = affMap.get(ref.affiliation) || ref.affiliation || 'Unknown Institution';
      const carLabel = carMap.get(ref.career_status) || ref.career_status || 'Researcher';

      // Expertise human-readable chips
      const expCodes = (ref.expertise || '').split(';').map(x => x.trim()).filter(Boolean);
      const expChipsHtml = expCodes.map(code => {
        const label = expMap.get(code) || code;
        return `<span class="expertise-chip">🏷️ ${escapeHtml(label)}</span>`;
      }).join('');

      const card = document.createElement('div');
      card.className = `referee-row-card ${cardClass}`;
      card.innerHTML = `
        <!-- Top Identity & Status Row -->
        <div class="card-top-row">
          <div class="referee-identity">
            <span class="referee-id-pill">${escapeHtml(ref.unique_id || 'REF')}</span>
            <span class="referee-name-text">${escapeHtml(ref.referee_name || 'Anonymous')}</span>
          </div>
          <div class="card-badges-group">
            ${availBadgeHtml}
            ${statusBadgeHtml}
          </div>
        </div>

        <!-- Middle Details Grid (Email, Affiliation, Career) -->
        <div class="card-details-grid">
          <div class="detail-item">
            <span class="detail-icon">✉️</span>
            <span class="detail-label">Email:</span>
            <a href="mailto:${escapeHtml(ref.email)}" class="referee-email-link">${escapeHtml(ref.email)}</a>
          </div>

          <div class="detail-item">
            <span class="detail-icon">🏛️</span>
            <span class="detail-label">Affiliation:</span>
            <span class="affiliation-value">${escapeHtml(affLabel)}</span>
          </div>

          <div class="detail-item">
            <span class="detail-icon">🎓</span>
            <span class="detail-label">Status:</span>
            <span class="career-status-pill">${escapeHtml(carLabel)}</span>
          </div>
        </div>

        <!-- Bottom Expertise Areas Row -->
        <div class="card-expertise-section">
          <span class="expertise-heading">Expertise Domains:</span>
          <div class="expertise-chips-wrap">
            ${expChipsHtml || '<span style="color:#94a3b8; font-size:0.85rem;">No expertise listed</span>'}
          </div>
        </div>
      `;

      elRefereesList.appendChild(card);
    });
  }

  /**
   * Escape HTML utility
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Kickoff on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
