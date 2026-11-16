import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { serverEnv } from "@/lib/env.server";
import { siteUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

let transporter: Transporter | null | undefined;

function getTransport(): Transporter | null {
  if (transporter !== undefined) return transporter;
  if (!serverEnv.SMTP_HOST || !serverEnv.SMTP_PORT) {
    transporter = null;
    return null;
  }
  transporter = nodemailer.createTransport({
    host: serverEnv.SMTP_HOST,
    port: serverEnv.SMTP_PORT,
    secure: serverEnv.SMTP_SECURE === "true",
    auth: serverEnv.SMTP_USER ? { user: serverEnv.SMTP_USER, pass: serverEnv.SMTP_PASS } : undefined,
  });
  return transporter;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** The house email: dark, plain, one link. Mirrors the Supabase auth templates. */
export function renderEmail({ heading, body, cta, href }: { heading: string; body: string; cta: string; href: string }) {
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#0b0b0a;color:#edeae3;font-family:Georgia,serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0a"><tr><td align="center" style="padding:48px 20px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td style="font-size:15px;color:#a39f96;padding-bottom:36px">Upper Echelon</td></tr>
<tr><td style="font-size:28px;line-height:1.2;padding-bottom:18px">${escapeHtml(heading)}</td></tr>
<tr><td style="font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#d6d2c9;padding-bottom:28px">${escapeHtml(body)}</td></tr>
<tr><td style="padding-bottom:32px"><a href="${href}" style="display:inline-block;background:#c2a15f;color:#0b0b0a;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:13px 24px">${escapeHtml(cta)}</a></td></tr>
<tr><td style="font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#a39f96">You receive this because of your notification settings. Change them at ${siteUrl}/settings/notifications</td></tr>
</table></td></tr></table></body></html>`;
  const text = `${heading}\n\n${body}\n\n${cta}: ${href}\n\nChange your email preferences at ${siteUrl}/settings/notifications`;
  return { html, text };
}

type OutboxRow = { id: number; user_id: string; kind: string; payload: Record<string, unknown> };

async function compose(row: OutboxRow, actorName: string | null) {
  const p = row.payload;
  const title = typeof p.title === "string" ? p.title : "a thread";
  const threadHref = p.thread_id ? `${siteUrl}/forum/t/${p.thread_id}${p.post_id ? `#r${p.post_id}` : ""}` : `${siteUrl}/forum`;
  const who = actorName ?? "A member";
  switch (row.kind) {
    case "reply":
      return { subject: `New reply in “${title}”`, heading: "A new reply.", body: `${who} replied in “${title}”.`, cta: "Read the reply", href: threadHref };
    case "mention":
      return { subject: `${who} mentioned you`, heading: "You were mentioned.", body: `${who} mentioned you in “${title}”.`, cta: "See the mention", href: threadHref };
    case "follow":
      return { subject: `${who} now follows you`, heading: "A new follower.", body: `${who} now follows you on Upper Echelon.`, cta: "View their profile", href: `${siteUrl}/notifications` };
    case "solution":
      return { subject: "Your reply was marked as the answer", heading: "Your answer helped.", body: `Your reply in “${title}” was marked as the solution.`, cta: "See the thread", href: threadHref };
    case "tier":
      return { subject: `You have reached ${String(p.name ?? "a new tier")}`, heading: `Welcome to ${String(p.name ?? "a new tier")}.`, body: "Your standing in the Echelon has risen. New marks and themes are now open to you.", cta: "See your standing", href: `${siteUrl}/home` };
    case "achievement":
      return { subject: `Achievement: ${String(p.name ?? "")}`, heading: String(p.name ?? "An achievement."), body: "You earned a new mark for your profile.", cta: "View your profile", href: `${siteUrl}/home` };
    case "message":
      return { subject: `${who} sent you a message`, heading: "A private message.", body: `${who} wrote to you. Messages are only readable on the site.`, cta: "Open your messages", href: `${siteUrl}/messages/${String(p.conversation_id ?? "")}` };
    case "moderation":
      return { subject: "A note from the moderators", heading: "A note from the moderators.", body: "A moderator has taken an action on your account or content. Sign in to read the details.", cta: "Read the note", href: `${siteUrl}/notifications` };
    default:
      return null;
  }
}

/**
 * Sends pending notification emails (best effort). Called after mutations via `after()` and once a
 * day by the cron route. Without SMTP configuration, pending emails are marked as skipped.
 */
export async function flushEmailOutbox(limit = 20): Promise<{ sent: number; skipped: number; failed: number }> {
  const stats = { sent: 0, skipped: 0, failed: 0 };
  try {
    const admin = createAdminClient();
    const { data: rows } = await admin
      .from("email_outbox")
      .select("id, user_id, kind, payload")
      .eq("status", "pending")
      .order("created_at")
      .limit(limit);
    if (!rows?.length) return stats;

    // Claim the rows so concurrent flushes do not double-send.
    const ids = rows.map((r) => r.id);
    const { data: claimed } = await admin
      .from("email_outbox")
      .update({ status: "sending" })
      .in("id", ids)
      .eq("status", "pending")
      .select("id, user_id, kind, payload, attempts");
    const transport = getTransport();

    for (const row of claimed ?? []) {
      const payload = (row.payload ?? {}) as Record<string, unknown>;
      try {
        if (!transport) {
          await admin.from("email_outbox").update({ status: "skipped", last_error: "SMTP not configured" }).eq("id", row.id);
          stats.skipped++;
          continue;
        }
        const [{ data: userRes }, actor] = await Promise.all([
          admin.auth.admin.getUserById(row.user_id),
          typeof payload.actor_id === "string"
            ? admin.from("profiles").select("display_name").eq("id", payload.actor_id).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        const email = userRes?.user?.email;
        const content = await compose({ ...row, payload }, actor.data?.display_name ?? null);
        if (!email || !content) {
          await admin.from("email_outbox").update({ status: "skipped" }).eq("id", row.id);
          stats.skipped++;
          continue;
        }
        const { html, text } = renderEmail(content);
        await transport.sendMail({ from: serverEnv.EMAIL_FROM, to: email, subject: content.subject, html, text });
        await admin.from("email_outbox").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", row.id);
        stats.sent++;
      } catch (err) {
        const attempts = (row.attempts ?? 0) + 1;
        await admin
          .from("email_outbox")
          .update({ status: attempts >= 3 ? "failed" : "pending", attempts, last_error: String(err).slice(0, 500) })
          .eq("id", row.id);
        stats.failed++;
      }
    }
  } catch {
    // Email is best effort; never break the request that triggered it.
  }
  return stats;
}
