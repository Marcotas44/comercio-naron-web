/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly NETLIFY_BUILD_HOOK_URL?: string;
  readonly PUBLIC_N8N_WEBHOOK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    user: {
      id: string;
      email: string;
      role: 'super_admin' | 'admin_asociacion' | 'editor';
      nombre: string | null;
    } | null;
  }
}
