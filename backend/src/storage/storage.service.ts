import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

export interface ArchivoAlmacenado {
  storageKey: string;
  hashIntegridad: string;
}

/**
 * Implementación local en disco para desarrollo. En producción debe
 * reemplazarse por un adapter de S3 (bucket privado + URLs firmadas),
 * manteniendo esta misma interfaz para no tocar los módulos que la consumen.
 */
@Injectable()
export class StorageService {
  private readonly baseDir = join(process.cwd(), 'uploads');

  async subir(
    carpeta: string,
    buffer: Buffer,
    extension: string,
  ): Promise<ArchivoAlmacenado> {
    const hashIntegridad = createHash('sha256').update(buffer).digest('hex');
    const storageKey = `${carpeta}/${randomUUID()}.${extension}`;
    const destino = join(this.baseDir, storageKey);

    await mkdir(join(destino, '..'), { recursive: true });
    await writeFile(destino, buffer);

    return { storageKey, hashIntegridad };
  }

  obtenerUrlFirmada(storageKey: string): Promise<string> {
    // TODO(producción): generar URL firmada de S3 con expiración corta (p. ej. 5 min).
    return Promise.resolve(`/uploads/${storageKey}`);
  }
}
