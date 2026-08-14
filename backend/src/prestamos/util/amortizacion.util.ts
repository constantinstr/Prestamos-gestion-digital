export interface CuotaCalculada {
  numeroCuota: number;
  montoCapital: number;
  montoInteres: number;
  montoTotal: number;
  /** Saldo de capital del préstamo que queda DESPUÉS de esta cuota (no confundir con
   * lo que falta pagar de la cuota en sí, que es `montoTotal` hasta que se abone). */
  saldoCapitalRestante: number;
}

/**
 * Sistema Francés (cuota fija). `tna` en porcentaje anual (ej. 65.5).
 */
export function calcularPlanDeCuotas(
  monto: number,
  cantidadCuotas: number,
  tna: number,
): CuotaCalculada[] {
  const tasaMensual = tna / 100 / 12;
  const cuotaFija =
    tasaMensual === 0
      ? monto / cantidadCuotas
      : (monto * tasaMensual) /
        (1 - Math.pow(1 + tasaMensual, -cantidadCuotas));

  let saldo = monto;
  const cuotas: CuotaCalculada[] = [];

  for (let numero = 1; numero <= cantidadCuotas; numero++) {
    const interes = saldo * tasaMensual;
    const capital = numero === cantidadCuotas ? saldo : cuotaFija - interes;
    saldo = Math.max(0, saldo - capital);

    cuotas.push({
      numeroCuota: numero,
      montoCapital: redondear(capital),
      montoInteres: redondear(interes),
      montoTotal: redondear(capital + interes),
      saldoCapitalRestante: redondear(saldo),
    });
  }

  return cuotas;
}

export function calcularTea(tna: number): number {
  const tasaMensual = tna / 100 / 12;
  return redondear((Math.pow(1 + tasaMensual, 12) - 1) * 100);
}

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}
