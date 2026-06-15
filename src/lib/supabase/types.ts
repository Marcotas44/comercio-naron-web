// Tipos compartidos del dominio. Reflejan el schema de Supabase (supabase/schema.sql).

export type UserRole = 'super_admin' | 'admin_asociacion' | 'editor';

export type SolicitudEstado = 'pendiente' | 'contactado' | 'aceptado' | 'rechazado';

export interface Profile {
  id: string;
  email: string;
  nombre: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Comercio {
  id: string;
  slug: string;
  nombre: string;
  categoria: string | null;
  zona: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  web: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  descripcion: string | null;
  horario: string | null;
  destacado: boolean;
  logo: string | null;
  galeria_imagenes: string[];
  imagen: string | null;
  created_at: string;
  updated_at: string;
}

export interface Noticia {
  id: string;
  slug: string;
  titulo: string;
  resumen: string | null;
  contenido: string | null;
  imagen: string | null;
  fecha_publicacion: string | null;
  autor: string | null;
  publicado: boolean;
  created_at: string;
  updated_at: string;
}

export interface Campana {
  id: string;
  slug: string | null;
  titulo: string;
  resumen: string | null;
  descripcion: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  imagen: string | null;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

export interface SolicitudSocio {
  id: string;
  nombre: string | null;
  comercio: string | null;
  categoria: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  mensaje: string | null;
  estado: SolicitudEstado;
  notas_internas: string | null;
  attended_by: string | null;
  created_at: string;
  updated_at: string;
  // Compatibilidad con filas legacy del scaffold anterior.
  comercio_nombre?: string | null;
  contacto_nombre?: string | null;
}

export interface SessionUser {
  id: string;
  email: string;
  nombre: string | null;
  role: UserRole;
}
