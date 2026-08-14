import Link from "next/link";

export default function PortalPage() {
  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Portal del cliente</h1>
      <p className="mt-3 text-slate-600">
        Acá va el login del cliente (DNI + contraseña) y, una vez autenticado, el estado de
        cuenta: cuotas pagadas, pendientes, próximo vencimiento y el botón de{" "}
        &quot;Solicitar estado de cuenta por WhatsApp&quot;. Ver{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">docs/03-WHATSAPP-INTEGRATION.md</code>{" "}
        para la lógica del enlace.
      </p>
      <Link href="/" className="mt-8 text-indigo-600 hover:underline">
        Volver al inicio
      </Link>
    </main>
  );
}
