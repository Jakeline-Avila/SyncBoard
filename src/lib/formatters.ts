import { TaskPriority, TaskStatus } from '../types/database.types';

export const formatStatus = (status: TaskStatus): string => {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'in_progress':
      return 'En progreso';
    case 'completed':
      return 'Completada';
    default:
      return status;
  }
};

export const formatPriority = (priority: TaskPriority): string => {
  switch (priority) {
    case 'low':
      return 'Baja';
    case 'medium':
      return 'Media';
    case 'high':
      return 'Alta';
    default:
      return priority;
  }
};

export const getPriorityBadgeClass = (priority: TaskPriority): string => {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'medium':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'low':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

export const formatDate = (dateString: string | null): string => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateString: string | null): string => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Convierte una fecha "YYYY-MM-DD" (columna DATE) en medianoche local.
 * `new Date('YYYY-MM-DD')` la interpreta como UTC y, en zonas horarias
 * negativas (p. ej. UTC-5), desplazaría la fecha al día anterior.
 */
const parseLocalDate = (dateString: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateString);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
};

/**
 * Días de retraso de una tarea respecto a `today`.
 * Devuelve 0 si vence hoy, N >= 1 si está vencida y `null` si no aplica
 * (sin fecha, fecha inválida, fecha futura o tarea completada).
 */
export const getOverdueDays = (
  dueDate: string | null,
  status: TaskStatus,
  today: Date = new Date()
): number | null => {
  if (!dueDate || status === 'completed') return null;
  const due = parseLocalDate(dueDate);
  if (!due) return null;
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((startOfToday.getTime() - due.getTime()) / MS_PER_DAY);
  return diffDays >= 0 ? diffDays : null;
};

/** Etiqueta legible para los días de retraso, con manejo singular/plural. */
export const formatOverdueLabel = (days: number): string => {
  if (days === 0) return 'Vence hoy';
  return `Vencida hace ${days} ${days === 1 ? 'día' : 'días'}`;
};
