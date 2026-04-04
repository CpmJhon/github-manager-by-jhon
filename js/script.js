// GitHub Manager Cyberpunk Terminal Edition
// Mempertahankan semua fungsionalitas original + Live Terminal Premium

// =============== STATE MANAGEMENT ===============
let gitUsername = "";
let gitToken = "";
let isAuthenticated = false;
let pendingFiles = [];
let currentOperation = null;

// =============== DOM ELEMENTS ===============
let authCard, mainMenuDiv, dynamicPanel, liveTerminal, terminalBody;
let progressContainer, progressFill, progressPercent, progressText;

// =============== INITIALIZATION ===============
document.addEventListener('DOMContentLoaded', () => {
  authCard = document.getElementById('authCard');
  mainMenuDiv = document.getElementById('mainMenu');
  dynamicPanel = document.getElementById('actionPanel');
  liveTerminal = document.getElementById('liveTerminal');
  terminalBody = document.getElementById('terminalBody');
  progressContainer = document.getElementById('progressContainer');
  progressFill = document.getElementById('progressFill');
  progressPercent = document.getElementById('progressPercent');
  progressText = document.getElementById('progressText');
  
  // Button listeners
  document.getElementById('authBtn')?.addEventListener('click', authenticateAndVerify);
  document.getElementById('showCreateRepo')?.addEventListener('click', () => renderCreateRepoUI());
  document.getElementById('showDeleteRepo')?.addEventListener('click', () => renderDeleteRepoUI());
  document.getElementById('showUploadProyek')?.addEventListener('click', () => renderUploadUI());
  document.getElementById('showListRepo')?.addEventListener('click', () => renderListRepoUI());
  document.getElementById('logoutBtn')?.addEventListener('click', logout);
});

// =============== TERMINAL FUNCTIONS ===============
function showTerminal() {
  liveTerminal.style.display = 'block';
  scrollTerminalToBottom();
}

function hideTerminal() {
  liveTerminal.style.display = 'none';
}

function addTerminalLog(message, type = 'info', withTyping = false) {
  const logDiv = document.createElement('div');
  logDiv.className = `log-line log-${type}`;
  
  if (withTyping) {
    let i = 0;
    logDiv.innerHTML = '';
    terminalBody.appendChild(logDiv);
    const interval = setInterval(() => {
      if (i < message.length) {
        logDiv.innerHTML += message[i];
        i++;
        scrollTerminalToBottom();
      } else {
        clearInterval(interval);
      }
    }, 15);
  } else {
    logDiv.innerHTML = message;
    terminalBody.appendChild(logDiv);
    scrollTerminalToBottom();
  }
  
  // Update cursor position
  const cursorLine = terminalBody.querySelector('.cursor-line');
  if (cursorLine) {
    cursorLine.remove();
    terminalBody.appendChild(cursorLine);
  }
  scrollTerminalToBottom();
}

function addSystemLog(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  addTerminalLog(`[${timestamp}] > ${message}`, type);
}

function scrollTerminalToBottom() {
  terminalBody.scrollTop = terminalBody.scrollHeight;
}

function updateProgress(percent, text) {
  if (progressFill) progressFill.style.width = percent + '%';
  if (progressPercent) progressPercent.textContent = percent + '%';
  if (progressText) progressText.textContent = text;
}

function showProgress() {
  if (progressContainer) progressContainer.style.display = 'block';
}

function hideProgress() {
  if (progressContainer) progressContainer.style.display = 'none';
  updateProgress(0, '[ IDLE ]');
}

