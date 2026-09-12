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

      // Attribution Record: who suggested/verified the referee and date/time (DD/MM/YY|HH:MM)
      const attributionWho = ref.suggested_or_verified_by || (refStatus === 'verified' ? 'GTAC Committee' : '');
      const attributionWhen = ref.date_time || '';
      let attributionHtml = '';
      if (attributionWho || attributionWhen) {
        const actionVerb = refStatus === 'verified' ? 'Verified by:' : 'Suggested by:';
        const icon = refStatus === 'verified' ? '🛡️' : '👤';
        attributionHtml = `
          <div class="detail-item detail-row-attribution">
            <span class="detail-icon">${icon}</span>
            <span class="detail-label">${actionVerb}</span>
            <span class="attribution-value">
              <strong>${escapeHtml(attributionWho || 'GTAC Submitter')}</strong>
              ${attributionWhen ? `<span class="attribution-time"><span class="attribution-dot">•</span><code>${escapeHtml(attributionWhen)}</code></span>` : ''}
            </span>
          </div>
        `;
      }

      // Build Review History Table (3 cols: suggested, accepted, submitted; rows: overall, Cycle A-B, Cycle C, Cycle D)
      const statsTableHtml = buildReviewHistoryTableHtml(ref.cycle_stats, database.cycle);

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

        <!-- Middle Section: Details on Left and Stats Table on Right (in white space under badges) -->
        <div class="card-middle-row">
          <div class="card-details-left">
            <div class="detail-row-email">
              <div class="detail-item">
                <span class="detail-icon">✉️</span>
                <span class="detail-label">Email:</span>
                <a href="mailto:${escapeHtml(ref.email)}" class="referee-email-link">${escapeHtml(ref.email)}</a>
              </div>
              <span class="career-status-pill">${escapeHtml(carLabel)}</span>
            </div>

            <div class="detail-item detail-row-affiliation">
              <span class="detail-icon">🏛️</span>
              <span class="detail-label">Affiliation:</span>
              <span class="affiliation-value">${escapeHtml(affLabel)}</span>
            </div>

            ${attributionHtml}
          </div>

          <!-- Review History Table in white space under badges -->
          <div class="card-stats-right">
            ${statsTableHtml}
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
   * Parse cycle stats string from referee record
   * Supports: "52:3/2/2;51:4/4/4;..." or "52:3:2:2;..." or JSON
   */
  function parseRefereeCycleStats(raw) {
    if (!raw || typeof raw !== 'string' || !raw.trim()) {
      return null;
    }
    const map = new Map();
    const trimmed = raw.trim();

    if (trimmed.startsWith('{')) {
      try {
        const obj = JSON.parse(trimmed);
        for (const [k, v] of Object.entries(obj)) {
          const cyc = parseInt(k, 10);
          if (!isNaN(cyc) && v) {
            map.set(cyc, {
              suggested: Number(v.suggested ?? v[0] ?? 0),
              accepted: Number(v.accepted ?? v[1] ?? 0),
              submitted: Number(v.submitted ?? v[2] ?? 0)
            });
          }
        }
        return map.size > 0 ? map : null;
      } catch (e) {}
    }

    const tokens = trimmed.split(';');
    for (const tok of tokens) {
      const t = tok.trim();
      if (!t) continue;
      const m = t.match(/^(\d+)\s*[:=]\s*(\d+)[/:](\d+)[/:](\d+)$/);
      if (m) {
        const cyc = parseInt(m[1], 10);
        map.set(cyc, {
          suggested: parseInt(m[2], 10),
          accepted: parseInt(m[3], 10),
          submitted: parseInt(m[4], 10)
        });
      }
    }
    return map.size > 0 ? map : null;
  }

  /**
   * Determine cell color class: cell-red, cell-yellow, cell-orange, cell-na
   * Cases: few or no acceptance or submission or suggestion -> red
   */
  function getStatCellClass(colType, val, rowStats) {
    if (val === null || val === undefined || isNaN(val)) {
      return 'cell-na';
    }

    const suggested = rowStats ? (rowStats.suggested || 0) : 0;
    const accepted = rowStats ? (rowStats.accepted || 0) : 0;

    if (colType === 'suggested') {
      if (val === 0) return 'cell-red';
      if (val >= 3) return 'cell-orange';
      return 'cell-yellow'; // 1 or 2
    }

    if (colType === 'accepted') {
      if (val === 0) return 'cell-red';
      if (suggested > 0) {
        const ratio = val / suggested;
        if (ratio >= 0.75) return 'cell-orange';
        if (ratio >= 0.40) return 'cell-yellow';
        return 'cell-red';
      }
      return val > 0 ? 'cell-yellow' : 'cell-red';
    }

    if (colType === 'submitted') {
      if (val === 0) return 'cell-red';
      if (accepted > 0) {
        const ratio = val / accepted;
        if (ratio >= 1.0) return 'cell-orange';
        if (ratio >= 0.50) return 'cell-yellow';
        return 'cell-red';
      }
      return val > 0 ? 'cell-yellow' : 'cell-red';
    }

    return 'cell-na';
  }

  /**
   * Build the Review History Table HTML (3 columns: suggested, accepted, submitted; 4 rows: Overall, Cycle A to B, Cycle C, Cycle D)
   */
  function buildReviewHistoryTableHtml(rawStats, activeCycle) {
    const D = parseInt(activeCycle, 10) || 52;
    const C = D - 1; // e.g. 51
    const B = C - 1; // e.g. 50
    const A = B - 4; // e.g. 46 (5 cycles up to C: 46, 47, 48, 49, 50)

    const statsMap = parseRefereeCycleStats(rawStats);

    if (!statsMap) {
      return `
        <div class="referee-stats-box">
          <div class="stats-box-header">
            <span class="stats-box-title">📊 Review History</span>
            <span class="stats-badge-na">Data Not Available</span>
          </div>
          <div class="stats-table-wrapper">
            <table class="referee-stats-table">
              <thead>
                <tr>
                  <th class="col-period">Period</th>
                  <th class="col-stat" title="Suggested Referees">
                    <span class="col-label-full">Suggested</span>
                    <span class="col-label-short">Sugg</span>
                  </th>
                  <th class="col-stat" title="Accepted Reviews">
                    <span class="col-label-full">Accepted</span>
                    <span class="col-label-short">Acc</span>
                  </th>
                  <th class="col-stat" title="Submitted Reports">
                    <span class="col-label-full">Submitted</span>
                    <span class="col-label-short">Subm</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="row-period-label">Overall</td>
                  <td class="cell-na">—</td>
                  <td class="cell-na">—</td>
                  <td class="cell-na">—</td>
                </tr>
                <tr>
                  <td class="row-period-label">Cycle ${A}–${B}</td>
                  <td class="cell-na">—</td>
                  <td class="cell-na">—</td>
                  <td class="cell-na">—</td>
                </tr>
                <tr>
                  <td class="row-period-label">Cycle ${C}</td>
                  <td class="cell-na">—</td>
                  <td class="cell-na">—</td>
                  <td class="cell-na">—</td>
                </tr>
                <tr>
                  <td class="row-period-label">Cycle ${D}</td>
                  <td class="cell-na">—</td>
                  <td class="cell-na">—</td>
                  <td class="cell-na">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    // 1. Overall sum across all recorded cycles
    const overall = { suggested: 0, accepted: 0, submitted: 0 };
    for (const data of statsMap.values()) {
      overall.suggested += data.suggested;
      overall.accepted += data.accepted;
      overall.submitted += data.submitted;
    }

    // 2. Cycle A to B sum (5 cycles up to C)
    const sumAB = { suggested: 0, accepted: 0, submitted: 0 };
    for (let cyc = A; cyc <= B; cyc++) {
      const data = statsMap.get(cyc);
      if (data) {
        sumAB.suggested += data.suggested;
        sumAB.accepted += data.accepted;
        sumAB.submitted += data.submitted;
      }
    }

    // 3. Cycle C (previous cycle)
    const dataC = statsMap.get(C) || { suggested: 0, accepted: 0, submitted: 0 };

    // 4. Cycle D (current cycle from cycle.txt)
    const dataD = statsMap.get(D) || { suggested: 0, accepted: 0, submitted: 0 };

    return `
      <div class="referee-stats-box">
        <div class="stats-box-header">
          <span class="stats-box-title">📊 Review History</span>
        </div>
        <div class="stats-table-wrapper">
          <table class="referee-stats-table">
            <thead>
              <tr>
                <th class="col-period">Period</th>
                <th class="col-stat" title="Proposals where referee was suggested">
                  <span class="col-label-full">Suggested</span>
                  <span class="col-label-short">Sugg</span>
                </th>
                <th class="col-stat" title="Review invitations accepted by referee">
                  <span class="col-label-full">Accepted</span>
                  <span class="col-label-short">Acc</span>
                </th>
                <th class="col-stat" title="Completed review reports submitted">
                  <span class="col-label-full">Submitted</span>
                  <span class="col-label-short">Subm</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="row-period-label">Overall</td>
                <td class="${getStatCellClass('suggested', overall.suggested, overall)}">${overall.suggested}</td>
                <td class="${getStatCellClass('accepted', overall.accepted, overall)}">${overall.accepted}</td>
                <td class="${getStatCellClass('submitted', overall.submitted, overall)}">${overall.submitted}</td>
              </tr>
              <tr>
                <td class="row-period-label">Cycle ${A}–${B}</td>
                <td class="${getStatCellClass('suggested', sumAB.suggested, sumAB)}">${sumAB.suggested}</td>
                <td class="${getStatCellClass('accepted', sumAB.accepted, sumAB)}">${sumAB.accepted}</td>
                <td class="${getStatCellClass('submitted', sumAB.submitted, sumAB)}">${sumAB.submitted}</td>
              </tr>
              <tr>
                <td class="row-period-label">Cycle ${C}</td>
                <td class="${getStatCellClass('suggested', dataC.suggested, dataC)}">${dataC.suggested}</td>
                <td class="${getStatCellClass('accepted', dataC.accepted, dataC)}">${dataC.accepted}</td>
                <td class="${getStatCellClass('submitted', dataC.submitted, dataC)}">${dataC.submitted}</td>
              </tr>
              <tr>
                <td class="row-period-label">Cycle ${D}</td>
                <td class="${getStatCellClass('suggested', dataD.suggested, dataD)}">${dataD.suggested}</td>
                <td class="${getStatCellClass('accepted', dataD.accepted, dataD)}">${dataD.accepted}</td>
                <td class="${getStatCellClass('submitted', dataD.submitted, dataD)}">${dataD.submitted}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
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
    document.addEventListener('DOMContentLoaded', () => {
      init();
      handleDemoParam();
    });
  } else {
    init();
    handleDemoParam();
  }

  function handleDemoParam() {
    const params = new URLSearchParams(window.location.search);
    const demo = params.get('demo');
    if (demo === 'filter') {
      setTimeout(() => {
        if (elFilterName) {
          elFilterName.value = 'Gupta';
          activeFilters.name = 'Gupta';
        }
        activeFilters.expertise = ['EXP_01'];
        renderSelectedExpertiseTags();
        applyFilters();
      }, 400);
    } else if (demo === 'card') {
      setTimeout(() => {
        if (elFilterName) {
          elFilterName.value = 'Gupta';
          activeFilters.name = 'Gupta';
        }
        applyFilters();
        const topNav = document.querySelector('.top-nav');
        const appHeader = document.querySelector('.app-header');
        const filterCard = document.querySelector('.filter-card');
        const count = document.querySelector('.results-summary-bar');
        if (topNav) topNav.style.display = 'none';
        if (appHeader) appHeader.style.display = 'none';
        if (filterCard) filterCard.style.display = 'none';
        if (count) count.style.display = 'none';
        const appContainer = document.querySelector('.app-container');
        const customWidth = params.get('width');
        const isMobileDemo = params.get('mobile') === '1' || params.get('mobile') === 'true';
        if (appContainer) {
          appContainer.style.maxWidth = customWidth ? `${customWidth}px` : (isMobileDemo ? '375px' : '1100px');
          appContainer.style.width = '100%';
          appContainer.style.boxSizing = 'border-box';
        }
        document.body.style.padding = (isMobileDemo || window.innerWidth <= 640) ? '12px 8px' : '24px';
        document.body.style.background = '#f8fafc';
      }, 300);
    }
  }

})();
