// State management
let gitUsername = "";
let gitToken = "";
let isAuthenticated = false;
let pendingFiles = []; // For upload feature

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

// =============== UPLOAD PROYEK WITH ZIP EXTRACTION & PREVIEW ===============

// Process ZIP file and extract contents
async function processZipFile(zipFile) {
  const JSZip = window.JSZip;
  if (!JSZip) {
    console.error('JSZip not loaded');
    return [];
  }
  
  try {
    const zip = await JSZip.loadAsync(zipFile);
    const files = [];
    
    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      if (!zipEntry.dir) {
        const content = await zipEntry.async('blob');
        const file = new File([content], relativePath.split('/').pop(), {
          type: content.type,
          lastModified: zipEntry.date?.getTime() || Date.now()
        });
        
        // Preserve folder structure
        Object.defineProperty(file, 'webkitRelativePath', {
          value: relativePath,
          writable: false
        });
        
        files.push(file);
      }
    }
    
    return files;
  } catch (error) {
    console.error('Error extracting ZIP:', error);
    return [];
  }
}

// Traverse folder structure recursively
async function traverseFileTree(entry, files, path = '') {
  if (entry.isFile) {
    return new Promise((resolve) => {
      entry.file((file) => {
        // Preserve folder structure in the path
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
    return new Promise((resolve) => {
      reader.readEntries(async (entries) => {
        for (const childEntry of entries) {
          await traverseFileTree(childEntry, files, path ? `${path}/${entry.name}` : entry.name);
        }
        resolve();
      });
    });
  }
}

// Process selected files (handle ZIP extraction)
async function processSelectedFiles(files) {
  let allFiles = [];
  
  for (const file of files) {
    if (file.name.toLowerCase().endsWith('.zip')) {
      // Extract ZIP file
      const statusDiv = document.getElementById('uploadStatus');
      if (statusDiv) showStatus(statusDiv, `📦 Extracting ${file.name}...`, 'info');
      const extractedFiles = await processZipFile(file);
      allFiles.push(...extractedFiles);
      if (statusDiv) setTimeout(() => hideStatus(statusDiv), 2000);
    } else {
      allFiles.push(file);
    }
  }
  
  // Add to pending files
  pendingFiles.push(...allFiles);
  
  // Remove duplicates based on path
  const uniqueFiles = new Map();
  for (const file of pendingFiles) {
    const filePath = file.webkitRelativePath || file.name;
    uniqueFiles.set(filePath, file);
  }
  pendingFiles = Array.from(uniqueFiles.values());
  
  updateFilePreview();
}

// Get file icon based on extension
function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const icons = {
    js: 'fa-js',
    jsx: 'fa-react',
    ts: 'fa-code',
    tsx: 'fa-react',
    html: 'fa-html5',
    css: 'fa-css3-alt',
    scss: 'fa-sass',
    json: 'fa-file-code',
    md: 'fa-markdown',
    txt: 'fa-file-alt',
    jpg: 'fa-image',
    jpeg: 'fa-image',
    png: 'fa-image',
    gif: 'fa-image',
    svg: 'fa-image',
    webp: 'fa-image',
    mp4: 'fa-video',
    mp3: 'fa-music',
    pdf: 'fa-file-pdf',
    zip: 'fa-file-archive',
    rar: 'fa-file-archive',
    '7z': 'fa-file-archive',
    exe: 'fa-windows',
    py: 'fa-python',
    java: 'fa-java',
    cpp: 'fa-code',
    c: 'fa-code',
    php: 'fa-php',
    rb: 'fa-gem',
    go: 'fa-code',
    rs: 'fa-cogs',
    vue: 'fa-vuejs',
    react: 'fa-react',
    xml: 'fa-code',
    yaml: 'fa-code',
    yml: 'fa-code',
    toml: 'fa-code',
    sh: 'fa-terminal',
    bash: 'fa-terminal',
    ps1: 'fa-terminal'
  };
  return icons[ext] || 'fa-file';
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Update file preview list
function updateFilePreview() {
  const previewContainer = document.getElementById('filePreviewContainer');
  const previewList = document.getElementById('filePreviewList');
  const fileCountSpan = document.getElementById('fileCount');
  const startUploadBtn = document.getElementById('startUploadFiles');
  
  if (!previewContainer) return;
  
  if (pendingFiles.length === 0) {
    previewContainer.style.display = 'none';
    if (startUploadBtn) startUploadBtn.style.display = 'none';
    return;
  }
  
  previewContainer.style.display = 'block';
  if (startUploadBtn) startUploadBtn.style.display = 'flex';
  if (fileCountSpan) fileCountSpan.textContent = pendingFiles.length;
  
  // Group files by folder structure
  const fileTree = {};
  pendingFiles.forEach((file, index) => {
    const path = file.webkitRelativePath || file.name;
    const parts = path.split('/');
    let current = fileTree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        if (!current._files) current._files = [];
        current._files.push({ file, index, name: part });
      } else {
        if (!current[part]) current[part] = {};
        current = current[part];
      }
    }
  });
  
  // Render tree view
  function renderTree(node, level = 0) {
    let html = '';
    for (const key in node) {
      if (key === '_files') continue;
      html += `
        <div class="tree-folder" style="margin-left: ${level * 20}px;">
          <div class="tree-item folder">
            <i class="fas fa-folder"></i> ${escapeHtml(key)}
          </div>
          ${renderTree(node[key], level + 1)}
        </div>
      `;
    }
    if (node._files) {
      node._files.forEach(({ file, index, name }) => {
        const icon = getFileIcon(name);
        html += `
          <div class="tree-file" style="margin-left: ${level * 20}px;">
            <div class="tree-item file" data-index="${index}">
              <i class="fas ${icon}"></i> ${escapeHtml(name)}
              <span class="file-size">(${formatFileSize(file.size)})</span>
              <button class="remove-file-btn" data-index="${index}">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        `;
      });
    }
    return html;
  }
  
  previewList.innerHTML = renderTree(fileTree);
  
  // Add remove file handlers
  document.querySelectorAll('.remove-file-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      if (!isNaN(index) && index >= 0 && index < pendingFiles.length) {
        pendingFiles.splice(index, 1);
        updateFilePreview();
      }
    });
  });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Setup semua handler untuk file upload
