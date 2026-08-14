import { Injectable } from '@nestjs/common';
import { EstadoSolicitud } from '@prisma/client';
import { RespuestaBuro } from '../buro/buro-provider.interface';

/**
 * Motor de reglas de decisión. Los umbrales deberían migrar a
 * `configuracion_tasas` o a una tabla dedicada de reglas editable desde el
 * Backoffice; se dejan como constantes para simplificar el scaffold inicial.
 */
const SCORE_APROBACION_AUTOMATICA = 700;
const SCORE_RECHAZO_AUTOMATICO = 400;
const SITUACION_BCRA_RECHAZO = 3; // >=3 implica mora/irregularidad

@Injectable()
export class ReglasDecisionService {
  evaluar(respuesta: RespuestaBuro): EstadoSolicitud {
    if (
      respuesta.situacionBcra >= SITUACION_BCRA_RECHAZO ||
      respuesta.score < SCORE_RECHAZO_AUTOMATICO
    ) {
      return EstadoSolicitud.RECHAZADA_AUTOMATICA;
    }
    if (respuesta.score >= SCORE_APROBACION_AUTOMATICA) {
      return EstadoSolicitud.PRE_APROBADA;
    }
    return EstadoSolicitud.EN_REVISION;
  }
}
