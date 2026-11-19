# Dokumentasi Proyek Saat Ini

Dokumen ini merangkum fitur yang sudah terlihat pada implementasi proyek, alur aplikasi, pembagian hak akses, cara penggunaan, teknologi, dan batasan yang perlu diketahui. Dokumen ditujukan sebagai konteks awal bagi agen atau pembaca yang akan menyusun laporan lebih lanjut.

> **Catatan status:** Fitur yang dijelaskan bergantung pada konfigurasi aplikasi, MongoDB, dan provider AI yang tersedia. Keberadaan halaman atau API tidak selalu berarti konfigurasi eksternal sudah aktif.

## 1. Gambaran Umum

Proyek ini adalah aplikasi web chatbot dan AI agent untuk mengelola chatbot berbasis alur. Pengelola menyusun bot sebagai kumpulan node/interaksi, menambahkan sumber pengetahuan, mengatur prompt dan skill, lalu menguji percakapan dari dashboard. Pengguna dapat berbicara dengan bot, melihat kembali percakapan, dan bila alur mengaturnya, diteruskan ke bot lain atau petugas manusia.

Sistem menggabungkan:

- **Alur terstruktur:** menentukan urutan pertanyaan, routing, dan tindakan lanjutan.
- **AI generatif:** menyusun jawaban natural menggunakan provider model yang dikonfigurasi.
- **Pencarian pengetahuan:** mengambil artikel Knowledge Base sebagai konteks jawaban (RAG).
- **Pencarian web:** mencari sumber dari Bing untuk interaction Web Search.
- **Interaksi dan handoff:** tombol, kartu, carousel, pengumpulan data, dan eskalasi ke human.

Aplikasi tidak melatih model AI sendiri. Model dipanggil melalui LM Studio atau OpenRouter.

## 2. Peran dan Hak Akses

| Peran | Cakupan penggunaan |
|---|---|
| **Admin (`admin`)** | Akses seluruh menu pengelolaan: dashboard, pengguna, chatbot, bot dan flow, skill, riwayat/semua percakapan, antrean eskalasi, Knowledge Base, data capture, komponen, prompt, dan konfigurasi LLM. |
| **Manager (`manager`)** | Mengelola operasional chatbot: dashboard, chatbot, bot dan flow, skill, riwayat/semua percakapan, antrean eskalasi, Knowledge Base, data capture, dan komponen. Menu Users, Prompts, dan penyimpanan konfigurasi LLM dibatasi untuk admin. |
| **Public User (`public_user`)** | Menggunakan chatbot, melihat dashboard personal dan riwayat percakapannya sendiri. Tidak ditampilkan menu pengelolaan. Pendaftaran mandiri membuat akun dengan peran ini. |

Admin dapat membuat akun dan menentukan peran pengguna. Properti `userType` (`human` atau `bot`) adalah tipe akun, bukan peran dashboard tambahan; tipe ini dipakai antara lain untuk membedakan penerima eskalasi manusia dan bot.

**Catatan implementasi akses:** Menu dashboard difilter berdasarkan peran. Pemeriksaan akses juga berada pada beberapa halaman dan API tertentu, tetapi tidak semua halaman dashboard memiliki pemeriksaan peran server yang seragam. Tabel di atas menjelaskan hak akses operasional yang dimaksud oleh UI, bukan audit keamanan menyeluruh.

## 3. Fitur dan Subfitur

### 3.1 Autentikasi dan akun

- Login, pendaftaran, dan logout.
- Pendaftaran mandiri menghasilkan akun `public_user`.
- Admin dapat mengelola akun dan memilih peran serta tipe akun.
- Sesi menggunakan JWT pada cookie HttpOnly dengan masa berlaku 24 jam.

### 3.2 Dashboard

- Ringkasan jumlah pengguna, percakapan, prompt, flow, Knowledge Base, dan artikel.
- Ikhtisar kategori dan konten terbaru.
- Dashboard public user menampilkan pintasan chat, percakapan terakhir, dan jumlah percakapan miliknya.

### 3.3 Chatbot

- Membuat percakapan baru dan melanjutkan percakapan yang sudah ada.
- Menampilkan teks balasan, sumber artikel RAG atau sumber web, serta komponen interaktif bila tersedia.
- Memproses percakapan sesuai interaction aktif dan state percakapannya.
- Pengguna publik dapat memulai dari dashboard atau halaman Chatbot.

