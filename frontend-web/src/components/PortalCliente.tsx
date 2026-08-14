"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  generarLinkWhatsapp,
  loginCliente,
  obtenerEstadoCuenta,
  obtenerMisPrestamos,
  type EstadoCuenta,
  type Prestamo,
  type SesionCliente,
} from "@/lib/api";
import { cerrarSesion, guardarSesion, useSesionCliente } from "@/lib/sesion-cliente";

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const formatoFecha = new Intl.DateTimeFormat("es-AR", { dateStyle: "long" });

export function PortalCliente() {
  const sesion = useSesionCliente();

  if (sesion === undefined) return null;

  if (!sesion) {
    return <FormularioLogin onIngreso={guardarSesion} />;
  }

  return <EstadoCuentaCliente sesion={sesion} onCerrarSesion={cerrarSesion} />;
}

function FormularioLogin({ onIngreso }: { onIngreso: (sesion: SesionCliente) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    const form = new FormData(evento.currentTarget);
    try {
      const sesion = await loginCliente(String(form.get("dni")), String(form.get("password")));
      guardarSesion(sesion);
      onIngreso(sesion);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/60">
      <h1 className="text-xl font-semibold text-slate-900">Ingresá a tu cuenta</h1>
      <p className="mt-1 text-sm text-slate-500">Usá el DNI y la contraseña de tu solicitud.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          DNI
          <input
            name="dni"
            required
            placeholder="30123456"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Contraseña
          <input
            name="password"
            type="password"
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </label>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {cargando ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </div>
  );
}

function EstadoCuentaCliente({
  sesion,
  onCerrarSesion,
}: {
  sesion: SesionCliente;
  onCerrarSesion: () => void;
}) {
  const [prestamos, setPrestamos] = useState<Prestamo[] | null>(null);
  const [estadoCuenta, setEstadoCuenta] = useState<EstadoCuenta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkWhatsapp, setLinkWhatsapp] = useState<string | null>(null);

  useEffect(() => {
    obtenerMisPrestamos(sesion.accessToken)
      .then(async (lista) => {
        setPrestamos(lista);
        if (lista[0]) {
          const cuenta = await obtenerEstadoCuenta(sesion.accessToken, lista[0].id);
          setEstadoCuenta(cuenta);
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "No se pudo cargar tu información");
      });
  }, [sesion.accessToken]);

  const prestamoActivo = prestamos?.[0];

  return (
    <div className="mx-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/60">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Hola, {sesion.cliente.nombres}
          </h1>
          <p className="text-sm text-slate-500">DNI {sesion.cliente.dni}</p>
        </div>
        <button onClick={onCerrarSesion} className="text-sm text-slate-500 hover:text-slate-700">
          Cerrar sesión
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {prestamos && prestamos.length === 0 && (
        <p className="mt-6 text-sm text-slate-500">
          Todavía no tenés préstamos asociados a esta cuenta.
        </p>
      )}

      {prestamoActivo && estadoCuenta && (
        <div className="mt-6 space-y-4">
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Estado del préstamo</span>
              <span className="font-medium text-slate-900">{prestamoActivo.estado}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-slate-500">Total pagado</span>
              <span className="text-slate-900">{formatoMoneda.format(estadoCuenta.totalPagado)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-slate-500">Saldo pendiente</span>
              <span className="text-slate-900">{formatoMoneda.format(estadoCuenta.totalPendiente)}</span>
            </div>
            {estadoCuenta.proximoVencimiento && (
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-slate-500">Próximo vencimiento</span>
                <span className="text-slate-900">
                  {formatoFecha.format(new Date(estadoCuenta.proximoVencimiento))}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={async () => {
              try {
                const { url } = await generarLinkWhatsapp(sesion.accessToken, prestamoActivo.id);
                setLinkWhatsapp(url);
                window.open(url, "_blank", "noopener,noreferrer");
              } catch (err) {
                setError(err instanceof Error ? err.message : "No se pudo generar el enlace");
              }
            }}
            className="w-full rounded-lg bg-green-600 px-4 py-3 font-medium text-white transition hover:bg-green-500"
          >
            Solicitar estado de cuenta por WhatsApp
          </button>
          {linkWhatsapp && (
            <p className="text-center text-xs text-slate-400">
              Si no se abrió automáticamente,{" "}
              <a href={linkWhatsapp} target="_blank" rel="noopener noreferrer" className="underline">
                tocá acá
              </a>
              .
            </p>
          )}
        </div>
      )}
    </div>
  );
}
