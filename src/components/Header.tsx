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
