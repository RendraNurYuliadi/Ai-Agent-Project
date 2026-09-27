# GenAI Chatbot

## Stack

* Next.js
* React
* Tailwind CSS
* Node.js
* MongoDB
* Git

## Goal

Membuat dashboard management untuk chatbot GenAI.

## Auth

* `/login`
* Login email + password.
* Tidak ada public register.
* User dibuat oleh Admin.
* Setelah login → `/dashboard`.

## Dashboard

Menu:

* Dashboard
* Users
* Knowledge Base
* Chatbot

Chatbot sementara placeholder.

## Users

Admin dapat:

* Melihat users
* Menambahkan user
* Mengedit user
* Menghapus user

Role:

* `admin`
* `manager`
* `public_user`

## Knowledge Base

Data artikel dapat ditambahkan dengan 2 cara:

1. **Manual** — tambah artikel satu per satu.
2. **CSV Import** — import banyak artikel sekaligus.

Aturan CSV:

* 1 row = 1 artikel
* 1 column = 1 field
* Header CSV = nama field
* Struktur field dinamis

Contoh:

```csv
title,category,content
Cara Login,Account,Panduan login
Cara Reset Password,Account,Panduan reset password
```

Data disimpan di MongoDB.

## MVP Flow

```text
Login
 ↓
Dashboard
 ├── Users
 └── Knowledge Base
      ├── Add Manual
      └── Import CSV
```

## Scope Saat Ini

Fokus hanya:

* Auth Login
* Dashboard
* User Management
* Knowledge Base
* Manual Article
* CSV Import
* MongoDB

**Jangan implementasi RAG/GenAI chatbot dulu.**

---

# MongoDB

URL:

```text
mongodb://localhost:27017
```

Database:

```text
aiChatbot
```

Collections:

```text
users
knowledgeBase
```

## users

```json
[
  {
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "admin123",
    "role": "admin"
  },
  {
    "name": "Manager User",
    "email": "manager@example.com",
    "password": "manager123",
    "role": "manager"
  },
  {
    "name": "Public User",
    "email": "user@example.com",
    "password": "user123",
    "role": "public_user"
  }
]
```

Password wajib di-hash sebelum disimpan.

## knowledgeBase

```json
[
  {
    "title": "Panduan Sistem Informasi",
    "summary": "Panduan umum penggunaan sistem informasi.",
    "detail": "Sistem informasi digunakan untuk mengelola data, pengguna, dan aktivitas dalam sistem.",
    "category": "General",
    "tags": ["system", "guide", "information"]
  }
]
```
