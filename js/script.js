// State management
let gitUsername = "";
let gitToken = "";
let isAuthenticated = false;

// DOM elements
let authCard, mainMenuDiv, authBtn, usernameInput, tokenInput;
let authStatusDiv, dynamicPanel;

// Initialize DOM elements after page load
document.addEventListener('DOMContentLoaded', () => {
  authCard = document.getElementById('authCard');
  mainMenuDiv = document.getElementById('mainMenu');
  authBtn = document.getElementById('authBtn');
  usernameInput = document.getElementById('githubUsername');
  tokenInput = document.getElementById('githubToken');
  authStatusDiv = document.getElementById('authStatus');
  dynamicPanel = document.getElementById('dynamicContent');

  // Set up event listeners
  if (authBtn) authBtn.addEventListener('click', authenticateAndVerify);
  
  const showCreateRepo = document.getElementById('showCreateRepo');
  const showDeleteRepo = document.getElementById('showDeleteRepo');
  const showUploadProyek = document.getElementById('showUploadProyek');
  const showListRepo = document.getElementById('showListRepo');
  
  if (showCreateRepo) showCreateRepo.addEventListener('click', () => renderCreateRepoUI());
  if (showDeleteRepo) showDeleteRepo.addEventListener('click', () => renderDeleteRepoUI());
  if (showUploadProyek) showUploadProyek.addEventListener('click', () => renderUploadProyekUI());
  if (showListRepo) showListRepo.addEventListener('click', () => renderListRepoUI());
});

// Helper functions
function showStatus(element, message, type = 'info') {
  if (!element) return;
  element.style.display = 'block';
  const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle');
  element.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
  element.className = `status-message status-${type}`;
  
  if (type !== 'loading') {
    setTimeout(() => {
      if (element.style.display !== 'none') {
        element.style.opacity = '0.9';
      }
    }, 5000);
  }
}

function hideStatus(element) {
  if (element) {
    element.style.display = 'none';
    element.innerHTML = '';
  }
}

