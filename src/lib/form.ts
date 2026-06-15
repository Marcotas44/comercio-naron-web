/**
 * Helpers para procesar formularios del panel.
 */

export function getString(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

export function getRequired(fd: FormData, key: string): string {
  const v = getString(fd, key);
  if (v === null) throw new FormError(`El campo "${key}" es obligatorio.`);
  return v;
}

export function getBool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === 'true' || v === 'on' || v === '1';
}

export function getDate(fd: FormData, key: string): string | null {
  const v = getString(fd, key);
  if (!v) return null;
  // datetime-local llega como "YYYY-MM-DDTHH:mm". Lo dejamos pasar; Postgres lo entiende.
  return v;
}

export function getStringArray(fd: FormData, key: string): string[] {
  const list = fd.getAll(`${key}[]`).map((v) => String(v).trim()).filter(Boolean);
  if (list.length) return list;
  // Fallback por si llega como JSON serializado
  const raw = getString(fd, key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export class FormError extends Error {}

/**
 * Construye una URL de redirect con un mensaje flash.
 */
export function flashRedirect(base: string, message: string, type: 'success' | 'error' | 'info' = 'success'): string {
  const url = new URL(base, 'http://x'); // base relativa
  url.searchParams.set('flash', message);
  url.searchParams.set('flashType', type);
  return url.pathname + url.search;
}