// =============== GITHUB API FUNCTIONS ===============
async function githubRequest(endpoint, method = 'GET', body = null) {
  const url = endpoint.startsWith('https') ? endpoint : `https://api.github.com${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Basic ${btoa(gitUsername + ':' + gitToken)}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  
  if (!response.ok && response.status !== 204) {
    const err = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(err.message);
  }
  return response.status === 204 ? { success: true } : await response.json();
}

// =============== AUTHENTICATION ===============
async function authenticateAndVerify() {
  const user = document.getElementById('githubUsername').value.trim();
  const token = document.getElementById('githubToken').value.trim();
  
  if (!user || !token) {
    const statusDiv = document.getElementById('authStatus');
    statusDiv.innerHTML = '<div class="log-error">> [ERROR] Username and token required!</div>';
    return;
  }
  
  showTerminal();
  addSystemLog('[AUTH] Initializing connection to GitHub API...', 'info');
  await new Promise(r => setTimeout(r, 500));
  addSystemLog(`[AUTH] Target: api.github.com/user`, 'info');
  await new Promise(r => setTimeout(r, 500));
  
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `Basic ${btoa(user + ':' + token)}` }
    });
    
    if (!response.ok) throw new Error('Invalid credentials');
    const data = await response.json();
    if (data.login.toLowerCase() !== user.toLowerCase()) throw new Error('Username mismatch');
    
    gitUsername = user;
    gitToken = token;
    isAuthenticated = true;
    
    addSystemLog(`[SUCCESS] Authenticated as ${gitUsername}`, 'success');
    await new Promise(r => setTimeout(r, 500));
    addSystemLog('[SYSTEM] Access granted. Secure channel established.', 'success');
    addSystemLog('[SYSTEM] Loading user repositories...', 'info');
    
    // Update UI
    authCard.style.display = 'none';
    mainMenuDiv.style.display = 'block';
    document.getElementById('currentUser').textContent = gitUsername;
    
    setTimeout(() => {
      addSystemLog('[READY] System online. Select an operation.', 'success');
      goBackToMenu();
    }, 1000);
    
  } catch (err) {
    addSystemLog(`[ERROR] Authentication failed: ${err.message}`, 'error');
  }
}

function logout() {
  addSystemLog('[SYSTEM] Disconnecting from GitHub...', 'warning');
  gitUsername = "";
  gitToken = "";
  isAuthenticated = false;
  pendingFiles = [];
  
  authCard.style.display = 'block';
  mainMenuDiv.style.display = 'none';
  hideTerminal();
  
  document.getElementById('githubUsername').value = '';
  document.getElementById('githubToken').value = '';
}

// =============== REPOSITORY OPERATIONS ===============
async function createRepository(name, description = '', isPrivate = false) {
  return await githubRequest('/user/repos', 'POST', { 
    name, 
    description, 
    private: isPrivate,
    auto_init: false 
  });
}

async function deleteRepository(name) {
  return await githubRequest(`/repos/${gitUsername}/${name}`, 'DELETE');
}

async function listRepositories() {
  return await githubRequest('/user/repos?per_page=50&sort=updated', 'GET');
}

// =============== UPLOAD FUNCTIONS ===============
async function uploadSingleFile(repo, filePath, contentBase64, commitMessage) {
  return await githubRequest(`/repos/${gitUsername}/${repo}/contents/${encodeURIComponent(filePath)}`, 'PUT', {
    message: commitMessage,
    content: contentBase64,
    branch: "main"
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
  });
}

// File traversal for folders
async function traverseFileTree(entry, files, path = '') {
  if (entry.isFile) {
    return new Promise(resolve => {
      entry.file(file => {
        if (path) {
          Object.defineProperty(file, 'webkitRelativePath', { 
            value: path + '/' + file.name, 
            writable: false 
          });
        }
        files.push(file);
        resolve();
      });
    });
  } else if (entry.isDirectory) {
    const reader = entry.createReader();
    return new Promise(resolve => {
      reader.readEntries(async entries => {
        for (const childEntry of entries) {
          await traverseFileTree(childEntry, files, path ? `${path}/${entry.name}` : entry.name);
        }
        resolve();
      });
    });
  }
}

// Upload process with live terminal
async function startUploadProcess(repo, files, commitMsg) {
  showProgress();
  let success = 0;
  let error = 0;
  
  addSystemLog(`[UPLOAD] Target repository: ${gitUsername}/${repo}`, 'info');
  addSystemLog(`[UPLOAD] Total files: ${files.length}`, 'info');
  await new Promise(r => setTimeout(r, 500));
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = file.webkitRelativePath || file.name;
    const percent = ((i / files.length) * 100).toFixed(1);
    
    updateProgress(percent, `[UPLOAD] ${i+1}/${files.length} - ${filePath.substring(0, 50)}`);
    addSystemLog(`[UPLOAD] Sending: ${filePath} (${(file.size/1024).toFixed(2)} KB)`, 'info');
    
    try {
      const base64 = await fileToBase64(file);
      await uploadSingleFile(repo, filePath, base64, `${commitMsg} (${i+1}/${files.length})`);
      success++;
      addSystemLog(`[SUCCESS] Uploaded: ${filePath}`, 'success');
    } catch (err) {
      error++;
      addSystemLog(`[ERROR] Failed: ${filePath} - ${err.message}`, 'error');
    }
    
    await new Promise(r => setTimeout(r, 100));
  }
  
  updateProgress(100, '[COMPLETE] Upload finished!');
  
  if (error === 0) {
    addSystemLog(`[SUCCESS] Operation completed! ${success} files uploaded to ${repo}`, 'success');
  } else {
    addSystemLog(`[WARNING] Completed with errors: ${success} success, ${error} failed`, 'warning');
  }
  
  setTimeout(() => {
    hideProgress();
    goBackToMenu();
  }, 2000);
}

// =============== UI RENDERING ===============
function goBackToMenu() {
  dynamicPanel.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-terminal" style="font-size: 3rem; color: #00ffff;"></i>
      <p style="color: #00ffff; margin-top: 15px;">[ SYSTEM READY ]</p>
      <p style="color: #666; font-size: 0.8rem;">Select an operation from the terminal</p>
    </div>
  `;
  hideProgress();
}

