import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectSettingsModal } from '../features/projects/ProjectSettingsModal';
import { Project } from '../types/database.types';

const OWNER_ID = 'owner-1';
const MEMBER_ID = 'member-2';

const membersData = [
  {
    project_id: 'proj-1',
    user_id: OWNER_ID,
    role: 'owner',
    joined_at: '2026-10-01T00:00:00Z',
    profiles: { id: OWNER_ID, display_name: 'Manuel' },
  },
  {
    project_id: 'proj-1',
    user_id: MEMBER_ID,
    role: 'member',
    joined_at: '2026-10-02T00:00:00Z',
    profiles: { id: MEMBER_ID, display_name: 'Laura' },
  },
];

// delete().eq('project_id').eq('user_id') → mockDeleteResult()
const mockDeleteResult = vi.fn();
const mockDelete = vi.fn(() => ({
  eq: () => ({ eq: (...args: unknown[]) => mockDeleteResult(...args) }),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: membersData, error: null }),
      }),
      delete: () => mockDelete(),
    }),
  },
}));

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: OWNER_ID } }),
}));

const project: Project = {
  id: 'proj-1',
  name: 'Proyecto SID',
  description: null,
  owner_id: OWNER_ID,
} as Project;

const renderModal = () =>
  render(
    <ProjectSettingsModal
      project={project}
      isOpen
      onClose={vi.fn()}
      onProjectUpdated={vi.fn()}
      onProjectDeleted={vi.fn()}
      onOpenInviteMember={vi.fn()}
    />
  );

const openRemoveDialog = async () => {
  const removeButton = await screen.findByRole('button', { name: 'Retirar a Laura del proyecto' });
  fireEvent.click(removeButton);
  return screen.getByRole('alertdialog');
};

describe('ProjectSettingsModal — confirmación al retirar integrante (Issue #16, T16)', () => {
  beforeEach(() => {
    mockDeleteResult.mockReset();
    mockDeleteResult.mockResolvedValue({ error: null });
    mockDelete.mockClear();
  });

  it('no usa window.confirm al pulsar retirar', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    renderModal();
    await openRemoveDialog();
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('abre el diálogo con el nombre del integrante y la advertencia, sin retirar aún', async () => {
    renderModal();
    const dialog = await openRemoveDialog();

    expect(dialog).toHaveTextContent('¿Retirar a Laura del proyecto?');
    expect(dialog).toHaveTextContent(
      'El usuario perderá el acceso inmediato al tablero de tareas y a la actividad del proyecto.'
    );
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Confirmar retiro' })).toBeInTheDocument();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('Cancelar cierra el diálogo sin retirar al integrante', async () => {
    renderModal();
    await openRemoveDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Laura')).toBeInTheDocument();
  });

  it('la tecla Escape cierra el diálogo sin retirar al integrante', async () => {
    renderModal();
    await openRemoveDialog();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('Confirmar retiro ejecuta el borrado y quita al integrante de la lista', async () => {
    renderModal();
    await openRemoveDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar retiro' }));

    await waitFor(() => expect(screen.queryByText('Laura')).not.toBeInTheDocument());
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockDeleteResult).toHaveBeenCalledWith('user_id', MEMBER_ID);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('muestra el error si el borrado falla y mantiene al integrante', async () => {
    mockDeleteResult.mockResolvedValueOnce({ error: { message: 'Permiso denegado' } });
    renderModal();
    await openRemoveDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar retiro' }));

    expect(await screen.findByText('Permiso denegado')).toBeInTheDocument();
    expect(screen.getByText('Laura')).toBeInTheDocument();
  });
});
