import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskModal } from '../features/tasks/TaskModal';

// from('tasks').insert(...).select().single() y from('activity_log').insert(...)
const mockTaskInsert = vi.fn();
const mockActivityInsert = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'tasks') {
        return {
          insert: (payload: unknown) => {
            mockTaskInsert(payload);
            return {
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'task-new' }, error: null }),
              }),
            };
          },
        };
      }
      return {
        insert: (payload: unknown) => {
          mockActivityInsert(payload);
          return Promise.resolve({ error: null });
        },
      };
    },
  },
}));

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

const onTaskSaved = vi.fn();
const onClose = vi.fn();

const renderModal = () =>
  render(
    <TaskModal
      isOpen
      onClose={onClose}
      projectId="proj-1"
      members={[]}
      onTaskSaved={onTaskSaved}
    />
  );

const titleInput = () =>
  screen.getByPlaceholderText('ej. Diseñar esquema relacional en PostgreSQL');
const descriptionInput = () =>
  screen.getByPlaceholderText('Detalles sobre entregables, consideraciones técnicas...');

describe('TaskModal — atajo Ctrl+Enter para guardar (Issue #31, T31)', () => {
  beforeEach(() => {
    mockTaskInsert.mockClear();
    mockActivityInsert.mockClear();
    onTaskSaved.mockClear();
    onClose.mockClear();
  });

  it('muestra el texto de ayuda "Atajo: Ctrl + Enter"', () => {
    renderModal();
    expect(screen.getByText(/Atajo:/)).toHaveTextContent('Atajo: Ctrl + Enter');
  });

  it('Ctrl+Enter en el título guarda la tarea y evita el comportamiento por defecto', async () => {
    renderModal();
    fireEvent.change(titleInput(), { target: { value: 'Diseñar esquema' } });

    const notPrevented = fireEvent.keyDown(titleInput(), { key: 'Enter', ctrlKey: true });
    expect(notPrevented).toBe(false); // preventDefault() fue llamado

    await waitFor(() => expect(onTaskSaved).toHaveBeenCalledTimes(1));
    expect(mockTaskInsert).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Diseñar esquema', project_id: 'proj-1', status: 'pending' })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Cmd+Enter (macOS) desde la descripción también guarda la tarea', async () => {
    renderModal();
    fireEvent.change(titleInput(), { target: { value: 'Redactar informe' } });
    fireEvent.change(descriptionInput(), { target: { value: 'Incluir diagramas' } });

    fireEvent.keyDown(descriptionInput(), { key: 'Enter', metaKey: true });

    await waitFor(() => expect(onTaskSaved).toHaveBeenCalledTimes(1));
    expect(mockTaskInsert).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Redactar informe', description: 'Incluir diagramas' })
    );
  });

  it('no guarda si el título requerido está vacío', async () => {
    renderModal();

    fireEvent.keyDown(titleInput(), { key: 'Enter', ctrlKey: true });

    // Damos tiempo a cualquier envío asíncrono antes de afirmar que no ocurrió.
    await new Promise((r) => setTimeout(r, 0));
    expect(mockTaskInsert).not.toHaveBeenCalled();
    expect(onTaskSaved).not.toHaveBeenCalled();
  });

  it('Enter sin modificador en la descripción no guarda (permite saltos de línea)', async () => {
    renderModal();
    fireEvent.change(titleInput(), { target: { value: 'Tarea' } });

    fireEvent.keyDown(descriptionInput(), { key: 'Enter' });

    await new Promise((r) => setTimeout(r, 0));
    expect(mockTaskInsert).not.toHaveBeenCalled();
  });
});