function setupFileUploadHandlers() {
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');
  const selectFilesBtn = document.getElementById('selectFilesBtn');
  const clearFilesBtn = document.getElementById('clearFilesBtn');
  
  if (!uploadArea) return;
  
  // Klik area upload untuk pilih file
  uploadArea.addEventListener('click', (e) => {
    if (e.target.id !== 'selectFilesBtn' && fileInput) {
      fileInput.click();
    }
  });
  
  if (selectFilesBtn) {
    selectFilesBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (fileInput) fileInput.click();
    });
  }
  
  // Handle file selection
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      await processSelectedFiles(files);
      fileInput.value = ''; // Reset input
    });
  }
  
  // Drag & drop handlers
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });
  
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
  });
  
  uploadArea.addEventListener('drop', async (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    
    const items = e.dataTransfer.items;
    const files = [];
    
    // Process dropped items (including folders)
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry();
      if (entry) {
        await traverseFileTree(entry, files);
      }
    }
    
    await processSelectedFiles(files);
  });
  
  if (clearFilesBtn) {
    clearFilesBtn.addEventListener('click', () => {
      pendingFiles = [];
      updateFilePreview();
    });
  }
}

// Start upload process with progress tracking
async function startUploadProcess() {
  const repo = document.getElementById('targetRepoName')?.value.trim();
  const commitMsgInput = document.getElementById('commitMsg')?.value.trim() || "Upload proyek via web manager";
  const statusDiv = document.getElementById('uploadStatus');
  const progressContainer = document.getElementById('uploadProgressContainer');
  const progressBar = document.getElementById('uploadProgressBar');
  const progressText = document.getElementById('uploadProgressText');
  const startUploadBtn = document.getElementById('startUploadFiles');
  
  if (!repo) {
    showStatus(statusDiv, 'Masukkan nama repository tujuan!', 'error');
    return;
  }
  
  if (pendingFiles.length === 0) {
    showStatus(statusDiv, 'Tidak ada file yang akan diupload!', 'error');
    return;
  }
  
  // Disable upload button during process
  if (startUploadBtn) {
    startUploadBtn.disabled = true;
    startUploadBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Uploading...';
  }
  if (progressContainer) progressContainer.style.display = 'block';
  
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  for (let i = 0; i < pendingFiles.length; i++) {
    const file = pendingFiles[i];
    const filePath = file.webkitRelativePath || file.name;
    
    // Update progress
    const percent = ((i / pendingFiles.length) * 100).toFixed(1);
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressText) progressText.innerHTML = `Uploading: ${i + 1}/${pendingFiles.length} - ${escapeHtml(filePath)}`;
    
    try {
      const base64Content = await fileToBase64(file);
      await uploadSingleFile(repo, filePath, base64Content, `${commitMsgInput} (${i + 1}/${pendingFiles.length})`);
      successCount++;
      
      // Mark file as uploaded in preview
      const fileItems = document.querySelectorAll('.tree-file');
      if (fileItems[i]) {
        fileItems[i].style.opacity = '0.5';
        const fileDiv = fileItems[i].querySelector('.tree-item');
        if (fileDiv) fileDiv.style.textDecoration = 'line-through';
      }
    } catch (err) {
      errorCount++;
      errors.push(`${filePath}: ${err.message}`);
      console.error(`Failed to upload ${filePath}:`, err);
      if (progressText) {
        progressText.innerHTML += `<br/><span style="color: #ef4444;">❌ Gagal: ${escapeHtml(filePath)}</span>`;
      }
    }
    
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 100));
  }
  
  // Complete progress
  if (progressBar) progressBar.style.width = '100%';
  
  // Show final result
  if (errorCount === 0) {
    showStatus(statusDiv, `✅ Sukses! ${successCount} file berhasil diupload ke repository ${repo}`, 'success');
    if (progressText) progressText.innerHTML = `✅ Selesai! ${successCount} file berhasil diupload.`;
    
    // Clear files after successful upload
    setTimeout(() => {
      pendingFiles = [];
      updateFilePreview();
      if (progressContainer) progressContainer.style.display = 'none';
    }, 3000);
  } else {
    let errorSummary = `⚠️ ${successCount} berhasil, ${errorCount} gagal.\n`;
    if (errors.length <= 3) {
      errorSummary += errors.join('\n');
    } else {
      errorSummary += `${errors.length} errors terjadi. Cek console untuk detail.`;
    }
    showStatus(statusDiv, errorSummary, 'error');
    if (progressText) progressText.innerHTML = `⚠️ Selesai dengan error: ${errorCount} file gagal.`;
  }
  
  // Re-enable upload button
  if (startUploadBtn) {
    startUploadBtn.disabled = false;
    startUploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Semua File';
  }
}

