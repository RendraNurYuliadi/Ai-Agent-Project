import { createRequire } from "node:module";
import { MongoClient } from "mongodb";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());

const COLLECTION_NAME = "kb_rendra_personal_information_v1";
const question = (label) => ({ label, action: "reply", value: label });
const link = (label, value) => ({ label, action: "link", value });

const components = [
  {
    name: "Profil Rendra",
    type: "card",
    articleTitles: ["Profil Rendra"],
    card: {
      title: "Profil Rendra",
      subtitle: "Mahasiswa Informatika di Fakultas Teknologi Informasi, Universitas Sebelas April Sumedang.",
      buttons: [
        question("Rendra mengambil jurusan apa?"),
        question("Rendra berkuliah di mana?"),
        question("Rendra sekarang semester berapa?"),
      ],
      reuseImage: { component: "Profil Rendra", cardTitle: "Rendra Nur Yuliadi" },
    },
  },
  {
    name: "Pendidikan Rendra",
    type: "carousel",
    articleTitles: [
      "Perjalanan Pendidikan Rendra dari SD hingga Kuliah",
      "Riwayat Pendidikan Dasar Rendra",
      "Pendidikan SMP Rendra",
      "Pendidikan SMK Rendra",
      "Universitas Rendra",
      "Jurusan dan Fakultas Rendra",
      "Semester Kuliah Rendra",
    ],
    cards: [
      {
        title: "SDN Sukaraja 2",
        subtitle: "Rendra memulai pendidikan formalnya di SDN Sukaraja 2.",
        buttons: [question("Di mana Rendra menempuh pendidikan dasar?")],
      },
      {
        title: "SMPN 3 Sumedang",
        subtitle: "Rendra melanjutkan pendidikan menengah pertama di SMPN 3 Sumedang.",
        buttons: [question("Di mana Rendra bersekolah saat SMP?")],
      },
      {
        title: "SMKN 1 Sumedang",
        subtitle: "Rendra menempuh pendidikan kejuruan di SMKN 1 Sumedang.",
        buttons: [question("Di mana Rendra menempuh pendidikan SMK?")],
      },
      {
        title: "Universitas Sebelas April",
        subtitle: "Rendra menempuh Informatika di Fakultas Teknologi Informasi, Universitas Sebelas April Sumedang.",
        buttons: [
          question("Apa jurusan dan fakultas Rendra?"),
          question("Rendra sekarang semester berapa?"),
          question("Apa perjalanan pendidikan Rendra?"),
        ],
      },
    ],
  },
  {
    name: "Skill Development Rendra",
    type: "carousel",
    articleTitles: [
      "Rendra sebagai Web Developer",
      "Ketertarikan Rendra pada Web Development",
      "Teknologi Next.js yang Dipelajari Rendra",
      "React dalam Pembelajaran Rendra",
      "TypeScript dalam Pembelajaran Rendra",
      "Node.js dalam Pengembangan Rendra",
      "PostgreSQL yang Dipelajari Rendra",
      "Supabase yang Dipelajari Rendra",
      "Ketertarikan Rendra pada Artificial Intelligence",
      "Fokus Rendra pada Generative AI",
    ],
    cards: [
      {
        title: "Web Development",
        subtitle: "Rendra memiliki minat kuat pada pengembangan aplikasi web.",
        buttons: [
          question("Apa minat Rendra dalam web development?"),
          question("Apa saja teknologi web yang dipelajari Rendra?"),
        ],
        reuseImage: { component: "Skill Development Rendra", cardTitle: "Web Development" },
      },
      {
        title: "Backend & Database",
        subtitle: "KB mencatat pembelajaran Rendra pada Node.js, PostgreSQL, dan Supabase.",
        buttons: [
          question("Bagaimana Rendra mempelajari backend?"),
          question("Database apa saja yang dipelajari Rendra?"),
        ],
        reuseImage: { component: "Skill Development Rendra", cardTitle: "Backend & Database" },
      },
      {
        title: "AI & Data",
        subtitle: "Rendra tertarik pada AI dan sedang mengeksplorasi Generative AI.",
        buttons: [
          question("Apa ketertarikan Rendra di bidang AI?"),
          question("Apa yang sedang dieksplorasi Rendra tentang Generative AI?"),
        ],
        reuseImage: { component: "Skill Development Rendra", cardTitle: "AI & Data" },
      },
      {
        title: "Tools & Cloud",
        subtitle: "Rendra mempelajari teknologi web, backend, dan layanan database cloud yang tercantum di Knowledge Base.",
        buttons: [
          question("Apa saja teknologi yang dipelajari Rendra?"),
          question("Bagaimana Rendra menggunakan Supabase?"),
        ],
        reuseImage: { component: "Skill Development Rendra", cardTitle: "Tools & Cloud" },
      },
    ],
  },
  {
    name: "Artificial Intelligence Rendra",
    type: "carousel",
    articleTitles: [
      "Ketertarikan Rendra pada Artificial Intelligence",
      "Fokus Rendra pada Generative AI",
      "RAG dalam Project Rendra",
      "Knowledge Base pada Chatbot Rendra",
      "Conversation Design yang Dipelajari Rendra",
      "Project AI Chatbot Rendra",
      "AI Agent Computer Vision Rendra",
      "Pose Recognition pada AI Agent Rendra",
      "Random Forest pada Project AI Rendra",
    ],
    cards: [
      {
        title: "Generative AI",
        subtitle: "Knowledge Base mencatat Rendra sedang mengeksplorasi teknologi Generative AI.",
        buttons: [question("Apa yang sedang dieksplorasi Rendra tentang Generative AI?")],
        reuseImage: { component: "Artificial Intelligence Rendra", cardTitle: "Generative AI" },
      },
      {
        title: "Computer Vision",
        subtitle: "Rendra mengembangkan project AI Agent yang memanfaatkan computer vision dan pengenalan pose.",
        buttons: [question("Apa project computer vision yang dibuat Rendra?")],
        reuseImage: { component: "Artificial Intelligence Rendra", cardTitle: "Computer Vision" },
      },
      {
        title: "Machine Learning",
        subtitle: "Pada project AI Agent, Rendra menggunakan Random Forest untuk klasifikasi pose.",
        buttons: [question("Bagaimana Random Forest digunakan dalam project AI Rendra?")],
        reuseImage: { component: "Artificial Intelligence Rendra", cardTitle: "Machine Learning" },
      },
    ],
  },
  {
    name: "Pengalaman Profesional Rendra",
    type: "reply_buttons",
    articleTitles: [
      "Pengalaman PKL Rendra di PUPR",
      "Pekerjaan Rendra sebagai Conversation AI Engineer",
      "Vendor yang Digunakan Rendra dalam Conversation AI",
    ],
    buttons: [
      question("Apa pengalaman Rendra saat PKL di PUPR?"),
      question("Apa pekerjaan Rendra sebagai Conversation AI Engineer?"),
      question("Vendor apa yang digunakan Rendra dalam Conversation AI?"),
    ],
  },
  {
    name: "Organisasi Rendra",
    type: "card",
    articleTitles: [
      "Organisasi UKM Tahu Ngoding Rendra",
      "Peran Rendra sebagai Mentor Frontend",
      "Jabatan Rendra sebagai Wakil Ketua Umum",
    ],
    card: {
      title: "UKM Tahu Ngoding",
      subtitle: "KB mencatat Rendra sebagai anggota, mentor Frontend, dan Wakil Ketua Umum UKM Tahu Ngoding.",
      buttons: [
        question("Apa aktivitas Rendra di UKM Tahu Ngoding?"),
        question("Apa peran Rendra sebagai mentor Frontend?"),
        question("Apa jabatan Rendra di UKM Tahu Ngoding?"),
      ],
      reuseImage: { component: "Organisasi Rendra", cardTitle: "UKM Tahu Ngoding" },
    },
  },
  {
    name: "Pilih Topik Rendra",
    type: "reply_buttons",
    articleTitles: ["Profil Rendra"],
    buttons: [
      question("Siapa Rendra Nur Yuliadi?"),
      question("Rendra berkuliah di mana?"),
      question("Apa minat Rendra dalam web development?"),
      question("Apa saja teknologi yang dipelajari Rendra?"),
      question("Apa project AI yang pernah dibuat Rendra?"),
      question("Bagaimana Rendra menggunakan RAG dalam chatbot?"),
      question("Apa pengalaman profesional Rendra?"),
      question("Apa peran Rendra di UKM Tahu Ngoding?"),
    ],
  },
  {
    name: "Kepribadian Rendra",
    type: "card",
    articleTitles: ["Kepribadian Rendra", "Cara Bersosialisasi Rendra"],
    card: {
      title: "Kepribadian Rendra",
      subtitle: "Rendra menggambarkan dirinya sebagai introvert, calm, chill, dan suka mengamati situasi; ia tetap terbuka untuk mengenal orang baru.",
      buttons: [
        question("Bagaimana Rendra menggambarkan kepribadiannya?"),
        question("Bagaimana Rendra bersosialisasi dengan orang baru?"),
      ],
    },
  },
  {
    name: "Prestasi Akademik Rendra",
    type: "card",
    articleTitles: ["Prestasi Akademik Rendra", "Beasiswa KIP-K Rendra"],
    card: {
      title: "Prestasi Akademik Rendra",
      subtitle: "KB mencatat IP semester minimal 3,8 pada semester 1 hingga 4 serta penerimaan KIP-K.",
      buttons: [
        question("Apa catatan IP semester Rendra?"),
        question("Apakah Rendra menerima beasiswa KIP-K?"),
      ],
    },
  },
  {
    name: "Web Development Rendra",
    type: "reply_buttons",
    articleTitles: [
      "Rendra sebagai Web Developer",
      "Ketertarikan Rendra pada Web Development",
      "Tailwind CSS yang Dipelajari Rendra",
      "Project Portfolio Next.js Rendra",
    ],
    buttons: [
      question("Apa minat Rendra dalam web development?"),
      question("Apa saja teknologi web yang dipelajari Rendra?"),
      question("Apa project portfolio yang dikembangkan Rendra?"),
    ],
  },
  {
    name: "Next.js & Portfolio Rendra",
    type: "link_buttons",
    title: "Next.js & Portfolio",
    subtitle: "KB mencatat Rendra mengeksplorasi Next.js dan mengembangkan website portfolio pribadi menggunakan Next.js.",
    articleTitles: ["Teknologi Next.js yang Dipelajari Rendra", "Project Portfolio Next.js Rendra"],
    buttons: [link("Dokumentasi resmi Next.js", "https://nextjs.org/docs")],
  },
  {
    name: "React Rendra",
    type: "link_buttons",
    title: "React",
    subtitle: "Knowledge Base mencatat Rendra mempelajari React sebagai teknologi frontend.",
    articleTitles: ["React dalam Pembelajaran Rendra"],
    buttons: [link("Dokumentasi resmi React", "https://react.dev/learn")],
  },
  {
    name: "TypeScript Rendra",
    type: "link_buttons",
    title: "TypeScript",
    subtitle: "Knowledge Base mencatat Rendra sedang mempelajari TypeScript untuk pengembangan aplikasi.",
    articleTitles: ["TypeScript dalam Pembelajaran Rendra"],
    buttons: [link("Dokumentasi resmi TypeScript", "https://www.typescriptlang.org/docs/")],
  },
  {
    name: "Backend & Database Rendra",
    type: "link_buttons",
    title: "Backend & Database",
    subtitle: "KB mencatat pembelajaran Rendra pada Node.js, PostgreSQL, Supabase, MongoDB, dan MongoDB Atlas.",
    articleTitles: [
      "Node.js dalam Pengembangan Rendra",
      "PostgreSQL yang Dipelajari Rendra",
      "Supabase yang Dipelajari Rendra",
      "MongoDB dalam Project Rendra",
      "MongoDB Atlas yang Digunakan Rendra",
    ],
    buttons: [
      link("Dokumentasi resmi Node.js", "https://nodejs.org/docs/latest/api/"),
      link("Dokumentasi resmi PostgreSQL", "https://www.postgresql.org/docs/"),
      link("Dokumentasi resmi Supabase", "https://supabase.com/docs"),
      link("Dokumentasi resmi MongoDB", "https://www.mongodb.com/docs/"),
      link("Dokumentasi MongoDB Atlas", "https://www.mongodb.com/docs/atlas/"),
    ],
  },
  {
    name: "Git & GitHub Rendra",
    type: "link_buttons",
    title: "Git & GitHub",
    subtitle: "KB mencatat Rendra menggunakan Git dan GitHub untuk mengelola project software.",
    articleTitles: ["Git dan GitHub dalam Project Rendra"],
    buttons: [
      link("Dokumentasi resmi Git", "https://git-scm.com/doc"),
      link("Dokumentasi resmi GitHub", "https://docs.github.com/"),
    ],
  },
  {
    name: "Vendor Conversation AI Rendra",
    type: "link_buttons",
    title: "Vendor Conversation AI",
    subtitle: "KB menyebut pengalaman Rendra menggunakan LivePerson dan Mekari Kontak.",
    articleTitles: ["Vendor yang Digunakan Rendra dalam Conversation AI"],
    buttons: [
      link("Situs resmi LivePerson", "https://www.liveperson.com/"),
      link("Situs resmi Mekari Qontak", "https://mekari.com/produk/qontak/"),
    ],
  },
  {
    name: "RAG Chatbot Rendra",
    type: "reply_buttons",
    articleTitles: [
      "RAG dalam Project Rendra",
      "Knowledge Base pada Chatbot Rendra",
      "Project AI Chatbot Rendra",
    ],
    buttons: [
      question("Bagaimana Rendra menggunakan RAG dalam chatbot?"),
      question("Apa peran Knowledge Base pada chatbot Rendra?"),
      question("Apa project chatbot AI yang dikembangkan Rendra?"),
    ],
  },
  {
    name: "AI Agent Computer Vision Rendra",
    type: "carousel",
    articleTitles: [
      "AI Agent Computer Vision Rendra",
      "Pose Recognition pada AI Agent Rendra",
      "Random Forest pada Project AI Rendra",
      "Aktivitas yang Dikenali AI Agent Rendra",
      "Repository AI Agent Rendra",
      "Dataset Pose untuk AI Agent Rendra",
      "MediaPipe dalam Project AI Agent Rendra",
      "OpenCV dalam Project Computer Vision Rendra",
    ],
    cards: [
      {
        title: "AI Agent Computer Vision",
        subtitle: "Rendra mengembangkan konsep AI Agent yang memanfaatkan computer vision untuk mengenali pose.",
        buttons: [
          question("Apa project AI Agent computer vision Rendra?"),
          question("Bagaimana pose recognition digunakan pada AI Agent Rendra?"),
        ],
        reuseImage: { component: "Artificial Intelligence Rendra", cardTitle: "Computer Vision" },
      },
      {
        title: "Pose Recognition & Random Forest",
        subtitle: "KB mencatat penggunaan Random Forest untuk klasifikasi pose manusia.",
        buttons: [
          question("Bagaimana Random Forest digunakan untuk klasifikasi pose?"),
          question("Aktivitas apa saja yang dikenali AI Agent Rendra?"),
        ],
        reuseImage: { component: "Artificial Intelligence Rendra", cardTitle: "Machine Learning" },
      },
      {
        title: "Dataset & Computer Vision",
        subtitle: "Rendra membuat dataset pose serta menggunakan MediaPipe dan OpenCV pada project computer vision.",
        buttons: [
          question("Untuk apa dataset pose dibuat Rendra?"),
          question("Bagaimana Rendra menggunakan MediaPipe dan OpenCV?"),
          question("Di mana repository AI Agent Rendra?"),
        ],
      },
    ],
  },
  {
    name: "Pose Recognition Aktivitas Rendra",
    type: "carousel",
    articleTitles: [
      "Aktivitas yang Dikenali AI Agent Rendra",
      "Klasifikasi Standing pada AI Agent Rendra",
      "Klasifikasi Sitting pada AI Agent Rendra",
      "Klasifikasi Walking pada AI Agent Rendra",
      "Klasifikasi Raising Hand pada AI Agent Rendra",
      "Klasifikasi Squatting pada AI Agent Rendra",
    ],
    cards: [
      { title: "Standing", subtitle: "Model AI Rendra dapat mengenali aktivitas berdiri.", buttons: [question("Bagaimana AI Agent Rendra mengenali aktivitas berdiri?")] },
      { title: "Sitting", subtitle: "Model AI Rendra dapat mengenali aktivitas duduk.", buttons: [question("Bagaimana AI Agent Rendra mengenali aktivitas duduk?")] },
      { title: "Walking", subtitle: "Model AI Rendra dapat mengenali aktivitas berjalan.", buttons: [question("Bagaimana AI Agent Rendra mengenali aktivitas berjalan?")] },
      { title: "Raising Hand", subtitle: "Model AI Rendra dapat mengenali aktivitas mengangkat tangan.", buttons: [question("Bagaimana AI Agent Rendra mengenali gerakan mengangkat tangan?")] },
      { title: "Squatting", subtitle: "Model AI Rendra dapat mengenali aktivitas squat.", buttons: [question("Bagaimana AI Agent Rendra mengenali gerakan squat?")] },
    ],
  },
  {
    name: "Portfolio Next.js Rendra",
    type: "card",
    articleTitles: ["Project Portfolio Next.js Rendra"],
    card: {
      title: "Portfolio Next.js Rendra",
      subtitle: "Rendra mengembangkan website portfolio pribadi menggunakan Next.js.",
      buttons: [
        question("Apa project portfolio yang dikembangkan Rendra?"),
        question("Teknologi apa yang digunakan pada portfolio Rendra?"),
      ],
    },
  },
];

