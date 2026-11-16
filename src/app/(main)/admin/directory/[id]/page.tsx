import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TestForm } from "@/components/mod/test-form";

export default async function EditTestPage({ params }: PageProps<"/admin/directory/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("directory_tests").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return (
    <div>
      <Link href="/admin/directory" className="text-small text-muted hover:text-ink">All entries</Link>
      <h2 className="mt-3 font-display text-display-s text-ink">{data.name}</h2>
      <div className="mt-6"><TestForm test={data as unknown as Record<string, string | number | boolean | null>} /></div>
    </div>
  );
}
