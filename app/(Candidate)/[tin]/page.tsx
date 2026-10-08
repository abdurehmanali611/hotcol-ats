/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Briefcase, Loader2, MapPin, Wallet } from "lucide-react";
import { ApexBrandFooter, ApexBrandLockup } from "@/components/ats/ApexBrand";
import { atsGraphqlUrl } from "@/lib/atsGraphqlUrl";

type TenantPublic = {
  tinNumber: string;
  displayName: string;
  logoUrl?: string | null;
};
type Vacancy = {
  id: number;
  title: string;
  description: string;
  department: string;
  team: string;
  grossSalaryETB: number | null;
  addressSpec: string;
  status: string;
};

const GRAPHQL_URL = atsGraphqlUrl();

async function gqlPublic<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message || "Request failed");
  }
  return json.data;
}

export default function CandidateTenantJobsPage() {
  const params = useParams();
  const tin = String(params?.tin || "").trim();
  const [tenant, setTenant] = useState<TenantPublic | null>(null);
  const [jobs, setJobs] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tin) {
      setLoading(false);
      setError("Missing hotel code");
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await gqlPublic<{
          atsTenantPublic: TenantPublic | null;
          atsOpenVacancies: Vacancy[];
        }>(
          `query ($tin: String!) {
            atsTenantPublic(tin: $tin) { tinNumber displayName logoUrl }
            atsOpenVacancies(tin: $tin) {
              id title description department team grossSalaryETB addressSpec status
            }
          }`,
          { tin },
        );
        if (cancelled) return;
        setTenant(data.atsTenantPublic);
        setJobs(data.atsOpenVacancies || []);
        if (!data.atsTenantPublic) {
          setError("This careers page was not found.");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load jobs");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tin]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading careers…
      </div>
    );
  }

  if (error && !tenant) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-muted/30 text-muted-foreground">
          <Briefcase className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
          Careers unavailable
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen min-h-screen flex-col overflow-x-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute inset-0 bg-linear-to-br from-background via-[#0c1220] to-[#121018]" />
        <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-amber-500/12 blur-3xl" />
        <div className="absolute -right-16 top-24 h-56 w-56 rounded-full bg-violet-500/12 blur-3xl" />
      </div>

      <div className="relative shrink-0 overflow-hidden border-b border-amber-400/12">
        <div
          className="h-1 w-full bg-linear-to-r from-amber-400 via-violet-400 to-sky-400"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-amber-500/10 via-background to-violet-500/8" />
        <div className="relative mx-auto max-w-3xl px-4 py-5 md:py-6">
          <ApexBrandLockup
            product="Careers"
            subtitle={tenant?.displayName || tin}
            logoUrl={tenant?.logoUrl}
            markSize={40}
            eyebrow="Apex · HotCol"
          />
          <p className="mt-2 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground">
            Open roles at this property. Apply with your CV — no account needed.
          </p>
        </div>
      </div>

      <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8">
        {jobs.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full rounded-2xl border border-dashed border-border/70 bg-muted/15 px-6 py-14 text-center">
              <p className="font-semibold text-foreground">
                No open positions right now
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Check back later or contact the hotel directly.
              </p>
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/${encodeURIComponent(tin)}/jobs/${job.id}`}
                  className="group block rounded-2xl border border-border/70 bg-card/90 p-5 shadow-sm ring-1 ring-white/5 transition hover:border-amber-400/30 hover:bg-card hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-lg font-semibold tracking-tight text-foreground">
                        {job.title}
                      </p>
                      {job.department || job.team ? (
                        <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {[job.department, job.team]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      ) : null}
                      {(job.grossSalaryETB != null &&
                        Number.isFinite(job.grossSalaryETB)) ||
                      job.addressSpec ? (
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {job.grossSalaryETB != null &&
                          Number.isFinite(job.grossSalaryETB) ? (
                            <span className="inline-flex items-center gap-1">
                              <Wallet className="h-3 w-3" />
                              {Number(job.grossSalaryETB).toLocaleString()} ETB
                            </span>
                          ) : null}
                          {job.addressSpec ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {job.addressSpec}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      {job.description ? (
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                          {job.description}
                        </p>
                      ) : null}
                    </div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-500/15 text-amber-200 transition group-hover:bg-amber-500/25">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <ApexBrandFooter className="relative shrink-0" />
    </div>
  );
}
