import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';

describe('Tier 4: Realistic Workloads & Lifecycle Sessions Suite', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    localStorage.clear();
    window.location.hash = '';
  });

  async function createTodo(text: string) {
    const input = screen.getByPlaceholderText('What needs to be done?');
    await user.type(input, `${text}{enter}`);
  }

  function getTodoListItems(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>('.todo-list li'));
  }

  function getItemByTitle(container: HTMLElement, title: string): HTMLElement | null {
    const labels = Array.from(container.querySelectorAll<HTMLElement>('.todo-list li label'));
    const matched = labels.find((el) => el.textContent === title);
    return matched ? (matched.closest('li') as HTMLElement) : null;
  }

  // =========================================================================
  // Workflow 1: Daily Task Planning & Execution Session
  // =========================================================================
  it('executes realistic daily productivity task workflow with full lifecycle', async () => {
    const { unmount, container } = render(<App />);

    // 1. User starts fresh with empty app
    expect(container.querySelector('.main')).not.toBeInTheDocument();
    expect(container.querySelector('.footer')).not.toBeInTheDocument();

    // 2. User plans 5 tasks for the day
    const tasks = [
      'Daily engineering standup at 9:30 AM',
      'Review pull request #104 for auth refactor',
      'Fix bug in payment gateway webhook handler',
      'Deploy v2.4.0 release candidate to staging',
      'Write weekly status update for team sync',
    ];
    for (const task of tasks) {
      await createTodo(task);
    }

    expect(getTodoListItems(container)).toHaveLength(5);
    expect(container.querySelector('.todo-count')).toHaveTextContent('5 items left');
    expect(screen.queryByRole('button', { name: 'Clear completed' })).not.toBeInTheDocument();

    // 3. User completes the standup and PR review
    const standup = getItemByTitle(container, 'Daily engineering standup at 9:30 AM')!;
    const prReview = getItemByTitle(container, 'Review pull request #104 for auth refactor')!;
    await user.click(standup.querySelector('.toggle') as HTMLInputElement);
    await user.click(prReview.querySelector('.toggle') as HTMLInputElement);

    expect(container.querySelector('.todo-count')).toHaveTextContent('3 items left');
    expect(screen.getByRole('button', { name: 'Clear completed' })).toBeInTheDocument();

    // 4. User filters to Active tasks to focus on work
    await user.click(screen.getByRole('link', { name: 'Active' }));
    expect(getTodoListItems(container)).toHaveLength(3);

    // 5. User clarifies the deploy task title inline
    const deployTask = getItemByTitle(container, 'Deploy v2.4.0 release candidate to staging')!;
    await user.dblClick(deployTask.querySelector('label')!);

    const editInput = deployTask.querySelector('.edit') as HTMLInputElement;
    await user.clear(editInput);
    await user.type(editInput, 'Deploy v2.4.0 RC to staging after QA smoke test{enter}');

    expect(getItemByTitle(container, 'Deploy v2.4.0 RC to staging after QA smoke test')).not.toBeNull();

    // 6. User views Completed tasks
    await user.click(screen.getByRole('link', { name: 'Completed' }));
    expect(getTodoListItems(container)).toHaveLength(2);

    // 7. User clears completed tasks
    await user.click(screen.getByRole('button', { name: 'Clear completed' }));
    expect(getTodoListItems(container)).toHaveLength(0);

    // 8. User returns to All view
    await user.click(screen.getByRole('link', { name: 'All' }));
    expect(getTodoListItems(container)).toHaveLength(3);
    expect(container.querySelector('.todo-count')).toHaveTextContent('3 items left');

    // 9. Simulating page refresh and verifying persistence
    unmount();
    const { container: reloaded } = render(<App />);
    expect(getTodoListItems(reloaded)).toHaveLength(3);
    expect(getItemByTitle(reloaded, 'Deploy v2.4.0 RC to staging after QA smoke test')).not.toBeNull();
    expect(reloaded.querySelector('.todo-count')).toHaveTextContent('3 items left');
  });

  // =========================================================================
  // Workflow 2: Sprint Cleaning & Bulk Backlog Operations
  // =========================================================================
  it('executes sprint cleaning and bulk operations workflow', async () => {
    // Start with 6 backlog items in localStorage
    const backlog = [
      { id: 'b1', title: 'Legacy migration step 1', completed: false },
      { id: 'b2', title: 'Legacy migration step 2', completed: false },
      { id: 'b3', title: 'Legacy migration step 3', completed: false },
      { id: 'b4', title: 'Update documentation index', completed: false },
      { id: 'b5', title: 'Upgrade build tooling dependencies', completed: false },
      { id: 'b6', title: 'Archive deprecated endpoints', completed: false },
    ];
    localStorage.setItem('todos-react', JSON.stringify(backlog));

    const { container } = render(<App />);
    expect(getTodoListItems(container)).toHaveLength(6);
    expect(container.querySelector('.todo-count')).toHaveTextContent('6 items left');

    // 1. Mark all complete in bulk
    const toggleAll = screen.getByLabelText('Mark all as complete');
    await user.click(toggleAll);

    expect((toggleAll as HTMLInputElement).checked).toBe(true);
    expect(container.querySelector('.todo-count')).toHaveTextContent('0 items left');

    // 2. Realize 'Archive deprecated endpoints' is still pending -> uncheck it
    const archiveTask = getItemByTitle(container, 'Archive deprecated endpoints')!;
    await user.click(archiveTask.querySelector('.toggle') as HTMLInputElement);

    expect((toggleAll as HTMLInputElement).checked).toBe(false);
    expect(container.querySelector('.todo-count')).toHaveTextContent('1 item left');

    // 3. Clear all completed backlog items in bulk
    await user.click(screen.getByRole('button', { name: 'Clear completed' }));
    expect(getTodoListItems(container)).toHaveLength(1);
    expect(getItemByTitle(container, 'Archive deprecated endpoints')).not.toBeNull();

    // 4. Finally delete the last remaining task to achieve zero inbox
    const remaining = getItemByTitle(container, 'Archive deprecated endpoints')!;
    await user.click(remaining.querySelector('.destroy') as HTMLButtonElement);

    expect(container.querySelector('.main')).not.toBeInTheDocument();
    expect(container.querySelector('.footer')).not.toBeInTheDocument();
  });

  // =========================================================================
  // Workflow 3: Adversarial Multitasking & Context Switching Workflow
  // =========================================================================
  it('executes complex multitasking session with internationalized text and cancellations', async () => {
    const { container } = render(<App />);

    // Add internationalized and special tasks
    await createTodo('🚀 Launch Project Apollo');
    await createTodo('📝 Redact API <script> keys');
    await createTodo('🌐 Translate into 日本語');

    expect(getTodoListItems(container)).toHaveLength(3);

    // Start editing Apollo task, but cancel with Escape
    const apollo = getItemByTitle(container, '🚀 Launch Project Apollo')!;
    await user.dblClick(apollo.querySelector('label')!);
    const editInput = apollo.querySelector('.edit') as HTMLInputElement;
    await user.clear(editInput);
    await user.type(editInput, 'Aborted Change{escape}');

    expect(getItemByTitle(container, '🚀 Launch Project Apollo')).not.toBeNull();

    // Toggle Japanese task
    const japaneseTask = getItemByTitle(container, '🌐 Translate into 日本語')!;
    await user.click(japaneseTask.querySelector('.toggle') as HTMLInputElement);

    // Filter active and add a new active task while filtered
    await user.click(screen.getByRole('link', { name: 'Active' }));
    await createTodo('⚡ Urgent patch');

    expect(getTodoListItems(container)).toHaveLength(3); // Apollo, Redact, Urgent patch
    expect(container.querySelector('.todo-count')).toHaveTextContent('3 items left');

    // Filter completed
    await user.click(screen.getByRole('link', { name: 'Completed' }));
    expect(getTodoListItems(container)).toHaveLength(1);
    expect(getItemByTitle(container, '🌐 Translate into 日本語')).not.toBeNull();

    // Clear completed from completed view
    await user.click(screen.getByRole('button', { name: 'Clear completed' }));
    expect(getTodoListItems(container)).toHaveLength(0);

    // Switch back to All
    await user.click(screen.getByRole('link', { name: 'All' }));
    expect(getTodoListItems(container)).toHaveLength(3);
  });
});
