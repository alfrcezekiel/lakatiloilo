import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:opacity-90",
        secondary: "bg-secondary text-secondary-foreground hover:opacity-80",
        outline:
          "border border-border bg-transparent hover:bg-secondary hover:text-secondary-foreground",
        ghost: "hover:bg-secondary hover:text-secondary-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:opacity-90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };

// The pill buttons on the dark detail pages (buttons & cards round).
// Three kinds: "main" (sunset amber, the one action to tap), "glass"
// (see-through white, a second choice) and "danger" (red outline; it
// turns solid red only on the "Yes, delete" step, as "dangerSolid").
// Every pill is 44 px tall, so it is easy to tap. It lifts a little on
// hover and presses in when clicked, unless the device asks for reduced
// motion (motion-safe), and a white outline shows when it is reached
// with the Tab key. It is a list of classes, not a component, so links
// (<a>, <Link>) and <button>s can share it: pillButton({ kind: "main" }).
export const pillButton = cva(
  "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 text-[0.9375rem] font-semibold tracking-[0.01em] transition duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 motion-safe:active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60 [&_svg]:size-4.5 [&_svg]:shrink-0",
  {
    variants: {
      kind: {
        main: "bg-amber-400 text-amber-950 shadow-lg shadow-amber-500/25 hover:bg-amber-300 hover:shadow-amber-400/40",
        glass:
          "border border-white/30 bg-white/15 text-white backdrop-blur-md hover:bg-white/25",
        danger: "border border-red-300/70 text-red-100 hover:bg-red-500/20",
        dangerSolid: "bg-red-500 text-white shadow-lg shadow-red-500/25 hover:bg-red-600",
      },
    },
    defaultVariants: { kind: "main" },
  },
);