### 3.4 Bot Management dan Flow Editor

Bot disusun secara visual sebagai graph/node dan edge. Pengelola dapat mengatur entry interaction, transisi, konfigurasi node, variabel khusus, serta tindakan berikutnya: berpindah ke interaction lain, mengakhiri flow, atau menutup percakapan.

Jenis interaction yang tersedia:

- **Welcome Message:** sapaan, judul/subjudul, ikon, footer, dan quick reply.
- **Guided Routing:** mengarahkan pesan ke target berdasarkan route; dapat memakai pencocokan langsung atau klasifikasi LLM, dengan fallback.
- **Text Question:** mengajukan pertanyaan dan menyediakan input/pilihan cepat.
- **Text:** mengirim teks statis.
- **Small Talk:** menghasilkan balasan percakapan menggunakan prompt dan model; tidak otomatis mencari Knowledge Base.
- **RAG:** mencari artikel pada Knowledge Base yang dipilih, lalu mengirim konteks artikel ke LLM.
- **Web Search:** mencari web melalui Bing, menggunakan cuplikan atau isi halaman yang dapat diambil, lalu meminta LLM menyusun jawaban dengan sumber.
- **Data Collection:** menanyakan beberapa field secara bertahap dan menyimpan jawaban ke state percakapan; dapat dikonfigurasi dengan konfirmasi/review dan komponen.
- **Data Collection Submitted:** mengambil field yang ditentukan dan menyimpan hasil pengumpulan sebagai capture.
- **Skill Escalation:** meneruskan percakapan ke bot atau ke petugas manusia melalui antrean eskalasi.

### 3.5 Knowledge Base

- Membuat dan mengelola beberapa Knowledge Base.
- Membuat, melihat, mengubah, dan menghapus artikel.
- Impor artikel CSV.
- Mengelompokkan dan mencari artikel menggunakan informasi seperti judul, kategori, tag, ringkasan, detail, dan konten.
- Mengaktifkan Knowledge Base agar tersedia untuk pencarian bot.

Smart Search memberi skor pada kecocokan kata/frasa dan field artikel. Ini pencarian leksikal, bukan embedding atau vector database; sinonim yang tidak muncul di artikel bisa sulit ditemukan. Jumlah artikel hasil RAG dapat dikonfigurasi (default 5, maksimum 10).

### 3.6 Prompts

- Mengelola template prompt untuk kebutuhan seperti Guided Routing, RAG, dan Small Talk.
- Prompt dapat dipilih dari konfigurasi interaction agar perilaku bot sesuai kebutuhan.
- Menu pengelolaan prompt ditujukan untuk admin.

### 3.7 Skills dan eskalasi ke manusia

- Skill menghubungkan penerima (akun human atau bot) dengan konfigurasi bot/flow.
- Skill dapat dipilih atau digunakan sebagai tujuan transfer dari flow.
- Eskalasi ke human membuat percakapan berstatus pending dan menampilkannya kepada penerima di Escalation Queue.
- Petugas dapat menerima percakapan sebelum membalas, lalu melanjutkan, mentransfer, atau menutup sesuai tindakan yang tersedia.
- Transfer ke bot melanjutkan percakapan menggunakan flow bot tujuan.

### 3.8 Reusable Components

Jenis komponen yang didukung:

- Reply buttons dan link buttons.
- Card dan carousel.
- Impor/ekspor komponen melalui JSON.
- Komponen dapat ditautkan ke artikel. Komponen aktif dapat dipicu oleh artikel teratas dari hasil RAG jika referensi artikel cocok.

Komponen berbasis artikel tidak otomatis terpicu oleh Web Search. Komponen yang tidak ditautkan ke artikel tetap dapat dikelola, tetapi tidak dipicu oleh mekanisme pencocokan artikel RAG.

### 3.9 Percakapan dan data capture

- **Chat History:** riwayat percakapan yang dapat dibuka kembali.
- **All Conversations:** pemantauan percakapan lintas pengguna bagi admin/manager.
- **Escalation Queue:** daftar percakapan yang memerlukan tindak lanjut human.
- **Data Bot Data Collection Capture:** melihat dan mengelola record hasil pengumpulan data dari flow.

### 3.10 Konfigurasi AI (LLM Gateway)

