"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Building2,
  ExternalLink,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ATS_ACCENTS,
  AtsAdminShell,
  AtsEmptyState,
  AtsPageHero,
  AtsPanelShell,
  AtsSectionCard,
  AtsStatusBadge,
  atsFieldClass,
  atsPrimaryBtnClass,
} from "@/components/ats/atsChrome";
import { AtsOptionCombobox } from "@/components/ats/AtsOptionCombobox";
import {
  ATS_ADMIN_TOKEN_KEY,
  readAtsAdminMeta,
  type AtsAdminMeta,
} from "@/lib/atsAdminSession";
import { atsGraphqlUrl } from "@/lib/atsGraphqlUrl";
import { cn } from "@/lib/utils";

const GRAPHQL_URL = atsGraphqlUrl();

/** Truncated cell text — full value on hover (inventory payment / tax pattern). */
function AtsHoverText({
  text,
  className,
  lines = 1,
  empty = "—",
}: {
  text: string;
  className?: string;
  lines?: 1 | 2;
  empty?: string;
}) {
  const value = String(text || "").trim();
  if (!value) {
    return (
      <span className={cn("text-muted-foreground/60", className)}>{empty}</span>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={cn(
            "block max-w-full cursor-default outline-none",
            "underline-offset-2 hover:underline focus-visible:underline",
            lines === 2 ? "line-clamp-2 whitespace-normal" : "truncate",
            className,
          )}
        >
          {value}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={6}
        className="max-w-sm whitespace-pre-wrap break-words text-left leading-relaxed"
      >
        {value}
      </TooltipContent>
    </Tooltip>
  );
}

const VACANCY_FIELDS = `
  id title description department team grossSalaryETB addressSpec
  requireEmail requireCv status createdByRole
`;

type Vacancy = {
  id: number;
  title: string;
  description: string;
  department: string;
  team: string;
  grossSalaryETB: number | null;
  addressSpec: string;
  requireEmail: boolean;
  requireCv: boolean;
  status: string;
  createdByRole: string;
};

type HrTeam = {
  id: number;
  code: string;
  label: string;
  departmentId: number;
};

type HrDepartment = {
  id: number;
  code: string;
  label: string;
  teams: HrTeam[];
};

type JobDraftLine = {
  key: string;
  title: string;
  description: string;
  departmentCode: string;
  teamCode: string;
  grossSalary: string;
  addressSpec: string;
  requireEmail: boolean;
  requireCv: boolean;
};

function newDraftLine(): JobDraftLine {
  return {
    key: `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    description: "",
    departmentCode: "",
    teamCode: "",
    grossSalary: "",
    addressSpec: "",
    requireEmail: false,
    requireCv: true,
  };
}

async function atsGql<T>(
  token: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message || "Request failed");
  }
  return json.data;
}

function formatSalary(n: number | null | undefined) {
  if (n == null || !Number.isFinite(Number(n))) return null;
  return `${Number(n).toLocaleString()} ETB`;
}

function parseSalary(raw: string): number | null {
  const salaryRaw = raw.trim().replace(/,/g, "");
  if (!salaryRaw) return null;
  const n = Number(salaryRaw);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("Gross salary must be a non-negative number");
  }
  return n;
}

export default function AtsAdminVacanciesPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [meta, setMeta] = useState<AtsAdminMeta>({});
  const [rows, setRows] = useState<Vacancy[]>([]);
  const [departments, setDepartments] = useState<HrDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgLoading, setOrgLoading] = useState(true);
  const [lines, setLines] = useState<JobDraftLine[]>(() => [newDraftLine()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem(ATS_ADMIN_TOKEN_KEY);
    if (!t) {
      router.replace("/Admin");
      return;
    }
    setToken(t);
    setMeta(readAtsAdminMeta());
  }, [router]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await atsGql<{ atsAdminVacancies: Vacancy[] }>(
        token,
        `query {
          atsAdminVacancies { ${VACANCY_FIELDS} }
        }`,
      );
      setRows(data.atsAdminVacancies || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load vacancies");
      if (String(e).includes("ATS Admin")) {
        localStorage.removeItem(ATS_ADMIN_TOKEN_KEY);
        router.replace("/Admin");
      }
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  const loadOrg = useCallback(async () => {
    if (!token) return;
    setOrgLoading(true);
    try {
      const data = await atsGql<{
        atsAdminHrOrg: { departments: HrDepartment[] };
      }>(
        token,
        `query {
          atsAdminHrOrg {
            departments {
              id code label
              teams { id code label departmentId }
            }
          }
        }`,
      );
      setDepartments(data.atsAdminHrOrg?.departments || []);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not load departments",
      );
    } finally {
      setOrgLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadOrg();
  }, [loadOrg]);

  const departmentOptions = useMemo(
    () =>
      departments.map((d) => ({
        value: d.code,
        label: d.label,
        hint: d.code,
      })),
    [departments],
  );

  const teamsFor = useCallback(
    (departmentCode: string) => {
      const dept = departments.find((d) => d.code === departmentCode);
      return (dept?.teams || []).map((t) => ({
        value: t.code,
        label: t.label,
        hint: t.code,
      }));
    },
    [departments],
  );

  const patchLine = (key: string, patch: Partial<JobDraftLine>) => {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  };

  const removeLine = (key: string) => {
    setLines((prev) =>
      prev.length <= 1 ? prev : prev.filter((line) => line.key !== key),
    );
  };

  const createBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (departmentOptions.length === 0) {
      toast.error("Add departments in Manager HR first");
      return;
    }

    const prepared: {
      title: string;
      description: string;
      department: string;
      team: string;
      grossSalaryETB: number | null;
      addressSpec: string;
      requireEmail: boolean;
      requireCv: boolean;
    }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const title = line.title.trim();
      if (!title) {
        if (lines.length === 1) {
          toast.error("Title is required");
          return;
        }
        continue;
      }
      if (!line.departmentCode) {
        toast.error(`Line ${i + 1}: select a department`);
        return;
      }
      const dept = departments.find((d) => d.code === line.departmentCode);
      const teamOpts = teamsFor(line.departmentCode);
      let salary: number | null = null;
      try {
        salary = parseSalary(line.grossSalary);
      } catch (err) {
        toast.error(
          `Line ${i + 1}: ${err instanceof Error ? err.message : "Invalid salary"}`,
        );
        return;
      }
      prepared.push({
        title,
        description: line.description.trim(),
        department: dept?.label || line.departmentCode,
        team:
          teamOpts.find((t) => t.value === line.teamCode)?.label || "",
        grossSalaryETB: salary,
        addressSpec: line.addressSpec.trim(),
        requireEmail: line.requireEmail,
        requireCv: line.requireCv,
      });
    }

    if (prepared.length === 0) {
      toast.error("Add at least one job with a title");
      return;
    }

    setSaving(true);
    let ok = 0;
    const errors: string[] = [];
    try {
      for (const job of prepared) {
        try {
          await atsGql(
            token,
            `mutation (
              $title: String!
              $description: String
              $department: String
              $team: String
              $grossSalaryETB: Float
              $addressSpec: String
              $requireEmail: Boolean
              $requireCv: Boolean
              $status: String
            ) {
              createAtsVacancy(
                title: $title
                description: $description
                department: $department
                team: $team
                grossSalaryETB: $grossSalaryETB
                addressSpec: $addressSpec
                requireEmail: $requireEmail
                requireCv: $requireCv
                status: $status
              ) { id }
            }`,
            { ...job, status: "open" },
          );
          ok += 1;
        } catch (err) {
          errors.push(
            `${job.title}: ${err instanceof Error ? err.message : "failed"}`,
          );
        }
      }
      if (ok > 0) {
        toast.success(
          ok === 1 ? "1 vacancy posted" : `${ok} vacancies posted`,
        );
        setLines([newDraftLine()]);
        await load();
      }
      if (errors.length) {
        toast.error(errors.slice(0, 3).join(" · "));
      }
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id: number, status: string) => {
    if (!token) return;
    try {
      await atsGql(
        token,
        `mutation ($id: Int!, $status: String) {
          updateAtsVacancy(id: $id, status: $status) { id status }
        }`,
        { id, status },
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const tin = String(meta.tinNumber || "").trim();

  return (
    <AtsAdminShell meta={meta}>
      <AtsPanelShell>
        <AtsPageHero
          title="Vacancies"
          description={
            tin
              ? `Public careers at /${tin}. Post one role or add lines to publish several at once.`
              : "Post one role or add lines to publish several at once."
          }
          actions={
            tin ? (
              <Button asChild size="sm" variant="outline" className="rounded-xl">
                <Link href={`/${encodeURIComponent(tin)}`} target="_blank">
                  View careers
                </Link>
              </Button>
            ) : null
          }
        />

        <AtsSectionCard
          title="Post jobs"
          description="Each line is a full vacancy. Add lines to batch-publish."
          icon={<Plus className="h-5 w-5" />}
          accent={ATS_ACCENTS.sky}
        >
          <form onSubmit={createBatch} className="space-y-5">
            {orgLoading ? (
              <div className="flex h-10 items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading departments…
              </div>
            ) : departmentOptions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-amber-400/35 bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-amber-100">
                No active departments yet. Ask the hotel Manager to add them
                under HR → Departments first.
              </p>
            ) : null}

            <div className="space-y-4">
              {lines.map((line, index) => {
                const teamOpts = teamsFor(line.departmentCode);
                return (
                  <div
                    key={line.key}
                    className="relative space-y-4 rounded-2xl border border-border/60 bg-muted/10 p-4 ring-1 ring-white/4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300/80">
                        Line {index + 1}
                      </p>
                      {lines.length > 1 ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 rounded-lg text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                          onClick={() => removeLine(line.key)}
                          disabled={saving}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </Button>
                      ) : null}
                    </div>

                    <div className="space-y-1.5">
                      <Label>Title / role</Label>
                      <Input
                        value={line.title}
                        onChange={(e) =>
                          patchLine(line.key, { title: e.target.value })
                        }
                        className={atsFieldClass}
                        placeholder="e.g. Front Office Supervisor"
                        disabled={saving}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="inline-flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          Department
                        </Label>
                        <AtsOptionCombobox
                          value={line.departmentCode}
                          onChange={(code) =>
                            patchLine(line.key, {
                              departmentCode: code,
                              teamCode: "",
                            })
                          }
                          options={departmentOptions}
                          placeholder="Select department"
                          searchPlaceholder="Search departments…"
                          emptyText="No department matches."
                          disabled={
                            saving || departmentOptions.length === 0
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          Team
                          <span className="font-normal text-muted-foreground">
                            (optional)
                          </span>
                        </Label>
                        <AtsOptionCombobox
                          value={line.teamCode}
                          onChange={(code) =>
                            patchLine(line.key, { teamCode: code })
                          }
                          options={teamOpts}
                          placeholder={
                            !line.departmentCode
                              ? "Select department first"
                              : teamOpts.length === 0
                                ? "No teams in this department"
                                : "Select team"
                          }
                          searchPlaceholder="Search teams…"
                          emptyText="No team matches."
                          disabled={
                            saving ||
                            !line.departmentCode ||
                            teamOpts.length === 0
                          }
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="inline-flex items-center gap-1.5">
                          <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                          Gross salary
                          <span className="font-normal text-muted-foreground">
                            (optional, ETB)
                          </span>
                        </Label>
                        <Input
                          inputMode="decimal"
                          value={line.grossSalary}
                          onChange={(e) =>
                            patchLine(line.key, {
                              grossSalary: e.target.value,
                            })
                          }
                          className={atsFieldClass}
                          placeholder="e.g. 18000"
                          disabled={saving}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          Address / location
                          <span className="font-normal text-muted-foreground">
                            (optional)
                          </span>
                        </Label>
                        <Input
                          value={line.addressSpec}
                          onChange={(e) =>
                            patchLine(line.key, {
                              addressSpec: e.target.value,
                            })
                          }
                          className={atsFieldClass}
                          placeholder="e.g. Bole branch"
                          disabled={saving}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Description</Label>
                      <Textarea
                        value={line.description}
                        onChange={(e) =>
                          patchLine(line.key, {
                            description: e.target.value,
                          })
                        }
                        rows={3}
                        placeholder="Responsibilities, requirements…"
                        className="min-h-20 rounded-xl border-border/80 bg-background/80 shadow-sm focus-visible:border-violet-400/40 focus-visible:ring-violet-400/20"
                        disabled={saving}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/50 px-3 py-3">
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-sm font-medium">Require email</p>
                          <p className="text-[11px] text-muted-foreground">
                            {line.requireEmail
                              ? "Email required"
                              : "Email optional"}
                          </p>
                        </div>
                        <Switch
                          checked={line.requireEmail}
                          onCheckedChange={(v) =>
                            patchLine(line.key, { requireEmail: v })
                          }
                          disabled={saving}
                          aria-label="Require email"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/50 px-3 py-3">
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-sm font-medium">Require CV</p>
                          <p className="text-[11px] text-muted-foreground">
                            {line.requireCv ? "CV required" : "CV optional"}
                          </p>
                        </div>
                        <Switch
                          checked={line.requireCv}
                          onCheckedChange={(v) =>
                            patchLine(line.key, { requireCv: v })
                          }
                          disabled={saving}
                          aria-label="Require CV"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl border-sky-400/25 bg-sky-500/5 hover:bg-sky-500/10"
                onClick={() => setLines((prev) => [...prev, newDraftLine()])}
                disabled={saving || departmentOptions.length === 0}
              >
                <Plus className="h-4 w-4" />
                Add line
              </Button>
              <Button
                type="submit"
                disabled={
                  saving || orgLoading || departmentOptions.length === 0
                }
                className={cn(
                  atsPrimaryBtnClass,
                  "h-11 w-full cursor-pointer px-5 sm:w-auto",
                )}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {lines.length > 1
                  ? `Post ${lines.length} vacancies`
                  : "Post open vacancy"}
              </Button>
            </div>
          </form>
        </AtsSectionCard>

        <AtsSectionCard
          title="Your vacancies"
          description="Open or close roles. Closed jobs leave the public list."
          icon={<Briefcase className="h-5 w-5" />}
        >
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <AtsEmptyState
              title="No vacancies yet"
              description="Use Post jobs above to publish the first open role."
              icon={<Briefcase className="h-6 w-6" />}
            />
          ) : (
            (() => {
              const openCount = rows.filter((r) => r.status === "open").length;
              const closedCount = rows.length - openCount;
              return (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {rows.length}
                      </span>{" "}
                      role{rows.length === 1 ? "" : "s"}
                      <span className="mx-1.5 text-border">·</span>
                      <span className="text-emerald-300/90">
                        {openCount} open
                      </span>
                      <span className="mx-1.5 text-border">·</span>
                      <span className="text-muted-foreground">
                        {closedCount} closed
                      </span>
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-border/70 bg-linear-to-b from-card/90 via-background/50 to-background/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] ring-1 ring-white/6">
                    <TooltipProvider delayDuration={220}>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/50 bg-muted/25 hover:bg-muted/25">
                          <TableHead className="h-12 w-10 px-3 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
                            #
                          </TableHead>
                          <TableHead className="h-12 min-w-[13rem] px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
                            Role
                          </TableHead>
                          <TableHead className="h-12 px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
                            Department
                          </TableHead>
                          <TableHead className="h-12 px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
                            Details
                          </TableHead>
                          <TableHead className="h-12 px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
                            Status
                          </TableHead>
                          <TableHead className="h-12 px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
                            Apply link
                          </TableHead>
                          <TableHead className="h-12 px-4 text-right text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((v, index) => {
                          const salary = formatSalary(v.grossSalaryETB);
                          const applyHref = tin
                            ? `/${encodeURIComponent(tin)}/jobs/${v.id}`
                            : null;
                          const isOpen = v.status === "open";
                          return (
                            <TableRow
                              key={v.id}
                              className={cn(
                                "group border-border/40 transition-colors",
                                "hover:bg-sky-500/[0.04]",
                                isOpen
                                  ? "bg-emerald-500/[0.03]"
                                  : "bg-transparent",
                              )}
                            >
                              <TableCell className="relative whitespace-normal px-3 py-4 text-center align-middle">
                                {isOpen ? (
                                  <span
                                    className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-emerald-400/70"
                                    aria-hidden
                                  />
                                ) : null}
                                <span className="font-mono text-[11px] tabular-nums text-muted-foreground/70">
                                  {String(index + 1).padStart(2, "0")}
                                </span>
                              </TableCell>
                              <TableCell className="max-w-[16rem] whitespace-normal px-4 py-4 align-top">
                                <AtsHoverText
                                  text={v.title}
                                  className="text-[15px] font-semibold leading-snug tracking-tight text-foreground"
                                />
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  <span className="inline-flex items-center rounded-md border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                    by {v.createdByRole || "—"}
                                  </span>
                                  <span
                                    className={cn(
                                      "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                                      v.requireEmail
                                        ? "border-sky-400/30 bg-sky-500/10 text-sky-200"
                                        : "border-border/50 bg-muted/20 text-muted-foreground",
                                    )}
                                  >
                                    Email{" "}
                                    {v.requireEmail ? "required" : "optional"}
                                  </span>
                                  <span
                                    className={cn(
                                      "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                                      v.requireCv
                                        ? "border-violet-400/30 bg-violet-500/10 text-violet-200"
                                        : "border-border/50 bg-muted/20 text-muted-foreground",
                                    )}
                                  >
                                    CV {v.requireCv ? "required" : "optional"}
                                  </span>
                                </div>
                                {v.description ? (
                                  <AtsHoverText
                                    text={v.description}
                                    lines={2}
                                    className="mt-2 text-xs leading-relaxed text-muted-foreground/85"
                                  />
                                ) : null}
                              </TableCell>
                              <TableCell className="max-w-[11rem] whitespace-normal px-4 py-4 align-top">
                                <div className="space-y-1.5">
                                  <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground/90">
                                    <Building2 className="h-3.5 w-3.5 shrink-0 text-sky-300/80" />
                                    <AtsHoverText
                                      text={v.department || ""}
                                      empty="—"
                                      className="min-w-0"
                                    />
                                  </div>
                                  {v.team ? (
                                    <div className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border/50 bg-muted/25 px-2 py-1 text-xs text-muted-foreground">
                                      <Users className="h-3 w-3 shrink-0 opacity-70" />
                                      <AtsHoverText
                                        text={v.team}
                                        className="min-w-0"
                                      />
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-muted-foreground/60">
                                      No team
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="whitespace-normal px-4 py-4 align-top">
                                <div className="flex flex-col gap-1.5">
                                  {salary ? (
                                    <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-100">
                                      <Wallet className="h-3 w-3" />
                                      {salary}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-muted-foreground/55">
                                      Salary not listed
                                    </span>
                                  )}
                                  {v.addressSpec ? (
                                    <div className="inline-flex max-w-[12rem] items-start gap-1.5 rounded-lg border border-sky-400/20 bg-sky-500/8 px-2 py-1 text-xs text-sky-100/90">
                                      <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                                      <AtsHoverText
                                        text={v.addressSpec}
                                        lines={2}
                                        className="min-w-0 text-sky-100/90"
                                      />
                                    </div>
                                  ) : null}
                                </div>
                              </TableCell>
                              <TableCell className="whitespace-normal px-4 py-4 align-top">
                                <AtsStatusBadge status={v.status} />
                              </TableCell>
                              <TableCell className="whitespace-normal px-4 py-4 align-top">
                                {applyHref ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Link
                                        href={applyHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex max-w-[12rem] items-center gap-1.5 rounded-lg border border-violet-400/25 bg-violet-500/10 px-2 py-1.5 font-mono text-[11px] text-violet-200 transition hover:border-violet-400/40 hover:bg-violet-500/15"
                                      >
                                        <span className="truncate">
                                          …/jobs/{v.id}
                                        </span>
                                        <ExternalLink className="h-3 w-3 shrink-0 opacity-80" />
                                      </Link>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      sideOffset={6}
                                      className="max-w-sm break-all font-mono text-[11px]"
                                    >
                                      {applyHref}
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="whitespace-normal px-4 py-4 align-top">
                                <div className="flex flex-wrap justify-end gap-2">
                                  {isOpen ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 rounded-lg border-border/70"
                                      onClick={() =>
                                        void setStatus(v.id, "closed")
                                      }
                                    >
                                      Close
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 rounded-lg border-emerald-400/35 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
                                      onClick={() =>
                                        void setStatus(v.id, "open")
                                      }
                                    >
                                      Reopen
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    </TooltipProvider>
                  </div>
                </div>
              );
            })()
          )}
        </AtsSectionCard>
      </AtsPanelShell>
    </AtsAdminShell>
  );
}
