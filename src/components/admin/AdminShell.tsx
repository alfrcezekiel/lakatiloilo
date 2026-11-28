"use client";

import { ArrowLeft, CircleHelp, Flag, LayoutDashboard, LogOut, MapPin, Menu, MessageSquare, Tags, Trash2, X, type LucideIcon } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { notFound, usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { AdminFrame, adminGlass } from "@/components/admin/AdminFrame";
import { PendingDeletesHost, flushDeletes } from "@/components/admin/PendingDeletes";
import { displayNameOf, logOut, useCurrentUser } from "@/lib/login";
import { cn } from "@/lib/utils";

// The dashboard's sections (Reports since ticket 108, Places since 112,
// Reviews since 122, Categories since 2026-11-11, FAQs since 168).
// "ready: false" shows a section as "Soon", not a link.
const sections: { href: string; label: string; icon: LucideIcon; ready: boolean }[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, ready: true },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquare, ready: true },
  { href: "/admin/reports", label: "Reports", icon: Flag, ready: true },
  { href: "/admin/places", label: "Places", icon: MapPin, ready: true },
  // Its own page since 2026-11-11 (team request): it was at the bottom of
  // Places.
  { href: "/admin/categories", label: "Categories", icon: Tags, ready: true },
  // Ticket 168: the home page's frequently asked questions.
  { href: "/admin/faqs", label: "FAQs", icon: CircleHelp, ready: true },
  // Ticket 147: what admins deleted waits there for 30 days.
  { href: "/admin/trash", label: "Trash", icon: Trash2, ready: true },
];

// One item in the sidebar or phone menu. The current section is marked
// with amber text and an amber line (never a white box, see
// .claude/rules/frontend.md) and aria-current for screen
// readers.
const itemClass =
  "flex min-h-11 w-full items-center gap-3 rounded-xl border-l-2 px-3 text-[0.95rem] font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white";

