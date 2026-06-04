
function hideAllHomeScreens() {}

window.showHomeModules = function() {
  const chr = document.getElementById('core-hr-actions');
  if (chr) chr.style.display = 'block';
  const abs = document.getElementById('absence-actions');
  if (abs) abs.style.display = 'block';
  const pro = document.getElementById('procurement-actions');
  if (pro) pro.style.display = 'block';
}

window.showHCMModules = function() {}
window.showCoreHRActions = function() {}
window.showAbsenceActions = function() {}
window.showProcurementActions = function() {}

if (window.trustedTypes && window.trustedTypes.createPolicy) {
  if (!window.trustedTypes.defaultPolicy) {
    try {
      window.trustedTypes.createPolicy('default', {
        createHTML: (string) => string,
        createScript: (string) => string,
        createScriptURL: (string) => string
      });
    } catch (e) {
      console.warn("TrustedTypes default policy creation failed:", e);
    }
  }
}

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? '/api'
  : 'https://voice-action-server.onrender.com/api';

// Multi-company support configuration
const COMPANY_ORACLE_URLS = {
  'companya': 'https://fa-eubg-test-saasfademo1.ds-fa.oraclepdemos.com',
  'companyb': 'https://fa-euth-dev58-saasfademo1.ds-fa.oraclepdemos.com',
  'dabiqy': 'https://dabiqy.ds-fa.oraclepdemos.com'
};

const DEFAULT_ORACLE_BASE_URL = 'https://dabiqy.ds-fa.oraclepdemos.com';

// Read optional company code from URL parameter
const urlParams = new URLSearchParams(window.location.search);
const company = urlParams.get('company');

// Determine the active Oracle Base URL
const ORACLE_BASE_URL = company && COMPANY_ORACLE_URLS[company.toLowerCase()]
  ? COMPANY_ORACLE_URLS[company.toLowerCase()]
  : DEFAULT_ORACLE_BASE_URL;

// State Variables
let appState = {
  workflowStep: 1, // 1: Get Employee, 2: Wait for button, 3: Get Manager, 4: Confirm
  person_number: null,
  manager_person_number: null,
  language_code: 'unknown',
  encodedPersonId: null,
  WorkRelationshipId: null,
  encodedAssignmentId: null,
  ManagerAssignmentId: null,
  managerSelfLink: null,
  tempExtractedNumber: null,
  worker_display_name: null,
  current_manager_name: null,
  currentManagerNumber: null,
  manager_display_name: null,
  effective_date: new Date().toISOString().split('T')[0],
  audioBlob: null,
  currentAction: 'assign_manager', // 'assign_manager' or 'change_department'
  current_department: null,
  new_department: null,
  available_departments: [],
  assignmentSelfLink: null,
  selected_location_id: null,
  new_location: null,
  available_locations: [],
  selected_job_id: null,
  new_job: null,
  available_jobs: [],
  current_job_name: null,
  available_positions: [],
  selected_position_id: null,
  new_position: null,
  current_position_name: null,
  available_grades: [],
  selected_grade_id: null,
  new_grade: null,
  current_grade_name: null
};

// DOM Elements
const micBtn = document.getElementById('mic-btn');
const statusBar = document.getElementById('status-bar');
const langSelect = document.getElementById('lang-select');
const transcriptBox = document.getElementById('transcript-box');
const transcriptText = document.getElementById('transcript-text');
const mainTitle = document.getElementById('main-title');

// Voice Confirm Elements
const voiceConfirmBox = document.getElementById('voice-confirm-box');
const voiceConfirmNumber = document.getElementById('voice-confirm-number');
const btnVoiceYes = document.getElementById('btn-voice-yes');
const btnVoiceNo = document.getElementById('btn-voice-no');

function updateStepDots(step) {
  for(let i=1; i<=4; i++) {
    const dot = document.getElementById(`dot-${i}`);
    if(!dot) continue;
    dot.className = 'step-dot';
    if(i < step) {
      dot.classList.add('completed');
    } else if (i === step) {
      dot.classList.add('active');
    }
  }
}

// Employee UI
const employeeDetailsBox = document.getElementById('employee-details-box');
const empName = document.getElementById('emp-name');
const empNo = document.getElementById('emp-no');
const empCurrentManager = document.getElementById('emp-current-manager');

// Actions UI
const step2Actions = document.getElementById('step2-actions');
const btnAssignNew = document.getElementById('btn-assign-new');
const btnChangeExisting = document.getElementById('btn-change-existing');

// Manager UI
const managerDetailsBox = document.getElementById('manager-details-box');
const mgrName = document.getElementById('mgr-name');
const mgrNo = document.getElementById('mgr-no');
const btnProceedConfirm = document.getElementById('btn-proceed-confirm');

// Tabs setup
const tabBtns = document.querySelectorAll('.tab-btn');
const screens = document.querySelectorAll('.screen');

// Hide all tabs except Home on page load
window.showOnlyHomeTab = function() {
  const allTabs = document.querySelectorAll('.tab, .nav-tab, .tab-btn, [role="tab"]');
  allTabs.forEach(tab => {
    const text = tab.textContent.trim().toLowerCase();
    if (!text.includes('home') && !text.includes('hcm') && !text.includes('procurement')) {
      tab.style.setProperty('display', 'none', 'important');
      tab.style.setProperty('visibility', 'hidden', 'important');
    } else {
      tab.style.removeProperty('display');
      tab.style.removeProperty('visibility');
    }
  });
}

// Show all tabs when action is selected
window.showAllTabs = function() {
  const allTabs = document.querySelectorAll('.tab, .nav-tab, .tab-btn, [role="tab"]');
  allTabs.forEach(tab => {
    tab.style.removeProperty('display');
    tab.style.removeProperty('visibility');
  });
}

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
  const allTabs = document.querySelectorAll('.tab, .nav-tab, .tab-btn, [role="tab"]');
  console.log('Total tabs found:', allTabs.length);
  allTabs.forEach(tab => console.log('Tab:', tab.textContent.trim(), tab.className));
  showOnlyHomeTab();
  showHomeModules();

  // Theme Toggle Logic
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.textContent = savedTheme === 'light' ? '☀️' : '🌙';

    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      themeToggle.textContent = next === 'light' ? '☀️' : '🌙';
    });
  }

  // Make all dropdown select elements searchable
  const selectIds = [
    'dept-select',
    'location-select',
    'job-select',
    'manager-select',
    'position-select',
    'grade-select',
    'hire-legal-employer',
    'hire-business-unit'
  ];
  selectIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) makeSelectSearchable(el);
  });
});

// Helper to make any select element searchable
function makeSelectSearchable(selectEl) {
  if (!selectEl) return;
  
  if (selectEl.dataset.searchableInitialized) return;
  selectEl.dataset.searchableInitialized = 'true';
  
  // Hide native select
  selectEl.style.display = 'none';
  
  // Wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'custom-select-wrapper';
  
  // Trigger group
  const trigger = document.createElement('div');
  trigger.className = 'custom-select-trigger';
  
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'custom-select-search';
  searchInput.placeholder = selectEl.options[0]?.text || 'Select...';
  
  const arrow = document.createElement('span');
  arrow.className = 'custom-select-arrow';
  arrow.innerHTML = '&#9662;';
  
  trigger.appendChild(searchInput);
  trigger.appendChild(arrow);
  wrapper.appendChild(trigger);
  
  // Options container
  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'custom-select-options hidden';
  wrapper.appendChild(optionsContainer);
  
  // Insert before native element
  selectEl.parentNode.insertBefore(wrapper, selectEl);
  
  function rebuildOptions() {
    optionsContainer.innerHTML = '';
    const query = searchInput.value.toLowerCase().trim();
    
    Array.from(selectEl.options).forEach((opt, idx) => {
      // Don't show first item if it is empty placeholder
      if (idx === 0 && !opt.value) return;
      
      const text = opt.text;
      const val = opt.value;
      
      if (query && !text.toLowerCase().includes(query)) return;
      
      const optionDiv = document.createElement('div');
      optionDiv.className = 'custom-option';
      optionDiv.textContent = text;
      optionDiv.dataset.value = val;
      
      if (selectEl.value === val) {
        optionDiv.classList.add('selected');
        if (document.activeElement !== searchInput) {
          searchInput.placeholder = text;
        }
      }
      
      optionDiv.addEventListener('mousedown', (e) => {
        e.preventDefault(); // prevent losing focus
        selectEl.value = val;
        searchInput.value = '';
        searchInput.placeholder = text;
        optionsContainer.classList.add('hidden');
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        rebuildOptions();
      });
      
      optionsContainer.appendChild(optionDiv);
    });
    
    if (optionsContainer.children.length === 0) {
      const noResultsDiv = document.createElement('div');
      noResultsDiv.className = 'custom-option no-results';
      noResultsDiv.textContent = 'No matches found';
      optionsContainer.appendChild(noResultsDiv);
    }
  }
  
  rebuildOptions();
  
  // Mutation observer to capture dynamic options changes
  const observer = new MutationObserver(() => {
    rebuildOptions();
    const activeOpt = selectEl.options[selectEl.selectedIndex];
    if (activeOpt) {
      searchInput.placeholder = activeOpt.text;
    }
  });
  observer.observe(selectEl, { childList: true, subtree: true });
  
  // Input search typing
  searchInput.addEventListener('input', () => {
    optionsContainer.classList.remove('hidden');
    rebuildOptions();
  });
  
  // Focus show options
  searchInput.addEventListener('focus', () => {
    document.querySelectorAll('.custom-select-options').forEach(el => {
      if (el !== optionsContainer) el.classList.add('hidden');
    });
    optionsContainer.classList.remove('hidden');
    rebuildOptions();
  });
  
  // Click outside to close
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      optionsContainer.classList.add('hidden');
      searchInput.value = '';
      const selectedOpt = selectEl.options[selectEl.selectedIndex];
      if (selectedOpt) {
        searchInput.placeholder = selectedOpt.text;
      }
    }
  });
}

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if(btn.disabled) return;
    const target = btn.getAttribute('data-target');
    if (target === 'screen-dashboard') {
      showOnlyHomeTab();
  showHomeModules();
      resetApp();
    } else {
      switchTab(target);
    }
  });
});

function switchTab(targetId) {
  console.log("Switching to tab:", targetId);
  tabBtns.forEach(b => b.classList.remove('active'));
  document.querySelector(`.tab-btn[data-target="${targetId}"]`).classList.add('active');
  
  screens.forEach(s => s.classList.remove('active'));
  document.getElementById(targetId).classList.add('active');

  if(targetId === 'screen-audit') {
    renderAuditLog();
  }
}

// MediaRecorder setup
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

micBtn.addEventListener('click', toggleRecording);

function toggleRecording() {
  if (isRecording) {
    isRecording = false;
    micBtn.classList.remove('recording');
    statusBar.textContent = "â ³ Processing your voice...";
    statusBar.style.color = 'var(--accent-color)';
    if(mediaRecorder) mediaRecorder.stop();
  } else {
    console.log(`[Step ${appState.workflowStep}] Start recording clicked...`);
    isRecording = true;
    audioChunks = [];
    micBtn.classList.add('recording');
    statusBar.textContent = "ðŸ”´ Listening... click mic to stop";
    statusBar.style.color = 'var(--danger-color)';
    transcriptBox.style.display = 'block';
    transcriptText.textContent = "...";

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorder.start();
        
        mediaRecorder.ondataavailable = e => {
            audioChunks.push(e.data);
        };
        
        mediaRecorder.onstop = () => {
          console.log("MediaRecorder stopped. Creating blob...");
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          appState.audioBlob = audioBlob;
          sendToSarvam(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };
      }).catch(err => {
        console.error("Microphone access failed:", err);
        statusBar.textContent = "Error: Could not access microphone.";
        statusBar.style.color = 'var(--danger-color)';r.style.color = 'var(--danger)';
        isRecording = false;
        micBtn.classList.remove('recording');
      });
  }
}

async function sendToSarvam(audioBlob) {
  appState.language_code = langSelect.value;
  console.log(`[Step ${appState.workflowStep}] Sending audio to Sarvam...`);
  
  try {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('language_code', appState.language_code);
    
    const sttRes = await fetch(`${API_BASE}/sarvam/stt`, { method: 'POST', body: formData });
    if (!sttRes.ok) throw new Error("Voice recognition failed.");
    
    const sttData = await sttRes.json();
    const transcript = sttData.transcript;
    appState.language_code = sttData.language_code || appState.language_code;
    
    console.log("Transcript received:", transcript);
    transcriptText.textContent = transcript || "Could not understand audio.";
    
    if(!transcript) throw new Error("No transcript generated.");

    await processTranscript(transcript);

  } catch (error) {
    console.error("Sarvam Error:", error);
    handleError(error.message);
  }
}

async function processTranscript(transcript) {
    console.log(`[Step ${appState.workflowStep}] Processing transcript...`);
    
    // Extract first number found
    const digitMatch = transcript.match(/\d+/);
    if (!digitMatch) {
      handleError("Could not detect any numbers in your speech.");
      return;
    }
    const extractedNumber = digitMatch[0];
    
    // Show confirmation box
    appState.tempExtractedNumber = extractedNumber;
    voiceConfirmNumber.textContent = extractedNumber;
    
    document.getElementById('mic-section').style.display = 'none';
    statusBar.textContent = "Please confirm the number.";
    voiceConfirmBox.style.display = 'block';
}

btnVoiceYes.addEventListener('click', async () => {
    voiceConfirmBox.style.display = 'none';
    
    if (appState.workflowStep === 1) {
        appState.person_number = appState.tempExtractedNumber;
        console.log("Confirmed Employee Person Number:", appState.person_number);
        await fetchEmployeeDetails();
    } else if (appState.workflowStep === 3) {
        appState.manager_person_number = appState.tempExtractedNumber;
        console.log("Confirmed Manager Person Number:", appState.manager_person_number);
        await fetchManagerDetails();
    }
});

btnVoiceNo.addEventListener('click', () => {
    voiceConfirmBox.style.display = 'none';
    document.getElementById('mic-section').style.display = 'flex';
    transcriptBox.style.display = 'none';
    
    statusBar.textContent = appState.workflowStep === 1 
      ? "Press mic and speak the Person Number again" 
      : "Please speak the Manager's Person Number again";
    statusBar.style.color = 'var(--text-secondary)';
});

