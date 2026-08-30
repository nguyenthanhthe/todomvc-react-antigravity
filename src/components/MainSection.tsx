import { Todo } from '../types/todo';
import { TodoList } from './TodoList';

export interface MainSectionProps {
  todos: Todo[];
  filteredTodos: Todo[];
  areAllCompleted: boolean;
  onToggleAll: (completed?: boolean) => void;
  onToggle: (id: string) => void;
  onDestroy: (id: string) => void;
  onUpdate: (id: string, title: string) => void;
}

export function MainSection({
  filteredTodos,
  areAllCompleted,
  onToggleAll,
  onToggle,
  onDestroy,
  onUpdate,
}: MainSectionProps) {
  return (
    <section className="main">
      <input
        id="toggle-all"
        className="toggle-all"
        type="checkbox"
        checked={areAllCompleted}
        onChange={(e) => onToggleAll(e.target.checked)}
      />
      <label htmlFor="toggle-all">Mark all as complete</label>
      <TodoList
        todos={filteredTodos}
        onToggle={onToggle}
        onDestroy={onDestroy}
        onUpdate={onUpdate}
      />
    </section>
  );
}

export default MainSection;
