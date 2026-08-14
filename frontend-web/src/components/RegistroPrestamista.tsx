"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { crearOrganizacion } from "@/lib/api";
import { guardarSesionUsuario } from "@/lib/sesion-usuario";

export function RegistroPrestamista() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    const form = new FormData(evento.currentTarget);
    try {
      const resultado = await crearOrganizacion({
        nombre: String(form.get("nombre")),
        nombreAdmin: String(form.get("nombreAdmin")),
        email: String(form.get("email")),
        password: String(form.get("password")),
      });
      guardarSesionUsuario(resultado);
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la organización");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/60">
      <h1 className="text-xl font-semibold text-slate-900">Registrá tu negocio de préstamos</h1>
      <p className="mt-1 text-sm text-slate-500">
        Vas a poder invitar a tus clientes, validar su KYC y ofrecerles préstamos.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Campo label="Nombre de tu empresa" name="nombre" />
        <Campo label="Tu nombre (quedás como administrador)" name="nombreAdmin" />
        <Campo label="Email" name="email" type="email" />
        <Campo label="Contraseña" name="password" type="password" minLength={8} />

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {cargando ? "Creando cuenta…" : "Crear mi cuenta"}
        </button>
      </form>
    </div>
  );
}

function Campo({
  label,
  name,
  type = "text",
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  minLength?: number;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        name={name}
        type={type}
        required
        minLength={minLength}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
      />
    </label>
  );
}
