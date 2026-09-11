/**
 * GTAC Referee Form & Database Management Script
 */

// Global State
const state = {
  affiliations: [],
  expertise: [],
  career_status: [],
  referees: [],
  refereeCount: 0,
  refereeBlocks: [] // list of block IDs
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
const btnAddReferee = document.getElementById('btn-add-referee');
const modalSuccess = document.getElementById('modal-success');
const btnCloseModal = document.getElementById('btn-close-modal');

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
  setupEventListeners();
  // Initially add at least 1 referee block
  addRefereeBlock();
});

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
 * Fetch database items from backend API
 */
async function loadDatabase() {
  try {
    const res = await fetch('/api/database');
    if (!res.ok) throw new Error('API request failed');
    const data = await res.json();
    state.affiliations = data.affiliations || [];
    state.expertise = data.expertise || [];
    state.career_status = data.career_status || [];
    state.referees = data.referees || [];

    populateSelect(userAffiliationSelect, state.affiliations, true);
    populateSelect(userCareerSelect, state.career_status, false);
    userExpPicker.populate();

    // Re-populate all active referee cards
    state.refereeBlocks.forEach(blockId => {
      const card = document.getElementById(blockId);
      if (card && card.expPicker) {
        card.expPicker.populate();
      }
    });
  } catch (err) {
    console.error('Failed to load database from API, using offline fallback:', err);
    loadOfflineFallback();
  }
}

/**
 * Fallback static database if server API is not reachable
 */
function loadOfflineFallback() {
  state.affiliations = [
    { id: 'AFF_001', label: 'National Centre for Radio Astrophysics (NCRA-TIFR), Pune' },
    { id: 'AFF_002', label: 'Inter-University Centre for Astronomy and Astrophysics (IUCAA), Pune' },
    { id: 'AFF_003', label: 'Raman Research Institute (RRI), Bengaluru' },
    { id: 'AFF_004', label: 'Indian Institute of Science (IISc), Bengaluru' },
    { id: 'AFF_005', label: 'Tata Institute of Fundamental Research (TIFR), Mumbai' },
    { id: 'AFF_015', label: 'National Radio Astronomy Observatory (NRAO), USA' }
  ];
  state.expertise = [
    { id: 'EXP_01', label: 'Pulsars, Fast Transients & Neutron Stars' },
    { id: 'EXP_02', label: 'Epoch of Reionization (EoR) & 21cm Cosmology' },
    { id: 'EXP_03', label: 'Extragalactic Neutral Hydrogen (HI) & Galaxy Dynamics' },
    { id: 'EXP_04', label: 'Active Galactic Nuclei (AGN) & Relativistic Radio Jets' },
    { id: 'EXP_11', label: 'Low-Frequency Radio Interferometry Techniques' }
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
    { unique_id: 'REF_0001', referee_name: 'Prof. Yashwant Gupta', email: 'ygupta@ncra.tifr.res.in', affiliation: 'AFF_001', expertise: 'EXP_01;EXP_14', career_status: 'CAR_04', referee_status: 'verified', available: 'true' },
    { unique_id: 'REF_0002', referee_name: 'Prof. Jayaram Chengalur', email: 'chengalur@ncra.tifr.res.in', affiliation: 'AFF_001', expertise: 'EXP_03;EXP_11', career_status: 'CAR_04', referee_status: 'verified', available: 'true' },
    { unique_id: 'REF_0008', referee_name: 'Dr. Ananda Hota', email: 'ananda.hota@cbs.ac.in', affiliation: 'AFF_005', expertise: 'EXP_03;EXP_04', career_status: 'CAR_05', referee_status: 'suggested', available: 'true' }
  ];
  populateSelect(userAffiliationSelect, state.affiliations, true);
  populateSelect(userCareerSelect, state.career_status, false);
  userExpPicker.populate();
}

/**
 * Populate select dropdowns
 */