// Create Repository UI
function renderCreateRepoUI() {
  dynamicPanel.innerHTML = `
    <div class="input-group-neon">
      <label><i class="fas fa-folder-plus"></i> >_ REPOSITORY_NAME::</label>
      <input type="text" id="newRepoName" placeholder="cyber-project" class="cyber-input">
    </div>
    <div class="input-group-neon">
      <label><i class="fas fa-align-left"></i> >_ DESCRIPTION::</label>
      <textarea id="repoDesc" rows="3" placeholder="Awesome cyberpunk project..." class="cyber-input"></textarea>
    </div>
    <div class="input-group-neon">
      <label>
        <input type="checkbox" id="repoPrivate" style="margin-right: 8px;"> 
        >_ PRIVATE_MODE [ENABLED]
      </label>
    </div>
    <button id="confirmCreateRepo" class="neon-btn cyber-btn" style="width: 100%; margin-top: 10px;">
      <i class="fas fa-code-branch"></i> [ EXECUTE_CREATE ]
    </button>
    <button id="cancelCreate" class="neon-btn" style="width: 100%; margin-top: 10px;">
      [ CANCEL ]
    </button>
  `;
  
  document.getElementById('confirmCreateRepo').onclick = async () => {
    const name = document.getElementById('newRepoName').value.trim();
    if (!name) {
      addSystemLog('[ERROR] Repository name required!', 'error');
      return;
    }
    
    showTerminal();
    addSystemLog('[GITHUB] Creating new repository...', 'info');
    addSystemLog(`[REPO] Name: ${name}`, 'info');
    addSystemLog(`[REPO] Private: ${document.getElementById('repoPrivate').checked ? 'YES' : 'NO'}`, 'info');
    await new Promise(r => setTimeout(r, 500));
    
    try {
      await createRepository(
        name, 
        document.getElementById('repoDesc').value, 
        document.getElementById('repoPrivate').checked
      );
      addSystemLog(`[SUCCESS] Repository "${name}" created successfully!`, 'success');
      setTimeout(() => goBackToMenu(), 2000);
    } catch (err) {
      addSystemLog(`[ERROR] Failed: ${err.message}`, 'error');
    }
  };
  
  document.getElementById('cancelCreate').onclick = goBackToMenu;
}

