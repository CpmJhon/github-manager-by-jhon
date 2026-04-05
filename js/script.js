// ========================================
// REPOFLOW - GITHUB MANAGER WITH 2 MODE UPLOAD
// Mode 1: Multiple Files Upload
// Mode 2: Archive Upload (ZIP) + Auto Extract
// Mempertahankan semua fungsionalitas original
// FIXED: View Repositories & Refresh Button
// FIXED: Delete Repository & Immediate Refresh
// ADDED: Typing effect for terminal cursor
// ADDED: RepoFlow By JHON PRODUCTION text
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
let isLoadingRepos = false;
let isTypingActive = false;
let typingTimeout = null;

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
      const mode1Container = document.getElementById('mode1Container');
      const mode2Container = document.getElementById('mode2Container');
      if (mode1Container) mode1Container.style.display = mode === 'mode1' ? 'block' : 'none';
      if (mode2Container) mode2Container.style.display = mode === 'mode2' ? 'block' : 'none';
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
  const showLoginBtn = document.getElementById('showLoginBtn');
  if (showLoginBtn) {
    showLoginBtn.addEventListener('click', () => {
      const loginCard = document.getElementById('loginCard');
      if (loginCard) loginCard.style.display = 'flex';
    });
  }
  
  // Auth button
  const authBtn = document.getElementById('authBtn');
  if (authBtn) authBtn.addEventListener('click', authenticateAndVerify);
  
  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
  
  // Create repo button
  const createRepoBtn = document.getElementById('confirmCreateRepo');
  if (createRepoBtn) createRepoBtn.addEventListener('click', executeCreateRepo);
  
  // Delete repo button
  const deleteRepoBtn = document.getElementById('confirmDeleteRepoBtn');
  if (deleteRepoBtn) deleteRepoBtn.addEventListener('click', executeDeleteFromPage);
  
  // Setup Mode 1 Upload Handlers
  setupMode1UploadHandlers();
  
  // Setup Mode 2 Upload Handlers
  setupMode2UploadHandlers();
  
  // =============== FIXED: Refresh repos button ===============
  const refreshBtn = document.getElementById('refreshReposBtn');
  if (refreshBtn) {
    const newRefreshBtn = refreshBtn.cloneNode(true);
    refreshBtn.parentNode.replaceChild(newRefreshBtn, refreshBtn);
    
    newRefreshBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!isAuthenticated) {
        addSystemLog('[WARNING] Please login first to view repositories', 'warning');
        return;
      }
      
      if (isLoadingRepos) {
        addSystemLog('[INFO] Already loading repositories, please wait...', 'info');
        return;
      }
      
      const originalHtml = newRefreshBtn.innerHTML;
      newRefreshBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Refreshing...';
      newRefreshBtn.disabled = true;
      
      addSystemLog('[SYSTEM] Manually refreshing repository list...', 'info');
      await loadRepositories(true);
      
      setTimeout(() => {
        newRefreshBtn.innerHTML = originalHtml;
        newRefreshBtn.disabled = false;
        addSystemLog('[SYSTEM] Repository refresh complete', 'success');
      }, 500);
    });
  }
  
  // Close terminal
  const closeTerminalBtn = document.getElementById('closeTerminalBtn');
  if (closeTerminalBtn) {
    closeTerminalBtn.addEventListener('click', () => {
      if (terminalContainer) terminalContainer.style.display = 'none';
      if (typingTimeout) clearTimeout(typingTimeout);
      isTypingActive = false;
    });
  }
  
  // Start typing effect for terminal welcome
  setTimeout(() => {
    if (terminalBody && terminalBody.children.length === 0) {
      startTerminalWelcomeTyping();
    }
  }, 500);
});

