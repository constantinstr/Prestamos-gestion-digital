import { SistemaAmortizacion } from '@prisma/client';

export interface CuotaCalculada {
  numeroCuota: number;
  montoCapital: number;
  montoInteres: number;
  montoTotal: number;
  /** Saldo de capital del préstamo que queda DESPUÉS de esta cuota (no confundir con
   * lo que falta pagar de la cuota en sí, que es `montoTotal` hasta que se abone). */
  saldoCapitalRestante: number;
}

/** `tna` en porcentaje anual (ej. 65.5). Despacha al sistema de amortización elegido. */
export function calcularPlan(
  sistema: SistemaAmortizacion,
  monto: number,
  cantidadCuotas: number,
  tna: number,
): CuotaCalculada[] {
  switch (sistema) {
    case SistemaAmortizacion.ALEMAN:
      return calcularPlanAleman(monto, cantidadCuotas, tna);
    case SistemaAmortizacion.AMERICANO:
      return calcularPlanAmericano(monto, cantidadCuotas, tna);
    case SistemaAmortizacion.FRANCES:
    default:
      return calcularPlanFrances(monto, cantidadCuotas, tna);
  }
}

/** Sistema Francés: cuota total fija, interés decreciente, capital creciente. */
export function calcularPlanFrances(
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

/** Sistema Alemán: capital fijo en cada cuota, interés sobre saldo (decreciente).
 * La cuota total es más alta al principio y baja con el tiempo. */
export function calcularPlanAleman(
  monto: number,
  cantidadCuotas: number,
  tna: number,
): CuotaCalculada[] {
  const tasaMensual = tna / 100 / 12;
  const capitalFijo = monto / cantidadCuotas;

  let saldo = monto;
  const cuotas: CuotaCalculada[] = [];

  for (let numero = 1; numero <= cantidadCuotas; numero++) {
    const interes = saldo * tasaMensual;
    const capital = numero === cantidadCuotas ? saldo : capitalFijo;
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

/** Sistema Americano ("bullet"): solo se paga interés en cada cuota; todo el
 * capital se cancela junto con el interés de la última cuota. */
export function calcularPlanAmericano(
  monto: number,
  cantidadCuotas: number,
  tna: number,
): CuotaCalculada[] {
  const tasaMensual = tna / 100 / 12;
  const interesMensual = monto * tasaMensual;

  const cuotas: CuotaCalculada[] = [];
  for (let numero = 1; numero <= cantidadCuotas; numero++) {
    const esUltima = numero === cantidadCuotas;
    const capital = esUltima ? monto : 0;

    cuotas.push({
      numeroCuota: numero,
      montoCapital: redondear(capital),
      montoInteres: redondear(interesMensual),
      montoTotal: redondear(capital + interesMensual),
      saldoCapitalRestante: esUltima ? 0 : monto,
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