// Delete Repository UI
function renderDeleteRepoUI() {
  dynamicPanel.innerHTML = `
    <div class="input-group-neon">
      <label><i class="fas fa-skull"></i> >_ REPOSITORY_TO_DESTROY::</label>
      <input type="text" id="deleteRepoName" placeholder="repository-to-delete" class="cyber-input">
    </div>
    <div class="input-group-neon">
      <label><i class="fas fa-exclamation-triangle"></i> >_ CONFIRM_REPO_NAME::</label>
      <input type="text" id="confirmDeleteName" placeholder="type repository name to confirm" class="cyber-input">
    </div>
    <button id="confirmDeleteRepo" class="neon-btn cyber-btn danger" style="width: 100%; margin-top: 10px;">
      <i class="fas fa-radiation"></i> [ PERMANENTLY_DESTROY ]
    </button>
    <button id="cancelDelete" class="neon-btn" style="width: 100%; margin-top: 10px;">
      [ ABORT_MISSION ]
    </button>
  `;
  
  document.getElementById('confirmDeleteRepo').onclick = async () => {
    const name = document.getElementById('deleteRepoName').value.trim();
    const confirm = document.getElementById('confirmDeleteName').value.trim();
    
    if (name !== confirm) {
      addSystemLog('[ERROR] Repository name confirmation mismatch!', 'error');
      return;
    }
    
    showTerminal();
    addSystemLog('[DANGER] Initiating repository deletion sequence...', 'warning');
    addSystemLog(`[TARGET] Repository: ${name}`, 'info');
    addSystemLog('[WARNING] This action cannot be undone!', 'warning');
    await new Promise(r => setTimeout(r, 1000));
    
    try {
      await deleteRepository(name);
      addSystemLog(`[SUCCESS] Repository "${name}" has been destroyed!`, 'success');
      setTimeout(() => goBackToMenu(), 2000);
    } catch (err) {
      addSystemLog(`[ERROR] Deletion failed: ${err.message}`, 'error');
    }
  };
  
  document.getElementById('cancelDelete').onclick = goBackToMenu;
}

// Upload UI with file selection
function renderUploadUI() {
  let selectedFiles = [];
  
  dynamicPanel.innerHTML = `
    <div class="input-group-neon">
      <label><i class="fas fa-database"></i> >_ TARGET_REPOSITORY::</label>
      <input type="text" id="targetRepoName" placeholder="repository-name" class="cyber-input">
    </div>
    <div class="input-group-neon">
      <label><i class="fas fa-comment"></i> >_ COMMIT_MESSAGE::</label>
      <input type="text" id="commitMsg" placeholder="Upload project via cyberpunk terminal" class="cyber-input">
    </div>
    
    <div class="upload-area" id="uploadArea" style="border: 2px dashed #00ffff; border-radius: 10px; padding: 40px; text-align: center; cursor: pointer; margin-bottom: 20px;">
      <i class="fas fa-cloud-upload-alt" style="font-size: 3rem; color: #00ffff;"></i>
      <p style="color: #00ffff; margin-top: 10px;">[ DRAG_AND_DROP_FILES_OR_FOLDERS_HERE ]</p>
      <button id="selectFilesBtn" class="neon-btn" style="margin-top: 15px;">
        <i class="fas fa-folder-open"></i> [ SELECT_FILES ]
      </button>
      <input type="file" id="fileInput" multiple webkitdirectory style="display: none;">
    </div>
    
    <div id="fileList" style="margin-bottom: 20px; max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.3); border-radius: 8px; padding: 10px;"></div>
    
    <button id="startUploadBtn" class="neon-btn cyber-btn success" style="width: 100%;">
      <i class="fas fa-rocket"></i> [ EXECUTE_UPLOAD_SEQUENCE ]
    </button>
    <button id="backBtn" class="neon-btn" style="width: 100%; margin-top: 10px;">
      [ BACK_TO_MENU ]
    </button>
  `;
  
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');
  const selectBtn = document.getElementById('selectFilesBtn');
  const fileListDiv = document.getElementById('fileList');
  const startBtn = document.getElementById('startUploadBtn');
  const backBtn = document.getElementById('backBtn');
  
  // File selection handlers
  uploadArea.onclick = () => fileInput.click();
  selectBtn.onclick = (e) => { e.stopPropagation(); fileInput.click(); };
  
  fileInput.onchange = async (e) => {
    const files = Array.from(e.target.files);
    for (const f of files) {
      selectedFiles.push(f);
    }
    updateFileList();
  };
  
  uploadArea.ondragover = (e) => { 
    e.preventDefault(); 
    uploadArea.style.borderColor = '#ff00ff'; 
  };
  
  uploadArea.ondragleave = () => { 
    uploadArea.style.borderColor = '#00ffff'; 
  };
  
  uploadArea.ondrop = async (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#00ffff';
    const items = e.dataTransfer.items;
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry();
      if (entry) await traverseFileTree(entry, selectedFiles);
    }
    updateFileList();
  };
  
  function updateFileList() {
    if (selectedFiles.length === 0) {
      fileListDiv.innerHTML = '<div style="color: #666; text-align: center; padding: 10px;">[ NO_FILES_SELECTED ]</div>';
      return;
    }
    
    let html = '<div style="color: #00ffff; margin-bottom: 10px; padding: 5px;">📁 SELECTED_FILES:</div>';
    selectedFiles.slice(0, 30).forEach(f => {
      const path = f.webkitRelativePath || f.name;
      html += `<div style="color: #00ff88; font-size: 0.7rem; margin: 3px 0; font-family: monospace;">
        ├─ ${path.substring(0, 60)} (${(f.size/1024).toFixed(1)} KB)
      </div>`;
    });
    if (selectedFiles.length > 30) {
      html += `<div style="color: #666;">... and ${selectedFiles.length - 30} more files</div>`;
    }
    fileListDiv.innerHTML = html;
  }
  
  startBtn.onclick = async () => {
    const repo = document.getElementById('targetRepoName').value.trim();
    const msg = document.getElementById('commitMsg').value.trim() || "Cyberpunk upload sequence";
    
    if (!repo) {
      addSystemLog('[ERROR] Target repository required!', 'error');
      return;
    }
    if (selectedFiles.length === 0) {
      addSystemLog('[ERROR] No files selected!', 'error');
      return;
    }
    
    showTerminal();
    addSystemLog('[SYSTEM] Initiating upload sequence...', 'info');
    addSystemLog(`[TARGET] Repository: ${gitUsername}/${repo}`, 'info');
    addSystemLog(`[FILES] Total: ${selectedFiles.length} files`, 'info');
    await new Promise(r => setTimeout(r, 500));
    
    await startUploadProcess(repo, selectedFiles, msg);
    selectedFiles = [];
    updateFileList();
  };
  
  backBtn.onclick = goBackToMenu;
}

