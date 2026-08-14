"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  aceptarOferta,
  generarLinkWhatsapp,
  loginCliente,
  misOfertas,
  obtenerCuotas,
  obtenerEstadoCuenta,
  obtenerMisPrestamos,
  obtenerPagos,
  rechazarOferta,
  type Cuota,
  type EstadoCuenta,
  type Oferta,
  type Pago,
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

  return <VistaPortal sesion={sesion} onCerrarSesion={cerrarSesion} />;
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
      <p className="mt-1 text-sm text-slate-500">Usá el DNI y la contraseña de tu registro.</p>

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

function VistaPortal({ sesion, onCerrarSesion }: { sesion: SesionCliente; onCerrarSesion: () => void }) {
  const [ofertas, setOfertas] = useState<Oferta[] | null>(null);
  const [prestamos, setPrestamos] = useState<Prestamo[] | null>(null);
  const [estadoCuenta, setEstadoCuenta] = useState<EstadoCuenta | null>(null);
  const [cuotas, setCuotas] = useState<Cuota[] | null>(null);
  const [pagos, setPagos] = useState<Pago[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkWhatsapp, setLinkWhatsapp] = useState<string | null>(null);

  async function recargar() {
    try {
      const [listaOfertas, listaPrestamos] = await Promise.all([
        misOfertas(sesion.accessToken),
        obtenerMisPrestamos(sesion.accessToken),
      ]);
      setOfertas(listaOfertas);
      setPrestamos(listaPrestamos);
      if (listaPrestamos[0]) {
        const [ec, listaCuotas, listaPagos] = await Promise.all([
          obtenerEstadoCuenta(sesion.accessToken, listaPrestamos[0].id),
          obtenerCuotas(sesion.accessToken, listaPrestamos[0].id),
          obtenerPagos(sesion.accessToken, listaPrestamos[0].id),
        ]);
        setEstadoCuenta(ec);
        setCuotas(listaCuotas);
        setPagos(listaPagos);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar tu información");
    }
  }

  useEffect(() => {
    // Carga de datos del servidor al montar: no hay valor derivable sincrónicamente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recargar().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion.accessToken]);

  const ofertasPendientes = ofertas?.filter((o) => o.estado === "PENDIENTE") ?? [];
  const prestamoActivo = prestamos?.[0];

  return (
    <div className="mx-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/60">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Hola, {sesion.cliente.nombres}</h1>
          <p className="text-sm text-slate-500">DNI {sesion.cliente.dni}</p>
        </div>
        <button onClick={onCerrarSesion} className="text-sm text-slate-500 hover:text-slate-700">
          Cerrar sesión
        </button>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {estadoCuenta?.alertas.tieneCuotasVencidas && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Tenés {estadoCuenta.alertas.cantidadCuotasVencidas}{" "}
          {estadoCuenta.alertas.cantidadCuotasVencidas === 1 ? "cuota vencida" : "cuotas vencidas"}. Acercate a tu
          sucursal para regularizar tu situación.
        </div>
      )}
      {!estadoCuenta?.alertas.tieneCuotasVencidas && estadoCuenta?.alertas.proximoVencimientoUrgente && (
        <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Tu próxima cuota vence en {estadoCuenta.alertas.proximoVencimientoEnDias === 0
            ? "el día de hoy"
            : `${estadoCuenta.alertas.proximoVencimientoEnDias} día(s)`}
          .
        </div>
      )}

      {ofertasPendientes.length > 0 && (
        <div className="mt-6 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Tenés una oferta de préstamo</h2>
          {ofertasPendientes.map((oferta) => (
            <TarjetaOferta key={oferta.id} oferta={oferta} token={sesion.accessToken} onResuelta={recargar} />
          ))}
        </div>
      )}

      {prestamos && prestamos.length === 0 && ofertasPendientes.length === 0 && (
        <p className="mt-6 text-sm text-slate-500">
          Todavía no tenés préstamos ni ofertas. Tu prestamista te va a avisar cuando tengas una disponible.
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

          {cuotas && cuotas.length > 0 && <TablaCuotas cuotas={cuotas} />}
          {pagos && pagos.length > 0 && <ListaPagos pagos={pagos} />}
        </div>
      )}
    </div>
  );
}

const ESTILOS_ESTADO_CUOTA: Record<string, string> = {
  PAGADA: "bg-green-50 text-green-700",
  VENCIDA: "bg-red-50 text-red-700",
  PENDIENTE: "bg-slate-100 text-slate-600",
};

function TablaCuotas({ cuotas }: { cuotas: Cuota[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-900">Cuotas</h2>
      <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Vencimiento</th>
              <th className="px-3 py-2">Capital</th>
              <th className="px-3 py-2">Interés</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cuotas.map((cuota) => (
              <tr key={cuota.id}>
                <td className="px-3 py-2 text-slate-600">{cuota.numeroCuota}</td>
                <td className="px-3 py-2 text-slate-600">
                  {formatoFecha.format(new Date(cuota.fechaVencimiento))}
                </td>
                <td className="px-3 py-2 text-slate-600">{formatoMoneda.format(Number(cuota.montoCapital))}</td>
                <td className="px-3 py-2 text-slate-600">{formatoMoneda.format(Number(cuota.montoInteres))}</td>
                <td className="px-3 py-2 font-medium text-slate-900">
                  {formatoMoneda.format(Number(cuota.montoTotal))}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      ESTILOS_ESTADO_CUOTA[cuota.estado] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {cuota.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ListaPagos({ pagos }: { pagos: Pago[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-900">Pagos realizados</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
        {pagos.map((pago) => (
          <li key={pago.id} className="flex items-center justify-between px-3 py-2 text-sm">
            <div>
              <p className="text-slate-900">
                Cuota {pago.cuota.numeroCuota} · {formatoMoneda.format(Number(pago.monto))}
              </p>
              <p className="text-xs text-slate-500">
                {formatoFecha.format(new Date(pago.createdAt))} · {pago.metodoPago} · {pago.sucursal.nombre}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TarjetaOferta({
  oferta,
  token,
  onResuelta,
}: {
  oferta: Oferta;
  token: string;
  onResuelta: () => void;
}) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function responder(accion: "aceptar" | "rechazar") {
    setCargando(true);
    setError(null);
    try {
      if (accion === "aceptar") {
        await aceptarOferta(token, oferta.id);
      } else {
        await rechazarOferta(token, oferta.id);
      }
      onResuelta();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo procesar tu respuesta");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
      <p className="text-sm text-slate-700">
        Te ofrecen <span className="font-semibold">{formatoMoneda.format(Number(oferta.montoOfrecido))}</span> en{" "}
        {oferta.cantidadCuotas} cuotas (TNA {oferta.tna}%).
      </p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex gap-3">
        <button
          onClick={() => responder("rechazar")}
          disabled={cargando}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Rechazar
        </button>
        <button
          onClick={() => responder("aceptar")}
          disabled={cargando}
          className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {cargando ? "Procesando…" : "Aceptar"}
        </button>
      </div>
    </div>
  );
}
