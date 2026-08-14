import Link from "next/link";

export default function SolicitarPage() {
  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Wizard de onboarding KYC</h1>
      <p className="mt-3 text-slate-600">
        Acá va el wizard multi-paso: datos personales → DNI (frente/dorso) → selfie con prueba de
        vida → firma digital. Cada paso llama a los endpoints de{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">POST /clientes</code>,{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">POST /clientes/:id/documentos</code>{" "}
        y <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">POST /clientes/:id/firma</code>{" "}
        documentados en <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">docs/02-API-ENDPOINTS.md</code>.
      </p>
      <Link href="/" className="mt-8 text-indigo-600 hover:underline">
        Volver al inicio
      </Link>
    </main>
  );
}
