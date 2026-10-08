"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Briefcase, Inbox, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ApexBrandFooter,
  ApexBrandLockup,
} from "@/components/ats/ApexBrand";
import { cn } from "@/lib/utils";
import {
  ATS_ADMIN_TOKEN_KEY,
  clearAtsAdminSession,
  readAtsAdminMeta,
  writeAtsAdminMeta,
  type AtsAdminMeta,
} from "@/lib/atsAdminSession";
import { atsGraphqlUrl } from "@/lib/atsGraphqlUrl";

/** Dark-first accents (forced dark theme). */
export const ATS_ACCENTS = {
  violet: "bg-linear-to-r from-violet-400/50 via-indigo-400/35 to-transparent",
  sky: "bg-linear-to-r from-sky-400/45 via-cyan-400/25 to-transparent",
  amber: "bg-linear-to-r from-amber-400/50 via-orange-400/30 to-transparent",
  emerald: "bg-linear-to-r from-emerald-400/45 via-teal-400/30 to-transparent",
} as const;

export const atsFieldClass =
  "h-10 w-full min-w-0 rounded-xl border-border/80 bg-background/80 shadow-sm placeholder:text-muted-foreground focus-visible:border-violet-400/40 focus-visible:ring-violet-400/20";

export const atsPrimaryBtnClass =
  "gap-1.5 rounded-xl border-violet-500/50 bg-violet-500/90 text-white shadow-sm hover:bg-violet-500";

export function AtsPanelShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative space-y-6",
        "before:pointer-events-none before:absolute before:-inset-x-2 before:-top-2 before:h-36 before:rounded-3xl before:bg-linear-to-b before:from-violet-500/10 before:via-amber-500/5 before:to-transparent",
        className,
      )}
    >
      <div className="relative space-y-6">{children}</div>
    </div>
  );
}

