import { useState, useCallback, type KeyboardEvent } from 'react';

export interface HeaderProps {
  onAddTodo: (title: string) => void;
}

export function Header({ onAddTodo }: HeaderProps) {
  const [text, setText] = useState('');

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        const trimmed = text.trim();
        if (trimmed) {
          onAddTodo(trimmed);
          setText('');
        }
      }
    },
    [text, onAddTodo]
  );

  return (
    <header className="header">
      <div style={{ textAlign: 'center', paddingTop: '15px', marginBottom: '-10px' }}>
        <img
          src="/icon.jpg"
          alt="TodoMVC Antigravity Logo"
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0, 240, 255, 0.35)',
            display: 'inline-block',
          }}
        />
      </div>
      <h1>todos</h1>
      <input
        className="new-todo"
        placeholder="What needs to be done?"
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </header>
  );
}

export default Header;
