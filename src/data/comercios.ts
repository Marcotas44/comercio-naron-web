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
  descripcion?: string;
}

/** Correcciones de calidad aplicadas sobre los datos importados.
 *  Se aplican en carga, así sobreviven aunque se regenere comercios.json. */
const CATEGORIA_NORMALIZA: Record<string, string> = {
  Optica: 'Óptica',
};
// Categorías deducibles por el nombre del comercio (no se inventan: son evidentes).
const CATEGORIA_POR_SLUG: Record<string, string> = {
  'drogueria-dyppo': 'Droguería',
  'mon-voyage': 'Hoteles / Viajes',
};

function normaliza(c: Comercio): Comercio {
  let categoria = c.categoria || CATEGORIA_POR_SLUG[c.slug] || '';
  categoria = CATEGORIA_NORMALIZA[categoria] || categoria;
  return { ...c, categoria };
}

/** Comercios reales de la Asociación de Comerciantes de Narón.
 *  Generado por scripts/import-comercios.mjs a partir de comerciodenaron.com. */
export const comercios: Comercio[] = (data as Comercio[]).map(normaliza);

/** Cifra oficial de comercios para mostrar de forma coherente en toda la web. */
export const totalComercios: number = comercios.length;

export const categorias: string[] = [...new Set(comercios.map((c) => c.categoria).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b, 'es'));

export const zonas: string[] = [...new Set(comercios.map((c) => c.zona).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b, 'es'));

/** Solo dígitos, con prefijo internacional para enlaces wa.me / tel. */
export const soloDigitos = (tel: string): string => (tel || '').replace(/\D/g, '');

export const getComercio = (slug: string): Comercio | undefined => comercios.find((c) => c.slug === slug);
