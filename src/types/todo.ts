export interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

export type FilterType = 'all' | 'active' | 'completed';

export interface TodosState {
  todos: Todo[];
}

export type TodoAction =
  | { type: 'ADD'; title: string }
  | { type: 'TOGGLE'; id: string }
  | { type: 'TOGGLE_ALL'; completed: boolean }
  | { type: 'UPDATE'; id: string; title: string }
  | { type: 'DELETE'; id: string }
  | { type: 'CLEAR_COMPLETED' }
  | { type: 'SET_TODOS'; todos: Todo[] };

export interface UseTodosReturn {
  todos: Todo[];
  filteredTodos: Todo[];
  filter: FilterType;
  setFilter: (filter: FilterType) => void;
  addTodo: (title: string) => void;
  toggleTodo: (id: string) => void;
  toggleAll: (completed?: boolean) => void;
  updateTodo: (id: string, title: string) => void;
  deleteTodo: (id: string) => void;
  clearCompleted: () => void;
  activeCount: number;
  completedCount: number;
  allCompleted: boolean;
  areAllCompleted?: boolean;
  hasTodos: boolean;
}
