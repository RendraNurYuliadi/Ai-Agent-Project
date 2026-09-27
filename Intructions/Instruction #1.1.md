# GenAI Chatbot — v1.1

## Stack

* Next.js
* React
* Tailwind CSS
* Node.js
* MongoDB
* LM Studio
* Git

## Auth

* `/login`
* Login email + password.
* Tidak ada public register.
* User dibuat oleh Admin.

Role:

* `admin` → akses semua.
* `manager` → Chatbot + Knowledge Base.
* `public_user` → Chatbot saja.

## Dashboard

Sidebar:

```text
Dashboard
Users
Chatbot
Chat History
Knowledge Base
Prompts
Flow Dialog
GenAI Route
```

## Chat History

Setiap user memiliki history sendiri.

MongoDB:

```text
conversations
```

Setiap conversation memiliki:

```text
{
  "_id": "conversationId",
  "userId": "userObjectId",
  "title": "Cara menggunakan sistem",
  "messages": [],
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

History tidak bersifat public.

---

# Knowledge Base

**1 MongoDB collection = 1 Knowledge Base.**

Contoh:

```text
aiChatbot
├── users
├── conversations
├── kb_general
├── kb_product
└── kb_faq
```

User dapat membuat Knowledge Base baru dari menu:

```text
Knowledge Base
└── + Add Knowledge Base
```

Setiap Knowledge Base dapat diisi dengan:

* Manual
* Import CSV

Aturan CSV:

* 1 row = 1 artikel.
* 1 column = 1 field.
* Header CSV = nama field.
* Field bersifat dinamis.

Contoh:

```csv
title,category,content
Cara Login,Account,Panduan login
Cara Reset Password,Account,Panduan reset password
```

Menjadi document:

```json
{
  "title": "Cara Login",
  "category": "Account",
  "content": "Panduan login"
}
```

Knowledge Base yang dibuat bersifat terpisah satu sama lain.

## Static Knowledge Base

Knowledge Base hanya menyimpan data.

Belum ada:

* RAG
* Embedding
* Vector Database
* GenAI processing

---

# Prompts

Folder:

```text
/prompts
```

Prompt akan digunakan untuk:

* FAQ
* Route
* Small Talk

Menu sidebar:

```text
Prompts
├── FAQ
├── Route
└── Small Talk
```

---

# Flow Dialog

Folder:

```text
/flowDialog
```

Digunakan untuk mengatur alur percakapan chatbot.

---

# GenAI Route

Digunakan untuk menentukan jenis pertanyaan user:

```text
User
 ↓
GenAI Route
 ├── SMALL_TALK
 └── FAQ
```

Implementasi GenAI menggunakan **LM Studio**.

---

# Scope v1.1

Fokus:

* Auth
* Dashboard
* User Management
* Chatbot
* Chat History
* Dynamic Knowledge Base
* Manual KB
* CSV Import KB
* Prompt Management
* Flow Dialog
* LM Studio
* GenAI Route