function populateSelect(selectEl, items, includeOthers = false) {
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

  // Sync profile changes to Block 1 if self-volunteer is active
  document.getElementById('user_name').addEventListener('input', syncSelfRefereeIfApplicable);
  document.getElementById('user_email').addEventListener('input', syncSelfRefereeIfApplicable);
  userCareerSelect.addEventListener('change', syncSelfRefereeIfApplicable);

  // Review willingness radio buttons
  document.querySelectorAll('input[name="review_this_cycle"], input[name="review_future_cycles"]').forEach(radio => {
    radio.addEventListener('change', handleReviewWillingnessChange);
  });

  // Add referee button
  btnAddReferee.addEventListener('click', () => {
    addRefereeBlock();
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
      userExpPicker.clear();
      refereeContainer.innerHTML = '';
      state.refereeBlocks = [];
      state.refereeCount = 0;
      addRefereeBlock();
    }, 50);
  });
}

/**
 * Handle Willingness Change (Rule: if either is yes, block 1 is self and locked)
 */
function handleReviewWillingnessChange() {
  const thisCycle = document.querySelector('input[name="review_this_cycle"]:checked')?.value;
  const futureCycles = document.querySelector('input[name="review_future_cycles"]:checked')?.value;

  const isWilling = (thisCycle === 'yes' || futureCycles === 'yes');

  // Ensure block 1 exists
  if (state.refereeBlocks.length === 0) {
    addRefereeBlock();
  }

  const firstBlockId = state.refereeBlocks[0];
  const firstBlockEl = document.getElementById(firstBlockId);

  if (isWilling) {
    lockBlockAsSelf(firstBlockEl);
  } else {
    unlockBlockFromSelf(firstBlockEl);
  }
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
  badge.className = 'status-badge badge-self';
  badge.textContent = 'Self - Review Volunteer (Locked)';

  const banner = cardEl.querySelector('.referee-alert-banner');
  banner.className = 'referee-alert-banner alert-self';
  banner.innerHTML = '<span>🔒 <strong>Review Volunteer (Self):</strong> Automatically populated from your personal profile and locked.</span>';

  // Populate data from user fields
  const userName = document.getElementById('user_name').value.trim();
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

  nameInput.value = userName;
  emailInput.value = userEmail;
  affSelect.value = userAff;
  if (userAff === 'OTHERS') {
    affOtherBox.classList.remove('hidden');
    affOtherInput.value = userAffOther;
  } else {
    affOtherBox.classList.add('hidden');
  }
  careerSelect.value = userCareer;

  // Sync selected expertise via ExpertisePicker
  if (cardEl.expPicker && userExpPicker) {
    cardEl.expPicker.setSelected(userExpPicker.getSelected(), userExpPicker.getOtherText());
    cardEl.expPicker.setDisabled(true);
  }

  // Lock text & select inputs inside card
  setCardInputsDisabled(cardEl, true);

  // Hide AI button and delete button
  const btnRemove = cardEl.querySelector('.btn-remove-referee');
  if (btnRemove) btnRemove.classList.add('hidden');
  const btnAi = cardEl.querySelector('.btn-ai-suggest');
  if (btnAi) btnAi.classList.add('hidden');
}

/**
 * Unlock Referee Block 1 if user switches back to No
 */
function unlockBlockFromSelf(cardEl) {
  if (!cardEl) return;
  if (cardEl.dataset.isSelf !== 'true') return;

  cardEl.dataset.isSelf = 'false';
  cardEl.className = 'referee-card';

  // Reset badge and banner
  const badge = cardEl.querySelector('.status-badge');
  badge.className = 'status-badge badge-new';
  badge.textContent = 'New Suggestion';

  const banner = cardEl.querySelector('.referee-alert-banner');
  banner.className = 'referee-alert-banner alert-new';
  banner.innerHTML = '<span>✨ Suggest peer reviewer. System checks <code>Referee_database_A</code> automatically.</span>';

  // Unlock inputs & expertise picker
  setCardInputsDisabled(cardEl, false);
  if (cardEl.expPicker) {
    cardEl.expPicker.setDisabled(false);
  }

  // Show AI button
  const btnAi = cardEl.querySelector('.btn-ai-suggest');
  if (btnAi) btnAi.classList.remove('hidden');

  // Show delete button if more than 1 referee exists
  updateRemoveButtonsVisibility();
}

/**
 * Synchronize user profile fields to Block 1 if self-volunteer is active
 */
