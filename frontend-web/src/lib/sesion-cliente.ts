import { useSyncExternalStore } from "react";
import type { SesionCliente } from "./api";

const CLAVE_STORAGE = "presto-cuotas:sesion-cliente";
const listeners = new Set<() => void>();

// getSnapshot debe devolver la misma referencia si los datos subyacentes no
// cambiaron, o useSyncExternalStore entra en loop infinito de renders.
let crudoCacheado: string | null | undefined;
let sesionCacheada: SesionCliente | null = null;

function leer(): SesionCliente | null {
  if (typeof window === "undefined") return null;
  const crudo = window.localStorage.getItem(CLAVE_STORAGE);
  if (crudo === crudoCacheado) return sesionCacheada;

  crudoCacheado = crudo;
  try {
    sesionCacheada = crudo ? (JSON.parse(crudo) as SesionCliente) : null;
  } catch {
    sesionCacheada = null;
  }
  return sesionCacheada;
}

function notificar() {
  listeners.forEach((listener) => listener());
}

export function guardarSesion(sesion: SesionCliente) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CLAVE_STORAGE, JSON.stringify(sesion));
  notificar();
}

export function cerrarSesion() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CLAVE_STORAGE);
  notificar();
}

function suscribir(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Sesión del cliente sincronizada con localStorage; `undefined` mientras no se hidrató en el navegador. */
export function useSesionCliente(): SesionCliente | null | undefined {
  return useSyncExternalStore(
    suscribir,
    leer,
    () => undefined,
  );
}
