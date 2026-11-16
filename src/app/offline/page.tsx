import { Mark } from "@/components/brand/mark";

export const metadata = { title: "Offline" };
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main id="main" className="mx-auto flex min-h-svh w-full max-w-2xl flex-col justify-center px-[var(--gutter)]">
      <Mark size={64} decorative className="text-ink-2" strokeWidth={2.2} />
      <h1 className="mt-10 font-display text-display-l text-ink">You are offline.</h1>
      <p className="mt-6 text-lede text-ink-2">The house will still be here when the connection returns. Try again in a moment.</p>
      <a href="/" className="mt-10 inline-flex h-12 w-fit items-center bg-gold px-6 font-medium text-ground">Try again</a>
    </main>
  );
}
