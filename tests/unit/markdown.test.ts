import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
  process.env.NEXT_PUBLIC_SITE_URL = "https://upper-echelon.example";
});

const render = async (md: string) => (await import("@/lib/markdown")).renderMarkdown(md);

describe("forum markdown", () => {
  it("renders GFM: emphasis, lists, tables, task lists and code", async () => {
    const html = await render("**bold** and *it*\n\n- a\n- b\n\n| x | y |\n|---|---|\n| 1 | 2 |\n\n- [x] done\n\n```js\nconst a = 1;\n```");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<table>");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('class="language-js"');
  });

  it("strips raw HTML and scripts", async () => {
    const html = await render('<script>alert(1)</script><img src=x onerror=alert(1)> <a href="javascript:alert(1)">x</a> [y](javascript:alert(1))');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
    expect(html).not.toMatch(/href="javascript:/i);
  });

  it("renders inline and display maths with KaTeX", async () => {
    const html = await render("Euler: $e^{i\\pi}+1=0$\n\n$$\n\\int_0^1 x\\,dx = \\tfrac12\n$$");
    expect(html).toContain('class="katex"');
    expect(html).toContain("katex-display");
  });

  it("does not crash on invalid maths", async () => {
    const html = await render("$\\frac{$");
    expect(typeof html).toBe("string");
  });

  it("links @mentions but not emails or code", async () => {
    const html = await render("Hello @ada_l, mail me at x@example.com, `@notamention`");
    expect(html).toContain('<a href="/u/ada_l" class="mention">@ada_l</a>');
    expect(html).not.toContain("/u/example");
    expect(html).toContain("<code>@notamention</code>");
  });

  it("hides ||spoilers|| behind a focusable span", async () => {
    const html = await render("The answer is ||forty-two||.");
    expect(html).toMatch(/<span class="spoiler" tabindex="0"[^>]*>forty-two<\/span>/);
  });

  it("allows images only from our own storage", async () => {
    const ours = "https://abc.supabase.co/storage/v1/object/public/forum/u/1.webp";
    const html = await render(`![ok](${ours}) ![tracker](https://evil.example/pixel.gif)`);
    expect(html).toContain(`<img src="${ours}"`);
    expect(html).toContain('loading="lazy"');
    expect(html).not.toContain('<img src="https://evil.example');
    expect(html).toContain('href="https://evil.example/pixel.gif"');
  });

  it("opens external links safely and keeps internal ones", async () => {
    const html = await render("[ext](https://example.com) [int](/forum)");
    expect(html).toContain('href="https://example.com" target="_blank" rel="nofollow ugc noopener noreferrer"');
    expect(html).toContain('<a href="/forum">int</a>');
  });

  it("makes plain excerpts", async () => {
    const { excerpt } = await import("@/lib/markdown");
    expect(excerpt("# Title\n\nSome **bold** [link](https://x.y) text ||secret||", 60)).toBe("Title Some bold link text [spoiler]");
  });
});
