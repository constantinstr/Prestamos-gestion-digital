"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { WizardOnboarding } from "@/components/WizardOnboarding";

function SolicitarContenido() {
  const searchParams = useSearchParams();
  const tokenInvitacion = searchParams.get("invitacion");

  return <WizardOnboarding tokenInvitacion={tokenInvitacion} />;
}

export default function SolicitarPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-12">
      <Link href="/" className="text-sm text-indigo-600 hover:underline">
        ← Volver al inicio
      </Link>
      <div className="mt-6 flex flex-1 items-center justify-center">
        <Suspense fallback={null}>
          <SolicitarContenido />
        </Suspense>
      </div>
    </main>
  );
}