// =============== TYPING EFFECT FOR TERMINAL ===============
function startTerminalWelcomeTyping() {
  if (!terminalBody) return;
  if (isTypingActive) return;
  
  isTypingActive = true;
  
  const welcomeTexts = [
    "> ╔══════════════════════════════════════════════════════════════╗",
    "> ║                                                              ║",
    "> ║     ██████╗ ███████╗██████╗  ██████╗ ███████╗██╗      ██████╗██╗    ║",
    "> ║     ██╔══██╗██╔════╝██╔══██╗██╔═══██╗██╔════╝██║     ██╔════╝██║    ║",
    "> ║     ██████╔╝█████╗  ██████╔╝██║   ██║█████╗  ██║     ██║     ██║    ║",
    "> ║     ██╔══██╗██╔══╝  ██╔═══╝ ██║   ██║██╔══╝  ██║     ██║     ██║    ║",
    "> ║     ██║  ██║███████╗██║     ╚██████╔╝██║     ██║     ╚██████╗██║    ║",
    "> ║     ╚═╝  ╚═╝╚══════╝╚═╝      ╚═════╝ ╚═╝     ╚═╝      ╚═════╝╚═╝    ║",
    "> ║                                                              ║",
    "> ║           ██████╗ ██████╗  ██████╗ ██████╗ ██╗   ██╗ ██████╗████████╗██╗ ██████╗ ███╗   ██╗    ║",
    "> ║          ██╔══██╗██╔══██╗██╔═══██╗██╔══██╗██║   ██║██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║    ║",
    "> ║          ██████╔╝██████╔╝██║   ██║██║  ██║██║   ██║██║        ██║   ██║██║   ██║██╔██╗ ██║    ║",
    "> ║          ██╔═══╝ ██╔══██╗██║   ██║██║  ██║██║   ██║██║        ██║   ██║██║   ██║██║╚██╗██║    ║",
    "> ║          ██║     ██║  ██║╚██████╔╝██████╔╝╚██████╔╝╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║    ║",
    "> ║          ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═════╝  ╚═════╝  ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝    ║",
    "> ║                                                              ║",
    "> ╚══════════════════════════════════════════════════════════════╝",
    "> ",
    "> [SYSTEM] RepoFlow Terminal v2.0",
    "> [SYSTEM] Live terminal ready",
    "> [SYSTEM] 2 Mode Upload Available",
    "> [SYSTEM] Mode 1: Multiple Files | Mode 2: ZIP Archive",
    "> [SYSTEM] Created by: JHON PRODUCTION",
    "> [SYSTEM] Waiting for operations..."
  ];
  
  terminalBody.innerHTML = '';
  let lineIndex = 0;
  let charIndex = 0;
  let currentLine = "";
  
  function typeNextCharacter() {
    if (!isTypingActive) return;
    
    if (lineIndex >= welcomeTexts.length) {
      addCursorLine();
      isTypingActive = false;
      return;
    }
    
    if (charIndex === 0) {
      currentLine = welcomeTexts[lineIndex];
      const newLine = document.createElement('div');
      newLine.className = 'log-line log-info';
      newLine.id = `line-${lineIndex}`;
      terminalBody.appendChild(newLine);
    }
    
    if (charIndex < currentLine.length) {
      const lineElement = document.getElementById(`line-${lineIndex}`);
      if (lineElement) {
        lineElement.innerHTML = currentLine.substring(0, charIndex + 1);
      }
      charIndex++;
      typingTimeout = setTimeout(typeNextCharacter, 15 + Math.random() * 10);
    } else {
      lineIndex++;
      charIndex = 0;
      typingTimeout = setTimeout(typeNextCharacter, 50);
    }
    scrollTerminalToBottom();
  }
  
  typeNextCharacter();
}

function addCursorLine() {
  if (!terminalBody) return;
  
  const cursorLine = document.createElement('div');
  cursorLine.className = 'cursor-line';
  cursorLine.innerHTML = '<span class="prompt">$</span> <span class="typing-text" id="typingText"></span><span class="blinking-cursor">_</span>';
  terminalBody.appendChild(cursorLine);
  
  startCommandTyping();
}

