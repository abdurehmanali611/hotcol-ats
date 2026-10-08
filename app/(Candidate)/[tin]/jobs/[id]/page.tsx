"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Loader2,
  MapPin,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/phone-input";
import {
  ApexBrandFooter,
  ApexBrandLockup,
} from "@/components/ats/ApexBrand";
import { AtsOptionCombobox } from "@/components/ats/AtsOptionCombobox";
import {
  isCloudinaryFileConfigured,
  uploadFileToCloudinary,
} from "@/lib/cloudinary";
import { atsGraphqlUrl } from "@/lib/atsGraphqlUrl";
import { cn } from "@/lib/utils";

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
};

const EDUCATION_OPTIONS = [
  { value: "high_school", label: "High school" },
  { value: "certificate", label: "Certificate / vocational" },
  { value: "diploma", label: "Diploma" },
  { value: "bachelor", label: "Bachelor’s degree" },
  { value: "master", label: "Master’s or higher" },
  { value: "other", label: "Other" },
];

const GRAPHQL_URL = atsGraphqlUrl();

const fieldClass =
  "h-11 w-full rounded-xl border-border/80 bg-background/80 shadow-sm focus-visible:border-sky-400/40 focus-visible:ring-sky-400/20";
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

export default function CandidateApplyPage() {
  const params = useParams();
  const router = useRouter();
  const tin = String(params?.tin || "").trim();
  const id = Number(params?.id);
  const [job, setJob] = useState<Vacancy | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [coverNote, setCoverNote] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!tin || !(id > 0)) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await gqlPublic<{
          atsTenantPublic: {
            displayName: string;
            logoUrl?: string | null;
          } | null;
          atsVacancyPublic: Vacancy | null;
        }>(
          `query ($tin: String!, $id: Int!) {
            atsTenantPublic(tin: $tin) { displayName logoUrl }
            atsVacancyPublic(tin: $tin, id: $id) {
              id title description department team grossSalaryETB addressSpec
              requireEmail requireCv
            }
          }`,
          { tin, id },
        );
        if (cancelled) return;
        setDisplayName(data.atsTenantPublic?.displayName || tin);
        setLogoUrl(data.atsTenantPublic?.logoUrl || null);
        setJob(data.atsVacancyPublic);
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Could not load job");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tin, id]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;
    if (!fullName.trim()) {
      toast.error("Name is required");
      return;
    }
    const yearsNum = Number(yearsExperience);
    if (
      yearsExperience.trim() === "" ||
      !Number.isFinite(yearsNum) ||
      yearsNum < 0
    ) {
      toast.error("Enter years of experience");
      return;
    }
    if (!educationLevel) {
      toast.error("Select education level");
      return;
    }
    if (job.requireEmail && !email.trim()) {
      toast.error("Email is required for this role");
      return;
    }
    if (job.requireCv && !cvFile) {
      toast.error("Please attach your CV");
      return;
    }
    if (cvFile && !isCloudinaryFileConfigured()) {
      toast.error("CV upload is not configured");
      return;
    }
    setSubmitting(true);
    try {
      let uploaded: {
        secureUrl: string;
        publicId: string;
        bytes: number;
        format: string;
        originalFilename: string;
      } | null = null;
      if (cvFile) {
        uploaded = await uploadFileToCloudinary(cvFile, {
          folder: `hotcol-ats/${tin}/cvs`,
        });
      }
      await gqlPublic(
        `mutation (
          $tin: String!
          $vacancyId: Int!
          $fullName: String!
          $phone: String
          $email: String
          $coverNote: String
          $yearsExperience: String
          $educationLevel: String
          $cvSecureUrl: String
          $cvPublicId: String
          $cvBytes: Int
          $cvFormat: String
          $cvOriginalFilename: String
        ) {
          applyAtsApplication(
            tin: $tin
            vacancyId: $vacancyId
            fullName: $fullName
            phone: $phone
            email: $email
            coverNote: $coverNote
            yearsExperience: $yearsExperience
            educationLevel: $educationLevel
            cvSecureUrl: $cvSecureUrl
            cvPublicId: $cvPublicId
            cvBytes: $cvBytes
            cvFormat: $cvFormat
            cvOriginalFilename: $cvOriginalFilename
          ) { id }
        }`,
        {
          tin,
          vacancyId: job.id,
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          coverNote: coverNote.trim(),
          yearsExperience: String(yearsNum),
          educationLevel,
          cvSecureUrl: uploaded?.secureUrl || "",
          cvPublicId: uploaded?.publicId || "",
          cvBytes: uploaded?.bytes || 0,
          cvFormat: uploaded?.format || "",
          cvOriginalFilename: uploaded?.originalFilename || "",
        },
      );
      toast.success("Application submitted");
      router.push(`/${encodeURIComponent(tin)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Apply failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Job not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This role may be closed or the link is wrong.
        </p>
        <Button asChild className="mt-6 rounded-xl" variant="outline">
          <Link href={`/${encodeURIComponent(tin)}`}>Back to careers</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden bg-linear-to-br from-background via-[#0c1220] to-[#121018]"
        aria-hidden
      />

      <div className="relative shrink-0 border-b border-amber-400/12">
        <div
          className="h-1 w-full bg-linear-to-r from-amber-400 via-violet-400 to-sky-400"
          aria-hidden
        />
        <div className="bg-linear-to-br from-amber-500/10 via-background to-violet-500/8">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
            <ApexBrandLockup
              product="Careers"
              subtitle={displayName || tin}
              logoUrl={logoUrl}
              markSize={36}
            />
            <Link
              href={`/${encodeURIComponent(tin)}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-amber-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to careers
            </Link>
          </div>
        </div>
      </div>

      <div className="relative mx-auto grid w-full max-w-5xl flex-1 gap-6 px-4 py-6 lg:grid-cols-2 lg:items-start lg:gap-8 lg:py-8">
        <section className="rounded-2xl border border-border/70 bg-card/90 p-5 shadow-md ring-1 ring-white/6 sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300/80">
            Open role
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {job.title}
          </h1>
          {job.department || job.team ? (
            <p className="mt-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {[job.department, job.team].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          {(job.grossSalaryETB != null &&
            Number.isFinite(job.grossSalaryETB)) ||
          job.addressSpec ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {job.grossSalaryETB != null &&
              Number.isFinite(job.grossSalaryETB) ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1.5 text-sm text-emerald-100">
                  <Wallet className="h-3.5 w-3.5" />
                  {Number(job.grossSalaryETB).toLocaleString()} ETB gross
                </span>
              ) : null}
              {job.addressSpec ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 px-2.5 py-1.5 text-sm text-sky-100">
                  <MapPin className="h-3.5 w-3.5" />
                  {job.addressSpec}
                </span>
              ) : null}
            </div>
          ) : null}
          {job.description ? (
            <div className="mt-5 border-t border-border/50 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                About this role
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {job.description}
              </p>
            </div>
          ) : null}
        </section>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-border/70 bg-card/95 p-5 shadow-md ring-1 ring-white/6 sm:p-6"
        >
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Apply
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Attach a PDF CV. No account required.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-muted-foreground">
              Full name
            </Label>
            <Input
              id="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={fieldClass}
              required
              disabled={submitting}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="years" className="text-muted-foreground">
                Years of experience
              </Label>
              <Input
                id="years"
                type="number"
                inputMode="numeric"
                min={0}
                max={60}
                step={1}
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
                className={fieldClass}
                placeholder="e.g. 3"
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Education level</Label>
              <AtsOptionCombobox
                value={educationLevel}
                onChange={setEducationLevel}
                options={EDUCATION_OPTIONS}
                placeholder="Select education"
                searchPlaceholder="Search education…"
                emptyText="No education level found."
                disabled={submitting}
                className={cn(fieldClass, "w-full")}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Phone</Label>
              <PhoneInput
                defaultCountry="ET"
                international
                value={phone}
                onChange={(v) => setPhone(v || "")}
                disabled={submitting}
                className="h-11 w-full"
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-muted-foreground">
                Email
                {!job.requireEmail ? (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    (optional)
                  </span>
                ) : null}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClass}
                required={job.requireEmail}
                disabled={submitting}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note" className="text-muted-foreground">
              Cover note (optional)
            </Label>
            <Textarea
              id="note"
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)}
              rows={3}
              className="rounded-xl border-border/80 bg-background/80 shadow-sm focus-visible:border-sky-400/40 focus-visible:ring-sky-400/20"
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">
              CV (PDF)
              {!job.requireCv ? (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  (optional)
                </span>
              ) : null}
            </Label>
            <input
              ref={cvInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf"
              className="sr-only"
              disabled={submitting}
              onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              className={cn(
                "h-11 w-full cursor-pointer justify-start gap-2 rounded-xl border-border/80 bg-background/80",
                !cvFile && "text-muted-foreground",
              )}
              onClick={() => cvInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 shrink-0" />
              {cvFile ? "Replace CV file" : "Choose CV file"}
            </Button>
            {cvFile ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-100">
                <FileText className="h-4 w-4 shrink-0 text-emerald-300" />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {cvFile.name}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {(cvFile.size / 1024).toFixed(0)} KB
                </span>
                <button
                  type="button"
                  disabled={submitting}
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                  aria-label="Remove CV"
                  onClick={() => {
                    setCvFile(null);
                    if (cvInputRef.current) cvInputRef.current.value = "";
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {job.requireCv
                  ? "PDF preferred."
                  : "Optional — PDF preferred if you upload one."}
              </p>
            )}
          </div>
          <Button
            type="submit"
            className="h-12 w-full gap-1.5 rounded-xl border-sky-500/40 bg-sky-500/90 text-base text-white shadow-sm hover:bg-sky-500"
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {submitting ? "Submitting…" : "Submit application"}
          </Button>
        </form>
      </div>
      <ApexBrandFooter className="relative shrink-0" />
    </div>
  );
}
