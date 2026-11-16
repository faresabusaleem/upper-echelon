"use client";

import { useState, useTransition } from "react";
import { removeImageAction, saveProfileAction } from "@/app/(main)/settings/actions";
import { InterestPicker } from "@/components/auth/interest-picker";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { ImageCropper } from "@/components/ui/image-cropper";
import { SubmitButton } from "@/components/ui/submit-button";
import { GAMES, type GameKind } from "@/lib/games/catalog";
import { THEMES, TIERS, type ProfileTheme } from "@/lib/tiers";
import { cn } from "@/lib/utils";
import { ActionForm, useFieldErrors } from "./action-form";

type Props = {
  profile: {
    username: string;
    display_name: string;
    bio: string | null;
    location: string | null;
    pronouns: string | null;
    interests: string[];
    links: Array<{ label?: string; url?: string }>;
    theme: string;
    tier: number;
    showcase_badges: string[];
    showcase_games: string[];
    avatar_url: string | null;
    banner_url: string | null;
  };
  earned: Array<{ code: string; name: string }>;
  playedGames: GameKind[];
};

export function ProfileSettings(props: Props) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-16">
      <section aria-labelledby="likeness">
        <h2 id="likeness" className="font-display text-display-s text-ink">
          Likeness
        </h2>
        <div className="mt-6 flex flex-col gap-10">
          <div>
            <p className="mb-3 text-small text-ink-2">Portrait</p>
            <ImageCropper kind="avatar" current={props.profile.avatar_url} />
            {props.profile.avatar_url && (
              <Button variant="link" className="mt-3 text-small" disabled={pending} onClick={() => start(async () => void (await removeImageAction("avatar")))}>
                Remove portrait
              </Button>
            )}
          </div>
          <div>
            <p className="mb-3 text-small text-ink-2">Banner</p>
            <ImageCropper kind="banner" current={props.profile.banner_url} />
            {props.profile.banner_url && (
              <Button variant="link" className="mt-3 text-small" disabled={pending} onClick={() => start(async () => void (await removeImageAction("banner")))}>
                Remove banner
              </Button>
            )}
          </div>
        </div>
      </section>
      <ActionForm action={saveProfileAction} className="flex flex-col gap-12">
        <ProfileFields {...props} />
        <div>
          <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}

