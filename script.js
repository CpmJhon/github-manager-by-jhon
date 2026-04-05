// ========================================
// REPOFLOW - GITHUB MANAGER WITH 2 MODE UPLOAD
// Mode 1: Multiple Files Upload
// Mode 2: Archive Upload (ZIP) + Auto Extract
// Mempertahankan semua fungsionalitas original
// ========================================

// =============== STATE MANAGEMENT ===============
let gitUsername = "";
let gitToken = "";
let isAuthenticated = false;
let pendingFiles = [];
let extractedFiles = [];
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
      if (window.innerWidth <= 768) sidebar.classList.remove('open');
    });
  });
  
  // Menu Toggle
  if (menuToggle) {
    menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  }
  
  // Quick action buttons
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      if (page) navigateTo(page);
    });
  });
  
  // Mode Tabs untuk Upload
  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.mode;
      document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('mode1Container').style.display = mode === 'mode1' ? 'block' : 'none';
      document.getElementById('mode2Container').style.display = mode === 'mode2' ? 'block' : 'none';
    });
  });
  
  // FAQ Toggle
  document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
      const faqItem = question.parentElement;
      faqItem.classList.toggle('active');
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
  
  // Delete repo button
  document.getElementById('confirmDeleteRepoBtn')?.addEventListener('click', executeDeleteFromPage);
  
  // Setup Mode 1 Upload Handlers
  setupMode1UploadHandlers();
  
  // Setup Mode 2 Upload Handlers
  setupMode2UploadHandlers();
  
  // Refresh repos button
  const refreshBtn = document.getElementById('refreshReposBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      if (isAuthenticated) {
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Refreshing...';
        await loadRepositories();
        setTimeout(() => {
          refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Repositories';
        }, 1000);
      }
    });
  }
  
  // Close terminal
  document.getElementById('closeTerminalBtn')?.addEventListener('click', () => {
    terminalContainer.style.display = 'none';
  });
});

// =============== NAVIGATION ===============
function navigateTo(page) {
  currentPage = page;
  
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.page === page) item.classList.add('active');
  });
  
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  
  const pageMap = {
    home: 'homePage', dashboard: 'dashboardPage', create: 'createPage',
    delete: 'deletePage', upload: 'uploadPage', repos: 'reposPage'
  };
  
  const pageId = pageMap[page];
  if (pageId) document.getElementById(pageId).style.display = 'block';
  
  if (page === 'repos' && isAuthenticated) loadRepositories();
  if (page === 'dashboard' && isAuthenticated) updateDashboard();
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
  
  activityLog.unshift({ message, type, time: new Date() });
  if (activityLog.length > 20) activityLog.pop();
  updateDashboard();
  
  const cursorLine = terminalBody.querySelector('.cursor-line');
  if (cursorLine) { cursorLine.remove(); terminalBody.appendChild(cursorLine); }
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

function showProgress() { if (progressWrapper) progressWrapper.style.display = 'block'; }
function hideProgress() { if (progressWrapper) progressWrapper.style.display = 'none'; updateProgress(0, 'Idle'); }