async function fetchEmployeeDetails() {
    try {
        console.log("Fetching Worker Details for Person No:", appState.person_number);
        statusBar.textContent = `Looking up Person ${appState.person_number}...`;
        
        const res = await fetch(`${API_BASE}/oracle/worker?person_number=${appState.person_number}`, { headers: { 'Content-Type': 'application/json', 'x-oracle-auth': appState.oracleAuth, 'x-oracle-url': appState.oracleUrl } });
        if (!res.ok) throw new Error(`Person number ${appState.person_number} not found.`);
        const data = await res.json();
        
        if (!data.encodedPersonId) throw new Error(`Person number ${appState.person_number} details incomplete.`);
        
        appState.encodedPersonId = data.encodedPersonId.split('?')[0];
        appState.encodedAssignmentId = data.encodedAssignmentId.split('?')[0];
        appState.WorkRelationshipId = data.WorkRelationshipId;
        appState.worker_display_name = data.DisplayName;
        appState.current_manager_name = data.currentManagerName || "None";
        appState.currentManagerNumber = data.currentManagerNumber;
        appState.managerSelfLink = data.managerSelfLink;
        appState.assignmentSelfLink = data.assignmentSelfLink;
        appState.current_department = data.DepartmentName;
        appState.LocationName = data.LocationName;
        appState.BusinessUnitId = data.BusinessUnitId;
        appState.BusinessUnitName = data.BusinessUnitName;
        appState.current_job_name = data.JobName;
        appState.current_position_name = data.PositionName;
        appState.current_grade_name = data.GradeName;
        appState.current_bu_name = data.BusinessUnitName;

        console.log("Employee found:", appState.worker_display_name);
        
        // Update UI for Step 2
        empName.textContent = appState.worker_display_name;
        empNo.textContent = appState.person_number;

        // Show/Hide relevant info based on action
        const empDeptRow = document.getElementById('emp-dept-row');
        const empCurrentDept = document.getElementById('emp-current-dept');
        const empManagerRow = document.getElementById('emp-manager-row');
        const empStatusRow = document.getElementById('emp-status-row');
        const empManagerTypeRow = document.getElementById('emp-manager-type-row');

        if (appState.currentAction === 'change_department') {
            if (empDeptRow) empDeptRow.style.display = 'flex';
            if (empCurrentDept) {
                empCurrentDept.textContent = appState.current_department;
                empDeptRow.querySelector('.label').innerText = 'Current Department';
            }
            
            // Hide manager rows
            if (empManagerRow) empManagerRow.style.display = 'none';
            if (empStatusRow) empStatusRow.style.display = 'none';
            if (empManagerTypeRow) empManagerTypeRow.style.display = 'none';

            // Fetch available departments for Step 3
            fetchDepartments();
        } else if (appState.currentAction === 'change_location') {
            if (empDeptRow) empDeptRow.style.display = 'flex';
            if (empCurrentDept) {
                empCurrentDept.textContent = data.LocationName || 'Not Assigned';
                empDeptRow.querySelector('.label').innerText = 'Current Location';
            }
            
            // Hide manager rows
            if (empManagerRow) empManagerRow.style.display = 'none';
            if (empStatusRow) empStatusRow.style.display = 'none';
            if (empManagerTypeRow) empManagerTypeRow.style.display = 'none';

            // Fetch available locations for Step 3
            fetchLocations();
        } else if (appState.currentAction === 'change_job') {
            if (empDeptRow) empDeptRow.style.display = 'flex';
            if (empCurrentDept) {
                empCurrentDept.textContent = appState.current_job_name || 'Not Assigned';
                empDeptRow.querySelector('.label').innerText = 'Current Job';
            }
            
            // Hide manager rows
            if (empManagerRow) empManagerRow.style.display = 'none';
            if (empStatusRow) empStatusRow.style.display = 'none';
            if (empManagerTypeRow) empManagerTypeRow.style.display = 'none';

            // Fetch available jobs for Step 3
            fetchJobs();
        } else if (appState.currentAction === 'change_position') {
            if (empDeptRow) empDeptRow.style.display = 'flex';
            if (empCurrentDept) {
                empCurrentDept.textContent = appState.current_position_name || 'Not Assigned';
                empDeptRow.querySelector('.label').innerText = 'Current Position';
            }
            
            // Hide manager rows
            if (empManagerRow) empManagerRow.style.display = 'none';
            if (empStatusRow) empStatusRow.style.display = 'none';
            if (empManagerTypeRow) empManagerTypeRow.style.display = 'none';

            // Fetch available positions for Step 3
            fetchPositions();
        } else if (appState.currentAction === 'change_grade') {
            if (empDeptRow) empDeptRow.style.display = 'flex';
            if (empCurrentDept) {
                empCurrentDept.textContent = appState.current_grade_name || 'Not Assigned';
                empDeptRow.querySelector('.label').innerText = 'Current Grade';
            }
            
            // Hide manager rows
            if (empManagerRow) empManagerRow.style.display = 'none';
            if (empStatusRow) empStatusRow.style.display = 'none';
            if (empManagerTypeRow) empManagerTypeRow.style.display = 'none';

            // Fetch available grades for Step 3
            fetchGrades();
        } else if (appState.currentAction === 'change_business_unit') {
            if (empDeptRow) empDeptRow.style.display = 'flex';
            if (empCurrentDept) {
                empCurrentDept.textContent = appState.current_bu_name || 'Not Assigned';
                empDeptRow.querySelector('.label').innerText = 'Current Business Unit';
            }
            
            // Hide manager rows
            if (empManagerRow) empManagerRow.style.display = 'none';
            if (empStatusRow) empStatusRow.style.display = 'none';
            if (empManagerTypeRow) empManagerTypeRow.style.display = 'none';

            // Fetch available Business Units for Step 3
            fetchBusinessUnits();
        } else {
            if (empDeptRow) empDeptRow.style.display = 'none';
            
            // Show manager rows
            if (empManagerRow) empManagerRow.style.display = 'flex';
            if (empStatusRow) empStatusRow.style.display = 'flex';
            
            // Fetch available managers
            fetchManagers();
        }
        
        // Avatar Initials
        const empAvatar = document.getElementById('emp-avatar');
        if (empAvatar && appState.worker_display_name) {
          empAvatar.textContent = appState.worker_display_name.substring(0, 2).toUpperCase();
        } else if (empAvatar) {
          empAvatar.textContent = "EM";
        }

        if (appState.currentAction !== 'change_department') {
            const empManagerBadge = document.getElementById('emp-manager-badge');
            if (appState.current_manager_name === "None") {
                empCurrentManager.textContent = "Not Assigned";
                if (empManagerTypeRow) empManagerTypeRow.style.display = 'none';
                if (empManagerBadge) {
                    empManagerBadge.textContent = 'Not Assigned';
                    empManagerBadge.className = 'badge warning';
                }
            } else {
                empCurrentManager.textContent = `${appState.current_manager_name} (${appState.currentManagerNumber || 'Unknown'})`;
                if (empManagerTypeRow) empManagerTypeRow.style.display = 'flex';
                if (empManagerBadge) {
                    empManagerBadge.textContent = 'Assigned';
                    empManagerBadge.className = 'badge success';
                }
            }
        } else {
            // Ensure manager rows are hidden if we navigated here somehow
            const empManagerRow = document.getElementById('emp-manager-row');
            const empStatusRow = document.getElementById('emp-status-row');
            if (empManagerRow) empManagerRow.style.display = 'none';
            if (empStatusRow) empStatusRow.style.display = 'none';
            if (empManagerTypeRow) empManagerTypeRow.style.display = 'none';
        }
        
        employeeDetailsBox.style.display = 'block';
        moveToStep2();

    } catch (error) {
        console.error("Oracle Fetch Error:", error);
        handleError(error.message);
    }
}

function moveToStep2() {
    console.log("Moving to Step 2...");
    appState.workflowStep = 2;
    updateStepDots(2);
    
    // Reset any previous step displays
    document.getElementById('input-toggle-container').style.display = 'none';
    document.getElementById('typeSection').style.display = 'none';
    document.getElementById('voiceSection').style.display = 'none';
    transcriptBox.style.display = 'none';
    voiceConfirmBox.style.display = 'none';

    if (appState.currentAction === 'change_department') {
        showDepartmentChangeStep();
    } else if (appState.currentAction === 'change_location') {
        showLocationChangeStep();
    } else if (appState.currentAction === 'change_job') {
        showJobChangeStep();
    } else if (appState.currentAction === 'change_position') {
        showPositionChangeStep();
    } else if (appState.currentAction === 'change_grade') {
        showGradeChangeStep();
    } else {
        showAssignManagerStep();
    }
}

function showAssignManagerStep() {
    console.log("Showing Assign Manager Step...");
    appState.workflowStep = 2;
    updateStepDots(2);
    
    // Hide assign manager action buttons (step2-actions)
    const actionButtons = document.getElementById('step2-actions');
    if (actionButtons) actionButtons.style.display = 'none';
    
    // Show manager selection section (manager-selection-box)
    const mgrSection = document.getElementById('manager-selection-box');
    if (mgrSection) {
      mgrSection.style.display = 'block';
    }
    
    // Update step title
    mainTitle.textContent = 'Select New Manager';
    
    // Prepare manager selection
    setManagerInputMethod('voice');
}

function showDepartmentChangeStep() {
    console.log("Showing Department Change Step...");
    appState.workflowStep = 2;
    updateStepDots(2);
    
    // Hide assign manager action buttons (step2-actions)
    const actionButtons = document.getElementById('step2-actions');
    if (actionButtons) actionButtons.style.display = 'none';
    
    // Robustly hide any other sections containing these buttons
    document.querySelectorAll('.actions, [id*="action"], [class*="assign"]').forEach(el => {
      if (el.textContent.includes('Assign New') || el.textContent.includes('Change Existing')) {
        el.style.display = 'none';
      }
    });
  
    // Show department selection section (dept-selection-box)
    const deptSection = document.getElementById('dept-selection-box');
    if (deptSection) {
      deptSection.style.display = 'block';
      console.log('Department section shown:', deptSection.id);
    } else {
      console.error('Department section not found!');
    }
    
    // Update step title
    mainTitle.textContent = 'Select New Department';
    
    // Prepare department selection
    setDeptInputMethod('voice');
}

function showLocationChangeStep() {
    console.log("Showing Location Change Step...");
    appState.workflowStep = 2;
    updateStepDots(2);
    
    // Hide assign manager action buttons (step2-actions)
    const actionButtons = document.getElementById('step2-actions');
    if (actionButtons) actionButtons.style.display = 'none';
    
    // Show location selection section (location-selection-box)
    const locSection = document.getElementById('location-selection-box');
    if (locSection) {
      locSection.style.display = 'block';
    }
    
    // Update step title
    mainTitle.textContent = 'Select New Location';
    
    // Prepare location selection
    setLocInputMethod('voice');
}

function showJobChangeStep() {
    console.log("Showing Job Change Step...");
    appState.workflowStep = 2;
    updateStepDots(2);
    
    // Hide assign manager action buttons (step2-actions)
    const actionButtons = document.getElementById('step2-actions');
    if (actionButtons) actionButtons.style.display = 'none';
    
    // Show job selection section (job-selection-box)
    const jobSection = document.getElementById('job-selection-box');
    if (jobSection) {
      jobSection.style.display = 'block';
    }
    
    // Update step title
    mainTitle.textContent = 'Select New Job';
    
    // Prepare job selection
    setJobInputMethod('voice');
}

function showPositionChangeStep() {
    console.log("Showing Position Change Step...");
    appState.workflowStep = 2;
    updateStepDots(2);
    
    // Hide assign manager action buttons (step2-actions)
    const actionButtons = document.getElementById('step2-actions');
    if (actionButtons) actionButtons.style.display = 'none';
    
    // Show position selection section (position-selection-box)
    const posSection = document.getElementById('position-selection-box');
    if (posSection) {
      posSection.style.display = 'block';
    }
    
    // Update step title
    mainTitle.textContent = 'Select New Position';
    
    // Prepare position selection
    setPositionInputMethod('voice');
}

function showGradeChangeStep() {
    console.log("Showing Grade Change Step...");
    appState.workflowStep = 2;
    updateStepDots(2);
    
    // Hide assign manager action buttons (step2-actions)
    const actionButtons = document.getElementById('step2-actions');
    if (actionButtons) actionButtons.style.display = 'none';
    
    // Show grade selection section (grade-selection-box)
    const gradeSection = document.getElementById('grade-selection-box');
    if (gradeSection) {
      gradeSection.style.display = 'block';
    }
    
    // Update step title
    mainTitle.textContent = 'Select New Grade';
    
    // Prepare grade selection
    setGradeInputMethod('voice');
}

btnAssignNew.addEventListener('click', () => {
  if (appState.current_manager_name && 
      appState.current_manager_name !== 'None' && 
      appState.current_manager_name !== 'Not Assigned') {
    showPopup(
      '❌ Manager Already Assigned',
      'This employee already has an active manager assigned. To assign a different manager, please go back and choose the "Change Existing" option.',
      'OK',
      null,
      () => { closePopup(); },
      null
    );
  } else {
    moveToStep3();
  }
});

btnChangeExisting.addEventListener('click', () => {
  if (!appState.current_manager_name || 
      appState.current_manager_name === 'None' || 
      appState.current_manager_name === 'Not Assigned') {
    showPopup(
      'âš ï¸ No Manager Found',
      'This employee has no existing manager to change. Please click "Assign New" to assign a first manager.',
      'OK',
      null,
      () => { closePopup(); },
      null
    );
  } else {
    moveToStep3();
  }
});

function moveToStep3() {
    console.log("Moving to Step 3...");
    appState.workflowStep = 3;
    updateStepDots(3);
    
    step2Actions.style.display = 'none';
    const subTitle = document.getElementById('sub-title');
    subTitle.textContent = "Step 3 of 4";
    subTitle.style.display = 'block';

    if (appState.currentAction === 'change_department') {
        mainTitle.textContent = "Select New Department";
        document.getElementById('input-toggle-container').style.display = 'none';
        document.getElementById('typeSection').style.display = 'none';
        document.getElementById('voiceSection').style.display = 'none';
        
        document.getElementById('dept-selection-box').style.display = 'block';
        setDeptInputMethod('voice');
    } else if (appState.currentAction === 'change_location') {
        mainTitle.textContent = "Select New Location";
        document.getElementById('input-toggle-container').style.display = 'none';
        document.getElementById('typeSection').style.display = 'none';
        document.getElementById('voiceSection').style.display = 'none';
        
        document.getElementById('location-selection-box').style.display = 'block';
        setLocInputMethod('voice');
    } else if (appState.currentAction === 'change_job') {
        mainTitle.textContent = "Select New Job";
        document.getElementById('input-toggle-container').style.display = 'none';
        document.getElementById('typeSection').style.display = 'none';
        document.getElementById('voiceSection').style.display = 'none';
        
        document.getElementById('job-selection-box').style.display = 'block';
        setJobInputMethod('voice');
    } else if (appState.currentAction === 'change_position') {
        mainTitle.textContent = "Select New Position";
        document.getElementById('input-toggle-container').style.display = 'none';
        document.getElementById('typeSection').style.display = 'none';
        document.getElementById('voiceSection').style.display = 'none';
        
        document.getElementById('position-selection-box').style.display = 'block';
        setPositionInputMethod('voice');
    } else if (appState.currentAction === 'change_grade') {
        mainTitle.textContent = "Select New Grade";
        document.getElementById('input-toggle-container').style.display = 'none';
        document.getElementById('typeSection').style.display = 'none';
        document.getElementById('voiceSection').style.display = 'none';
        
        document.getElementById('grade-selection-box').style.display = 'block';
        setGradeInputMethod('voice');
    } else if (appState.currentAction === 'change_business_unit') {
        mainTitle.textContent = "Select New Business Unit";
        document.getElementById('input-toggle-container').style.display = 'none';
        document.getElementById('typeSection').style.display = 'none';
        document.getElementById('voiceSection').style.display = 'none';
        
        document.getElementById('bu-selection-box').style.display = 'block';
        setBUInputMethod('voice');
    } else {
        mainTitle.textContent = "Enter Manager Person Number";
        document.getElementById('input-toggle-container').style.display = 'block';
        document.getElementById('mic-section').style.display = 'flex';
        setInputMethod(window.inputMethod || 'voice');
        
        document.getElementById('personNumberInput').value = '';
        document.getElementById('personNumberInput').placeholder = 'Enter Manager Person Number e.g. 2351';
        document.getElementById('searchBtn').textContent = 'Search Manager';
        
        statusBar.style.display = 'block';
        statusBar.textContent = "Please speak the Manager's Person Number";
        statusBar.style.color = 'var(--text-secondary)';
    }
    
    transcriptBox.style.display = 'none';
}

