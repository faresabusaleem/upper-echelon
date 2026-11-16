import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { DIFFICULTY } from "@/lib/directory";
import { Empty } from "@/components/ui/empty";
import { ExternalIcon, SearchIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "The Directory",
  description: "A curated catalogue of renowned intelligence tests, from Mensa Norway to the high-range tests. Links to official sources only.",
};

export default async function DirectoryPage({ searchParams }: PageProps<"/directory">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const difficulty = typeof sp.difficulty === "string" && sp.difficulty in DIFFICULTY ? sp.difficulty : null;
  const price = sp.price === "free" || sp.price === "paid" ? sp.price : null;
  const supabase = await createClient();
  let query = supabase.from("directory_tests").select("*").eq("is_published", true).order("position");
  if (q) query = query.textSearch("search", q, { type: "websearch", config: "english" });
  if (difficulty) query = query.eq("difficulty", difficulty);
  if (price === "free") query = query.eq("is_free", true);
  if (price === "paid") query = query.not("is_free", "is", true);
  const { data: tests } = await query;

  const link = (o: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const merged = { q: q || null, difficulty, price, ...o };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/directory?${s}` : "/directory";
  };
  const chip = (on: boolean) => cn("px-3 py-2 text-small", on ? "bg-gold text-ground" : "bg-panel text-ink-2 hover:bg-panel-2 hover:text-ink");

  return (
    <div className="mx-auto w-full max-w-[96rem] px-[var(--gutter)] pb-10 pt-12 sm:pt-20">
      <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <div>
          <h1 className="font-display text-display-xl text-ink">The Directory</h1>
          <p className="mt-6 max-w-[50ch] text-lede text-ink-2">
            Renowned tests, catalogued with care. We host no questions: every entry leads to its official source. Log
            your result on your profile, marked self-reported.
          </p>
        </div>
        <form role="search" action="/directory" className="flex w-full gap-2">
          <label htmlFor="dir-q" className="sr-only">Search the Directory</label>
          <input
            id="dir-q"
            name="q"
            defaultValue={q}
            placeholder="Search by name, author or what it measures"
            className="h-12 min-w-0 flex-1 border border-panel-3 bg-panel px-4 text-ink placeholder:text-faint focus:border-gold-deep focus:outline-none"
          />
          {difficulty && <input type="hidden" name="difficulty" value={difficulty} />}
          {price && <input type="hidden" name="price" value={price} />}
          <button className="inline-flex h-12 w-12 items-center justify-center bg-panel-2 text-ink hover:bg-panel-3" aria-label="Search">
            <SearchIcon />
          </button>
        </form>
      </div>

      <div className="mt-10 flex flex-wrap gap-2" aria-label="Filters">
        <Link href={link({ difficulty: null })} className={chip(!difficulty)}>Any difficulty</Link>
        {Object.entries(DIFFICULTY).map(([k, v]) => (
          <Link key={k} href={link({ difficulty: k })} className={chip(difficulty === k)}>{v}</Link>
        ))}
        <span className="w-4" aria-hidden />
        <Link href={link({ price: null })} className={chip(!price)}>Any price</Link>
        <Link href={link({ price: "free" })} className={chip(price === "free")}>Free</Link>
        <Link href={link({ price: "paid" })} className={chip(price === "paid")}>With a fee</Link>
      </div>

      {tests && tests.length > 0 ? (
        <ol className="mt-12 flex flex-col">
          {tests.map((t, i) => (
            <li key={t.id} data-reveal style={{ ["--reveal-i" as string]: i % 4 }} className="grid gap-x-10 gap-y-3 py-8 even:bg-raised sm:px-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,0.9fr)]">
              <div>
                <h2 className="font-display text-display-s leading-tight">
                  <Link href={`/directory/${t.slug}`} className="text-ink hover:text-gold-bright">{t.name}</Link>
                </h2>
                <p className="mt-1 text-small text-muted">
                  {t.author}
                  {t.organisation && t.organisation !== t.author ? `, ${t.organisation}` : ""}
                </p>
                {t.link_status !== "ok" && <p className="mt-2 text-small text-danger">Official page currently unreachable</p>}
              </div>
              <p className="text-ink-2">{t.measures}</p>
              <div className="flex flex-col gap-4 text-small">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
                  <div><dt className="text-muted">Difficulty</dt><dd className="text-ink">{DIFFICULTY[t.difficulty]}</dd></div>
                  <div><dt className="text-muted">Cost</dt><dd className="text-ink">{t.is_free ? "Free" : (t.cost ?? "Not stated")}</dd></div>
                  <div><dt className="text-muted">Items</dt><dd className="text-ink">{t.item_count ?? "Not stated"}</dd></div>
                  <div><dt className="text-muted">Time</dt><dd className="text-ink">{t.duration ?? "Not stated"}</dd></div>
                </dl>
                <div className="flex gap-5">
                  <Link href={`/directory/${t.slug}`} className="text-ink underline hover:text-gold-bright">Details</Link>
                  <a href={t.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-ink underline hover:text-gold-bright">
                    Official test <ExternalIcon size={16} />
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <Empty className="mt-12" title="Nothing matches." action={<Link href="/directory" className="text-ink underline">Clear the search</Link>}>
          Try fewer words, or another filter.
        </Empty>
      )}
      <p className="mt-12 max-w-[70ch] text-small text-muted">
        Facts are taken from each test’s official page and were checked in November 2026. Difficulty is an editorial
        estimate. Upper Echelon is not affiliated with any test listed here. Know of a renowned test that belongs here?
        Suggest it in <Link href="/forum/c/test-discussions" className="text-ink underline">Test Discussions</Link>.
      </p>
    </div>
  );
}
