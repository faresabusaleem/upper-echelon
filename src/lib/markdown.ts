import { unified, type Plugin } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from "rehype-sanitize";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";

/**
 * Forum markdown → safe HTML. GitHub-flavoured markdown, maths via KaTeX, @mentions and ||spoilers||.
 * Raw HTML is never passed through; the output is sanitised before KaTeX renders maths; images are
 * only allowed from our own storage (so posts cannot load tracking pixels); external links open
 * in a new tab with rel="nofollow ugc noopener noreferrer".
 */

type MdNode = { type: string; value?: string; url?: string; children?: MdNode[]; data?: Record<string, unknown> };

const MENTION = /(^|[^A-Za-z0-9_@/])@([A-Za-z0-9_]{3,20})/g;
const SPOILER = /\|\|([^|\n]{1,400})\|\|/g;

function splitText(value: string): MdNode[] {
  const out: MdNode[] = [];
  // Tokenise spoilers first, then mentions inside plain stretches.
  let last = 0;
  const pushText = (text: string) => {
    let i = 0;
    for (const m of text.matchAll(MENTION)) {
      const start = (m.index ?? 0) + m[1].length;
      if (start > i) out.push({ type: "text", value: text.slice(i, start) });
      out.push({
        type: "link",
        url: `/u/${m[2]}`,
        children: [{ type: "text", value: `@${m[2]}` }],
        data: { hProperties: { className: ["mention"] } },
      });
      i = start + m[2].length + 1;
    }
    if (i < text.length) out.push({ type: "text", value: text.slice(i) });
  };
  for (const m of value.matchAll(SPOILER)) {
    const idx = m.index ?? 0;
    if (idx > last) pushText(value.slice(last, idx));
    out.push({
      type: "spoiler",
      children: [{ type: "text", value: m[1] }],
      data: { hName: "span", hProperties: { className: ["spoiler"], tabIndex: 0, title: "Spoiler: select to reveal" } },
    });
    last = idx + m[0].length;
  }
  if (last < value.length) pushText(value.slice(last));
  return out;
}

const remarkMentionsAndSpoilers: Plugin = () => (tree) => {
  const walk = (node: MdNode) => {
    if (!node.children) return;
    if (node.type === "link" || node.type === "linkReference" || node.type === "inlineCode" || node.type === "code") return;
    const next: MdNode[] = [];
    for (const child of node.children) {
      if (child.type === "text" && child.value && (child.value.includes("@") || child.value.includes("||"))) {
        next.push(...splitText(child.value));
      } else {
        walk(child);
        next.push(child);
      }
    }
    node.children = next;
  };
  walk(tree as MdNode);
};

type HNode = { type: string; tagName?: string; properties?: Record<string, unknown>; children?: HNode[]; value?: string };

const storagePrefix = () =>
  `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "")}/storage/v1/object/public/forum/`;

const rehypeHouseRules: Plugin = () => (tree) => {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const walk = (node: HNode, parent?: HNode) => {
    if (node.type === "element" && node.tagName === "img") {
      const src = String(node.properties?.src ?? "");
      if (!src.startsWith(storagePrefix())) {
        // Replace foreign images with a plain link so no third party is contacted on view.
        const idx = parent?.children?.indexOf(node) ?? -1;
        const link: HNode = {
          type: "element",
          tagName: "a",
          properties: { href: src, target: "_blank", rel: ["nofollow", "ugc", "noopener", "noreferrer"] },
          children: [{ type: "text", value: `[image: ${String(node.properties?.alt || src).slice(0, 80)}]` }],
        };
        if (parent?.children && idx >= 0) parent.children[idx] = link;
        return;
      }
      node.properties = { ...node.properties, loading: "lazy", decoding: "async" };
    }
    if (node.type === "element" && node.tagName === "a") {
      const href = String(node.properties?.href ?? "");
      const internal = href.startsWith("/") || href.startsWith("#") || (site && href.startsWith(site));
      if (!internal) node.properties = { ...node.properties, target: "_blank", rel: ["nofollow", "ugc", "noopener", "noreferrer"] };
    }
    for (const c of [...(node.children ?? [])]) walk(c, node);
  };
  walk(tree as HNode);
};

const schema: SanitizeSchema = {
  ...defaultSchema,
  clobberPrefix: "md-",
  attributes: {
    ...defaultSchema.attributes,
    code: [["className", /^language-./, "math-inline", "math-display"]],
    a: [
      ...(defaultSchema.attributes?.a ?? []).filter((x) => !(Array.isArray(x) && x[0] === "className")),
      ["className", "mention", "data-footnote-backref"],
    ],
    span: [...(defaultSchema.attributes?.span ?? []), ["className", "spoiler"], "tabIndex", "title"],
    img: ["src", "alt", "title", "width", "height"],
  },
  protocols: { ...defaultSchema.protocols, href: ["http", "https", "mailto"], src: ["https", "http"] },
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkMentionsAndSpoilers)
  .use(remarkRehype)
  .use(rehypeSanitize, schema)
  .use(rehypeHouseRules)
  .use(rehypeKatex, { throwOnError: false, strict: "ignore" as const, maxSize: 20, maxExpand: 200, trust: false } as never)
  .use(rehypeStringify);

export async function renderMarkdown(source: string): Promise<string> {
  const file = await processor.process(source.slice(0, 20000));
  return String(file);
}

/** Plain-text excerpt for previews, notifications and Open Graph. */
export function excerpt(source: string, max = 200): string {
  const text = source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)]\([^)]*\)/g, "$1")
    .replace(/\|\|[^|]*\|\|/g, "[spoiler]")
    .replace(/[#>*_`~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
