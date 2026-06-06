import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { ArrowLeft, Bold, Check, CheckCircle2, ChevronDown, ClipboardCheck, History, Italic, Link2, List, ListChecks, ListOrdered, Plus, RefreshCw, RotateCcw, RotateCw, Save, Tags, Trash2, UserRound } from "lucide-react"
import { toast } from "sonner"
import { AnimatedTabs } from "src/components/ui/animated-tabs"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "src/components/ui/dialog"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "src/components/ui/select"
import { Switch } from "src/components/ui/switch"
import { Textarea } from "src/components/ui/textarea"
import {
  MasterListEmptyState,
  MasterListPageFrame,
  MasterListPaginationCard,
  MasterListTableCard,
  MasterListToolbarCard,
  buildMasterListShowingLabel,
} from "src/components/blocks/lists/master-list"
import type { AuthSession } from "src/features/auth/auth-client"
import type { MasterDataRecord, MasterDataUpsertInput } from "src/features/master-data/domain/master-data"
import { listMasterDataRecords, upsertMasterDataRecord } from "src/features/master-data/infrastructure/master-data-client"
import { listTenantUsers, type TenantUserRecord } from "src/features/user-manager/user-manager-client"
import { cn } from "src/lib/utils"
import { PriorityAutocomplete, PriorityBadge } from "./priority-autocomplete"
import {
  changeTaskManagerStatus,
  deleteTaskManagerTask,
  emptyTaskManagerTask,
  listTaskManagerTasks,
  upsertTaskManagerTask,
  type TaskManagerStatus,
  type TaskManagerTask,
  type TaskManagerTaskInput,
} from "./task-manager-client"

type TaskManagerView = { mode: "list" } | { mode: "upsert"; task: TaskManagerTask | null } | { mode: "show"; task: TaskManagerTask }

