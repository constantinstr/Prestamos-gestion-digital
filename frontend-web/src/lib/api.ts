export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";
/** Base del backend sin el prefijo /api/v1, para armar URLs de archivos estáticos (documentos KYC). */
export const API_ORIGIN = API_URL.replace(/\/api\/v1\/?$/, "");

export interface ApiError {
  statusCode: number;
  message: string | string[];
}

async function apiFetch<T>(path: string, options: RequestInit & { token?: string } = {}): Promise<T> {
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
// Organizaciones (alta de un nuevo prestamista) y login backoffice
// ---------------------------------------------------------
export interface Organizacion {
  id: string;
  nombre: string;
  slug: string;
}

export function obtenerOrganizacionPorSlug(slug: string) {
  return apiFetch<Organizacion>(`/organizaciones/${slug}`);
}

export interface SesionUsuario {
  accessToken: string;
  refreshToken: string;
}

export interface UsuarioPublico {
  id: string;
  nombre: string;
  email: string;
}

export function crearOrganizacion(datos: {
  nombre: string;
  razonSocial?: string;
  cuit?: string;
  nombreAdmin: string;
  email: string;
  password: string;
}) {
  return apiFetch<{ organizacion: Organizacion; usuario: UsuarioPublico } & SesionUsuario>("/organizaciones", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function loginUsuario(email: string, password: string) {
  return apiFetch<SesionUsuario>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// ---------------------------------------------------------
// Invitaciones de cliente
// ---------------------------------------------------------
export interface Invitacion {
  id: string;
  token: string;
  telefono: string | null;
  email: string | null;
  estado: string;
  createdAt: string;
  cliente: { id: string; nombres: string; apellidos: string; dni: string } | null;
}

export function crearInvitacion(token: string, datos: { telefono?: string; email?: string }) {
  return apiFetch<Invitacion>("/invitaciones", { method: "POST", token, body: JSON.stringify(datos) });
}

export function listarInvitaciones(token: string) {
  return apiFetch<Invitacion[]>("/invitaciones", { token });
}

export function validarInvitacion(tokenInvitacion: string) {
  return apiFetch<{ organizacion: Organizacion; telefono: string | null; email: string | null }>(
    `/invitaciones/${tokenInvitacion}`,
  );
}

// ---------------------------------------------------------
// Onboarding / KYC del cliente
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
  /** Todos los documentos requeridos fueron subidos (verificados o no). */
  kycSubido?: boolean;
  /** Todos los documentos requeridos fueron subidos Y aprobados por un analista. */
  kycCompleto?: boolean;
}

export interface SesionCliente {
  cliente: ClientePublico;
  accessToken: string;
  refreshToken: string;
}

export interface CrearClienteInput {
  token: string;
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

export function listarClientesOrganizacion(token: string) {
  return apiFetch<ClientePublico[]>("/clientes", { token });
}

// ---------------------------------------------------------
// Usuario autenticado (backoffice)
// ---------------------------------------------------------
export interface UsuarioActual {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  organizacion: Organizacion;
}

export function obtenerUsuarioActual(token: string) {
  return apiFetch<UsuarioActual>("/usuarios/me", { token });
}

export type TipoDocumentoKyc = "DNI_FRENTE" | "DNI_DORSO" | "SELFIE";

export function subirDocumentoKyc(clienteId: string, tipo: TipoDocumentoKyc, archivo: File) {
  const formData = new FormData();
  formData.append("tipo", tipo);
  formData.append("archivo", archivo);
  return apiFetch(`/clientes/${clienteId}/documentos`, { method: "POST", body: formData });
}

export interface DocumentoKycRevision {
  id: string;
  tipo: "DNI_FRENTE" | "DNI_DORSO" | "SELFIE" | "FIRMA";
  verificado: boolean;
  motivoRechazo: string | null;
  createdAt: string;
  url: string;
}

export async function obtenerDocumentosCliente(token: string, clienteId: string) {
  const documentos = await apiFetch<DocumentoKycRevision[]>(`/clientes/${clienteId}/documentos`, { token });
  // El backend devuelve rutas relativas (/uploads/...); el frontend corre en otro origen.
  return documentos.map((doc) => ({ ...doc, url: `${API_ORIGIN}${doc.url}` }));
}

export function verificarDocumentoKyc(
  token: string,
  clienteId: string,
  documentoId: string,
  aprobado: boolean,
  motivoRechazo?: string,
) {
  return apiFetch<DocumentoKycRevision>(`/clientes/${clienteId}/documentos/${documentoId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ aprobado, motivoRechazo }),
  });
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
// Ofertas de préstamo
// ---------------------------------------------------------
export type SistemaAmortizacion = "FRANCES" | "ALEMAN" | "AMERICANO";

export interface Oferta {
  id: string;
  clienteId: string;
  montoOfrecido: string;
  cantidadCuotas: number;
  sistemaAmortizacion: SistemaAmortizacion;
  tna: string;
  tea: string;
  estado: string;
  expiraEn: string | null;
  motivoRechazo: string | null;
  cliente?: { nombres: string; apellidos: string; dni: string };
}

export function crearOferta(
  token: string,
  datos: {
    clienteId: string;
    montoOfrecido: number;
    cantidadCuotas: number;
    sistemaAmortizacion?: SistemaAmortizacion;
    tna?: number;
  },
) {
  return apiFetch<Oferta>("/ofertas", { method: "POST", token, body: JSON.stringify(datos) });
}

export function listarOfertasOrganizacion(token: string) {
  return apiFetch<Oferta[]>("/ofertas", { token });
}

export function misOfertas(token: string) {
  return apiFetch<Oferta[]>("/ofertas/mias", { token });
}

export function aceptarOferta(token: string, id: string) {
  return apiFetch<Prestamo>(`/ofertas/${id}/aceptar`, {
    method: "POST",
    token,
    body: JSON.stringify({ aceptaCondiciones: true }),
  });
}

export function rechazarOferta(token: string, id: string, motivo?: string) {
  return apiFetch<Oferta>(`/ofertas/${id}/rechazar`, {
    method: "POST",
    token,
    body: JSON.stringify({ motivo }),
  });
}

// ---------------------------------------------------------
// Préstamos
// ---------------------------------------------------------
export interface Prestamo {
  id: string;
  montoOtorgado: string;
  cantidadCuotas: number;
  estado: string;
  fechaDesembolso: string | null;
}

export interface AlertasEstadoCuenta {
  tieneCuotasVencidas: boolean;
  cantidadCuotasVencidas: number;
  proximoVencimientoEnDias: number | null;
  proximoVencimientoUrgente: boolean;
}

export interface EstadoCuenta {
  totalPagado: number;
  totalPendiente: number;
  proximoVencimiento: string | null;
  cantidadCuotasPendientes: number;
  alertas: AlertasEstadoCuenta;
}

export function obtenerEstadoCuenta(token: string, prestamoId: string) {
  return apiFetch<EstadoCuenta>(`/prestamos/${prestamoId}/estado-cuenta`, { token });
}

export interface Cuota {
  id: string;
  numeroCuota: number;
  montoCapital: string;
  montoInteres: string;
  montoTotal: string;
  fechaVencimiento: string;
  estado: string;
  saldoPendiente: string;
}

export function obtenerCuotas(token: string, prestamoId: string) {
  return apiFetch<Cuota[]>(`/prestamos/${prestamoId}/cuotas`, { token });
}

export interface Pago {
  id: string;
  monto: string;
  metodoPago: string;
  comprobanteNumero: string | null;
  createdAt: string;
  cuota: { numeroCuota: number };
  sucursal: { nombre: string };
}

export function obtenerPagos(token: string, prestamoId: string) {
  return apiFetch<Pago[]>(`/prestamos/${prestamoId}/pagos`, { token });
}

export function generarLinkWhatsapp(token: string, prestamoId: string) {
  return apiFetch<{ url: string }>(`/prestamos/${prestamoId}/estado-cuenta/whatsapp`, {
    method: "POST",
    token,
  });
}

// ---------------------------------------------------------
// Alertas (dashboard backoffice)
// ---------------------------------------------------------
export interface ResumenAlertas {
  prestamosEnMora: number;
  cuotasVencidas: number;
  cuotasPorVencerPronto: number;
}

export function obtenerResumenAlertas(token: string) {
  return apiFetch<ResumenAlertas>("/alertas/resumen", { token });
}

// ---------------------------------------------------------
// Cotización del dólar (panel de admin)
// ---------------------------------------------------------
export interface CotizacionDolar {
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

export function obtenerCotizacionDolar(token: string) {
  return apiFetch<CotizacionDolar[]>("/cotizaciones/dolar", { token });
}
