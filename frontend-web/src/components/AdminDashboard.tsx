"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  crearInvitacion,
  crearOferta,
  listarClientesOrganizacion,
  listarInvitaciones,
  listarOfertasOrganizacion,
  loginUsuario,
  obtenerResumenAlertas,
  type ClientePublico,
  type Invitacion,
  type Oferta,
  type ResumenAlertas,
} from "@/lib/api";
import { cerrarSesionUsuario, guardarSesionUsuario, useSesionUsuario } from "@/lib/sesion-usuario";

export function AdminDashboard() {
  const sesion = useSesionUsuario();

  if (sesion === undefined) return null;
  if (!sesion) return <FormularioLoginAdmin onIngreso={guardarSesionUsuario} />;

  return <Panel token={sesion.accessToken} onCerrarSesion={cerrarSesionUsuario} />;
}

function FormularioLoginAdmin({ onIngreso }: { onIngreso: (sesion: { accessToken: string; refreshToken: string }) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    const form = new FormData(evento.currentTarget);
    try {
      const sesion = await loginUsuario(String(form.get("email")), String(form.get("password")));
      onIngreso(sesion);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/60">
      <h1 className="text-xl font-semibold text-slate-900">Panel de administración</h1>
      <p className="mt-1 text-sm text-slate-500">Ingresá con tu cuenta de la organización.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Campo label="Email" name="email" type="email" />
        <Campo label="Contraseña" name="password" type="password" />

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

function Campo({ label, name, type = "text" }: { label: string; name: string; type?: string }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        name={name}
        type={type}
        required
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
      />
    </label>
  );
}

function Panel({ token, onCerrarSesion }: { token: string; onCerrarSesion: () => void }) {
  const [resumen, setResumen] = useState<ResumenAlertas | null>(null);
  const [clientes, setClientes] = useState<ClientePublico[] | null>(null);
  const [invitaciones, setInvitaciones] = useState<Invitacion[] | null>(null);
  const [ofertas, setOfertas] = useState<Oferta[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function recargar() {
    try {
      const [r, c, i, o] = await Promise.all([
        obtenerResumenAlertas(token),
        listarClientesOrganizacion(token),
        listarInvitaciones(token),
        listarOfertasOrganizacion(token),
      ]);
      setResumen(r);
      setClientes(c);
      setInvitaciones(i);
      setOfertas(o);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el panel");
    }
  }

  useEffect(() => {
    // Carga de datos del servidor al montar: no hay valor derivable sincrónicamente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recargar().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Panel de administración</h1>
        <button onClick={onCerrarSesion} className="text-sm text-slate-500 hover:text-slate-700">
          Cerrar sesión
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {resumen && (
        <div className="grid grid-cols-3 gap-4">
          <Tarjeta etiqueta="Préstamos en mora" valor={resumen.prestamosEnMora} alerta />
          <Tarjeta etiqueta="Cuotas vencidas" valor={resumen.cuotasVencidas} alerta />
          <Tarjeta etiqueta="Por vencer (3 días)" valor={resumen.cuotasPorVencerPronto} />
        </div>
      )}

      <SeccionInvitar token={token} invitaciones={invitaciones} onCreada={recargar} />
      <SeccionClientes token={token} clientes={clientes} onOfertaCreada={recargar} />
      <SeccionOfertas ofertas={ofertas} />
    </div>
  );
}

function Tarjeta({ etiqueta, valor, alerta }: { etiqueta: string; valor: number; alerta?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{etiqueta}</p>
      <p className={`mt-1 text-2xl font-bold ${alerta && valor > 0 ? "text-red-600" : "text-slate-900"}`}>{valor}</p>
    </div>
  );
}

function SeccionInvitar({
  token,
  invitaciones,
  onCreada,
}: {
  token: string;
  invitaciones: Invitacion[] | null;
  onCreada: () => void;
}) {
  const [telefono, setTelefono] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ultimoLink, setUltimoLink] = useState<string | null>(null);

  async function invitar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setCargando(true);
    setError(null);
    try {
      const invitacion = await crearInvitacion(token, { telefono: telefono || undefined });
      const url = `${window.location.origin}/solicitar?invitacion=${invitacion.token}`;
      setUltimoLink(url);
      setTelefono("");
      onCreada();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar la invitación");
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Invitar un cliente nuevo</h2>
      <form onSubmit={invitar} className="mt-4 flex gap-3">
        <input
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="Teléfono del cliente (opcional)"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={cargando}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          Generar link
        </button>
      </form>

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {ultimoLink && (
        <p className="mt-3 break-all rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">{ultimoLink}</p>
      )}

      {invitaciones && invitaciones.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100 text-sm">
          {invitaciones.map((inv) => (
            <li key={inv.id} className="flex items-center justify-between py-2">
              <span className="text-slate-600">{inv.telefono ?? inv.email ?? "—"}</span>
              <EstadoBadge estado={inv.estado} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SeccionClientes({
  token,
  clientes,
  onOfertaCreada,
}: {
  token: string;
  clientes: ClientePublico[] | null;
  onOfertaCreada: () => void;
}) {
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClientePublico | null>(null);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Tu cartera de clientes</h2>

      {clientes && clientes.length === 0 && (
        <p className="mt-3 text-sm text-slate-500">Todavía no invitaste a ningún cliente.</p>
      )}

      {clientes && clientes.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100">
          {clientes.map((cliente) => (
            <li key={cliente.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-slate-900">
                  {cliente.nombres} {cliente.apellidos}
                </p>
                <p className="text-sm text-slate-500">
                  DNI {cliente.dni} · KYC {cliente.kycCompleto ? "completo" : "pendiente"}
                </p>
              </div>
              <button
                onClick={() => setClienteSeleccionado(cliente)}
                disabled={!cliente.kycCompleto}
                className="rounded-lg border border-indigo-600 px-3 py-1.5 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
              >
                Ofertar préstamo
              </button>
            </li>
          ))}
        </ul>
      )}

      {clienteSeleccionado && (
        <ModalOferta
          token={token}
          cliente={clienteSeleccionado}
          onCerrar={() => setClienteSeleccionado(null)}
          onCreada={() => {
            setClienteSeleccionado(null);
            onOfertaCreada();
          }}
        />
      )}
    </section>
  );
}

function ModalOferta({
  token,
  cliente,
  onCerrar,
  onCreada,
}: {
  token: string;
  cliente: ClientePublico;
  onCerrar: () => void;
  onCreada: () => void;
}) {
  const [monto, setMonto] = useState(150000);
  const [cuotas, setCuotas] = useState(12);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ofertar() {
    setCargando(true);
    setError(null);
    try {
      await crearOferta(token, { clienteId: cliente.id, montoOfrecido: monto, cantidadCuotas: cuotas });
      onCreada();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la oferta");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">
          Ofertar a {cliente.nombres} {cliente.apellidos}
        </h3>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Monto
          <input
            type="number"
            value={monto}
            onChange={(e) => setMonto(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </label>
        <label className="mt-3 block text-sm font-medium text-slate-700">
          Cantidad de cuotas
          <input
            type="number"
            value={cuotas}
            onChange={(e) => setCuotas(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </label>

        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button
            onClick={onCerrar}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={ofertar}
            disabled={cargando}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {cargando ? "Enviando…" : "Enviar oferta"}
          </button>
        </div>
      </div>
    </div>
  );
}

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function SeccionOfertas({ ofertas }: { ofertas: Oferta[] | null }) {
  if (!ofertas || ofertas.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Ofertas realizadas</h2>
      <ul className="mt-4 divide-y divide-slate-100">
        {ofertas.map((oferta) => (
          <li key={oferta.id} className="flex items-center justify-between py-3 text-sm">
            <span className="text-slate-600">
              {oferta.cliente ? `${oferta.cliente.nombres} ${oferta.cliente.apellidos}` : oferta.clienteId} ·{" "}
              {formatoMoneda.format(Number(oferta.montoOfrecido))} en {oferta.cantidadCuotas} cuotas
            </span>
            <EstadoBadge estado={oferta.estado} />
          </li>
        ))}
      </ul>
    </section>
  );
}

const ESTILOS_ESTADO: Record<string, string> = {
  ACEPTADA: "bg-green-50 text-green-700",
  USADA: "bg-green-50 text-green-700",
  RECHAZADA: "bg-red-50 text-red-700",
  EXPIRADA: "bg-slate-100 text-slate-500",
  REVOCADA: "bg-slate-100 text-slate-500",
  CANCELADA: "bg-slate-100 text-slate-500",
};

function EstadoBadge({ estado }: { estado: string }) {
  const estilo = ESTILOS_ESTADO[estado] ?? "bg-amber-50 text-amber-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${estilo}`}>{estado}</span>;
}