function updateDashboard() {
  const activityList = document.getElementById('activityList');
  if (activityList) {
    if (activityLog.length === 0) activityList.innerHTML = '<div class="activity-item">Belum ada aktivitas</div>';
    else {
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
    
    document.getElementById('loginCard').style.display = 'none';
    pagesContainer.style.display = 'block';
    document.getElementById('userName').textContent = gitUsername;
    document.getElementById('showLoginBtn').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'flex';
    document.querySelector('.status-indicator').classList.add('connected');
    document.querySelector('.status-indicator span').textContent = 'Connected';
    
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
  extractedFiles = [];
  
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

// =============== CREATE REPOSITORY ===============
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
    
    document.getElementById('newRepoName').value = '';
    document.getElementById('repoDesc').value = '';
    document.getElementById('repoPrivate').checked = false;
    
    await loadRepositories();
    updateProgress(100, 'Complete!');
    setTimeout(() => hideProgress(), 1500);
  } catch (err) {
    addSystemLog(`[ERROR] Failed: ${err.message}`, 'error');
    hideProgress();
  }
}

// =============== DELETE REPOSITORY ===============
async function deleteRepository(repoName) {
  return await githubRequest(`/repos/${gitUsername}/${repoName}`, 'DELETE');
}

async function executeDeleteFromPage() {
  const repoName = document.getElementById('deleteRepoName').value.trim();
  const confirmName = document.getElementById('confirmDeleteName').value.trim();
  
  if (!repoName) { addSystemLog('[ERROR] Repository name required!', 'error'); return; }
  if (repoName !== confirmName) { addSystemLog('[ERROR] Repository name confirmation mismatch!', 'error'); return; }
  
  await executeDeleteRepo(repoName);
  document.getElementById('deleteRepoName').value = '';
  document.getElementById('confirmDeleteName').value = '';
}

async function executeDeleteRepo(repoName) {
  showTerminal();
  addSystemLog('[DANGER] Initiating repository deletion sequence...', 'warning');
  addSystemLog(`[TARGET] Repository: ${repoName}`, 'info');
  addSystemLog('[WARNING] This action cannot be undone!', 'warning');
  showProgress();
  updateProgress(50, 'Deleting repository...');
  await new Promise(r => setTimeout(r, 500));
  
  try {
    await deleteRepository(repoName);
    addSystemLog(`[SUCCESS] Repository "${repoName}" has been permanently deleted!`, 'success');
    updateProgress(100, 'Complete!');
    await loadRepositories();
    const statRepos = document.getElementById('statRepos');
    if (statRepos) {
      const currentCount = parseInt(statRepos.textContent) || 0;
      statRepos.textContent = Math.max(0, currentCount - 1);
    }
    setTimeout(() => hideProgress(), 1500);
  } catch (err) {
    addSystemLog(`[ERROR] Deletion failed: ${err.message}`, 'error');
    hideProgress();
  }
}

// =============== LOAD REPOSITORIES ===============
async function loadRepositories() {
  if (!isAuthenticated) return;
  
  const container = document.getElementById('repoListContainer');
  if (!container) return;
  
  container.innerHTML = '<div style="text-align:center; padding:40px;"><i class="fas fa-spinner fa-pulse"></i> Loading repositories...</div>';
  
  try {
    const repos = await githubRequest('/user/repos?per_page=50&sort=updated', 'GET');
    
    if (repos.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding:40px;">No repositories found</div>';
      document.getElementById('statRepos').textContent = '0';
      return;
    }
    
    document.getElementById('statRepos').textContent = repos.length;
    
    container.innerHTML = repos.map(repo => `
      <div class="repo-card">
        <div class="repo-name"><i class="fas fa-book"></i> ${escapeHtml(repo.name)}</div>
        <div class="repo-desc">${escapeHtml(repo.description || 'No description')}</div>
        <div class="repo-meta">
          <span>${repo.private ? '🔒 Private' : '🌍 Public'}</span>
          <span>⭐ ${repo.stargazers_count}</span>
          <span>🍴 ${repo.forks_count}</span>
          <span>📅 ${new Date(repo.updated_at).toLocaleDateString()}</span>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 12px;">
          <a href="${repo.html_url}" target="_blank" class="repo-link" style="flex: 1; text-align: center;"><i class="fab fa-github"></i> Open</a>
          <button class="btn-outline-small delete-repo-btn" data-repo="${repo.name}" style="flex: 1;"><i class="fas fa-trash-alt"></i> Delete</button>
        </div>
      </div>
    `).join('');
    
    document.querySelectorAll('.delete-repo-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const repoName = btn.dataset.repo;
        if (confirm(`⚠️ PERINGATAN! Hapus repository "${repoName}" secara permanen?\nTindakan ini TIDAK DAPAT DIBATALKAN!`)) {
          await executeDeleteRepo(repoName);
        }
      });
    });
    
  } catch (err) {
    container.innerHTML = `<div class="log-error" style="padding: 20px; text-align: center;">Error: ${err.message}</div>`;
  }
}

// =============== HELPER FUNCTIONS ===============
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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

// =============== MODE 1: MULTIPLE FILES UPLOAD ===============
function setupMode1UploadHandlers() {
  const uploadArea = document.getElementById('uploadArea1');
  const fileInput = document.getElementById('fileInput1');
  const selectBtn = document.getElementById('selectFilesBtn1');
  const startBtn = document.getElementById('startUploadBtn1');
  
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
  
  uploadArea.ondragover = (e) => { e.preventDefault(); uploadArea.style.borderColor = '#7c3aed'; };
  uploadArea.ondragleave = () => { uploadArea.style.borderColor = '#252530'; };
  uploadArea.ondrop = async (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#252530';
    const files = Array.from(e.dataTransfer.files);
    for (const f of files) {
      pendingFiles.push(f);
    }
    updateFileList();
  };
  
  if (startBtn) startBtn.onclick = startMode1Upload;
}