function startCommandTyping() {
  const commands = [
    "repoflow --status",
    "✓ System Online",
    "✓ GitHub API Connected",
    "✓ 2 Upload Modes Active",
    "repoflow --info",
    "© 2024 RepoFlow by JHON PRODUCTION",
    "All rights reserved"
  ];
  
  let cmdIndex = 0;
  let charIndex = 0;
  let currentCommand = "";
  const typingTextSpan = document.getElementById('typingText');
  
  function typeCommand() {
    if (!isTypingActive) return;
    
    if (cmdIndex >= commands.length) {
      if (typingTextSpan) {
        typingTextSpan.innerHTML = 'ready for operations...';
      }
      addWatermark();
      return;
    }
    
    if (charIndex === 0) {
      currentCommand = commands[cmdIndex];
    }
    
    if (charIndex < currentCommand.length) {
      if (typingTextSpan) {
        typingTextSpan.innerHTML += currentCommand[charIndex];
      }
      charIndex++;
      typingTimeout = setTimeout(typeCommand, 50 + Math.random() * 20);
    } else {
      cmdIndex++;
      charIndex = 0;
      if (typingTextSpan) {
        typingTimeout = setTimeout(() => {
          if (cmdIndex < commands.length) {
            typingTextSpan.innerHTML = '';
            typeCommand();
          } else {
            typingTextSpan.innerHTML = '';
            typeCommand();
          }
        }, 400);
      }
    }
    scrollTerminalToBottom();
  }
  
  typeCommand();
}

function addWatermark() {
  if (terminalContainer && !terminalContainer.querySelector('.terminal-watermark')) {
    const watermark = document.createElement('div');
    watermark.className = 'terminal-watermark';
    watermark.innerHTML = '⚡ RepoFlow by JHON PRODUCTION ⚡';
    terminalContainer.appendChild(watermark);
  }
}

function stopTypingEffect() {
  isTypingActive = false;
  if (typingTimeout) {
    clearTimeout(typingTimeout);
    typingTimeout = null;
  }
}

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
  if (pageId) {
    const pageElement = document.getElementById(pageId);
    if (pageElement) pageElement.style.display = 'block';
  }
  
  if (page === 'repos' && isAuthenticated) {
    loadRepositories();
  }
  if (page === 'dashboard' && isAuthenticated) updateDashboard();
}

// =============== TERMINAL FUNCTIONS ===============
function showTerminal() {
  if (terminalContainer) {
    terminalContainer.style.display = 'block';
    addWatermark();
  }
  scrollTerminalToBottom();
}

