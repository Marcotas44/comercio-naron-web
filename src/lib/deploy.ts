/**
 * Dispara un deploy de Netlify vía Build Hook tras cambios en contenido público.
 *
 * - Fire-and-forget seguro: NUNCA lanza. Si Netlify falla o no hay hook
 *   configurado, el guardado en Supabase ya ha ocurrido y no se ve afectado.
 * - Se hace `await` con timeout corto porque en entornos serverless (Netlify
 *   Functions) la función puede congelarse tras devolver la respuesta y una
 *   petición "en vuelo" sin await podría no llegar a enviarse.
 *
 * Devuelve `true` si se ha disparado el deploy, `false` si no había hook o falló.
 */
export async function triggerDeploy(): Promise<boolean> {
  const hookUrl = import.meta.env.NETLIFY_BUILD_HOOK_URL;
  if (!hookUrl) return false; // sin hook configurado (p. ej. desarrollo local)

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(hookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger: 'admin-panel' }),
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    // Red caída, timeout, hook inválido… el guardado sigue siendo válido.
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
