"use client";

import { useState, type FormEvent } from "react";
import {
  crearCliente,
  crearSolicitud,
  firmarDigital,
  obtenerSolicitud,
  subirDocumentoKyc,
  type SesionCliente,
  type Solicitud,
} from "@/lib/api";
import { guardarSesion } from "@/lib/sesion-cliente";

type Paso = "datos" | "dni-frente" | "dni-dorso" | "selfie" | "firma" | "solicitud" | "resultado";

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const ESTADOS_EN_CURSO = ["PENDIENTE", "CONSULTANDO_BURO", "EN_REVISION"];

export function WizardOnboarding() {
  const [paso, setPaso] = useState<Paso>("datos");
  const [sesion, setSesion] = useState<SesionCliente | null>(null);
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  return (
    <div className="mx-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/60">
      <ProgresoPasos pasoActual={paso} />

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {paso === "datos" && (
        <PasoDatosPersonales
          cargando={cargando}
          onError={setError}
          onSubmit={async (datos) => {
            setCargando(true);
            setError(null);
            try {
              const nuevaSesion = await crearCliente(datos);
              guardarSesion(nuevaSesion);
              setSesion(nuevaSesion);
              setPaso("dni-frente");
            } catch (err) {
              setError(err instanceof Error ? err.message : "No se pudo crear tu cuenta");
            } finally {
              setCargando(false);
            }
          }}
        />
      )}

      {paso === "dni-frente" && sesion && (
        <PasoDocumento
          titulo="Foto del DNI (frente)"
          descripcion="Que se vean claramente tus datos y la foto."
          capture="environment"
          cargando={cargando}
          onSubmit={async (archivo) => {
            setCargando(true);
            setError(null);
            try {
              await subirDocumentoKyc(sesion.cliente.id, "DNI_FRENTE", archivo);
              setPaso("dni-dorso");
            } catch (err) {
              setError(err instanceof Error ? err.message : "No se pudo subir el documento");
            } finally {
              setCargando(false);
            }
          }}
        />
      )}

      {paso === "dni-dorso" && sesion && (
        <PasoDocumento
          titulo="Foto del DNI (dorso)"
          descripcion="Ahora el reverso de tu documento."
          capture="environment"
          cargando={cargando}
          onSubmit={async (archivo) => {
            setCargando(true);
            setError(null);
            try {
              await subirDocumentoKyc(sesion.cliente.id, "DNI_DORSO", archivo);
              setPaso("selfie");
            } catch (err) {
              setError(err instanceof Error ? err.message : "No se pudo subir el documento");
            } finally {
              setCargando(false);
            }
          }}
        />
      )}

      {paso === "selfie" && sesion && (
        <PasoDocumento
          titulo="Selfie con prueba de vida"
          descripcion="Mirá a la cámara con buena luz, sin lentes de sol."
          capture="user"
          cargando={cargando}
          onSubmit={async (archivo) => {
            setCargando(true);
            setError(null);
            try {
              await subirDocumentoKyc(sesion.cliente.id, "SELFIE", archivo);
              setPaso("firma");
            } catch (err) {
              setError(err instanceof Error ? err.message : "No se pudo subir la selfie");
            } finally {
              setCargando(false);
            }
          }}
        />
      )}

      {paso === "firma" && sesion && (
        <PasoFirma
          cargando={cargando}
          onSubmit={async () => {
            setCargando(true);
            setError(null);
            try {
              await firmarDigital(sesion.cliente.id);
              setPaso("solicitud");
            } catch (err) {
              setError(err instanceof Error ? err.message : "No se pudo registrar la firma");
            } finally {
              setCargando(false);
            }
          }}
        />
      )}

      {paso === "solicitud" && sesion && (
        <PasoSolicitud
          cargando={cargando}
          onSubmit={async (monto, cuotas) => {
            setCargando(true);
            setError(null);
            try {
              const nuevaSolicitud = await crearSolicitud(sesion.accessToken, monto, cuotas);
              setSolicitud(nuevaSolicitud);
              setPaso("resultado");
            } catch (err) {
              setError(err instanceof Error ? err.message : "No se pudo crear la solicitud");
            } finally {
              setCargando(false);
            }
          }}
        />
      )}

      {paso === "resultado" && sesion && solicitud && (
        <PasoResultado
          solicitudInicial={solicitud}
          token={sesion.accessToken}
          onError={setError}
        />
      )}
    </div>
  );
}

