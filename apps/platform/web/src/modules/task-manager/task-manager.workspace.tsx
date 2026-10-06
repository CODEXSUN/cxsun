import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Eye, ListTodo, Lock, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@cxsun/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@cxsun/ui/components/alert-dialog";
import { TodoList } from "./task-manager.list";
import { TodoOptionMenu } from "./task-manager.options";
import {
  createTodo,
  deleteTodo,
  listTodoLookups,
  listTodos,
  reorderTodos,
  setTodoStatus,
  updateTodo,
  type TaskManagerDesk
} from "./task-manager.services";
import type { Todo, TodoInput } from "./task-manager.types";
import "./task-manager.css";

type Visibility = "all" | "private" | "public";
const initialTodo: TodoInput = {
  title: "",
  category: "work",
  dueDate: "",
  priority: "medium",
  status: "open",
  visibility: "private"
};

export function TaskManagerWorkspace({ desk = "sa" }: { desk?: TaskManagerDesk }) {
  const client = useQueryClient();
  const todoKey = ["task-manager", desk, "todos"] as const;
  const lookupKey = ["task-manager", desk, "lookups"] as const;
  const query = useQuery({
    queryKey: todoKey,
    queryFn: () => listTodos(desk),
    refetchInterval: 30_000
  });
  const lookups = useQuery({ queryKey: lookupKey, queryFn: () => listTodoLookups(desk) });
  const [draft, setDraft] = useState<TodoInput>(initialTodo);
  const [visibilityFilter, setVisibilityFilter] = useState<Visibility>("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Todo | null>(null);
  const refresh = () => client.invalidateQueries({ queryKey: todoKey });
  const allTodos = query.data ?? [];
  const visibleTodos = useMemo(
    () =>
      allTodos.filter(
        (todo) =>
          (visibilityFilter === "all" || todo.visibility === visibilityFilter) &&
          `${todo.title} ${todo.category} ${todo.status}`
            .toLowerCase()
            .includes(search.toLowerCase().trim())
      ),
    [allTodos, search, visibilityFilter]
  );
  const openCount = allTodos.filter((todo) => !["completed", "done"].includes(todo.status)).length;

  const create = useMutation({
    mutationFn: () => createTodo(desk, { ...draft, title: draft.title.trim() }),
    onSuccess: async () => {
      setDraft(initialTodo);
      await refresh();
      toast.success("Todo added");
    },
    onError: showError
  });
  const save = useMutation({
    mutationFn: ({ id, input }: { id: string; input: TodoInput }) => updateTodo(desk, id, input),
    onSuccess: async () => {
      setEditingId(null);
      await refresh();
      toast.success("Todo updated");
    },
    onError: showError
  });
  const status = useMutation({
    mutationFn: (todo: Todo) =>
      setTodoStatus(
        desk,
        todo.id,
        ["completed", "done"].includes(todo.status) ? "open" : "completed"
      ),
    onSuccess: refresh,
    onError: showError
  });
  const visibility = useMutation({
    mutationFn: (todo: Todo) =>
      updateTodo(desk, todo.id, {
        visibility: todo.visibility === "public" ? "private" : "public"
      }),
    onSuccess: refresh,
    onError: showError
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteTodo(desk, id),
    onSuccess: async () => {
      setDeleting(null);
      await refresh();
      toast.success("Todo deleted");
    },
    onError: showError
  });
  const reorder = useMutation({
    mutationFn: (visibleIds: string[]) =>
      reorderTodos(desk, mergeVisibleOrder(allTodos, visibleIds)),
    onSuccess: refresh,
    onError: showError
  });
  const patch = (key: keyof TodoInput, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));

  return (
    <section className={`tm-todos${desk === "tenant" ? " tm-todos--tenant" : ""}`}>
      <header className="tm-todos-header">
        <div>
          <h1>Todos</h1>
          <p>Private by default. Publish only the items you choose.</p>
        </div>
        <div className="tm-todos-header-tools">
          <span>{openCount} open</span>
          <div className="tm-visibility-filter" aria-label="Filter todos by visibility">
            {(["all", "private", "public"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={visibilityFilter === value}
                onClick={() => setVisibilityFilter(value)}
              >
                {value === "all" ? (
                  <ListTodo size={14} />
                ) : value === "private" ? (
                  <Lock size={14} />
                ) : (
                  <Eye size={14} />
                )}
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>
      <form
        className="tm-todo-composer"
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.title.trim()) create.mutate();
        }}
      >
        <Input
          autoFocus
          aria-label="New todo"
          placeholder="Add a todo"
          value={draft.title}
          onChange={(event) => patch("title", event.target.value)}
        />
        <TodoOptionMenu
          kind="priority"
          lookups={lookups.data ?? []}
          value={draft.priority ?? "medium"}
          onChange={(value) => patch("priority", value)}
        />
        <TodoOptionMenu
          kind="category"
          lookups={lookups.data ?? []}
          value={draft.category ?? ""}
          onChange={(value) => patch("category", value)}
        />
        <label className="tm-composer-control tm-composer-date" title="Due date">
          <CalendarDays size={17} />
          <input
            aria-label="Due date"
            type="date"
            value={draft.dueDate}
            onChange={(event) => patch("dueDate", event.target.value)}
          />
        </label>
        <TodoOptionMenu
          kind="visibility"
          value={draft.visibility ?? "private"}
          onChange={(value) => patch("visibility", value)}
        />
        <button
          className="tm-add-button"
          type="submit"
          disabled={!draft.title.trim() || create.isPending}
          aria-label="Add todo"
        >
          <Plus size={19} />
        </button>
      </form>
      <label className="tm-search">
        <Search size={15} />
        <input
          aria-label="Search todos"
          placeholder="Search todos"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      {query.isLoading && <p className="tm-todo-empty">Loading todos…</p>}
      {query.isError && (
        <p className="tm-todo-error" role="alert">
          Todos could not be loaded.{" "}
          <button type="button" onClick={() => void query.refetch()}>
            Retry
          </button>
        </p>
      )}
      {!query.isLoading && !query.isError && (
        <TodoList
          busy={status.isPending || visibility.isPending || remove.isPending || reorder.isPending}
          editingId={editingId}
          lookups={lookups.data ?? []}
          saving={save.isPending}
          todos={visibleTodos}
          onDelete={setDeleting}
          onEdit={(todo) => setEditingId(todo.id)}
          onCancelEdit={() => setEditingId(null)}
          onSaveEdit={(todo, input) => save.mutate({ id: todo.id, input })}
          onToggle={(todo) => status.mutate(todo)}
          onVisibility={(todo) => visibility.mutate(todo)}
          onReorder={(ids) => reorder.mutate(ids)}
        />
      )}
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Todo?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleting?.title}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={() => {
                if (deleting) remove.mutate(deleting.id);
              }}
            >
              Delete Todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function mergeVisibleOrder(all: Todo[], visibleIds: string[]) {
  const visible = new Set(visibleIds);
  let index = 0;
  return all.map((todo) => (visible.has(todo.id) ? visibleIds[index++]! : todo.id));
}

function showError(error: unknown) {
  toast.error("Todo action failed", {
    description: error instanceof Error ? error.message : "Please try again."
  });
}
