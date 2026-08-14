export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

export interface ApiError {
  statusCode: number;
  message: string | string[];
}

async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...resto } = options;
  const respuesta = await fetch(`${API_URL}${path}`, {
    ...resto,
    cache: "no-store",
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const cuerpo = respuesta.status === 204 ? null : ((await respuesta.json()) as T | ApiError);

  if (!respuesta.ok) {
    const error = cuerpo as ApiError;
    const mensaje = Array.isArray(error?.message) ? error.message.join(", ") : error?.message;
    throw new Error(mensaje ?? "Ocurrió un error inesperado");
  }

  return cuerpo as T;
}

// ---------------------------------------------------------
// Simulador público
// ---------------------------------------------------------
export interface SimuladorResultado {
  tna: number;
  tea: number;
  cuotaEstimada: number;
  primerasCuotas: { numeroCuota: number; montoTotal: number }[];
}

export function simularPrestamo(monto: number, cuotas: number) {
  const params = new URLSearchParams({ monto: String(monto), cuotas: String(cuotas) });
  return apiFetch<SimuladorResultado>(`/public/simulador?${params}`);
}

export interface ConfiguracionPublica {
  montoMinimo: number;
  montoMaximo: number;
  cuotasMinimas: number;
  cuotasMaximas: number;
}

export function obtenerConfiguracionPublica() {
  return apiFetch<ConfiguracionPublica>("/public/configuracion");
}

// ---------------------------------------------------------
// Onboarding / KYC
// ---------------------------------------------------------
export interface ClientePublico {
  id: string;
  dni: string;
  cuil: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  telefono: string;
  email: string | null;
  estado: string;
}

export interface SesionCliente {
  cliente: ClientePublico;
  accessToken: string;
  refreshToken: string;
}

export interface CrearClienteInput {
  dni: string;
  cuil: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  telefono: string;
  email?: string;
  password: string;
}

export function crearCliente(datos: CrearClienteInput) {
  return apiFetch<SesionCliente>("/clientes", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export type TipoDocumentoKyc = "DNI_FRENTE" | "DNI_DORSO" | "SELFIE";

export function subirDocumentoKyc(clienteId: string, tipo: TipoDocumentoKyc, archivo: File) {
  const formData = new FormData();
  formData.append("tipo", tipo);
  formData.append("archivo", archivo);
  return apiFetch(`/clientes/${clienteId}/documentos`, { method: "POST", body: formData });
}

export function firmarDigital(clienteId: string) {
  return apiFetch(`/clientes/${clienteId}/firma`, {
    method: "POST",
    body: JSON.stringify({ aceptaTerminos: true }),
  });
}

export function loginCliente(dni: string, password: string) {
  return apiFetch<SesionCliente>("/clientes/login", {
    method: "POST",
    body: JSON.stringify({ dni, password }),
  });
}

export function obtenerMisPrestamos(token: string) {
  return apiFetch<Prestamo[]>("/clientes/me/prestamos", { token });
}

// ---------------------------------------------------------
// Solicitudes / Préstamos
// ---------------------------------------------------------
export interface Solicitud {
  id: string;
  estado: string;
  montoSolicitado: string;
  cantidadCuotas: number;
  motivoRechazo: string | null;
}

export function crearSolicitud(token: string, montoSolicitado: number, cantidadCuotas: number) {
  return apiFetch<Solicitud>("/solicitudes", {
    method: "POST",
    token,
    body: JSON.stringify({ montoSolicitado, cantidadCuotas }),
  });
}

export function obtenerSolicitud(token: string, id: string) {
  return apiFetch<Solicitud>(`/solicitudes/${id}`, { token });
}

export interface Prestamo {
  id: string;
  montoOtorgado: string;
  cantidadCuotas: number;
  estado: string;
  fechaDesembolso: string | null;
}

export interface EstadoCuenta {
  totalPagado: number;
  totalPendiente: number;
  proximoVencimiento: string | null;
  cantidadCuotasPendientes: number;
}

export function obtenerEstadoCuenta(token: string, prestamoId: string) {
  return apiFetch<EstadoCuenta>(`/prestamos/${prestamoId}/estado-cuenta`, { token });
}

export function generarLinkWhatsapp(token: string, prestamoId: string) {
  return apiFetch<{ url: string }>(`/prestamos/${prestamoId}/estado-cuenta/whatsapp`, {
    method: "POST",
    token,
  });
}
