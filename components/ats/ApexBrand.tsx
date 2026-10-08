"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export const APEX_ICON_SRC = "/assets/apex-icon-amber.png";
export const APEX_LOGO_SRC = "/assets/apex-logo-dark-bg.png";
export const APEX_SITE_URL = "https://www.apexsolutionhub.com";

/** Compact mark — tenant logo when available, else Apex icon. */
export function ApexBrandMark({
  size = 36,
  className,
  logoUrl,
  alt = "Brand",
}: {
  size?: number;
  className?: string;
  logoUrl?: string | null;
  alt?: string;
}) {
  const src = String(logoUrl || "").trim();
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-linear-to-br from-amber-400/25 via-orange-500/15 to-violet-500/20 shadow-md shadow-amber-950/30 ring-1 ring-amber-300/25",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-xl bg-amber-400/10 blur-md"
        aria-hidden
      />
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- tenant CDN / Cloudinary URLs
        <img
          src={src}
          alt={alt}
          className="relative size-full object-cover"
        />
      ) : (
        <Image
          src={APEX_ICON_SRC}
          alt={alt}
          width={size}
          height={size}
          className="relative object-contain p-1"
          priority
        />
      )}
    </div>
  );
}

/** Wordmark: tenant logo + Apex · HotCol / product · property name. */
export function ApexBrandLockup({
  product = "ATS",
  subtitle,
  logoUrl,
  className,
  markSize = 40,
  eyebrow = "Apex · HotCol",
}: {
  product?: string;
  subtitle?: string;
  logoUrl?: string | null;
  className?: string;
  markSize?: number;
  eyebrow?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <ApexBrandMark
        size={markSize}
        logoUrl={logoUrl}
        alt={subtitle || product}
      />
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300/85">
          {eyebrow}
        </p>
        <p className="truncate text-sm font-semibold tracking-tight text-foreground md:text-base">
          {product}
          {subtitle ? (
            <span className="font-normal text-muted-foreground">
              {" "}
              · {subtitle}
            </span>
          ) : null}
        </p>
      </div>
    </div>
  );
}

/** Subtle footer credit. */
export function ApexBrandFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "flex items-center justify-center gap-2 py-6 text-[11px] text-muted-foreground",
        className,
      )}
    >
      <Image
        src={APEX_ICON_SRC}
        alt=""
        width={16}
        height={16}
        className="opacity-80"
      />
      <span>
        Powered by{" "}
        <a
          href={APEX_SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-amber-200/90 underline-offset-2 transition hover:text-amber-100 hover:underline"
        >
          Apex Solution
        </a>
        {" · "}
        HotCol
      </span>
    </footer>
  );
}
