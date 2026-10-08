"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCheck,
  Copy,
  FileText,
  Layers,
  Loader2,
  Search,
  UserPlus,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  ATS_APPLICATION_STATUSES,
  atsCanMultiPassFrom,
  atsCanPassFrom,
  atsForwardTargetsAfter,
  atsNextForwardStatus,
  formatAtsStatusLabel,
} from "@/lib/atsPipeline";
import { atsGraphqlUrl } from "@/lib/atsGraphqlUrl";
import { cn } from "@/lib/utils";

const GRAPHQL_URL = atsGraphqlUrl();

const MANAGER_ONLY_STATUSES = new Set(["offer", "offer_accepted"]);

function statusNeedsManager(status: string) {
  return MANAGER_ONLY_STATUSES.has(String(status || "").trim());
}

const MANAGER_OFFER_HINT =
  "Unlock Admin with the Manager ATS OTP to move candidates to Offer or Offer accepted (F40)";

type Application = {
  id: number;
  fullName: string;
  phone: string;
  email: string;
  status: string;
  cvSecureUrl: string;
  updatedByRole: string;
  employeeId?: number | null;
  vacancy?: { title: string } | null;
};

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

export default function AtsAdminApplicationsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [meta, setMeta] = useState<AtsAdminMeta>({});
  const [statusFilter, setStatusFilter] = useState("applied");
  const [candidateQuery, setCandidateQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [rows, setRows] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [multiOpen, setMultiOpen] = useState(false);
  const [multiTarget, setMultiTarget] = useState("");
  const [hiringId, setHiringId] = useState<number | null>(null);
  const [hireOtpById, setHireOtpById] = useState<Record<number, string>>({});

  useEffect(() => {
    const t = localStorage.getItem(ATS_ADMIN_TOKEN_KEY);
    if (!t) {
      router.replace("/Admin");
      return;
    }
    setToken(t);
    setMeta(readAtsAdminMeta());
  }, [router]);

  const statusOptions = useMemo(
    () =>
      ATS_APPLICATION_STATUSES.map((s) => ({
        value: s,
        label: formatAtsStatusLabel(s),
      })),
    [],
  );

  const roleOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of rows) {
      const title = String(row.vacancy?.title || "").trim();
      if (title) map.set(title, title);
    }
    return [...map.values()]
      .sort((a, b) => a.localeCompare(b))
      .map((title) => ({ value: title, label: title }));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = candidateQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (roleFilter) {
        const title = String(row.vacancy?.title || "").trim();
        if (title !== roleFilter) return false;
      }
      if (!q) return true;
      const hay = [
        row.fullName,
        row.phone,
        row.email,
        row.vacancy?.title,
        row.employeeId != null ? String(row.employeeId) : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, candidateQuery, roleFilter]);

  const hasCandidateFilters = Boolean(
    candidateQuery.trim() || roleFilter,
  );

  const clearCandidateFilters = () => {
    setCandidateQuery("");
    setRoleFilter("");
  };

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await atsGql<{ atsAdminApplications: Application[] }>(
        token,
        `query ($status: String) {
          atsAdminApplications(status: $status) {
            id fullName phone email status cvSecureUrl updatedByRole employeeId
            vacancy { title }
          }
        }`,
        { status: statusFilter },
      );
      setRows(data.atsAdminApplications || []);
      setSelected(new Set());
      setRoleFilter("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(filteredRows.map((r) => r.id));
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [filteredRows]);

  const allIds = useMemo(() => filteredRows.map((r) => r.id), [filteredRows]);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(allIds) : new Set());
  };

  const toggleOne = (id: number, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const moveSelected = async (targetStatus: string) => {
    if (!token || selected.size === 0) return;
    const isManager = String(meta.role || "").trim() === "Manager";
    if (statusNeedsManager(targetStatus) && !isManager) {
      toast.error(MANAGER_OFFER_HINT);
      return;
    }
    setBusy(true);
    try {
      const ids = [...selected];
      const count = await atsGql<{ updateAtsApplicationStatuses: number }>(
        token,
        `mutation ($ids: [Int!]!, $status: String!) {
          updateAtsApplicationStatuses(ids: $ids, status: $status)
        }`,
        { ids, status: targetStatus },
      );
      const n = count.updateAtsApplicationStatuses ?? ids.length;
      toast.success(
        n === 1
          ? `Moved to ${formatAtsStatusLabel(targetStatus)}`
          : `Moved ${n} to ${formatAtsStatusLabel(targetStatus)}`,
      );
      setMultiOpen(false);
      setMultiTarget("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const isManagerSession = String(meta.role || "").trim() === "Manager";

  const onPass = () => {
    const next = atsNextForwardStatus(statusFilter);
    if (!next) {
      toast.error("No next stage from this status");
      return;
    }
    if (statusNeedsManager(next) && !isManagerSession) {
      toast.error(MANAGER_OFFER_HINT);
      return;
    }
    void moveSelected(next);
  };

  const openMultiPass = () => {
    const targets = atsForwardTargetsAfter(statusFilter);
    if (targets.length === 0) {
      toast.error("No later stages available");
      return;
    }
    const allowed = isManagerSession
      ? targets
      : targets.filter((s) => !statusNeedsManager(s));
    if (allowed.length === 0) {
      toast.error(MANAGER_OFFER_HINT);
      return;
    }
    setMultiTarget(allowed[0]);
    setMultiOpen(true);
  };

  const hire = async (id: number) => {
    if (!token) return;
    setHiringId(id);
    try {
      const data = await atsGql<{
        hireAtsApplication: {
          employeeId: number;
          portalOtpPreview: string;
        };
      }>(
        token,
        `mutation ($id: Int!) {
          hireAtsApplication(id: $id) {
            employeeId
            portalOtpPreview
          }
        }`,
        { id },
      );
      const preview = data.hireAtsApplication?.portalOtpPreview || "";
      if (preview) {
        setHireOtpById((prev) => ({ ...prev, [id]: preview }));
      }
      toast.success(
        `Hired as employee #${data.hireAtsApplication.employeeId}. Copy the portal OTP now.`,
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hire failed");
    } finally {
      setHiringId(null);
    }
  };

  const canHire = (a: Application) =>
    !a.employeeId &&
    (a.status === "offer" || a.status === "offer_accepted");

  const showPassActions =
    atsCanPassFrom(statusFilter) || atsCanMultiPassFrom(statusFilter);
  const showReject = statusFilter !== "rejected";
  const showWithdrawn = statusFilter !== "withdrawn";
  const multiTargets = atsForwardTargetsAfter(statusFilter);
  const nextLabel = atsNextForwardStatus(statusFilter);
  const passNeedsManager =
    Boolean(nextLabel) &&
    statusNeedsManager(nextLabel!) &&
    !isManagerSession;
  const multiHasManagerOnly =
    !isManagerSession && multiTargets.some((s) => statusNeedsManager(s));
  const multiHasUnlockedTarget =
    isManagerSession || multiTargets.some((s) => !statusNeedsManager(s));

  if (!token) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <AtsAdminShell meta={meta}>
      <AtsPanelShell>
        <AtsPageHero
          title="Applications"
          description="Filter by stage, select candidates, then Pass, MultiPass, Reject, or Withdrawn. Offer and hire need a Manager ATS session."
        />

        <AtsSectionCard
          title="Pipeline"
          description="Only applicants in the selected status are loaded. Bulk moves update status for the checked rows."
          icon={<FileText className="h-5 w-5" />}
          accent={ATS_ACCENTS.violet}
        >
          <div className="mb-5 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AtsStatusBadge status={statusFilter} />
                <span>
                  {loading
                    ? "Loading…"
                    : hasCandidateFilters
                      ? `${filteredRows.length} of ${rows.length} applicant${rows.length === 1 ? "" : "s"}`
                      : `${rows.length} applicant${rows.length === 1 ? "" : "s"}`}
                </span>
              </div>
              <div className="w-full max-w-xs space-y-1.5 sm:ml-auto">
                <Label className="text-muted-foreground">Stage filter</Label>
                <AtsOptionCombobox
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={statusOptions}
                  placeholder="Select status"
                  searchPlaceholder="Search stages…"
                  emptyText="No stage found."
                  disabled={loading || busy}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-muted/15 p-3 ring-1 ring-white/4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Label
                    htmlFor="candidate-filter"
                    className="text-muted-foreground"
                  >
                    Candidate
                  </Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="candidate-filter"
                      value={candidateQuery}
                      onChange={(e) => setCandidateQuery(e.target.value)}
                      placeholder="Search name, phone, email…"
                      className={cn(atsFieldClass, "pl-9 pr-9")}
                      disabled={loading || busy}
                    />
                    {candidateQuery ? (
                      <button
                        type="button"
                        className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                        aria-label="Clear candidate search"
                        onClick={() => setCandidateQuery("")}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="w-full space-y-1.5 lg:max-w-xs">
                  <Label className="text-muted-foreground">Role</Label>
                  <AtsOptionCombobox
                    value={roleFilter || "__all__"}
                    onChange={(v) =>
                      setRoleFilter(v === "__all__" ? "" : v)
                    }
                    options={[
                      { value: "__all__", label: "All roles" },
                      ...roleOptions,
                    ]}
                    placeholder="All roles"
                    searchPlaceholder="Search roles…"
                    emptyText="No roles in this stage."
                    disabled={loading || busy || roleOptions.length === 0}
                  />
                </div>
                {hasCandidateFilters ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 shrink-0 rounded-xl"
                    disabled={busy}
                    onClick={clearCandidateFilters}
                  >
                    Clear filters
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          {selected.size > 0 ? (
            <div className="mb-4 space-y-2">
              <div className="flex flex-col gap-3 rounded-2xl border border-violet-400/25 bg-linear-to-r from-violet-500/12 via-background/80 to-sky-500/10 p-3 ring-1 ring-violet-400/15 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-violet-100">
                    {selected.size} selected
                  </span>
                  {showReject ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      className="h-9 rounded-xl border-rose-400/35 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
                      onClick={() => void moveSelected("rejected")}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                  ) : null}
                  {showWithdrawn ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      className="h-9 rounded-xl border-rose-400/25 text-rose-200/90 hover:bg-rose-500/10"
                      onClick={() => void moveSelected("withdrawn")}
                    >
                      Withdrawn
                    </Button>
                  ) : null}
                </div>
                {showPassActions ? (
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {atsCanPassFrom(statusFilter) && nextLabel ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        title={
                          passNeedsManager ? MANAGER_OFFER_HINT : undefined
                        }
                        className={cn(
                          atsPrimaryBtnClass,
                          "h-9 cursor-pointer rounded-xl",
                          passNeedsManager &&
                            "border-amber-400/40 bg-amber-500/80 hover:bg-amber-500",
                        )}
                        onClick={onPass}
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCheck className="h-3.5 w-3.5" />
                        )}
                        Pass → {formatAtsStatusLabel(nextLabel)}
                        {passNeedsManager ? " · Manager" : ""}
                      </Button>
                    ) : null}
                    {atsCanMultiPassFrom(statusFilter) ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy || !multiHasUnlockedTarget}
                        title={
                          !multiHasUnlockedTarget
                            ? MANAGER_OFFER_HINT
                            : undefined
                        }
                        className="h-9 rounded-xl border-sky-400/35 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20"
                        onClick={openMultiPass}
                      >
                        <Layers className="h-3.5 w-3.5" />
                        MultiPass
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {(passNeedsManager || multiHasManagerOnly) &&
              !isManagerSession ? (
                <p className="px-1 text-[11px] leading-relaxed text-amber-200/90">
                  Signed in as HR — Offer / Offer accepted need a Manager ATS
                  unlock (F40). Log out and unlock with the Manager OTP.
                </p>
              ) : null}
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <AtsEmptyState
              title={`No ${formatAtsStatusLabel(statusFilter).toLowerCase()} applications`}
              description="Try another stage, or wait for new candidates on the careers page."
              icon={<FileText className="h-6 w-6" />}
            />
          ) : filteredRows.length === 0 ? (
            <AtsEmptyState
              title="No candidates match"
              description="Clear or adjust the candidate / role filters to see more of this stage."
              icon={<Search className="h-6 w-6" />}
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/40 ring-1 ring-white/5">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead className="h-11 w-12 px-4">
                      <Checkbox
                        checked={
                          allSelected
                            ? true
                            : someSelected
                              ? "indeterminate"
                              : false
                        }
                        onCheckedChange={(v) => toggleAll(v === true)}
                        aria-label="Select all"
                        disabled={busy}
                      />
                    </TableHead>
                    <TableHead className="h-11 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Candidate
                    </TableHead>
                    <TableHead className="h-11 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Role
                    </TableHead>
                    <TableHead className="h-11 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Contact
                    </TableHead>
                    <TableHead className="h-11 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      CV
                    </TableHead>
                    <TableHead className="h-11 px-4 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Hire
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((a) => {
                    const checked = selected.has(a.id);
                    return (
                      <TableRow
                        key={a.id}
                        data-state={checked ? "selected" : undefined}
                        className={cn(
                          "border-border/50 transition-colors hover:bg-white/[0.03]",
                          checked && "bg-violet-500/[0.07]",
                        )}
                      >
                        <TableCell className="px-4 py-3.5 align-middle">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) =>
                              toggleOne(a.id, v === true)
                            }
                            aria-label={`Select ${a.fullName}`}
                            disabled={busy}
                          />
                        </TableCell>
                        <TableCell className="px-4 py-3.5 align-top">
                          <p className="font-semibold tracking-tight">
                            {a.fullName}
                          </p>
                          {a.updatedByRole ? (
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              Last move by {a.updatedByRole}
                            </p>
                          ) : null}
                          {a.employeeId ? (
                            <p className="mt-0.5 text-[11px] text-emerald-300/90">
                              HR #{a.employeeId}
                            </p>
                          ) : null}
                          {hireOtpById[a.id] ? (
                            <div className="mt-2 max-w-xs overflow-hidden rounded-xl border border-amber-400/30 bg-linear-to-br from-amber-500/20 via-amber-500/8 to-orange-500/10 p-2.5 ring-1 ring-amber-400/20">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-100">
                                Portal OTP
                              </p>
                              <p className="mt-1 font-mono text-base tracking-[0.22em] text-amber-100">
                                {hireOtpById[a.id]}
                              </p>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="mt-2 h-8 rounded-lg border-amber-400/30 bg-background/40 text-amber-100 hover:bg-amber-500/15"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(
                                      hireOtpById[a.id],
                                    );
                                    toast.success("Copied");
                                    setHireOtpById((prev) => {
                                      const next = { ...prev };
                                      delete next[a.id];
                                      return next;
                                    });
                                  } catch {
                                    /* ignore */
                                  }
                                }}
                              >
                                <Copy className="h-3.5 w-3.5" />
                                Copy and dismiss
                              </Button>
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 align-top text-sm text-muted-foreground">
                          {a.vacancy?.title || "—"}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 align-top text-sm text-muted-foreground">
                          <div className="space-y-0.5">
                            <p>{a.phone || "—"}</p>
                            <p className="text-xs opacity-80">
                              {a.email || "—"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3.5 align-top">
                          {a.cvSecureUrl ? (
                            <a
                              href={a.cvSecureUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-medium text-violet-300 underline-offset-2 hover:underline"
                            >
                              Download
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 align-top text-right">
                          {canHire(a) ? (
                            <Button
                              size="sm"
                              disabled={hiringId === a.id || busy}
                              className={cn(
                                atsPrimaryBtnClass,
                                "h-8 cursor-pointer rounded-lg",
                              )}
                              onClick={() => void hire(a.id)}
                            >
                              {hiringId === a.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <UserPlus className="h-3.5 w-3.5" />
                              )}
                              Hire
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </AtsSectionCard>
      </AtsPanelShell>

      <Dialog open={multiOpen} onOpenChange={setMultiOpen}>
        <DialogContent className="rounded-2xl border-border/70 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>MultiPass</DialogTitle>
            <DialogDescription>
              Move {selected.size} selected candidate
              {selected.size === 1 ? "" : "s"} from{" "}
              <span className="font-medium text-foreground">
                {formatAtsStatusLabel(statusFilter)}
              </span>{" "}
              to a later stage.
              {!isManagerSession ? (
                <span className="mt-1.5 block text-amber-200/90">
                  Offer and Offer accepted require a Manager ATS unlock (F40).
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <RadioGroup
            value={multiTarget}
            onValueChange={setMultiTarget}
            className="gap-2 py-2"
          >
            {multiTargets.map((s) => {
              const locked = statusNeedsManager(s) && !isManagerSession;
              return (
                <Label
                  key={s}
                  htmlFor={`multipass-${s}`}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-3 transition",
                    locked
                      ? "cursor-not-allowed opacity-55"
                      : "cursor-pointer hover:bg-muted/35",
                    multiTarget === s &&
                      !locked &&
                      "border-sky-400/40 bg-sky-500/10 ring-1 ring-sky-400/25",
                  )}
                >
                  <RadioGroupItem
                    value={s}
                    id={`multipass-${s}`}
                    disabled={locked}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {formatAtsStatusLabel(s)}
                    </span>
                    {locked ? (
                      <span className="block text-[11px] text-amber-200/85">
                        Manager ATS OTP required
                      </span>
                    ) : null}
                  </span>
                </Label>
              );
            })}
          </RadioGroup>
          <DialogFooter className="gap-3 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={busy}
              onClick={() => setMultiOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                busy ||
                !multiTarget ||
                (statusNeedsManager(multiTarget) && !isManagerSession)
              }
              className={cn(atsPrimaryBtnClass, "rounded-xl cursor-pointer")}
              onClick={() => void moveSelected(multiTarget)}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Layers className="h-4 w-4" />
              )}
              Pass to {formatAtsStatusLabel(multiTarget || "…")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AtsAdminShell>
  );
}
