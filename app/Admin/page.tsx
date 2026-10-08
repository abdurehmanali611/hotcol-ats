"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  ApexBrandFooter,
  ApexBrandLockup,
} from "@/components/ats/ApexBrand";
import {
  ATS_ACCENTS,
  AtsPanelShell,
  AtsSectionCard,
  atsPrimaryBtnClass,
} from "@/components/ats/atsChrome";
import {
  ATS_ADMIN_META_KEY,
  ATS_ADMIN_TOKEN_KEY,
} from "@/lib/atsAdminSession";
import { atsGraphqlUrl } from "@/lib/atsGraphqlUrl";
import { cn } from "@/lib/utils";

const GRAPHQL_URL = atsGraphqlUrl();

export default function AtsAdminUnlockPage() {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6 || busy) return;
    setBusy(true);
    try {
      const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `mutation ($otp: String!) {
            atsAdminUnlock(otp: $otp) {
              token tinNumber role displayName logoUrl mustChangeOtp
            }
          }`,
          variables: { otp: otp.trim() },
        }),
      });
      const json = await res.json();
      if (json.errors?.length) {
        throw new Error(json.errors[0]?.message || "Unlock failed");
      }
      const session = json.data.atsAdminUnlock;
      localStorage.setItem(ATS_ADMIN_TOKEN_KEY, session.token);
      localStorage.setItem(
        ATS_ADMIN_META_KEY,
        JSON.stringify({
          tinNumber: session.tinNumber,
          role: session.role,
          displayName: session.displayName,
          logoUrl: session.logoUrl || null,
          mustChangeOtp: Boolean(session.mustChangeOtp),
        }),
      );
      toast.success(`Signed in as ${session.role}`);
      router.push(
        session.mustChangeOtp ? "/Admin/security" : "/Admin/vacancies",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code");
      setOtp("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-full bg-background">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-violet-500/12 via-transparent to-amber-500/8" />
      <div className="pointer-events-none absolute -left-20 top-16 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-56 w-56 rounded-full bg-amber-500/15 blur-3xl" />
      <div className="relative mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-4 py-12">
        <AtsPanelShell>
          <div className="mb-5 flex justify-center">
            <ApexBrandLockup product="ATS" subtitle="Admin unlock" markSize={44} />
          </div>
          <AtsSectionCard
            title="Admin unlock"
            description="Enter the HR or Manager access code issued for your hotel. After first unlock, Manager can no longer see the code; you may be asked to set your own."
            icon={<KeyRound className="h-5 w-5" />}
            accent={ATS_ACCENTS.amber}
          >
            <form onSubmit={unlock} className="space-y-5">
              <div className="space-y-3">
                <Label className="flex justify-center text-muted-foreground">
                  Access code
                </Label>
                <div className="flex justify-center overflow-x-auto px-1">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(v) =>
                      setOtp(v.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                    }
                    autoFocus
                    disabled={busy}
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
              <Button
                type="submit"
                className={cn(atsPrimaryBtnClass, "h-11 w-full cursor-pointer")}
                disabled={busy || otp.length < 6}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                {busy ? "Unlocking…" : "Unlock"}
              </Button>
            </form>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Looking for open roles?{" "}
              <Link
                href="/"
                className="font-medium text-violet-300 underline-offset-2 hover:underline"
              >
                Careers home
              </Link>
            </p>
          </AtsSectionCard>
        </AtsPanelShell>
        <ApexBrandFooter />
      </div>
    </div>
  );
}
