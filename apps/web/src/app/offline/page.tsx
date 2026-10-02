import Link from "next/link";
import { WifiOff } from "lucide-react";

import Button from "@/components/ui/Button";

export const metadata = {
  title: "You're offline — Selaura Marketplace",
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col items-center px-5 py-24 text-center sm:px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface)] text-[var(--foreground)]/50">
        <WifiOff size={22} />
      </div>

      <h1 className="mt-5 text-xl font-semibold tracking-tight">
        You&apos;re offline
      </h1>

      <p className="mt-2 text-sm text-[var(--foreground)]/55">
        This page hasn&apos;t been saved for offline use yet. Reconnect and
        try again — anything you&apos;ve already visited will keep working
        without a connection.
      </p>

      <Button href="/" className="mt-6 px-5">
        Back to home
      </Button>
    </main>
  );
}
