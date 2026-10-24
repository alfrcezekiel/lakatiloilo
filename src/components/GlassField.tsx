import { Label } from "@/components/ui/label";

// Shared by the log-in, forgot password and set new password pages.

// The input inside a glass field: no box of its own, the field draws it.
export const fieldInputClass =
  "h-auto border-0 bg-transparent p-0 text-base text-white placeholder:text-white/50 focus-visible:ring-0 focus-visible:ring-offset-0 md:text-base";

// One rounded glass box with a small capital label on top, the input
// under it, an optional button on the right (like Show), and a yellow
// message under the box when something is wrong.
export function GlassField({
  id,
  label,
  hint,
  error,
  action,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className={`flex items-center gap-3 rounded-2xl border bg-white/10 px-4 py-2.5 focus-within:border-white/60 ${error ? "border-amber-300/80" : "border-white/25"
          }`}
      >
        <div className="min-w-0 flex-1">
          <Label
            htmlFor={id}
            className="text-[11px] font-semibold uppercase tracking-widest text-white/80"
          >
            {label}
          </Label>
          {children}
        </div>
        {action}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 px-1 text-xs text-white/70">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 px-1 text-sm text-amber-200">
          {error}
        </p>
      )}
    </div>
  );
}
