import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Task, TaskPriority, TaskStatus, ProjectMember } from '../../types/database.types';
import { validateTaskInput, sanitizeTitle } from '../../lib/validators';
import { useAuth } from '../auth/AuthContext';
import { X, CheckSquare, AlertCircle } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  taskToEdit?: Task | null;
  members: ProjectMember[];
  onTaskSaved: () => void;
  defaultStatus?: TaskStatus;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  projectId,
  taskToEdit,
  members,
  onTaskSaved,
  defaultStatus = 'pending',
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        setTitle(taskToEdit.title);
        setDescription(taskToEdit.description || '');
        setStatus(taskToEdit.status);
        setPriority(taskToEdit.priority);
        setAssigneeId(taskToEdit.assignee_id || '');
        setDueDate(taskToEdit.due_date || '');
      } else {
        setTitle('');
        setDescription('');
        setStatus(defaultStatus);
        setPriority('medium');
        setAssigneeId('');
        setDueDate('');
      }
      setErrorMsg(null);
    }
  }, [isOpen, taskToEdit, defaultStatus]);

  if (!isOpen) return null;

  // Atajo Ctrl+Enter (Cmd+Enter en macOS) para guardar desde cualquier campo (T31).
  // requestSubmit() sigue el mismo camino que el botón de envío: valida los
  // campos `required` y ejecuta handleSubmit, que evita la recarga de la página.
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (!(e.ctrlKey || e.metaKey) || e.key !== 'Enter') return;
    e.preventDefault();
    if (loading) return;
    e.currentTarget.requestSubmit();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const sanitizedTitle = sanitizeTitle(title);
    const validation = validateTaskInput(sanitizedTitle, status, priority);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Datos de tarea inválidos.');
      return;
    }

    setLoading(true);
    try {
      if (taskToEdit) {
        // Update task
        const { error } = await supabase
          .from('tasks')
          .update({
            title: sanitizedTitle,
            description: description.trim() || null,
            status,
            priority,
            assignee_id: assigneeId || null,
            due_date: dueDate || null,
          })
          .eq('id', taskToEdit.id);

        if (error) throw error;

        // Log activity
        await supabase.from('activity_log').insert({
          project_id: projectId,
          actor_id: user?.id,
          action: 'task_updated',
          task_id: taskToEdit.id,
          details: { title: sanitizedTitle, status, priority },
        });
      } else {
        // Create task
        const { data: newTask, error } = await supabase
          .from('tasks')
          .insert({
            project_id: projectId,
            title: sanitizedTitle,
            description: description.trim() || null,
            status,
            priority,
            assignee_id: assigneeId || null,
            created_by: user?.id,
            due_date: dueDate || null,
          })
          .select()
          .single();

        if (error) throw error;

        // Log activity
        await supabase.from('activity_log').insert({
          project_id: projectId,
          actor_id: user?.id,
          action: 'task_created',
          task_id: newTask.id,
          details: { title: sanitizedTitle, priority, status },
        });
      }

      onTaskSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar la tarea.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
          <div className="flex items-center gap-2 text-teal-700">
            <CheckSquare className="w-5 h-5" />
            <h3 className="text-base font-semibold text-slate-900">
              {taskToEdit ? 'Editar Tarea' : 'Nueva Tarea'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Título de la Tarea *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ej. Diseñar esquema relacional en PostgreSQL"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Descripción (opcional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles sobre entregables, consideraciones técnicas..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Estado
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
              >
                <option value="pending">Pendiente</option>
                <option value="in_progress">En progreso</option>
                <option value="completed">Completada</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Prioridad
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Responsable Asignado
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
              >
                <option value="">Sin asignar</option>
                {members.map((m) => {
                  const name = (m.profiles as any)?.display_name || 'Integrante';
                  return (
                    <option key={m.user_id} value={m.user_id}>
                      {name} {m.user_id === user?.id ? '(Tú)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Fecha Límite
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Guardando...' : taskToEdit ? 'Actualizar Tarea' : 'Crear Tarea'}
            </button>
          </div>
          <p className="text-right text-[11px] text-slate-500 -mt-2">
            Atajo: <kbd className="font-sans font-semibold">Ctrl + Enter</kbd>
          </p>
        </form>
      </div>
    </div>
  );
};