function syncSelfRefereeIfApplicable() {
  const thisCycle = document.querySelector('input[name="review_this_cycle"]:checked')?.value;
  const futureCycles = document.querySelector('input[name="review_future_cycles"]:checked')?.value;
  if (thisCycle === 'yes' || futureCycles === 'yes') {
    if (state.refereeBlocks.length > 0) {
      const firstBlockEl = document.getElementById(state.refereeBlocks[0]);
      lockBlockAsSelf(firstBlockEl);
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
 */
function addRefereeBlock() {
  state.refereeCount += 1;
  const blockIndex = state.refereeCount;
  const blockId = `referee-card-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  state.refereeBlocks.push(blockId);

  const card = document.createElement('div');
  card.id = blockId;
  card.className = 'referee-card';
  card.dataset.blockIndex = blockIndex;
  card.dataset.isSelf = 'false';

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

  // If this is block 1 and user is willing to review, lock immediately
  if (state.refereeBlocks.length === 1) {
    const thisCycle = document.querySelector('input[name="review_this_cycle"]:checked')?.value;
    const futureCycles = document.querySelector('input[name="review_future_cycles"]:checked')?.value;
    if (thisCycle === 'yes' || futureCycles === 'yes') {
      lockBlockAsSelf(card);
    }
  }

  updateRefereeCardNumbers();
  updateRemoveButtonsVisibility();
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

  // AI Suggestion
  btnAi.addEventListener('click', async () => {
    const nameVal = nameInput.value.trim();
    if (!nameVal) {
      alert('Please enter a Referee Name first to ask Gemini for suggestions.');
      nameInput.focus();
      return;
    }
    btnAi.textContent = 'Thinking...';
    btnAi.disabled = true;
    try {
      const res = await fetch('/api/gemini-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameVal })
      });
      const data = await res.json();
      applyAiSuggestions(card, data);
    } catch (err) {
      console.warn('AI suggestion failed:', err);
    } finally {
      btnAi.textContent = '✨ Ask Gemini';
      btnAi.disabled = false;
    }
  });

  // Remove button
  btnRemove.addEventListener('click', () => {
    removeRefereeBlock(card.id);
  });
}

/**
 * Remove a referee card
 */
function removeRefereeBlock(blockId) {
  const card = document.getElementById(blockId);
  if (!card) return;
  if (card.dataset.isSelf === 'true') {
    alert('Cannot remove self-reviewer block while review willingness is selected as Yes.');
    return;
  }
  card.remove();
  state.refereeBlocks = state.refereeBlocks.filter(id => id !== blockId);
  updateRefereeCardNumbers();
  updateRemoveButtonsVisibility();
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
  const total = state.refereeBlocks.length;
  state.refereeBlocks.forEach((blockId, idx) => {
    const card = document.getElementById(blockId);
    if (card) {
      const btnRemove = card.querySelector('.btn-remove-referee');
      if (btnRemove) {
        if (card.dataset.isSelf === 'true' || total <= 1) {
          btnRemove.classList.add('hidden');
        } else {
          btnRemove.classList.remove('hidden');
        }
      }
    }
  });
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
    const query = inputEl.value.trim().toLowerCase();
    if (query.length < 2) {
      dropdown.classList.add('hidden');
      dropdown.innerHTML = '';
      resetCardToNewIfNotSelf(card);
      return;
    }

    debounceTimer = setTimeout(async () => {
      // Search client database cache first
      let matches = state.referees.filter(r => {
        const val = (r[fieldKey] || '').toLowerCase();
        return val.includes(query);
      });

      // If online API available, also query server
      try {
        const res = await fetch(`/api/referees/lookup?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const apiData = await res.json();
          if (apiData.matches && apiData.matches.length > 0) {
            matches = apiData.matches;
          }
        }
      } catch (e) {
        // Fallback to local matches
      }

      renderAutocompleteDropdown(card, dropdown, matches, inputEl);
    }, 200);
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
    const isVer = ref.referee_status === 'verified';
    const badgeClass = isVer ? 'badge-verified' : 'badge-suggested';
    const badgeText = isVer ? 'Verified' : 'Suggested';

    item.innerHTML = `
      <div>
        <div class="ac-name">${ref.referee_name}</div>
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
 */
function populateCardWithReferee(card, ref) {
  const nameInput = card.querySelector('.ref-name');
  const emailInput = card.querySelector('.ref-email');
  const affSelect = card.querySelector('.ref-aff');
  const careerSelect = card.querySelector('.ref-career');
  const badge = card.querySelector('.status-badge');
  const banner = card.querySelector('.referee-alert-banner');
  const btnAi = card.querySelector('.btn-ai-suggest');

  nameInput.value = ref.referee_name || '';
  emailInput.value = ref.email || '';
  if (ref.affiliation) affSelect.value = ref.affiliation;
  if (ref.career_status) careerSelect.value = ref.career_status;

  // Expertise populated via card.expPicker
  if (card.expPicker) {
    card.expPicker.setSelected(ref.expertise || '');
  }

  const isVerified = (ref.referee_status === 'verified');

  if (isVerified) {
    // Verified rule: non-editable
    card.className = 'referee-card is-verified';
    badge.className = 'status-badge badge-verified';
    badge.textContent = 'Verified (Locked)';

    banner.className = 'referee-alert-banner alert-verified';
    banner.innerHTML = `
      <span>✅ <strong>Referee Exists & Verified:</strong> <code>${ref.unique_id}</code> - ${ref.referee_name} is a verified GTAC referee (Non-editable).</span>
    `;

    setCardInputsDisabled(card, true);
    if (card.expPicker) card.expPicker.setDisabled(true);
    if (btnAi) btnAi.classList.add('hidden');
  } else {
    // Suggested rule: editable suggestion
    card.className = 'referee-card is-suggested';
    badge.className = 'status-badge badge-suggested';
    badge.textContent = 'Suggested in DB';

    banner.className = 'referee-alert-banner alert-suggested';
    banner.innerHTML = `
      <span>ℹ️ <strong>Existing Suggested Referee:</strong> <code>${ref.unique_id}</code> found in database. Fields pre-filled as suggestion; you may verify or edit.</span>
    `;

    setCardInputsDisabled(card, false);
    if (card.expPicker) card.expPicker.setDisabled(false);
    if (btnAi) btnAi.classList.remove('hidden');
  }
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
  const userName = document.getElementById('user_name').value.trim();
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
  const refereesData = [];
  state.refereeBlocks.forEach((blockId, idx) => {
    const card = document.getElementById(blockId);
    if (!card) return;

    const rName = card.querySelector('.ref-name').value.trim();
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
    // Reload database in background to get newly assigned IDs & affiliations
    await loadDatabase();
  } catch (err) {
    console.error('Submission failed:', err);
    alert('Submission error: ' + err.message);
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Submit Referee Registration / Suggestions';
  }
}

/**
 * Display Success Modal
 */
function showSuccessModal(result, payload) {
  const modalBody = document.getElementById('modal-body');
  const assignedIds = result.assigned_referee_ids || [];

  let refSummaryHtml = '<ul>';
  payload.referees.forEach((r, i) => {
    const uid = assignedIds[i] || 'RECORDED';
    refSummaryHtml += `<li><strong>${r.name}</strong> (${r.email}) &rarr; <span class="status-badge badge-verified">${uid}</span></li>`;
  });
  refSummaryHtml += '</ul>';

  modalBody.innerHTML = `
    <p><strong>Submission ID:</strong> <code>${result.submission_id}</code></p>
    <p><strong>Submitter:</strong> ${payload.user_name} (${payload.user_email})</p>
    <p><strong>Review Volunteer:</strong> This Cycle: <em>${payload.review_this_cycle.toUpperCase()}</em> | Future Cycles: <em>${payload.review_future_cycles.toUpperCase()}</em></p>
    <p style="margin-top: 10px;"><strong>Referees Registered in <code>Referee_database_A.csv</code>:</strong></p>
    ${refSummaryHtml}
    <p style="margin-top: 10px; font-size: 0.85rem; color: #166534;">
      ✓ All entries, custom affiliations, and unique IDs have been permanently committed to the database.
    </p>
  `;

  modalSuccess.classList.remove('hidden');
}
