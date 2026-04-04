# GitHub Manager by cpm_jhon

Sebuah web application lengkap untuk mengelola repository GitHub dengan mudah, termasuk membuat, menghapus, mengupload file (support ZIP & folder structure), dan melihat daftar repository.

## ✨ Fitur Lengkap

### 🔐 Autentikasi GitHub
- Login menggunakan Personal Access Token (PAT)
- Verifikasi token otomatis
- Token hanya disimpan di memori browser (aman)

### 📦 Manajemen Repository
- **Buat Repository** baru (public/private) dengan deskripsi
- **Hapus Repository** dengan konfirmasi keamanan (permanen)
- **Daftar Repository** - Lihat semua repository dengan detail lengkap

### 🚀 Upload Proyek Canggih
- **Drag & Drop** file/folder langsung ke browser
- **Support ZIP Archive** - Upload file ZIP dan ekstrak otomatis
- **Support Folder Structure** - Mempertahankan struktur folder (contoh: `css/style.css`, `js/script.js`)
- **Preview File** - Lihat semua file yang akan diupload dengan struktur tree
- **Hapus File Individual** - Bisa hapus file tertentu sebelum upload
- **Progress Upload Real-time** - Progress bar dan status per file
- **Multiple File Upload** - Upload banyak file sekaligus

### 📊 Informasi Repository
- Nama, deskripsi, branch default
- Status Public/Private
- Jumlah stars dan forks
- Link langsung ke GitHub

## 📋 Prasyarat

1. **Akun GitHub** (aktif)
2. **Personal Access Token (PAT)** dengan izin:
   - `repo` (full control of private repositories)
   - `delete_repo` (delete repositories)
   - `workflow` (optional)

### Cara Mendapatkan PAT