function updateFileList() {
  const fileListDiv = document.getElementById('fileList1');
  if (!fileListDiv) return;
  
  if (pendingFiles.length === 0) {
    fileListDiv.style.display = 'none';
    return;
  }
  
  fileListDiv.style.display = 'block';
  let html = `<strong>${pendingFiles.length} files selected:</strong><br>`;
  pendingFiles.forEach(f => {
    html += `📄 ${escapeHtml(f.name)} (${(f.size/1024).toFixed(1)} KB)<br>`;
  });
  fileListDiv.innerHTML = html;
}

async function startMode1Upload() {
  const repo = document.getElementById('targetRepoName1').value.trim();
  const msg = document.getElementById('commitMsg1').value.trim() || "Upload files via RepoFlow Mode 1";
  
  if (!repo) { addSystemLog('[ERROR] Target repository required!', 'error'); return; }
  if (pendingFiles.length === 0) { addSystemLog('[ERROR] No files selected!', 'error'); return; }
  
  showTerminal();
  addSystemLog('[UPLOAD MODE 1] Starting multiple files upload...', 'info');
  addSystemLog(`[TARGET] ${gitUsername}/${repo}`, 'info');
  addSystemLog(`[FILES] Total: ${pendingFiles.length} files`, 'info');
  showProgress();
  
  let success = 0, error = 0;
  
  for (let i = 0; i < pendingFiles.length; i++) {
    const file = pendingFiles[i];
    const filePath = file.name;
    const percent = ((i / pendingFiles.length) * 100).toFixed(1);
    updateProgress(percent, `${i+1}/${pendingFiles.length} - ${filePath}`);
    addSystemLog(`[UPLOAD] ${filePath} (${(file.size/1024).toFixed(1)} KB)`, 'info');
    
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
    addSystemLog(`[SUCCESS] Mode 1 completed! ${success} files uploaded to ${repo}`, 'success');
    uploadCount += success;
    commitCount++;
    document.getElementById('statUploads').textContent = uploadCount;
    document.getElementById('statCommits').textContent = commitCount;
    pendingFiles = [];
    updateFileList();
  } else {
    addSystemLog(`[WARNING] Mode 1 completed with errors: ${success} success, ${error} failed`, 'warning');
  }
  
  setTimeout(() => {
    hideProgress();
    document.getElementById('targetRepoName1').value = '';
    document.getElementById('commitMsg1').value = '';
  }, 2000);
}

// =============== MODE 2: ARCHIVE UPLOAD (ZIP) ===============
let archiveFile = null;

function setupMode2UploadHandlers() {
  const uploadArea = document.getElementById('uploadArea2');
  const fileInput = document.getElementById('fileInput2');
  const selectBtn = document.getElementById('selectFilesBtn2');
  const startBtn = document.getElementById('startUploadBtn2');
  
  if (!uploadArea) return;
  
  uploadArea.onclick = () => fileInput.click();
  if (selectBtn) selectBtn.onclick = (e) => { e.stopPropagation(); fileInput.click(); };
  
  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    archiveFile = file;
    await processArchiveFile(file);
  };
  
  uploadArea.ondragover = (e) => { e.preventDefault(); uploadArea.style.borderColor = '#7c3aed'; };
  uploadArea.ondragleave = () => { uploadArea.style.borderColor = '#252530'; };
  uploadArea.ondrop = async (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#252530';
    const file = e.dataTransfer.files[0];
    if (file) {
      archiveFile = file;
      await processArchiveFile(file);
    }
  };
  
  if (startBtn) startBtn.onclick = startMode2Upload;
}

