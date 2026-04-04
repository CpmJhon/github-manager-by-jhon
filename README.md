# GitHub Manager by cpm_jhon

Sebuah web application untuk mengelola repository GitHub dengan mudah, termasuk membuat, menghapus, mengupload file, dan melihat daftar repository.

## Fitur

- 🔐 **Autentikasi GitHub** menggunakan Personal Access Token (PAT)
- ➕ **Buat Repository** baru (public/private) dengan deskripsi
- 🗑️ **Hapus Repository** dengan konfirmasi keamanan
- 📤 **Upload Proyek** - Upload multiple file ke repository yang sudah ada
- 📋 **Daftar Repository** - Lihat semua repository Anda beserta detailnya

## Prasyarat

1. Akun GitHub
2. Personal Access Token (PAT) dengan izin:
   - `repo` (full control of private repositories)
   - `delete_repo` (delete repositories)
   - `workflow` (optional)

### Cara Mendapatkan PAT

1. Buka GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Klik "Generate new token (classic)"
3. Beri nama token (contoh: "GitHub Manager")
4. Centang izin yang diperlukan
5. Klik "Generate token"
6. **Salin token** (hanya muncul sekali)

## Cara Menjalankan

### Metode 1: Langsung Buka File

1. Download semua file ke dalam folder dengan struktur:

2. Buka file `index.html` di browser modern

### Metode 2: Menggunakan Live Server (direkomendasikan)

```bash
# Install live server jika menggunakan Node.js
npx live-server

# Atau menggunakan Python
python -m http.server 8000
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


## Cara Menggunakan:

1. Buat folder baru bernama `github-manager`
2. Di dalam folder tersebut, buat file `index.html` dan copy kode dari atas
3. Buat folder `css`, di dalamnya buat file `style.css` dan copy kode CSS
4. Buat folder `js`, di dalamnya buat file `script.js` dan copy kode JavaScript
5. Buka `index.html` di browser atau gunakan live server

Semua kode sudah terpisah rapi dan siap digunakan! 🚀