function validateQuestionButtons(buttons, context) {
  if (!Array.isArray(buttons) || buttons.length < 1 || buttons.length > 10) {
    throw new Error(`${context}: jumlah tombol reply harus 1 sampai 10.`);
  }
  for (const button of buttons) {
    if (button.action !== "reply" || button.label !== button.value || !button.label.trim().endsWith("?")) {
      throw new Error(`${context}: setiap Reply Button harus berupa pertanyaan natural dengan payload yang sama.`);
    }
  }
}

function validateLinks(buttons, context) {
  if (!Array.isArray(buttons) || buttons.length < 1 || buttons.length > 10) {
    throw new Error(`${context}: jumlah Link Button harus 1 sampai 10.`);
  }
  for (const button of buttons) {
    let url;
    try {
      url = new URL(button.value);
    } catch {
      throw new Error(`${context}: URL link tidak valid: ${button.value}`);
    }
    if (button.action !== "link" || url.protocol !== "https:") {
      throw new Error(`${context}: Link Button harus memakai URL HTTPS.`);
    }
  }
}

function validateCard(card, context) {
  if (!card.title.trim() || !card.subtitle.trim() || !Array.isArray(card.buttons) || card.buttons.length > 3) {
    throw new Error(`${context}: isi card tidak valid atau tombol melebihi 3.`);
  }
  if (card.buttons.length) validateQuestionButtons(card.buttons, context);
}

