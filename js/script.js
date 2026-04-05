// ========================================
// REPOFLOW - GITHUB MANAGER WITH LIVE TERMINAL
// Mempertahankan semua fungsionalitas original
// ========================================

// =============== STATE MANAGEMENT ===============
let gitUsername = "";
let gitToken = "";
let isAuthenticated = false;
let pendingFiles = [];
let activityLog = [];
let uploadCount = 0;
let commitCount = 0;

// =============== DOM ELEMENTS ===============
let sidebar, menuToggle, pagesContainer, terminalContainer;
let terminalBody, progressWrapper, progressFill, progressPercent, progressText;
let currentPage = "home";

// =============== INITIALIZATION ===============
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  sidebar = document.getElementById('sidebar');
  menuToggle = document.getElementById('menuToggle');
  pagesContainer = document.getElementById('pagesContainer');
  terminalContainer = document.getElementById('terminalContainer');
  terminalBody = document.getElementById('terminalBody');
  progressWrapper = document.getElementById('progressWrapper');
  progressFill = document.getElementById('progressFill');
  progressPercent = document.getElementById('progressPercent');
  progressText = document.getElementById('progressText');
  
  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      navigateTo(page);
      
      // Close sidebar on mobile
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
      }
    });
  });
  
  // Menu Toggle
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
  
  // Quick action buttons
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      if (page) navigateTo(page);
    });
  });
  
  // Login button
  document.getElementById('showLoginBtn')?.addEventListener('click', () => {
    document.getElementById('loginCard').style.display = 'flex';
  });
  
  // Auth button
  document.getElementById('authBtn')?.addEventListener('click', authenticateAndVerify);
  
  // Logout button
  document.getElementById('logoutBtn')?.addEventListener('click', logout);
  
  // Create repo button
  document.getElementById('confirmCreateRepo')?.addEventListener('click', executeCreateRepo);
  
  // Upload handlers
  setupUploadHandlers();
  
  // Refresh repos button
  document.getElementById('refreshReposBtn')?.addEventListener('click', loadRepositories);
  
  // Close terminal
  document.getElementById('closeTerminalBtn')?.addEventListener('click', () => {
    terminalContainer.style.display = 'none';
  });
});

// =============== NAVIGATION ===============
function navigateTo(page) {
  currentPage = page;
  
  // Update active nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.page === page) {
      item.classList.add('active');
    }
  });
  
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => {
    p.style.display = 'none';
  });
  
  // Show selected page
  const pageMap = {
    home: 'homePage',
    dashboard: 'dashboardPage',
    create: 'createPage',
    upload: 'uploadPage',
    repos: 'reposPage'
  };
  
  const pageId = pageMap[page];
  if (pageId) {
    document.getElementById(pageId).style.display = 'block';
  }
  
  // Load data for certain pages
  if (page === 'repos' && isAuthenticated) {
    loadRepositories();
  }
  
  if (page === 'dashboard' && isAuthenticated) {
    updateDashboard();
  }
}

// =============== TERMINAL FUNCTIONS ===============
function showTerminal() {
  terminalContainer.style.display = 'block';
  scrollTerminalToBottom();
}

function addTerminalLog(message, type = 'info') {
  const logDiv = document.createElement('div');
  logDiv.className = `log-line log-${type}`;
  logDiv.innerHTML = message;
  terminalBody.appendChild(logDiv);
  scrollTerminalToBottom();
  
  // Add to activity log
  activityLog.unshift({ message, type, time: new Date() });
  if (activityLog.length > 20) activityLog.pop();
  updateDashboard();
  
  // Keep cursor at bottom
  const cursorLine = terminalBody.querySelector('.cursor-line');
  if (cursorLine) {
    cursorLine.remove();
    terminalBody.appendChild(cursorLine);
  }
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
  if (progressWrapper) progressWrapper.style.display = 'block';
}

function hideProgress() {
  if (progressWrapper) progressWrapper.style.display = 'none';
  updateProgress(0, 'Idle');
}

