# Refactor RAG — Smart Search Top 5

Hentikan mekanisme RAG/retrieval yang sedang berjalan dan refactor menjadi mekanisme baru.

## Flow

User Query
→ Smart Search
→ Ranking artikel
→ Ambil Top 5
→ Kirim 5 artikel sebagai context ke LM Studio
→ AI menghasilkan jawaban berdasarkan context

## Smart Search

Gunakan data dari Knowledge Base yang dipilih.

Search harus mempertimbangkan:
- title
- category
- tags
- content
- summary/detail jika tersedia

Lakukan:
1. Normalisasi query.
2. Tokenisasi query.
3. Hilangkan stop words umum.
4. Cocokkan keyword dengan field KB.
5. Berikan score pada setiap artikel.
6. Sort berdasarkan score tertinggi.
7. Ambil maksimal 5 artikel terbaik.

Jangan mengambil seluruh artikel untuk dikirim ke AI.

## AI Context

Hanya Top 5 artikel hasil ranking yang dikirim ke LM Studio.

Format konsep:

User:
"rendra kuliah di mana dan apa jurusannya?"

Smart Search:
1. Artikel A — score tinggi
2. Artikel B — score tinggi
3. Artikel C
4. Artikel D
5. Artikel E

LM Studio menerima:

SYSTEM:
Jawab berdasarkan knowledge context yang diberikan.
Jika informasi tidak terdapat dalam context, katakan informasi tidak ditemukan.
Jangan mengarang informasi.

KNOWLEDGE CONTEXT:
[Artikel 1]
[Artikel 2]
[Artikel 3]
[Artikel 4]
[Artikel 5]

USER:
rendra kuliah di mana dan apa jurusannya?

→ AI Answer

## Important

- Jangan gunakan seluruh collection sebagai context AI.
- Maksimal 5 artikel.
- Ranking dilakukan sebelum request ke LM Studio.
- Pertahankan dynamic KB: 1 collection = 1 Knowledge Base.
- Jangan menggunakan embedding/vector database untuk mekanisme ini.
- Jangan membuat mekanisme RAG lain di luar flow tersebut.
- Buat logic retrieval/search terpisah agar mudah dikembangkan nanti.

## Testing

Setelah implementasi selesai, lakukan hanya 1 test sederhana:

Query:
"rendra kuliah di mana dan apa jurusannya?"

Tampilkan:
- query
- 5 artikel hasil ranking
- score masing-masing
- context yang dikirim ke LM Studio
- hasil response AI

Jangan melakukan testing massal atau benchmark.