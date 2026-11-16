import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GAMES, dailyGame } from "@/lib/games/catalog";
import { TIERS } from "@/lib/tiers";
import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/mark";
import { LandingStage } from "@/components/landing/stage";
import { ArenaTabs } from "@/components/landing/arena-tabs";
import { ReactionGame } from "@/components/arena/games/reaction";
import { SiteFooter } from "@/components/layout/site-footer";
import { PictureCredits } from "@/components/landing/credits";

const FORUM_BLOCKS = [
  {
    title: "Measurement",
    image: { src: "/images/archive/chronoscope-600.webp", alt: "Detail of a brass chronoscope dial." },
    lines: [
      "IQ and psychometrics, argued with care",
      "One room for each test in the Directory",
      "Norms, ceilings and what a score cannot say",
      "No answers to live tests, ever",
    ],
  },
  {
    title: "Problems",
    image: null,
    lines: [
      "Puzzles and riddles, with spoilers marked",
      "Mathematics, typeset properly in KaTeX",
      "Proofs welcome; elegance admired",
      "Polls when a question needs a show of hands",
    ],
  },
  {
    title: "Ideas",
    image: { src: "/images/archive/socrates-600.webp", alt: "A marble head of Socrates." },
    lines: ["Philosophy: steelman before you strike", "Science: papers, methods, open questions", "Books worth the hours", "Mentions, quotes and follow-ups that land"],
  },
  {
    title: "Counsel",
    image: null,
    lines: [
      "Advice and experience on study and work",
      "Mark the reply that actually helped",
      "Introductions, so the room knows you",
      "Off-topic, within the guidelines",
    ],
  },
  {
    title: "The Inner Room",
    image: { src: "/images/archive/staircase-600.webp", alt: "A spiral staircase rising towards a skylight." },
    lines: ["Open from the third tier, Fellow", "Quieter, slower, closer", "Earned through play, practice and help", "Never bought"],
  },
];