function updateDashboard() {
  const activityList = document.getElementById('activityList');
  
  if (activityList) {
    if (activityLog.length === 0) {
      activityList.innerHTML = '<div class="activity-item">Belum ada aktivitas</div>';
    } else {
      activityList.innerHTML = activityLog.slice(0, 5).map(log => 
        `<div class="activity-item">${log.message.substring(0, 80)}</div>`
      ).join('');
    }
  }
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
    showAuthStatus('Username and token required!', 'error');
    return;
  }
  
  showTerminal();
  addSystemLog('[AUTH] Connecting to GitHub API...', 'info');
  await new Promise(r => setTimeout(r, 300));
  addSystemLog(`[AUTH] Target: ${user}@github.com`, 'info');
  await new Promise(r => setTimeout(r, 300));
  
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
    await new Promise(r => setTimeout(r, 300));
    addSystemLog('[SYSTEM] Access granted. Secure channel established.', 'success');
    
    // Update UI
    document.getElementById('loginCard').style.display = 'none';
    pagesContainer.style.display = 'block';
    document.getElementById('userName').textContent = gitUsername;
    document.getElementById('showLoginBtn').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'flex';
    document.querySelector('.status-indicator').classList.add('connected');
    document.querySelector('.status-indicator span').textContent = 'Connected';
    
    // Load stats
    await loadRepositories();
    navigateTo('home');
    
    addSystemLog('[READY] System online. Select an operation.', 'success');
    
  } catch (err) {
    addSystemLog(`[ERROR] Authentication failed: ${err.message}`, 'error');
    showAuthStatus(err.message, 'error');
  }
}

function showAuthStatus(message, type) {
  const statusDiv = document.getElementById('authStatus');
  statusDiv.innerHTML = `<div class="log-${type}" style="color: ${type === 'error' ? '#ef4444' : '#10b981'}">${message}</div>`;
  setTimeout(() => { statusDiv.innerHTML = ''; }, 3000);
}

function logout() {
  addSystemLog('[SYSTEM] Disconnecting from GitHub...', 'warning');
  gitUsername = "";
  gitToken = "";
  isAuthenticated = false;
  pendingFiles = [];
  
  document.getElementById('loginCard').style.display = 'flex';
  pagesContainer.style.display = 'none';
  terminalContainer.style.display = 'none';
  document.getElementById('userName').textContent = 'Guest';
  document.getElementById('showLoginBtn').style.display = 'flex';
  document.getElementById('logoutBtn').style.display = 'none';
  document.querySelector('.status-indicator').classList.remove('connected');
  document.querySelector('.status-indicator span').textContent = 'Disconnected';
  
  document.getElementById('githubUsername').value = '';
  document.getElementById('githubToken').value = '';
}

// =============== REPOSITORY OPERATIONS ===============
async function executeCreateRepo() {
  const name = document.getElementById('newRepoName').value.trim();
  const desc = document.getElementById('repoDesc').value;
  const isPrivate = document.getElementById('repoPrivate').checked;
  
  if (!name) {
    addSystemLog('[ERROR] Repository name required!', 'error');
    return;
  }
  
  showTerminal();
  addSystemLog('[GITHUB] Creating new repository...', 'info');
  addSystemLog(`[REPO] Name: ${name}`, 'info');
  addSystemLog(`[REPO] Private: ${isPrivate ? 'YES' : 'NO'}`, 'info');
  showProgress();
  updateProgress(30, 'Creating repository...');
  
  try {
    await githubRequest('/user/repos', 'POST', {
      name, description: desc, private: isPrivate, auto_init: false
    });
    addSystemLog(`[SUCCESS] Repository "${name}" created successfully!`, 'success');
    commitCount++;
    document.getElementById('statCommits').textContent = commitCount;
    
    // Clear form
    document.getElementById('newRepoName').value = '';
    document.getElementById('repoDesc').value = '';
    document.getElementById('repoPrivate').checked = false;
    
    // Update stats
    await loadRepositories();
    
    updateProgress(100, 'Complete!');
    setTimeout(() => {
      hideProgress();
    }, 1500);
  } catch (err) {
    addSystemLog(`[ERROR] Failed: ${err.message}`, 'error');
    hideProgress();
  }
}