function addTerminalLog(message, type = 'info') {
  if (!terminalBody) return;
  
  stopTypingEffect();
  
  const logDiv = document.createElement('div');
  logDiv.className = `log-line log-${type}`;
  logDiv.innerHTML = message;
  terminalBody.appendChild(logDiv);
  scrollTerminalToBottom();
  
  activityLog.unshift({ message, type, time: new Date() });
  if (activityLog.length > 20) activityLog.pop();
  updateDashboard();
  
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
  if (terminalBody) terminalBody.scrollTop = terminalBody.scrollHeight;
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
  const user = document.getElementById('githubUsername')?.value.trim();
  const token = document.getElementById('githubToken')?.value.trim();
  
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
    
    const loginCard = document.getElementById('loginCard');
    if (loginCard) loginCard.style.display = 'none';
    if (pagesContainer) pagesContainer.style.display = 'block';
    
    const userNameSpan = document.getElementById('userName');
    if (userNameSpan) userNameSpan.textContent = gitUsername;
    
    const showLoginBtn = document.getElementById('showLoginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    if (showLoginBtn) showLoginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'flex';
    
    const connectionStatus = document.getElementById('connectionStatus');
    if (connectionStatus) {
      connectionStatus.classList.add('connected');
      const span = connectionStatus.querySelector('span');
      if (span) span.textContent = 'Connected';
    }
    
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
  if (statusDiv) {
    statusDiv.innerHTML = `<div class="log-${type}" style="color: ${type === 'error' ? '#ef4444' : '#10b981'}">${message}</div>`;
    setTimeout(() => { if (statusDiv) statusDiv.innerHTML = ''; }, 3000);
  }
}

function logout() {
  addSystemLog('[SYSTEM] Disconnecting from GitHub...', 'warning');
  gitUsername = "";
  gitToken = "";
  isAuthenticated = false;
  pendingFiles = [];
  extractedFiles = [];
  
  const loginCard = document.getElementById('loginCard');
  if (loginCard) loginCard.style.display = 'flex';
  if (pagesContainer) pagesContainer.style.display = 'none';
  if (terminalContainer) terminalContainer.style.display = 'none';
  
  const userNameSpan = document.getElementById('userName');
  if (userNameSpan) userNameSpan.textContent = 'Guest';
  
  const showLoginBtn = document.getElementById('showLoginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  if (showLoginBtn) showLoginBtn.style.display = 'flex';
  if (logoutBtn) logoutBtn.style.display = 'none';
  
  const connectionStatus = document.getElementById('connectionStatus');
  if (connectionStatus) {
    connectionStatus.classList.remove('connected');
    const span = connectionStatus.querySelector('span');
    if (span) span.textContent = 'Disconnected';
  }
  
  const usernameInput = document.getElementById('githubUsername');
  const tokenInput = document.getElementById('githubToken');
  if (usernameInput) usernameInput.value = '';
  if (tokenInput) tokenInput.value = '';
  
  stopTypingEffect();
}

// =============== CREATE REPOSITORY ===============
async function executeCreateRepo() {
  const name = document.getElementById('newRepoName')?.value.trim();
  const desc = document.getElementById('repoDesc')?.value || '';
  const isPrivate = document.getElementById('repoPrivate')?.checked || false;
  
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
    
    const newRepoName = document.getElementById('newRepoName');
    const repoDesc = document.getElementById('repoDesc');
    const repoPrivate = document.getElementById('repoPrivate');
    if (newRepoName) newRepoName.value = '';
    if (repoDesc) repoDesc.value = '';
    if (repoPrivate) repoPrivate.checked = false;
    
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
  const repoName = document.getElementById('deleteRepoName')?.value.trim();
  const confirmName = document.getElementById('confirmDeleteName')?.value.trim();
  
  if (!repoName) { addSystemLog('[ERROR] Repository name required!', 'error'); return; }
  if (repoName !== confirmName) { addSystemLog('[ERROR] Repository name confirmation mismatch!', 'error'); return; }
  
  await executeDeleteRepo(repoName);
  const deleteRepoName = document.getElementById('deleteRepoName');
  const confirmDeleteName = document.getElementById('confirmDeleteName');
  if (deleteRepoName) deleteRepoName.value = '';
  if (confirmDeleteName) confirmDeleteName.value = '';
}

async function executeDeleteRepo(repoName) {
  showTerminal();
  addSystemLog('[DANGER] Initiating repository deletion sequence...', 'warning');
  addSystemLog(`[TARGET] Repository: ${repoName}`, 'info');
  addSystemLog('[WARNING] This action cannot be undone!', 'warning');
  showProgress();
  updateProgress(50, 'Deleting repository...');
  
  try {
    await githubRequest(`/repos/${gitUsername}/${repoName}`, 'DELETE');
    addSystemLog(`[SUCCESS] Repository "${repoName}" has been permanently deleted!`, 'success');
    updateProgress(100, 'Complete!');
    
    hideProgress();
    addSystemLog('[SYSTEM] Waiting for GitHub to process deletion...', 'info');
    await new Promise(r => setTimeout(r, 500));
    addSystemLog('[SYSTEM] Refreshing repository list...', 'info');
    await loadRepositories(true);
    
    const deleteRepoNameInput = document.getElementById('deleteRepoName');
    if (deleteRepoNameInput) deleteRepoNameInput.value = '';
    const confirmDeleteNameInput = document.getElementById('confirmDeleteName');
    if (confirmDeleteNameInput) confirmDeleteNameInput.value = '';
    
    addSystemLog('[SYSTEM] Repository list updated successfully', 'success');
    
  } catch (err) {
    addSystemLog(`[ERROR] Deletion failed: ${err.message}`, 'error');
    hideProgress();
    
    if (err.message.includes('404') || err.message.includes('Not Found')) {
      addSystemLog('[INFO] Repository may already be deleted. Refreshing list...', 'warning');
      await loadRepositories(true);
    }
  }
}

// =============== LOAD REPOSITORIES ===============
async function loadRepositories(forceRefresh = false) {
  if (!isAuthenticated) {
    console.log('Not authenticated, cannot load repositories');
    return;
  }
  
  if (isLoadingRepos) {
    console.log('Already loading repositories');
    return;
  }
  
  const container = document.getElementById('repoListContainer');
  if (!container) {
    console.log('Repository container not found');
    return;
  }
  
  isLoadingRepos = true;
  
  container.innerHTML = `
    <div style="text-align:center; padding:60px 40px;">
      <div style="display: inline-block; width: 40px; height: 40px; border: 3px solid var(--border-color); border-top-color: var(--accent-cyan); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
      <p style="margin-top: 16px; color: var(--text-secondary);">Loading repositories...</p>
    </div>
  `;
  
  if (!document.querySelector('#spin-style')) {
    const style = document.createElement('style');
    style.id = 'spin-style';
    style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  }
  
  addSystemLog('[SYSTEM] Fetching repositories from GitHub...', 'info');
  
  try {
    let allRepos = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore && page <= 3) {
      const repos = await githubRequest(`/user/repos?per_page=50&page=${page}&sort=updated&direction=desc`, 'GET');
      if (repos && repos.length > 0) {
        allRepos = allRepos.concat(repos);
        page++;
        if (repos.length < 50) hasMore = false;
      } else {
        hasMore = false;
      }
    }
    
    if (!allRepos || allRepos.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:60px 40px;">
          <i class="fas fa-inbox" style="font-size: 48px; color: var(--text-secondary); margin-bottom: 16px; display: block;"></i>
          <p style="color: var(--text-secondary);">No repositories found</p>
          <button class="btn-outline" style="margin-top: 16px;" onclick="window.navigateTo('create')">
            <i class="fas fa-plus-circle"></i> Create your first repository
          </button>
        </div>
      `;
      addSystemLog('[SYSTEM] No repositories found', 'warning');
      return;
    }
    
    addSystemLog(`[SYSTEM] Loaded ${allRepos.length} repositories`, 'success');
    
    const repoNames = new Set();
    
    container.innerHTML = allRepos.map(repo => {
      if (repoNames.has(repo.name)) return '';
      repoNames.add(repo.name);
      
      return `
      <div class="repo-card" data-repo-name="${escapeHtml(repo.name)}" data-repo-id="${repo.id}">
        <div class="repo-name">
          <i class="fas fa-book"></i>
          <span>${escapeHtml(repo.name)}</span>
          ${repo.private ? '<span style="font-size: 0.6rem; background: rgba(0,212,255,0.2); padding: 2px 6px; border-radius: 10px;">Private</span>' : '<span style="font-size: 0.6rem; background: rgba(16,185,129,0.2); padding: 2px 6px; border-radius: 10px;">Public</span>'}
        </div>
        <div class="repo-desc">${escapeHtml(repo.description || 'No description provided')}</div>
        <div class="repo-meta">
          <span><i class="fas fa-star"></i> ${repo.stargazers_count}</span>
          <span><i class="fas fa-code-branch"></i> ${repo.forks_count}</span>
          <span><i class="fas fa-calendar-alt"></i> ${new Date(repo.updated_at).toLocaleDateString('id-ID')}</span>
          <span><i class="fas fa-database"></i> ${repo.size ? (repo.size/1024).toFixed(1) : 0} MB</span>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 12px;">
          <a href="${repo.html_url}" target="_blank" class="repo-link" style="flex: 1; text-align: center; padding: 6px; background: rgba(0,212,255,0.1); border-radius: 6px; text-decoration: none;">
            <i class="fab fa-github"></i> Open
          </a>
          <button class="delete-repo-btn" data-repo="${escapeHtml(repo.name)}" data-repo-id="${repo.id}" style="flex: 1; padding: 6px; background: rgba(239,68,68,0.1); border: none; border-radius: 6px; color: var(--accent-red); cursor: pointer;">
            <i class="fas fa-trash-alt"></i> Delete
          </button>
        </div>
      </div>
    `}).filter(html => html !== '').join('');
    
    const deleteButtons = container.querySelectorAll('.delete-repo-btn');
    deleteButtons.forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      
      newBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const repoName = newBtn.getAttribute('data-repo');
        if (repoName && confirm(`⚠️ PERINGATAN!\n\nHapus repository "${repoName}" secara permanen?\n\nTindakan ini TIDAK DAPAT DIBATALKAN!`)) {
          newBtn.disabled = true;
          newBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Deleting...';
          await executeDeleteRepo(repoName);
        }
      });
    });
    
  } catch (err) {
    console.error('Error loading repositories:', err);
    container.innerHTML = `
      <div style="text-align:center; padding:60px 40px;">
        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: var(--accent-red); margin-bottom: 16px; display: block;"></i>
        <p style="color: var(--accent-red);">Error loading repositories</p>
        <p style="color: var(--text-secondary); font-size: 0.8rem; margin-top: 8px;">${escapeHtml(err.message)}</p>
        <button class="btn-outline" style="margin-top: 16px;" onclick="window.loadRepositories(true)">
          <i class="fas fa-sync-alt"></i> Try Again
        </button>
      </div>
    `;
    addSystemLog(`[ERROR] Failed to load repositories: ${err.message}`, 'error');
  } finally {
    isLoadingRepos = false;
  }
}

window.loadRepositories = loadRepositories;
window.navigateTo = navigateTo;

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
  const encodedPath = filePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
  return await githubRequest(`/repos/${gitUsername}/${repo}/contents/${encodedPath}`, 'PUT', {
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
  
  uploadArea.onclick = () => fileInput?.click();
  if (selectBtn) selectBtn.onclick = (e) => { e.stopPropagation(); fileInput?.click(); };
  
  if (fileInput) {
    fileInput.onchange = async (e) => {
      const files = Array.from(e.target.files);
      for (const f of files) {
        pendingFiles.push(f);
      }
      updateFileList();
    };
  }
  
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
  const repo = document.getElementById('targetRepoName1')?.value.trim();
  const msg = document.getElementById('commitMsg1')?.value.trim() || "Upload files via RepoFlow Mode 1";
  
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
    updateProgress(percent, `${i+1}/${pendingFiles.length} - ${filePath.substring(0, 40)}`);
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
    pendingFiles = [];
    updateFileList();
  } else {
    addSystemLog(`[WARNING] Mode 1 completed with errors: ${success} success, ${error} failed`, 'warning');
  }
  
  setTimeout(() => {
    hideProgress();
    const targetRepo = document.getElementById('targetRepoName1');
    const commitMsg = document.getElementById('commitMsg1');
    if (targetRepo) targetRepo.value = '';
    if (commitMsg) commitMsg.value = '';
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
  
  uploadArea.onclick = () => fileInput?.click();
  if (selectBtn) selectBtn.onclick = (e) => { e.stopPropagation(); fileInput?.click(); };
  
  if (fileInput) {
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      archiveFile = file;
      await processArchiveFile(file);
    };
  }
  
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
  const repo = document.getElementById('targetRepoName2')?.value.trim();
  const msg = document.getElementById('commitMsg2')?.value.trim() || "Upload archive via RepoFlow Mode 2";
  
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
    extractedFiles = [];
    archiveFile = null;
    const archivePreview = document.getElementById('archivePreview');
    const startBtn = document.getElementById('startUploadBtn2');
    if (archivePreview) archivePreview.style.display = 'none';
    if (startBtn) startBtn.style.display = 'none';
  } else {
    addSystemLog(`[WARNING] Mode 2 completed with errors: ${success} success, ${error} failed`, 'warning');
  }
  
  setTimeout(() => {
    hideProgress();
    const targetRepo = document.getElementById('targetRepoName2');
    const commitMsg = document.getElementById('commitMsg2');
    if (targetRepo) targetRepo.value = '';
    if (commitMsg) commitMsg.value = '';
  }, 2000);
}

window.executeDeleteRepo = executeDeleteRepo;
window.loadRepositories = loadRepositories;
window.navigateTo = navigateTo;