function ProfileFields({ profile, earned, playedGames }: Props) {
  const errors = useFieldErrors();
  const [interests, setInterests] = useState(profile.interests);
  const [links, setLinks] = useState(() => {
    const l = profile.links.map((x) => ({ label: x.label ?? "", url: x.url ?? "" }));
    while (l.length < 5) l.push({ label: "", url: "" });
    return l.slice(0, 5);
  });
  const [theme, setTheme] = useState(profile.theme);
  const [badges, setBadges] = useState<string[]>(profile.showcase_badges);
  const [games, setGames] = useState<string[]>(profile.showcase_games);

  return (
    <>
      <section aria-labelledby="identity" className="flex flex-col gap-6">
        <h2 id="identity" className="font-display text-display-s text-ink">
          Identity
        </h2>
        <Field label="Display name" htmlFor="display_name" error={errors.display_name}>
          <Input id="display_name" name="display_name" defaultValue={profile.display_name} maxLength={40} required />
        </Field>
        <Field label="Username" htmlFor="username" error={errors.username} hint="Changing it changes your profile address.">
          <Input id="username" name="username" defaultValue={profile.username} maxLength={20} required autoCapitalize="off" />
        </Field>
        <Field label="About you" htmlFor="bio" optional error={errors.bio} hint="Up to 500 characters.">
          <Textarea id="bio" name="bio" defaultValue={profile.bio ?? ""} maxLength={500} />
        </Field>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Location" htmlFor="location" optional>
            <Input id="location" name="location" defaultValue={profile.location ?? ""} maxLength={60} />
          </Field>
          <Field label="Pronouns" htmlFor="pronouns" optional>
            <Input id="pronouns" name="pronouns" defaultValue={profile.pronouns ?? ""} maxLength={30} />
          </Field>
        </div>
      </section>

      <section aria-labelledby="interests-h" className="flex flex-col gap-4">
        <h2 id="interests-h" className="font-display text-display-s text-ink">
          Interests
        </h2>
        <InterestPicker value={interests} onChange={setInterests} />
      </section>

      <section aria-labelledby="links-h" className="flex flex-col gap-4">
        <h2 id="links-h" className="font-display text-display-s text-ink">
          Links
        </h2>
        {errors.links && <p className="text-micro text-danger">{errors.links}</p>}
        {links.map((l, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-[12rem_1fr]">
            <Input
              name="link_label"
              placeholder="Label"
              aria-label={`Link ${i + 1} label`}
              value={l.label}
              maxLength={40}
              onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
            />
            <Input
              name="link_url"
              type="url"
              placeholder="https://"
              aria-label={`Link ${i + 1} address`}
              value={l.url}
              maxLength={300}
              onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
            />
          </div>
        ))}
      </section>

      <section aria-labelledby="theme-h" className="flex flex-col gap-4">
        <h2 id="theme-h" className="font-display text-display-s text-ink">
          Profile theme
        </h2>
        <p className="text-small text-muted">Themes open as you rise through the tiers.</p>
        <input type="hidden" name="theme" value={theme} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(Object.keys(THEMES) as ProfileTheme[]).map((key) => {
            const th = THEMES[key];
            const locked = th.unlock > profile.tier;
            return (
              <button
                key={key}
                type="button"
                disabled={locked}
                aria-pressed={theme === key}
                onClick={() => setTheme(key)}
                className={cn(
                  "flex flex-col items-start gap-2 p-4 text-left transition-colors disabled:cursor-not-allowed",
                  theme === key ? "bg-panel-3" : "bg-panel hover:bg-panel-2",
                )}
                style={{ backgroundColor: theme === key ? undefined : th.wash }}
              >
                <span className="h-1.5 w-10" style={{ backgroundColor: th.accent }} />
                <span className="text-ink">{th.label}</span>
                <span className="text-micro text-muted">{locked ? `Opens at ${TIERS[th.unlock - 1].name}` : theme === key ? "Selected" : "Available"}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="showcase-h" className="flex flex-col gap-4">
        <h2 id="showcase-h" className="font-display text-display-s text-ink">
          Showcase
        </h2>
        <p className="text-small text-muted">Choose up to six marks and four trials to show first on your profile.</p>
        {earned.length === 0 ? (
          <p className="text-ink-2">You have not earned a mark yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {earned.map((a) => {
              const on = badges.includes(a.code);
              return (
                <button
                  key={a.code}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setBadges(on ? badges.filter((b) => b !== a.code) : badges.length >= 6 ? badges : [...badges, a.code])}
                  className={cn("h-10 px-4 text-small", on ? "bg-gold text-ground" : "bg-panel-2 text-ink-2 hover:bg-panel-3")}
                >
                  {a.name}
                </button>
              );
            })}
          </div>
        )}
        {badges.map((b) => (
          <input key={b} type="hidden" name="showcase_badges" value={b} />
        ))}
        {playedGames.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {playedGames.map((g) => {
              const on = games.includes(g);
              return (
                <button
                  key={g}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setGames(on ? games.filter((x) => x !== g) : games.length >= 4 ? games : [...games, g])}
                  className={cn("h-10 px-4 text-small", on ? "bg-gold text-ground" : "bg-panel-2 text-ink-2 hover:bg-panel-3")}
                >
                  {GAMES[g].name}
                </button>
              );
            })}
          </div>
        )}
        {games.map((g) => (
          <input key={g} type="hidden" name="showcase_games" value={g} />
        ))}
      </section>
    </>
  );
}
