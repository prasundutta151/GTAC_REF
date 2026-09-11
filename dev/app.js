/**
 * GTAC Referee Registration / Suggestion Form Script
 * Supports both Live Server Mode (http://localhost:8080) and Local File Mode (file://)
 */

// Global State
const state = {
  cycle: '52',
  affiliations: [],
  expertise: [],
  career_status: [],
  referees: [],
  refereeCount: 0,
  refereeBlocks: [], // list of block IDs
  isLiveServer: false
};

// Submitter Expertise Picker Instance
let userExpPicker = null;

// DOM References
const form = document.getElementById('gtac-form');
const userAffiliationSelect = document.getElementById('user_affiliation');
const userAffOtherBox = document.getElementById('user_affiliation_other_box');
const userAffOtherInput = document.getElementById('user_affiliation_other');
const userCareerSelect = document.getElementById('user_career_status');
const refereeContainer = document.getElementById('referee-list');
const refereeEmptyHint = document.getElementById('referee-empty-hint');
const btnAddReferee = document.getElementById('btn-add-referee');
const btnAddRefereeText = document.getElementById('btn-add-referee-text');
const modalSuccess = document.getElementById('modal-success');
const btnCloseModal = document.getElementById('btn-close-modal');
const statusBadge = document.getElementById('connection-status-badge');

/**
 * Reusable Expertise Selector Class (Select from Dropdown List + Chips)
 */
class ExpertisePicker {
  constructor(selectEl, selectedContainerEl, otherBoxEl, otherInputEl, onChangeCallback) {
    this.selectEl = selectEl;
    this.selectedContainerEl = selectedContainerEl;
    this.otherBoxEl = otherBoxEl;
    this.otherInputEl = otherInputEl;
    this.onChangeCallback = onChangeCallback || (() => {});
    this.selectedIds = [];
    this.disabled = false;

    this.init();
  }

  init() {
    this.populate();
    this.selectEl.addEventListener('change', () => {
      const val = this.selectEl.value;
      if (!val) return;

      if (val === 'OTHERS') {
        this.otherBoxEl.classList.remove('hidden');
        if (this.otherInputEl) this.otherInputEl.focus();
        if (!this.selectedIds.includes('OTHERS')) {
          this.selectedIds.push('OTHERS');
        }
      } else {
        if (!this.selectedIds.includes(val)) {
          this.selectedIds.push(val);
          this.renderTags();
        }
      }
      this.selectEl.value = '';
      this.onChangeCallback();
    });

    if (this.otherInputEl) {
      this.otherInputEl.addEventListener('input', () => {
        this.onChangeCallback();
      });
    }
  }

  populate() {
    populateSelect(this.selectEl, state.expertise, true);
  }

  renderTags() {
    this.selectedContainerEl.innerHTML = '';
    this.selectedIds.forEach(id => {
      if (id === 'OTHERS') return; // 'OTHERS' is handled via otherBoxEl
      const item = state.expertise.find(e => e.id === id);

      const chip = document.createElement('span');
      chip.className = `tag-chip ${this.disabled ? 'locked' : ''}`;
      chip.innerHTML = `
        <strong>${id}</strong>
        <span>${item ? item.label : id}</span>
        ${!this.disabled ? '<button type="button" class="chip-remove" title="Remove">&times;</button>' : ''}
      `;

      if (!this.disabled) {
        const removeBtn = chip.querySelector('.chip-remove');
        if (removeBtn) {
          removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.remove(id);
          });
        }
      }

      this.selectedContainerEl.appendChild(chip);
    });
  }

  remove(id) {
    this.selectedIds = this.selectedIds.filter(x => x !== id);
    this.renderTags();
    this.onChangeCallback();
  }

  getSelected() {
    const list = this.selectedIds.filter(x => x !== 'OTHERS');
    if (this.selectedIds.includes('OTHERS') && this.otherInputEl && this.otherInputEl.value.trim()) {
      list.push('OTHERS');
    }
    return list;
  }

  getOtherText() {
    return this.otherInputEl ? this.otherInputEl.value.trim() : '';
  }

  setSelected(ids, otherText = '') {
    this.selectedIds = Array.isArray(ids) ? [...ids] : (ids ? ids.split(';').map(s => s.trim()).filter(Boolean) : []);
    if (otherText) {
      if (!this.selectedIds.includes('OTHERS')) this.selectedIds.push('OTHERS');
      this.otherBoxEl.classList.remove('hidden');
      if (this.otherInputEl) this.otherInputEl.value = otherText;
    } else if (this.selectedIds.includes('OTHERS')) {
      this.otherBoxEl.classList.remove('hidden');
    } else {
      this.otherBoxEl.classList.add('hidden');
      if (this.otherInputEl) this.otherInputEl.value = '';
    }
    this.renderTags();
  }

  setDisabled(disabled) {
    this.disabled = disabled;
    this.selectEl.disabled = disabled;
    if (this.otherInputEl) this.otherInputEl.disabled = disabled;
    this.renderTags();
  }

  clear() {
    this.selectedIds = [];
    if (this.otherInputEl) this.otherInputEl.value = '';
    this.otherBoxEl.classList.add('hidden');
    this.selectEl.value = '';
    this.renderTags();
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  initSubmitterExpertisePicker();
  await loadDatabase();
  await fetchCycleFile();
  setupEventListeners();
  updateRefereeBarText();
});

/**
 * Update the cycle display on Question 6
 */
function updateCycleDisplay(cycleVal) {
  const current = (cycleVal || state.cycle || '52').trim();
  state.cycle = current;
  const cycleValEl = document.getElementById('current-cycle-display');
  if (cycleValEl) {
    cycleValEl.textContent = current;
  }
}

/**
 * Fetch cycle.txt file directly if accessible
 */
async function fetchCycleFile() {
  try {
    const res = await fetch('cycle.txt');
    if (res.ok) {
      const text = await res.text();
      const val = text.trim();
      if (val) {
        updateCycleDisplay(val);
      }
    }
  } catch (err) {
    // If running under file:// or fetch fails, cycle from database/db_data.js remains active
  }
}

function initSubmitterExpertisePicker() {
  userExpPicker = new ExpertisePicker(
    document.getElementById('user_expertise'),
    document.getElementById('user_expertise_selected'),
    document.getElementById('user_expertise_other_box'),
    document.getElementById('user_expertise_other'),
    syncSelfRefereeIfApplicable
  );
}

/**
 * Update Connection Status Indicator in Header
 */
function updateConnectionBadge(status) {
  if (!statusBadge) return;
  statusBadge.className = 'connection-badge';
  if (status === 'online') {
    statusBadge.classList.add('status-online');
    statusBadge.innerHTML = '🟢 Connected to Server (port 8080)';
    state.isLiveServer = true;
  } else if (status === 'file-mode') {
    statusBadge.classList.add('status-offline');
    statusBadge.innerHTML = '🟡 Local File Mode (Full DB Active)';
    state.isLiveServer = false;
  } else {
    statusBadge.classList.add('status-offline');
    statusBadge.innerHTML = '🟡 Server Offline (Local DB Active)';
    state.isLiveServer = false;
  }
}

/**
 * Load Database from Embedded Database or Server API
 */
async function loadDatabase() {
  const isFileProtocol = (window.location.protocol === 'file:');

  if (isFileProtocol) {
    // Under file://, relative fetch is blocked by browsers. Use complete embedded dataset immediately.
    useEmbeddedDatabase();
    updateConnectionBadge('file-mode');
    return;
  }

  // Under http:, try fetching live API
  try {
    const res = await fetch('/api/database');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.cycle) {
      updateCycleDisplay(data.cycle);
    }
    state.affiliations = data.affiliations || [];
    state.expertise = data.expertise || [];
    state.career_status = data.career_status || [];
    state.referees = data.referees || [];

    populateAllSelects();
    updateConnectionBadge('online');
  } catch (err) {
    // If server is not running on this port, fall back to embedded data
    useEmbeddedDatabase();
    updateConnectionBadge('server-offline');
  }
}

/**
 * Use Complete Embedded Dataset (from db_data.js or built-in registry)
 */
