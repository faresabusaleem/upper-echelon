"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mentionSuggestions, previewAction, saveDraftAction } from "@/app/(main)/forum/actions";
import { prepareImage, uploadImage } from "@/lib/image-client";
import {
  BoldIcon,
  CodeIcon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  QuoteIcon,
  SigmaIcon,
} from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { cn } from "@/lib/utils";

type ToolName = "bold" | "italic" | "link" | "quote" | "list" | "code" | "maths" | "image";
const TOOLS: Array<{ name: ToolName; label: string; icon: React.ReactNode; key?: string }> = [
  { name: "bold", label: "Bold (Ctrl+B)", icon: <BoldIcon size={18} />, key: "b" },
  { name: "italic", label: "Italic (Ctrl+I)", icon: <ItalicIcon size={18} />, key: "i" },
  { name: "link", label: "Link (Ctrl+K)", icon: <LinkIcon size={18} />, key: "k" },
  { name: "quote", label: "Quote", icon: <QuoteIcon size={18} /> },
  { name: "list", label: "List", icon: <ListIcon size={18} /> },
  { name: "code", label: "Code", icon: <CodeIcon size={18} /> },
  { name: "maths", label: "Maths", icon: <SigmaIcon size={18} /> },
  { name: "image", label: "Image", icon: <ImageIcon size={18} /> },
];

type DraftTarget = { threadId?: number | null; categoryId?: number | null; getTitle?: () => string };

/**
 * The house editor: Markdown with a small toolbar, image upload, a rendered preview (the same
 * pipeline as published posts), @mention suggestions, and drafts saved locally and to the account.
 */
