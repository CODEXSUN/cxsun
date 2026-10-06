import { Circle, Eye, Lock, Tag } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@cxsun/ui/components/dropdown-menu";
import type { TodoLookup } from "./task-manager.types";

export type TodoOptionKind = "category" | "priority" | "status" | "visibility";
type Option = { label: string; value: string };
type Props = {
  kind: TodoOptionKind;
  lookups?: TodoLookup[];
  onChange: (value: string) => void;
  value: string;
};

const fallback: Record<Exclude<TodoOptionKind, "visibility">, Option[]> = {
  category: [
    { label: "Work", value: "work" },
    { label: "Personal", value: "personal" },
    { label: "Other", value: "other" }
  ],
  priority: [
    { label: "High", value: "high" },
    { label: "Low", value: "low" },
    { label: "Medium", value: "medium" },
    { label: "Urgent", value: "urgent" }
  ],
  status: [
    { label: "Backlog", value: "backlog" },
    { label: "Blocked", value: "blocked" },
    { label: "Cancelled", value: "cancelled" },
    { label: "Completed", value: "completed" },
    { label: "In progress", value: "in-progress" },
    { label: "In review", value: "review" },
    { label: "Open", value: "open" }
  ]
};

export function TodoOptionMenu({ kind, lookups = [], onChange, value }: Props) {
  const options = menuOptions(kind, lookups, value);
  const selected = options.find((item) => item.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="tm-composer-control tm-option-trigger"
          type="button"
          title={`${label(kind)}: ${selected?.label ?? value}`}
          aria-label={`${label(kind)}: ${selected?.label ?? value}`}
        >
          <OptionIcon kind={kind} value={value} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="tm-option-menu">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value || "empty"}
            className="tm-option-item"
            data-selected={option.value === value}
            onSelect={() => onChange(option.value)}
          >
            <OptionIcon kind={kind} value={option.value} />
            <span>{option.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function menuOptions(kind: TodoOptionKind, lookups: TodoLookup[], value: string): Option[] {
  if (kind === "visibility") {
    return [
      { label: "Private", value: "private" },
      { label: "Public", value: "public" }
    ];
  }
  const rows = lookups
    .filter((item) => item.kind === kind)
    .map((item) => ({ label: item.name, value: item.value }));
  const options = rows.length ? rows : fallback[kind];
  const withEmpty =
    kind === "category" ? [{ label: "No category", value: "" }, ...options] : options;
  return value && !withEmpty.some((option) => option.value === value)
    ? [...withEmpty, { label: label(value), value }]
    : withEmpty;
}

function OptionIcon({ kind, value }: { kind: TodoOptionKind; value: string }) {
  if (kind === "category") return <Tag size={16} aria-hidden="true" />;
  if (kind === "visibility") {
    return value === "public" ? (
      <Eye size={16} aria-hidden="true" />
    ) : (
      <Lock size={16} aria-hidden="true" />
    );
  }
  if (kind === "priority") {
    return <span className={`tm-todo-priority priority-${value}`} aria-hidden="true" />;
  }
  return <Circle className={`tm-option-status status-${value}`} size={14} aria-hidden="true" />;
}

function label(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
