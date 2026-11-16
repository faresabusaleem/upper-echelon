import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DIFFICULTY, defaultScale } from "@/lib/directory";
import { LogResultForm, MyResults } from "@/components/directory/log-result";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { ExternalIcon } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { formatDate } from "@/lib/utils";

type Props = PageProps<"/directory/[slug]">;

async function load(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("directory_tests").select("*").eq("slug", slug).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await load((await params).slug);
  if (!t) return { title: "Not found" };
  return { title: t.name, description: `${t.name} by ${t.author}. ${t.measures}`.slice(0, 160) };
}

export default async function TestPage({ params }: Props) {
  const t = await load((await params).slug);
  if (!t) notFound();
  const viewer = await getViewer();
  const supabase = await createClient();
  const [{ data: discussion }, { data: mine }, { count }] = await Promise.all([
    supabase.from("threads").select("id, title, reply_count").eq("directory_test_id", t.id).is("removed_at", null).order("created_at").limit(1).maybeSingle(),
    viewer
      ? supabase.from("test_results").select("id, score, scale, taken_on, is_hidden, created_at").eq("test_id", t.id).eq("user_id", viewer.id).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.from("test_results").select("id", { count: "exact", head: true }).eq("test_id", t.id),
  ]);

  const facts: Array<[string, string | number | null]> = [
    ["Author", t.author],
    ["Organisation", t.organisation],
    ["What it measures", t.measures],
    ["Format", t.format],
    ["Items", t.item_count],
    ["Difficulty (editorial)", DIFFICULTY[t.difficulty]],
    ["Ceiling", t.ceiling],
    ["Time", t.duration],
    ["Cost", t.is_free ? "Free" : t.cost],
    ["Supervised", t.supervised ? "Yes" : "No"],
    ["Scores reported as", t.score_scale],
  ];

  return (
    <div className="mx-auto w-full max-w-[96rem] px-[var(--gutter)] pb-10 pt-10 sm:pt-14">
      <nav aria-label="Breadcrumb" className="text-small text-muted">
        <Link href="/directory" className="hover:text-ink">The Directory</Link>
      </nav>
      <div className="mt-4 grid gap-14 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <h1 className="font-display text-display-l text-ink">{t.name}</h1>
          <p className="mt-4 max-w-[56ch] text-lede text-ink-2">{t.measures}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a href={t.url} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "lg")}>
              Take the official test <ExternalIcon size={18} />
            </a>
            {discussion && (
              <ButtonLink href={`/forum/t/${discussion.id}`} variant="secondary" size="lg">
                Discussion · {discussion.reply_count}
              </ButtonLink>
            )}
          </div>
          {t.link_status !== "ok" && (
            <Notice tone="warning" className="mt-6" title="The official page could not be reached.">
              It may have moved. If you know where the test now lives, tell the staff in the discussion.
            </Notice>
          )}
          <dl className="mt-14 grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt className="text-small text-muted">{k}</dt>
                <dd className="mt-1 text-ink">{v == null || v === "" ? <span className="text-muted">Not stated</span> : v}</dd>
              </div>
            ))}
          </dl>
          {t.notes && <p className="mt-10 max-w-[64ch] bg-raised px-5 py-4 text-ink-2">{t.notes}</p>}
          <p className="mt-8 text-small text-muted">
            Checked against the official page; last updated {formatDate(t.updated_at)}. We host no questions and are not
            affiliated with the author. {count ? `${count} result${count === 1 ? "" : "s"} logged by members.` : ""}
          </p>
        </div>

        <aside aria-labelledby="log-h" className="bg-raised p-6 sm:p-8 lg:self-start">
          <h2 id="log-h" className="font-display text-display-s text-ink">Log your result</h2>
          {viewer?.profile.onboarded_at ? (
            <>
              <p className="mt-2 text-small text-muted">Shown on your profile as self-reported. You can hide it at any time.</p>
              <div className="mt-6"><LogResultForm testId={t.id} slug={t.slug} scale={defaultScale(t.score_scale)} /></div>
              {mine && mine.length > 0 && (
                <div className="mt-10">
                  <h3 className="font-display text-xl text-ink">Your results</h3>
                  <MyResults results={mine.map((r) => ({ ...r, score: Number(r.score) }))} slug={t.slug} />
                </div>
              )}
            </>
          ) : (
            <div className="mt-4 flex flex-col items-start gap-4">
              <p className="text-ink-2">Members can keep their results from this test on their profile.</p>
              <ButtonLink href={`/login?next=/directory/${t.slug}`} variant="secondary">Sign in to log a result</ButtonLink>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