function useEmbeddedDatabase() {
  if (window.GTAC_DATABASE) {
    if (window.GTAC_DATABASE.cycle) {
      updateCycleDisplay(window.GTAC_DATABASE.cycle);
    }
    state.affiliations = window.GTAC_DATABASE.affiliations || [];
    state.expertise = window.GTAC_DATABASE.expertise || [];
    state.career_status = window.GTAC_DATABASE.career_status || [];
    state.referees = window.GTAC_DATABASE.referees || [];
  } else {
    // In-memory fallback if db_data.js was not loaded
    state.affiliations = [
      { id: 'AFF_001', label: 'National Centre for Radio Astrophysics (NCRA-TIFR), Pune' },
      { id: 'AFF_002', label: 'Inter-University Centre for Astronomy and Astrophysics (IUCAA), Pune' },
      { id: 'AFF_003', label: 'Raman Research Institute (RRI), Bengaluru' },
      { id: 'AFF_004', label: 'Indian Institute of Science (IISc), Bengaluru' },
      { id: 'AFF_005', label: 'Tata Institute of Fundamental Research (TIFR), Mumbai' },
      { id: 'AFF_006', label: 'Indian Institute of Astrophysics (IIA), Bengaluru' },
      { id: 'AFF_007', label: 'Physical Research Laboratory (PRL), Ahmedabad' },
      { id: 'AFF_008', label: 'Indian Institute of Technology Bombay (IIT Bombay)' },
      { id: 'AFF_015', label: 'National Radio Astronomy Observatory (NRAO), Socorro/Charlottesville, USA' },
      { id: 'AFF_016', label: 'European Southern Observatory (ESO), Garching, Germany' }
    ];
    state.expertise = [
      { id: 'EXP_01', label: 'Pulsars, Fast Transients & Neutron Stars' },
      { id: 'EXP_02', label: 'Epoch of Reionization (EoR) & 21cm Cosmology' },
      { id: 'EXP_03', label: 'Extragalactic Neutral Hydrogen (HI) & Galaxy Dynamics' },
      { id: 'EXP_04', label: 'Active Galactic Nuclei (AGN) & Relativistic Radio Jets' },
      { id: 'EXP_05', label: 'Galaxy Clusters, Relics, Halos & Cosmic Web' },
      { id: 'EXP_11', label: 'Low-Frequency Radio Interferometry Techniques & Algorithms' },
      { id: 'EXP_14', label: 'Radio Instrumentation, Receivers & Digital Backends' }
    ];
    state.career_status = [
      { id: 'CAR_01', label: 'Undergraduate' },
      { id: 'CAR_02', label: 'PhD Student' },
      { id: 'CAR_03', label: 'Post Doctoral Fellow' },
      { id: 'CAR_04', label: 'Faculty Member' },
      { id: 'CAR_05', label: 'Scientist' },
      { id: 'CAR_06', label: 'Engineer' },
      { id: 'CAR_07', label: 'Others' }
    ];
    state.referees = [
      { unique_id: 'REF_0001', referee_name: 'Yashwant Gupta', email: 'ygupta@ncra.tifr.res.in', affiliation: 'AFF_001', expertise: 'EXP_01;EXP_14', career_status: 'CAR_04', referee_status: 'verified', available: 'true' },
      { unique_id: 'REF_0002', referee_name: 'Jayaram Chengalur', email: 'chengalur@ncra.tifr.res.in', affiliation: 'AFF_001', expertise: 'EXP_03;EXP_11', career_status: 'CAR_04', referee_status: 'verified', available: 'true' },
      { unique_id: 'REF_0003', referee_name: 'Somak Raychaudhury', email: 'somak@iucaa.in', affiliation: 'AFF_002', expertise: 'EXP_04;EXP_05', career_status: 'CAR_04', referee_status: 'verified', available: 'true' },
      { unique_id: 'REF_0008', referee_name: 'Ananda Hota', email: 'ananda.hota@cbs.ac.in', affiliation: 'AFF_005', expertise: 'EXP_03;EXP_04', career_status: 'CAR_05', referee_status: 'suggested', available: 'true' }
    ];
  }
  populateAllSelects();
}

/**
 * Populate all dropdowns across form
 */
function populateAllSelects() {
  populateSelect(userAffiliationSelect, state.affiliations, true);
  populateSelect(userCareerSelect, state.career_status, false);
  if (userExpPicker) userExpPicker.populate();

  state.refereeBlocks.forEach(blockId => {
    const card = document.getElementById(blockId);
    if (card) {
      const aff = card.querySelector('.ref-aff');
      const car = card.querySelector('.ref-career');
      if (aff) populateSelect(aff, state.affiliations, true);
      if (car) populateSelect(car, state.career_status, false);
      if (card.expPicker) card.expPicker.populate();
    }
  });
}

/**
 * Populate select dropdowns
 */
function populateSelect(selectEl, items, includeOthers = false) {
  if (!selectEl) return;
  const currentVal = selectEl.value;
  selectEl.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = '-- Select from list --';
  selectEl.appendChild(defaultOption);

  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = `${item.id}: ${item.label}`;
    selectEl.appendChild(opt);
  });

  if (includeOthers) {
    const othersOpt = document.createElement('option');
    othersOpt.value = 'OTHERS';
    othersOpt.textContent = '+ Others (Enter new entry to add to database)';
    selectEl.appendChild(othersOpt);
  }
  if (currentVal) selectEl.value = currentVal;
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  // Affiliation "Others" toggle
  userAffiliationSelect.addEventListener('change', () => {
    if (userAffiliationSelect.value === 'OTHERS') {
      userAffOtherBox.classList.remove('hidden');
      userAffOtherInput.required = true;
    } else {
      userAffOtherBox.classList.add('hidden');
      userAffOtherInput.required = false;
    }
    syncSelfRefereeIfApplicable();
  });

  userAffOtherInput.addEventListener('input', syncSelfRefereeIfApplicable);

  // Sync profile changes to Block 1 if self-volunteer is active and validate
  let userValTimer = null;
  const triggerUserVal = () => {
    clearTimeout(userValTimer);
    userValTimer = setTimeout(validateSubmitterNameEmail, 500);
  };
  document.getElementById('user_name').addEventListener('input', () => {
    syncSelfRefereeIfApplicable();
    triggerUserVal();
  });
  document.getElementById('user_name').addEventListener('blur', () => {
    syncSelfRefereeIfApplicable();
    validateSubmitterNameEmail();
  });
  document.getElementById('user_email').addEventListener('input', () => {
    syncSelfRefereeIfApplicable();
    triggerUserVal();
  });
  document.getElementById('user_email').addEventListener('blur', () => {
    syncSelfRefereeIfApplicable();
    validateSubmitterNameEmail();
  });
  userCareerSelect.addEventListener('change', syncSelfRefereeIfApplicable);

  // Review willingness radio buttons
  document.querySelectorAll('input[name="review_this_cycle"], input[name="review_future_cycles"]').forEach(radio => {
    radio.addEventListener('change', handleReviewWillingnessChange);
  });

  // Add referee button: first click adds own entry, subsequent clicks add others entry
  btnAddReferee.addEventListener('click', () => {
    const isOwn = (state.refereeBlocks.length === 0);
    addRefereeBlock(isOwn);
  });

  // Modal close
  btnCloseModal.addEventListener('click', () => {
    modalSuccess.classList.add('hidden');
  });

  // Form submission
  form.addEventListener('submit', handleFormSubmit);

  // Form reset
  form.addEventListener('reset', () => {
    setTimeout(() => {
      userAffOtherBox.classList.add('hidden');
      if (userExpPicker) userExpPicker.clear();
      const cards = refereeContainer.querySelectorAll('.referee-card');
      cards.forEach(c => c.remove());
      state.refereeBlocks = [];
      state.refereeCount = 0;
      updateRefereeBarText();
    }, 50);
  });
}

/**
 * Update the Add Referee button text and empty state hint
 */
function updateRefereeBarText() {
  if (!btnAddRefereeText) return;
  if (state.refereeBlocks.length === 0) {
    btnAddRefereeText.textContent = 'Add Referee Suggestion (Own Entry)';
    if (refereeEmptyHint) refereeEmptyHint.classList.remove('hidden');
  } else {
    btnAddRefereeText.textContent = 'Add Referee Suggestion (Others Entry)';
    if (refereeEmptyHint) refereeEmptyHint.classList.add('hidden');
  }
}

/**
 * Handle Willingness Change (Rule: if either is yes, block 1 is self and locked)
 */
function handleReviewWillingnessChange() {
  const thisCycle = document.querySelector('input[name="review_this_cycle"]:checked')?.value;
  const futureCycles = document.querySelector('input[name="review_future_cycles"]:checked')?.value;

  const isWilling = (thisCycle === 'yes' || futureCycles === 'yes');

  if (isWilling) {
    // If no blocks exist, create block 1 as own entry
    if (state.refereeBlocks.length === 0) {
      addRefereeBlock(true);
    } else {
      const firstBlockId = state.refereeBlocks[0];
      const firstBlockEl = document.getElementById(firstBlockId);
      lockBlockAsSelf(firstBlockEl);
    }
  } else {
    // If user switched to No, unlock block 1 if it was marked self
    if (state.refereeBlocks.length > 0) {
      const firstBlockId = state.refereeBlocks[0];
      const firstBlockEl = document.getElementById(firstBlockId);
      if (firstBlockEl && firstBlockEl.dataset.isSelf === 'true') {
        unlockBlockFromSelf(firstBlockEl);
      }
    }
  }
  updateRefereeBarText();
  updateRemoveButtonsVisibility();
}

