import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { CheckCircle2, Plus, RefreshCw, RotateCcw, Save, X } from "lucide-react"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Switch } from "src/components/ui/switch"
import {
  CommonListEmptyState,
  CommonListPageFrame,
  CommonListPaginationCard,
  CommonListTableCard,
  CommonListToolbarCard,
  buildCommonListShowingLabel,
} from "src/components/blocks/lists/common-list"
import { MasterListRowActions } from "src/components/blocks/lists/master-list"
import { cn } from "src/lib/utils"
import type { AuthSession } from "src/features/auth/auth-client"
import type { MasterDataColumnDefinition, MasterDataModuleDefinition, MasterDataRecord, MasterDataUpsertInput } from "../../domain/master-data"
import { buildDraft, formatDate, formatValue, isActive, searchRecords, validateDraft } from "../../application/master-data-service"
import { destroyMasterDataRecord, listMasterDataModules, listMasterDataRecords, restoreMasterDataRecord, upsertMasterDataRecord } from "../../infrastructure/master-data-client"

export function CommonDataPage({ moduleKey, session }: { moduleKey: string; session: AuthSession }) {
  const queryClient = useQueryClient()
  const [searchValue, setSearchValue] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [dialogRecord, setDialogRecord] = useState<MasterDataRecord | null | undefined>(undefined)
  const modulesQuery = useQuery({ queryKey: ["master-data-modules", "common", session.selectedTenant.slug], queryFn: () => listMasterDataModules(session, "common") })
  const recordsQuery = useQuery({ queryKey: ["master-data-records", session.selectedTenant.slug, moduleKey], queryFn: () => listMasterDataRecords(session, moduleKey) })
  const upsertMutation = useMutation({ mutationFn: (input: MasterDataUpsertInput) => upsertMasterDataRecord(session, moduleKey, input) })
  const destroyMutation = useMutation({ mutationFn: (record: MasterDataRecord) => destroyMasterDataRecord(session, moduleKey, record.uuid) })
  const restoreMutation = useMutation({ mutationFn: (record: MasterDataRecord) => restoreMasterDataRecord(session, moduleKey, record.uuid) })
  const definition = modulesQuery.data?.find((module) => module.key === moduleKey) ?? null
  const records = recordsQuery.data ?? []
  const filteredRecords = useMemo(() => searchRecords(records, searchValue), [records, searchValue])
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage))
  const pageRecords = filteredRecords.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
  const isLoading = modulesQuery.isFetching || recordsQuery.isFetching

  useEffect(() => {
    const error = modulesQuery.error ?? recordsQuery.error
    if (error) toast.error("Common list failed", { description: error instanceof Error ? error.message : "Unable to load common module." })
  }, [modulesQuery.error, recordsQuery.error])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["master-data-records", session.selectedTenant.slug, moduleKey] })
  }

  async function destroy(record: MasterDataRecord) {
    await destroyMutation.mutateAsync(record)
    toast.error("Record suspended", { description: `${definition?.label ?? "Record"} is hidden until restored.` })
    await refresh()
  }

  async function restore(record: MasterDataRecord) {
    await restoreMutation.mutateAsync(record)
    toast.success("Record restored", { description: `${definition?.label ?? "Record"} is active again.` })
    await refresh()
  }

  return (
    <CommonListPageFrame
      title={definition?.label ?? "Common"}
      description="Tenant common setup with individual module tables, public uuid, and popup upsert."
      technicalName={`page.common.${moduleKey}`}
      action={
        <div className="flex items-center gap-2">
          <Button disabled={isLoading} onClick={() => void recordsQuery.refetch()} type="button" variant="outline" className="h-9 rounded-md"><RefreshCw className={cn("size-4", isLoading && "animate-spin")} />Refresh</Button>
          <Button disabled={!definition} onClick={() => setDialogRecord(null)} type="button" className="h-9 rounded-md"><Plus className="size-4" />New</Button>
        </div>
      }
    >
      <CommonListToolbarCard
        searchPlaceholder="Search id, uuid, name, code, or status"
        searchValue={searchValue}
        onSearchValueChange={(value) => {
          setSearchValue(value)
          setCurrentPage(1)
        }}
      />
      <CommonListTableCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr>
                <ListHeader>#</ListHeader>
                <ListHeader>UUID</ListHeader>
                {definition?.columns.slice(0, 5).map((column) => <ListHeader key={column.key}>{column.label}</ListHeader>)}
                <ListHeader>Status</ListHeader>
                <ListHeader>Updated</ListHeader>
                <ListHeader className="text-right">Action</ListHeader>
              </tr>
            </thead>
            <tbody>
              {pageRecords.map((record, index) => (
                <tr key={record.uuid} className={cn("border-b border-border/70", !isActive(record) && "bg-muted/20 text-muted-foreground")}>
                  <td className="px-4 py-2 text-muted-foreground">{(currentPage - 1) * rowsPerPage + index + 1}</td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{record.uuid}</td>
                  {definition?.columns.slice(0, 5).map((column) => <td key={column.key} className="px-4 py-2">{formatValue(record, column)}</td>)}
                  <td className="px-4 py-2"><StatusBadge active={isActive(record)} /></td>
                  <td className="px-4 py-2 text-muted-foreground">{formatDate(record.updated_at)}</td>
                  <td className="px-4 py-1.5 text-right">
                    <MasterListRowActions
                      title={record.uuid}
                      isSuspended={!isActive(record)}
                      onDelete={() => void destroy(record)}
                      onEdit={() => setDialogRecord(record)}
                      onRestore={() => void restore(record)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageRecords.length === 0 ? <CommonListEmptyState>{isLoading ? "Loading records." : "No records found."}</CommonListEmptyState> : null}
      </CommonListTableCard>
      <CommonListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildCommonListShowingLabel({ page: currentPage, pageSize: rowsPerPage, totalCount: filteredRecords.length })}
        singularLabel="records"
        totalCount={filteredRecords.length}
        totalPages={totalPages}
        onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        onPageChange={setCurrentPage}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onRowsPerPageChange={(nextValue) => {
          setRowsPerPage(nextValue)
          setCurrentPage(1)
        }}
      />
      {definition && dialogRecord !== undefined ? (
        <CommonUpsertDialog
          definition={definition}
          record={dialogRecord}
          isSaving={upsertMutation.isPending}
          onClose={() => setDialogRecord(undefined)}
          onSubmit={async (input) => {
            await upsertMutation.mutateAsync(input)
            toast.success(dialogRecord ? "Record updated" : "Record created")
            setDialogRecord(undefined)
            await refresh()
          }}
        />
      ) : null}
    </CommonListPageFrame>
  )
}

function CommonUpsertDialog({ definition, isSaving, onClose, onSubmit, record }: {
  definition: MasterDataModuleDefinition
  isSaving: boolean
  onClose(): void
  onSubmit(input: MasterDataUpsertInput): Promise<void>
  record: MasterDataRecord | null
}) {
  const [draft, setDraft] = useState(() => buildDraft(definition, record))
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    const validationError = validateDraft(definition, draft)
    if (validationError) {
      setError(validationError)
      return
    }
    await onSubmit(draft)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/55 p-4 backdrop-blur-sm">
      <div className="w-[min(920px,calc(100vw-2rem))] rounded-md border border-border/70 bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">{record ? `Edit ${definition.label}` : `New ${definition.label}`}</h2>
            <p className="text-sm text-muted-foreground">Public uuid is generated as an 8 digit unique value.</p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} type="button"><X className="size-4" /></Button>
        </div>
        <div className="grid max-h-[70vh] gap-4 overflow-y-auto p-5 md:grid-cols-2">
          {definition.columns.map((column) => <EditorField key={column.key} column={column} draft={draft} setDraft={setDraft} />)}
          <label className={cn("flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3", draft.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-border/70 bg-muted/10")}>
            <span className="text-sm font-medium">Active</span>
            <Switch checked={Boolean(draft.is_active)} onCheckedChange={(checked) => setDraft((current) => ({ ...current, is_active: checked }))} />
          </label>
        </div>
        {error ? <p className="px-5 text-sm font-medium text-destructive">{error}</p> : null}
        <div className="flex flex-wrap items-center gap-3 border-t border-border/70 px-5 py-4">
          <Button disabled={isSaving} onClick={() => void submit()} type="button" className="rounded-md"><Save className={cn("size-4", isSaving && "animate-spin")} />Save</Button>
          <Button onClick={onClose} type="button" variant="outline" className="rounded-md"><X className="size-4" />Cancel</Button>
        </div>
      </div>
    </div>
  )
}

function EditorField({ column, draft, setDraft }: {
  column: MasterDataColumnDefinition
  draft: MasterDataUpsertInput
  setDraft(updater: (current: MasterDataUpsertInput) => MasterDataUpsertInput): void
}) {
  if (column.type === "boolean") {
    return (
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/10 px-4 py-3">
        <span className="text-sm font-medium">{column.label}</span>
        <Switch checked={Boolean(draft[column.key])} onCheckedChange={(checked) => setDraft((current) => ({ ...current, [column.key]: checked }))} />
      </label>
    )
  }

  return (
    <div className="grid gap-2">
      <Label className="text-sm font-medium">{column.label}</Label>
      <Input
        className="h-11 rounded-xl"
        type={column.type === "number" ? "number" : "text"}
        value={String(draft[column.key] ?? "")}
        onChange={(event) => setDraft((current) => ({ ...current, [column.key]: column.type === "number" ? Number(event.target.value || 0) : event.target.value }))}
      />
    </div>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant="outline" className={cn("h-6 gap-1 rounded-md px-2 text-[11px]", active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700")}>
      {active ? <CheckCircle2 className="size-3" /> : <RotateCcw className="size-3" />}
      {active ? "active" : "suspend"}
    </Badge>
  )
}

function ListHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("border-b border-border/70 px-4 py-3.5 text-left font-medium text-foreground", className)}>{children}</th>
}
