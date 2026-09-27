import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/aiChatbot";
const client = new MongoClient(uri);

async function runSeed() {
  try {
    console.log("Connecting to MongoDB:", uri);
    await client.connect();
    const db = client.db("aiChatbot");

    // ── Users ──────────────────────────────────────────────────────────────
    const usersCol = db.collection("users");
    const initialUsers = [
      { name: "Admin User", email: "admin@example.com", passwordRaw: "admin123", role: "admin" },
      { name: "Manager User", email: "manager@example.com", passwordRaw: "manager123", role: "manager" },
      { name: "Public User", email: "user@example.com", passwordRaw: "user123", role: "public_user" },
    ];

    console.log("Seeding users...");
    for (const u of initialUsers) {
      const existing = await usersCol.findOne({ email: u.email });
      const hashedPassword = await bcrypt.hash(u.passwordRaw, 10);
      if (!existing) {
        await usersCol.insertOne({
          name: u.name, email: u.email, password: hashedPassword,
          role: u.role, createdAt: new Date(), updatedAt: new Date(),
        });
        console.log(`+ Created user: ${u.email} (${u.role})`);
      } else {
        const isHashed = existing.password && existing.password.startsWith("$2");
        if (!isHashed) {
          await usersCol.updateOne({ _id: existing._id }, {
            $set: { password: hashedPassword, updatedAt: new Date() },
          });
          console.log(`* Updated unhashed password for user: ${u.email}`);
        } else {
          console.log(`= User already has hashed password: ${u.email}`);
        }
      }
    }

    // ── Knowledge Base (empty by default, created by user) ──────────────────
    console.log("Knowledge Base: Only user-created KBs are maintained.");

    // ── Conversations (empty, per-user) ──────────────────────────────────
    const convCol = db.collection("conversations");
    await convCol.createIndex({ userId: 1 });
    await convCol.createIndex({ updatedAt: -1 });
    console.log("= Conversations collection indexes ensured");

    // ── Prompts ─────────────────────────────────────────────────────────
    console.log("Seeding prompts...");
    const promptsCol = db.collection("prompts");
    const existingPrompts = await promptsCol.countDocuments();
    if (existingPrompts === 0) {
      await promptsCol.insertMany([
        {
          type: "faq",
          name: "Default FAQ Prompt",
          content: "Kamu adalah asisten yang menjawab pertanyaan berdasarkan dokumen knowledge base berikut:\n\n{context}\n\nJawab pertanyaan user: {question}\n\nBerikan jawaban yang ringkas, akurat, dan ramah.",
          isActive: true,
          createdAt: new Date(), updatedAt: new Date(),
        },
        {
          type: "small_talk",
          name: "Default Small Talk Prompt",
          content: "Kamu adalah asisten virtual yang ramah dan membantu. Jawab pesan berikut dengan santai dan bersahabat:\n\nUser: {message}\nAssistant:",
          isActive: true,
          createdAt: new Date(), updatedAt: new Date(),
        },
        {
          type: "route",
          name: "Default Route Prompt",
          content: "Klasifikasikan pertanyaan user berikut ke dalam salah satu kategori:\n- SMALL_TALK: sapaan, basa-basi, pertanyaan umum tidak terkait sistem\n- FAQ: pertanyaan spesifik tentang sistem, fitur, atau layanan\n\nPertanyaan: \"{question}\"\n\nJawab HANYA dengan satu kata: SMALL_TALK atau FAQ",
          isActive: true,
          createdAt: new Date(), updatedAt: new Date(),
        },
      ]);
      console.log("+ Created default prompts (faq, small_talk, route)");
    } else {
      console.log(`= ${existingPrompts} prompts already exist`);
    }

    // ── Flow Dialog ──────────────────────────────────────────────────────
    console.log("Seeding flow dialogs...");
    const flowCol = db.collection("flowDialogs");
    const existingFlows = await flowCol.countDocuments();
    if (existingFlows === 0) {
      await flowCol.insertMany([
        {
          name: "Default Welcome Flow",
          description: "Alur percakapan pembuka untuk chatbot.",
          nodes: [
            { id: "start", type: "start", label: "Mulai" },
            { id: "greeting", type: "message", label: "Halo! Ada yang bisa saya bantu?" },
            { id: "route", type: "route", label: "Routing..." },
            { id: "faq_handler", type: "faq", label: "Jawab FAQ" },
            { id: "small_talk_handler", type: "small_talk", label: "Small Talk" },
            { id: "end", type: "end", label: "Selesai" },
          ],
          edges: [
            { from: "start", to: "greeting" },
            { from: "greeting", to: "route" },
            { from: "route", to: "faq_handler", condition: "FAQ" },
            { from: "route", to: "small_talk_handler", condition: "SMALL_TALK" },
            { from: "faq_handler", to: "end" },
            { from: "small_talk_handler", to: "end" },
          ],
          isActive: true,
          createdAt: new Date(), updatedAt: new Date(),
        },
      ]);
      console.log("+ Created default flow dialog");
    } else {
      console.log(`= ${existingFlows} flow dialogs already exist`);
    }

    // ── GenAI Route Config ───────────────────────────────────────────────
    const configCol = db.collection("genaiConfig");
    const existingConfig = await configCol.findOne({ key: "lmstudio" });
    if (!existingConfig) {
      await configCol.insertOne({
        key: "lmstudio",
        baseUrl: process.env.LM_STUDIO_URL || "http://localhost:1234/v1",
        model: process.env.LM_STUDIO_MODEL || "local-model",
        temperature: 0.7,
        maxTokens: 1024,
        updatedAt: new Date(),
      });
      console.log("+ Created LM Studio config entry");
    } else {
      console.log("= LM Studio config already exists");
    }

    console.log("\n✅ Seed v1.1 completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

runSeed();