function SectionLinks({ onPick }: { onPick: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {sections.map(({ href, label, icon: Icon, ready }) => {
        // A section's own pages count too (an Edit page is under Places).
        const current = pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
        if (!ready) {
          return (
            <li key={href}>
              <span
                aria-disabled="true"
                className={cn(itemClass, "border-transparent text-white/55")}
              >
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                {label}
                <span className="ml-auto rounded-full border border-white/25 px-2 py-0.5 text-[0.7rem] text-white/70">
                  Soon
                </span>
              </span>
            </li>
          );
        }
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onPick}
              aria-current={current ? "page" : undefined}
              className={cn(
                itemClass,
                current
                  ? "border-amber-300 text-amber-300"
                  : "border-transparent text-white/90 hover:text-amber-300",
              )}
            >
              <Icon aria-hidden="true" className="size-5 shrink-0" />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// The admin dashboard's frame (admin dashboard & moderation round, ticket
// 107). Only the Lakat Iloilo team gets past it:
//   - while "who is logged in" is being checked: a quiet loading state,
//   - an admin: the glass sidebar (on phones a top bar with a menu) and
//     the page,
//   - anyone else, logged in or not: the site's "not found" page.
// This only decides what the screen shows; the backend refuses every
// admin request from a non-admin, and the database checks the admins
// table on every change.
//
// Loading (team report 2026-11-09): while "who is logged in" is checked,
// the shell already draws the dashboard's layout (sidebar, title) with
// the page's own skeleton (`skeleton`), the same one the page shows while
// its data loads. So the screen goes skeleton -> content in one step,
// instead of one loading screen and then a different one.
export function AdminShell({
  title,
  skeleton,
  children,
}: {
  title: string;
  skeleton?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { user: currentUser, ready } = useCurrentUser();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  // While logging out: the admin who is leaving. The dashboard stays on
  // screen as it was (no skeleton, team request 2026-11-09), with "Logging
  // out…" on the button, until the sign-in page opens; and it never
  // flashes "not found" once the login is gone.
  const [leavingAs, setLeavingAs] = useState<typeof currentUser>(null);
  const user = leavingAs ?? currentUser;
  const leaving = leavingAs !== null;

  if (ready && !user?.is_admin) notFound();

  const signOut = async () => {
    if (leaving) return;
    setMenuOpen(false);
    setLeavingAs(currentUser);
    // Deletes still waiting for Undo are sent first, while the login
    // still works (ticket 127).
    await flushDeletes();
    await logOut();
    router.replace("/admin/login");
  };

  const footerLinks = (
    <div className="space-y-1 border-t border-white/15 pt-3">
      <Link
        href="/"
        className={cn(itemClass, "border-transparent text-white/90 hover:text-amber-300")}
      >
        <ArrowLeft aria-hidden="true" className="size-5 shrink-0" />
        Back to the site
      </Link>
      <button
        type="button"
        onClick={signOut}
        disabled={leaving}
        className={cn(
          itemClass,
          "cursor-pointer border-transparent text-left text-white/90 hover:text-amber-300 disabled:cursor-default disabled:opacity-80",
        )}
      >
        {leaving ? (
          <Spinner className="size-5 shrink-0" />
        ) : (
          <LogOut aria-hidden="true" className="size-5 shrink-0" />
        )}
        <span role={leaving ? "status" : undefined}>{leaving ? "Logging out…" : "Log out"}</span>
      </button>
    </div>
  );

  if (!user) {
    return (
      <AdminFrame>
        <p role="status" className="sr-only">
          Checking your access
        </p>
        {/* The same places as the real shell below, as quiet shapes. */}
        <div aria-hidden="true" className={cn(adminGlass, "mx-3 mt-3 flex items-center justify-between px-4 py-3 lg:hidden")}>
          <Logo width={130} height={27} />
          <Skeleton className="size-11 rounded-xl" />
        </div>
        <div className="flex w-full gap-6 px-3 py-6 lg:px-6">
          <div
            aria-hidden="true"
            className={cn(adminGlass, "sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 flex-col p-4 lg:flex")}
          >
            <div className="px-2 pb-5">
              <Logo width={140} height={29} />
              <Skeleton className="mt-3 h-3 w-28" />
            </div>
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-11 w-full rounded-xl" />
              ))}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3 w-40" />
            <h1 className="font-fraunces mt-1 mb-6 text-4xl leading-tight font-medium tracking-tight sm:text-5xl">
              {title}
            </h1>
            {skeleton ?? <Skeleton className="h-64 w-full rounded-2xl" />}
          </div>
        </div>
      </AdminFrame>
    );
  }

  return (
    <AdminFrame>
      {/* Undo after a delete (ticket 127). */}
      <PendingDeletesHost />
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-amber-300 focus:px-3 focus:py-2 focus:font-semibold focus:text-teal-950"
      >
        Skip to content
      </a>

      {/* Phones and tablets: a glass top bar with a menu button. */}
      {/* Solid, not glass: it floats over the page as it scrolls. */}
      <header className="sticky top-3 z-40 mx-3 mt-3 rounded-2xl border border-white/20 bg-teal-900 lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Logo width={130} height={27} />
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="admin-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="flex size-11 cursor-pointer items-center justify-center rounded-xl text-white hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-white"
          >
            {menuOpen ? <X aria-hidden="true" className="size-6" /> : <Menu aria-hidden="true" className="size-6" />}
          </button>
        </div>
        {menuOpen && (
          <nav id="admin-menu" aria-label="Dashboard" className="space-y-3 border-t border-white/15 px-3 py-3">
            <SectionLinks onPick={() => setMenuOpen(false)} />
            {footerLinks}
          </nav>
        )}
      </header>

      {/* Full width (team request, 2026-11-08): the sidebar on the left,
          the page filling the rest of the browser. */}
      <div className="flex w-full gap-6 px-3 py-6 lg:px-6">
        {/* Laptops: the glass sidebar. */}
        <aside className={cn(adminGlass, "sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 flex-col p-4 lg:flex")}>
          <div className="px-2 pb-5">
            <Logo width={140} height={29} />
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-200">
              Team dashboard
            </p>
          </div>
          <nav aria-label="Dashboard" className="flex flex-1 flex-col justify-between">
            <SectionLinks onPick={() => undefined} />
            {footerLinks}
          </nav>
        </aside>

        <main id="admin-main" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/80">
            Signed in as {displayNameOf(user)}
          </p>
          <h1 className="font-fraunces mt-1 mb-6 text-4xl leading-tight font-medium tracking-tight sm:text-5xl">
            {title}
          </h1>
          {children}
        </main>
      </div>
    </AdminFrame>
  );
}
