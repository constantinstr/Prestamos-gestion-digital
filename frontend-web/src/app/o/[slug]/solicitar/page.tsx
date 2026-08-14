"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { WizardOnboarding } from "@/components/WizardOnboarding";
import { obtenerOrganizacionPorSlug, type Organizacion } from "@/lib/api";

function SolicitarOrgContenido() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const tokenInvitacion = searchParams.get("invitacion");
  const [organizacion, setOrganizacion] = useState<Organizacion | null>(null);

  useEffect(() => {
    // Branding de la organización a partir del slug de la URL: no hay valor derivable sincrónicamente.
     
    obtenerOrganizacionPorSlug(slug)
      .then(setOrganizacion)
      .catch(() => undefined);
  }, [slug]);

  return (
    <div className="flex w-full flex-col items-center">
      {organizacion && (
        <p className="mb-6 text-center text-sm font-medium text-indigo-600">{organizacion.nombre}</p>
      )}
      <WizardOnboarding tokenInvitacion={tokenInvitacion} slugOrganizacion={slug} />
    </div>
  );
}

export default function SolicitarOrgPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-12">
      <Link href="/" className="text-sm text-indigo-600 hover:underline">
        ← Volver al inicio
      </Link>
      <div className="mt-6 flex flex-1 items-center justify-center">
        <Suspense fallback={null}>
          <SolicitarOrgContenido />
        </Suspense>
      </div>
    </main>
  );
}
