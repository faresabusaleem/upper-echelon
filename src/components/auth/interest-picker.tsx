"use client";

import { INTERESTS } from "@/lib/validation";
import { cn } from "@/lib/utils";

/** Toggleable subjects. Renders hidden inputs named `interests` so it works inside plain forms. */
export function InterestPicker({
  value,
  onChange,
  name = "interests",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  name?: string;
}) {
  return (
    <fieldset>
      <legend className="sr-only">Subjects you care about</legend>
      <div className="flex flex-wrap gap-2">
        {INTERESTS.map((interest) => {
          const on = value.includes(interest);
          return (
            <button
              key={interest}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((v) => v !== interest) : value.length >= 12 ? value : [...value, interest])}
              className={cn(
                "h-11 px-4 text-[0.9375rem] transition-colors duration-150",
                on ? "bg-gold text-ground" : "bg-panel-2 text-ink-2 hover:bg-panel-3 hover:text-ink",
              )}
            >
              {interest}
            </button>
          );
        })}
      </div>
      {value.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
    </fieldset>
  );
}
