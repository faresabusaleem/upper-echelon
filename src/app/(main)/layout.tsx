import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getViewer } from "@/lib/auth";
import { notePresence } from "@/lib/presence";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  await notePresence(viewer?.id ?? null);
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
