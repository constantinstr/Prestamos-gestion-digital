import Link from "next/link";
import { SimuladorPrestamo } from "@/components/SimuladorPrestamo";

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
            <Link
              href="/solicitar"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500"
            >
              Solicitar préstamo
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 py-16 md:grid-cols-2">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Tu préstamo, 100% digital.
          </h1>
          <p className="mt-4 max-w-lg text-lg text-slate-600">
            Solicitá online, subí tu DNI y una selfie, y retirá tu dinero en la sucursal más
            cercana. Sin filas, sin papeles.
          </p>
          <ul className="mt-8 space-y-3 text-slate-700">
            <li className="flex items-center gap-2">
              <Bullet /> Aprobación en minutos
            </li>
            <li className="flex items-center gap-2">
              <Bullet /> Verificación de identidad digital
            </li>
            <li className="flex items-center gap-2">
              <Bullet /> Cobro y entrega presencial en sucursal
            </li>
          </ul>
        </div>

        <div className="flex justify-center md:justify-end">
          <SimuladorPrestamo />
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
