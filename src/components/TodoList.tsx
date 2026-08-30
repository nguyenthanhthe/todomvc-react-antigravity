import { Todo } from '../types/todo';
import { TodoItem } from './TodoItem';

export interface TodoListProps {
  todos: Todo[];
  onToggle: (id: string) => void;
  onDestroy: (id: string) => void;
  onUpdate: (id: string, title: string) => void;
}

export function TodoList({ todos, onToggle, onDestroy, onUpdate }: TodoListProps) {
  return (
    <ul className="todo-list">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onDestroy={onDestroy}
          onUpdate={onUpdate}
        />
      ))}
    </ul>
  );
}

export default TodoList;