// UI: Upload Project
function renderUploadProyekUI() {
  dynamicPanel.innerHTML = `
    <div class="action-title"><i class="fas fa-cloud-upload-alt"></i> Upload Proyek ke GitHub</div>
    <div class="flex-form">
      <div class="input-group">
        <label>Nama Repository Tujuan</label>
        <input type="text" id="targetRepoName" placeholder="repository-yang-sudah-ada">
        <small class="input-help">Pastikan repository sudah ada atau buat terlebih dahulu</small>
      </div>
      
      <!-- Drag & Drop Area -->
      <div class="upload-area" id="uploadArea">
        <i class="fas fa-cloud-upload-alt"></i>
        <p>Drag & Drop file atau folder di sini</p>
        <p style="font-size: 0.8rem; margin-top: 8px;">atau</p>
        <button id="selectFilesBtn" class="btn btn-outline" style="margin-top: 8px;">
          <i class="fas fa-folder-open"></i> Pilih File/Folder
        </button>
        <input type="file" id="fileInput" multiple webkitdirectory directory style="display: none;">
      </div>
      
      <!-- Preview Files -->
      <div id="filePreviewContainer" style="display: none;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <label><i class="fas fa-list"></i> File yang akan diupload (<span id="fileCount">0</span>)</label>
          <button id="clearFilesBtn" class="btn btn-outline" style="padding: 4px 12px; font-size: 0.8rem;">
            <i class="fas fa-trash"></i> Hapus Semua
          </button>
        </div>
        <div id="filePreviewList" class="file-preview-list"></div>
      </div>
      
      <div class="input-group">
        <label>Pesan Commit (opsional)</label>
        <input type="text" id="commitMsg" placeholder="Upload proyek via GitHub Manager">
      </div>
      
      <button id="startUploadFiles" class="btn btn-primary" style="display: none;">
        <i class="fas fa-upload"></i> Upload Semua File
      </button>
      
      <div id="uploadProgressContainer" style="display: none;">
        <div class="progress-bar-container">
          <div class="progress-bar" id="uploadProgressBar" style="width: 0%"></div>
        </div>
        <div id="uploadProgressText" style="margin-top: 8px; font-size: 0.85rem;"></div>
      </div>
      
      <div id="uploadStatus" class="status-message" style="display: none;"></div>
      <button id="cancelUploadBtn" class="btn btn-outline">Kembali</button>
    </div>
  `;
  
  // Setup file handling
  setupFileUploadHandlers();
  
  document.getElementById('startUploadFiles')?.addEventListener('click', () => startUploadProcess());
  document.getElementById('cancelUploadBtn')?.addEventListener('click', () => {
    pendingFiles = [];
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
    <div style="margin-top: 1rem; display: flex; gap: 1rem; justify-content: center;">
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
                <h4><i class="fas fa-book"></i> ${escapeHtml(repo.name)}</h4>
                <p>${escapeHtml(repo.description || 'Tidak ada deskripsi')}</p>
                <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
                  <span class="repo-badge"><i class="fas fa-code-branch"></i> ${escapeHtml(repo.default_branch)}</span>
                  <span class="repo-badge"><i class="fas ${repo.private ? 'fa-lock' : 'fa-globe'}"></i> ${repo.private ? 'Private' : 'Public'}</span>
                  <span class="repo-badge"><i class="fas fa-star"></i> ${repo.stargazers_count}</span>
                  <span class="repo-badge"><i class="fas fa-code-fork"></i> ${repo.forks_count}</span>
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
      container.innerHTML = `<div class="status-message status-error"><i class="fas fa-exclamation-triangle"></i> Gagal memuat: ${escapeHtml(err.message)}</div>`;
    }
  }
  
  await loadRepos();
  
  document.getElementById('refreshRepoList')?.addEventListener('click', loadRepos);
  document.getElementById('backToListMenu')?.addEventListener('click', () => {
    dynamicPanel.innerHTML = `<div class="empty-state"><i class="fas fa-arrow-left"></i><p>Kembali ke menu utama.</p></div>`;
  });
}