export function AtsPageHero({
  eyebrow = "ATS workspace",
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-400/15 bg-linear-to-br from-violet-500/12 via-card to-amber-500/8 p-5 shadow-sm ring-1 ring-white/5 md:p-6">
      <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-amber-400/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-6 bottom-0 h-28 w-28 rounded-full bg-violet-400/10 blur-2xl" />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300/80">
            {eyebrow}
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-3xl text-pretty text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

export function AtsSectionCard({
  title,
  description,
  icon,
  accent = ATS_ACCENTS.violet,
  actions,
  children,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  accent?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-border/80 bg-card/95 shadow-md ring-1 ring-white/6">
      <div className={cn("h-1", accent)} />
      <CardHeader className="flex flex-col gap-3 space-y-0 bg-muted/20 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2.5 text-lg tracking-tight md:text-xl">
            {icon ? (
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/15 text-violet-300">
                {icon}
              </span>
            ) : null}
            {title}
          </CardTitle>
          {description ? (
            <CardDescription className="max-w-3xl text-pretty leading-relaxed text-muted-foreground">
              {description}
            </CardDescription>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
        ) : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function AtsEmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/15 px-4 py-12 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-muted/40 text-muted-foreground">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-pretty text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export function AtsStatusBadge({ status }: { status: string }) {
  const s = String(status || "").toLowerCase();
  const className =
    s === "rejected" || s === "withdrawn" || s === "closed"
      ? "border-rose-400/35 bg-rose-500/15 text-rose-300"
      : s === "offer" ||
          s === "interview" ||
          s === "screening" ||
          s === "draft"
        ? "border-amber-400/35 bg-amber-500/15 text-amber-200"
        : s === "open" ||
            s === "offer_accepted" ||
            s === "applied"
          ? "border-emerald-400/30 bg-emerald-500/12 text-emerald-300"
          : "border-violet-400/30 bg-violet-500/12 text-violet-300";

  return (
    <Badge
      variant="outline"
      className={cn("font-medium capitalize", className)}
    >
      {s.replaceAll("_", " ")}
    </Badge>
  );
}

const NAV_ICONS = {
  "/Admin/vacancies": Briefcase,
  "/Admin/applications": Inbox,
} as const;

export function AtsAdminShell({
  children,
  meta,
  forceSecurity = false,
}: {
  children: ReactNode;
  meta?: AtsAdminMeta | null;
  /** When true, only Security route is allowed (must-change OTP gate). */
  forceSecurity?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [resolved, setResolved] = useState<AtsAdminMeta>(
    () => meta ?? readAtsAdminMeta(),
  );
  const mustChange = Boolean(resolved.mustChangeOtp) || forceSecurity;

  useEffect(() => {
    if (meta) setResolved(meta);
  }, [meta]);

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem(ATS_ADMIN_TOKEN_KEY)
        : null;
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(atsGraphqlUrl(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            query: `query {
              atsAdminMe {
                tinNumber role displayName logoUrl mustChangeOtp
              }
            }`,
          }),
        });
        const json = await res.json();
        const me = json?.data?.atsAdminMe;
        if (cancelled || !me) return;
        const next: AtsAdminMeta = {
          ...readAtsAdminMeta(),
          tinNumber: me.tinNumber || undefined,
          role: me.role || undefined,
          displayName: me.displayName || undefined,
          logoUrl: me.logoUrl || null,
          mustChangeOtp: Boolean(me.mustChangeOtp),
        };
        writeAtsAdminMeta(next);
        setResolved(next);
      } catch {
        /* keep cached meta */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mustChange) return;
    if (pathname !== "/Admin/security") {
      router.replace("/Admin/security");
    }
  }, [mustChange, pathname, router]);

  const signOut = () => {
    clearAtsAdminSession();
    router.replace("/Admin");
  };

  const nav = mustChange
    ? ([] as const)
    : ([
        { href: "/Admin/vacancies", label: "Vacancies" },
        { href: "/Admin/applications", label: "Applications" },
      ] as const);

  return (
    <div className="relative min-h-full overflow-x-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-linear-to-br from-background via-[#0c1220] to-[#121018]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.55_0.12_75_/_0.14),_transparent_55%)]" />
        <div className="absolute -left-24 top-10 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="absolute -right-20 top-24 h-56 w-56 rounded-full bg-amber-500/12 blur-3xl" />
      </div>

      <header className="relative sticky top-0 z-20 border-b border-amber-400/12 bg-background/80 shadow-sm shadow-amber-950/20 backdrop-blur-md">
        <div
          className="h-1 w-full bg-linear-to-r from-amber-400 via-violet-400 to-sky-400"
          aria-hidden
        />
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <ApexBrandLockup
              product="ATS"
              subtitle={resolved.displayName || "Admin"}
              logoUrl={resolved.logoUrl}
              markSize={40}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-2 sm:max-w-[min(100%,22rem)] sm:items-end">
            <p className="truncate text-[11px] text-muted-foreground sm:text-right">
              {resolved.role ? `${resolved.role} · ` : ""}
              {resolved.tinNumber ? `TIN ${resolved.tinNumber}` : "Admin"}
              {mustChange ? " · change code required" : ""}
            </p>
            <nav
              className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-2xl border border-white/8 bg-muted/25 p-1 shadow-inner shadow-black/20 ring-1 ring-amber-400/10"
              aria-label="ATS admin"
            >
              {nav.map((item) => {
                const active = pathname === item.href;
                const Icon =
                  NAV_ICONS[item.href as keyof typeof NAV_ICONS] ?? Briefcase;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold tracking-tight transition",
                      active
                        ? "bg-linear-to-r from-violet-500 to-indigo-500 text-white shadow-md shadow-violet-950/40 ring-1 ring-violet-300/30"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" />
                    {item.label}
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={signOut}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold tracking-tight text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-200"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                Sign out
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl overflow-x-hidden px-4 py-8">
        {children}
      </main>
      <ApexBrandFooter className="relative z-10" />
    </div>
  );
}
