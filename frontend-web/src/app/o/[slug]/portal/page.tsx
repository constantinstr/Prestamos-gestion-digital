"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PortalCliente } from "@/components/PortalCliente";
import { obtenerOrganizacionPorSlug, type Organizacion } from "@/lib/api";

export default function PortalOrgPage() {
  const { slug } = useParams<{ slug: string }>();
  const [organizacion, setOrganizacion] = useState<Organizacion | null>(null);

  useEffect(() => {
    // Branding de la organización a partir del slug de la URL: no hay valor derivable sincrónicamente.
     
    obtenerOrganizacionPorSlug(slug)
      .then(setOrganizacion)
      .catch(() => undefined);
  }, [slug]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-12">
      <Link href="/" className="text-sm text-indigo-600 hover:underline">
        ← Volver al inicio
      </Link>
      <div className="mt-6 flex flex-1 flex-col items-center justify-center">
        {organizacion && (
          <p className="mb-6 text-center text-sm font-medium text-indigo-600">{organizacion.nombre}</p>
        )}
        <PortalCliente />
      </div>
    </main>
  );
}
