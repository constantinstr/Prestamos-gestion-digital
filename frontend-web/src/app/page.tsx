import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold text-indigo-600">Presto Cuotas</span>
          <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link href="/portal" className="hover:text-indigo-600">
              Ya tengo un préstamo
            </Link>
            <Link href="/admin" className="hover:text-indigo-600">
              Soy prestamista
            </Link>
            <Link
              href="/registro-prestamista"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500"
            >
              Registrar mi negocio
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 py-16 md:grid-cols-2">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            La plataforma para gestionar tu negocio de préstamos.
          </h1>
          <p className="mt-4 max-w-lg text-lg text-slate-600">
            Invitá a tus clientes, validá su identidad digitalmente y ofrecéles préstamos con
            cuotas y tasas que vos definís. Ellos aceptan, firman y siguen su cuenta desde su
            portal.
          </p>
          <ul className="mt-8 space-y-3 text-slate-700">
            <li className="flex items-center gap-2">
              <Bullet /> Cada prestamista gestiona su propia cartera de clientes
            </li>
            <li className="flex items-center gap-2">
              <Bullet /> Verificación de identidad digital (DNI + selfie)
            </li>
            <li className="flex items-center gap-2">
              <Bullet /> Alertas de vencimiento y mora automáticas
            </li>
          </ul>
        </div>

        <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/60 md:items-start">
          <h2 className="text-xl font-semibold text-slate-900">Empezá ahora</h2>
          <p className="text-sm text-slate-500">
            Registrá tu negocio y en minutos vas a poder invitar a tu primer cliente.
          </p>
          <Link
            href="/registro-prestamista"
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-center font-medium text-white transition hover:bg-indigo-500"
          >
            Registrar mi negocio
          </Link>
          <Link
            href="/admin"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-center font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Ya tengo cuenta, ingresar
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-6 text-center text-sm text-slate-400">
        © {new Date().getFullYear()} Presto Cuotas. Todos los derechos reservados.
      </footer>
    </main>
  );
}

function Bullet() {
  return <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600" />;
}