- Provider yang didukung: LM Studio (API kompatibel OpenAI) dan OpenRouter.
- Pengaturan model/provider, URL LM Studio, temperature, dan batas token.
- Pengujian koneksi dan pemuatan daftar model tersedia pada halaman gateway.
- Konfigurasi penyimpanan provider dibatasi untuk admin. API key OpenRouter dibaca dari environment server, tidak diisikan sebagai nilai konfigurasi database.
- Halaman implementasi tersedia di `/dashboard/genai-route`; saat ini tidak ditampilkan sebagai item menu utama.

Bot juga dapat menentukan provider/model pada interaction tertentu bila konfigurasi flow menggunakannya.

## 4. Alur Aplikasi

### 4.1 Alur pengguna dan percakapan

1. Pengguna membuka aplikasi dan login atau mendaftar.
2. Pengguna masuk ke dashboard lalu membuka Chatbot atau melanjutkan percakapan dari riwayat.
3. Percakapan baru dijalankan memakai skill/bot yang dipilih atau bot aktif sesuai konfigurasi.
4. Pesan pengguna diproses oleh interaction yang sedang aktif; tidak semua pesan menjalankan pencarian atau LLM.
5. Interaction menjalankan tindakan yang sesuai: route, jawaban generatif, RAG, Web Search, pengumpulan data, atau transfer.
6. Aplikasi menampilkan balasan, tombol/komponen, dan sumber yang tersedia.
7. Pesan serta state flow/data collection disimpan pada percakapan di MongoDB.
8. Jika alur meminta eskalasi ke human, percakapan menunggu di Escalation Queue sampai petugas menerima.

### 4.2 Alur jawaban RAG

1. Node RAG memilih Knowledge Base aktif yang dikonfigurasi.
2. Smart Search menormalkan query dan memberi skor pada artikel berdasarkan kecocokan kata/frasa di field artikel.
3. Artikel teratas dirangkai menjadi konteks.
4. Konteks dan pertanyaan dikirim ke provider/model yang dipilih pada node.
5. Jawaban dan metadata artikel dikembalikan ke chat; komponen aktif yang terhubung ke artikel teratas dapat ikut ditampilkan.

### 4.3 Alur Web Search

1. Node Web Search mencari hasil Bing dari query pengguna.
2. Server mencoba mengekstrak konten dari halaman hasil; jika gagal, snippet pencarian dapat digunakan.
3. Sumber web dikirim sebagai konteks ke model.
4. Jawaban dan tautan sumber ditampilkan di chat.

### 4.4 Alur pengelola menyiapkan bot

1. Siapkan provider AI dan koneksi MongoDB.
2. Buat/aktifkan Knowledge Base dan isi artikel yang ingin dipakai.
3. Buat bot, tentukan interaction awal, lalu susun node dan transisinya.
4. Atur prompt, provider, model, route, pertanyaan pengumpulan data, Knowledge Base, dan skill sesuai kebutuhan node.
5. Buat komponen dan tautkan ke artikel bila ingin komponen muncul dari hasil RAG.
6. Hubungkan skill ke bot atau petugas, lalu uji flow lewat Chatbot.
7. Tinjau riwayat, antrean eskalasi, dan capture data untuk memantau hasil.

## 5. Cara Pakai

### Pengguna umum

1. Buka aplikasi dan pilih **Register** jika belum memiliki akun, atau **Login** jika sudah.
2. Setelah masuk, pilih **Mulai Chat Baru** atau menu **Chatbot**.
3. Pilih opsi/skill yang ditampilkan bot, atau kirim pertanyaan.
4. Gunakan tombol, tautan, card, atau carousel bila tersedia.
5. Buka **Chat History** untuk melanjutkan percakapan sebelumnya.
6. Jika percakapan dialihkan ke petugas, tunggu balasan pada percakapan yang sama.

### Admin

1. Masuk memakai akun berperan admin.
2. Kelola akun dan role pada **Users**.
3. Siapkan provider pada LLM Gateway bila perlu, dan pastikan environment server memiliki konfigurasi rahasia yang dibutuhkan.
4. Isi **Knowledge Base** dan **Prompts**.
5. Buat bot dan susun flow pada **Bot Management**.
6. Atur **Skills**, **Components**, serta konfigurasi node.
7. Jalankan uji percakapan melalui **Chatbot**, lalu pantau **All Conversations**, **Escalation Queue**, dan halaman capture data.

### Manager

