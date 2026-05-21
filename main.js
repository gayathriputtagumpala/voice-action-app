const API_BASE = 'https://voice-action-server.onrender.com/api';

// Multi-company support configuration
const COMPANY_ORACLE_URLS = {
  'companya': 'https://fa-eubg-test-saasfademo1.ds-fa.oraclepdemos.com',
  'companyb': 'https://fa-euth-dev58-saasfademo1.ds-fa.oraclepdemos.com'
};

const DEFAULT_ORACLE_BASE_URL = 'https://fa-euth-dev58-saasfademo1.ds-fa.oraclepdemos.com';

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
    if (!text.includes('home')) {
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

  // Theme Toggle Logic
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.textContent = savedTheme === 'light' ? 'â˜€ï¸' : 'ðŸŒ™';

    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      themeToggle.textContent = next === 'light' ? 'â˜€ï¸' : 'ðŸŒ™';
    });
  }
});

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if(btn.disabled) return;
    const target = btn.getAttribute('data-target');
    if (target === 'screen-dashboard') {
      showOnlyHomeTab();
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
    console.log(`[Step ${appState.workflowStep}] Stop recording clicked...`);
    isRecording = false;
    micBtn.classList.remove('recording');
    statusBar.textContent = "â³ Processing your voice...";
    statusBar.style.color = 'var(--primary)';
    if(mediaRecorder) mediaRecorder.stop();
  } else {
    console.log(`[Step ${appState.workflowStep}] Start recording clicked...`);
    isRecording = true;
    audioChunks = [];
    micBtn.classList.add('recording');
    statusBar.textContent = "ðŸ”´ Listening... click mic to stop";
    statusBar.style.color = 'var(--danger)';
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
        statusBar.style.color = 'var(--danger)';
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
        statusBar.style.color = 'var(--text-muted)';
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
        statusBar.style.color = 'var(--text-muted)';
        
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

async function confirmAction() {
  const action = appState.currentAction === 'change_department' ? 'Change Department' : (appState.currentAction === 'change_location' ? 'Change Location' : (appState.currentAction === 'change_job' ? 'Change Job' : (appState.currentAction === 'change_position' ? 'Change Position' : (appState.currentAction === 'change_grade' ? 'Change Grade' : 'Assign Manager'))));
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
    current_grade_name: null
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
  document.getElementById('emp-dept-row').style.display = 'none';
  
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
  const username = document.getElementById('login-username')
    .value.trim();
  const password = document.getElementById('login-password')
    .value.trim();
  const errorEl = document.getElementById('login-error');
  const btnText = document.getElementById('login-btn-text');
  const spinner = document.getElementById('login-spinner');
  
  if (!username || !password) {
    errorEl.textContent = 'Please enter username and password';
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
        oracleUrl: ORACLE_BASE_URL,
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
    
    // Force logout if the stored URL doesn't match active ORACLE_BASE_URL config
    if (oracleUrl !== ORACLE_BASE_URL) {
      console.log('Stale session detected. Forcing logout.');
      sessionStorage.clear();
      return;
    }
    
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
                managerStatusBar.style.color = '#10b981';
            } else {
                managerStatusBar.textContent = "No matching manager found. Please try again or select from list.";
                managerStatusBar.style.color = '#ef4444';
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
