"use client";

import { useState } from "react";
import { KeyRound, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  ATS_ACCENTS,
  AtsPanelShell,
  AtsSectionCard,
  atsPrimaryBtnClass,
} from "@/components/ats/atsChrome";
import { atsGraphqlUrl } from "@/lib/atsGraphqlUrl";
import { cn } from "@/lib/utils";

const GRAPHQL_URL = atsGraphqlUrl();

type Props = {
  token: string;
  forced?: boolean;
  onChanged?: () => void;
};

function OtpRow({
  label,
  value,
  onChange,
  autoFocus,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      <Label className="flex justify-center text-muted-foreground">{label}</Label>
      <div className="flex justify-center overflow-x-auto px-1">
        <InputOTP
          maxLength={6}
          value={value}
          onChange={(v) => onChange(v.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          autoFocus={autoFocus}
          disabled={disabled}
          inputMode="text"
          pattern="[A-Za-z0-9]*"
          containerClassName="gap-1.5 sm:gap-2"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <InputOTPGroup key={i}>
              <InputOTPSlot
                index={i}
                className="size-9 rounded-lg border border-violet-400/30 bg-violet-500/10 text-base uppercase sm:size-10"
              />
            </InputOTPGroup>
          ))}
        </InputOTP>
      </div>
    </div>
  );
}

export function AtsChangeOtpPanel({ token, forced, onChanged }: Props) {
  const [currentOtp, setCurrentOtp] = useState("");
  const [newOtp, setNewOtp] = useState("");
  const [confirmOtp, setConfirmOtp] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit =
    currentOtp.length === 6 &&
    newOtp.length === 6 &&
    confirmOtp.length === 6 &&
    !busy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = newOtp.trim().toUpperCase();
    const conf = confirmOtp.trim().toUpperCase();
    if (next !== conf) {
      toast.error("New codes do not match");
      return;
    }
    if (!/^[A-Z0-9]{6}$/.test(next)) {
      toast.error("New code must be 6 letters/numbers");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `mutation ($currentOtp: String!, $newOtp: String!) {
            changeAtsAdminOtp(currentOtp: $currentOtp, newOtp: $newOtp)
          }`,
          variables: {
            currentOtp: currentOtp.trim().toUpperCase(),
            newOtp: next,
          },
        }),
      });
      const json = await res.json();
      if (json.errors?.length) {
        throw new Error(json.errors[0]?.message || "Change failed");
      }
      toast.success("Access code updated");
      setCurrentOtp("");
      setNewOtp("");
      setConfirmOtp("");
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Change failed");
      setCurrentOtp("");
      setNewOtp("");
      setConfirmOtp("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AtsPanelShell>
      {forced ? (
        <div className="flex gap-3 rounded-2xl border border-amber-400/35 bg-linear-to-br from-amber-500/20 via-amber-500/8 to-orange-500/15 px-4 py-3.5 shadow-sm ring-1 ring-amber-400/20">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-200">
            <ShieldAlert className="h-4 w-4" />
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-semibold tracking-tight text-foreground">
              Temporary code — change required
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Your Manager issued this ATS unlock code. Enter it below, then
              choose a private 6-character code before opening vacancies or
              applications.
            </p>
          </div>
        </div>
      ) : null}

      <AtsSectionCard
        title={forced ? "Set a new access code" : "Change access code"}
        description={
          forced
            ? "Same flow as HotCol Emp portal OTP: current code from Manager, then your own code."
            : "Update the unlock code for your ATS Admin role. Use 6 alphanumeric characters."
        }
        icon={<ShieldCheck className="h-5 w-5" />}
        accent={ATS_ACCENTS.amber}
      >
        <form
          onSubmit={submit}
          className="relative mx-auto max-w-md space-y-6 overflow-hidden rounded-2xl border border-violet-400/20 bg-card/80 p-5 shadow-sm ring-1 ring-violet-400/10 sm:p-6"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-violet-400 via-indigo-400 to-amber-400" />

          <OtpRow
            label="Current code"
            value={currentOtp}
            onChange={setCurrentOtp}
            autoFocus
            disabled={busy}
          />
          <OtpRow
            label="New code"
            value={newOtp}
            onChange={setNewOtp}
            disabled={busy}
          />
          <OtpRow
            label="Confirm new code"
            value={confirmOtp}
            onChange={setConfirmOtp}
            disabled={busy}
          />

          <Button
            type="submit"
            className={cn(atsPrimaryBtnClass, "h-11 w-full cursor-pointer")}
            disabled={!canSubmit}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            {busy ? "Saving…" : "Save new code"}
          </Button>

          <p className="text-center text-[11px] text-muted-foreground">
            Letters and digits only (e.g. AB1234). Keep your new code private —
            Manager will not see it after you unlock.
          </p>
        </form>
      </AtsSectionCard>
    </AtsPanelShell>
  );
}