// GitHub API wrapper
async function githubRequest(endpoint, method = 'GET', body = null) {
  const url = endpoint.startsWith('https') ? endpoint : `https://api.github.com${endpoint}`;
  const headers = {
    'Authorization': `Basic ${btoa(gitUsername + ':' + gitToken)}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };
  
  const options = { method, headers };
  if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  
  if (!response.ok && response.status !== 204) {
    let errorText = '';
    try {
      const errJson = await response.json();
      errorText = errJson.message || JSON.stringify(errJson);
    } catch(e) {
      errorText = response.statusText;
    }
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return { success: true };
  }
  
  return await response.json();
}

// Authentication
async function authenticateAndVerify() {
  const user = usernameInput.value.trim();
  const token = tokenInput.value.trim();
  
  if (!user || !token) {
    showStatus(authStatusDiv, 'Username dan Token tidak boleh kosong!', 'error');
    return false;
  }

  authBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Memeriksa...';
  authBtn.disabled = true;

  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Basic ${btoa(user + ':' + token)}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      let errorMsg = 'Token tidak valid atau expired';
      if (response.status === 401) errorMsg = 'Autentikasi gagal: Periksa username / token';
      else if (response.status === 403) errorMsg = 'Token tidak memiliki akses yang cukup';
      throw new Error(errorMsg);
    }
    
    const data = await response.json();
    if (data.login.toLowerCase() !== user.toLowerCase()) {
      throw new Error(`Username token (${data.login}) tidak cocok dengan username yang dimasukkan.`);
    }
    
    gitUsername = user;
    gitToken = token;
    isAuthenticated = true;
    
    showStatus(authStatusDiv, `✅ Berhasil login sebagai ${gitUsername}`, 'success');
    
    // Show main menu
    authCard.style.display = 'none';
    mainMenuDiv.style.display = 'block';
    
    dynamicPanel.innerHTML = `
      <div class="empty-state">
        <i class="fab fa-github"></i>
        <p>Halo <strong>${gitUsername}</strong>, pilih menu untuk mengelola repository.</p>
        <div class="repo-badge" style="display: inline-block; margin-top: 10px;">✨ siap beraksi ✨</div>
      </div>
    `;
    return true;
    
  } catch (err) {
    showStatus(authStatusDiv, `❌ Gagal: ${err.message}`, 'error');
    return false;
  } finally {
    authBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verifikasi & Simpan';
    authBtn.disabled = false;
  }
}

// 1. Create Repository
async function createRepository(repoName, description = '', isPrivate = false) {
  if (!repoName) throw new Error('Nama repository tidak boleh kosong');
  const body = { 
    name: repoName, 
    description: description,
    private: isPrivate,
    auto_init: false 
  };
  return await githubRequest('/user/repos', 'POST', body);
}

// 2. Delete Repository
async function deleteRepository(repoName) {
  if (!repoName) throw new Error('Nama repository tidak boleh kosong');
  await githubRequest(`/repos/${gitUsername}/${repoName}`, 'DELETE');
  return { deleted: true };
}

// 3. List Repositories
async function listRepositories(page = 1, perPage = 30) {
  return await githubRequest(`/user/repos?page=${page}&per_page=${perPage}&sort=updated`, 'GET');
}

// 4. Upload single file
async function uploadSingleFile(repoName, filePath, contentBase64, commitMessage) {
  const url = `/repos/${gitUsername}/${repoName}/contents/${encodeURIComponent(filePath)}`;
  const body = {
    message: commitMessage || `Upload ${filePath}`,
    content: contentBase64,
    branch: "main"
  };
  return await githubRequest(url, 'PUT', body);
}

// Helper: File to Base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      let base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

// UI: Create Repository
function renderCreateRepoUI() {
  dynamicPanel.innerHTML = `
    <div class="action-title"><i class="fas fa-plus-square"></i> Buat Repository Baru</div>
    <div class="flex-form">
      <div class="input-group">
        <label>Nama Repository *</label>
        <input type="text" id="newRepoName" placeholder="contoh: my-awesome-project">
      </div>
      <div class="input-group">
        <label>Deskripsi (Opsional)</label>
        <textarea id="repoDesc" rows="2" placeholder="Deskripsi singkat tentang repository ini"></textarea>
      </div>
      <div class="input-group">
        <label>
          <input type="checkbox" id="repoPrivate"> Private Repository
        </label>
      </div>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <button id="confirmCreateRepo" class="btn btn-primary"><i class="fas fa-check"></i> Buat Sekarang</button>
        <button id="cancelAction" class="btn btn-outline">Batal</button>
      </div>
      <div id="createStatus" class="status-message" style="display: none;"></div>
    </div>
  `;
  
  document.getElementById('confirmCreateRepo')?.addEventListener('click', async () => {
    const repoName = document.getElementById('newRepoName')?.value.trim();
    const desc = document.getElementById('repoDesc')?.value.trim() || "";
    const isPrivate = document.getElementById('repoPrivate')?.checked || false;
    const statusDiv = document.getElementById('createStatus');
    
    if (!repoName) {
      showStatus(statusDiv, 'Nama repository harus diisi!', 'error');
      return;
    }
    
    showStatus(statusDiv, '<i class="fas fa-spinner fa-pulse"></i> Membuat repository...', 'info');
    try {
      const result = await createRepository(repoName, desc, isPrivate);
      showStatus(statusDiv, `✅ Repository "${repoName}" berhasil dibuat!`, 'success');
      setTimeout(() => renderCreateRepoUI(), 2000);
    } catch (err) {
      showStatus(statusDiv, `❌ Gagal: ${err.message}`, 'error');
    }
  });
  
  document.getElementById('cancelAction')?.addEventListener('click', () => {
    dynamicPanel.innerHTML = `<div class="empty-state"><i class="fas fa-arrow-left"></i><p>Aksi dibatalkan, pilih menu lain.</p></div>`;
  });
}

// UI: Delete Repository
function renderDeleteRepoUI() {
  dynamicPanel.innerHTML = `
    <div class="action-title"><i class="fas fa-trash"></i> Hapus Repository</div>
    <div class="flex-form">
      <div class="input-group">
        <label>Nama Repository yang akan dihapus (PERMANEN)</label>
        <input type="text" id="deleteRepoName" placeholder="contoh: repo-lama">
      </div>
      <div class="input-group">
        <label>Ketik nama repository untuk konfirmasi</label>
        <input type="text" id="confirmDeleteName" placeholder="masukkan nama repository">
      </div>
      <div style="display: flex; gap: 1rem;">
        <button id="confirmDeleteRepo" class="btn btn-danger"><i class="fas fa-exclamation-triangle"></i> Hapus Permanen</button>
        <button id="cancelActionDel" class="btn btn-outline">Batal</button>
      </div>
      <div id="deleteStatus" class="status-message" style="display: none;"></div>
    </div>
  `;
  
  document.getElementById('confirmDeleteRepo')?.addEventListener('click', async () => {
    const repoName = document.getElementById('deleteRepoName')?.value.trim();
    const confirmName = document.getElementById('confirmDeleteName')?.value.trim();
    const statusDiv = document.getElementById('deleteStatus');
    
    if (!repoName || confirmName !== repoName) {
      showStatus(statusDiv, 'Nama repository tidak cocok atau kosong. Ulangi konfirmasi.', 'error');
      return;
    }
    
    showStatus(statusDiv, '<i class="fas fa-spinner fa-pulse"></i> Menghapus repository...', 'info');
    try {
      await deleteRepository(repoName);
      showStatus(statusDiv, `✅ Repository "${repoName}" berhasil dihapus.`, 'success');
      setTimeout(() => renderDeleteRepoUI(), 2000);
    } catch (err) {
      showStatus(statusDiv, `❌ Gagal hapus: ${err.message}`, 'error');
    }
  });
  
  document.getElementById('cancelActionDel')?.addEventListener('click', () => {
    dynamicPanel.innerHTML = `<div class="empty-state"><p>Hapus dibatalkan.</p></div>`;
  });
}

// UI: Upload Project
function renderUploadProyekUI() {
  dynamicPanel.innerHTML = `
    <div class="action-title"><i class="fas fa-cloud-upload-alt"></i> Upload Proyek ke GitHub</div>
    <div class="flex-form">
      <div class="input-group">
        <label>Nama Repository Tujuan</label>
        <input type="text" id="targetRepoName" placeholder="repository-yang-sudah-ada">
      </div>
      <div class="input-group">
        <label>Pilih file proyek (bisa multiple file)</label>
        <input type="file" id="projectFiles" multiple accept="*/*">
        <small class="input-help">File akan diupload ke root repository (branch main)</small>
      </div>
      <div class="input-group">
        <label>Pesan Commit (opsional)</label>
        <input type="text" id="commitMsg" placeholder="Upload proyek via GitHub Manager">
      </div>
      <button id="startUploadFiles" class="btn btn-primary"><i class="fas fa-upload"></i> Upload File Sekarang</button>
      <div id="uploadStatus" class="status-message" style="display: none;"></div>
      <button id="cancelUploadBtn" class="btn btn-outline">Kembali</button>
    </div>
  `;
  
  document.getElementById('startUploadFiles')?.addEventListener('click', async () => {
    const repo = document.getElementById('targetRepoName')?.value.trim();
    const filesInput = document.getElementById('projectFiles');
    const commitMsgInput = document.getElementById('commitMsg')?.value.trim() || "Upload proyek via web manager";
    const statusDiv = document.getElementById('uploadStatus');
    
    if (!repo) {
      showStatus(statusDiv, 'Masukkan nama repository tujuan!', 'error');
      return;
    }
    if (!filesInput.files || filesInput.files.length === 0) {
      showStatus(statusDiv, 'Pilih minimal satu file untuk diupload.', 'error');
      return;
    }
    
    showStatus(statusDiv, `<i class="fas fa-spinner fa-pulse"></i> Mengupload ${filesInput.files.length} file...`, 'info');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < filesInput.files.length; i++) {
      const file = filesInput.files[i];
      try {
        const base64Content = await fileToBase64(file);
        const remotePath = file.name;
        await uploadSingleFile(repo, remotePath, base64Content, commitMsgInput);
        successCount++;
        statusDiv.innerHTML = `<i class="fas fa-spinner fa-pulse"></i> Upload: ${successCount}/${filesInput.files.length} berhasil...`;
      } catch (err) {
        errorCount++;
        console.error(err);
        statusDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Gagal ${file.name}: ${err.message}`;
        await new Promise(r => setTimeout(r, 500));
      }
    }
    
    if (errorCount === 0) {
      showStatus(statusDiv, `✅ Semua ${successCount} file berhasil diupload ke repository ${repo}!`, 'success');
    } else {
      showStatus(statusDiv, `⚠️ ${successCount} berhasil, ${errorCount} gagal. Cek kembali.`, 'error');
    }
  });
  
  document.getElementById('cancelUploadBtn')?.addEventListener('click', () => {
    dynamicPanel.innerHTML = `<div class="empty-state"><i class="fas fa-times-circle"></i><p>Upload dibatalkan.</p></div>`;
  });
}