async function fetchManagerDetails() {
    try {
        console.log("Fetching Manager Details for Number:", appState.manager_person_number);
        statusBar.textContent = `Looking up Manager ${appState.manager_person_number}...`;

        const res = await fetch(`${API_BASE}/oracle/manager?manager_person_number=${appState.manager_person_number}`, { headers: { 'Content-Type': 'application/json', 'x-oracle-auth': appState.oracleAuth, 'x-oracle-url': appState.oracleUrl } });
        if (!res.ok) throw new Error(`Manager Person number ${appState.manager_person_number} not found.`);
        const data = await res.json();
        
        const mgrItem = data.items && data.items[0];
        if (!mgrItem) throw new Error(`Manager Person number ${appState.manager_person_number} not found.`);
        
        const rels = mgrItem.workRelationships && mgrItem.workRelationships[0];
        if(!rels || !rels.assignments || !rels.assignments[0]) {
             throw new Error(`Manager ${appState.manager_person_number} has no active assignments to link.`);
        }

        appState.ManagerAssignmentId = rels.assignments[0].AssignmentId;
        appState.manager_display_name = mgrItem.DisplayName || mgrItem.PersonNumber || appState.manager_person_number;
        
        console.log("Manager found:", appState.manager_display_name);

        // Update UI
        mgrName.textContent = appState.manager_display_name;
        mgrNo.textContent = appState.manager_person_number;
        
        const mgrAvatar = document.getElementById('mgr-avatar');
        if (mgrAvatar && appState.manager_display_name) {
          mgrAvatar.textContent = appState.manager_display_name.substring(0, 2).toUpperCase();
        } else if (mgrAvatar) {
          mgrAvatar.textContent = "MG";
        }

        managerDetailsBox.style.display = 'block';
        
        statusBar.textContent = "Done processing.";
        statusBar.style.color = 'var(--text-secondary)';
        
    } catch (error) {
        console.error("Oracle Fetch Error:", error);
        handleError(error.message);
    }
}

btnProceedConfirm.addEventListener('click', moveToStep4);

function moveToStep4() {
    console.log("Moving to Step 4 (Confirmation)...");
    appState.workflowStep = 4;
    
    document.querySelector('.tab-btn[data-target="screen-confirmation"]').removeAttribute('disabled');
    
    document.getElementById('conf-employee').textContent = `${appState.worker_display_name} (No: ${appState.person_number})`;
    
    const targetLabel = document.getElementById('conf-target-label');
    const targetValue = document.getElementById('conf-target-value');
    const typeRow = document.getElementById('conf-type-row');
    const actionLabel = document.querySelector('.confirm-card .glass-card-row .value');

    if (appState.currentAction === 'change_department') {
        actionLabel.textContent = "Change Department";
        targetLabel.textContent = "New Department";
        targetValue.textContent = appState.new_department;
        if (typeRow) typeRow.style.display = 'none';
    } else if (appState.currentAction === 'change_location') {
        actionLabel.textContent = "Change Location";
        targetLabel.textContent = "New Location";
        targetValue.textContent = appState.new_location;
        if (typeRow) typeRow.style.display = 'none';
    } else if (appState.currentAction === 'change_job') {
        actionLabel.textContent = "Change Job";
        targetLabel.textContent = "New Job";
        targetValue.textContent = appState.new_job;
        if (typeRow) typeRow.style.display = 'none';
    } else if (appState.currentAction === 'change_position') {
        actionLabel.textContent = "Change Position";
        targetLabel.textContent = "New Position";
        targetValue.textContent = appState.new_position;
        if (typeRow) typeRow.style.display = 'none';
    } else if (appState.currentAction === 'change_grade') {
        actionLabel.textContent = "Change Grade";
        targetLabel.textContent = "New Grade";
        targetValue.textContent = appState.new_grade;
        if (typeRow) typeRow.style.display = 'none';
    } else if (appState.currentAction === 'change_business_unit') {
        actionLabel.textContent = "Change Business Unit";
        targetLabel.textContent = "New Business Unit";
        targetValue.textContent = appState.new_bu;
        if (typeRow) typeRow.style.display = 'none';
    } else {
        actionLabel.textContent = "Assign Manager";
        targetLabel.textContent = "New Manager";
        targetValue.textContent = `${appState.manager_display_name} (No: ${appState.manager_person_number})`;
        if (typeRow) typeRow.style.display = 'flex';
    }

    document.getElementById('conf-date').textContent = appState.effective_date;

    switchTab('screen-confirmation');
}

window.startChangeLocation = function() {
    showAllTabs();
    resetApp();
    appState.currentAction = 'change_location';
    switchTab('screen-home');
}