1. Masuk memakai akun berperan manager.
2. Kelola flow, Knowledge Base, skill, komponen, dan data operasional melalui menu yang tersedia.
3. Uji perubahan di Chatbot dan pantau percakapan serta eskalasi.
4. Untuk mengubah akun/role, prompt, atau menyimpan konfigurasi provider global, minta bantuan admin.

## 6. Keunggulan Proyek

- **Alur dapat dikendalikan:** percakapan dapat disusun dan diarahkan melalui graph, bukan hanya bergantung pada respons bebas model.
- **Sumber jawaban dapat dipilih:** bot dapat menggunakan artikel internal atau pencarian web sesuai interaction.
- **AI provider fleksibel:** mendukung model lokal melalui LM Studio dan model cloud melalui OpenRouter.
- **Pengalaman interaktif:** quick reply, tautan, card, carousel, dan pengumpulan data melengkapi chat teks.
- **Dapat diteruskan ke manusia:** skill dan antrean eskalasi mendukung handoff ketika bot tidak menjadi tujuan akhir.
- **Operasional terpusat:** pengelola memiliki halaman untuk mengatur bot, data pengetahuan, prompt, percakapan, dan hasil capture.
- **State percakapan:** status flow dan jawaban pengumpulan data dapat dipakai untuk melanjutkan proses.

Keunggulan tersebut menunjukkan kapabilitas desain aplikasi; kualitas jawaban dan kesiapan operasional tetap bergantung pada data, konfigurasi, provider, dan pengujian.

## 7. Teknologi dan Data

| Area | Implementasi |
|---|---|
| Frontend dan API | Next.js App Router, React, TypeScript |
| Styling | Tailwind CSS |
| Database | MongoDB |
| Autentikasi | JWT, cookie HttpOnly, bcryptjs |
| Flow editor | `@xyflow/react` |
| AI | LM Studio dan OpenRouter |
| Pencarian web | Bing dan ekstraksi konten halaman |
| Impor CSV | Papa Parse |

Data utama mencakup akun pengguna, definisi bot dan flow, percakapan, Knowledge Base beserta artikel, prompts, konfigurasi AI, skills, reusable components, dan data capture. Artikel tiap Knowledge Base disimpan dalam collection MongoDB yang dikelola terpisah.

## 8. Batasan dan Hal yang Perlu Diperhatikan

- RAG memakai pencarian kata/frasa dengan scoring; bukan vector search semantik.
- Jawaban AI mengikuti kualitas dan cakupan sumber serta model yang dipakai. Hasil penting perlu diverifikasi.
- Web Search memerlukan akses internet server; hasil Bing atau ekstraksi halaman dapat berubah/tidak tersedia.
- LM Studio harus dapat dijangkau dari proses server aplikasi. `localhost` menunjuk ke mesin server, bukan otomatis ke browser pengguna.
- OpenRouter memerlukan `OPENROUTER_API_KEY` di environment server dan koneksi internet.
- Database MongoDB harus dikonfigurasi agar autentikasi dan penyimpanan percakapan berfungsi.
- Pendaftaran mandiri hanya membuat `public_user`; pembuatan role pengelola dilakukan oleh admin.

## 9. Struktur Implementasi yang Relevan

- `src/app/dashboard/` — halaman dashboard dan fitur pengelolaan.
- `src/app/api/` — endpoint autentikasi, bot, percakapan, data, dan konfigurasi.
- `src/lib/bot-runtime.ts` — eksekusi interaction dan state bot.
- `src/lib/bot-flows.ts` — tipe dan validasi definisi flow.
- `src/lib/smart-search.ts` — pencarian artikel Knowledge Base.
- `src/lib/web-search.ts` — pencarian web dan pengambilan konten.
- `src/lib/ai.ts` — konfigurasi dan pemanggilan provider AI.
- `src/lib/auth.ts` — session dan verifikasi token.
- `src/lib/mongodb.ts` — koneksi database.

## 10. Ringkasan untuk Laporan

Proyek ini merupakan platform chatbot berbasis AI yang menggabungkan visual flow builder, Knowledge Base dengan RAG, Web Search, prompt dan konfigurasi model, pengumpulan data, komponen interaktif, serta eskalasi ke petugas manusia. Admin mengelola seluruh konfigurasi dan akun; manager menangani operasional bot; public user berinteraksi dengan bot dan riwayatnya sendiri. Sistem menggunakan Next.js, MongoDB, dan provider LM Studio/OpenRouter, dengan pencarian artikel berbasis kata dan penyimpanan state percakapan.
