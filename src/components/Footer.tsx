import { FilterType } from '../types/todo';

export interface FooterProps {
  activeCount: number;
  completedCount: number;
  filter: FilterType;
  onClearCompleted: () => void;
}

export function Footer({
  activeCount,
  completedCount,
  filter,
  onClearCompleted,
}: FooterProps) {
  const itemWord = activeCount === 1 ? 'item' : 'items';

  return (
    <footer className="footer">
      <span className="todo-count">
        <strong>{activeCount}</strong> {itemWord} left
      </span>
      <ul className="filters">
        <li>
          <a className={filter === 'all' ? 'selected' : ''} href="#/">
            All
          </a>
        </li>
        <li>
          <a className={filter === 'active' ? 'selected' : ''} href="#/active">
            Active
          </a>
        </li>
        <li>
          <a className={filter === 'completed' ? 'selected' : ''} href="#/completed">
            Completed
          </a>
        </li>
      </ul>
      {completedCount > 0 && (
        <button className="clear-completed" onClick={onClearCompleted}>
          Clear completed
        </button>
      )}
    </footer>
  );
}

export default Footer;