async function fetchLocations() {
    try {
        const res = await fetch(`${API_BASE}/oracle/locations`, { headers: { 'Content-Type': 'application/json', 'x-oracle-auth': appState.oracleAuth, 'x-oracle-url': appState.oracleUrl } });
        const data = await res.json();
        appState.available_locations = data.locations;
        
        const select = document.getElementById('location-select');
        select.innerHTML = '<option value="">Select a location...</option>';
        data.locations.forEach(loc => {
            const opt = document.createElement('option');
            opt.value = loc.LocationId;
            opt.innerText = `${loc.LocationName} (${loc.City}, ${loc.Country})`;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Failed to fetch locations', err);
    }
}

function setLocInputMethod(method) {
    const voiceBtn = document.getElementById('locVoiceBtn');
    const typeBtn = document.getElementById('locTypeBtn');
    const voiceSec = document.getElementById('loc-voice-section');
    const typeSec = document.getElementById('loc-type-section');
    
    if (method === 'voice') {
        voiceBtn.classList.add('active');
        typeBtn.classList.remove('active');
        voiceSec.style.display = 'block';
        typeSec.style.display = 'none';
    } else {
        typeBtn.classList.add('active');
        voiceBtn.classList.remove('active');
        typeSec.style.display = 'block';
        voiceSec.style.display = 'none';
    }
}

function confirmLocationSelection() {
    const select = document.getElementById('location-select');
    if (!select.value) {
        showToast("Please select a location");
        return;
    }
    appState.selected_location_id = select.value;
    appState.new_location = select.options[select.selectedIndex].text.split(' (')[0];
    moveToStep4();
}

// Wire up the new button
document.getElementById('btn-proceed-loc-confirm')?.addEventListener('click', confirmLocationSelection);

window.startChangeJob = function() {
    showAllTabs();
    resetApp();
    appState.currentAction = 'change_job';
    switchTab('screen-home');
}

async function fetchJobs() {
    try {
        const res = await fetch(`${API_BASE}/oracle/jobs`, { headers: { 'Content-Type': 'application/json', 'x-oracle-auth': appState.oracleAuth, 'x-oracle-url': appState.oracleUrl } });
        const data = await res.json();
        appState.available_jobs = data.jobs;
        
        const select = document.getElementById('job-select');
        select.innerHTML = '<option value="">Select a job...</option>';
        data.jobs.forEach(job => {
            const opt = document.createElement('option');
            opt.value = job.JobId;
            opt.innerText = `${job.Name} (${job.JobCode})`;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Failed to fetch jobs', err);
    }
}

function setJobInputMethod(method) {
    const voiceBtn = document.getElementById('jobVoiceBtn');
    const typeBtn = document.getElementById('jobTypeBtn');
    const voiceSec = document.getElementById('job-voice-section');
    const typeSec = document.getElementById('job-type-section');
    
    if (method === 'voice') {
        voiceBtn.classList.add('active');
        typeBtn.classList.remove('active');
        voiceSec.style.display = 'block';
        typeSec.style.display = 'none';
    } else {
        typeBtn.classList.add('active');
        voiceBtn.classList.remove('active');
        typeSec.style.display = 'block';
        voiceSec.style.display = 'none';
    }
}
window.setJobInputMethod = setJobInputMethod;

function confirmJobSelection() {
    const select = document.getElementById('job-select');
    if (!select.value) {
        showToast("Please select a job");
        return;
    }
    appState.selected_job_id = select.value;
    appState.new_job = select.options[select.selectedIndex].text.split(' (')[0];
    moveToStep4();
}

document.getElementById('btn-proceed-job-confirm')?.addEventListener('click', confirmJobSelection);

window.startChangePosition = function() {
    showAllTabs();
    resetApp();
    appState.currentAction = 'change_position';
    switchTab('screen-home');
}

async function fetchPositions() {
    try {
        console.log("Fetching positions...");
        const res = await fetch(`${API_BASE}/oracle/positions`, { headers: { 'Content-Type': 'application/json', 'x-oracle-auth': appState.oracleAuth, 'x-oracle-url': appState.oracleUrl } });
        const data = await res.json();
        appState.available_positions = data.positions || [];
        
        const select = document.getElementById('position-select');
        select.innerHTML = '<option value="">Select a position...</option>';
        appState.available_positions.forEach(pos => {
            const opt = document.createElement('option');
            opt.value = pos.PositionId;
            opt.innerText = `${pos.Name} (${pos.PositionCode})`;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Failed to fetch positions', err);
    }
}

function setPositionInputMethod(method) {
    const voiceBtn = document.getElementById('posVoiceBtn');
    const typeBtn = document.getElementById('posTypeBtn');
    const voiceSec = document.getElementById('pos-voice-section');
    const typeSec = document.getElementById('pos-type-section');
    
    if (method === 'voice') {
        voiceBtn.classList.add('active');
        typeBtn.classList.remove('active');
        voiceSec.style.display = 'block';
        typeSec.style.display = 'none';
    } else {
        typeBtn.classList.add('active');
        voiceBtn.classList.remove('active');
        typeSec.style.display = 'block';
        voiceSec.style.display = 'none';
    }
}
window.setPositionInputMethod = setPositionInputMethod;

function confirmPositionSelection() {
    const select = document.getElementById('position-select');
    if (!select.value) {
        showToast("Please select a position");
        return;
    }
    appState.selected_position_id = select.value;
    appState.new_position = select.options[select.selectedIndex].text.split(' (')[0];
    moveToStep4();
}

document.getElementById('btn-proceed-pos-confirm')?.addEventListener('click', confirmPositionSelection);

window.startChangeGrade = function() {
    showAllTabs();
    resetApp();
    appState.currentAction = 'change_grade';
    switchTab('screen-home');
}

async function fetchGrades() {
    try {
        console.log("Fetching grades...");
        const res = await fetch(`${API_BASE}/oracle/grades`, { headers: { 'Content-Type': 'application/json', 'x-oracle-auth': appState.oracleAuth, 'x-oracle-url': appState.oracleUrl } });
        const data = await res.json();
        appState.available_grades = data.grades || [];
        
        const select = document.getElementById('grade-select');
        select.innerHTML = '<option value="">Select a grade...</option>';
        appState.available_grades.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.GradeId;
            opt.innerText = `${g.Name} (${g.GradeCode})`;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Failed to fetch grades', err);
    }
}

function setGradeInputMethod(method) {
    const voiceBtn = document.getElementById('gradeVoiceBtn');
    const typeBtn = document.getElementById('gradeTypeBtn');
    const voiceSec = document.getElementById('grade-voice-section');
    const typeSec = document.getElementById('grade-type-section');
    
    if (method === 'voice') {
        voiceBtn.classList.add('active');
        typeBtn.classList.remove('active');
        voiceSec.style.display = 'block';
        typeSec.style.display = 'none';
    } else {
        typeBtn.classList.add('active');
        voiceBtn.classList.remove('active');
        typeSec.style.display = 'block';
        voiceSec.style.display = 'none';
    }
}
window.setGradeInputMethod = setGradeInputMethod;

function confirmGradeSelection() {
    const select = document.getElementById('grade-select');
    if (!select.value) {
        showToast("Please select a grade");
        return;
    }
    appState.selected_grade_id = select.value;
    appState.new_grade = select.options[select.selectedIndex].text.split(' (')[0];
    moveToStep4();
}

document.getElementById('btn-proceed-grade-confirm')?.addEventListener('click', confirmGradeSelection);

window.startChangeBusinessUnit = function() {
    showAllTabs();
    resetApp();
    appState.currentAction = 'change_business_unit';
    switchTab('screen-home');
}

async function fetchBusinessUnits() {
    try {
        console.log("Fetching Business Units...");
        const res = await fetch(`${API_BASE}/oracle/businessunits`, { headers: { 'Content-Type': 'application/json', 'x-oracle-auth': appState.oracleAuth, 'x-oracle-url': appState.oracleUrl } });
        const data = await res.json();
        appState.available_bus = data.businessunits || [];
        
        const select = document.getElementById('bu-select');
        select.innerHTML = '<option value="">Select a Business Unit...</option>';
        appState.available_bus.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.BusinessUnitId;
            opt.innerText = b.BusinessUnitName;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Failed to fetch business units', err);
    }
}

function setBUInputMethod(method) {
    const voiceBtn = document.getElementById('buVoiceBtn');
    const typeBtn = document.getElementById('buTypeBtn');
    const voiceSec = document.getElementById('bu-voice-section');
    const typeSec = document.getElementById('bu-type-section');
    
    if (method === 'voice') {
        voiceBtn.classList.add('active');
        typeBtn.classList.remove('active');
        voiceSec.style.display = 'block';
        typeSec.style.display = 'none';
    } else {
        typeBtn.classList.add('active');
        voiceBtn.classList.remove('active');
        typeSec.style.display = 'block';
        voiceSec.style.display = 'none';
    }
}
window.setBUInputMethod = setBUInputMethod;

function confirmBUSelection() {
    const select = document.getElementById('bu-select');
    if (!select.value) {
        showToast("Please select a Business Unit");
        return;
    }
    appState.selected_bu_id = select.value;
    appState.new_bu = select.options[select.selectedIndex].text;
    moveToStep4();
}

document.getElementById('btn-proceed-bu-confirm')?.addEventListener('click', confirmBUSelection);

async function confirmAction() {
  const action = appState.currentAction === 'change_department' ? 'Change Department' : (appState.currentAction === 'change_location' ? 'Change Location' : (appState.currentAction === 'change_job' ? 'Change Job' : (appState.currentAction === 'change_position' ? 'Change Position' : (appState.currentAction === 'change_grade' ? 'Change Grade' : (appState.currentAction === 'change_business_unit' ? 'Change Business Unit' : 'Assign Manager')))));
  console.log(`${action} clicked...`);
  const btn = document.getElementById('btn-confirm');
  btn.disabled = true;
  btn.textContent = "Processing...";
  
  try {
    if (appState.currentAction === 'change_department') {
        console.log("Calling PATCH /api/oracle/department...");
        const res = await fetch(`${API_BASE}/oracle/department`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-oracle-auth': appState.oracleAuth, 'x-oracle-url': appState.oracleUrl },
          body: JSON.stringify({
            assignmentSelfLink: appState.assignmentSelfLink,
            encodedPersonId: appState.encodedPersonId,
            WorkRelationshipId: appState.WorkRelationshipId,
            encodedAssignmentId: appState.encodedAssignmentId,
            DepartmentId: appState.selected_department_id,
            DepartmentName: appState.new_department,
            EffectiveDate: appState.effective_date
          })
        });
        
        if (!res.ok) {
            const errData = await res.json();
            console.error("Server Error Data:", errData);
            let errorMsg = "Server Error";
            if (errData.error) {
                errorMsg = typeof errData.error === 'object' ? JSON.stringify(errData.error) : errData.error;
            } else if (errData.details) {
                errorMsg = JSON.stringify(errData.details);
            }
            throw new Error(errorMsg);
        }
        
        console.log("Department Success!");
        saveAuditLog("Success");
        showResult(true, `Department changed to ${appState.new_department} successfully for Person ${appState.person_number}.`);
        } else if (appState.currentAction === 'change_location') {
            console.log("Calling PATCH /api/oracle/location...");
            const res = await fetch(`${API_BASE}/oracle/location`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'x-oracle-auth': appState.oracleAuth, 'x-oracle-url': appState.oracleUrl },
              body: JSON.stringify({
                encodedPersonId: appState.encodedPersonId,
                WorkRelationshipId: appState.WorkRelationshipId,
                encodedAssignmentId: appState.encodedAssignmentId,
                LocationId: appState.selected_location_id,
                LocationName: appState.new_location,
                EffectiveDate: appState.effective_date
              })
            });
            
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to change location.");
            }
            
            console.log("Location Success!");
            saveAuditLog("Success");
            showResult(true, `Location changed to ${appState.new_location} successfully for Person ${appState.person_number}.`);
        } else if (appState.currentAction === 'change_job') {
            console.log("Calling PATCH /api/oracle/job...");
            const res = await fetch(`${API_BASE}/oracle/job`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'x-oracle-auth': appState.oracleAuth, 'x-oracle-url': appState.oracleUrl },
              body: JSON.stringify({
                encodedPersonId: appState.encodedPersonId,
                WorkRelationshipId: appState.WorkRelationshipId,
                encodedAssignmentId: appState.encodedAssignmentId,
                JobId: appState.selected_job_id,
                JobName: appState.new_job,
                EffectiveDate: appState.effective_date
              })
            });
            
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to change job.");
            }
            
            console.log("Job Success!");
            saveAuditLog("Success");
            showResult(true, `Job changed to ${appState.new_job} successfully for Person ${appState.person_number}.`);
        } else if (appState.currentAction === 'change_position') {
            console.log("Calling PATCH /api/oracle/position...");
            const res = await fetch(`${API_BASE}/oracle/position`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'x-oracle-auth': appState.oracleAuth, 'x-oracle-url': appState.oracleUrl },
              body: JSON.stringify({
                encodedPersonId: appState.encodedPersonId,
                WorkRelationshipId: appState.WorkRelationshipId,
                encodedAssignmentId: appState.encodedAssignmentId,
                PositionId: appState.selected_position_id,
                PositionName: appState.new_position,
                EffectiveDate: appState.effective_date
              })
            });
            
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to change position.");
            }
            
            console.log("Position Success!");
            saveAuditLog("Success");
            showResult(true, `Position changed to ${appState.new_position} successfully for Person ${appState.person_number}.`);
        } else if (appState.currentAction === 'change_grade') {
            console.log("Calling PATCH /api/oracle/grade...");
            const res = await fetch(`${API_BASE}/oracle/grade`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'x-oracle-auth': appState.oracleAuth, 'x-oracle-url': appState.oracleUrl },
              body: JSON.stringify({
                encodedPersonId: appState.encodedPersonId,
                WorkRelationshipId: appState.WorkRelationshipId,
                encodedAssignmentId: appState.encodedAssignmentId,
                GradeId: appState.selected_grade_id,
                GradeName: appState.new_grade,
                EffectiveDate: appState.effective_date
              })
            });
            
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to change grade.");
            }
            
            console.log("Grade Success!");
            saveAuditLog("Success");
            showResult(true, `Grade changed to ${appState.new_grade} successfully for Person ${appState.person_number}.`);
        } else if (appState.currentAction === 'change_business_unit') {
            console.log("Calling PATCH /api/oracle/businessunit...");
            const res = await fetch(`${API_BASE}/oracle/businessunit`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'x-oracle-auth': appState.oracleAuth, 'x-oracle-url': appState.oracleUrl },
              body: JSON.stringify({
                encodedPersonId: appState.encodedPersonId,
                WorkRelationshipId: appState.WorkRelationshipId,
                encodedAssignmentId: appState.encodedAssignmentId,
                BusinessUnitId: appState.selected_bu_id,
                BusinessUnitName: appState.new_bu,
                EffectiveDate: appState.effective_date
              })
            });
            
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to change Business Unit.");
            }
            
            console.log("Business Unit Success!");
            saveAuditLog("Success");
            showResult(true, `Business Unit changed to ${appState.new_bu} successfully for Person ${appState.person_number}.`);
        } else {
        console.log("Calling POST /api/oracle/assign...");
        const res = await fetch(`${API_BASE}/oracle/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-oracle-auth': appState.oracleAuth, 'x-oracle-url': appState.oracleUrl },
          body: JSON.stringify({
            encodedPersonId: appState.encodedPersonId,
            WorkRelationshipId: appState.WorkRelationshipId,
            encodedAssignmentId: appState.encodedAssignmentId,
            ManagerAssignmentId: appState.ManagerAssignmentId,
            managerSelfLink: appState.managerSelfLink,
            effectiveDate: appState.effective_date
          })
        });
        
        if (!res.ok) {
            const errData = await res.json();
            console.error("Assign Manager Error Data:", errData);
            const errorMsg = errData.error ? (typeof errData.error === 'string' ? errData.error : JSON.stringify(errData.error)) : "Failed to assign manager via Oracle API.";
            throw new Error(errorMsg);
        }
        
        console.log("Assign Success!");
        saveAuditLog("Success");
        showResult(true, `Manager assigned successfully for Person ${appState.person_number}.`);
    }
  } catch (err) {
    console.error("Action Error:", err);
    handleError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "âœ… Confirm";
  }
}

function showResult(isSuccess, message) {
  document.querySelector('.tab-btn[data-target="screen-result"]').removeAttribute('disabled');
  
  const iconDiv = document.getElementById('result-icon');
  const svgSuccess = document.getElementById('svg-success');
  const svgError = document.getElementById('svg-error');
  const title = document.getElementById('result-title');
  const msgElem = document.getElementById('result-msg');

  if (isSuccess) {
    iconDiv.className = 'result-icon success';
    svgSuccess.style.display = 'block';
    svgError.style.display = 'none';
    title.textContent = 'Success!';
  } else {
    iconDiv.className = 'result-icon error';
    svgSuccess.style.display = 'none';
    svgError.style.display = 'block';
    title.textContent = 'Error';
  }
  msgElem.textContent = message;
  
  switchTab('screen-result');
}

function handleError(msg) {
    saveAuditLog("Failed: " + msg);
    showResult(false, msg);
}

// Audit Log Functions
function saveAuditLog(status) {
  console.log("Saving to audit log. Status:", status);
  let logs = JSON.parse(localStorage.getItem('voiceAppAudit')) || [];
  
  const entry = {
    time: new Date().toLocaleTimeString(),
    person_no: appState.person_number || 'N/A',
    manager: appState.manager_person_number || 'N/A',
    status: status,
    language: appState.language_code
  };
  
  logs.unshift(entry);
  localStorage.setItem('voiceAppAudit', JSON.stringify(logs));
}

function renderAuditLog() {
  const tbody = document.getElementById('audit-tbody');
  tbody.innerHTML = '';
  let logs = JSON.parse(localStorage.getItem('voiceAppAudit')) || [];
  
  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center;">No logs found.</td></tr>`;
    return;
  }

  logs.forEach(log => {
    const statusClass = log.status === 'Success' ? 'success' : 'error';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${log.time}</td>
      <td>${log.person_no}</td>
      <td>${log.manager}</td>
      <td><span class="status-badge ${statusClass}">${log.status}</span></td>
      <td>${log.language}</td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('btn-clear-log').addEventListener('click', () => {
  localStorage.removeItem('voiceAppAudit');
  renderAuditLog();
});

// Reset App State
function resetApp() {
  console.log("Resetting app state...");
  appState = {
    workflowStep: 1,
    person_number: null,
    manager_person_number: null,
    language_code: langSelect.value,
    encodedPersonId: null,
    WorkRelationshipId: null,
    encodedAssignmentId: null,
    ManagerAssignmentId: null,
    managerSelfLink: null,
    worker_display_name: null,
    current_manager_name: null,
    manager_display_name: null,
    effective_date: new Date().toISOString().split('T')[0],
    audioBlob: null,
    
    currentAction: 'assign_manager',
    current_department: null,
    new_department: null,
    available_departments: [],
    assignmentSelfLink: null,
    selected_location_id: null,
    new_location: null,
    available_locations: [],
    selected_job_id: null,
    new_job: null,
    available_jobs: [],
    current_job_name: null,
    available_managers: [],
    available_positions: [],
    selected_position_id: null,
    new_position: null,
    current_position_name: null,
    available_grades: [],
    selected_grade_id: null,
    new_grade: null,
    current_grade_name: null,
    available_bus: [],
    selected_bu_id: null,
    new_bu: null,
    current_bu_name: null
  };
  audioChunks = [];
  
  // Reset UI
  updateStepDots(1);
  mainTitle.textContent = "Enter Employee Person Number";
  
  const subTitle = document.getElementById('sub-title');
  if (subTitle) {
    subTitle.textContent = "Step 1 of 4";
    subTitle.style.display = 'block';
  }
  
  document.getElementById('input-toggle-container').style.display = 'block';
  document.getElementById('mic-section').style.display = 'flex';
  setInputMethod('voice');
  
  document.getElementById('personNumberInput').value = '';
  document.getElementById('personNumberInput').placeholder = 'Enter Person Number e.g. 1405';
  document.getElementById('searchBtn').textContent = 'Search Employee';
 
  statusBar.style.display = 'block';
  statusBar.textContent = "Press mic and speak the Person Number";
  statusBar.style.color = 'var(--text-muted)';
  
  transcriptBox.style.display = 'none';
  voiceConfirmBox.style.display = 'none';
  transcriptText.textContent = "Waiting for voice input...";
  micBtn.classList.remove('recording');
  isRecording = false;
  
  employeeDetailsBox.style.display = 'none';
  step2Actions.style.display = 'none';
  managerDetailsBox.style.display = 'none';
  document.getElementById('dept-selection-box').style.display = 'none';
  document.getElementById('location-selection-box').style.display = 'none';
  document.getElementById('job-selection-box').style.display = 'none';
  document.getElementById('manager-selection-box').style.display = 'none';
  document.getElementById('position-selection-box').style.display = 'none';
  document.getElementById('grade-selection-box').style.display = 'none';
  document.getElementById('bu-selection-box').style.display = 'none';
  document.getElementById('emp-dept-row').style.display = 'none';
  
  const hireBox = document.getElementById('hire-employee-box');
  if (hireBox) hireBox.style.display = 'none';
  
  document.querySelector('.tab-btn[data-target="screen-confirmation"]').setAttribute('disabled', 'true');
  document.querySelector('.tab-btn[data-target="screen-result"]').setAttribute('disabled', 'true');
 
  switchTab('screen-dashboard');
}
window.resetApp = resetApp;

window.inputMethod = 'voice';

window.setInputMethod = function(method) {
  window.inputMethod = method;
  if (method === 'type') {
    document.getElementById('typeSection').style.display = 'block';
    document.getElementById('voiceSection').style.display = 'none';
    document.getElementById('typeBtn').classList.add('active');
    document.getElementById('voiceBtn').classList.remove('active');
  } else {
    document.getElementById('typeSection').style.display = 'none';
    document.getElementById('voiceSection').style.display = 'block';
    document.getElementById('voiceBtn').classList.add('active');
    document.getElementById('typeBtn').classList.remove('active');
  }
};

document.getElementById('personNumberInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchByNumber();
});

window.searchByNumber = function() {
  const num = document.getElementById('personNumberInput').value.trim();
  if (!num) {
    alert('Please enter a person number');
    return;
  }
  
  if (appState.workflowStep === 1) {
    appState.person_number = num;
    fetchEmployeeDetails();
  } else if (appState.workflowStep === 3) {
    appState.manager_person_number = num;
    fetchManagerDetails();
  }
};

window.showToast = function(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(30,30,50,0.95);
    color: #f1f5f9;
    padding: 12px 24px;
    border-radius: 12px;
    font-size: 14px;
    border: 1px solid rgba(255,255,255,0.1);
    z-index: 9999;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    backdrop-filter: blur(10px);
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

window.startAssignManager = function() {
  showAllTabs();
  resetApp();
  appState.currentAction = 'assign_manager';
  switchTab('screen-home');
}

window.startChangeDepartment = function() {
  showAllTabs();
  resetApp();
  appState.currentAction = 'change_department';
  switchTab('screen-home');
}

// Department Logic
window.setDeptInputMethod = function(method) {
    if (method === 'type') {
        document.getElementById('dept-type-section').style.display = 'block';
        document.getElementById('dept-voice-section').style.display = 'none';
        document.getElementById('deptTypeBtn').classList.add('active');
        document.getElementById('deptVoiceBtn').classList.remove('active');
    } else {
        document.getElementById('dept-type-section').style.display = 'none';
        document.getElementById('dept-voice-section').style.display = 'block';
        document.getElementById('deptVoiceBtn').classList.add('active');
        document.getElementById('deptTypeBtn').classList.remove('active');
    }
};

window.setLocInputMethod = function(method) {
    if (method === 'type') {
        document.getElementById('loc-type-section').style.display = 'block';
        document.getElementById('loc-voice-section').style.display = 'none';
        document.getElementById('locTypeBtn').classList.add('active');
        document.getElementById('locVoiceBtn').classList.remove('active');
    } else {
        document.getElementById('loc-type-section').style.display = 'none';
        document.getElementById('loc-voice-section').style.display = 'block';
        document.getElementById('locVoiceBtn').classList.add('active');
        document.getElementById('locTypeBtn').classList.remove('active');
    }
};

window.setLocInputMethod = function(method) {
    if (method === 'type') {
        document.getElementById('loc-type-section').style.display = 'block';
        document.getElementById('loc-voice-section').style.display = 'none';
        document.getElementById('locTypeBtn').classList.add('active');
        document.getElementById('locVoiceBtn').classList.remove('active');
    } else {
        document.getElementById('loc-type-section').style.display = 'none';
        document.getElementById('loc-voice-section').style.display = 'block';
        document.getElementById('locVoiceBtn').classList.add('active');
        document.getElementById('locTypeBtn').classList.remove('active');
    }
};

async function fetchDepartments() {
    try {
        console.log("Fetching departments for Business Unit:", appState.BusinessUnitName);
        const res = await fetch(`${API_BASE}/oracle/departments?BusinessUnitName=${encodeURIComponent(appState.BusinessUnitName || '')}`, { headers: { 'Content-Type': 'application/json', 'x-oracle-auth': appState.oracleAuth, 'x-oracle-url': appState.oracleUrl } });
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || `HTTP Error ${res.status}`);
        }
        const data = await res.json();
        console.log("Departments data received:", data);
        
        appState.available_departments = data.departments || [];
        
        const select = document.getElementById('dept-select');
        if (!select) {
            console.error("Element 'dept-select' not found in DOM");
            return;
        }
        
        select.innerHTML = '<option value="">Select a department...</option>';
        
        if (appState.available_departments.length === 0) {
            console.warn("No departments returned from API.");
            const opt = document.createElement('option');
            opt.textContent = "No departments found";
            opt.disabled = true;
            select.appendChild(opt);
        } else {
            appState.available_departments.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.DepartmentId;
                opt.textContent = d.DepartmentName;
                select.appendChild(opt);
            });
            console.log(`Populated ${appState.available_departments.length} departments.`);
        }
    } catch (err) {
        console.error("Failed to fetch departments:", err);
        const select = document.getElementById('dept-select');
        if (select) {
            // Try to extract a clean message if it's JSON
            let displayMsg = err.message;
            try {
                const parsed = JSON.parse(err.message.replace('HTTP Error 500: ', ''));
                displayMsg = parsed.error || err.message;
            } catch(e) {}
            select.innerHTML = `<option value="">Error: ${displayMsg}</option>`;
        }
    }
}

const deptMicBtn = document.getElementById('dept-mic-btn');
const deptStatusBar = document.getElementById('dept-status-bar');
const deptTranscriptBox = document.getElementById('dept-transcript-box');
const deptTranscriptText = document.getElementById('dept-transcript-text');

let isDeptRecording = false;

deptMicBtn.addEventListener('click', toggleDeptRecording);

