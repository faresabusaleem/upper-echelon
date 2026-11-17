"use client";

import Link from "next/link";
import { useTransition } from "react";
import { saveAppearanceAction, saveNotificationsAction, savePrivacyAction } from "@/app/(main)/settings/actions";
import { blockAction, muteAction } from "@/lib/actions/social";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionForm } from "./action-form";

type Vis = "everyone" | "followers" | "only_me";

export function PrivacyForm({
  values,
}: {
  values: { game_stats_visibility: Vis; test_results_visibility: Vis; activity_visibility: Vis; followers_visibility: Vis; dm_policy: string; show_online: boolean };
}) {
  const rows: Array<["game_stats_visibility" | "test_results_visibility" | "activity_visibility" | "followers_visibility", string, string]> = [
    ["game_stats_visibility", "Arena results", "Your bests, history and percentiles. Members who hide them do not appear on leaderboards."],
    ["test_results_visibility", "Logged test results", "Results you log from the Directory. Individual results can also be hidden."],
    ["activity_visibility", "Activity", "Your recent threads, replies and marks on your profile."],
    ["followers_visibility", "Followers and following", "The lists of who you follow and who follows you."],
  ];
  return (
    <ActionForm action={savePrivacyAction}>
      {rows.map(([name, label, hint]) => (
        <Field key={name} label={label} htmlFor={name} hint={hint}>
          <Select id={name} name={name} defaultValue={values[name]}>
            <option value="everyone">Everyone</option>
            <option value="followers">People who follow me</option>
            <option value="only_me">Only me</option>
          </Select>
        </Field>
      ))}
      <Field
        label="Who can message you"
        htmlFor="dm_policy"
        hint="Default: people you follow. Anyone you have written to can always reply. Moderators can always reach you."
      >
        <Select id="dm_policy" name="dm_policy" defaultValue={values.dm_policy}>
          <option value="everyone">Everyone</option>
          <option value="following">People I follow</option>
          <option value="no_one">No one</option>
        </Select>
      </Field>
      <div className="flex flex-col gap-1.5">
        <Checkbox name="show_online" defaultChecked={values.show_online} label="Show me in “Present now” when I am on the site" />
        <p className="pl-7 text-micro text-muted">When off, you are still counted among those present, but your name is not listed.</p>
      </div>
      <div>
        <SubmitButton pendingLabel="Saving…">Save privacy settings</SubmitButton>
      </div>
    </ActionForm>
  );
}

type Person = { id: string; username: string; display_name: string; avatar_url: string | null };

export function PeopleList({ people, mode }: { people: Person[]; mode: "blocked" | "muted" }) {
  const [pending, start] = useTransition();
  if (people.length === 0) return <p className="text-muted">{mode === "blocked" ? "You have not blocked anyone." : "You have not muted anyone."}</p>;
  return (
    <ul className="flex flex-col">
      {people.map((p) => (
        <li key={p.id} className="flex items-center gap-3 py-2">
          <Avatar src={p.avatar_url} name={p.display_name} size={36} />
          <Link href={`/u/${p.username}`} className="min-w-0 flex-1 truncate text-ink hover:text-gold-bright">
            {p.display_name} <span className="text-muted">@{p.username}</span>
          </Link>
          <Button
            variant="quiet"
            size="sm"
            disabled={pending}
            onClick={() => start(async () => void (mode === "blocked" ? await blockAction(p.id, false) : await muteAction(p.id, false)))}
          >
            {mode === "blocked" ? "Unblock" : "Unmute"}
          </Button>
        </li>
      ))}
    </ul>
  );
}

const KINDS: Array<[string, string, boolean]> = [
  ["reply", "Replies in threads you follow", true],
  ["mention", "Mentions", true],
  ["follow", "New followers", true],
  ["solution", "Your reply marked as the answer", true],
  ["tier", "Rising to a new tier", true],
  ["achievement", "New marks", true],
  ["message", "Direct messages", false],
  ["moderation", "Notes from the moderators", false],
];

export function NotificationsForm({ inapp, email }: { inapp: Record<string, boolean>; email: Record<string, boolean> }) {
  return (
    <ActionForm action={saveNotificationsAction}>
      <table className="w-full text-left">
        <caption className="sr-only">Notification preferences</caption>
        <thead className="text-small text-muted">
          <tr>
            <th scope="col" className="pb-3 font-normal">Event</th>
            <th scope="col" className="w-24 pb-3 text-center font-normal">On site</th>
            <th scope="col" className="w-24 pb-3 text-center font-normal">Email</th>
          </tr>
        </thead>
        <tbody>
          {KINDS.map(([k, label, hasInapp]) => (
            <tr key={k} className="even:bg-raised">
              <th scope="row" className="py-3 pl-2 font-normal text-ink">{label}</th>
              <td className="text-center">
                {hasInapp ? (
                  <input type="checkbox" name={`inapp_${k}`} defaultChecked={inapp[k] ?? true} aria-label={`${label} on site`} className="size-4 accent-[var(--color-gold)]" />
                ) : (
                  <span className="text-small text-muted">Always</span>
                )}
              </td>
              <td className="text-center">
                <input type="checkbox" name={`email_${k}`} defaultChecked={email[k] ?? false} aria-label={`${label} by email`} className="size-4 accent-[var(--color-gold)]" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-small text-muted">Message emails are sent at most once every half hour per conversation and never include the text.</p>
      <div>
        <SubmitButton pendingLabel="Saving…">Save preferences</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function AppearanceForm({ values }: { values: { reduced_motion: boolean; grain: boolean; high_contrast: boolean } }) {
  return (
    <ActionForm action={saveAppearanceAction}>
      <Checkbox name="reduced_motion" defaultChecked={values.reduced_motion} label="Reduce motion: no drifting pictures, rising text or animated transitions." />
      <Checkbox name="grain" defaultChecked={values.grain} label="Film grain: a fine texture over the whole site." />
      <Checkbox name="high_contrast" defaultChecked={values.high_contrast} label="High contrast: pure black ground and brighter text." />
      <p className="text-small text-muted">Your device’s own reduced-motion setting is always honoured as well.</p>
      <div>
        <SubmitButton pendingLabel="Saving…">Save appearance</SubmitButton>
      </div>
    </ActionForm>
  );
}
