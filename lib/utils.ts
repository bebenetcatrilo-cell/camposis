import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina clases de Tailwind sin conflictos.
 * Uso: <div className={cn('p-4 bg-white', condicion && 'bg-red-500')} />
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea pesos argentinos.
 */
export function formatARS(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formatea kg con t/kg.
 */
export function formatKg(kg: number): string {
  if (kg >= 1000) {
    return (kg / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' t';
  }
  return Math.round(kg).toLocaleString('es-AR') + ' kg';
}

/**
 * Formatea fecha YYYY-MM-DD a dd/mm/yyyy.
 */
export function formatFecha(fecha: string | null | undefined): string {
  if (!fecha) return '—';
  const d = new Date(fecha + 'T00:00:00');
  return d.toLocaleDateString('es-AR');
}

/**
 * Slug-ify: "Estancia Don Luis" → "estancia-don-luis"
 */
export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
