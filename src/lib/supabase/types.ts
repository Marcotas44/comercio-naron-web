// Tipos compartidos del dominio. Reflejan el schema de Supabase (supabase/schema.sql).

export type UserRole = 'super_admin' | 'admin_asociacion' | 'editor';

export type SolicitudEstado = 'pendiente' | 'aceptado' | 'rechazado';

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
  titulo: string;
  descripcion: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  imagen: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface SolicitudSocio {
  id: string;
  comercio_nombre: string;
  contacto_nombre: string;
  email: string;
  telefono: string | null;
  mensaje: string | null;
  estado: SolicitudEstado;
  notas_internas: string | null;
  attended_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionUser {
  id: string;
  email: string;
  nombre: string | null;
  role: UserRole;
}