async function processArchiveFile(file) {
  const previewDiv = document.getElementById('archivePreview');
  const archiveNameSpan = document.getElementById('archiveName');
  const archiveFileCountSpan = document.getElementById('archiveFileCount');
  const extractedPreviewDiv = document.getElementById('extractedPreview');
  const startBtn = document.getElementById('startUploadBtn2');
  
  if (archiveNameSpan) archiveNameSpan.textContent = file.name;
  
  addSystemLog(`[ARCHIVE] Processing ${file.name}...`, 'info');
  showProgress();
  updateProgress(30, `Extracting ${file.name}...`);
  
  try {
    extractedFiles = await extractArchive(file);
    if (archiveFileCountSpan) archiveFileCountSpan.textContent = `${extractedFiles.length} files`;
    
    if (previewDiv) previewDiv.style.display = 'block';
    if (startBtn) startBtn.style.display = 'flex';
    
    if (extractedPreviewDiv && extractedFiles.length > 0) {
      let html = '<div style="margin-top: 10px;"><strong>📄 Extracted files:</strong></div>';
      extractedFiles.slice(0, 20).forEach(f => {
        const path = f.webkitRelativePath || f.name;
        html += `<div style="font-size: 0.7rem; margin: 3px 0;">├─ ${escapeHtml(path)} (${(f.size/1024).toFixed(1)} KB)</div>`;
      });
      if (extractedFiles.length > 20) html += `<div>... and ${extractedFiles.length - 20} more files</div>`;
      extractedPreviewDiv.innerHTML = html;
    }
    
    addSystemLog(`[SUCCESS] Archive extracted: ${extractedFiles.length} files ready`, 'success');
    updateProgress(100, 'Extraction complete!');
    setTimeout(() => hideProgress(), 1000);
  } catch (err) {
    addSystemLog(`[ERROR] Archive extraction failed: ${err.message}`, 'error');
    hideProgress();
  }
}

async function extractArchive(file) {
  const fileName = file.name.toLowerCase();
  let files = [];
  
  try {
    if (fileName.endsWith('.zip')) {
      const zip = await JSZip.loadAsync(file);
      for (const [path, entry] of Object.entries(zip.files)) {
        if (!entry.dir) {
          const content = await entry.async('blob');
          const f = new File([content], path.split('/').pop(), { type: content.type });
          Object.defineProperty(f, 'webkitRelativePath', { value: path, writable: false });
          files.push(f);
        }
      }
    } else {
      throw new Error(`Format ${fileName.split('.').pop()} tidak didukung. Gunakan file ZIP.`);
    }
    return files;
  } catch (error) {
    throw new Error(`Extract failed: ${error.message}`);
  }
}

async function startMode2Upload() {
  const repo = document.getElementById('targetRepoName2').value.trim();
  const msg = document.getElementById('commitMsg2').value.trim() || "Upload archive via RepoFlow Mode 2";
  
  if (!repo) { addSystemLog('[ERROR] Target repository required!', 'error'); return; }
  if (extractedFiles.length === 0) { addSystemLog('[ERROR] No archive extracted! Upload ZIP file first.', 'error'); return; }
  
  showTerminal();
  addSystemLog('[UPLOAD MODE 2] Starting archive upload...', 'info');
  addSystemLog(`[TARGET] ${gitUsername}/${repo}`, 'info');
  addSystemLog(`[ARCHIVE] ${archiveFile?.name} -> ${extractedFiles.length} files`, 'info');
  showProgress();
  
  let success = 0, error = 0;
  
  for (let i = 0; i < extractedFiles.length; i++) {
    const file = extractedFiles[i];
    const filePath = file.webkitRelativePath || file.name;
    const percent = ((i / extractedFiles.length) * 100).toFixed(1);
    updateProgress(percent, `${i+1}/${extractedFiles.length} - ${filePath.substring(0, 40)}`);
    addSystemLog(`[UPLOAD] ${filePath} (${(file.size/1024).toFixed(1)} KB)`, 'info');
    
    try {
      const base64 = await fileToBase64(file);
      await uploadSingleFile(repo, filePath, base64, `${msg} - ${archiveFile?.name} (${i+1}/${extractedFiles.length})`);
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
    addSystemLog(`[SUCCESS] Mode 2 completed! ${success} files from archive uploaded to ${repo}`, 'success');
    uploadCount += success;
    commitCount++;
    document.getElementById('statUploads').textContent = uploadCount;
    document.getElementById('statCommits').textContent = commitCount;
    extractedFiles = [];
    archiveFile = null;
    document.getElementById('archivePreview').style.display = 'none';
    document.getElementById('startUploadBtn2').style.display = 'none';
  } else {
    addSystemLog(`[WARNING] Mode 2 completed with errors: ${success} success, ${error} failed`, 'warning');
  }
  
  setTimeout(() => {
    hideProgress();
    document.getElementById('targetRepoName2').value = '';
    document.getElementById('commitMsg2').value = '';
  }, 2000);
}