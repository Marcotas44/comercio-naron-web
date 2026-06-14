import data from './comercios.json';

export interface Comercio {
  slug: string;
  nombre: string;
  categoria: string;
  zona: string;
  direccion: string;
  telefono: string;
  email: string;
  web: string;
  imagen: string;
}

/** Comercios reales de la Asociación de Comerciantes de Narón.
 *  Generado por scripts/import-comercios.mjs a partir de comerciodenaron.com.
 *  No editar a mano: vuelve a ejecutar el script para actualizar. */
export const comercios: Comercio[] = data as Comercio[];

export const categorias: string[] = [...new Set(comercios.map((c) => c.categoria).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b, 'es'));

export const zonas: string[] = [...new Set(comercios.map((c) => c.zona).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b, 'es'));

/** Solo dígitos, con prefijo internacional para enlaces wa.me / tel. */
export const soloDigitos = (tel: string): string => (tel || '').replace(/\D/g, '');