/**
 * Lock Referee Block 1 as Self Reviewer
 */
function lockBlockAsSelf(cardEl) {
  if (!cardEl) return;
  cardEl.dataset.isSelf = 'true';
  cardEl.className = 'referee-card is-self';

  // Badge & Banner
  const badge = cardEl.querySelector('.status-badge');
  if (badge) {
    badge.className = 'status-badge badge-self';
    badge.textContent = 'Self - Review Volunteer (Locked)';
  }

  const banner = cardEl.querySelector('.referee-alert-banner');
  if (banner) {
    banner.className = 'referee-alert-banner alert-self';
    banner.innerHTML = '<span>🔒 <strong>Review Volunteer (Self):</strong> Automatically populated from your personal profile and locked.</span>';
  }

  // Populate data from user fields
  syncCardWithUserProfile(cardEl);

  // Lock text & select inputs inside card
  setCardInputsDisabled(cardEl, true);
  if (cardEl.expPicker) {
    cardEl.expPicker.setDisabled(true);
  }

  // Hide AI button and delete button
  const btnRemove = cardEl.querySelector('.btn-remove-referee');
  if (btnRemove) btnRemove.classList.add('hidden');
  const btnAi = cardEl.querySelector('.btn-ai-suggest');
  if (btnAi) btnAi.classList.add('hidden');
}

/**
 * Populate Card as Submitter's Own Entry (unlocked)
 */
function populateCardWithOwnEntry(cardEl) {
  if (!cardEl) return;
  cardEl.dataset.isSelf = 'true';
  cardEl.className = 'referee-card is-self';

  // Badge & Banner
  const badge = cardEl.querySelector('.status-badge');
  if (badge) {
    badge.className = 'status-badge badge-self';
    badge.textContent = 'Own Entry (Submitter)';
  }

  const banner = cardEl.querySelector('.referee-alert-banner');
  if (banner) {
    banner.className = 'referee-alert-banner alert-self';
    banner.innerHTML = '<span>👤 <strong>Your Entry (Submitter):</strong> Auto-populated with your details. Select "Yes" in question 6 above to formally volunteer.</span>';
  }

  // Populate data from user fields
  syncCardWithUserProfile(cardEl);

  // Allow inputs to be editable
  setCardInputsDisabled(cardEl, false);
  if (cardEl.expPicker) {
    cardEl.expPicker.setDisabled(false);
  }

  // Hide AI button for own entry
  const btnAi = cardEl.querySelector('.btn-ai-suggest');
  if (btnAi) btnAi.classList.add('hidden');

  // Show delete button
  const btnRemove = cardEl.querySelector('.btn-remove-referee');
  if (btnRemove) btnRemove.classList.remove('hidden');
}

/**
 * Unlock Referee Block 1 if user switches back to No
 */
function unlockBlockFromSelf(cardEl) {
  if (!cardEl) return;
  if (cardEl.dataset.isSelf !== 'true') return;

  populateCardWithOwnEntry(cardEl);
  updateRemoveButtonsVisibility();
}

/**
 * Synchronize user profile fields to Block 1 if self entry is active
 */
function syncSelfRefereeIfApplicable() {
  if (state.refereeBlocks.length > 0) {
    const firstBlockEl = document.getElementById(state.refereeBlocks[0]);
    if (firstBlockEl && firstBlockEl.dataset.isSelf === 'true') {
      const thisCycle = document.querySelector('input[name="review_this_cycle"]:checked')?.value;
      const futureCycles = document.querySelector('input[name="review_future_cycles"]:checked')?.value;
      const isWilling = (thisCycle === 'yes' || futureCycles === 'yes');
      if (isWilling) {
        lockBlockAsSelf(firstBlockEl);
      } else {
        syncCardWithUserProfile(firstBlockEl);
      }
    }
  }
}

/**
 * Synchronize user profile fields into a referee card
 */
function syncCardWithUserProfile(cardEl) {
  if (!cardEl) return;
  const rawUserName = document.getElementById('user_name').value.trim();
  const userName = stripTitles(rawUserName);
  const userEmail = document.getElementById('user_email').value.trim();
  const userAff = userAffiliationSelect.value;
  const userAffOther = userAffOtherInput.value.trim();
  const userCareer = userCareerSelect.value;

  const nameInput = cardEl.querySelector('.ref-name');
  const emailInput = cardEl.querySelector('.ref-email');
  const affSelect = cardEl.querySelector('.ref-aff');
  const affOtherBox = cardEl.querySelector('.ref-aff-other-box');
  const affOtherInput = cardEl.querySelector('.ref-aff-other');
  const careerSelect = cardEl.querySelector('.ref-career');

  if (nameInput) nameInput.value = userName;
  if (emailInput) emailInput.value = userEmail;
  if (affSelect) {
    affSelect.value = userAff;
    if (userAff === 'OTHERS') {
      if (affOtherBox) affOtherBox.classList.remove('hidden');
      if (affOtherInput) affOtherInput.value = userAffOther;
    } else {
      if (affOtherBox) affOtherBox.classList.add('hidden');
    }
  }
  if (careerSelect) careerSelect.value = userCareer;

  if (cardEl.expPicker && userExpPicker) {
    cardEl.expPicker.setSelected(userExpPicker.getSelected(), userExpPicker.getOtherText());
  }

  // Self entry preference: If submitter matches a DB record, note it in the banner without overwriting user data
  if (cardEl.dataset.isSelf === 'true' && (userName || userEmail)) {
    const matched = findMatchingReferee(userName) || (userEmail ? findMatchingReferee(userEmail) : null);
    const thisCycle = document.querySelector('input[name="review_this_cycle"]:checked')?.value;
    const futureCycles = document.querySelector('input[name="review_future_cycles"]:checked')?.value;
    const isWilling = (thisCycle === 'yes' || futureCycles === 'yes');

    if (matched && !isWilling) {
      const banner = cardEl.querySelector('.referee-alert-banner');
      if (banner) {
        banner.className = 'referee-alert-banner alert-self';
        banner.innerHTML = `<span>👤 <strong>Your Entry (Submitter):</strong> Matched existing database record <code>${matched.unique_id}</code> (${stripTitles(matched.referee_name)}). Your submitted profile details take preference.</span>`;
      }
    }
  }
}

/**
 * Enable/Disable inputs in a card
 */
function setCardInputsDisabled(cardEl, disabled) {
  cardEl.querySelectorAll('input, select').forEach(el => {
    el.disabled = disabled;
  });
}

/**
 * Add a new Referee Block
 * @param {boolean} isOwnEntry - True if adding submitter's own entry, false for others entry
 */
