const API_BASE = 'https://voice-action-server.onrender.com/api';

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
  audioBlob: null
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
    themeToggle.textContent = savedTheme === 'light' ? '☀️' : '🌙';

    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      themeToggle.textContent = next === 'light' ? '☀️' : '🌙';
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
    statusBar.textContent = "⏳ Processing your voice...";
    statusBar.style.color = 'var(--primary)';
    if(mediaRecorder) mediaRecorder.stop();
  } else {
    console.log(`[Step ${appState.workflowStep}] Start recording clicked...`);
    isRecording = true;
    audioChunks = [];
    micBtn.classList.add('recording');
    statusBar.textContent = "🔴 Listening... click mic to stop";
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
        
        const res = await fetch(`${API_BASE}/oracle/worker?person_number=${appState.person_number}`);
        if (!res.ok) throw new Error(`Person number ${appState.person_number} not found.`);
        const data = await res.json();
        
        if (!data.encodedPersonId) throw new Error(`Person number ${appState.person_number} details incomplete.`);
        
        appState.encodedPersonId = data.encodedPersonId;
        appState.encodedAssignmentId = data.encodedAssignmentId;
        appState.WorkRelationshipId = data.WorkRelationshipId;
        appState.worker_display_name = data.DisplayName;
        appState.current_manager_name = data.currentManagerName || "None";
        appState.currentManagerNumber = data.currentManagerNumber;
        appState.managerSelfLink = data.managerSelfLink;

        console.log("Employee found:", appState.worker_display_name);
        
        // Update UI for Step 2
        empName.textContent = appState.worker_display_name;
        empNo.textContent = appState.person_number;
        
        // Avatar Initials
        const empAvatar = document.getElementById('emp-avatar');
        if (empAvatar && appState.worker_display_name) {
          empAvatar.textContent = appState.worker_display_name.substring(0, 2).toUpperCase();
        } else if (empAvatar) {
          empAvatar.textContent = "EM";
        }

        const empManagerTypeRow = document.getElementById('emp-manager-type-row');
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
    mainTitle.textContent = "Select Action";
    document.getElementById('sub-title').style.display = 'none';
    
    document.getElementById('input-toggle-container').style.display = 'none';
    document.getElementById('typeSection').style.display = 'none';
    document.getElementById('voiceSection').style.display = 'none';
    
    transcriptBox.style.display = 'none';
    voiceConfirmBox.style.display = 'none';
    
    step2Actions.style.display = 'flex';
}

btnAssignNew.addEventListener('click', moveToStep3);
btnChangeExisting.addEventListener('click', moveToStep3);

function moveToStep3() {
    console.log("Moving to Step 3...");
    appState.workflowStep = 3;
    updateStepDots(3);
    mainTitle.textContent = "Enter Manager Person Number";
    
    const subTitle = document.getElementById('sub-title');
    subTitle.textContent = "Step 3 of 4";
    subTitle.style.display = 'block';
    
    step2Actions.style.display = 'none';
    
    document.getElementById('input-toggle-container').style.display = 'block';
    document.getElementById('mic-section').style.display = 'flex';
    setInputMethod(window.inputMethod || 'voice');
    
    document.getElementById('personNumberInput').value = '';
    document.getElementById('personNumberInput').placeholder = 'Enter Manager Person Number e.g. 2351';
    document.getElementById('searchBtn').textContent = '🔍 Search Manager';
    
    statusBar.style.display = 'block';
    statusBar.textContent = "Please speak the Manager's Person Number";
    statusBar.style.color = 'var(--text-muted)';
    
    transcriptBox.style.display = 'none';
}

async function fetchManagerDetails() {
    try {
        console.log("Fetching Manager Details for Number:", appState.manager_person_number);
        statusBar.textContent = `Looking up Manager ${appState.manager_person_number}...`;

        const res = await fetch(`${API_BASE}/oracle/manager?manager_person_number=${appState.manager_person_number}`);
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
    document.getElementById('conf-manager').textContent = `${appState.manager_display_name} (No: ${appState.manager_person_number})`;
    document.getElementById('conf-date').textContent = appState.effective_date;

    switchTab('screen-confirmation');
}

// Confirmation Buttons
document.getElementById('btn-confirm').addEventListener('click', assignManager);
document.getElementById('btn-cancel').addEventListener('click', resetApp);
document.getElementById('btn-edit').addEventListener('click', resetApp);

async function assignManager() {
  console.log("Assign Manager clicked...");
  const btn = document.getElementById('btn-confirm');
  btn.disabled = true;
  btn.textContent = "Assigning...";
  
  try {
    console.log("Calling POST /api/oracle/assign...");
    const res = await fetch(`${API_BASE}/oracle/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        encodedPersonId: appState.encodedPersonId,
        WorkRelationshipId: appState.WorkRelationshipId,
        encodedAssignmentId: appState.encodedAssignmentId,
        ManagerAssignmentId: appState.ManagerAssignmentId,
        managerSelfLink: appState.managerSelfLink,
        effectiveDate: appState.effective_date
      })
    });
    
    if (!res.ok) throw new Error("Failed to assign manager via Oracle API.");
    
    console.log("Assign Success!");
    saveAuditLog("Success");
    showResult(true, `Manager assigned successfully for Person ${appState.person_number}.`);
  } catch (err) {
    console.error("Assign Error:", err);
    handleError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "✅ Confirm";
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
    iconDiv.className = 'icon-circle success';
    svgSuccess.style.display = 'block';
    svgError.style.display = 'none';
    title.textContent = 'Success!';
  } else {
    iconDiv.className = 'icon-circle error';
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
    audioBlob: null
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
  document.getElementById('searchBtn').textContent = '🔍 Search Employee';

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
  switchTab('screen-home');
}

console.log("App initialized.");
