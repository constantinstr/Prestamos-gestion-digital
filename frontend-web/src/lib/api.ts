export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

export interface SimuladorResultado {
  tna: number;
  tea: number;
  cuotaEstimada: number;
  primerasCuotas: { numeroCuota: number; montoTotal: number }[];
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
}

export async function simularPrestamo(monto: number, cuotas: number): Promise<SimuladorResultado> {
  const url = new URL(`${API_URL}/public/simulador`);
  url.searchParams.set("monto", String(monto));
  url.searchParams.set("cuotas", String(cuotas));

  const respuesta = await fetch(url, { cache: "no-store" });
  const cuerpo = (await respuesta.json()) as SimuladorResultado | ApiError;

  if (!respuesta.ok) {
    const error = cuerpo as ApiError;
    const mensaje = Array.isArray(error.message) ? error.message.join(", ") : error.message;
    throw new Error(mensaje ?? "No se pudo calcular la simulación");
  }

  return cuerpo as SimuladorResultado;
}

export interface ConfiguracionPublica {
  montoMinimo: number;
  montoMaximo: number;
  cuotasMinimas: number;
  cuotasMaximas: number;
}

export async function obtenerConfiguracionPublica(): Promise<ConfiguracionPublica> {
  const respuesta = await fetch(`${API_URL}/public/configuracion`, { cache: "no-store" });
  if (!respuesta.ok) throw new Error("No se pudo obtener la configuración");
  return (await respuesta.json()) as ConfiguracionPublica;
}