const ORDEN_PASOS: { paso: Paso; etiqueta: string }[] = [
  { paso: "datos", etiqueta: "Datos" },
  { paso: "dni-frente", etiqueta: "DNI frente" },
  { paso: "dni-dorso", etiqueta: "DNI dorso" },
  { paso: "selfie", etiqueta: "Selfie" },
  { paso: "firma", etiqueta: "Firma" },
  { paso: "solicitud", etiqueta: "Monto" },
  { paso: "resultado", etiqueta: "Resultado" },
];

function ProgresoPasos({ pasoActual }: { pasoActual: Paso }) {
  const indiceActual = ORDEN_PASOS.findIndex((p) => p.paso === pasoActual);
  return (
    <div className="flex items-center gap-1.5">
      {ORDEN_PASOS.map((p, indice) => (
        <div
          key={p.paso}
          className={`h-1.5 flex-1 rounded-full ${indice <= indiceActual ? "bg-indigo-600" : "bg-slate-200"}`}
          title={p.etiqueta}
        />
      ))}
    </div>
  );
}

function PasoDatosPersonales({
  cargando,
  onSubmit,
  onError,
}: {
  cargando: boolean;
  onSubmit: (datos: {
    dni: string;
    cuil: string;
    nombres: string;
    apellidos: string;
    fechaNacimiento: string;
    telefono: string;
    email?: string;
    password: string;
  }) => void;
  onError: (mensaje: string | null) => void;
}) {
  function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    onError(null);
    const form = new FormData(evento.currentTarget);
    onSubmit({
      dni: String(form.get("dni")),
      cuil: String(form.get("cuil")),
      nombres: String(form.get("nombres")),
      apellidos: String(form.get("apellidos")),
      fechaNacimiento: String(form.get("fechaNacimiento")),
      telefono: String(form.get("telefono")),
      email: String(form.get("email") || "") || undefined,
      password: String(form.get("password")),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Tus datos</h2>
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Nombres" name="nombres" required />
        <Campo label="Apellidos" name="apellidos" required />
        <Campo label="DNI" name="dni" placeholder="30123456" required />
        <Campo label="CUIL" name="cuil" placeholder="20301234567" required />
      </div>
      <Campo label="Fecha de nacimiento" name="fechaNacimiento" type="date" required />
      <Campo label="Teléfono (con código de país)" name="telefono" placeholder="5491122334455" required />
      <Campo label="Email (opcional)" name="email" type="email" />
      <Campo label="Contraseña para tu portal" name="password" type="password" minLength={6} required />

      <button
        type="submit"
        disabled={cargando}
        className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        {cargando ? "Creando cuenta…" : "Continuar"}
      </button>
    </form>
  );
}

function Campo({
  label,
  name,
  type = "text",
  placeholder,
  required,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
      />
    </label>
  );
}

function PasoDocumento({
  titulo,
  descripcion,
  capture,
  cargando,
  onSubmit,
}: {
  titulo: string;
  descripcion: string;
  capture: "environment" | "user";
  cargando: boolean;
  onSubmit: (archivo: File) => void;
}) {
  const [archivo, setArchivo] = useState<File | null>(null);

  return (
    <div className="mt-6 space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">{titulo}</h2>
      <p className="text-sm text-slate-500">{descripcion}</p>

      <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 px-4 py-10 text-center hover:border-indigo-400">
        <input
          type="file"
          accept="image/*"
          capture={capture}
          className="hidden"
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
        />
        <span className="text-sm text-slate-600">
          {archivo ? archivo.name : "Tocá para tomar o elegir una foto"}
        </span>
      </label>

      <button
        type="button"
        disabled={!archivo || cargando}
        onClick={() => archivo && onSubmit(archivo)}
        className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        {cargando ? "Subiendo…" : "Continuar"}
      </button>
    </div>
  );
}

function PasoFirma({ cargando, onSubmit }: { cargando: boolean; onSubmit: () => void }) {
  const [acepta, setAcepta] = useState(false);

  return (
    <div className="mt-6 space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Firma digital</h2>
      <p className="text-sm text-slate-500">
        Revisá y aceptá los Términos y Condiciones y la Política de Privacidad para continuar con
        tu solicitud.
      </p>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={acepta}
          onChange={(e) => setAcepta(e.target.checked)}
          className="mt-0.5 accent-indigo-600"
        />
        Leí y acepto los Términos y Condiciones y autorizo la consulta de mi historial crediticio.
      </label>
      <button
        type="button"
        disabled={!acepta || cargando}
        onClick={onSubmit}
        className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        {cargando ? "Registrando firma…" : "Firmar y continuar"}
      </button>
    </div>
  );
}

function PasoSolicitud({
  cargando,
  onSubmit,
}: {
  cargando: boolean;
  onSubmit: (monto: number, cuotas: number) => void;
}) {
  const [monto, setMonto] = useState(150000);
  const [cuotas, setCuotas] = useState(12);

  return (
    <div className="mt-6 space-y-5">
      <h2 className="text-xl font-semibold text-slate-900">¿Cuánto necesitás?</h2>

      <div>
        <label className="flex justify-between text-sm font-medium text-slate-700">
          <span>Monto a solicitar</span>
          <span className="font-semibold text-indigo-600">{formatoMoneda.format(monto)}</span>
        </label>
        <input
          type="range"
          min={20000}
          max={2000000}
          step={5000}
          value={monto}
          onChange={(e) => setMonto(Number(e.target.value))}
          className="mt-2 w-full accent-indigo-600"
        />
      </div>

      <div>
        <label className="flex justify-between text-sm font-medium text-slate-700">
          <span>Cantidad de cuotas</span>
          <span className="font-semibold text-indigo-600">{cuotas}</span>
        </label>
        <input
          type="range"
          min={3}
          max={24}
          step={1}
          value={cuotas}
          onChange={(e) => setCuotas(Number(e.target.value))}
          className="mt-2 w-full accent-indigo-600"
        />
      </div>

      <button
        type="button"
        disabled={cargando}
        onClick={() => onSubmit(monto, cuotas)}
        className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        {cargando ? "Enviando solicitud…" : "Solicitar préstamo"}
      </button>
    </div>
  );
}

function PasoResultado({
  solicitudInicial,
  token,
  onError,
}: {
  solicitudInicial: Solicitud;
  token: string;
  onError: (mensaje: string | null) => void;
}) {
  const [solicitud, setSolicitud] = useState(solicitudInicial);
  const [consultando, setConsultando] = useState(false);

  async function actualizar() {
    setConsultando(true);
    onError(null);
    try {
      const actualizada = await obtenerSolicitud(token, solicitud.id);
      setSolicitud(actualizada);
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo consultar el estado");
    } finally {
      setConsultando(false);
    }
  }

  const enCurso = ESTADOS_EN_CURSO.includes(solicitud.estado);

  return (
    <div className="mt-6 space-y-4 text-center">
      <h2 className="text-xl font-semibold text-slate-900">Estado de tu solicitud</h2>
      <EstadoBadge estado={solicitud.estado} />

      {solicitud.motivoRechazo && (
        <p className="text-sm text-slate-500">{solicitud.motivoRechazo}</p>
      )}

      {enCurso && (
        <p className="text-sm text-slate-500">
          Estamos evaluando tu solicitud. Esto puede tardar unos minutos.
        </p>
      )}

      <button
        type="button"
        onClick={actualizar}
        disabled={consultando}
        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-60"
      >
        {consultando ? "Consultando…" : "Actualizar estado"}
      </button>
    </div>
  );
}

const ESTILOS_ESTADO: Record<string, string> = {
  APROBADA: "bg-green-50 text-green-700",
  PRE_APROBADA: "bg-green-50 text-green-700",
  RECHAZADA_AUTOMATICA: "bg-red-50 text-red-700",
  RECHAZADA_MANUAL: "bg-red-50 text-red-700",
};

function EstadoBadge({ estado }: { estado: string }) {
  const estilo = ESTILOS_ESTADO[estado] ?? "bg-amber-50 text-amber-700";
  return (
    <span className={`inline-block rounded-full px-4 py-1.5 text-sm font-medium ${estilo}`}>
      {estado.replaceAll("_", " ")}
    </span>
  );
}