function validateDefinition(component, articleTitles) {
  if (!component.name.trim() || articleTitles.length < 1 || articleTitles.length > 10) {
    throw new Error(`${component.name}: nama atau jumlah referensi artikel tidak valid.`);
  }
  if (new Set(articleTitles).size !== articleTitles.length) {
    throw new Error(`${component.name}: ada artikel pemicu duplikat.`);
  }

  if (component.type === "reply_buttons") validateQuestionButtons(component.buttons, component.name);
  if (component.type === "link_buttons") {
    if (!component.title.trim() || !component.subtitle.trim()) throw new Error(`${component.name}: title dan subtitle link wajib diisi.`);
    validateLinks(component.buttons, component.name);
  }
  if (component.type === "card") validateCard(component.card, component.name);
  if (component.type === "carousel") {
    if (!Array.isArray(component.cards) || component.cards.length < 1 || component.cards.length > 10) {
      throw new Error(`${component.name}: carousel harus berisi 1 sampai 10 card.`);
    }
    component.cards.forEach((card, index) => validateCard(card, `${component.name} card ${index + 1}`));
  }
}

function findReusableImage(existingByName, source) {
  const template = existingByName.get(source.component);
  if (!template) return null;
  const sourceCards = template.type === "card" ? [template.card] : template.cards || [];
  const card = sourceCards.find((item) => item?.title === source.cardTitle);
  return card?.imageUrl ? { imageUrl: card.imageUrl, imageHeight: card.imageHeight || 128 } : null;
}

