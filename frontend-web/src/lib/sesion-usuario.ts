import { useSyncExternalStore } from "react";
import type { SesionUsuario } from "./api";

const CLAVE_STORAGE = "presto-cuotas:sesion-usuario";
const listeners = new Set<() => void>();

let crudoCacheado: string | null | undefined;
let sesionCacheada: SesionUsuario | null = null;

function leer(): SesionUsuario | null {
  if (typeof window === "undefined") return null;
  const crudo = window.localStorage.getItem(CLAVE_STORAGE);
  if (crudo === crudoCacheado) return sesionCacheada;

  crudoCacheado = crudo;
  try {
    sesionCacheada = crudo ? (JSON.parse(crudo) as SesionUsuario) : null;
  } catch {
    sesionCacheada = null;
  }
  return sesionCacheada;
}

function notificar() {
  listeners.forEach((listener) => listener());
}

export function guardarSesionUsuario(sesion: SesionUsuario) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CLAVE_STORAGE, JSON.stringify(sesion));
  notificar();
}

export function cerrarSesionUsuario() {
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

export function useSesionUsuario(): SesionUsuario | null | undefined {
  return useSyncExternalStore(suscribir, leer, () => undefined);
}
