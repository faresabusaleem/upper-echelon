import { SearchIcon } from "@/components/ui/icons";

export function ForumSearch({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form role="search" action="/forum/search" className="flex w-full gap-2">
      <label htmlFor="forum-q" className="sr-only">Search the Forum</label>
      <input
        id="forum-q"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search threads and replies"
        className="h-12 min-w-0 flex-1 border border-panel-3 bg-panel px-4 text-ink placeholder:text-faint focus:border-gold-deep focus:outline-none"
      />
      <button className="inline-flex size-12 items-center justify-center bg-panel-2 text-ink hover:bg-panel-3" aria-label="Search">
        <SearchIcon />
      </button>
    </form>
  );
}
