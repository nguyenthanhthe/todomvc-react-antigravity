import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';

describe('Tier 2: Boundary & Corner Cases Suite', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    localStorage.clear();
    window.location.hash = '';
  });

  async function createTodo(text: string) {
    const input = screen.getByPlaceholderText('What needs to be done?') as HTMLInputElement;
    if (text.includes('{') || text.includes('[') || text.length > 50 || text.includes('\u00A0')) {
      await user.click(input);
      await user.paste(text);
      await user.keyboard('{enter}');
    } else {
      await user.type(input, `${text}{enter}`);
    }
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
  // 1. Whitespace & Character Trimming Boundaries
  // =========================================================================
  describe('1. Whitespace Trimming & Control Character Boundaries', () => {
    it('preserves internal consecutive spaces while trimming outer whitespace', async () => {
      const { container } = render(<App />);
      await createTodo('   Task   with   internal   spaces   ');

      const item = getItemByTitle(container, 'Task   with   internal   spaces');
      expect(item).not.toBeNull();
      expect(item?.querySelector('label')?.textContent).toBe('Task   with   internal   spaces');
    });

    it('rejects input composed entirely of tabs and newline characters', async () => {
      const { container } = render(<App />);
      const input = screen.getByPlaceholderText('What needs to be done?');
      await user.type(input, '\t\t\t{enter}');

      expect(container.querySelector('.main')).not.toBeInTheDocument();
      expect(getTodoListItems(container)).toHaveLength(0);
    });

    it('handles non-breaking spaces correctly on creation', async () => {
      const { container } = render(<App />);
      await createTodo('Regular\u00A0Space');

      expect(getTodoListItems(container)).toHaveLength(1);
      expect(getTodoListItems(container)[0].textContent).toContain('Regular\u00A0Space');
    });
  });

  // =========================================================================
  // 2. Escape Cancellation vs. Blur Interaction
  // =========================================================================
  describe('2. Inline Edit Escape Cancellation vs. Blur Interaction', () => {
    it('cancels edit on Escape and ensures subsequent blur does NOT save discarded text', async () => {
      const { container } = render(<App />);
      await createTodo('Original Safe Title');

      const item = getItemByTitle(container, 'Original Safe Title')!;
      await user.dblClick(item.querySelector('label')!);

      const editInput = item.querySelector('.edit') as HTMLInputElement;
      await user.clear(editInput);
      await user.type(editInput, 'Changed Malicious Title{escape}');

      // Simulate subsequent blur by clicking elsewhere
      await user.click(screen.getByRole('heading', { level: 1 }));

      expect(item).not.toHaveClass('editing');
      expect(item.querySelector('label')?.textContent).toBe('Original Safe Title');

      const stored = JSON.parse(localStorage.getItem('todos-react')!);
      expect(stored[0].title).toBe('Original Safe Title');
    });

    it('exits edit mode cleanly with unchanged title when blurring without modifying', async () => {
      const { container } = render(<App />);
      await createTodo('Untouched Title');

      const item = getItemByTitle(container, 'Untouched Title')!;
      await user.dblClick(item.querySelector('label')!);

      // Blur without typing anything new
      await user.click(screen.getByRole('heading', { level: 1 }));

      expect(item).not.toHaveClass('editing');
      expect(item.querySelector('label')?.textContent).toBe('Untouched Title');
    });

    it('trims leading and trailing whitespace when committing edit via blur', async () => {
      const { container } = render(<App />);
      await createTodo('Initial');

      const item = getItemByTitle(container, 'Initial')!;
      await user.dblClick(item.querySelector('label')!);

      const editInput = item.querySelector('.edit') as HTMLInputElement;
      await user.clear(editInput);
      await user.type(editInput, '   Trimmed on Blur   ');
      await user.click(screen.getByRole('heading', { level: 1 }));

      expect(item).not.toHaveClass('editing');
      expect(item.querySelector('label')?.textContent).toBe('Trimmed on Blur');
    });
  });

  // =========================================================================
  // 3. Rapid Interactions & Concurrency
  // =========================================================================
  describe('3. Rapid User Interactions', () => {
    it('handles rapid sequential creation of 5 items without race conditions', async () => {
      const { container } = render(<App />);
      for (let i = 1; i <= 5; i++) {
        await createTodo(`Rapid Task ${i}`);
      }

      const items = getTodoListItems(container);
      expect(items).toHaveLength(5);
      expect(items[0]).toHaveTextContent('Rapid Task 1');
      expect(items[4]).toHaveTextContent('Rapid Task 5');
    });

    it('handles rapid toggling of an item checkbox back and forth', async () => {
      const { container } = render(<App />);
      await createTodo('Flapping Task');

      const item = getItemByTitle(container, 'Flapping Task')!;
      const toggle = item.querySelector('.toggle') as HTMLInputElement;

      await user.click(toggle); // completed
      await user.click(toggle); // active
      await user.click(toggle); // completed
      await user.click(toggle); // active

      expect(item).not.toHaveClass('completed');
      expect(toggle.checked).toBe(false);
      expect(container.querySelector('.todo-count')).toHaveTextContent('1 item left');
    });

    it('handles rapid toggle-all clicks cleanly', async () => {
      const { container } = render(<App />);
      await createTodo('Task 1');
      await createTodo('Task 2');

      const toggleAll = screen.getByLabelText('Mark all as complete');
      await user.click(toggleAll); // all completed
      await user.click(toggleAll); // all active
      await user.click(toggleAll); // all completed

      const items = getTodoListItems(container);
      expect(items[0]).toHaveClass('completed');
      expect(items[1]).toHaveClass('completed');
      expect(container.querySelector('.todo-count')).toHaveTextContent('0 items left');
    });
  });

  // =========================================================================
  // 4. Special Characters, XSS & Internationalization
  // =========================================================================
  describe('4. Special Characters, XSS & Unicode Handling', () => {
    it('safely renders HTML and script tags as literal text without execution', async () => {
      const { container } = render(<App />);
      const xssPayload = '<script>alert("XSS")</script><img src="x" onerror="alert(1)"/>';
      await createTodo(xssPayload);

      const item = getItemByTitle(container, xssPayload);
      expect(item).not.toBeNull();
      expect(item?.querySelector('label')?.textContent).toBe(xssPayload);
      // Ensure no script elements were injected into the DOM
      expect(container.querySelectorAll('script')).toHaveLength(0);
    });

    it('renders emojis, multibyte characters, and RTL text correctly', async () => {
      const { container } = render(<App />);
      const emojiText = '🚀 Ship production 📦 ✨';
      const unicodeText = '日本語テスト & العربية & Über café';

      await createTodo(emojiText);
      await createTodo(unicodeText);

      expect(getItemByTitle(container, emojiText)).not.toBeNull();
      expect(getItemByTitle(container, unicodeText)).not.toBeNull();
    });

    it('handles quote marks, backslashes, and JSON delimiters in titles', async () => {
      const { container } = render(<App />);
      const jsonDelimiters = '{"title": "test", "valid": true, "escapes": "\\n\\t"}';
      await createTodo(jsonDelimiters);

      expect(getItemByTitle(container, jsonDelimiters)).not.toBeNull();
      const stored = JSON.parse(localStorage.getItem('todos-react')!);
      expect(stored[0].title).toBe(jsonDelimiters);
    });
  });

  // =========================================================================
  // 5. Length Boundaries (Single Character & Extreme Lengths)
  // =========================================================================
  describe('5. Length Boundaries', () => {
    it('accepts and renders a single-character title', async () => {
      const { container } = render(<App />);
      await createTodo('X');

      expect(getItemByTitle(container, 'X')).not.toBeNull();
      expect(container.querySelector('.todo-count')).toHaveTextContent('1 item left');
    });

    it('accepts and renders a 500-character unbroken string', async () => {
      const { container } = render(<App />);
      const longTitle = 'A'.repeat(500);
      await createTodo(longTitle);

      const item = getItemByTitle(container, longTitle);
      expect(item).not.toBeNull();
      expect(item?.querySelector('label')?.textContent?.length).toBe(500);
    });
  });

  // =========================================================================
  // 6. Corrupt LocalStorage & Storage Anomaly Recovery
  // =========================================================================
  describe('6. LocalStorage Resilience & Corrupt State Recovery', () => {
    it('recovers gracefully with empty array when localStorage contains invalid JSON', () => {
      localStorage.setItem('todos-react', '{{{{corrupt invalid JSON!!!');

      const { container } = render(<App />);
      expect(container.querySelector('.main')).not.toBeInTheDocument();
      expect(container.querySelector('.footer')).not.toBeInTheDocument();
    });

    it('recovers gracefully when localStorage contains non-array JSON (object or number)', () => {
      localStorage.setItem('todos-react', JSON.stringify({ notAnArray: true }));

      const { container } = render(<App />);
      expect(container.querySelector('.main')).not.toBeInTheDocument();
      expect(container.querySelector('.footer')).not.toBeInTheDocument();
    });

    it('filters out malformed todo objects lacking required fields', () => {
      const corruptData = [
        { id: '1', title: 'Valid Todo', completed: false },
        { id: '2' }, // missing title & completed
        null,
        'string instead of object',
      ];
      localStorage.setItem('todos-react', JSON.stringify(corruptData));

      const { container } = render(<App />);
      // Should at least display the valid todo without crashing
      expect(getItemByTitle(container, 'Valid Todo')).not.toBeNull();
    });
  });

  // =========================================================================
  // 7. Unknown & Malformed Route Fallback
  // =========================================================================
  describe('7. Unknown & Malformed Hash Routes', () => {
    it('defaults to All filter view when encountering an unknown hash route like #/unknown', async () => {
      window.location.hash = '#/unknown';
      const { container } = render(<App />);
      await createTodo('Task 1');
      await createTodo('Task 2');

      const item2 = getItemByTitle(container, 'Task 2')!;
      await user.click(item2.querySelector('.toggle') as HTMLInputElement);

      // Unknown route falls back to 'all' filter
      expect(getTodoListItems(container)).toHaveLength(2);
      expect(screen.getByRole('link', { name: 'All' })).toHaveClass('selected');
    });

    it('defaults to All filter view when hash is non-standard or missing slash like #foo', async () => {
      window.location.hash = '#foo';
      const { container } = render(<App />);
      await createTodo('Task 1');

      expect(getTodoListItems(container)).toHaveLength(1);
      expect(screen.getByRole('link', { name: 'All' })).toHaveClass('selected');
    });
  });

  // =========================================================================
  // 8. Single Item State Transitions
  // =========================================================================
  describe('8. Single Item Lifecycle Boundaries', () => {
    it('correctly coordinates toggle-all and clear-completed with exactly 1 item', async () => {
      const { container } = render(<App />);
      await createTodo('Solo Task');

      const toggleAll = screen.getByLabelText('Mark all as complete') as HTMLInputElement;
      expect(toggleAll.checked).toBe(false);
      expect(screen.queryByRole('button', { name: 'Clear completed' })).not.toBeInTheDocument();
      expect(container.querySelector('.todo-count')).toHaveTextContent('1 item left');

      const item = getItemByTitle(container, 'Solo Task')!;
      await user.click(item.querySelector('.toggle') as HTMLInputElement);

      expect(toggleAll.checked).toBe(true);
      expect(screen.getByRole('button', { name: 'Clear completed' })).toBeInTheDocument();
      expect(container.querySelector('.todo-count')).toHaveTextContent('0 items left');

      await user.click(screen.getByRole('button', { name: 'Clear completed' }));
      expect(container.querySelector('.main')).not.toBeInTheDocument();
      expect(container.querySelector('.footer')).not.toBeInTheDocument();
    });
  });
});
