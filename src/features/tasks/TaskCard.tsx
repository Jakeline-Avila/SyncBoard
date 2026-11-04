import React from 'react';
import { Task, TaskStatus } from '../../types/database.types';
import {
  formatPriority,
  getPriorityBadgeClass,
  formatDate,
  getOverdueDays,
  formatOverdueLabel,
} from '../../lib/formatters';
import { AlertCircle, Calendar, User, ChevronLeft, ChevronRight, Edit2, Trash2 } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  assigneeName?: string;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  assigneeName,
}) => {
  const overdueDays = getOverdueDays(task.due_date, task.status);
  const isOverdue = overdueDays !== null && overdueDays > 0;

  const getPreviousStatus = (status: TaskStatus): TaskStatus | null => {
    if (status === 'completed') return 'in_progress';
    if (status === 'in_progress') return 'pending';
    return null;
  };

  const getNextStatus = (status: TaskStatus): TaskStatus | null => {
    if (status === 'pending') return 'in_progress';
    if (status === 'in_progress') return 'completed';
    return null;
  };

  const prevStatus = getPreviousStatus(task.status);
  const nextStatus = getNextStatus(task.status);

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3 group">
      <div>
        {/* Cabecera de la tarjeta: Prioridad y Acciones */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getPriorityBadgeClass(
              task.priority
            )}`}
          >
            {formatPriority(task.priority)}
          </span>

          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
            <button
              type="button"
              onClick={() => onEdit(task)}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition"
              title="Editar tarea"
              aria-label="Editar tarea"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
              title="Eliminar tarea"
              aria-label="Eliminar tarea"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Título */}
        <h4 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2 mb-1">
          {task.title}
        </h4>

        {/* Descripción opcional */}
        {task.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-3">
            {task.description}
          </p>
        )}

        {/* Indicador de retraso (T03) */}
        {overdueDays !== null && (
          <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600">
            <AlertCircle className="w-3 h-3" aria-hidden="true" />
            <span>{formatOverdueLabel(overdueDays)}</span>
          </p>
        )}
      </div>

      <div>
        {/* Metadatos: Responsable y Fecha */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5" title={assigneeName || 'Sin asignar'}>
            <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-600 font-bold">
              {assigneeName ? assigneeName.charAt(0).toUpperCase() : <User className="w-3 h-3 text-slate-400" />}
            </div>
            <span className="text-[11px] truncate max-w-[90px] sm:max-w-[120px]">
              {assigneeName || 'Sin asignar'}
            </span>
          </div>

          {task.due_date && (
            <div
              className={`flex items-center gap-1 text-[11px] font-medium ${
                isOverdue ? 'text-red-600 font-bold' : 'text-slate-500'
              }`}
              title={isOverdue ? 'Tarea vencida' : 'Fecha límite'}
            >
              <Calendar className="w-3 h-3" />
              <span>{formatDate(task.due_date)}</span>
            </div>
          )}
        </div>

        {/* Controles accesibles para cambiar estado */}
        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
          {prevStatus ? (
            <button
              type="button"
              onClick={() => onStatusChange(task.id, prevStatus)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition"
              title="Mover a columna anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </button>
          ) : (
            <div />
          )}

          {nextStatus && (
            <button
              type="button"
              onClick={() => onStatusChange(task.id, nextStatus)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 rounded transition ml-auto"
              title="Avanzar a siguiente columna"
            >
              <span>Avanzar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