const statusOptions: Array<{ label: string; value: TaskManagerStatus }> = [
  { label: "New", value: "new" },
  { label: "Todo", value: "todo" },
  { label: "In progress", value: "in_progress" },
  { label: "Review", value: "review" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
]
const moduleOptions = ["sales", "purchase", "receipt", "payment", "stock-ledger", "purchase-receipt", "delivery-note", "contact", "company", "product", "auditor", "general"]

export function TaskManagerPage({ session }: { session: AuthSession }) {
  const [view, setView] = useState<TaskManagerView>({ mode: "list" })
  const [searchValue, setSearchValue] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(100)
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false)
  const query = useQuery({ queryKey: ["task-manager", session.selectedTenant.slug], queryFn: () => listTaskManagerTasks(session) })
  const tenantUsersQuery = useQuery({ queryKey: ["task-manager-users", session.selectedTenant.id, session.selectedTenant.slug], queryFn: () => listTenantUsers(session, session.selectedTenant.id) })
  const prioritiesQuery = useQuery({ queryKey: ["task-manager-priorities", session.selectedTenant.slug], queryFn: () => listMasterDataRecords(session, "priorities") })
  const upsertMutation = useMutation({ mutationFn: (input: TaskManagerTaskInput) => upsertTaskManagerTask(session, input) })
  const priorityMutation = useMutation({ mutationFn: (input: MasterDataUpsertInput) => upsertMasterDataRecord(session, "priorities", input) })
  const statusMutation = useMutation({ mutationFn: ({ task, status }: { task: TaskManagerTask; status: TaskManagerStatus }) => changeTaskManagerStatus(session, task, status) })
  const deleteMutation = useMutation({ mutationFn: (task: TaskManagerTask) => deleteTaskManagerTask(session, task) })
  const tasks = query.data ?? []
  const filteredTasks = useMemo(() => {
    const term = searchValue.trim().toLowerCase()
    return tasks.filter((task) => {
      const matchesStatus = statusFilter === "all" || task.status === statusFilter
      const priority = findPriority(prioritiesQuery.data ?? [], task.priority)
      const matchesSearch = !term || [task.task_no, task.title, task.subject, task.description, task.assigned_to, task.assigned_to_name, task.module_key, task.linked_record_label, task.status, task.priority, priority?.name].some((value) => String(value ?? "").toLowerCase().includes(term))
      return matchesStatus && matchesSearch
    })
  }, [prioritiesQuery.data, searchValue, statusFilter, tasks])
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / rowsPerPage))
  const pageTasks = filteredTasks.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  async function refresh() {
    await Promise.all([query.refetch(), prioritiesQuery.refetch()])
  }

  async function createPriority(input: MasterDataUpsertInput) {
    const priority = await priorityMutation.mutateAsync(input)
    toast.success("Priority created", { description: String(priority.name ?? priority.tag ?? "") })
    await prioritiesQuery.refetch()
    return priority
  }

  async function save(input: TaskManagerTaskInput) {
    const task = await upsertMutation.mutateAsync(input)
    toast.success(input.uuid ? "Task updated" : "Task created", { description: task.task_no })
    await refresh()
    setView({ mode: "show", task })
  }

  async function changeStatus(task: TaskManagerTask, status: TaskManagerStatus) {
    const updated = await statusMutation.mutateAsync({ task, status })
    toast.success("Task status updated", { description: updated.status })
    await refresh()
    setView({ mode: "show", task: updated })
  }

  async function destroy(task: TaskManagerTask) {
    await deleteMutation.mutateAsync(task)
    toast.error("Task suspended", { description: task.task_no })
    await refresh()
    setView({ mode: "list" })
  }

  if (view.mode === "upsert") {
    return <TaskUpsertPage isCreatingPriority={priorityMutation.isPending} isSaving={upsertMutation.isPending} priorities={prioritiesQuery.data ?? []} task={view.task} onBack={() => setView(view.task ? { mode: "show", task: view.task } : { mode: "list" })} onCreatePriority={createPriority} onSubmit={save} />
  }

  if (view.mode === "show") {
    const task = tasks.find((item) => item.uuid === view.task.uuid) ?? view.task
    return <TaskShowPage isWorking={statusMutation.isPending || deleteMutation.isPending} priorities={prioritiesQuery.data ?? []} task={task} onBack={() => setView({ mode: "list" })} onDelete={() => void destroy(task)} onEdit={() => setView({ mode: "upsert", task })} onStatus={(status) => void changeStatus(task, status)} />
  }

  return (
    <MasterListPageFrame
      title="Task Manager"
      description="Assign work, verify invoices, follow auditor actions, and track staff performance."
      technicalName="page.task-manager.list"
      action={
        <div className="flex items-center gap-2">
          <Button disabled={query.isFetching} onClick={() => void refresh()} type="button" variant="outline" className="h-9 rounded-md"><RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />Refresh</Button>
          <Button onClick={() => setIsNewDialogOpen(true)} type="button" className="h-9 rounded-md"><Plus className="size-4" />New task</Button>
        </div>
      }
    >
      <NewTaskDialog
        isCreatingPriority={priorityMutation.isPending}
        isSaving={upsertMutation.isPending}
        open={isNewDialogOpen}
        priorities={prioritiesQuery.data ?? []}
        tenantUsers={tenantUsersQuery.data ?? []}
        onCreatePriority={createPriority}
        onOpenChange={setIsNewDialogOpen}
        onSubmit={async (input) => {
          await save(input)
          setIsNewDialogOpen(false)
        }}
      />
      <MasterListToolbarCard
        filterOptions={[{ id: "all", label: "All tasks" }, ...statusOptions.map((option) => ({ id: option.value, label: option.label }))]}
        filterValue={statusFilter}
        onFilterValueChange={(value) => {
          setStatusFilter(value)
          setCurrentPage(1)
        }}
        searchPlaceholder="Search task, staff, module, invoice, or auditor work"
        searchValue={searchValue}
        onSearchValueChange={(value) => {
          setSearchValue(value)
          setCurrentPage(1)
        }}
      />
      <MasterListTableCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-muted/50">
              <tr><Header>Task</Header><Header>Module</Header><Header>Assigned</Header><Header>Status</Header><Header>Priority</Header><Header>Due</Header><Header className="text-right">Score</Header></tr>
            </thead>
            <tbody>
              {pageTasks.map((task) => (
                <tr key={task.uuid} className="border-t border-border/70">
                  <td className="px-3 py-2">
                    <button type="button" className="font-semibold hover:underline" onClick={() => setView({ mode: "show", task })}>{task.title}</button>
                    <div className="text-xs text-muted-foreground">{[task.task_no, richTextToPlainText(task.subject)].filter(Boolean).join(" - ")}</div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground"><div>{task.module_key ?? "general"}</div><div className="text-xs">{task.linked_record_label ?? task.linked_record_id ?? "-"}</div></td>
                  <td className="px-3 py-2">{task.assigned_to_name || task.assigned_to || "Unassigned"}</td>
                  <td className="px-3 py-2"><TaskStatusBadge status={task.status} /></td>
                  <td className="px-3 py-2"><PriorityBadge priorities={prioritiesQuery.data ?? []} value={task.priority} /></td>
                  <td className="px-3 py-2">{formatDate(task.due_date)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{task.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageTasks.length === 0 ? <MasterListEmptyState>{query.isFetching ? "Loading tasks." : "No tasks found."}</MasterListEmptyState> : null}
      </MasterListTableCard>
      <MasterListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildMasterListShowingLabel({ page: currentPage, pageSize: rowsPerPage, totalCount: filteredTasks.length })}
        singularLabel="tasks"
        totalCount={filteredTasks.length}
        totalPages={totalPages}
        onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        onPageChange={setCurrentPage}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onRowsPerPageChange={(value) => {
          setRowsPerPage(value)
          setCurrentPage(1)
        }}
      />
    </MasterListPageFrame>
  )
}

function NewTaskDialog({ isCreatingPriority, isSaving, onCreatePriority, onOpenChange, onSubmit, open, priorities, tenantUsers }: { isCreatingPriority: boolean; isSaving: boolean; onCreatePriority(input: MasterDataUpsertInput): Promise<MasterDataRecord>; onOpenChange(open: boolean): void; onSubmit(input: TaskManagerTaskInput): void; open: boolean; priorities: MasterDataRecord[]; tenantUsers: TenantUserRecord[] }) {
  const [draft, setDraft] = useState<TaskManagerTaskInput>(() => emptyTaskManagerTask())

  function resetAndClose(openState: boolean) {
    if (!openState) setDraft(emptyTaskManagerTask())
    onOpenChange(openState)
  }

  function assignToUser(value: string, user?: TenantUserRecord) {
    const trimmed = value.trim()
    setDraft((current) => ({
      ...current,
      assigned_to: user?.email ?? (trimmed.includes("@") ? trimmed : ""),
      assigned_to_name: user?.name ?? (trimmed.includes("@") ? trimmed.split("@")[0] : trimmed),
    }))
  }

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription className="sr-only">Create a new task.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Title *" value={draft.title ?? ""} onChange={(value) => setDraft((current) => ({ ...current, title: value }))} />
          <TaskRichTextEditor label="Subject" value={draft.subject ?? ""} onChange={(value) => setDraft((current) => ({ ...current, subject: value }))} />
          <div className="grid gap-4 md:grid-cols-2">
            <PriorityAutocomplete isCreating={isCreatingPriority} label="Priority" priorities={priorities} value={draft.priority ?? "normal"} onChange={(value) => setDraft((current) => ({ ...current, priority: value }))} onCreate={onCreatePriority} />
            <AssigneeAutocomplete label="Assign to" users={tenantUsers} value={draft.assigned_to_name || draft.assigned_to || ""} onChange={assignToUser} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" className="rounded-md" onClick={() => resetAndClose(false)}>Cancel</Button>
          <Button disabled={isSaving} type="button" className="rounded-md" onClick={() => onSubmit({ ...draft, status: "new" })}><Save className={cn("size-4", isSaving && "animate-spin")} />Create task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TaskUpsertPage({ isCreatingPriority, isSaving, onBack, onCreatePriority, onSubmit, priorities, task }: { isCreatingPriority: boolean; isSaving: boolean; onBack(): void; onCreatePriority(input: MasterDataUpsertInput): Promise<MasterDataRecord>; onSubmit(input: TaskManagerTaskInput): void; priorities: MasterDataRecord[]; task: TaskManagerTask | null }) {
  const [draft, setDraft] = useState<TaskManagerTaskInput>(() => task ? { ...task } : emptyTaskManagerTask())

  function setField<Key extends keyof TaskManagerTaskInput>(key: Key, value: TaskManagerTaskInput[Key]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  return (
    <main className="mx-auto flex w-[calc(100%-2rem)] max-w-[1200px] flex-col gap-5 py-6 sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)]">
      <div className="flex items-start gap-3">
        <Button type="button" variant="outline" size="icon" className="mt-1 size-9 rounded-md" onClick={onBack}><ArrowLeft className="size-4" /></Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">{task ? "Edit task" : "New task"}</h1>
          <p className="text-sm text-muted-foreground">Assign office automation work to staff and attach it to any module record.</p>
        </div>
      </div>
      <Card className="rounded-md">
        <CardHeader className="pb-3"><CardTitle className="text-base">Task details</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-[2fr_1.5fr_1fr_1fr]">
            <Field label="Title *" value={draft.title ?? ""} onChange={(value) => setField("title", value)} />
            <Field label="Subject" value={draft.subject ?? ""} onChange={(value) => setField("subject", value)} />
            <PriorityAutocomplete isCreating={isCreatingPriority} label="Priority" priorities={priorities} value={draft.priority ?? "normal"} onChange={(value) => setField("priority", value)} onCreate={onCreatePriority} />
            <SelectField label="Status" value={draft.status ?? "new"} options={statusOptions} onChange={(value) => setField("status", value as TaskManagerStatus)} />
          </div>
          <TextField label="Work instructions" value={draft.description ?? ""} onChange={(value) => setField("description", value)} />
          <div className="grid gap-4 md:grid-cols-4">
            <SelectField label="Module" value={draft.module_key ?? "general"} options={moduleOptions.map((value) => ({ label: value, value }))} onChange={(value) => setField("module_key", value)} />
            <Field label="Record id / invoice no" value={draft.linked_record_id ?? ""} onChange={(value) => setField("linked_record_id", value)} />
            <Field label="Record label" value={draft.linked_record_label ?? ""} onChange={(value) => setField("linked_record_label", value)} />
            <Field label="Due date" type="date" value={draft.due_date ?? ""} onChange={(value) => setField("due_date", value)} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Assign to email" value={draft.assigned_to ?? ""} onChange={(value) => setField("assigned_to", value)} />
            <Field label="Staff name" value={draft.assigned_to_name ?? ""} onChange={(value) => setField("assigned_to_name", value)} />
            <Field label="Performance score" type="number" value={String(draft.score ?? 0)} onChange={(value) => setField("score", Number(value || 0))} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <SwitchRow checked={Boolean(draft.verification_required)} label="Verification required" onCheckedChange={(checked) => setField("verification_required", checked)} />
            <SwitchRow checked={Boolean(draft.auditor_followup_required)} label="Auditor follow-up required" onCheckedChange={(checked) => setField("auditor_followup_required", checked)} />
          </div>
          <div className="flex justify-end gap-2 border-t border-border/70 pt-4">
            <Button type="button" variant="outline" className="rounded-md" onClick={onBack}>Back</Button>
            <Button disabled={isSaving} type="button" className="rounded-md" onClick={() => onSubmit(draft)}><Save className={cn("size-4", isSaving && "animate-spin")} />Save task</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

function TaskShowPage({ isWorking, onBack, onDelete, onEdit, onStatus, priorities, task }: { isWorking: boolean; onBack(): void; onDelete(): void; onEdit(): void; onStatus(status: TaskManagerStatus): void; priorities: MasterDataRecord[]; task: TaskManagerTask }) {
  const detailContent = (
    <div className="grid gap-4">
      <Card className="rounded-md">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="size-4" />Task content</CardTitle></CardHeader>
        <CardContent className="grid gap-5">
          <ShowContent label="Subject" html={task.subject} empty="No subject added." />
          <ShowContent label="Work instructions" value={task.description} empty="No work instructions added." />
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-md">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><UserRound className="size-4" />Assignment</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Info label="Assigned to" value={task.assigned_to_name || "Unassigned"} />
            <Info label="Assigned email" value={task.assigned_to || "Not set"} />
            <Info label="Assigned by" value={task.assigned_by || "Not set"} />
            <Info label="Due date" value={formatDate(task.due_date)} />
            <Info label="Performance score" value={String(task.score)} />
            <Info label="Priority" valueNode={<PriorityBadge priorities={priorities} value={task.priority} />} />
          </CardContent>
        </Card>
        <Card className="rounded-md">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Link2 className="size-4" />Linked record</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Info label="Module" value={task.module_key || "General"} />
            <Info label="Record id / invoice no" value={task.linked_record_id || "Not linked"} />
            <Info label="Record label" value={task.linked_record_label || "Not set"} />
            <Info label="Task number" value={task.task_no} />
          </CardContent>
        </Card>
      </div>
      <Card className="rounded-md">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Tags className="size-4" />Status and controls</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Current status" valueNode={<TaskStatusBadge status={task.status} />} />
            <Info label="Verification required" value={task.verification_required ? "Yes" : "No"} />
            <Info label="Auditor follow-up required" value={task.auditor_followup_required ? "Yes" : "No"} />
            <Info label="Completed by" value={task.completed_by || "Not completed"} />
          </div>
          <div className="flex flex-wrap gap-2 border-t border-border/70 pt-4">
            {statusOptions.map((option) => <Button key={option.value} disabled={isWorking || task.status === option.value} type="button" variant={task.status === option.value ? "default" : "outline"} className="rounded-md" onClick={() => onStatus(option.value)}>{option.label}</Button>)}
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-md">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><History className="size-4" />Record information</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Created by" value={task.created_by || "Not set"} />
          <Info label="Created at" value={formatDateTime(task.created_at)} />
          <Info label="Updated by" value={task.updated_by || "Not set"} />
          <Info label="Updated at" value={formatDateTime(task.updated_at)} />
          <Info label="Started at" value={formatDateTime(task.started_at)} />
          <Info label="Completed at" value={formatDateTime(task.completed_at)} />
        </CardContent>
      </Card>
    </div>
  )

  const activityContent = (
    <Card className="rounded-md">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><ListChecks className="size-4" />Activity history</CardTitle></CardHeader>
      <CardContent className="grid gap-3">
        {task.activities.map((activity) => (
          <div key={activity.uuid} className="flex gap-3 rounded-md border border-border/70 p-4 text-sm">
            <span className="mt-1 size-2.5 shrink-0 rounded-full bg-primary" />
            <div className="min-w-0">
              <div className="font-medium">{activity.message}</div>
              <div className="mt-1 text-xs text-muted-foreground">{activity.actor_email} - {formatDateTime(activity.created_at)}</div>
            </div>
          </div>
        ))}
        {!task.activities.length ? <div className="py-8 text-center text-sm text-muted-foreground">No activity yet.</div> : null}
      </CardContent>
    </Card>
  )

  return (
    <main className="mx-auto flex w-[calc(100%-2rem)] max-w-[1200px] flex-col gap-5 py-6 sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button type="button" variant="outline" size="icon" className="mt-1 size-9 rounded-md" onClick={onBack}><ArrowLeft className="size-4" /></Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">{task.title}</h1>
            <p className="text-sm text-muted-foreground">{[task.task_no, richTextToPlainText(task.subject), task.module_key ?? "general", task.linked_record_label ?? task.linked_record_id ?? "No linked record"].filter(Boolean).join(" - ")}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="rounded-md" onClick={onEdit}>Edit</Button>
          <Button disabled={isWorking} type="button" variant="outline" className="rounded-md hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive" onClick={onDelete}><Trash2 className="size-4" />Delete</Button>
        </div>
      </div>
      <AnimatedTabs tabs={[
        { value: "details", label: <span className="flex items-center gap-2"><ClipboardCheck className="size-4" />Details</span>, content: detailContent },
        { value: "activity", label: <span className="flex items-center gap-2"><ListChecks className="size-4" />Activity <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">{task.activities.length}</Badge></span>, content: activityContent },
      ]} />
    </main>
  )
}

function TaskStatusBadge({ status }: { status: TaskManagerStatus }) {
  const done = status === "completed"
  return <Badge variant="outline" className={cn("h-6 gap-1 rounded-md px-2 text-[11px]", done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-border bg-muted text-muted-foreground")}>{done ? <CheckCircle2 className="size-3" /> : null}{status.replace("_", " ")}</Badge>
}

function Field({ label, onChange, type = "text", value }: { label: string; onChange(value: string): void; type?: string; value: string }) {
  return <div className="grid gap-2"><Label>{label}</Label><Input className="h-11 rounded-md" type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>
}

function TextField({ label, onChange, value }: { label: string; onChange(value: string): void; value: string }) {
  return <div className="grid gap-2"><Label>{label}</Label><Textarea className="min-h-28 rounded-md" value={value} onChange={(event) => onChange(event.target.value)} /></div>
}

function SelectField({ label, onChange, options, value }: { label: string; onChange(value: string): void; options: Array<{ label: string; value: string }>; value: string }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 min-h-11 rounded-md"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  )
}

function TaskRichTextEditor({ label, onChange, value }: { label: string; onChange(value: string): void; value: string }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    editorProps: {
      attributes: {
        class: "min-h-24 px-3 py-2 text-sm leading-6 outline-none [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:my-1 [&_ul]:ml-5 [&_ul]:list-disc",
      },
    },
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.isEmpty ? "" : currentEditor.getHTML()),
  })

  useEffect(() => {
    if (!editor || editor.getHTML() === value) return
    editor.commands.setContent(value || "", { emitUpdate: false })
  }, [editor, value])

  const tools = [
    { label: "Bold", active: editor?.isActive("bold"), icon: Bold, run: () => editor?.chain().focus().toggleBold().run() },
    { label: "Italic", active: editor?.isActive("italic"), icon: Italic, run: () => editor?.chain().focus().toggleItalic().run() },
    { label: "Bullet list", active: editor?.isActive("bulletList"), icon: List, run: () => editor?.chain().focus().toggleBulletList().run() },
    { label: "Numbered list", active: editor?.isActive("orderedList"), icon: ListOrdered, run: () => editor?.chain().focus().toggleOrderedList().run() },
    { label: "Undo", active: false, icon: RotateCcw, run: () => editor?.chain().focus().undo().run() },
    { label: "Redo", active: false, icon: RotateCw, run: () => editor?.chain().focus().redo().run() },
  ]

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <div className="overflow-hidden rounded-md border border-input bg-background focus-within:border-foreground/40 focus-within:ring-2 focus-within:ring-ring/30">
        <div className="flex flex-wrap gap-1 border-b border-border/70 bg-muted/30 p-1.5">
          {tools.map(({ active, icon: Icon, label: toolLabel, run }) => (
            <Button aria-label={toolLabel} className={cn("size-8 rounded-md p-0", active && "bg-muted text-foreground")} key={toolLabel} onClick={run} title={toolLabel} type="button" variant="ghost">
              <Icon className="size-4" />
            </Button>
          ))}
        </div>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function AssigneeAutocomplete({ label, onChange, users, value }: { label: string; onChange(value: string, user?: TenantUserRecord): void; users: TenantUserRecord[]; value: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const normalizedQuery = query.trim().toLowerCase()
  const filteredUsers = users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(normalizedQuery))

  useEffect(() => setQuery(value), [value])

  function select(valueToSave: string, user?: TenantUserRecord) {
    onChange(valueToSave, user)
    setQuery(user?.name ?? valueToSave)
    setIsOpen(false)
  }

  return (
    <div className="relative grid gap-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          className="h-11 rounded-md pr-10"
          onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
          onChange={(event) => {
            setQuery(event.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search tenant users"
          value={query}
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
          <button className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm hover:bg-muted" onMouseDown={(event) => { event.preventDefault(); select("") }} type="button">Unassigned</button>
          {filteredUsers.map((user) => (
            <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted" key={user.user_id} onMouseDown={(event) => { event.preventDefault(); select(user.email, user) }} type="button">
              <span className="min-w-0 flex-1"><span className="block truncate font-medium">{user.name}</span><span className="block truncate text-xs text-muted-foreground">{user.email}</span></span>
              {(value === user.name || value === user.email) ? <Check className="size-4 text-primary" /> : null}
            </button>
          ))}
          {!filteredUsers.length && normalizedQuery ? <div className="px-3 py-2 text-sm text-muted-foreground">No tenant users found.</div> : null}
        </div>
      ) : null}
    </div>
  )
}

function richTextToPlainText(value: string | null | undefined) {
  if (!value) return ""
  if (typeof document === "undefined") return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  const container = document.createElement("div")
  container.innerHTML = value
  return container.textContent?.replace(/\s+/g, " ").trim() ?? ""
}

function findPriority(priorities: MasterDataRecord[], tag: string) {
  return priorities.find((priority) => String(priority.tag ?? "").toLowerCase() === tag.toLowerCase())
}

function SwitchRow({ checked, label, onCheckedChange }: { checked: boolean; label: string; onCheckedChange(checked: boolean): void }) {
  return <label className="flex h-11 items-center justify-between rounded-md border border-border/70 px-3 text-sm font-medium"><span>{label}</span><Switch checked={checked} onCheckedChange={onCheckedChange} /></label>
}

function ShowContent({ empty, html, label, value }: { empty: string; html?: string | null; label: string; value?: string | null }) {
  const content = html ? richTextToPlainText(html) : value
  return (
    <div>
      <div className="mb-2 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="whitespace-pre-wrap rounded-md border border-border/70 bg-muted/20 p-4 text-sm leading-6">{content || empty}</div>
    </div>
  )
}

function Info({ label, value, valueNode }: { label: string; value?: string; valueNode?: React.ReactNode }) {
  return <div className="min-w-0 rounded-md border border-border/70 p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 break-words font-medium">{valueNode ?? value ?? "-"}</div></div>
}

function Header({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-3 py-2 text-left text-sm font-medium", className)}>{children}</th>
}

function formatDate(value?: string | null) {
  if (!value) return "Not set"
  return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not set"
  return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}
