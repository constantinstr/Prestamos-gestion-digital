"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  crearInvitacion,
  crearOferta,
  listarClientesOrganizacion,
  listarInvitaciones,
  listarOfertasOrganizacion,
  loginUsuario,
  obtenerDocumentosCliente,
  obtenerResumenAlertas,
  verificarDocumentoKyc,
  type ClientePublico,
  type DocumentoKycRevision,
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
      <SeccionClientes
        token={token}
        clientes={clientes}
        onOfertaCreada={recargar}
        onDocumentoRevisado={recargar}
      />
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

function estadoKyc(cliente: ClientePublico): { texto: string; estilo: string } {
  if (cliente.kycCompleto) return { texto: "KYC verificado", estilo: "text-green-600" };
  if (cliente.kycSubido) return { texto: "KYC pendiente de revisión", estilo: "text-amber-600" };
  return { texto: "KYC incompleto", estilo: "text-slate-500" };
}

function SeccionClientes({
  token,
  clientes,
  onOfertaCreada,
  onDocumentoRevisado,
}: {
  token: string;
  clientes: ClientePublico[] | null;
  onOfertaCreada: () => void;
  onDocumentoRevisado: () => void;
}) {
  const [clienteParaOfertar, setClienteParaOfertar] = useState<ClientePublico | null>(null);
  const [clienteParaRevisar, setClienteParaRevisar] = useState<ClientePublico | null>(null);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Tu cartera de clientes</h2>

      {clientes && clientes.length === 0 && (
        <p className="mt-3 text-sm text-slate-500">Todavía no invitaste a ningún cliente.</p>
      )}

      {clientes && clientes.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100">
          {clientes.map((cliente) => {
            const estado = estadoKyc(cliente);
            return (
              <li key={cliente.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-slate-900">
                    {cliente.nombres} {cliente.apellidos}
                  </p>
                  <p className="text-sm text-slate-500">
                    DNI {cliente.dni} · <span className={estado.estilo}>{estado.texto}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setClienteParaRevisar(cliente)}
                    disabled={!cliente.kycSubido}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                  >
                    Revisar KYC
                  </button>
                  <button
                    onClick={() => setClienteParaOfertar(cliente)}
                    disabled={!cliente.kycCompleto}
                    className="rounded-lg border border-indigo-600 px-3 py-1.5 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                  >
                    Ofertar préstamo
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {clienteParaOfertar && (
        <ModalOferta
          token={token}
          cliente={clienteParaOfertar}
          onCerrar={() => setClienteParaOfertar(null)}
          onCreada={() => {
            setClienteParaOfertar(null);
            onOfertaCreada();
          }}
        />
      )}

      {clienteParaRevisar && (
        <ModalRevisionKyc
          token={token}
          cliente={clienteParaRevisar}
          onCerrar={() => setClienteParaRevisar(null)}
          onCambio={onDocumentoRevisado}
        />
      )}
    </section>
  );
}

const ETIQUETAS_DOCUMENTO: Record<string, string> = {
  DNI_FRENTE: "DNI (frente)",
  DNI_DORSO: "DNI (dorso)",
  SELFIE: "Selfie",
  FIRMA: "Firma / aceptación de T&C",
};

function ModalRevisionKyc({
  token,
  cliente,
  onCerrar,
  onCambio,
}: {
  token: string;
  cliente: ClientePublico;
  onCerrar: () => void;
  onCambio: () => void;
}) {
  const [documentos, setDocumentos] = useState<DocumentoKycRevision[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rechazandoId, setRechazandoId] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");

  async function cargar() {
    try {
      setDocumentos(await obtenerDocumentosCliente(token, cliente.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los documentos");
    }
  }

  useEffect(() => {
    // Carga de datos del servidor al montar: no hay valor derivable sincrónicamente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente.id]);

  async function resolver(documentoId: string, aprobado: boolean, motivo?: string) {
    setError(null);
    try {
      await verificarDocumentoKyc(token, cliente.id, documentoId, aprobado, motivo);
      setRechazandoId(null);
      setMotivoRechazo("");
      await cargar();
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la revisión");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            Revisar KYC de {cliente.nombres} {cliente.apellidos}
          </h3>
          <button onClick={onCerrar} className="text-sm text-slate-500 hover:text-slate-700">
            Cerrar
          </button>
        </div>

        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {!documentos && !error && <p className="mt-4 text-sm text-slate-500">Cargando…</p>}

        {documentos && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            {documentos.map((doc) => (
              <div key={doc.id} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-medium text-slate-900">{ETIQUETAS_DOCUMENTO[doc.tipo] ?? doc.tipo}</p>
                {doc.tipo !== "FIRMA" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={doc.url}
                    alt={ETIQUETAS_DOCUMENTO[doc.tipo] ?? doc.tipo}
                    className="mt-2 h-40 w-full rounded-md border border-slate-100 object-cover"
                  />
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span
                    className={`text-xs font-medium ${doc.verificado ? "text-green-600" : "text-amber-600"}`}
                  >
                    {doc.verificado ? "Aprobado" : "Pendiente"}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRechazandoId(rechazandoId === doc.id ? null : doc.id)}
                      className="rounded-lg border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Rechazar
                    </button>
                    <button
                      onClick={() => resolver(doc.id, true)}
                      disabled={doc.verificado}
                      className="rounded-lg bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-500 disabled:opacity-50"
                    >
                      Aprobar
                    </button>
                  </div>
                </div>

                {rechazandoId === doc.id && (
                  <div className="mt-2 space-y-2">
                    <input
                      value={motivoRechazo}
                      onChange={(e) => setMotivoRechazo(e.target.value)}
                      placeholder="Motivo del rechazo"
                      className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
                    />
                    <button
                      onClick={() => resolver(doc.id, false, motivoRechazo || undefined)}
                      className="w-full rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-500"
                    >
                      Confirmar rechazo
                    </button>
                  </div>
                )}

                {doc.motivoRechazo && (
                  <p className="mt-2 text-xs text-red-500">Motivo: {doc.motivoRechazo}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
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