1. Buka [GitHub Settings](https://github.com/settings/tokens)
2. Settings → Developer settings → Personal access tokens → Tokens (classic)
3. Klik **"Generate new token (classic)"**
4. Beri nama token (contoh: "GitHub Manager Web")
5. Centang izin yang diperlukan:
   - ☑️ `repo` (semua sub-izin otomatis tercentang)
   - ☑️ `delete_repo`
   - ☑️ `workflow` (opsional)
6. Klik **"Generate token"**
7. **⚠️ SALIN TOKENNYA!** Token hanya muncul sekali

## 🚀 Cara Menjalankan

### Metode 1: Langsung Buka File (Simple)

1. Download semua file ke dalam folder dengan struktur
2. Buka file `index.html` di browser modern (Chrome, Firefox, Edge)

### Metode 2: Live Server (Direkomendasikan untuk Development)

```bash
# Menggunakan Python (bawaan)
python -m http.server 8000

# Menggunakan Node.js (install dulu)
npx live-server

# Menggunakan PHP
php -S localhost:8000

Kemudian buka http://localhost:8000 di browser.
```

---

### Metode 3: Deploy ke Hosting Static

* Upload folder ke:

• Vercel - vercel deploy
• Netlify - Drag & drop folder
• GitHub Pages - Upload ke branch gh-pages

### 📖 Panduan Penggunaan

• 1. Login

* Masukkan Username GitHub Anda
* Masukkan Personal Access Token (PAT)
* Klik "Verifikasi & Simpan"
* Jika berhasil, menu utama akan muncul

• 2. Buat Repository

* Klik tombol "Buat Repository"
* Isi nama repository (wajib)
* Isi deskripsi (opsional)
* Centang "Private Repository" jika ingin private
* Klik "Buat Sekarang"

• 3. Hapus Repository ⚠️

* Klik "Hapus Repository"
* Masukkan nama repository yang akan dihapus
* Ketik ulang nama repository untuk konfirmasi
* Klik "Hapus Permanen"
* ⚠️ PERHATIAN: Data tidak bisa dikembalikan!

• 4. Upload Proyek 📤

* Drag & Drop: Tarik file/folder ke area upload
* Klik Area Upload: Pilih file manual
* Upload ZIP: Tarik file ZIP, akan otomatis diekstrak

### Fitur Upload:

* Preview File: Lihat semua file dengan struktur folder
* Hapus File: Klik icon X pada file yang tidak ingin diupload
* Progress Bar: Lihat status upload real-time
* Branch: Upload ke branch main (otomatis)


• 5.  Lihat Daftar Repository
* Klik "Daftar Repo"
* Lihat semua repository Anda
* Klik "Buka" untuk melihat di GitHub
* Klik "Refresh" untuk memuat ulang

### 🛡️ Keamanan

* Token tidak pernah disimpan di local storage atau cookie
* Token hanya tersimpan di memory JavaScript selama sesi
* Semua request dikirim langsung ke GitHub API (tidak melalui server pihak ketiga)
* Tidak ada tracking atau analytics

### ⚠️ Batasan & Catatan

* Rate Limit GitHub API: 5000 request/jam untuk user terautentikasi
* Ukuran File: GitHub membatasi file individual maksimal 100MB
* Branch: Upload hanya ke branch main (pastikan branch ada)
* File Duplikat: Jika file sudah ada, akan di-overwrite
* ZIP: ZIP diekstrak, file asli ZIP tidak diupload

### 🛠️ Teknologi yang Digunakan

* HTML5 - Struktur halaman
* CSS3 - Styling modern (Flexbox, Grid, Animations)
* JavaScript (ES6+) - Logic aplikasi
* GitHub REST API v3 - Interaksi dengan GitHub
* JSZip - Ekstraksi file ZIP
* Font Awesome 6 - Ikon-ikon keren
* Google Fonts (Inter) - Tipografi modern

### 🐛 Troubleshooting

• "Token tidak valid"
* Pastikan token sudah benar dan tidak expired
* Pastikan token memiliki izin yang diperlukan
* Generate token baru jika perlu

• "Gagal upload file"
* Cek ukuran file (max 100MB per file)
* Pastikan repository sudah ada
* Cek branch main exist di repository

• "ZIP tidak bisa diekstrak"
*Pastikan file ZIP tidak corrupt
* Coba ekstrak manual dulu
* File ZIP terlalu besar? Coba upload file individual

• "Drag & drop folder tidak jalan"

* Gunakan browser modern (Chrome, Edge, Firefox)
* Pastikan tidak dalam mode private/incognito (beberapa browser membatasi)

• 📝 Changelog

### v2.0 (Current)

* ✅ Support upload ZIP dengan ekstraksi otomatis
* ✅ Support folder structure lengkap
* ✅ Preview file dengan tree view
* ✅ Drag & drop file/folder
* ✅ Progress bar real-time
* ✅ Hapus file individual sebelum upload

### v1.0

* ✅ Autentikasi GitHub
* ✅ Buat & hapus repository
* ✅ Upload file individual
* ✅ Daftar repository

• 🤝 Kontribusi

Pull request sangat diterima! Untuk perubahan besar, buka issue terlebih dahulu.

### Langkah kontribusi:

1. Fork repository
2. Buat branch fitur (git checkout -b fitur-keren)
3. Commit perubahan (git commit -m 'Menambah fitur keren')
4. Push ke branch (git push origin fitur-keren)
5. Buat Pull Request
```

---

### 📁 Struktur Project
```
github-manager/
├── index.html
├── css/
│ └── style.css
├── js/
│ └── script.js
└── README.md
```

---

```
### 📄 Lisensi

MIT License - Bebas digunakan, dimodifikasi, dan didistribusikan.

### 👨‍💻 Author

cpm_jhon - GitHub

### 🙏 Credits

* Icons by Font Awesome
* ZIP library by JSZip
* Font by Google Fonts
```
---

```
## Cara Menggunakan:

1. **Buat folder** dengan nama `github-manager`
2. **Buat subfolder** `css` dan `js`
3. **Copy paste** masing-masing kode ke file yang sesuai:
   - `index.html` → file utama
   - `css/style.css` → file CSS
   - `js/script.js` → file JavaScript
   - `README.md` → dokumentasi (opsional)
4. **Buka** `index.html` di browser
5. **Login** dengan username dan PAT GitHub
6. **Nikmati** semua fitur!

## Fitur yang Dipertahankan dan Ditambahkan:

### Original Features (dari bash script):
✅ Buat repository  
✅ Hapus repository  
✅ Upload proyek ke GitHub  

### New Features Added:
✅ Preview file sebelum upload (tree view)  
✅ Support upload ZIP dengan ekstraksi otomatis  
✅ Support struktur folder (contoh: `css/style.css`)  
✅ Drag & drop file/folder  
✅ Progress bar real-time  
✅ Hapus file individual  
✅ Daftar repository dengan detail  
✅ Tampilan modern dan responsive  

Semua kode sudah lengkap, rapi, dan siap digunakan! 🚀
Dibuat dengan ❤️ untuk memudahkan manajemen repository GitHub