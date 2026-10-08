/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AtsAdminShell } from "@/components/ats/atsChrome";
import { AtsChangeOtpPanel } from "@/components/ats/AtsChangeOtpPanel";
import {
  ATS_ADMIN_TOKEN_KEY,
  readAtsAdminMeta,
  writeAtsAdminMeta,
  type AtsAdminMeta,
} from "@/lib/atsAdminSession";

export default function AtsAdminSecurityPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [meta, setMeta] = useState<AtsAdminMeta>({});

  useEffect(() => {
    const t = localStorage.getItem(ATS_ADMIN_TOKEN_KEY);
    if (!t) {
      router.replace("/Admin");
      return;
    }
    setToken(t);
    setMeta(readAtsAdminMeta());
  }, [router]);

  if (!token) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <AtsAdminShell meta={meta} forceSecurity={Boolean(meta.mustChangeOtp)}>
      <AtsChangeOtpPanel
        token={token}
        forced={Boolean(meta.mustChangeOtp)}
        onChanged={() => {
          const next = { ...readAtsAdminMeta(), mustChangeOtp: false };
          writeAtsAdminMeta(next);
          setMeta(next);
          router.replace("/Admin/vacancies");
        }}
      />
    </AtsAdminShell>
  );
}
