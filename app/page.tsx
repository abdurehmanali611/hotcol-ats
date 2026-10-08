import Link from "next/link";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ApexBrandFooter,
  ApexBrandLockup,
} from "@/components/ats/ApexBrand";

export default function Home() {
  return (
    <div className="relative min-h-full bg-background">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-violet-500/14 via-transparent to-amber-500/10" />
      <div className="pointer-events-none absolute -left-20 top-16 h-64 w-64 rounded-full bg-amber-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-20 h-56 w-56 rounded-full bg-violet-500/15 blur-3xl" />
      <main className="relative mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center px-4 py-16">
        <div className="relative overflow-hidden rounded-2xl border border-amber-400/15 bg-card/95 p-6 shadow-md ring-1 ring-white/6 sm:p-8">
          <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-amber-400 via-violet-400 to-sky-400" />
          <ApexBrandLockup product="ATS" markSize={44} />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
            Recruiting for HotCol hotels
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Candidates open a property careers link (
            <code className="rounded bg-muted/60 px-1 py-0.5 text-xs text-foreground/90">
              /{"{TIN}"}
            </code>
            ). Staff unlock Admin with the access code issued by the hotel
            Manager.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button
              asChild
              className="gap-1.5 rounded-xl border-violet-500/50 bg-violet-500/90 text-white hover:bg-violet-500"
            >
              <Link href="/Admin">
                <KeyRound className="h-4 w-4" />
                Admin unlock
              </Link>
            </Button>
          </div>
        </div>
        <ApexBrandFooter />
      </main>
    </div>
  );
}