function toggleDeptRecording() {
    if (isDeptRecording) {
        isDeptRecording = false;
        deptMicBtn.classList.remove('recording');
        deptStatusBar.textContent = "â³ Processing voice...";
        if(mediaRecorder) mediaRecorder.stop();
    } else {
        isDeptRecording = true;
        audioChunks = [];
        deptMicBtn.classList.add('recording');
        deptStatusBar.textContent = "ðŸ”´ Listening for department name...";
        deptTranscriptBox.style.display = 'block';
        deptTranscriptText.textContent = "...";

        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => {
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorder.start();
            
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            
            mediaRecorder.onstop = () => {
              const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
              sendDeptToSarvam(audioBlob);
              stream.getTracks().forEach(track => track.stop());
            };
          }).catch(err => {
            console.error("Mic error:", err);
            isDeptRecording = false;
            deptMicBtn.classList.remove('recording');
        });
    }
}

async function sendDeptToSarvam(audioBlob) {
    try {
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('language_code', langSelect.value);
        
        const res = await fetch(`${API_BASE}/sarvam/stt`, { method: 'POST', body: formData });
        const data = await res.json();
        const transcript = data.transcript;
        
        deptTranscriptText.textContent = transcript || "Could not understand.";
        if (transcript) {
            // Fuzzy match or direct match department
            const cleanTranscript = transcript.toLowerCase().replace(/[^\w\s]/g, '').trim();
            const match = appState.available_departments.find(d => 
                cleanTranscript.includes(d.DepartmentName.toLowerCase()) ||
                d.DepartmentName.toLowerCase().includes(cleanTranscript)
            );
            
            if (match) {
                appState.new_department = match.DepartmentName;
                document.getElementById('dept-select').value = match.DepartmentId;
                deptStatusBar.textContent = `Matched: ${match.DepartmentName}`;
                deptStatusBar.style.color = '#10b981';
            } else {
                deptStatusBar.textContent = "No matching department found. Please try again or select from list.";
                deptStatusBar.style.color = '#ef4444';
            }
        }
    } catch (err) {
        console.error("STT Error:", err);
    }
}

document.getElementById('btn-proceed-dept-confirm').addEventListener('click', () => {
    const select = document.getElementById('dept-select');
    const val = select.value;
    if (!val) {
        alert("Please select or speak a department name.");
        return;
    }
    appState.selected_department_id = Number(val); 
    appState.new_department = select.options[select.selectedIndex].text; 
    moveToStep4();
});

// Location Logic (Voice)
const locMicBtn = document.getElementById('loc-mic-btn');
const locStatusBar = document.getElementById('loc-status-bar');
const locTranscriptBox = document.getElementById('loc-transcript-box');
const locTranscriptText = document.getElementById('loc-transcript-text');

let isLocRecording = false;

if (locMicBtn) {
    locMicBtn.addEventListener('click', toggleLocRecording);
}

function toggleLocRecording() {
    if (isLocRecording) {
        isLocRecording = false;
        locMicBtn.classList.remove('recording');
        locStatusBar.textContent = "⌛ Processing voice...";
        if(mediaRecorder) mediaRecorder.stop();
    } else {
        isLocRecording = true;
        audioChunks = [];
        locMicBtn.classList.add('recording');
        locStatusBar.textContent = "🔴 Listening for location name...";
        locTranscriptBox.style.display = 'block';
        locTranscriptText.textContent = "...";

        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => {
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorder.start();
            
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            
            mediaRecorder.onstop = () => {
              const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
              sendLocToSarvam(audioBlob);
              stream.getTracks().forEach(track => track.stop());
            };
          }).catch(err => {
            console.error("Mic error:", err);
            isLocRecording = false;
            locMicBtn.classList.remove('recording');
        });
    }
}

async function sendLocToSarvam(audioBlob) {
    try {
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('language_code', langSelect.value);
        
        const res = await fetch(`${API_BASE}/sarvam/stt`, { method: 'POST', body: formData });
        const data = await res.json();
        const transcript = data.transcript;
        
        locTranscriptText.textContent = transcript || "Could not understand.";
        if (transcript) {
            const cleanTranscript = transcript.toLowerCase().replace(/[^\w\s]/g, '').trim();
            const match = appState.available_locations.find(l => 
                cleanTranscript.includes(l.LocationName.toLowerCase()) ||
                l.LocationName.toLowerCase().includes(cleanTranscript)
            );
            
            if (match) {
                appState.new_location = match.LocationName;
                document.getElementById('location-select').value = match.LocationId;
                locStatusBar.textContent = `Matched: ${match.LocationName}`;
                locStatusBar.style.color = '#10b981';
            } else {
                locStatusBar.textContent = "No matching location found. Please try again or select from list.";
                locStatusBar.style.color = '#ef4444';
            }
        }
    } catch (err) {
        console.error("STT Error:", err);
    }
}

document.getElementById('btn-proceed-loc-confirm').addEventListener('click', () => {
    const select = document.getElementById('location-select');
    const val = select.value;
    if (!val) {
        alert("Please select or speak a location name.");
        return;
    }
    appState.selected_location_id = Number(val); 
    appState.new_location = select.options[select.selectedIndex].text; 
    moveToStep4();
});

// Job Logic (Voice)
const jobMicBtn = document.getElementById('job-mic-btn');
const jobStatusBar = document.getElementById('job-status-bar');
const jobTranscriptBox = document.getElementById('job-transcript-box');
const jobTranscriptText = document.getElementById('job-transcript-text');

let isJobRecording = false;

if (jobMicBtn) {
    jobMicBtn.addEventListener('click', toggleJobRecording);
}

function toggleJobRecording() {
    if (isJobRecording) {
        isJobRecording = false;
        jobMicBtn.classList.remove('recording');
        jobStatusBar.textContent = "⌛ Processing voice...";
        if(mediaRecorder) mediaRecorder.stop();
    } else {
        isJobRecording = true;
        audioChunks = [];
        jobMicBtn.classList.add('recording');
        jobStatusBar.textContent = "🔴 Listening for job name...";
        jobTranscriptBox.style.display = 'block';
        jobTranscriptText.textContent = "...";

        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => {
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorder.start();
            
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            
            mediaRecorder.onstop = () => {
              const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
              sendJobToSarvam(audioBlob);
              stream.getTracks().forEach(track => track.stop());
            };
          }).catch(err => {
            console.error("Mic error:", err);
            isJobRecording = false;
            jobMicBtn.classList.remove('recording');
        });
    }
}

async function sendJobToSarvam(audioBlob) {
    try {
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('language_code', langSelect.value);
        
        const res = await fetch(`${API_BASE}/sarvam/stt`, { method: 'POST', body: formData });
        const data = await res.json();
        const transcript = data.transcript;
        
        jobTranscriptText.textContent = transcript || "Could not understand.";
        if (transcript) {
            const cleanTranscript = transcript.toLowerCase().replace(/[^\w\s]/g, '').trim();
            const match = appState.available_jobs.find(j => 
                cleanTranscript.includes(j.Name.toLowerCase()) ||
                j.Name.toLowerCase().includes(cleanTranscript)
            );
            
            if (match) {
                appState.new_job = match.Name;
                document.getElementById('job-select').value = match.JobId;
                jobStatusBar.textContent = `Matched: ${match.Name}`;
                jobStatusBar.style.color = '#10b981';
            } else {
                jobStatusBar.textContent = "No matching job found. Please try again or select from list.";
                jobStatusBar.style.color = '#ef4444';
            }
        }
    } catch (err) {
        console.error("STT Error:", err);
    }
}

// Position Logic (Voice)
const posMicBtn = document.getElementById('pos-mic-btn');
const posStatusBar = document.getElementById('pos-status-bar');
const posTranscriptBox = document.getElementById('pos-transcript-box');
const posTranscriptText = document.getElementById('pos-transcript-text');

let isPosRecording = false;

if (posMicBtn) {
    posMicBtn.addEventListener('click', togglePosRecording);
}

function togglePosRecording() {
    if (isPosRecording) {
        isPosRecording = false;
        posMicBtn.classList.remove('recording');
        posStatusBar.textContent = "⌛ Processing voice...";
        if(mediaRecorder) mediaRecorder.stop();
    } else {
        isPosRecording = true;
        audioChunks = [];
        posMicBtn.classList.add('recording');
        posStatusBar.textContent = "🔴 Listening for position name...";
        posTranscriptBox.style.display = 'block';
        posTranscriptText.textContent = "...";

        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => {
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorder.start();
            
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            
            mediaRecorder.onstop = () => {
              const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
              sendPosToSarvam(audioBlob);
              stream.getTracks().forEach(track => track.stop());
            };
          }).catch(err => {
            console.error("Mic error:", err);
            isPosRecording = false;
            posMicBtn.classList.remove('recording');
        });
    }
}

async function sendPosToSarvam(audioBlob) {
    try {
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('language_code', langSelect.value);
        
        const res = await fetch(`${API_BASE}/sarvam/stt`, { method: 'POST', body: formData });
        const data = await res.json();
        const transcript = data.transcript;
        
        posTranscriptText.textContent = transcript || "Could not understand.";
        if (transcript) {
            const cleanTranscript = transcript.toLowerCase().replace(/[^\w\s]/g, '').trim();
            const match = appState.available_positions.find(p => 
                cleanTranscript.includes(p.Name.toLowerCase()) ||
                p.Name.toLowerCase().includes(cleanTranscript)
            );
            
            if (match) {
                appState.new_position = match.Name;
                document.getElementById('position-select').value = match.PositionId;
                posStatusBar.textContent = `Matched: ${match.Name}`;
                posStatusBar.style.color = '#10b981';
            } else {
                posStatusBar.textContent = "No matching position found. Please try again or select from list.";
                posStatusBar.style.color = '#ef4444';
            }
        }
    } catch (err) {
        console.error("STT Error:", err);
    }
}

// Business Unit Logic (Voice)
const buMicBtn = document.getElementById('bu-mic-btn');
const buStatusBar = document.getElementById('bu-status-bar');
const buTranscriptBox = document.getElementById('bu-transcript-box');
const buTranscriptText = document.getElementById('bu-transcript-text');

let isBURecording = false;

if (buMicBtn) {
    buMicBtn.addEventListener('click', toggleBURecording);
}

function toggleBURecording() {
    if (isBURecording) {
        isBURecording = false;
        buMicBtn.classList.remove('recording');
        buStatusBar.textContent = "⌛ Processing voice...";
        if(mediaRecorder) mediaRecorder.stop();
    } else {
        isBURecording = true;
        audioChunks = [];
        buMicBtn.classList.add('recording');
        buStatusBar.textContent = "🎙️ Listening for Business Unit name...";
        buTranscriptBox.style.display = 'block';
        buTranscriptText.textContent = "...";

        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => {
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorder.start();
            
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            
            mediaRecorder.onstop = () => {
              const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
              sendBUToSarvam(audioBlob);
              stream.getTracks().forEach(track => track.stop());
            };
          }).catch(err => {
            console.error("Mic error:", err);
            isBURecording = false;
            buMicBtn.classList.remove('recording');
        });
    }
}

async function sendBUToSarvam(audioBlob) {
    try {
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('language_code', langSelect.value);
        
        const res = await fetch(`${API_BASE}/sarvam/stt`, { method: 'POST', body: formData });
        const data = await res.json();
        const transcript = data.transcript;
        
        buTranscriptText.textContent = transcript || "Could not understand.";
        if (transcript) {
            const cleanTranscript = transcript.toLowerCase().replace(/[^\w\s]/g, '').trim();
            const match = appState.available_bus.find(b => 
                cleanTranscript.includes(b.BusinessUnitName.toLowerCase()) ||
                b.BusinessUnitName.toLowerCase().includes(cleanTranscript)
            );
            
            if (match) {
                appState.new_bu = match.BusinessUnitName;
                document.getElementById('bu-select').value = match.BusinessUnitId;
                buStatusBar.textContent = `Matched: ${match.BusinessUnitName}`;
                buStatusBar.style.color = '#10b981';
            } else {
                buStatusBar.textContent = "No matching Business Unit found. Please try again or select from list.";
                buStatusBar.style.color = '#ef4444';
            }
        }
    } catch (err) {
        console.error("STT Error:", err);
    }
}

// Event listeners for the confirmation screen buttons
document.getElementById('btn-confirm').onclick = confirmAction;

document.getElementById('btn-edit').onclick = () => {
  console.log("Edit clicked, going back...");
  // Go back to the input/selection step
  if (appState.currentAction === 'change_department') {
    document.getElementById('dept-selection-box').style.display = 'block';
  } else if (appState.currentAction === 'change_location') {
    document.getElementById('location-selection-box').style.display = 'block';
  } else if (appState.currentAction === 'change_job') {
    document.getElementById('job-selection-box').style.display = 'block';
  } else if (appState.currentAction === 'change_position') {
    document.getElementById('position-selection-box').style.display = 'block';
  } else if (appState.currentAction === 'change_grade') {
    document.getElementById('grade-selection-box').style.display = 'block';
  } else if (appState.currentAction === 'change_business_unit') {
    document.getElementById('bu-selection-box').style.display = 'block';
  } else if (appState.currentAction === 'hire_employee') {
    document.getElementById('hire-employee-box').style.display = 'block';
  } else {
    document.getElementById('manager-selection-box').style.display = 'block';
  }
  switchTab('screen-home');
};

document.getElementById('btn-cancel').onclick = () => {
  console.log("Cancel clicked, resetting app...");
  resetApp();
};

// Popup function
function showPopup(title, message, confirmText, cancelText, onConfirm, onCancel) {
  const overlay = document.createElement('div');
  overlay.id = 'popup-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.7); z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(4px);
  `;
  
  overlay.innerHTML = `
    <div style="
      background: #1a1a2e; border: 1px solid rgba(124,58,237,0.3);
      border-radius: 16px; padding: 32px; max-width: 400px; width: 90%;
      text-align: center; box-shadow: 0 24px 48px rgba(0,0,0,0.5);
    ">
      <div style="font-size: 24px; margin-bottom: 12px; color: white;">${title}</div>
      <div style="color: #94a3b8; font-size: 14px; line-height: 1.6; 
                  margin-bottom: 24px;">${message}</div>
      <div style="display: flex; gap: 12px; justify-content: center;">
        ${cancelText ? `<button id="popup-cancel" style="
          padding: 10px 20px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);
          background: transparent; color: #94a3b8; cursor: pointer; font-size: 14px;
        ">${cancelText}</button>` : ''}
        <button id="popup-confirm" style="
          padding: 10px 20px; border-radius: 10px; border: none;
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          color: white; cursor: pointer; font-size: 14px; font-weight: 600;
        ">${confirmText}</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  document.getElementById('popup-confirm').onclick = () => {
    overlay.remove();
    if (onConfirm) onConfirm();
  };
  
  if (cancelText) {
    document.getElementById('popup-cancel').onclick = () => {
      overlay.remove();
      if (onCancel) onCancel();
    };
  }
}

function closePopup() {
  const overlay = document.getElementById('popup-overlay');
  if (overlay) overlay.remove();
}

