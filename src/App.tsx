import appLogo from './assets/icon.jpg';
import { useTodos } from './hooks/useTodos';
import {
  Header,
  MainSection,
  Footer,
  InfoFooter,
} from './components';

export function App() {
  const {
    todos,
    filteredTodos,
    filter,
    addTodo,
    toggleTodo,
    toggleAll,
    updateTodo,
    deleteTodo,
    clearCompleted,
    activeCount,
    completedCount,
    allCompleted,
  } = useTodos();

  const hasTodos = todos.length > 0;

  return (
    <>
      <div className="app-brand">
        <img
          src={appLogo}
          alt="TodoMVC Antigravity Logo"
          className="app-logo"
        />
      </div>
      <section className="todoapp">
        <Header onAddTodo={addTodo} />
        {hasTodos && (
          <MainSection
            todos={todos}
            filteredTodos={filteredTodos}
            areAllCompleted={allCompleted}
            onToggleAll={toggleAll}
            onToggle={toggleTodo}
            onDestroy={deleteTodo}
            onUpdate={updateTodo}
          />
        )}
        {hasTodos && (
          <Footer
            activeCount={activeCount}
            completedCount={completedCount}
            filter={filter}
            onClearCompleted={clearCompleted}
          />
        )}
      </section>
      <InfoFooter />
    </>
  );
}

export default App;