async function deleteRepository(name) {
  return await githubRequest(`/repos/${gitUsername}/${name}`, 'DELETE');
}

async function loadRepositories() {
  if (!isAuthenticated) return;
  
  const container = document.getElementById('repoListContainer');
  if (!container) return;
  
  container.innerHTML = '<div style="text-align:center; padding:40px;"><i class="fas fa-spinner fa-pulse"></i> Loading repositories...</div>';
  
  try {
    const repos = await githubRequest('/user/repos?per_page=50&sort=updated', 'GET');
    
    if (repos.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding:40px;">No repositories found</div>';
      return;
    }
    
    // Update stat
    document.getElementById('statRepos').textContent = repos.length;
    
    container.innerHTML = repos.map(repo => `
      <div class="repo-card">
        <div class="repo-name">
          <i class="fas fa-book"></i>
          ${escapeHtml(repo.name)}
        </div>
        <div class="repo-desc">${escapeHtml(repo.description || 'No description')}</div>
        <div class="repo-meta">
          <span>${repo.private ? '🔒 Private' : '🌍 Public'}</span>
          <span>⭐ ${repo.stargazers_count}</span>
          <span>🍴 ${repo.forks_count}</span>
        </div>
        <a href="${repo.html_url}" target="_blank" class="repo-link">Open on GitHub →</a>
        <button class="btn-outline-small delete-repo-btn" data-repo="${repo.name}" style="margin-top: 12px; width: 100%;">
          <i class="fas fa-trash-alt"></i> Delete Repository
        </button>
      </div>
    `).join('');
    
    // Add delete handlers
    document.querySelectorAll('.delete-repo-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const repoName = btn.dataset.repo;
        if (confirm(`⚠️ Are you sure you want to delete "${repoName}"? This action cannot be undone!`)) {
          await executeDeleteRepo(repoName);
          await loadRepositories();
        }
      });
    });
    
  } catch (err) {
    container.innerHTML = `<div class="log-error" style="padding: 20px; text-align: center;">Error: ${err.message}</div>`;
  }
}

async function executeDeleteRepo(repoName) {
  showTerminal();
  addSystemLog('[DANGER] Initiating repository deletion...', 'warning');
  addSystemLog(`[TARGET] Repository: ${repoName}`, 'info');
  addSystemLog('[WARNING] This action cannot be undone!', 'warning');
  showProgress();
  updateProgress(50, 'Deleting repository...');
  
  try {
    await deleteRepository(repoName);
    addSystemLog(`[SUCCESS] Repository "${repoName}" has been deleted!`, 'success');
    updateProgress(100, 'Complete!');
    setTimeout(() => hideProgress(), 1500);
  } catch (err) {
    addSystemLog(`[ERROR] Deletion failed: ${err.message}`, 'error');
    hideProgress();
  }
}

// =============== UPLOAD FUNCTIONS ===============
function setupUploadHandlers() {
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');
  const selectBtn = document.getElementById('selectFilesBtn');
  const startBtn = document.getElementById('startUploadBtn');
  
  if (!uploadArea) return;
  
  uploadArea.onclick = () => fileInput.click();
  if (selectBtn) selectBtn.onclick = (e) => { e.stopPropagation(); fileInput.click(); };
  
  fileInput.onchange = async (e) => {
    const files = Array.from(e.target.files);
    for (const f of files) {
      pendingFiles.push(f);
    }
    updateFileList();
  };
  
  uploadArea.ondragover = (e) => { 
    e.preventDefault(); 
    uploadArea.style.borderColor = '#7c3aed'; 
  };
  
  uploadArea.ondragleave = () => { 
    uploadArea.style.borderColor = '#252530'; 
  };
  
  uploadArea.ondrop = async (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#252530';
    const items = e.dataTransfer.items;
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry();
      if (entry) await traverseFileTree(entry, pendingFiles);
    }
    updateFileList();
  };
  
  if (startBtn) startBtn.onclick = startUpload;
}