// List Repositories UI
async function renderListRepoUI() {
  dynamicPanel.innerHTML = `
    <div id="repoListContainer" style="max-height: 400px; overflow-y: auto;">
      <div style="text-align: center; color: #00ffff; padding: 20px;">
        <i class="fas fa-spinner fa-pulse"></i> [ FETCHING_REPOSITORIES... ]
      </div>
    </div>
    <button id="backFromList" class="neon-btn" style="width: 100%; margin-top: 20px;">
      [ BACK_TO_MENU ]
    </button>
  `;
  
  showTerminal();
  addSystemLog('[GITHUB] Fetching repository list...', 'info');
  
  try {
    const repos = await listRepositories();
    let html = '<div style="color: #00ffff; margin-bottom: 15px; padding: 10px;">📁 REPOSITORY_DATABASE:</div>';
    
    repos.forEach(r => {
      html += `
        <div style="background: rgba(0,255,255,0.05); padding: 12px; margin: 8px 0; border-radius: 8px; border-left: 3px solid ${r.private ? '#ff00ff' : '#00ff88'};">
          <div style="color: #00ff88; font-weight: bold; font-family: monospace;">${r.name}</div>
          <div style="color: #666; font-size: 0.7rem; margin-top: 4px;">${r.description || 'No description'}</div>
          <div style="color: #00ffff; font-size: 0.65rem; margin-top: 6px;">
            🔒 ${r.private ? 'PRIVATE' : 'PUBLIC'} | ⭐ ${r.stargazers_count} | 🍴 ${r.forks_count} | 📅 ${new Date(r.updated_at).toLocaleDateString()}
          </div>
          <a href="${r.html_url}" target="_blank" style="color: #ff00ff; font-size: 0.7rem; text-decoration: none; margin-top: 5px; display: inline-block;">
            [ OPEN_ON_GITHUB ]
          </a>
        </div>
      `;
    });
    
    document.getElementById('repoListContainer').innerHTML = html;
    addSystemLog(`[SUCCESS] Loaded ${repos.length} repositories`, 'success');
  } catch (err) {
    document.getElementById('repoListContainer').innerHTML = `
      <div class="log-error" style="padding: 20px; text-align: center;">
        [ERROR] Failed to fetch: ${err.message}
      </div>
    `;
    addSystemLog(`[ERROR] Failed to fetch: ${err.message}`, 'error');
  }
  
  document.getElementById('backFromList').onclick = goBackToMenu;
}