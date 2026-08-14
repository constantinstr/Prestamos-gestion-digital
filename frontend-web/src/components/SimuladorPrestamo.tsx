"use client";

import { useState, type FormEvent } from "react";
import { simularPrestamo, type SimuladorResultado } from "@/lib/api";

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function SimuladorPrestamo() {
  const [monto, setMonto] = useState(150000);
  const [cuotas, setCuotas] = useState(12);
  const [resultado, setResultado] = useState<SimuladorResultado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function simular(evento: FormEvent) {
    evento.preventDefault();
    setCargando(true);
    setError(null);
    try {
      const datos = await simularPrestamo(monto, cuotas);
      setResultado(datos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error al simular");
      setResultado(null);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60">
      <h2 className="text-xl font-semibold text-slate-900">Simulá tu préstamo</h2>
      <p className="mt-1 text-sm text-slate-500">Sin compromiso, en menos de un minuto.</p>

      <form onSubmit={simular} className="mt-6 space-y-5">
        <div>
          <label htmlFor="monto" className="flex justify-between text-sm font-medium text-slate-700">
            <span>Monto a solicitar</span>
            <span className="font-semibold text-indigo-600">{formatoMoneda.format(monto)}</span>
          </label>
          <input
            id="monto"
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
          <label htmlFor="cuotas" className="flex justify-between text-sm font-medium text-slate-700">
            <span>Cantidad de cuotas</span>
            <span className="font-semibold text-indigo-600">{cuotas}</span>
          </label>
          <input
            id="cuotas"
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
          type="submit"
          disabled={cargando}
          className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {cargando ? "Calculando…" : "Calcular cuota"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {resultado && (
        <div className="mt-6 space-y-2 rounded-lg bg-slate-50 p-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Cuota estimada</span>
            <span className="font-semibold text-slate-900">{formatoMoneda.format(resultado.cuotaEstimada)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">TNA</span>
            <span className="text-slate-900">{resultado.tna}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">TEA</span>
            <span className="text-slate-900">{resultado.tea}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
