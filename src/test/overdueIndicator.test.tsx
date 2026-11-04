import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getOverdueDays, formatOverdueLabel } from '../lib/formatters';
import { TaskCard } from '../features/tasks/TaskCard';
import { Task } from '../types/database.types';

// "Hoy" fijo a media tarde para que la prueba no dependa del reloj real.
const TODAY = new Date(2026, 10, 4, 15, 30); // 4 de noviembre de 2026

describe('getOverdueDays - Issue #3 (T03)', () => {
  it('devuelve 1 para una tarea vencida ayer', () => {
    expect(getOverdueDays('2026-11-03', 'pending', TODAY)).toBe(1);
  });

  it('devuelve 5 para una tarea vencida hace 5 días', () => {
    expect(getOverdueDays('2026-10-30', 'in_progress', TODAY)).toBe(5);
  });

  it('devuelve 0 cuando la tarea vence hoy', () => {
    expect(getOverdueDays('2026-11-04', 'pending', TODAY)).toBe(0);
  });

  it('devuelve null para fechas futuras', () => {
    expect(getOverdueDays('2026-11-05', 'pending', TODAY)).toBeNull();
    expect(getOverdueDays('2026-12-25', 'in_progress', TODAY)).toBeNull();
  });

  it('no marca como retrasada una tarea completada', () => {
    expect(getOverdueDays('2026-10-30', 'completed', TODAY)).toBeNull();
    expect(getOverdueDays('2026-11-04', 'completed', TODAY)).toBeNull();
  });

  it('devuelve null si no hay fecha o es inválida', () => {
    expect(getOverdueDays(null, 'pending', TODAY)).toBeNull();
    expect(getOverdueDays('no-es-fecha', 'pending', TODAY)).toBeNull();
  });

  it('cuenta días correctamente al cruzar un cambio de mes', () => {
    expect(getOverdueDays('2026-10-31', 'pending', TODAY)).toBe(4);
  });
});

describe('formatOverdueLabel - Issue #3 (T03)', () => {
  it('muestra "Vence hoy" para 0 días', () => {
    expect(formatOverdueLabel(0)).toBe('Vence hoy');
  });

  it('usa singular para 1 día', () => {
    expect(formatOverdueLabel(1)).toBe('Vencida hace 1 día');
  });

  it('usa plural para varios días', () => {
    expect(formatOverdueLabel(5)).toBe('Vencida hace 5 días');
  });
});

describe('TaskCard - indicador de retraso (T03)', () => {
  const baseTask: Task = {
    id: 't1',
    project_id: 'p1',
    title: 'Entregar informe',
    description: null,
    status: 'pending',
    priority: 'medium',
    assignee_id: null,
    created_by: 'u1',
    due_date: null,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  };

  const renderCard = (overrides: Partial<Task>) =>
    render(
      <TaskCard
        task={{ ...baseTask, ...overrides }}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onStatusChange={vi.fn()}
      />
    );

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra "Vencida hace 5 días" en rojo para una tarea pendiente vencida', () => {
    renderCard({ due_date: '2026-10-30' });
    const label = screen.getByText('Vencida hace 5 días');
    expect(label.closest('p')?.className).toContain('text-red-600');
  });

  it('muestra "Vence hoy" cuando la fecha límite es hoy', () => {
    renderCard({ due_date: '2026-11-04', status: 'in_progress' });
    expect(screen.getByText('Vence hoy')).toBeTruthy();
  });

  it('no muestra indicador para una tarea completada vencida', () => {
    renderCard({ due_date: '2026-10-30', status: 'completed' });
    expect(screen.queryByText(/Vencida hace|Vence hoy/)).toBeNull();
  });

  it('no muestra indicador para una fecha futura', () => {
    renderCard({ due_date: '2026-11-10' });
    expect(screen.queryByText(/Vencida hace|Vence hoy/)).toBeNull();
  });
});
