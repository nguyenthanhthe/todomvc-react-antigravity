import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { Todo } from '../types/todo';

export interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDestroy: (id: string) => void;
  onUpdate: (id: string, title: string) => void;
}

export function TodoItem({ todo, onToggle, onDestroy, onUpdate }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.title);
  const isEscapeRef = useRef(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setEditText(todo.title);
    }
  }, [todo.title, isEditing]);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      const length = editInputRef.current.value.length;
      editInputRef.current.setSelectionRange(length, length);
    }
  }, [isEditing]);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditText(todo.title);
    isEscapeRef.current = false;
  }, [todo.title]);

  const commitEdit = useCallback(() => {
    if (!isEditing || isEscapeRef.current) {
      return;
    }
    setIsEditing(false);
    const trimmed = editText.trim();
    if (!trimmed) {
      onDestroy(todo.id);
    } else {
      onUpdate(todo.id, trimmed);
    }
  }, [isEditing, editText, onDestroy, onUpdate, todo.id]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        commitEdit();
      } else if (e.key === 'Escape') {
        isEscapeRef.current = true;
        setEditText(todo.title);
        setIsEditing(false);
      }
    },
    [commitEdit, todo.title]
  );

  const handleBlur = useCallback(() => {
    if (isEscapeRef.current) {
      isEscapeRef.current = false;
      return;
    }
    if (isEditing) {
      commitEdit();
    }
  }, [isEditing, commitEdit]);

  const classNames = [
    todo.completed ? 'completed' : '',
    isEditing ? 'editing' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li className={classNames || undefined}>
      <div className="view">
        <input
          className="toggle"
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo.id)}
        />
        <label onDoubleClick={handleDoubleClick}>{todo.title}</label>
        <button
          className="destroy"
          onClick={() => onDestroy(todo.id)}
          aria-label="Delete todo"
        />
      </div>
      <input
        ref={editInputRef}
        className="edit"
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    </li>
  );
}

export default TodoItem;