export default async function Landing() {
  const viewer = await getViewer();
  if (viewer?.profile.onboarded_at) redirect("/home");

  const supabase = await createClient();
  const { data: tests } = await supabase
    .from("directory_tests")
    .select("slug, name, author, organisation, cost, is_free, supervised, link_status")
    .eq("is_published", true)
    .order("position");
  const listed = (tests ?? []).filter((t) => t.link_status === "ok");
  const groups = [
    { title: "Free to take", items: listed.filter((t) => t.is_free).slice(0, 4) },
    { title: "Supervised", items: listed.filter((t) => t.supervised).slice(0, 3) },
    { title: "High range, by post", items: listed.filter((t) => !t.is_free && !t.supervised && t.cost).slice(0, 5) },
  ].filter((g) => g.items.length > 0);
  const today = GAMES[dailyGame()];

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:bg-gold focus:px-4 focus:py-2 focus:text-ground"
      >
        Skip to content
      </a>
      <main id="main" className="relative">
        {/* ------------------------------------------------------------------ split stage */}
        <div className="relative lg:grid lg:grid-cols-[47%_53%]">
          <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-6 pt-6 lg:hidden">
            <span className="bg-ground/80 px-2 py-1.5"><Wordmark compact /></span>
            <Link href="/login" className="bg-ground px-3 py-2 text-small text-ink">Sign in</Link>
          </div>
          <aside className="relative h-[58svh] p-3 lg:sticky lg:top-0 lg:h-svh lg:p-5" aria-label="Pictures">
            <LandingStage />
          </aside>

          <div className="relative">
            {/* Hero */}
            <section data-stage="plate" className="relative flex min-h-[auto] flex-col lg:min-h-svh">
              <header className="absolute inset-x-0 top-0 z-30 hidden items-center justify-end gap-7 px-8 pt-7 text-[0.9375rem] lg:flex">
                <Link href="/arena" className="text-ink-2 hover:text-ink">Arena</Link>
                <Link href="/directory" className="text-ink-2 hover:text-ink">Directory</Link>
                <Link href="/forum" className="text-ink-2 hover:text-ink">Forum</Link>
                <Link href="/login" className="text-ink-2 hover:text-ink">Sign in</Link>
                <ButtonLink href="/join" size="sm">Begin your initiation</ButtonLink>
              </header>

              <div className="flex flex-1 flex-col justify-center px-[var(--gutter)] pt-8 lg:items-center lg:pt-0">
                <div className="max-w-[26ch] lg:-mt-[12svh]">
                  <p className="text-[1.25rem] leading-snug text-ink sm:text-[1.5rem]">
                    A quiet society for minds that like to be tested, and to be argued with.
                  </p>
                  <div className="mt-8 flex flex-wrap items-center gap-5">
                    <ButtonLink href="/join" size="lg">Begin your initiation</ButtonLink>
                    <Link href="#arena" className="text-ink-2 underline hover:text-ink">Try a trial first</Link>
                  </div>
                </div>
              </div>

              <h1 className="wordmark-scale pointer-events-none relative z-20 px-[var(--gutter)] pb-6 pt-10 font-display text-[19vw] font-light lowercase leading-[0.82] tracking-[-0.045em] text-ink lg:absolute lg:bottom-10 lg:left-[-12vw] lg:right-0 lg:whitespace-nowrap lg:px-0 lg:pb-0 lg:pr-8 lg:text-right lg:text-[9.6vw]">
                <span className="block lg:inline">upper</span> <span className="block lg:inline">echelon</span>
              </h1>
            </section>

            {/* Intro: a narrow column of plain statements */}
            <section data-stage="plate" aria-label="What the society is" className="px-[var(--gutter)] pb-40 pt-20 lg:pl-[12%] lg:pt-28">
              <div className="flex max-w-[23rem] flex-col gap-5 text-[1rem] leading-relaxed text-ink-2">
                <p data-reveal className="font-medium text-ink">
                  Upper Echelon is a society for people who enjoy thinking hard and being measured honestly.
                </p>
                <p data-reveal style={{ ["--reveal-i" as string]: 1 }}>
                  There is no entrance exam and no fee. Anyone of thirteen or older may join. What you become here is
                  earned.
                </p>
                <p data-reveal style={{ ["--reveal-i" as string]: 2 }}>
                  Eight trials of the mind, timed to the millisecond. A catalogue of the tests serious people take,
                  linked to the source and never copied. A forum where an argument is judged by its quality, not its
                  volume.
                </p>
                <p data-reveal style={{ ["--reveal-i" as string]: 3 }}>
                  Your standing rises with what you do: the trials you master, the days you return, the help you give.
                  Six tiers, from Initiate to Laureate. Each opens something the last did not.
                </p>
                <p data-reveal style={{ ["--reveal-i" as string]: 4 }}>
                  We keep it quiet on purpose.{" "}
                  <Link href="/about" className="text-ink underline hover:text-gold-bright">
                    Read about the society
                  </Link>
                </p>
              </div>
            </section>

            {/* The Arena: spare text, the live trial */}
            <section id="arena" data-stage="arena" aria-labelledby="arena-h" className="px-[var(--gutter)] pb-40 lg:px-14">
              <h2 id="arena-h" data-reveal className="font-display text-display-l text-ink">
                The Arena
              </h2>
              <p data-reveal style={{ ["--reveal-i" as string]: 1 }} className="mt-6 max-w-[38ch] text-lede text-ink-2">
                Eight trials from the psychology laboratory, timed with your browser’s high-resolution clock, checked
                on our side, and set against every other member.
              </p>
              <div data-reveal style={{ ["--reveal-i" as string]: 2 }} className="mt-12">
                <ArenaTabs />
              </div>
              <div data-reveal style={{ ["--reveal-i" as string]: 3 }} className="mt-14">
                <p className="mb-4 text-small text-muted">Try one now. Nothing is saved until you join.</p>
                <ReactionGame isMember={false} compact />
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Link
                  href="/arena"
                  className="flex h-[72px] items-center justify-between bg-ink px-6 font-medium text-ground transition-colors hover:bg-white"
                >
                  Enter the Arena <span aria-hidden>→</span>
                </Link>
                <Link
                  href={`/arena/${today.slug}`}
                  className="flex h-[72px] items-center justify-between bg-panel-2 px-6 text-ink transition-colors hover:bg-panel-3"
                >
                  Today: {today.name} <span aria-hidden>→</span>
                </Link>
              </div>
            </section>

            {/* The Directory: a printed sheet */}
            <section data-stage="directory" aria-labelledby="dir-h" className="bg-sunk px-[var(--gutter)] py-28 lg:px-14">
              <div data-reveal className="mx-auto max-w-[40rem] bg-ink px-6 py-14 text-ground sm:px-16">
                <h2 id="dir-h" className="text-center font-display text-[clamp(2.25rem,3.4vw,3rem)] leading-none text-ground">
                  The Directory
                </h2>
                <p className="mx-auto mt-4 max-w-[34ch] text-center text-[0.9375rem] leading-relaxed text-[#3a3833]">
                  Renowned tests, catalogued with care. We host no questions: every entry leads to its official
                  source.
                </p>
                {groups.map((group) => (
                  <div key={group.title} className="mt-14">
                    <h3 className="text-center font-display text-[1.375rem] text-ground">{group.title}</h3>
                    <ul className="mx-auto mt-6 flex max-w-[26.25rem] flex-col gap-4">
                      {group.items.map((t) => (
                        <li key={t.slug}>
                          <Link href={`/directory/${t.slug}`} className="group block">
                            <span className="flex items-baseline justify-between gap-6 text-[1.0625rem]">
                              <span className="group-hover:underline">{t.name}</span>
                              <span className="tabular shrink-0">{t.is_free ? "Free" : shortCost(t.cost)}</span>
                            </span>
                            <span className="block text-[0.875rem] text-[#4a4741]">
                              {t.organisation && t.organisation !== t.author ? `${t.author}, ${t.organisation}` : t.author}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <p className="mt-14 text-center text-[0.9375rem] leading-relaxed text-[#3a3833]">
                  Log your result on your profile, marked self-reported.
                  <br />
                  Hide it whenever you like.
                </p>
                <div className="mt-8 flex justify-center">
                  <Link href="/directory" className="inline-flex h-12 items-center bg-ground px-6 font-medium text-ink hover:bg-panel">
                    Open the Directory
                  </Link>
                </div>
              </div>
            </section>

            {/* The Forum: pinned heading, passing rows */}
            <section data-stage="forum" aria-labelledby="forum-h" className="px-[var(--gutter)] py-36 lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-10 lg:px-14">
              <div>
                <h2 id="forum-h" className="sticky top-0 z-10 bg-ground py-3 font-display text-[clamp(2.75rem,5vw,4.5rem)] leading-none text-ink lg:top-10 lg:bg-transparent">
                  The Forum
                </h2>
              </div>
              <div className="mt-10 flex flex-col gap-24 lg:mt-3">
                {FORUM_BLOCKS.map((block, i) => (
                  <article key={block.title} data-reveal>
                    <h3 className="font-display text-[1.75rem] leading-tight text-ink">{block.title}</h3>
                    <div className={`mt-5 flex flex-col gap-6 sm:flex-row ${i % 2 ? "sm:flex-row-reverse" : ""}`}>
                      {block.image && (
                        <Image
                          src={block.image.src}
                          alt={block.image.alt}
                          width={200}
                          height={266}
                          sizes="200px"
                          className="aspect-[4/3] w-full shrink-0 object-cover sm:aspect-[3/4] sm:w-[8.5rem]"
                        />
                      )}
                      <ul className="flex flex-col gap-3.5 text-[1.0625rem] text-ink-2">
                        {block.lines.map((l) => (
                          <li key={l}>{l}</li>
                        ))}
                      </ul>
                    </div>
                  </article>
                ))}
                <div>
                  <ButtonLink href="/forum" variant="secondary">
                    Read the Forum
                  </ButtonLink>
                </div>
              </div>
            </section>

            {/* The ladder: an itinerary slip */}
            <section data-stage="ladder" aria-labelledby="ladder-h" className="bg-raised px-[var(--gutter)] py-32 lg:px-14">
              <div className="grid gap-12 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div data-reveal>
                  <h2 id="ladder-h" className="font-display text-[clamp(2.5rem,4.4vw,4.25rem)] leading-none text-ink">
                    The ladder
                  </h2>
                  <p className="mt-6 max-w-[30ch] text-ink-2">
                    <em>Échelon</em> is French for the rung of a ladder. Your standing is one score out of 1,000, earned
                    three ways and never bought.
                  </p>
                  <Link href="/about#ranks" className="mt-6 inline-block text-ink underline hover:text-gold-bright">
                    How the score is computed
                  </Link>
                </div>
                <div
                  data-reveal
                  style={{ ["--reveal-i" as string]: 1, clipPath: "polygon(0 0,100% 0,100% calc(100% - 10px),95% 100%,90% calc(100% - 10px),85% 100%,80% calc(100% - 10px),75% 100%,70% calc(100% - 10px),65% 100%,60% calc(100% - 10px),55% 100%,50% calc(100% - 10px),45% 100%,40% calc(100% - 10px),35% 100%,30% calc(100% - 10px),25% 100%,20% calc(100% - 10px),15% 100%,10% calc(100% - 10px),5% 100%,0 calc(100% - 10px))" }}
                  className="w-full max-w-[30rem] bg-ink px-7 pb-12 pt-8 text-[1rem] text-ground"
                >
                  <SlipGroup
                    title="Three ways to rise"
                    rows={[
                      ["Mind: your best in each trial", "500"],
                      ["Practice: days you return", "250"],
                      ["Voice: upvotes and answers", "250"],
                    ]}
                  />
                  <SlipGroup
                    title="Six tiers"
                    rows={TIERS.map((t) => [`${t.numeral} · ${t.name}`, t.threshold.toLocaleString("en-GB")])}
                  />
                  <div className="mt-8 flex h-11 items-center justify-between bg-ground px-4 text-ink">
                    <span>Your standing</span>
                    <span className="tabular">of 1,000</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Closing: breaks the split and runs full width */}
        <section aria-labelledby="cta-h" className="relative grid min-h-[90svh] bg-sunk lg:grid-cols-2">
          <div className="relative min-h-[50svh] overflow-hidden">
            <Image
              src="/brand/engraving-ivory.svg"
              alt=""
              fill
              unoptimized
              sizes="50vw"
              className="object-contain p-[10%] opacity-80 motion-safe:animate-[drift_30s_ease-in-out_infinite_alternate]"
            />
          </div>
          <div className="flex flex-col justify-end px-[var(--gutter)] pb-20 pt-10 lg:pb-[18svh] lg:pr-16">
            <h2 id="cta-h" data-reveal className="font-display text-[clamp(2.25rem,3.6vw,3.5rem)] font-light leading-[1.02] text-ink">
              You were not invited by accident.
            </h2>
            <p data-reveal style={{ ["--reveal-i" as string]: 1 }} className="mt-6 max-w-[40ch] text-[1.0625rem] text-ink-2">
              The initiation takes two minutes: a name, a likeness, the subjects you care about and, if you wish, a
              first trial.
            </p>
            <div data-reveal style={{ ["--reveal-i" as string]: 2 }} className="mt-10">
              <Link href="/join" className="inline-flex h-[52px] items-center bg-ink px-7 font-medium text-ground transition-colors hover:bg-white">
                Begin your initiation
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter credits={<PictureCredits />} />
    </>
  );
}

/** "US$29.99 per session" → "US$29.99"; "€10 or US$15" → "€10". */
function shortCost(cost: string | null) {
  const m = cost?.match(/^(?:US\$|€|£)?\s?\d[\d.,]*/);
  return m ? m[0] : "See source";
}

function SlipGroup({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div className="mt-7 first:mt-0">
      <p className="font-semibold">{title}</p>
      <ul className="mt-3 flex flex-col gap-2">
        {rows.map(([label, value]) => (
          <li key={label} className="flex items-baseline gap-3">
            <span>{label}</span>
            <span aria-hidden className="mb-1 flex-1 border-b-[3px] border-dotted border-[#8a857b]" />
            <span className="tabular">{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