export function Editor({
  id,
  name = "body",
  label,
  defaultValue = "",
  placeholder,
  draftKey,
  draft,
  acceptQuotes = false,
  minRows = 8,
  invalid,
  describedBy,
}: {
  id: string;
  name?: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  draftKey?: string;
  draft?: DraftTarget;
  acceptQuotes?: boolean;
  minRows?: number;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [html, setHtml] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const [mention, setMention] = useState<{ query: string; start: number; items: Array<{ username: string; display_name: string }>; index: number } | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const loaded = useRef(false);

  // Restore a local draft after hydration (localStorage is an external store the server cannot see).
  useEffect(() => {
    if (loaded.current || !draftKey) return;
    loaded.current = true;
    let local: string | null = null;
    try {
      local = localStorage.getItem(draftKey);
    } catch {}
    if (local && !defaultValue) setValue(local);
  }, [draftKey, defaultValue]);

  // Autosave: locally at once, to the account after a pause.
  useEffect(() => {
    if (!draftKey) return;
    try {
      if (value) localStorage.setItem(draftKey, value);
      else localStorage.removeItem(draftKey);
    } catch {}
    if (!draft) return;
    const t = setTimeout(async () => {
      if (!value.trim() && !draft.getTitle?.()) return;
      setSaved("saving");
      await saveDraftAction({ threadId: draft.threadId ?? null, categoryId: draft.categoryId ?? null, title: draft.getTitle?.(), body: value });
      setSaved("saved");
    }, 2500);
    return () => clearTimeout(t);
  }, [value, draftKey, draft]);

  useEffect(() => {
    if (!acceptQuotes) return;
    const onQuote = (e: Event) => {
      const { author, text } = (e as CustomEvent<{ author: string; text: string }>).detail;
      const quoted = text
        .trim()
        .split("\n")
        .slice(0, 12)
        .map((l) => `> ${l}`)
        .join("\n");
      setValue((v) => `${v ? `${v.trimEnd()}\n\n` : ""}> @${author} wrote:\n${quoted}\n\n`);
      setTab("write");
      ref.current?.focus();
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    window.addEventListener("ue:quote", onQuote);
    return () => window.removeEventListener("ue:quote", onQuote);
  }, [acceptQuotes]);

  const wrap = useCallback((before: string, after = before, fallback = "") => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const selected = value.slice(s, e) || fallback;
    const next = value.slice(0, s) + before + selected + after + value.slice(e);
    setValue(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + selected.length);
    });
  }, [value]);

  const linePrefix = useCallback((prefix: string) => {
    const el = ref.current;
    if (!el) return;
    const s = el.selectionStart;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    setValue(value.slice(0, lineStart) + prefix + value.slice(lineStart));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + prefix.length, s + prefix.length);
    });
  }, [value]);

  const insertAtCursor = (text: string) => {
    const el = ref.current;
    const s = el?.selectionStart ?? value.length;
    const e = el?.selectionEnd ?? value.length;
    setValue(value.slice(0, s) + text + value.slice(e));
  };

  const onImage = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const res = await uploadImage(await prepareImage(file), "forum");
      const alt = file.name.replace(/\.[^.]+$/, "").replace(/[[\]]/g, "").slice(0, 60) || "image";
      insertAtCursor(`\n![${alt}](${res.url})\n`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const updateMention = async (text: string, caret: number) => {
    const before = text.slice(0, caret);
    const m = before.match(/(?:^|[^A-Za-z0-9_@/])@([A-Za-z0-9_]{1,20})$/);
    if (!m) return setMention(null);
    const items = await mentionSuggestions(m[1]);
    setMention(items.length ? { query: m[1], start: caret - m[1].length, items, index: 0 } : null);
  };

  const pickMention = (username: string) => {
    if (!mention) return;
    const el = ref.current;
    const end = mention.start + mention.query.length;
    const next = `${value.slice(0, mention.start)}${username} ${value.slice(end)}`;
    setValue(next);
    setMention(null);
    requestAnimationFrame(() => {
      const pos = mention.start + username.length + 1;
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  };

  const runTool = (name: ToolName) => {
    switch (name) {
      case "bold": return wrap("**", "**", "bold");
      case "italic": return wrap("*", "*", "italic");
      case "link": return wrap("[", "](https://)", "text");
      case "quote": return linePrefix("> ");
      case "list": return linePrefix("- ");
      case "code": return wrap("\n```\n", "\n```\n", "code");
      case "maths": return wrap("$", "$", "x^2");
      case "image": return fileRef.current?.click();
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-panel-2 px-1.5 py-1">
        <div role="tablist" aria-label={`${label} mode`} className="flex">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={async () => {
                setTab(t);
                if (t === "preview") setHtml(value.trim() ? await previewAction(value) : "<p>Nothing to preview.</p>");
              }}
              className={cn("h-9 px-3 text-small", tab === t ? "bg-panel text-ink" : "text-muted hover:text-ink")}
            >
              {t === "write" ? "Write" : "Preview"}
            </button>
          ))}
        </div>
        {tab === "write" && (
          <div className="flex flex-wrap" role="toolbar" aria-label="Formatting">
            {TOOLS.map((t) => (
              <button
                key={t.name}
                type="button"
                title={t.label}
                aria-label={t.label}
                onClick={() => runTool(t.name)}
                disabled={t.name === "image" && uploading}
                className="inline-flex size-9 items-center justify-center text-ink-2 hover:bg-panel hover:text-ink disabled:opacity-40"
              >
                {t.icon}
              </button>
            ))}
          </div>
        )}
      </div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <textarea
          ref={ref}
          id={id}
          name={name}
          value={value}
          rows={minRows}
          maxLength={20000}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          hidden={tab !== "write"}
          onChange={(e) => {
            setValue(e.target.value);
            void updateMention(e.target.value, e.target.selectionStart);
          }}
          onKeyDown={(e) => {
            if (mention) {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                const d = e.key === "ArrowDown" ? 1 : -1;
                setMention({ ...mention, index: (mention.index + d + mention.items.length) % mention.items.length });
                return;
              }
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                pickMention(mention.items[mention.index].username);
                return;
              }
              if (e.key === "Escape") return setMention(null);
            }
            if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
              const tool = TOOLS.find((t) => t.key === e.key.toLowerCase());
              if (tool) {
                e.preventDefault();
                runTool(tool.name);
              }
            }
          }}
          onPaste={(e) => {
            const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
            if (file) {
              e.preventDefault();
              void onImage(file);
            }
          }}
          className="w-full resize-y border border-panel-3 bg-panel px-4 py-3 font-sans leading-relaxed text-ink placeholder:text-faint focus:border-gold-deep focus:outline-none aria-[invalid=true]:border-danger"
        />
        {mention && tab === "write" && (
          <ul role="listbox" aria-label="Mention a member" className="absolute left-3 top-full z-20 mt-1 w-64 bg-panel-2 p-1 shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
            {mention.items.map((m, i) => (
              <li key={m.username} role="option" aria-selected={i === mention.index}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pickMention(m.username);
                  }}
                  className={cn("w-full px-3 py-2 text-left", i === mention.index ? "bg-panel-3 text-ink" : "text-ink-2")}
                >
                  @{m.username} <span className="text-small text-muted">{m.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {tab === "preview" && (
          <div className="prose-ue min-h-40 max-w-none bg-panel px-4 py-3" dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-2 text-micro text-muted">
        <span>
          Markdown, $maths$, @mentions, ||spoilers||. Paste or attach images.{uploading && " Uploading image…"}
        </span>
        <span aria-live="polite">
          {saved === "saving" ? "Saving draft…" : saved === "saved" ? "Draft saved" : ""}
          {value.length > 15000 && ` · ${value.length.toLocaleString("en-GB")}/20,000`}
        </span>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void onImage(f);
        }}
      />
      {error && <Notice tone="error" className="mt-2">{error}</Notice>}
    </div>
  );
}
