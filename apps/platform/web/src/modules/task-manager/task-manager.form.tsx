import { useState } from "react";
import { CalendarDays, Save, Trash2, X } from "lucide-react";
import { Input } from "@cxsun/ui";
import { TodoOptionMenu } from "./task-manager.options";
import type { Todo, TodoInput, TodoLookup } from "./task-manager.types";

type Props = {
  lookups: TodoLookup[];
  onCancel: () => void;
  onDelete: () => void;
  onSave: (value: TodoInput) => void;
  saving: boolean;
  todo: Todo;
};

export function TodoInlineEditor({ lookups, onCancel, onDelete, onSave, saving, todo }: Props) {
  const [form, setForm] = useState<TodoInput>({
    title: todo.title,
    category: todo.category,
    status: todo.status,
    priority: todo.priority,
    dueDate: todo.dueDate,
    visibility: todo.visibility
  });
  const patch = (key: keyof TodoInput, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <form
      className="tm-inline-editor"
      onSubmit={(event) => {
        event.preventDefault();
        if (form.title.trim()) onSave({ ...form, title: form.title.trim() });
      }}
    >
      <div className="tm-inline-main">
        <Input
          autoFocus
          aria-label="Todo title"
          required
          value={form.title}
          onChange={(event) => patch("title", event.target.value)}
        />
        <TodoOptionMenu
          kind="priority"
          lookups={lookups}
          value={form.priority ?? "medium"}
          onChange={(value) => patch("priority", value)}
        />
        <TodoOptionMenu
          kind="category"
          lookups={lookups}
          value={form.category ?? ""}
          onChange={(value) => patch("category", value)}
        />
        <label className="tm-composer-control tm-composer-date" title="Due date">
          <CalendarDays size={17} />
          <input
            aria-label="Due date"
            type="date"
            value={form.dueDate ?? ""}
            onChange={(event) => patch("dueDate", event.target.value)}
          />
        </label>
        <TodoOptionMenu
          kind="status"
          lookups={lookups}
          value={form.status ?? "open"}
          onChange={(value) => patch("status", value)}
        />
        <TodoOptionMenu
          kind="visibility"
          value={form.visibility ?? "private"}
          onChange={(value) => patch("visibility", value)}
        />
      </div>
      <div className="tm-inline-actions">
        <button
          type="submit"
          title="Save todo"
          aria-label="Save todo"
          disabled={saving || !form.title.trim()}
        >
          <Save size={17} />
        </button>
        <button type="button" title="Cancel edit" aria-label="Cancel edit" onClick={onCancel}>
          <X size={17} />
        </button>
        <button type="button" title="Delete todo" aria-label="Delete todo" onClick={onDelete}>
          <Trash2 size={17} />
        </button>
      </div>
    </form>
  );
}
