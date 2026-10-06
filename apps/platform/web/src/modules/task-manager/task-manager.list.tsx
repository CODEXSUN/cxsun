import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Eye, GripVertical, Lock, Pencil, Trash2 } from "lucide-react";
import { TodoInlineEditor } from "./task-manager.form";
import type { Todo, TodoInput, TodoLookup } from "./task-manager.types";

type Props = {
  busy: boolean;
  editingId: string | null;
  lookups: TodoLookup[];
  onCancelEdit: () => void;
  onDelete: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onSaveEdit: (todo: Todo, input: TodoInput) => void;
  onReorder: (ids: string[]) => void;
  onToggle: (todo: Todo) => void;
  onVisibility: (todo: Todo) => void;
  saving: boolean;
  todos: Todo[];
};

export function TodoList(props: Props) {
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );
  return (
    <DndContext
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      sensors={sensors}
      onDragEnd={({ active, over }) => {
        if (!over || active.id === over.id) return;
        const oldIndex = props.todos.findIndex((todo) => todo.id === active.id);
        const newIndex = props.todos.findIndex((todo) => todo.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return;
        props.onReorder(arrayMove(props.todos, oldIndex, newIndex).map((todo) => todo.id));
      }}
    >
      <div className="tm-todo-list" role="list">
        <SortableContext
          items={props.todos.map((todo) => todo.id)}
          strategy={verticalListSortingStrategy}
        >
          {props.todos.map((todo) => (
            <TodoRow key={todo.id} {...props} todo={todo} />
          ))}
        </SortableContext>
        {!props.todos.length && <p className="tm-todo-empty">No matching todos.</p>}
      </div>
    </DndContext>
  );
}

function TodoRow({
  busy,
  editingId,
  lookups,
  onCancelEdit,
  onDelete,
  onEdit,
  onSaveEdit,
  onToggle,
  onVisibility,
  saving,
  todo
}: Props & { todo: Todo }) {
  const editing = editingId === todo.id;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
    disabled: editing
  });
  const done = todo.status === "completed" || todo.status === "done";
  const date = todoDate(todo.dueDate);
  return (
    <article
      className={`tm-todo-row${done ? " is-done" : ""}${isDragging ? " is-dragging" : ""}${editing ? " is-editing" : ""}`}
      ref={setNodeRef}
      role="listitem"
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        className="tm-todo-drag"
        type="button"
        disabled={editing}
        aria-label={`Reorder ${todo.title}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
      <button
        className="tm-todo-check"
        type="button"
        disabled={busy}
        aria-label={`${done ? "Reopen" : "Complete"} ${todo.title}`}
        onClick={() => onToggle(todo)}
      >
        {done && <Check size={15} />}
      </button>
      <span
        className={`tm-todo-priority priority-${priorityTone(todo.priority)}`}
        title={`${label(todo.priority)} priority`}
      />
      {editing ? (
        <TodoInlineEditor
          key={todo.id}
          todo={todo}
          lookups={lookups}
          saving={saving}
          onCancel={onCancelEdit}
          onDelete={() => onDelete(todo)}
          onSave={(input) => onSaveEdit(todo, input)}
        />
      ) : (
        <div className="tm-todo-content">
          <button className="tm-todo-title" type="button" onClick={() => onEdit(todo)}>
            {todo.title}
          </button>
          <div className="tm-todo-metadata">
            {todo.category && <span>{lookupName(lookups, "category", todo.category)} ·</span>}
            {date && (
              <time dateTime={todo.dueDate}>
                {date.formatted} <em>({date.relative})</em>
              </time>
            )}
            <span className={`tm-todo-status status-${statusTone(todo.status)}`}>
              {lookupName(lookups, "status", todo.status)}
            </span>
          </div>
        </div>
      )}
      {!editing && (
        <div className="tm-todo-actions">
          <button
            type="button"
            disabled={busy}
            title={todo.visibility === "public" ? "Make private" : "Make public"}
            aria-label={`${todo.visibility === "public" ? "Make private" : "Make public"} ${todo.title}`}
            onClick={() => onVisibility(todo)}
          >
            {todo.visibility === "public" ? <Eye size={17} /> : <Lock size={17} />}
          </button>
          <button
            type="button"
            title="Edit"
            aria-label={`Edit ${todo.title}`}
            onClick={() => onEdit(todo)}
          >
            <Pencil size={17} />
          </button>
          <button
            type="button"
            title="Delete"
            aria-label={`Delete ${todo.title}`}
            onClick={() => onDelete(todo)}
          >
            <Trash2 size={17} />
          </button>
        </div>
      )}
    </article>
  );
}

function lookupName(lookups: TodoLookup[], kind: TodoLookup["kind"], value: string) {
  return lookups.find((item) => item.kind === kind && item.value === value)?.name ?? label(value);
}

function label(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function priorityTone(value: string) {
  return ["low", "medium", "high", "urgent"].includes(value) ? value : "other";
}

function statusTone(value: string) {
  if (["completed", "done"].includes(value)) return "completed";
  if (["blocked", "cancelled"].includes(value)) return "blocked";
  if (["in-progress", "review"].includes(value)) return "in-progress";
  return value === "open" ? "open" : "other";
}

function todoDate(value: string, today = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const due = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    due.getFullYear() !== Number(match[1]) ||
    due.getMonth() !== Number(match[2]) - 1 ||
    due.getDate() !== Number(match[3])
  )
    return null;
  const days = Math.round(
    (new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime() -
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
      86_400_000
  );
  return {
    formatted: `${String(due.getDate()).padStart(2, "0")}-${String(due.getMonth() + 1).padStart(2, "0")}-${due.getFullYear()}`,
    relative: days === 0 ? "today" : days > 0 ? `in ${days}d` : `${Math.abs(days)}d ago`
  };
}