async function traverseFileTree(entry, files, path = '') {
  if (entry.isFile) {
    return new Promise(resolve => {
      entry.file(file => {
        if (path) Object.defineProperty(file, 'webkitRelativePath', { value: path + '/' + file.name });
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

function updateFileList() {
  const fileListDiv = document.getElementById('fileList');
  if (!fileListDiv) return;
  
  if (pendingFiles.length === 0) {
    fileListDiv.style.display = 'none';
    return;
  }
  
  fileListDiv.style.display = 'block';
  let html = `<strong>${pendingFiles.length} files selected:</strong><br>`;
  pendingFiles.slice(0, 15).forEach(f => {
    const path = f.webkitRelativePath || f.name;
    html += `📄 ${escapeHtml(path.substring(0, 50))}<br>`;
  });
  if (pendingFiles.length > 15) html += `... and ${pendingFiles.length - 15} more`;
  fileListDiv.innerHTML = html;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
  });
}

async function uploadSingleFile(repo, filePath, content, msg) {
  return await githubRequest(`/repos/${gitUsername}/${repo}/contents/${encodeURIComponent(filePath)}`, 'PUT', {
    message: msg, content: content, branch: "main"
  });
}

async function startUpload() {
  const repo = document.getElementById('targetRepoName').value.trim();
  const msg = document.getElementById('commitMsg').value.trim() || "Upload via RepoFlow";
  
  if (!repo) {
    addSystemLog('[ERROR] Target repository required!', 'error');
    return;
  }
  if (pendingFiles.length === 0) {
    addSystemLog('[ERROR] No files selected!', 'error');
    return;
  }
  
  showTerminal();
  addSystemLog('[UPLOAD] Starting upload sequence...', 'info');
  addSystemLog(`[TARGET] ${gitUsername}/${repo}`, 'info');
  addSystemLog(`[FILES] Total: ${pendingFiles.length} files`, 'info');
  showProgress();
  
  let success = 0, error = 0;
  
  for (let i = 0; i < pendingFiles.length; i++) {
    const file = pendingFiles[i];
    const filePath = file.webkitRelativePath || file.name;
    const percent = ((i / pendingFiles.length) * 100).toFixed(1);
    updateProgress(percent, `${i+1}/${pendingFiles.length} - ${filePath.substring(0, 40)}`);
    addSystemLog(`[UPLOAD] Sending: ${filePath} (${(file.size/1024).toFixed(1)} KB)`, 'info');
    
    try {
      const base64 = await fileToBase64(file);
      await uploadSingleFile(repo, filePath, base64, `${msg} (${i+1}/${pendingFiles.length})`);
      success++;
      addSystemLog(`[SUCCESS] Uploaded: ${filePath}`, 'success');
    } catch (err) {
      error++;
      addSystemLog(`[ERROR] Failed: ${filePath} - ${err.message}`, 'error');
    }
    await new Promise(r => setTimeout(r, 100));
  }
  
  updateProgress(100, 'Complete!');
  
  if (error === 0) {
    addSystemLog(`[SUCCESS] Upload completed! ${success} files uploaded to ${repo}`, 'success');
    uploadCount += success;
    commitCount++;
    document.getElementById('statUploads').textContent = uploadCount;
    document.getElementById('statCommits').textContent = commitCount;
    pendingFiles = [];
    updateFileList();
  } else {
    addSystemLog(`[WARNING] Upload completed with errors: ${success} success, ${error} failed`, 'warning');
  }
  
  setTimeout(() => {
    hideProgress();
    document.getElementById('targetRepoName').value = '';
    document.getElementById('commitMsg').value = '';
  }, 2000);
}

// =============== HELPER FUNCTIONS ===============
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// =============== DELETE REPO FROM LIST ===============
// Delete handler sudah ditambahkan di loadRepositories()