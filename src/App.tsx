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
      <div style={{ textAlign: 'center', paddingTop: '20px', marginBottom: '-10px' }}>
        <img
          src="/icon.jpg"
          alt="TodoMVC Antigravity Logo"
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            boxShadow: '0 6px 24px rgba(0, 240, 255, 0.4)',
            display: 'inline-block',
          }}
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