async function handleLogin() {
  const oracleUrlInput = document.getElementById('login-oracle-url');
  const oracleUrl = oracleUrlInput ? oracleUrlInput.value.trim() : '';
  const username = document.getElementById('login-username')
    .value.trim();
  const password = document.getElementById('login-password')
    .value.trim();
  const errorEl = document.getElementById('login-error');
  const btnText = document.getElementById('login-btn-text');
  const spinner = document.getElementById('login-spinner');
  
  if (!username || !password) {
    errorEl.textContent = 'Please enter Oracle username and password';
    errorEl.style.display = 'block';
    return;
  }
  
  if (oracleUrl && !oracleUrl.startsWith('https://')) {
    errorEl.textContent = 'Oracle URL must start with https://';
    errorEl.style.display = 'block';
    return;
  }
  
  // Show loading state
  btnText.style.display = 'none';
  spinner.style.display = 'inline';
  errorEl.style.display = 'none';
  document.getElementById('login-btn').disabled = true;
  
  try {
    const response = await fetch(`${API_BASE}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oracleUrl: oracleUrl || ORACLE_BASE_URL,
        username: username,
        password: password
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      // Save session
      sessionStorage.setItem('loggedIn', 'true');
      sessionStorage.setItem('userName', username);
      sessionStorage.setItem('oracleUrl', data.oracleUrl);
      sessionStorage.setItem('oracleAuth', data.authToken);
      
      // Update appState
      appState.oracleUrl = data.oracleUrl;
      appState.oracleAuth = data.authToken;
      
      // Hide login show app
      document.getElementById('login-screen')
        .style.display = 'none';
      document.getElementById('main-app')
        .style.display = 'block';
      
      // Show username in header
      const userBadge = document.getElementById('user-badge');
      if (userBadge) userBadge.textContent = username;
      
    } else {
      errorEl.textContent = data.error || 
        'Invalid username or password';
      errorEl.style.display = 'block';
    }
    
  } catch (err) {
    errorEl.textContent = 
      'Connection failed. Please try again.';
    errorEl.style.display = 'block';
    
  } finally {
    btnText.style.display = 'inline';
    spinner.style.display = 'none';
    document.getElementById('login-btn').disabled = false;
  }
}

// Event listeners for login
const loginBtn = document.getElementById('login-btn');
if (loginBtn) {
  loginBtn.addEventListener('click', handleLogin);
}

const loginPassword = document.getElementById('login-password');
if (loginPassword) {
  loginPassword.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') handleLogin();
  });
}

// Check existing session on load
window.addEventListener('load', () => {
  const loggedIn = sessionStorage.getItem('loggedIn');
  if (loggedIn === 'true') {
    const oracleUrl = sessionStorage.getItem('oracleUrl');
    const oracleAuth = sessionStorage.getItem('oracleAuth');
    const userName = sessionStorage.getItem('userName');
    
    // Restore session
    appState.oracleUrl = oracleUrl;
    appState.oracleAuth = oracleAuth;
    
    document.getElementById('login-screen')
      .style.display = 'none';
    document.getElementById('main-app')
      .style.display = 'block';
      
    const userBadge = document.getElementById('user-badge');
    if (userBadge && userName) userBadge.textContent = userName;
  }
});

// Logout
window.logout = function() {
  sessionStorage.clear();
  appState.oracleUrl = null;
  appState.oracleAuth = null;
  document.getElementById('login-screen')
    .style.display = 'flex';
  document.getElementById('main-app')
    .style.display = 'none';
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-oracle-url').value = '';
}
// Manager Custom Logic (Dropdown & Voice)
async function fetchManagers() {
    try {
        const res = await fetch(`${API_BASE}/oracle/managers`, { headers: { 'Content-Type': 'application/json', 'x-oracle-auth': appState.oracleAuth, 'x-oracle-url': appState.oracleUrl } });
        const data = await res.json();
        appState.available_managers = data.managers || [];
        
        const select = document.getElementById('manager-select');
        select.innerHTML = '<option value="">Select a manager...</option>';
        appState.available_managers.forEach(mgr => {
            const opt = document.createElement('option');
            opt.value = mgr.AssignmentId;
            opt.dataset.personNumber = mgr.PersonNumber;
            opt.innerText = `${mgr.DisplayName} (No: ${mgr.PersonNumber})`;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Failed to fetch managers', err);
    }
}

function setManagerInputMethod(method) {
    const voiceBtn = document.getElementById('managerVoiceBtn');
    const typeBtn = document.getElementById('managerTypeBtn');
    const voiceSec = document.getElementById('manager-voice-section');
    const typeSec = document.getElementById('manager-type-section');
    
    if (method === 'voice') {
        voiceBtn.classList.add('active');
        typeBtn.classList.remove('active');
        voiceSec.style.display = 'block';
        typeSec.style.display = 'none';
    } else {
        typeBtn.classList.add('active');
        voiceBtn.classList.remove('active');
        typeSec.style.display = 'block';
        voiceSec.style.display = 'none';
    }
}

function confirmManagerSelection() {
    const select = document.getElementById('manager-select');
    if (!select.value) {
        showToast("Please select a manager");
        return;
    }
    appState.ManagerAssignmentId = select.value;
    const selectedOption = select.options[select.selectedIndex];
    appState.manager_person_number = selectedOption.dataset.personNumber;
    appState.manager_display_name = selectedOption.text.split(' (No:')[0];
    
    console.log("Selected Manager:", appState.manager_display_name, "Assignment ID:", appState.ManagerAssignmentId, "Number:", appState.manager_person_number);
    moveToStep4();
}

document.getElementById('btn-proceed-manager-confirm')?.addEventListener('click', confirmManagerSelection);

// Manager Voice STT Logic
const managerMicBtn = document.getElementById('manager-mic-btn');
const managerStatusBar = document.getElementById('manager-status-bar');
const managerTranscriptBox = document.getElementById('manager-transcript-box');
const managerTranscriptText = document.getElementById('manager-transcript-text');

let isManagerRecording = false;

if (managerMicBtn) {
    managerMicBtn.addEventListener('click', toggleManagerRecording);
}

function toggleManagerRecording() {
    if (isManagerRecording) {
        isManagerRecording = false;
        managerMicBtn.classList.remove('recording');
        managerStatusBar.textContent = "⌛ Processing voice...";
        if(mediaRecorder) mediaRecorder.stop();
    } else {
        isManagerRecording = true;
        audioChunks = [];
        managerMicBtn.classList.add('recording');
        managerStatusBar.textContent = "🔴 Listening for manager name...";
        managerTranscriptBox.style.display = 'block';
        managerTranscriptText.textContent = "...";

        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => {
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorder.start();
            
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            
            mediaRecorder.onstop = () => {
              const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
              sendManagerToSarvam(audioBlob);
              stream.getTracks().forEach(track => track.stop());
            };
          }).catch(err => {
            console.error("Mic error:", err);
            isManagerRecording = false;
            managerMicBtn.classList.remove('recording');
        });
    }
}

async function sendManagerToSarvam(audioBlob) {
    try {
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('language_code', langSelect.value);
        
        const res = await fetch(`${API_BASE}/sarvam/stt`, { method: 'POST', body: formData });
        const data = await res.json();
        const transcript = data.transcript;
        
        managerTranscriptText.textContent = transcript || "Could not understand.";
        if (transcript) {
            const cleanTranscript = transcript.toLowerCase().replace(/[^\w\s]/g, '').trim();
            const match = appState.available_managers.find(m => 
                cleanTranscript.includes(m.DisplayName.toLowerCase()) ||
                m.DisplayName.toLowerCase().includes(cleanTranscript)
            );
            
            if (match) {
                appState.ManagerAssignmentId = match.AssignmentId;
                appState.manager_person_number = match.PersonNumber;
                appState.manager_display_name = match.DisplayName;
                document.getElementById('manager-select').value = match.AssignmentId;
                managerStatusBar.textContent = `Matched: ${match.DisplayName}`;
                managerStatusBar.style.color = '#10b926ff';
            } else {
                managerStatusBar.textContent = "No matching manager found. Please try again or select from list.";
                managerStatusBar.style.color = '#ef4494ff';
            }
        }
    } catch (err) {
        console.error("STT Error:", err);
    }
}

// Expose toggle methods globally on window for inline HTML onclick triggers
window.setLocInputMethod = setLocInputMethod;
window.setDeptInputMethod = setDeptInputMethod;
window.setJobInputMethod = setJobInputMethod;
window.setManagerInputMethod = setManagerInputMethod;

// Start Hire Employee Flow
window.startHireEmployee = function() {
  appState.currentAction = 'hire_employee';
  showAllTabs();
  switchToTab('voice-input');

  // Hide all other wizard sections
  hideAllSteps();

  // Show hire form
  const hireBox = document.getElementById('hire-employee-box');
  if (hireBox) hireBox.style.display = 'block';

  // Set today as default start date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('hire-start-date').value = today;

  // Clear previous fields
  document.getElementById('hire-person-number').value = '';
  document.getElementById('hire-first-name').value = '';
  document.getElementById('hire-last-name').value = '';
  document.getElementById('hire-dob').value = '';
  document.getElementById('hire-job-code').value = '';
  document.getElementById('hire-location-code').value = '';

  // Reset Voice/Form toggle options to form manual entry
  if (typeof setHireInputMethod === 'function') {
    setHireInputMethod('type');
  }
  const trText = document.getElementById('hire-transcript-text');
  if (trText) trText.textContent = 'Waiting for voice input...';
  const parsedRes = document.getElementById('hire-parsed-results');
  if (parsedRes) parsedRes.style.display = 'none';
  const hireTrBox = document.getElementById('hire-transcript-box');
  if (hireTrBox) hireTrBox.style.display = 'none';

  // Fetch legal employers and business units
  fetchLegalEmployers();
  fetchBusinessUnitsForHire();

  // Update step dots / UI if needed
  updateStepDots(1);
}

// Utility to hide all step boxes under screen-home
function hideAllSteps() {
  const stepBoxes = [
    'input-toggle-container', 'typeSection', 'voiceSection', 'transcript-box', 'voice-confirm-box',
    'employee-details-box', 'step2-actions', 'manager-details-box',
    'dept-selection-box', 'location-selection-box', 'job-selection-box',
    'manager-selection-box', 'position-selection-box', 'grade-selection-box',
    'bu-selection-box', 'hire-employee-box', 'po-details-box', 'po-list-box',
    'leave-balance-box', 'apply-leave-box'
  ];
  stepBoxes.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  const mainTitle = document.getElementById('main-title');
  if (mainTitle) mainTitle.textContent = '';
  const subTitle = document.getElementById('sub-title');
  if (subTitle) subTitle.style.display = 'none';
  const indicator = document.getElementById('input-toggle-container');
  if (indicator) indicator.style.display = 'none';
  const stepIndicator = document.getElementById('step-indicator');
  if (stepIndicator) stepIndicator.style.display = 'none';
}

// Helper wrapper for tab switching
function switchToTab(tabName) {
  if (tabName === 'voice-input') {
    switchTab('screen-home');
  } else if (tabName === 'confirm') {
    switchTab('screen-confirmation');
  } else if (tabName === 'result') {
    switchTab('screen-result');
  } else {
    switchTab(tabName);
  }
}

// Helper wrapper for adding to audit log
function addToAuditLog(entry) {
  let logs = JSON.parse(localStorage.getItem('voiceAppAudit')) || [];
  const logEntry = {
    time: new Date().toLocaleTimeString(),
    person_no: entry.personNumber || 'N/A',
    manager: entry.details || 'N/A',
    status: entry.status || 'Success',
    language: 'N/A'
  };
  logs.unshift(logEntry);
  localStorage.setItem('voiceAppAudit', JSON.stringify(logs));
}

// Navigate Home Cancel Button
window.goHome = function() {
  hideActionTabs();
  switchTab('screen-dashboard');
  showHomeModules();
  resetApp();
}

async function fetchLegalEmployers() {
  try {
    const select = document.getElementById('hire-legal-employer');
    select.innerHTML = '<option value="">Loading legal employers...</option>';
    
    const res = await fetch(`${API_BASE}/oracle/legalemployers`, {
      headers: {
        'Content-Type': 'application/json',
        'x-oracle-auth': appState.oracleAuth,
        'x-oracle-url': appState.oracleUrl
      }
    });
    
    const data = await res.json();
    select.innerHTML = '<option value="">Select Legal Employer...</option>';
    
    if (data.employers && data.employers.length > 0) {
      data.employers.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.Name;
        opt.textContent = emp.Name;
        select.appendChild(opt);
      });
    } else {
      select.innerHTML = '<option value="">No legal employers found</option>';
    }
  } catch (err) {
    console.error('Error fetching legal employers:', err);
    document.getElementById('hire-legal-employer').innerHTML = 
      '<option value="">Error loading legal employers</option>';
  }
}

async function fetchBusinessUnitsForHire() {
  try {
    const select = document.getElementById('hire-business-unit');
    select.innerHTML = '<option value="">Loading business units...</option>';
    
    const res = await fetch(`${API_BASE}/oracle/businessunits`, {
      headers: {
        'Content-Type': 'application/json',
        'x-oracle-auth': appState.oracleAuth,
        'x-oracle-url': appState.oracleUrl
      }
    });
    
    const data = await res.json();
    select.innerHTML = '<option value="">Select Business Unit...</option>';
    
    if (data.units && data.units.length > 0) {
      data.units.forEach(unit => {
        const opt = document.createElement('option');
        opt.value = unit.BusinessUnitName;
        opt.textContent = unit.BusinessUnitName;
        select.appendChild(opt);
      });
    } else {
      select.innerHTML = '<option value="">No business units found</option>';
    }
  } catch (err) {
    console.error('Error fetching business units:', err);
    document.getElementById('hire-business-unit').innerHTML = 
      '<option value="">Error loading business units</option>';
  }
}

window.proceedHireConfirm = function() {
  const PersonNumber = document.getElementById('hire-person-number').value.trim();
  const FirstName = document.getElementById('hire-first-name').value.trim();
  const LastName = document.getElementById('hire-last-name').value.trim();
  const DateOfBirth = document.getElementById('hire-dob').value;
  const StartDate = document.getElementById('hire-start-date').value;
  const LegalEmployerName = document.getElementById('hire-legal-employer').value;
  const BusinessUnitName = document.getElementById('hire-business-unit').value;
  const JobCode = document.getElementById('hire-job-code').value.trim();
  const LocationCode = document.getElementById('hire-location-code').value.trim();

  if (!PersonNumber || !FirstName || !LastName || !StartDate || !LegalEmployerName || !BusinessUnitName) {
    showToast('Please fill in all required fields marked with *');
    return;
  }

  appState.hireData = {
    PersonNumber,
    FirstName,
    LastName,
    DateOfBirth,
    StartDate,
    LegalEmployerName,
    BusinessUnitName,
    JobCode,
    LocationCode
  };

  showHireConfirmation();
}

function showHireConfirmation() {
  document.querySelector('.tab-btn[data-target="screen-confirmation"]').removeAttribute('disabled');
  switchToTab('confirm');

  // Update confirmation screen Action
  const actionLabel = document.querySelector('.confirm-card .glass-card-row .value');
  if (actionLabel) {
    actionLabel.textContent = 'Hire Employee';
  }

  // Update confirmation screen Employee
  const confEmployee = document.getElementById('conf-employee');
  if (confEmployee) {
    confEmployee.textContent = `${appState.hireData.FirstName} ${appState.hireData.LastName} (New Hire)`;
  }
  
  // Custom display for hire fields
  const typeRow = document.getElementById('conf-type-row');
  if (typeRow) typeRow.style.display = 'none';

  const targetLabel = document.getElementById('conf-target-label');
  const targetValue = document.getElementById('conf-target-value');
  
  if (targetLabel && targetValue) {
    targetLabel.textContent = 'Business Unit';
    targetValue.innerHTML = `
      <strong>${appState.hireData.BusinessUnitName}</strong><br>
      <span style="font-size:12px; color:#64748b;">
        Employer: ${appState.hireData.LegalEmployerName}
      </span>
    `;
  }

  const dateLabel = document.getElementById('conf-date');
  if (dateLabel) {
    dateLabel.textContent = appState.hireData.StartDate;
  }

  // Override the click handler for confirmation button
  const confirmBtn = document.getElementById('btn-confirm');
  confirmBtn.onclick = confirmHireEmployee;
}

async function confirmHireEmployee() {
  const btn = document.getElementById('btn-confirm');
  btn.disabled = true;
  btn.textContent = 'Hiring Employee...';

  try {
    const res = await fetch(`${API_BASE}/oracle/hire`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-oracle-auth': appState.oracleAuth,
        'x-oracle-url': appState.oracleUrl
      },
      body: JSON.stringify(appState.hireData)
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to hire employee.');
    }

    // Add to audit log
    addToAuditLog({
      action: 'Hire Employee',
      personNumber: appState.hireData.PersonNumber,
      details: `${appState.hireData.FirstName} ${appState.hireData.LastName}`,
      status: 'Success'
    });

    showResult(true,
      `🎉 ${appState.hireData.FirstName} ${appState.hireData.LastName} ` +
      `hired successfully!\n` +
      `Person Number: ${data.PersonNumber || appState.hireData.PersonNumber}`
    );

  } catch (err) {
    console.error('Hire error:', err);
    addToAuditLog({
      action: 'Hire Employee',
      personNumber: appState.hireData.PersonNumber,
      details: `${appState.hireData.FirstName} ${appState.hireData.LastName}`,
      status: 'Failed'
    });
    showResult(false, err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '✅ Confirm';
    
    // Restore default click handler for standard workflows
    btn.onclick = confirmAction;
  }
}

// ==========================================
// HIRE EMPLOYEE - VOICE & TEXT LOGIC
// ==========================================

window.setHireInputMethod = function(method) {
  const formSec = document.getElementById('hire-form-section');
  const voiceSec = document.getElementById('hire-voice-section');
  const typeBtn = document.getElementById('hireTypeBtn');
  const voiceBtn = document.getElementById('hireVoiceBtn');
  
  if (method === 'type') {
    if (formSec) formSec.style.display = 'block';
    if (voiceSec) voiceSec.style.display = 'none';
    if (typeBtn) typeBtn.classList.add('active');
    if (voiceBtn) voiceBtn.classList.remove('active');
  } else {
    if (formSec) formSec.style.display = 'none';
    if (voiceSec) voiceSec.style.display = 'block';
    if (voiceBtn) voiceBtn.classList.add('active');
    if (typeBtn) typeBtn.classList.remove('active');
  }
}

let isHireRecording = false;
let hireMediaRecorder = null;
let hireAudioChunks = [];
let parsedHireFields = {};

window.toggleHireRecording = function() {
  const micBtn = document.getElementById('hire-mic-btn');
  const statusBar = document.getElementById('hire-status-bar');
  const transcriptBox = document.getElementById('hire-transcript-box');
  const transcriptText = document.getElementById('hire-transcript-text');
  
  if (isHireRecording) {
    isHireRecording = false;
    if (micBtn) micBtn.classList.remove('recording');
    if (statusBar) {
      statusBar.textContent = "⏳ Processing your voice...";
      statusBar.style.color = 'var(--primary)';
    }
    if (hireMediaRecorder) hireMediaRecorder.stop();
  } else {
    isHireRecording = true;
    hireAudioChunks = [];
    if (micBtn) micBtn.classList.add('recording');
    if (statusBar) {
      statusBar.textContent = "🔴 Listening... click mic to stop";
      statusBar.style.color = 'var(--danger)';
    }
    if (transcriptBox) transcriptBox.style.display = 'block';
    if (transcriptText) transcriptText.textContent = "Listening...";
    
    // Hide parsed results while starting new recording
    const parsedRes = document.getElementById('hire-parsed-results');
    if (parsedRes) parsedRes.style.display = 'none';

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        hireMediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        hireMediaRecorder.start();
        
        hireMediaRecorder.ondataavailable = e => {
          hireAudioChunks.push(e.data);
        };
        
        hireMediaRecorder.onstop = () => {
          console.log("Hire MediaRecorder stopped. Creating blob...");
          const audioBlob = new Blob(hireAudioChunks, { type: 'audio/webm' });
          sendHireToSarvam(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };
      }).catch(err => {
        console.error("Microphone access failed:", err);
        if (statusBar) {
          statusBar.textContent = "Error: Could not access microphone.";
          statusBar.style.color = 'var(--danger)';
        }
        isHireRecording = false;
        if (micBtn) micBtn.classList.remove('recording');
      });
  }
}

async function sendHireToSarvam(audioBlob) {
  const statusBar = document.getElementById('hire-status-bar');
  const transcriptText = document.getElementById('hire-transcript-text');
  
  try {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('language_code', 'unknown');
    
    const sttRes = await fetch(`${API_BASE}/sarvam/stt`, { method: 'POST', body: formData });
    if (!sttRes.ok) throw new Error("Voice recognition failed.");
    
    const sttData = await sttRes.json();
    const transcript = sttData.transcript;
    
    if (transcriptText) transcriptText.textContent = `"${transcript}"`;
    if (statusBar) {
      statusBar.textContent = "Voice recognized! Parsing details...";
      statusBar.style.color = 'var(--success)';
    }
    
    // Parse fields from transcript using simple regex and keyword matching
    parseFieldsFromTranscript(transcript);
    
  } catch (err) {
    console.error("Hire STT Error:", err);
    if (statusBar) {
      statusBar.textContent = "Voice input failed. Please try again.";
      statusBar.style.color = 'var(--danger)';
    }
  }
}

function parseFieldsFromTranscript(transcript) {
  const parsedFields = document.getElementById('hire-parsed-fields');
  const parsedResults = document.getElementById('hire-parsed-results');
  
  const text = transcript.toLowerCase();
  
  // 1. Person Number
  let personNumber = "";
  const personMatch = text.match(/(?:person number|number|id|emp|employee number)\s*(?:is|to|be|of)?\s*([a-z0-9]+)/i);
  if (personMatch) {
    personNumber = personMatch[1].toUpperCase();
  } else {
    // fallback: find first alphanumeric token longer than 4 chars or containing digits
    const tokens = text.split(/\s+/);
    for (const t of tokens) {
      if (/\d+/.test(t) && t.length >= 3) {
        personNumber = t.toUpperCase().replace(/[^\w]/g, '');
        break;
      }
    }
  }
  
  if (!personNumber) {
    const rand = Math.floor(100000 + Math.random() * 900000);
    personNumber = `${rand}`;
  }
  
  // 2. Name
  let firstName = "";
  let lastName = "";
  // look for "hire employee [First] [Last]" or "employee [First] [Last]" or "name [First] [Last]"
  const nameMatch = text.match(/(?:hire employee|employee|name|named|for)\s+([a-z]+)\s+([a-z]+)/i);
  if (nameMatch) {
    firstName = capitalizeWord(nameMatch[1]);
    lastName = capitalizeWord(nameMatch[2]);
  } else {
    // fallback: search first capitalized words in the transcript or first two words after "hire"
    const hireIdx = text.indexOf("hire");
    if (hireIdx !== -1) {
      const words = transcript.substring(hireIdx + 4).trim().split(/\s+/);
      if (words.length >= 2) {
        firstName = capitalizeWord(words[0]);
        lastName = capitalizeWord(words[1]);
      }
    }
  }
  
  // 3. Start Date
  let startDate = new Date().toISOString().split('T')[0];
  const dateMatch = text.match(/(?:start|starting|date|on)\s*(?:date|on|of|from)?\s*(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    startDate = dateMatch[1];
  } else {
    // support other common formats like DD-MM-YYYY
    const dateMatch2 = text.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
    if (dateMatch2) {
      startDate = `${dateMatch2[3]}-${dateMatch2[2]}-${dateMatch2[1]}`;
    }
  }
  
  // 4. Job Code
  let jobCode = "";
  const jobMatch = text.match(/(?:job|job code|code)\s*(?:is|to|be)?\s*([a-z0-9]+)/i);
  if (jobMatch) {
    jobCode = jobMatch[1].toUpperCase();
  }
  
  // 5. Location Code
  let locationCode = "";
  const locMatch = text.match(/(?:location|location code|loc)\s*(?:is|to|be)?\s*([a-z0-9]+)/i);
  if (locMatch) {
    locationCode = locMatch[1].toUpperCase();
  }
  
  // 6. Legal Employer & Business Unit
  let legalEmployer = "";
  const legalSelect = document.getElementById('hire-legal-employer');
  if (legalSelect) {
    const options = Array.from(legalSelect.options).map(o => o.value).filter(v => v);
    for (const opt of options) {
      if (text.includes(opt.toLowerCase())) {
        legalEmployer = opt;
        break;
      }
    }
    if (!legalEmployer && options.length > 0) legalEmployer = options[0];
  }
  
  let businessUnit = "";
  const buSelect = document.getElementById('hire-business-unit');
  if (buSelect) {
    const options = Array.from(buSelect.options).map(o => o.value).filter(v => v);
    for (const opt of options) {
      if (text.includes(opt.toLowerCase())) {
        businessUnit = opt;
        break;
      }
    }
    if (!businessUnit && options.length > 0) businessUnit = options[0];
  }
  
  // Save parsed values
  parsedHireFields = {
    PersonNumber: personNumber,
    FirstName: firstName,
    LastName: lastName,
    StartDate: startDate,
    LegalEmployerName: legalEmployer,
    BusinessUnitName: businessUnit,
    JobCode: jobCode,
    LocationCode: locationCode
  };
  
  // Update parsed details UI
  if (parsedFields) {
    parsedFields.innerHTML = `
      <div><strong>Person Number:</strong> ${personNumber || '<span style="color:var(--danger)">Not detected</span>'}</div>
      <div><strong>Name:</strong> ${firstName && lastName ? `${firstName} ${lastName}` : '<span style="color:var(--danger)">Not detected</span>'}</div>
      <div><strong>Start Date:</strong> ${startDate}</div>
      <div><strong>Legal Employer:</strong> ${legalEmployer || 'Not detected'}</div>
      <div><strong>Business Unit:</strong> ${businessUnit || 'Not detected'}</div>
      <div><strong>Job Code:</strong> ${jobCode || 'Not provided'}</div>
      <div><strong>Location Code:</strong> ${locationCode || 'Not provided'}</div>
    `;
  }
  
  if (parsedResults) parsedResults.style.display = 'block';
}

function capitalizeWord(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

window.toggleAutoPersonNumber = function(checkbox) {
  const input = document.getElementById('hire-person-number');
  if (!input) return;
  
  if (checkbox.checked) {
    const rand = Math.floor(100000 + Math.random() * 900000);
    input.value = `${rand}`;
    input.disabled = true;
  } else {
    input.value = '';
    input.disabled = false;
  }
}

window.applyParsedHireData = function() {
  const autoChk = document.getElementById('hire-auto-person');
  
  if (parsedHireFields.PersonNumber) {
    const isAutoGenerated = /^\d{6}$/.test(parsedHireFields.PersonNumber) && 
                            !document.getElementById('hire-transcript-text').textContent.toLowerCase().includes(parsedHireFields.PersonNumber.toLowerCase());
    
    if (autoChk) {
      autoChk.checked = isAutoGenerated;
    }
    
    const personInput = document.getElementById('hire-person-number');
    if (personInput) {
      personInput.value = parsedHireFields.PersonNumber;
      personInput.disabled = isAutoGenerated;
    }
  }

  // Populate rest of form fields with parsed data
  if (parsedHireFields.FirstName) document.getElementById('hire-first-name').value = parsedHireFields.FirstName;
  if (parsedHireFields.LastName) document.getElementById('hire-last-name').value = parsedHireFields.LastName;
  if (parsedHireFields.StartDate) document.getElementById('hire-start-date').value = parsedHireFields.StartDate;
  if (parsedHireFields.LegalEmployerName) document.getElementById('hire-legal-employer').value = parsedHireFields.LegalEmployerName;
  if (parsedHireFields.BusinessUnitName) document.getElementById('hire-business-unit').value = parsedHireFields.BusinessUnitName;
  if (parsedHireFields.JobCode) document.getElementById('hire-job-code').value = parsedHireFields.JobCode;
  if (parsedHireFields.LocationCode) document.getElementById('hire-location-code').value = parsedHireFields.LocationCode;
  
  // Switch back to form view so they can review and submit
  setHireInputMethod('type');
  
  // validation and proceed
  proceedHireConfirm();
}

// ==========================================
// WHATSAPP SETTINGS MODAL CONTROLLER
// ==========================================
window.openWhatsAppSettings = async function() {
  const modal = document.getElementById('whatsapp-settings-modal');
  if (!modal) return;
  
  modal.style.display = 'flex';
  
  try {
    const res = await fetch(`${API_BASE}/whatsapp/config`, { headers: { 'Content-Type': 'application/json', 'x-oracle-auth': appState.oracleAuth, 'x-oracle-url': appState.oracleUrl } });
    if (res.ok) {
      const config = await res.json();
      document.getElementById('ws-phone-id').value = config.phoneId || '';
      document.getElementById('ws-verify-token').value = config.verifyToken || '';
      document.getElementById('ws-token').value = config.token || '';
    }
  } catch (err) {
    console.error('Failed to load WhatsApp config:', err);
  }
};

window.closeWhatsAppSettings = function() {
  const modal = document.getElementById('whatsapp-settings-modal');
  if (modal) modal.style.display = 'none';
};

window.saveWhatsAppSettings = async function() {
  const phoneId = document.getElementById('ws-phone-id').value.trim();
  const verifyToken = document.getElementById('ws-verify-token').value.trim();
  const token = document.getElementById('ws-token').value.trim();
  
  try {
    const res = await fetch(`${API_BASE}/whatsapp/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-oracle-auth': appState.oracleAuth, 'x-oracle-url': appState.oracleUrl },
      body: JSON.stringify({ phoneId, verifyToken, token })
    });
    
    if (res.ok) {
      alert('✅ WhatsApp configuration saved and updated successfully!');
      closeWhatsAppSettings();
    } else {
      const errData = await res.json();
      alert('❌ Failed to save WhatsApp configuration: ' + (errData.error || 'Server error'));
    }
  } catch (err) {
    alert('❌ Connection failed: ' + err.message);
  }
};