// UI: List Repositories
async function renderListRepoUI() {
  dynamicPanel.innerHTML = `
    <div class="action-title"><i class="fas fa-list"></i> Daftar Repository</div>
    <div id="repoListContainer">
      <div style="text-align: center; padding: 2rem;">
        <i class="fas fa-spinner fa-pulse"></i> Memuat daftar repository...
      </div>
    </div>
    <div style="margin-top: 1rem;">
      <button id="refreshRepoList" class="btn btn-outline"><i class="fas fa-sync-alt"></i> Refresh</button>
      <button id="backToListMenu" class="btn btn-outline">Kembali</button>
    </div>
  `;
  
  async function loadRepos() {
    const container = document.getElementById('repoListContainer');
    if (!container) return;
    
    try {
      const repos = await listRepositories(1, 50);
      if (!repos || repos.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><p>Tidak ada repository ditemukan.</p></div>`;
        return;
      }
      
      container.innerHTML = `
        <div class="repo-list">
          ${repos.map(repo => `
            <div class="repo-item">
              <div class="repo-info">
                <h4><i class="fas fa-book"></i> ${repo.name}</h4>
                <p>${repo.description || 'Tidak ada deskripsi'}</p>
                <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
                  <span class="repo-badge"><i class="fas fa-code-branch"></i> ${repo.default_branch}</span>
                  <span class="repo-badge"><i class="fas ${repo.private ? 'fa-lock' : 'fa-globe'}"></i> ${repo.private ? 'Private' : 'Public'}</span>
                  <span class="repo-badge"><i class="fas fa-star"></i> ${repo.stargazers_count}</span>
                </div>
              </div>
              <div>
                <a href="${repo.html_url}" target="_blank" class="btn btn-outline" style="padding: 6px 12px; font-size: 0.8rem;">
                  <i class="fab fa-github"></i> Buka
                </a>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="status-message status-error"><i class="fas fa-exclamation-triangle"></i> Gagal memuat: ${err.message}</div>`;
    }
  }
  
  await loadRepos();
  
  document.getElementById('refreshRepoList')?.addEventListener('click', loadRepos);
  document.getElementById('backToListMenu')?.addEventListener('click', () => {
    dynamicPanel.innerHTML = `<div class="empty-state"><i class="fas fa-arrow-left"></i><p>Kembali ke menu utama.</p></div>`;
  });
}