function resolveCard(card, existingByName) {
  const { reuseImage, ...data } = card;
  const reused = reuseImage ? findReusableImage(existingByName, reuseImage) : null;
  return {
    imageUrl: reused?.imageUrl || card.imageUrl || "",
    imageHeight: reused?.imageHeight || card.imageHeight || 144,
    title: data.title,
    subtitle: data.subtitle,
    buttons: data.buttons || [],
  };
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI belum tersedia.");
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 7000 });
  try {
    await client.connect();
    const db = client.db("aiChatbot");
    const knowledgeBase = await db.collection("knowledgeBases").findOne({
      collectionName: COLLECTION_NAME,
      isActive: { $ne: false },
    });
    if (!knowledgeBase) throw new Error(`KB aktif ${COLLECTION_NAME} tidak ditemukan.`);

    const articles = await db.collection(COLLECTION_NAME).find({}).toArray();
    if (articles.length !== 50) throw new Error(`Diharapkan 50 artikel aktif, ditemukan ${articles.length}.`);
    const articlesByTitle = new Map();
    for (const article of articles) {
      if (articlesByTitle.has(article.title)) throw new Error(`Judul artikel duplikat: ${article.title}`);
      articlesByTitle.set(article.title, article);
    }

    if (components.length !== 20 || new Set(components.map((item) => item.name)).size !== 20) {
      throw new Error("Definisi component harus berjumlah tepat 20 dengan nama unik.");
    }

    const prepared = components.map((component) => {
      validateDefinition(component, component.articleTitles);
      const articleRefs = component.articleTitles.map((title) => {
        const article = articlesByTitle.get(title);
        if (!article) throw new Error(`${component.name}: artikel '${title}' tidak ditemukan pada KB aktif.`);
        return { collectionName: COLLECTION_NAME, articleId: article._id.toString() };
      });
      return { ...component, articleRefs };
    });

    const referencedTitles = new Set(prepared.flatMap((item) => item.articleTitles));
    const uncoveredTitles = articles.map((item) => item.title).filter((title) => !referencedTitles.has(title));
    if (uncoveredTitles.length) throw new Error(`Artikel belum terhubung: ${uncoveredTitles.join("; ")}`);

    const collection = db.collection("components");
    const existing = await collection.find({}).toArray();
    const targetNames = new Set(components.map((item) => item.name));
    const unrelated = existing.filter((item) => !targetNames.has(item.name));
    if (unrelated.length) {
      throw new Error(`Ditemukan component di luar target, tidak diubah: ${unrelated.map((item) => item.name).join(", ")}`);
    }
    const existingByName = new Map(existing.map((item) => [item.name, item]));

    const documents = prepared.map((component) => {
      const card = component.type === "card"
        ? resolveCard(component.card, existingByName)
        : { imageUrl: "", imageHeight: 128, title: "", subtitle: "", buttons: [] };
      const cards = component.type === "carousel"
        ? component.cards.map((item) => resolveCard(item, existingByName))
        : [];
      return {
        name: component.name,
        type: component.type,
        isActive: true,
        articleRefs: component.articleRefs,
        title: component.title || "",
        subtitle: component.subtitle || "",
        buttons: component.buttons || [],
        card,
        cards,
      };
    });

    const counts = documents.reduce((result, item) => {
      result[item.type] = (result[item.type] || 0) + 1;
      return result;
    }, {});
    const reusedImages = documents.reduce((total, item) => total + [item.card, ...item.cards].filter((card) => card.imageUrl).length, 0);
    console.log(JSON.stringify({
      mode: process.argv.includes("--apply") ? "apply" : "dry-run",
      knowledgeBase: knowledgeBase.displayName,
      articleCount: articles.length,
      referencedArticleCount: referencedTitles.size,
      componentCount: documents.length,
      typeCounts: counts,
      reusedImageCount: reusedImages,
      components: documents.map((item) => ({ name: item.name, type: item.type, articleCount: item.articleRefs.length })),
    }, null, 2));

    if (!process.argv.includes("--apply")) return;

    const now = new Date();
    const operations = documents.map((document) => {
      const current = existingByName.get(document.name);
      if (current) {
        return {
          updateOne: {
            filter: { _id: current._id },
            update: { $set: { ...document, updatedAt: now } },
          },
        };
      }
      return { insertOne: { document: { ...document, createdAt: now, updatedAt: now } } };
    });

    await collection.bulkWrite(operations, { ordered: true });
    const activeCount = await collection.countDocuments({ isActive: true });
    const totalCount = await collection.countDocuments({});
    if (activeCount !== 20 || totalCount !== 20) {
      throw new Error(`Verifikasi gagal: ditemukan ${activeCount} aktif dari ${totalCount} component.`);
    }
    console.log("APPLIED: 20 component aktif; seluruh 50 artikel KB terhubung.");
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("COMPONENT_UPDATE_FAILED:", error.message);
  process.exitCode = 1;
});