// ==========================================
// EMPLOYEE DETAILS CONTROLLER
// ==========================================
window.startViewDetails = function() {
  showAllTabs();
  resetDetailLookup();
  switchTab('screen-details');
};

window.resetDetailLookup = function() {
  document.getElementById('detailPersonInput').value = '';
  document.getElementById('detailsDisplayCard').style.display = 'none';
  document.getElementById('detailsLoading').style.display = 'none';
  document.getElementById('detailsError').style.display = 'none';
};

window.lookupEmployeeDetails = async function() {
  const inputEl = document.getElementById('detailPersonInput');
  const personNumber = inputEl.value.trim();
  
  if (!personNumber) {
    alert('Please enter a valid person number.');
    return;
  }
  
  const displayCard = document.getElementById('detailsDisplayCard');
  const loadingState = document.getElementById('detailsLoading');
  const errorState = document.getElementById('detailsError');
  const errorMsg = document.getElementById('det-error-msg');
  
  displayCard.style.display = 'none';
  errorState.style.display = 'none';
  loadingState.style.display = 'block';
  
  try {
    const res = await fetch(`${API_BASE}/oracle/worker?person_number=${personNumber}`, {
      headers: {
        'x-oracle-auth': appState.oracleAuth,
        'x-oracle-url': appState.oracleUrl
      }
    });
    
    loadingState.style.display = 'none';
    
    if (res.ok) {
      const data = await res.json();
      
      document.getElementById('det-name').textContent = data.DisplayName || 'Unknown';
      document.getElementById('det-number-sub').textContent = `Person Number: ${data.PersonNumber}`;
      document.getElementById('det-asg-no').textContent = data.AssignmentNumber || 'Not Assigned';
      document.getElementById('det-worker-type').textContent = data.UserPersonType || 'Employee';
      document.getElementById('det-status').textContent = data.AssignmentStatusType || 'ACTIVE';
      document.getElementById('det-start-date').textContent = data.StartDate || 'Not Assigned';
      document.getElementById('det-dept').textContent = data.DepartmentName || 'Not Assigned';
      document.getElementById('det-legal-employer').textContent = data.LegalEmployerName || 'Not Assigned';
      document.getElementById('det-bu').textContent = data.BusinessUnitName || 'Not Assigned';
      document.getElementById('det-job').textContent = data.JobName || 'Not Assigned';
      document.getElementById('det-loc').textContent = data.LocationName || 'Not Assigned';
      document.getElementById('det-pos').textContent = data.PositionName || 'Not Assigned';
      document.getElementById('det-grade').textContent = data.GradeName || 'Not Assigned';
      document.getElementById('det-manager').textContent = data.currentManagerName || 'None';
      
      displayCard.style.display = 'block';
    } else {
      const err = await res.json();
      errorMsg.textContent = `❌ ${err.error || 'Employee profile not found'}`;
      errorState.style.display = 'block';
    }
  } catch (err) {
    loadingState.style.display = 'none';
    errorMsg.textContent = `❌ Connection error: ${err.message}`;
    errorState.style.display = 'block';
  }
};

