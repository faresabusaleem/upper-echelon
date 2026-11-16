import { googleAction } from "@/app/(auth)/actions";
import { publicEnv } from "@/lib/env";

/** Shown only when Google sign-in has been configured (NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true). */
export function GoogleButton({ next, label = "Continue with Google" }: { next?: string; label?: string }) {
  if (!publicEnv.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED) return null;
  return (
    <form action={googleAction}>
      {next && <input type="hidden" name="next" value={next} />}
      <button
        type="submit"
        className="flex h-12 w-full items-center justify-center gap-3 bg-panel-2 text-ink transition-colors hover:bg-panel-3"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3ZM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22ZM6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14ZM12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.9 9.9 0 0 0 3.1 7.4L6.4 10c.8-2.4 3-4.1 5.6-4.1Z" />
        </svg>
        {label}
      </button>
    </form>
  );
}