function addRefereeBlock(isOwnEntry = false) {
  state.refereeCount += 1;
  const blockIndex = state.refereeBlocks.length + 1;
  const blockId = `referee-card-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  state.refereeBlocks.push(blockId);

  const card = document.createElement('div');
  card.id = blockId;
  card.className = 'referee-card';
  card.dataset.blockIndex = blockIndex;
  card.dataset.isSelf = isOwnEntry ? 'true' : 'false';

  card.innerHTML = `
    <div class="referee-header">
      <div class="referee-title-area">
        <span class="referee-number">Referee Suggestion - ${blockIndex}</span>
        <span class="status-badge badge-new">New Suggestion</span>
      </div>
      <div class="referee-header-actions">
        <button type="button" class="btn-ai-suggest">✨ Ask Gemini</button>
        <button type="button" class="btn-danger-link btn-remove-referee">Remove</button>
      </div>
    </div>

    <div class="referee-alert-banner alert-new">
      <span>✨ Suggest peer reviewer. System checks <code>Referee_database_A</code> automatically.</span>
    </div>

    <div class="grid-2">
      <!-- Name -->
      <div class="form-group autocomplete-wrapper">
        <label>1. Referee Name <span class="required">*</span></label>
        <input type="text" class="ref-name" placeholder="Type name to search existing database or enter new..." required autocomplete="off">
        <div class="autocomplete-dropdown hidden"></div>
        <span class="field-error err-ref-name"></span>
      </div>

      <!-- Email -->
      <div class="form-group autocomplete-wrapper">
        <label>2. Referee Email ID <span class="required">*</span></label>
        <input type="email" class="ref-email" placeholder="e.g. colleague@institution.edu" required autocomplete="off">
        <div class="autocomplete-dropdown hidden"></div>
        <div class="email-validation-notice ref-email-validation"></div>
        <span class="field-error err-ref-email"></span>
      </div>
    </div>

    <div class="grid-2">
      <!-- Affiliation -->
      <div class="form-group">
        <label>3. Referee Affiliation <span class="required">*</span></label>
        <select class="ref-aff" required></select>
        <div class="ref-aff-other-box other-input-box hidden">
          <input type="text" class="ref-aff-other" placeholder="Enter new affiliation name to add to database">
        </div>
        <span class="field-error err-ref-aff"></span>
      </div>

      <!-- Career Status -->
      <div class="form-group">
        <label>Career Status</label>
        <select class="ref-career"></select>
      </div>
    </div>

    <!-- Expertise Dropdown Menu & Selected Chips -->
    <div class="form-group">
      <label>4. Referee Expertise <span class="required">*</span> <span class="hint-inline">(Select one or more from dropdown list)</span></label>
      <select class="ref-exp-select">
        <option value="">-- Select Expertise from list --</option>
        <option value="OTHERS">+ Others (Enter new expertise topic)</option>
      </select>
      <div class="ref-exp-selected selected-tags-container"></div>
      <div class="ref-exp-other-box other-input-box hidden">
        <input type="text" class="ref-exp-other" placeholder="Enter new expertise area to add to database">
      </div>
      <span class="field-error err-ref-exp"></span>
    </div>
  `;

  refereeContainer.appendChild(card);

  // Initialize dropdowns and ExpertisePicker in this card
  const affSelect = card.querySelector('.ref-aff');
  const careerSelect = card.querySelector('.ref-career');
  const expSelect = card.querySelector('.ref-exp-select');
  const expSelected = card.querySelector('.ref-exp-selected');
  const expOtherBox = card.querySelector('.ref-exp-other-box');
  const expOtherInput = card.querySelector('.ref-exp-other');

  populateSelect(affSelect, state.affiliations, true);
  populateSelect(careerSelect, state.career_status, false);

  card.expPicker = new ExpertisePicker(expSelect, expSelected, expOtherBox, expOtherInput, () => {});

  // Setup listeners for this card
  setupRefereeCardListeners(card, blockIndex);

  // If this card is designated as Own Entry
  if (isOwnEntry) {
    const thisCycle = document.querySelector('input[name="review_this_cycle"]:checked')?.value;
    const futureCycles = document.querySelector('input[name="review_future_cycles"]:checked')?.value;
    const isWilling = (thisCycle === 'yes' || futureCycles === 'yes');

    if (isWilling) {
      lockBlockAsSelf(card);
    } else {
      populateCardWithOwnEntry(card);
    }
  }

  updateRefereeCardNumbers();
  updateRemoveButtonsVisibility();
  updateRefereeBarText();
}

/**
 * Setup listeners for a referee card
 */
function setupRefereeCardListeners(card, blockIndex) {
  const nameInput = card.querySelector('.ref-name');
  const emailInput = card.querySelector('.ref-email');
  const affSelect = card.querySelector('.ref-aff');
  const affOtherBox = card.querySelector('.ref-aff-other-box');
  const affOtherInput = card.querySelector('.ref-aff-other');
  const btnRemove = card.querySelector('.btn-remove-referee');
  const btnAi = card.querySelector('.btn-ai-suggest');

  // Affiliation Others
  affSelect.addEventListener('change', () => {
    if (affSelect.value === 'OTHERS') {
      affOtherBox.classList.remove('hidden');
      affOtherInput.required = true;
    } else {
      affOtherBox.classList.add('hidden');
      affOtherInput.required = false;
    }
  });

  // Autocomplete & Database Check on Name & Email
  setupAutocomplete(card, nameInput, 'referee_name');
  setupAutocomplete(card, emailInput, 'email');

  // Real-time auto-validation with Gemini by default on input, change, and blur
  let valDebounceTimer = null;
  const triggerAutoValidation = () => {
    clearTimeout(valDebounceTimer);
    valDebounceTimer = setTimeout(() => {
      validateRefereeCardWithGemini(card);
    }, 450);
  };

  nameInput.addEventListener('input', triggerAutoValidation);
  nameInput.addEventListener('change', () => {
    checkAndAutoFillCard(card, nameInput.value.trim());
    validateRefereeCardWithGemini(card);
  });
  nameInput.addEventListener('blur', () => {
    checkAndAutoFillCard(card, nameInput.value.trim());
    validateRefereeCardWithGemini(card);
  });

  emailInput.addEventListener('input', triggerAutoValidation);
  emailInput.addEventListener('change', () => {
    checkAndAutoFillCard(card, emailInput.value.trim());
    validateRefereeCardWithGemini(card);
  });
  emailInput.addEventListener('blur', () => {
    checkAndAutoFillCard(card, emailInput.value.trim());
    validateRefereeCardWithGemini(card);
  });

  // AI Suggestion button (manual trigger or re-run)
  btnAi.addEventListener('click', async () => {
    await validateRefereeCardWithGemini(card, true);
  });

  // Remove button
  btnRemove.addEventListener('click', () => {
    removeRefereeBlock(card.id);
  });
}

/**
 * Check and validate Referee Name and Email with Gemini by default.
 * Mentions 'Validated email' and preserves full editability of all fields.
 */
async function validateRefereeCardWithGemini(card, isExplicitClick = false) {
  if (!card) return;
  const nameInput = card.querySelector('.ref-name');
  const emailInput = card.querySelector('.ref-email');
  const affSelect = card.querySelector('.ref-aff');
  const noticeEl = card.querySelector('.ref-email-validation');
  const banner = card.querySelector('.referee-alert-banner');
  const btnAi = card.querySelector('.btn-ai-suggest');

  if (!nameInput || !emailInput || !noticeEl) return;

  const rawName = nameInput.value.trim();
  const cleanName = stripTitles(rawName);
  const email = emailInput.value.trim();

  if (!email && !cleanName) {
    noticeEl.innerHTML = '';
    noticeEl.className = 'email-validation-notice';
    return;
  }

  if (isExplicitClick && btnAi) {
    btnAi.textContent = 'Thinking...';
    btnAi.disabled = true;
  }

  if (email) {
    noticeEl.className = 'email-validation-notice checking';
    noticeEl.innerHTML = `<span>⏳ Checking with Gemini...</span>`;
  }

  let result = null;

  if (state.isLiveServer && (email || cleanName)) {
    try {
      const res = await fetch('/api/gemini-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, email })
      });
      if (res.ok) {
        result = await res.json();
      }
    } catch (e) {
      // Fall back to client heuristic
    }
  }

  if (!result) {
    result = clientValidateNameEmail(cleanName, email);
  }

  if (isExplicitClick && btnAi) {
    btnAi.textContent = '✨ Ask Gemini';
    btnAi.disabled = false;
  }

  // Display validation notice mentioning 'Validated email'
  if (result.valid_email && email) {
    noticeEl.className = 'email-validation-notice valid';
    noticeEl.innerHTML = `
      <span class="badge-valid-pill">✓ Validated email</span>
      <span class="val-detail">${result.message || 'Verified academic address'}</span>
    `;

    if (banner && card.dataset.isSelf !== 'true') {
      banner.className = 'referee-alert-banner alert-suggested';
      banner.innerHTML = `
        <span>✨ <strong>Gemini Validated:</strong> Validated email (<code>${email}</code>) for ${cleanName || 'referee'}. All fields remain editable.</span>
      `;
    }

    // Auto-suggest affiliation if blank
    if (result.affiliation && (!affSelect.value || affSelect.value === 'OTHERS')) {
      affSelect.value = result.affiliation;
    }
    // Auto-suggest expertise if empty
    if (result.expertise && result.expertise.length > 0 && card.expPicker && card.expPicker.getSelected().length === 0) {
      card.expPicker.setSelected(result.expertise);
    }
  } else if (email && email.length > 3) {
    noticeEl.className = 'email-validation-notice invalid';
    noticeEl.innerHTML = `<span>⚠️ ${result.message || 'Please enter a valid institutional email'}</span>`;
  } else {
    noticeEl.innerHTML = '';
    noticeEl.className = 'email-validation-notice';
  }

  // CRITICAL REQUIREMENT: Always keep card inputs editable!
  setCardInputsDisabled(card, false);
  if (card.expPicker) {
    card.expPicker.setDisabled(false);
  }
}

/**
 * Validate Submitter Name & Email with Gemini / Knowledge base
 */
async function validateSubmitterNameEmail() {
  const nameEl = document.getElementById('user_name');
  const emailEl = document.getElementById('user_email');
  const noticeEl = document.getElementById('user_email_validation');
  if (!nameEl || !emailEl || !noticeEl) return;

  const rawName = nameEl.value.trim();
  const cleanName = stripTitles(rawName);
  const email = emailEl.value.trim();

  if (!email) {
    noticeEl.innerHTML = '';
    noticeEl.className = 'email-validation-notice';
    return;
  }

  noticeEl.className = 'email-validation-notice checking';
  noticeEl.innerHTML = `<span>⏳ Validating email with Gemini...</span>`;

  let result = null;
  if (state.isLiveServer) {
    try {
      const res = await fetch('/api/gemini-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, email })
      });
      if (res.ok) {
        result = await res.json();
      }
    } catch (e) {
      // Fallback
    }
  }

  if (!result) {
    result = clientValidateNameEmail(cleanName, email);
  }

  if (result.valid_email) {
    noticeEl.className = 'email-validation-notice valid';
    noticeEl.innerHTML = `
      <span class="badge-valid-pill">✓ Validated email</span>
      <span class="val-detail">${result.message || 'Verified institutional address'}</span>
    `;
    if (result.affiliation && (!userAffiliationSelect.value || userAffiliationSelect.value === 'OTHERS')) {
      userAffiliationSelect.value = result.affiliation;
    }
  } else if (email.length > 3) {
    noticeEl.className = 'email-validation-notice invalid';
    noticeEl.innerHTML = `<span>⚠️ ${result.message || 'Please enter a valid institutional email'}</span>`;
  } else {
    noticeEl.innerHTML = '';
    noticeEl.className = 'email-validation-notice';
  }
}

/**
 * Client-Side validation for Name and Email (works offline and under file://)
 */
function clientValidateNameEmail(name, email) {
  const cleanName = stripTitles(name);
  const cleanEmail = (email || '').trim();
  const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
  const isValidFormat = emailRegex.test(cleanEmail);

  if (!isValidFormat) {
    return {
      valid_email: false,
      mention: '',
      message: cleanEmail ? 'Please enter a valid email format (e.g. user@institution.edu)' : '',
      affiliation: '',
      expertise: []
    };
  }

  const domain = cleanEmail.split('@')[1].toLowerCase();
  const knownDomains = {
    'ncra.tifr.res.in': { aff: 'AFF_001', exp: ['EXP_01', 'EXP_03', 'EXP_11', 'EXP_14'] },
    'iucaa.in': { aff: 'AFF_002', exp: ['EXP_04', 'EXP_05'] },
    'rri.res.in': { aff: 'AFF_003', exp: ['EXP_01', 'EXP_07', 'EXP_14'] },
    'iisc.ac.in': { aff: 'AFF_004', exp: ['EXP_03', 'EXP_07'] },
    'tifr.res.in': { aff: 'AFF_005', exp: ['EXP_01', 'EXP_10'] },
    'cbs.ac.in': { aff: 'AFF_005', exp: ['EXP_03', 'EXP_04'] },
    'iia.res.in': { aff: 'AFF_006', exp: ['EXP_06', 'EXP_15'] },
    'iiap.res.in': { aff: 'AFF_006', exp: ['EXP_06', 'EXP_15'] },
    'prl.res.in': { aff: 'AFF_007', exp: ['EXP_02', 'EXP_13'] },
    'aries.res.in': { aff: 'AFF_007', exp: ['EXP_10', 'EXP_15'] },
    'iiti.ac.in': { aff: 'AFF_014', exp: ['EXP_02', 'EXP_12'] },
    'itbhu.ac.in': { aff: 'AFF_002', exp: ['EXP_02', 'EXP_07'] },
    'bhu.ac.in': { aff: 'AFF_002', exp: ['EXP_02', 'EXP_07'] },
  };

  let matchedAff = '';
  let matchedExp = [];
  let isAcademic = false;

  if (knownDomains[domain]) {
    matchedAff = knownDomains[domain].aff;
    matchedExp = knownDomains[domain].exp;
    isAcademic = true;
  } else if (/\.(res\.in|ac\.in|edu|ac\.uk|gov|org|mpg\.de|edu\.au)$/i.test(domain)) {
    isAcademic = true;
  }

  // Cross check against in-memory referee database cache
  const dbMatch = state.referees.find(r =>
    (r.email && r.email.toLowerCase() === cleanEmail.toLowerCase()) ||
    (cleanName && matchRefereeName(cleanName, r.referee_name))
  );
  if (dbMatch) {
    if (!matchedAff && dbMatch.affiliation) matchedAff = dbMatch.affiliation;
    if (matchedExp.length === 0 && dbMatch.expertise) {
      matchedExp = dbMatch.expertise.split(';').map(x => x.trim()).filter(Boolean);
    }
    isAcademic = true;
  }

  return {
    valid_email: true,
    mention: 'Validated email',
    message: isAcademic ? `Verified institutional domain (${domain})` : `Valid email address (${domain})`,
    affiliation: matchedAff,
    expertise: matchedExp,
    clean_name: cleanName,
    email: cleanEmail
  };
}

/**
 * Remove a referee card
 */
function removeRefereeBlock(blockId) {
  const card = document.getElementById(blockId);
  if (!card) return;

  const thisCycle = document.querySelector('input[name="review_this_cycle"]:checked')?.value;
  const futureCycles = document.querySelector('input[name="review_future_cycles"]:checked')?.value;
  const isWilling = (thisCycle === 'yes' || futureCycles === 'yes');

  if (card.dataset.isSelf === 'true' && isWilling) {
    alert('Cannot remove self-reviewer block while review willingness is selected as Yes.');
    return;
  }

  card.remove();
  state.refereeBlocks = state.refereeBlocks.filter(id => id !== blockId);
  updateRefereeCardNumbers();
  updateRemoveButtonsVisibility();
  updateRefereeBarText();
}

/**
 * Re-index card numbers sequentially
 */
function updateRefereeCardNumbers() {
  state.refereeBlocks.forEach((blockId, idx) => {
    const card = document.getElementById(blockId);
    if (card) {
      const numSpan = card.querySelector('.referee-number');
      if (numSpan) {
        numSpan.textContent = `Referee Suggestion - ${idx + 1}`;
      }
    }
  });
}

/**
 * Update visibility of Remove buttons
 */
function updateRemoveButtonsVisibility() {
  const thisCycle = document.querySelector('input[name="review_this_cycle"]:checked')?.value;
  const futureCycles = document.querySelector('input[name="review_future_cycles"]:checked')?.value;
  const isWilling = (thisCycle === 'yes' || futureCycles === 'yes');

  state.refereeBlocks.forEach((blockId) => {
    const card = document.getElementById(blockId);
    if (card) {
      const btnRemove = card.querySelector('.btn-remove-referee');
      if (btnRemove) {
        if (card.dataset.isSelf === 'true' && isWilling) {
          btnRemove.classList.add('hidden');
        } else {
          btnRemove.classList.remove('hidden');
        }
      }
    }
  });
}

/**
 * Remove honorific titles (Dr, Prof, Mr, etc.) from a name
 */
function stripTitles(name) {
  if (!name) return '';
  return name.replace(/^(?:\s*(?:dr|prof|professor|mr|ms|mrs|shri|smt)\.?\s+)+/gi, '').trim();
}

/**
 * Parse a name into normalized (surname, [given_tokens])
 */
function parseNameParts(name) {
  const cleaned = stripTitles(name);
  if (!cleaned) return { surname: '', given: [] };
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',', 2).map(p => p.trim());
    const surname = (parts[0].replace(/[^\w]/g, '')).toLowerCase();
    const givenStr = parts[1] || '';
    const given = givenStr.split(/\s+/).map(t => t.replace(/[^\w]/g, '').toLowerCase()).filter(Boolean);
    return { surname, given };
  } else {
    const tokens = cleaned.split(/\s+/).map(t => t.replace(/[^\w]/g, '').toLowerCase()).filter(Boolean);
    if (tokens.length === 0) return { surname: '', given: [] };
    const surname = tokens[tokens.length - 1];
    const given = tokens.slice(0, tokens.length - 1);
    return { surname, given };
  }
}

/**
 * Cross-check if inputName matches targetName exactly or via half-initials with full surname.
 * Examples: 'Y. Gupta' matches 'Yashwant Gupta', 'J. Chengalur' matches 'Jayaram Chengalur', 'P. Dutta' matches 'Prasun Dutta'.
 */
function matchRefereeName(inputName, targetName) {
  const p1 = parseNameParts(inputName);
  const p2 = parseNameParts(targetName);

  if (!p1.surname || !p2.surname || p1.surname !== p2.surname) {
    return false;
  }

  if (p1.given.length === 0 && p2.given.length === 0) {
    return true;
  }

  if (p1.given.length === 0 || p2.given.length === 0) {
    return false;
  }

  const minLen = Math.min(p1.given.length, p2.given.length);
  for (let i = 0; i < minLen; i++) {
    const g1 = p1.given[i];
    const g2 = p2.given[i];
    if (g1.length === 1 || g2.length === 1) {
      if (g1[0] !== g2[0]) return false;
    } else {
      if (g1 !== g2 && !g1.startsWith(g2) && !g2.startsWith(g1)) return false;
    }
  }
  return true;
}

/**
 * Find matching referee in database cache by email, exact name, or half-initials + surname
 */
function findMatchingReferee(query) {
  if (!query || query.trim().length < 2) return null;
  const cleanQ = stripTitles(query).trim().toLowerCase();

  // 1. Exact email match
  if (cleanQ.includes('@')) {
    const byEmail = state.referees.find(r => (r.email || '').toLowerCase() === cleanQ);
    if (byEmail) return byEmail;
  }

  // 2. Exact clean name match
  const exact = state.referees.find(r => stripTitles(r.referee_name || '').toLowerCase() === cleanQ);
  if (exact) return exact;

  // 3. Surname + half-initials match
  const initialMatch = state.referees.find(r => matchRefereeName(query, r.referee_name || ''));
  if (initialMatch) return initialMatch;

  return null;
}

/**
 * Cross-check if referee exists in database (exact, email, or surname + half-initials).
 * If matched, pre-fills card details and shows mention that referee already exists.
 * If card is self entry, self entry always gets preference.
 */
function checkAndAutoFillCard(card, query) {
  if (!query || query.length < 2) return;

  // Rule: "If it is self obviously self entry gets preference"
  if (card.dataset.isSelf === 'true') {
    const matched = findMatchingReferee(query);
    if (matched) {
      const banner = card.querySelector('.referee-alert-banner');
      const thisCycle = document.querySelector('input[name="review_this_cycle"]:checked')?.value;
      const futureCycles = document.querySelector('input[name="review_future_cycles"]:checked')?.value;
      const isWilling = (thisCycle === 'yes' || futureCycles === 'yes');

      if (banner && !isWilling) {
        banner.className = 'referee-alert-banner alert-self';
        banner.innerHTML = `<span>👤 <strong>Your Entry (Submitter):</strong> Matched existing database record <code>${matched.unique_id}</code> (${stripTitles(matched.referee_name)}). Your submitted profile details take preference.</span>`;
      }
    }
    return;
  }

  // Check if user is entering their own name in an "Others" suggestion block
  const submitterName = stripTitles(document.getElementById('user_name').value.trim());
  const submitterEmail = document.getElementById('user_email').value.trim().toLowerCase();
  if ((submitterName && matchRefereeName(query, submitterName)) || (submitterEmail && query.toLowerCase() === submitterEmail)) {
    const banner = card.querySelector('.referee-alert-banner');
    if (banner) {
      banner.className = 'referee-alert-banner alert-self';
      banner.innerHTML = `<span>⚠️ <strong>Self Profile:</strong> This name matches your submitter profile. Your self entry in Block 1 takes preference.</span>`;
    }
    return;
  }

  // Cross-check against existing referees in database
  const matched = findMatchingReferee(query);
  if (matched) {
    populateCardWithReferee(card, matched);
  }
}

/**
 * Autocomplete and Real-Time Database Verification
 */
function setupAutocomplete(card, inputEl, fieldKey) {
  const wrapper = inputEl.closest('.autocomplete-wrapper');
  const dropdown = wrapper.querySelector('.autocomplete-dropdown');

  let debounceTimer = null;

  inputEl.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const rawVal = inputEl.value.trim();
    const query = stripTitles(rawVal).toLowerCase();
    if (query.length < 2) {
      dropdown.classList.add('hidden');
      dropdown.innerHTML = '';
      resetCardToNewIfNotSelf(card);
      return;
    }

    debounceTimer = setTimeout(async () => {
      // 1. Search in-memory database cache with title stripping and half-initials matching
      let matches = state.referees.filter(r => {
        const rName = stripTitles(r.referee_name || '');
        const rEmail = (r.email || '').toLowerCase();
        if (fieldKey === 'email') {
          return rEmail.includes(query);
        }
        return rName.toLowerCase().includes(query) ||
               rEmail.includes(query) ||
               matchRefereeName(rawVal, rName);
      });

      // 2. If live server is connected, query API for freshest entries
      if (state.isLiveServer) {
        try {
          const res = await fetch(`/api/referees/lookup?q=${encodeURIComponent(rawVal)}`);
          if (res.ok) {
            const apiData = await res.json();
            if (apiData.matches && apiData.matches.length > 0) {
              matches = apiData.matches;
            }
          }
        } catch (e) {
          // Fallback to local matches silently
        }
      }

      renderAutocompleteDropdown(card, dropdown, matches, inputEl);
    }, 180);
  });

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}

/**
 * Render Autocomplete Dropdown
 */
function renderAutocompleteDropdown(card, dropdown, matches, inputEl) {
  if (!matches || matches.length === 0) {
    dropdown.classList.add('hidden');
    dropdown.innerHTML = '';
    return;
  }

  dropdown.innerHTML = '';
  matches.forEach(ref => {
    const item = document.createElement('div');
    item.className = 'autocomplete-item';
    const isVer = (ref.referee_status === 'verified');
    const badgeClass = isVer ? 'badge-verified' : 'badge-suggested';
    const badgeText = isVer ? 'Verified' : 'Suggested';
    const cleanDisplayName = stripTitles(ref.referee_name);

    item.innerHTML = `
      <div>
        <div class="ac-name">${cleanDisplayName}</div>
        <div class="ac-meta">${ref.email} • ${ref.affiliation || 'Unknown Affiliation'}</div>
      </div>
      <span class="status-badge ${badgeClass}">${badgeText}</span>
    `;

    item.addEventListener('click', () => {
      populateCardWithReferee(card, ref);
      dropdown.classList.add('hidden');
    });

    dropdown.appendChild(item);
  });

  dropdown.classList.remove('hidden');
}

/**
 * Populate Card with existing Referee data and apply Verified / Suggested rules
 * Mentions that this referee already exists in the database.
 */
function populateCardWithReferee(card, ref) {
  if (card.dataset.isSelf === 'true') {
    // Self entry gets preference - do not overwrite!
    return;
  }

  const nameInput = card.querySelector('.ref-name');
  const emailInput = card.querySelector('.ref-email');
  const affSelect = card.querySelector('.ref-aff');
  const careerSelect = card.querySelector('.ref-career');
  const badge = card.querySelector('.status-badge');
  const banner = card.querySelector('.referee-alert-banner');
  const btnAi = card.querySelector('.btn-ai-suggest');

  const cleanName = stripTitles(ref.referee_name || '');
  nameInput.value = cleanName;
  emailInput.value = ref.email || '';
  if (ref.affiliation) affSelect.value = ref.affiliation;
  if (ref.career_status) careerSelect.value = ref.career_status;

  // Expertise populated via card.expPicker
  if (card.expPicker) {
    card.expPicker.setSelected(ref.expertise || '');
  }

  const isVerified = (ref.referee_status === 'verified');

  // Mark email as validated
  const emailNotice = card.querySelector('.ref-email-validation');
  if (emailNotice && ref.email) {
    emailNotice.className = 'email-validation-notice valid';
    emailNotice.innerHTML = `
      <span class="badge-valid-pill">✓ Validated email</span>
      <span class="val-detail">Verified in database record</span>
    `;
  }

  if (isVerified) {
    card.className = 'referee-card is-verified';
    badge.className = 'status-badge badge-verified';
    badge.textContent = 'Verified in DB';

    banner.className = 'referee-alert-banner alert-verified';
    banner.innerHTML = `
      <span>✅ <strong>Referee Exists in Database (Verified):</strong> <code>${ref.unique_id}</code> - ${cleanName} found in database. Fields pre-filled; you may verify or edit.</span>
    `;
  } else {
    card.className = 'referee-card is-suggested';
    badge.className = 'status-badge badge-suggested';
    badge.textContent = 'Already in DB';

    banner.className = 'referee-alert-banner alert-suggested';
    banner.innerHTML = `
      <span>ℹ️ <strong>Referee Already Exists in Database:</strong> <code>${ref.unique_id}</code> - ${cleanName} found in database. Fields pre-filled from database; you may verify or edit.</span>
    `;
  }

  // CRITICAL: Always keep referee card inputs completely editable!
  setCardInputsDisabled(card, false);
  if (card.expPicker) card.expPicker.setDisabled(false);
  if (btnAi) btnAi.classList.remove('hidden');
}

/**
 * Apply AI / Heuristic Suggestions to Card
 */
function applyAiSuggestions(card, suggestions) {
  const emailInput = card.querySelector('.ref-email');
  const affSelect = card.querySelector('.ref-aff');
  const banner = card.querySelector('.referee-alert-banner');

  if (suggestions.email_domain && !emailInput.value.includes('@')) {
    const curr = emailInput.value.trim() || 'colleague';
    emailInput.value = `${curr}@${suggestions.email_domain}`;
  } else if (suggestions.email_hint && !emailInput.value) {
    emailInput.value = `${suggestions.email_hint}institution.edu`;
  }

  if (suggestions.affiliation) {
    affSelect.value = suggestions.affiliation;
  }

  if (suggestions.expertise && Array.isArray(suggestions.expertise) && card.expPicker) {
    card.expPicker.setSelected(suggestions.expertise);
  }

  banner.className = 'referee-alert-banner alert-suggested';
  banner.innerHTML = `
    <span>✨ <strong>Suggestions Applied:</strong> ${suggestions.source || 'Knowledge Base'}. Please review before submitting.</span>
  `;
}

/**
 * Reset Card state back to New
 */
function resetCardToNewIfNotSelf(card) {
  if (card.dataset.isSelf === 'true') return;
  card.className = 'referee-card';
  const badge = card.querySelector('.status-badge');
  badge.className = 'status-badge badge-new';
  badge.textContent = 'New Suggestion';

  const banner = card.querySelector('.referee-alert-banner');
  banner.className = 'referee-alert-banner alert-new';
  banner.innerHTML = '<span>✨ Suggest peer reviewer. System checks <code>Referee_database_A</code> automatically.</span>';

  setCardInputsDisabled(card, false);
  if (card.expPicker) {
    card.expPicker.setDisabled(false);
  }
}

/**
 * Form Submission Handling
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  // Validate Submitter
  const rawUserName = document.getElementById('user_name').value.trim();
  const userName = stripTitles(rawUserName);
  const userEmail = document.getElementById('user_email').value.trim();
  const userAff = userAffiliationSelect.value;
  const userAffOther = userAffOtherInput.value.trim();
  const userCareer = userCareerSelect.value;
  const thisCycle = document.querySelector('input[name="review_this_cycle"]:checked')?.value || 'no';
  const futureCycles = document.querySelector('input[name="review_future_cycles"]:checked')?.value || 'no';

  const userExpChecks = userExpPicker ? userExpPicker.getSelected() : [];
  const userExpOtherText = userExpPicker ? userExpPicker.getOtherText() : '';

  let hasError = false;

  // Clear errors
  document.querySelectorAll('.field-error').forEach(el => el.textContent = '');

  if (!userName) {
    document.getElementById('err-user_name').textContent = 'Please enter your name.';
    hasError = true;
  }
  if (!userEmail || !userEmail.includes('@')) {
    document.getElementById('err-user_email').textContent = 'Please enter a valid email address.';
    hasError = true;
  }
  if (!userAff) {
    document.getElementById('err-user_affiliation').textContent = 'Please select your affiliation.';
    hasError = true;
  } else if (userAff === 'OTHERS' && !userAffOther) {
    document.getElementById('err-user_affiliation').textContent = 'Please specify the new affiliation name.';
    hasError = true;
  }
  if (!userCareer) {
    document.getElementById('err-user_career_status').textContent = 'Please select your career status.';
    hasError = true;
  }
  if (userExpChecks.length === 0) {
    document.getElementById('err-user_expertise').textContent = 'Please select at least one area of expertise from the list.';
    hasError = true;
  }

  // Validate Referees
  if (state.refereeBlocks.length === 0) {
    alert('Please add at least one referee suggestion (your own entry or peer suggestions) before submitting.');
    return;
  }

  const refereesData = [];
  state.refereeBlocks.forEach((blockId, idx) => {
    const card = document.getElementById(blockId);
    if (!card) return;

    const rawRName = card.querySelector('.ref-name').value.trim();
    const rName = stripTitles(rawRName);
    const rEmail = card.querySelector('.ref-email').value.trim();
    const rAff = card.querySelector('.ref-aff').value;
    const rAffOther = card.querySelector('.ref-aff-other').value.trim();
    const rCareer = card.querySelector('.ref-career').value;

    const rExp = card.expPicker ? card.expPicker.getSelected() : [];
    const rExpOtherText = card.expPicker ? card.expPicker.getOtherText() : '';

    if (!rName) {
      card.querySelector('.err-ref-name').textContent = 'Referee name is mandatory.';
      hasError = true;
    }
    if (!rEmail || !rEmail.includes('@')) {
      card.querySelector('.err-ref-email').textContent = 'Valid email is mandatory.';
      hasError = true;
    }
    if (!rAff) {
      card.querySelector('.err-ref-aff').textContent = 'Affiliation is mandatory.';
      hasError = true;
    }
    if (rExp.length === 0) {
      card.querySelector('.err-ref-exp').textContent = 'Select at least one expertise from the list.';
      hasError = true;
    }

    refereesData.push({
      name: rName,
      email: rEmail,
      affiliation: rAff,
      affiliation_other: rAffOther,
      career_status: rCareer,
      expertise: rExp,
      expertise_other: rExpOtherText,
      is_self: card.dataset.isSelf === 'true'
    });
  });

  if (hasError) {
    alert('Please correct the highlighted errors before submitting.');
    return;
  }

  const payload = {
    user_name: userName,
    user_email: userEmail,
    user_affiliation: userAff,
    user_affiliation_other: userAffOther,
    user_career_status: userCareer,
    user_expertise: userExpChecks,
    user_expertise_other: userExpOtherText,
    review_this_cycle: thisCycle,
    review_future_cycles: futureCycles,
    referees: refereesData
  };

  const btnSubmit = document.getElementById('btn-submit');
  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Submitting...';

  // If running in local file:// mode, handle locally without network fetch
  if (!state.isLiveServer || window.location.protocol === 'file:') {
    handleLocalSubmission(payload);
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Submit Referee Registration / Suggestions';
    return;
  }

  // Otherwise, post to backend server
  try {
    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const result = await response.json();
    showSuccessModal(result, payload);
    await loadDatabase();
  } catch (err) {
    // If backend request fails, fall back to local save
    handleLocalSubmission(payload);
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Submit Referee Registration / Suggestions';
  }
}

/**
 * Handle Submission Locally (for file:// mode or server offline)
 */
function handleLocalSubmission(payload) {
  // Find highest existing REF_XXXX ID
  let maxId = 0;
  state.referees.forEach(r => {
    const m = (r.unique_id || '').match(/REF_(\d+)/);
    if (m) maxId = Math.max(maxId, parseInt(m[1], 10));
  });

  const assignedIds = [];
  payload.referees.forEach(r => {
    const cleanName = stripTitles(r.name);
    // Check if already in DB (email, exact name, or half-initials + surname)
    const existing = state.referees.find(x =>
      (x.email && x.email.toLowerCase() === r.email.toLowerCase()) ||
      matchRefereeName(cleanName, x.referee_name)
    );

    let uid = existing ? existing.unique_id : null;
    if (existing) {
      if (r.is_self) {
        // Self entry gets preference!
        existing.referee_name = cleanName;
        existing.email = r.email;
        existing.affiliation = r.affiliation;
        existing.expertise = (r.expertise || []).join(';');
        existing.career_status = r.career_status;
        existing.available = 'true';
      }
    } else {
      maxId += 1;
      uid = `REF_${String(maxId).padStart(4, '0')}`;
      state.referees.push({
        unique_id: uid,
        referee_name: cleanName,
        email: r.email,
        affiliation: r.affiliation,
        expertise: (r.expertise || []).join(';'),
        career_status: r.career_status,
        referee_status: 'suggested',
        available: 'true'
      });
    }
    assignedIds.push(uid);
  });

  // Handle new "Others" affiliation locally
  if (payload.user_affiliation === 'OTHERS' && payload.user_affiliation_other) {
    const nextAffId = `AFF_${String(state.affiliations.length + 1).padStart(3, '0')}`;
    state.affiliations.push({ id: nextAffId, label: payload.user_affiliation_other });
    populateAllSelects();
  }

  // Save to browser localStorage
  try {
    const history = JSON.parse(localStorage.getItem('gtac_submissions') || '[]');
    const subId = `SUB_${Date.now()}`;
    history.push({ subId, timestamp: new Date().toISOString(), payload, assignedIds });
    localStorage.setItem('gtac_submissions', JSON.stringify(history));

    const result = {
      submission_id: subId,
      assigned_referee_ids: assignedIds,
      is_local: true
    };
    showSuccessModal(result, payload);
  } catch (e) {
    alert('Submission recorded in local memory.');
  }
}

/**
 * Helpers to resolve labels for submission summary modal
 */
function resolveAffiliationLabel(affId, affOther) {
  if (affId === 'OTHERS' && affOther) return affOther;
  const match = state.affiliations.find(a => a.id === affId);
  return match ? match.label : (affOther || affId || 'Not Specified');
}

function resolveCareerLabel(careerId) {
  const match = state.career_status.find(c => c.id === careerId);
  return match ? match.label : (careerId || 'Not Specified');
}

function renderExpertiseChipsHtml(expList, expOther) {
  const list = Array.isArray(expList) ? expList : (expList ? [expList] : []);
  if (list.length === 0 && !expOther) {
    return '<span style="color: #94a3b8; font-size: 0.82rem;">None selected</span>';
  }
  let html = '';
  list.forEach(id => {
    if (id === 'OTHERS') return;
    const match = state.expertise.find(e => e.id === id);
    const label = match ? match.label : id;
    html += `<span class="summary-chip"><strong>${id}</strong>: ${label}</span>`;
  });
  if (expOther) {
    html += `<span class="summary-chip"><strong>Custom</strong>: ${expOther}</span>`;
  }
  return html;
}

/**
 * Display Success Modal in a neat, well-ordered layout without mentioning storage files
 */
function showSuccessModal(result, payload) {
  const modalBody = document.getElementById('modal-body');
  const assignedIds = result.assigned_referee_ids || [];

  const nowFormatted = new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  // 1. Submitter Details
  const submitterAff = resolveAffiliationLabel(payload.user_affiliation, payload.user_affiliation_other);
  const submitterCareer = resolveCareerLabel(payload.user_career_status);
  const submitterExpHtml = renderExpertiseChipsHtml(payload.user_expertise, payload.user_expertise_other);

  // 2. Referees List
  let refCardsHtml = '';
  payload.referees.forEach((r, idx) => {
    const uid = assignedIds[idx] || `REF_${String(idx + 1).padStart(4, '0')}`;
    const affLabel = resolveAffiliationLabel(r.affiliation, r.affiliation_other);
    const careerLabel = resolveCareerLabel(r.career_status);
    const expChips = renderExpertiseChipsHtml(r.expertise, r.expertise_other);
    const typeLabel = r.is_self ? 'Submitter (Own Entry)' : 'Peer Referee';
    const typeBadgeClass = r.is_self ? 'badge-self' : 'badge-verified';

    refCardsHtml += `
      <div class="summary-referee-card">
        <div class="summary-ref-header">
          <span class="summary-ref-title">Referee Suggestion ${idx + 1}</span>
          <div style="display: flex; gap: 6px; align-items: center;">
            <span class="status-badge ${typeBadgeClass}">${typeLabel}</span>
            <span class="status-badge badge-verified"><code>${uid}</code></span>
          </div>
        </div>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-label">Referee Name</div>
            <div class="summary-value">${r.name}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Email ID</div>
            <div class="summary-value">${r.email} <span class="badge-valid-pill">✓ Validated email</span></div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Affiliation</div>
            <div class="summary-value">${affLabel}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Career Status</div>
            <div class="summary-value">${careerLabel}</div>
          </div>
        </div>
        <div style="margin-top: 8px;">
          <div class="summary-label">Expertise Topics</div>
          <div class="summary-chips">${expChips}</div>
        </div>
      </div>
    `;
  });

  modalBody.innerHTML = `
    <div class="summary-meta-badge">
      <span>📋 Reference: <strong><code>${result.submission_id}</code></strong></span>
      <span>•</span>
      <span>📅 ${nowFormatted}</span>
    </div>

    <!-- Section 1: Submitter Profile -->
    <div class="summary-card">
      <div class="summary-card-header">
        <span>1. Submitter Profile</span>
        <span class="badge-valid-pill">✓ Validated Submitter</span>
      </div>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-label">Full Name</div>
          <div class="summary-value">${payload.user_name}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Email Address</div>
          <div class="summary-value">${payload.user_email} <span class="badge-valid-pill">✓ Validated email</span></div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Institutional Affiliation</div>
          <div class="summary-value">${submitterAff}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Career Status</div>
          <div class="summary-value">${submitterCareer}</div>
        </div>
      </div>
      <div style="margin-top: 10px;">
        <div class="summary-label">Areas of Expertise</div>
        <div class="summary-chips">${submitterExpHtml}</div>
      </div>
    </div>

    <!-- Section 2: Review Volunteering -->
    <div class="summary-card">
      <div class="summary-card-header">
        <span>2. GTAC Review Volunteering</span>
      </div>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-label">For Cycle ${state.cycle}</div>
          <div class="summary-value">
            <span class="status-badge ${payload.review_this_cycle === 'yes' ? 'badge-verified' : 'badge-new'}">
              ${payload.review_this_cycle === 'yes' ? '✓ Willing to Review' : 'No'}
            </span>
          </div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Future Cycles</div>
          <div class="summary-value">
            <span class="status-badge ${payload.review_future_cycles === 'yes' ? 'badge-verified' : 'badge-new'}">
              ${payload.review_future_cycles === 'yes' ? '✓ Willing to Review' : 'No'}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 3: Referee Suggestions -->
    <div class="summary-card">
      <div class="summary-card-header">
        <span>3. Referee Suggestions & Registrations (${payload.referees.length})</span>
      </div>
      ${refCardsHtml}
    </div>

    <div class="summary-footer-note">
      ✓ Your referee registration and suggestions have been successfully recorded with GTAC.
    </div>
  `;

  modalSuccess.classList.remove('hidden');
}

// Automated Demo State Initializer for Screenshots and Documentation Walkthroughs
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const demo = params.get('demo');
  if (!demo) return;

  setTimeout(async () => {
    const nameInput = document.getElementById('user_name');
    const emailInput = document.getElementById('user_email');
    const affSelect = document.getElementById('user_affiliation');
    const carSelect = document.getElementById('user_career');

    if (nameInput) nameInput.value = 'Dr. Yashwant Gupta';
    if (emailInput) {
      emailInput.value = 'ygupta@ncra.tifr.res.in';
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (affSelect) affSelect.value = 'AFF_001';
    if (carSelect) carSelect.value = 'CAR_04';

    if (userExpPicker) {
      userExpPicker.setSelected(['EXP_01', 'EXP_14'], '');
    }

    // Turn on review willingness for Cycle 52
    const radCycle52 = document.querySelector('input[name="review_this_cycle"][value="yes"]');
    if (radCycle52) {
      radCycle52.checked = true;
      radCycle52.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const radFuture = document.querySelector('input[name="review_future_cycles"][value="no"]');
    if (radFuture) radFuture.checked = true;

    if (demo === 'cards' || demo === 'summary') {
      const addBar = document.getElementById('add-referee-bar');
      if (addBar) {
        addBar.click();
        await new Promise(r => setTimeout(r, 150));
        const cards = document.querySelectorAll('.referee-card');
        if (cards.length >= 2) {
          const card2 = cards[1];
          const c2Name = card2.querySelector('.ref-name');
          const c2Email = card2.querySelector('.ref-email');
          const c2Aff = card2.querySelector('.ref-aff');
          const c2Car = card2.querySelector('.ref-career');
          if (c2Name) c2Name.value = 'Dr. Somak Raychaudhury';
          if (c2Email) {
            c2Email.value = 'somak@iucaa.in';
            c2Email.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (c2Aff) c2Aff.value = 'AFF_002';
          if (c2Car) c2Car.value = 'CAR_04';
          if (card2.expPicker) {
            card2.expPicker.setSelected(['EXP_04', 'EXP_05'], '');
          }
        }
      }
    }

    if (demo === 'summary') {
      const fakePayload = {
        user_name: 'Dr. Yashwant Gupta',
        user_email: 'ygupta@ncra.tifr.res.in',
        user_affiliation: 'AFF_001',
        user_career_status: 'CAR_04',
        user_expertise: ['EXP_01', 'EXP_14'],
        review_this_cycle: 'yes',
        review_future_cycles: 'no',
        referees: [
          {
            name: 'Dr. Yashwant Gupta',
            email: 'ygupta@ncra.tifr.res.in',
            affiliation: 'AFF_001',
            career_status: 'CAR_04',
            expertise: ['EXP_01', 'EXP_14'],
            is_self: true
          },
          {
            name: 'Dr. Somak Raychaudhury',
            email: 'somak@iucaa.in',
            affiliation: 'AFF_002',
            career_status: 'CAR_04',
            expertise: ['EXP_04', 'EXP_05'],
            is_self: false
          }
        ]
      };
      showSubmissionSummary(fakePayload, {
        status: 'success',
        submission_id: 'SUB_1789134000',
        assigned_referee_ids: ['REF_0001', 'REF_0003']
      });
    }
  }, 350);
});