let currentPO = null;

// Start PO Status flow
window.startPODetails = function() {
  appState.currentAction = 'po_status';
  showAllTabs();
  switchToTab('screen-home');
  hideAllSteps();
  document.getElementById('po-details-box').style.display = 'block';
  updateStepDots(1);
}

// Start PO Approval flow
window.startPOApproval = function() {
  appState.currentAction = 'po_approval';
  showAllTabs();
  switchToTab('screen-home');
  hideAllSteps();
  document.getElementById('po-list-box').style.display = 'block';
  fetchPOList();
  updateStepDots(1);
}

// Set PO input method
window.setPOInputMethod = function(method) {
  if (method === 'type') {
    document.getElementById('po-type-section').style.display = 'block';
    document.getElementById('po-voice-section').style.display = 'none';
    document.getElementById('poTypeBtn').classList.add('active');
    document.getElementById('poVoiceBtn').classList.remove('active');
  } else {
    document.getElementById('po-type-section').style.display = 'none';
    document.getElementById('po-voice-section').style.display = 'block';
    document.getElementById('poVoiceBtn').classList.add('active');
    document.getElementById('poTypeBtn').classList.remove('active');
  }
}

// Search PO by number
window.searchPO = async function() {
  const poNumber = document.getElementById('po-number-input').value.trim().toUpperCase();

  if (!poNumber) {
    alert('Please enter a PO number');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/oracle/po/details?orderNumber=${poNumber}`, {
      headers: {
        'x-oracle-auth': appState.oracleAuth || sessionStorage.getItem('oracleAuth'),
        'x-oracle-url': appState.oracleUrl || sessionStorage.getItem('oracleUrl')
      }
    });

    const data = await res.json();

    if (res.ok) {
      currentPO = data;
      displayPODetails(data);
    } else {
      alert(data.error || 'PO not found');
    }

  } catch (err) {
    console.error('PO search error:', err);
    alert('Error searching PO. Please try again.');
  }
}

// Display PO details
function displayPODetails(po) {
  document.getElementById('po-display-number').textContent = po.OrderNumber;
  document.getElementById('po-display-status').textContent = po.Status;
  document.getElementById('po-display-supplier').textContent = po.Supplier || 'N/A';
  document.getElementById('po-display-total').textContent = `${po.CurrencyCode} ${po.Total || '0'}`;
  document.getElementById('po-display-date').textContent = po.CreationDate?.split('T')[0] || 'N/A';
  document.getElementById('po-display-bu').textContent = po.ProcurementBU || 'N/A';

  document.getElementById('po-result-card').style.display = 'block';

  // Show approve button if PO is open
  const approveContainer = document.getElementById('po-approve-btn-container');
  if (po.canApprove) {
    approveContainer.style.display = 'block';
  } else {
    approveContainer.style.display = 'none';
  }
}

// Fetch PO list
async function fetchPOList() {
  try {
    const res = await fetch(`${API_BASE}/oracle/po/list`, {
      headers: {
        'x-oracle-auth': appState.oracleAuth || sessionStorage.getItem('oracleAuth'),
        'x-oracle-url': appState.oracleUrl || sessionStorage.getItem('oracleUrl')
      }
    });

    const data = await res.json();
    const container = document.getElementById('po-list-container');

    if (!data.purchaseOrders?.length) {
      container.innerHTML = `<div style="text-align:center; padding:40px; color:#64748b;">No open purchase orders found</div>`;
      return;
    }

    container.innerHTML = data.purchaseOrders.map(po => `
      <div class="po-list-item" onclick="selectPOFromList('${po.POHeaderId}', '${po.OrderNumber}')">
        <div class="po-list-left">
          <div class="po-number">${po.OrderNumber}</div>
          <div class="po-supplier">${po.Supplier || 'N/A'}</div>
        </div>
        <div class="po-list-right">
          <div class="po-amount">${po.CurrencyCode} ${po.Total || '0'}</div>
          <div class="po-status-badge">${po.Status}</div>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('PO list error:', err);
    document.getElementById('po-list-container').innerHTML = `
      <div style="text-align:center; padding:40px; color:#ef4444;">
        Error loading POs. Please try again.
      </div>`;
  }
}

// Select PO from list for approval
window.selectPOFromList = function(poHeaderId, orderNumber) {
  currentPO = { POHeaderId: poHeaderId, OrderNumber: orderNumber };
  showPOApproveConfirm(orderNumber);
}

// Show PO approval confirmation
function showPOApproveConfirm(orderNumber) {
  switchToTab('screen-confirmation');
  const confirmCard = document.querySelector('.confirm-card');
  if (confirmCard) {
    confirmCard.innerHTML = `
      <div class="glass-card-row">
        <span class="label">Action</span>
        <span class="value">Approve Purchase Order</span>
      </div>
      <div class="glass-card-row">
        <span class="label">PO Number</span>
        <span class="value">${orderNumber}</span>
      </div>
      <div class="glass-card-row">
        <span class="label">Comments</span>
        <span class="value">Approved via Voice Assistant</span>
      </div>
    `;

    document.getElementById('btn-confirm').onclick = confirmPOApproval;
  }
}

// Confirm PO approval
async function confirmPOApproval() {
  const btn = document.getElementById('btn-confirm');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Processing...';
  }

  try {
    const res = await fetch(`${API_BASE}/oracle/po/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-oracle-auth': appState.oracleAuth || sessionStorage.getItem('oracleAuth'),
        'x-oracle-url': appState.oracleUrl || sessionStorage.getItem('oracleUrl')
      },
      body: JSON.stringify({
        POHeaderId: currentPO.POHeaderId,
        OrderNumber: currentPO.OrderNumber,
        comments: 'Approved via Voice Assistant'
      })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      showResult(true, `✅ PO ${currentPO.OrderNumber} approved successfully!`);
    } else if (res.status === 403) {
      showResult(false, `You do not have permission to approve PO ${currentPO.OrderNumber}.\nPlease contact your Oracle administrator.`);
    } else {
      showResult(false, data.error || 'Failed to approve PO. Please try again.');
    }

  } catch (err) {
    console.error('PO approval error:', err);
    showResult(false, 'Connection error. Please try again.');
  }
}

// Approve PO from details view
window.approvePO = function() {
  if (currentPO) {
    showPOApproveConfirm(currentPO.OrderNumber);
  }
}

// Reset PO search
window.resetPOSearch = function() {
  document.getElementById('po-number-input').value = '';
  document.getElementById('po-result-card').style.display = 'none';
  currentPO = null;
}


// Start View Leave Balance
window.startViewLeaveBalance = function() {
  appState.currentAction = 'view_leave_balance';
  showAllTabs();
  switchTab('screen-home'); // Use existing screen for voice input logic
  hideAllSteps();
  document.getElementById('step-indicator').style.display = 'none';
  document.getElementById('main-title').style.display = 'none';
  document.getElementById('leave-balance-box').style.display = 'block';
  document.getElementById('leave-balance-result').style.display = 'none';
}

// Start Apply Leave
window.startApplyLeave = function() {
  appState.currentAction = 'apply_leave';
  showAllTabs();
  switchTab('screen-home');
  hideAllSteps();
  document.getElementById('step-indicator').style.display = 'none';
  document.getElementById('main-title').style.display = 'none';
  document.getElementById('apply-leave-box').style.display = 'block';

  // Set today as default start date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('leave-start-date').value = today;
  document.getElementById('leave-end-date').value = today;

  // Fetch absence types
  fetchAbsenceTypes();
}

// Check leave balance
window.checkLeaveBalance = async function() {
  const personNumber = document.getElementById('leave-person-number').value.trim();

  if (!personNumber) {
    alert('Please enter person number');
    return;
  }

  try {
    const btn = document.querySelector('#leave-balance-box .search-btn');
    if (btn) {
      btn.textContent = 'Checking...';
      btn.disabled = true;
    }

    // First get personId from person number
    const workerRes = await fetch(
      `${API_BASE}/oracle/worker?person_number=${personNumber}`,
      {
        headers: {
          'x-oracle-auth': appState.oracleAuth || sessionStorage.getItem('oracleAuth'),
          'x-oracle-url': appState.oracleUrl || sessionStorage.getItem('oracleUrl')
        }
      }
    );

    const workerData = await workerRes.json();

    if (!workerRes.ok) {
      alert(workerData.error || 'Employee not found');
      return;
    }

    const personId = workerData.PersonId;

    // Get leave balance
    const balanceRes = await fetch(`${API_BASE}/oracle/leavebalance?personId=${personId}`);

    const balanceData = await balanceRes.json();
    console.log('Leave balance data:', balanceData);

    const resultDiv = document.getElementById('leave-balance-result');
    resultDiv.style.display = 'block';

    if (balanceData.items && balanceData.items.length > 0) {
      let html = `
        <div class="glass-card">
          <h4 style="color:#f1f5f9; margin-bottom:12px; font-size:15px;">
            Leave Balance for ${workerData.DisplayName}
          </h4>
      `;

      balanceData.items.forEach(item => {
        html += `
          <div class="glass-card-row">
            <span class="label">
              ${item.absenceTypeName || 'Leave Type'}
            </span>
            <span class="value" style="color:#10b981; font-weight:600;">
              ${item.remainingEntitlement || item.balance || 'N/A'} days
            </span>
          </div>
        `;
      });

      html += `</div>`;
      resultDiv.innerHTML = html;
    } else {
      resultDiv.innerHTML = `
        <div class="glass-card" style="text-align:center; color:#64748b;">
          No leave balance records found for this employee.
        </div>
      `;
    }

  } catch (err) {
    console.error('Leave balance error:', err);
    alert('Failed to fetch leave balance. Please try again.');
  } finally {
    const btn = document.querySelector('#leave-balance-box .search-btn');
    if (btn) {
      btn.textContent = '📊 Check Balance';
      btn.disabled = false;
    }
  }
}

// Fetch absence types
async function fetchAbsenceTypes() {
  try {
    const res = await fetch(`${API_BASE}/oracle/absencetypes`);
    const data = await res.json();

    const select = document.getElementById('leave-type-select');
    if (select && data.types && data.types.length > 0) {
      select.innerHTML = '<option value="">Select Leave Type...</option>';
      data.types.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.AbsenceTypeId;
        opt.textContent = t.Name;
        select.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Absence types error:', err);
  }
}

// Proceed to leave confirmation
window.proceedLeaveConfirm = async function() {
  const personNumber = document.getElementById('leave-emp-number').value.trim();
  const absenceTypeId = document.getElementById('leave-type-select').value;
  const startDate = document.getElementById('leave-start-date').value;
  const endDate = document.getElementById('leave-end-date').value;
  const startTime = document.getElementById('leave-start-time').value;
  const endTime = document.getElementById('leave-end-time').value;
  const absenceTypeName = document.getElementById('leave-type-select').options[
    document.getElementById('leave-type-select').selectedIndex
  ].text;

  if (!personNumber || !absenceTypeId || !startDate || !endDate) {
    alert('Please fill all required fields');
    return;
  }

  if (new Date(endDate) < new Date(startDate)) {
    alert('End date cannot be before start date');
    return;
  }

  try {
    const workerRes = await fetch(
      `${API_BASE}/oracle/worker?person_number=${personNumber}`,
      {
        headers: {
          'x-oracle-auth': appState.oracleAuth || sessionStorage.getItem('oracleAuth'),
          'x-oracle-url': appState.oracleUrl || sessionStorage.getItem('oracleUrl')
        }
      }
    );

    const workerData = await workerRes.json();

    if (!workerRes.ok) {
      alert(workerData.error || 'Employee not found');
      return;
    }

    appState.leaveData = {
      personId: workerData.PersonId,
      personNumber: personNumber,
      employeeName: workerData.DisplayName,
      legalEntityId: 300000046974965,
      absenceTypeId: Number(absenceTypeId),
      absenceTypeName: absenceTypeName,
      startDate: startDate,
      endDate: endDate,
      startTime: startTime || '08:30',
      endTime: endTime || '17:30'
    };

    showLeaveConfirmation();

  } catch (err) {
    console.error('Leave confirm error:', err);
    alert('Failed to get employee details. Please try again.');
  }
}

function showLeaveConfirmation() {
  const l = appState.leaveData;
  switchTab('screen-confirmation');

  const confirmCard = document.querySelector('.confirm-card');
  if (confirmCard) {
    confirmCard.innerHTML = `
      <div class="glass-card-row">
        <span class="label">Action</span>
        <span class="value">Apply Leave</span>
      </div>
      <div class="glass-card-row">
        <span class="label">Employee</span>
        <span class="value">
          ${l.employeeName} (${l.personNumber})
        </span>
      </div>
      <div class="glass-card-row">
        <span class="label">Leave Type</span>
        <span class="value">${l.absenceTypeName}</span>
      </div>
      <div class="glass-card-row">
        <span class="label">Start Date</span>
        <span class="value">${l.startDate}</span>
      </div>
      <div class="glass-card-row">
        <span class="label">End Date</span>
        <span class="value">${l.endDate}</span>
      </div>
      <div class="glass-card-row">
        <span class="label">Start Time</span>
        <span class="value">${l.startTime}</span>
      </div>
      <div class="glass-card-row">
        <span class="label">End Time</span>
        <span class="value">${l.endTime}</span>
      </div>
    `;

    // Overwrite actions
    const actions = document.querySelector('#screen-confirmation .actions');
    if (actions) {
      actions.innerHTML = `
        <button id="btn-confirm-leave" class="search-btn"
                style="background:linear-gradient(135deg,#10b981,#059669);
                box-shadow:0 8px 24px rgba(16,185,129,0.3);">
          ✅ Submit Leave
        </button>
        <button onclick="startApplyLeave()" class="btn btn-danger">
          ❌ Cancel
        </button>
      `;
      document.getElementById('btn-confirm-leave').addEventListener('click', confirmApplyLeave);
    }
  }
}

async function confirmApplyLeave() {
  const btn = document.getElementById('btn-confirm-leave');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Submitting...';
  }

  try {
    const res = await fetch(`${API_BASE}/oracle/applyleave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appState.leaveData)
    });

    const data = await res.json();

    if (res.ok && data.success) {
      showResult(true,
        `Leave submitted successfully!\nEmployee: ${appState.leaveData.employeeName}\nFrom: ${appState.leaveData.startDate} To: ${appState.leaveData.endDate}`
      );
    } else {
      showResult(false, data.error || 'Failed to submit leave request');
    }

  } catch (err) {
    console.error('Apply leave error:', err);
    showResult(false, 'Connection error. Please try again.');
  }
}

window.hideActionTabs = function() { showOnlyHomeTab(); }
