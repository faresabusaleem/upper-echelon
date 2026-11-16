// Creates the official staff account, its clearly-labelled welcome threads, and one discussion
// thread per Directory test. Safe to run more than once.
//
//   Local:       npm run seed:staff            (reads .env.local)
//   Production:  STAFF_EMAIL=you@example.com NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SECRET_KEY=… node scripts/seed-staff.mjs
//
// The staff account gets a random password that is never printed. Use "Forgotten your password?"
// with STAFF_EMAIL to sign in as staff.
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const email = process.env.STAFF_EMAIL || "staff@upper-echelon.test";
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function staffUser() {
  const { data: existing } = await db.from("profiles").select("id").eq("username", "upperechelon").maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: randomBytes(24).toString("base64url"),
    email_confirm: true,
    user_metadata: { username: "upperechelon", display_name: "Upper Echelon" },
  });
  if (error) throw error;
  return data.user.id;
}

const id = await staffUser();
await db
  .from("profiles")
  .update({
    username: "upperechelon",
    display_name: "Upper Echelon",
    is_staff: true,
    role: "moderator",
    bio: "The official staff account. Announcements, welcome threads and Directory discussion rooms are posted here.",
    onboarded_at: new Date().toISOString(),
  })
  .eq("id", id);
await db.from("user_settings").update({ dm_policy: "everyone" }).eq("user_id", id);

const { data: cats } = await db.from("forum_categories").select("id, slug");
const cat = (slug) => cats.find((c) => c.slug === slug)?.id;

const WELCOME = [
  {
    category: "notice-board",
    pinned: true,
    title: "Welcome to the Echelon",
    tags: ["welcome"],
    body: `*This is an official welcome thread from the Upper Echelon staff.*

You were not invited by accident. Upper Echelon is a quiet society for people who enjoy thinking hard and being measured honestly.

**Where to begin**

- **The Arena.** Eight trials from the psychology laboratory: reaction, memory, aim, attention and speed. Today's challenge is on your desk.
- **The Directory.** Renowned tests, from Mensa Norway to the high range, with links to their official sources. Log your results on your profile, marked self-reported.
- **The Forum.** Rooms for psychometrics, puzzles, mathematics, philosophy, science, books and advice. Maths renders with KaTeX: $e^{i\\pi} + 1 = 0$.

Introduce yourself in [Introductions](/forum/c/introductions). Read the [community guidelines](/guidelines) before you post.`,
  },
  {
    category: "notice-board",
    pinned: true,
    title: "How the ranks work",
    tags: ["ranks", "welcome"],
    body: `*An official note from the Upper Echelon staff.*

Your standing is one score out of 1,000, earned three ways:

| Part | Up to | Earned by |
|---|---|---|
| Mind | 500 | Your best result in each of the eight trials, rated 0 to 100 |
| Practice | 250 | Days on which you play, 2.5 points each, up to 100 days |
| Voice | 250 | Upvotes on your writing (2 each) and accepted answers (15 each) |

Six tiers follow: **I Initiate**, **II Associate** (100), **III Fellow** (250), **IV Savant** (450), **V Luminary** (650) and **VI Laureate** (850). A tier, once reached, is kept. The third tier opens the Inner Room; each tier opens a new profile theme.

The full formula is on the [about page](/about#ranks).`,
  },
  {
    category: "notice-board",
    pinned: false,
    title: "The guidelines, in short",
    tags: ["guidelines"],
    body: `*An official note from the Upper Echelon staff.*

1. Argue hard about ideas; be gentle with people.
2. No harassment, hate or sexual content. Members can be as young as thirteen.
3. Never share answers or hints for live tests.
4. Do not cheat in the Arena. Implausible results are flagged and reviewed.
5. Mark spoilers with \`||double bars||\`.
6. If something is wrong, report it. Reports are private.

The full text: [community guidelines](/guidelines).`,
  },
  {
    category: "introductions",
    pinned: true,
    title: "Introduce yourself",
    tags: ["introductions"],
    body: `*An official thread from the Upper Echelon staff.*

Tell the room who you are, in as much or as little detail as you like: what you are curious about, what you are reading, which trial you found hardest. Please do not share personal details such as your address, school or phone number.`,
  },
];

for (const w of WELCOME) {
  const { data: exists } = await db.from("threads").select("id").eq("author_id", id).eq("title", w.title).maybeSingle();
  if (exists) continue;
  const { data: t, error } = await db
    .from("threads")
    .insert({ category_id: cat(w.category), author_id: id, title: w.title, body: w.body, tags: w.tags, is_official: true })
    .select("id")
    .single();
  if (error) throw error;
  if (w.pinned) await db.from("threads").update({ is_pinned: true }).eq("id", t.id);
  console.log("welcome thread:", w.title);
}

const { data: tests } = await db.from("directory_tests").select("id, name").eq("is_published", true);
for (const test of tests ?? []) {
  const { data: exists } = await db.from("threads").select("id").eq("directory_test_id", test.id).maybeSingle();
  if (exists) continue;
  const { error } = await db.from("threads").insert({
    category_id: cat("test-discussions"),
    author_id: id,
    title: `Discussion: ${test.name}`.slice(0, 140),
    body: `*An official discussion room opened by the Upper Echelon staff.*

The room for **${test.name}**. Share your experience of the test, its norms and its ceiling.

No answers, hints or item discussion: that would spoil the test for everyone and breaks the [community guidelines](/guidelines).`,
    tags: ["directory"],
    directory_test_id: test.id,
    is_official: true,
  });
  if (error) throw error;
}
console.log(`discussion rooms ensured for ${tests?.length ?? 0} tests`);
console.log("staff account ready: @upperechelon");
