import { useState } from "react"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

export type CxKanbanTask = {
  id: string
  title: string
  board_stage_id: string
  board_position: number
  status_key: string
  priority: string
  visibility: string
  assignee_user_id?: string
  entity_type?: string
  entity_id?: string
}

export type CxKanbanStage = {
  id: string
  title: string
}

// -------------------------------------------------------------
// Component: KanbanColumn
// -------------------------------------------------------------
interface KanbanColumnProps {
  stage: CxKanbanStage
  tasks: CxKanbanTask[]
}

export function CxKanbanColumn({ stage, tasks }: KanbanColumnProps) {
  const { setNodeRef } = useSortable({
    id: stage.id,
    data: {
      type: "Column",
      stage,
    },
  })

  // We only track the specific tasks rendered within this column via context
  const taskIds = tasks.map((t) => t.id)

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col gap-4 p-4 min-w-[300px] w-[300px] bg-slate-100/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800"
    >
      <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-100">
        <span>{stage.title}</span>
        <span className="px-2 py-0.5 text-xs bg-slate-200 dark:bg-slate-800 rounded-full">
          {tasks.length}
        </span>
      </div>

      <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <CxKanbanCard key={task.id} task={task} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// Component: KanbanCard
// -------------------------------------------------------------
interface KanbanCardProps {
  task: CxKanbanTask
}

export function CxKanbanCard({ task }: KanbanCardProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: {
      type: "Task",
      task,
    },
  })

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-4 bg-white dark:bg-slate-950 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 cursor-grab active:cursor-grabbing hover:border-blue-400 dark:hover:border-blue-600 transition-colors ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
        {task.title}
      </div>
      
      <div className="flex items-center gap-2 mt-4 text-xs font-medium">
        <span
          className={`px-2 py-0.5 rounded-full ${
            task.priority === "urgent"
              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              : task.priority === "high"
              ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
          }`}
        >
          {task.priority || "Low"}
        </span>

        {task.entity_type && (
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800/30 truncate max-w-[120px]">
             {task.entity_type}: {task.entity_id}
          </span>
        )}
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// Component: KanbanBoard
// -------------------------------------------------------------
interface KanbanBoardProps {
  initialStages: CxKanbanStage[]
  initialTasks: CxKanbanTask[]
  onTaskMove?: (taskId: string, newStageId: string, newPosition: number) => void
}

export type CxKanbanBoardProps = KanbanBoardProps

export function CxKanbanBoard({ initialStages, initialTasks, onTaskMove }: CxKanbanBoardProps) {
  const [stages] = useState<CxKanbanStage[]>(initialStages)
  const [tasks, setTasks] = useState<CxKanbanTask[]>(initialTasks)
  const [activeTask, setActiveTask] = useState<CxKanbanTask | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    if (active.data.current?.type === "Task") {
      setActiveTask(active.data.current.task)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    // Handling moving tasks between stages visually while dragging
    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id

    if (activeId === overId) return

    const isActiveTask = active.data.current?.type === "Task"
    const isOverTask = over.data.current?.type === "Task"
    const isOverColumn = over.data.current?.type === "Column"

    if (!isActiveTask) return

    // Reorder if dragging a Task over another Task
    if (isActiveTask && isOverTask) {
      setTasks((prev) => {
        const activeIndex = prev.findIndex((t) => t.id === activeId)
        const overIndex = prev.findIndex((t) => t.id === overId)

        if (prev[activeIndex]?.board_stage_id !== prev[overIndex]?.board_stage_id) {
          // Moving between columns
          const updatedTasks = [...prev]
          const activeTask = updatedTasks[activeIndex]
          if (activeTask) {
            activeTask.board_stage_id = updatedTasks[overIndex]?.board_stage_id ?? activeTask.board_stage_id
          }
          return arrayMove(updatedTasks, activeIndex, overIndex)
        }

        // Reordering within the same column
        return arrayMove(prev, activeIndex, overIndex)
      })
    }

    // Dropping a Task over an empty Column area
    if (isActiveTask && isOverColumn) {
      setTasks((prev) => {
        const activeIndex = prev.findIndex((t) => t.id === activeId)
        const updatedTasks = [...prev]
        const activeTask = updatedTasks[activeIndex]
        if (activeTask) {
           activeTask.board_stage_id = overId as string
        }
        return arrayMove(updatedTasks, activeIndex, activeIndex) // Trigger re-render to push into new column array visually
      })
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event

    if (!over) return

    const activeId = active.id
    const overId = over.id
    if (activeId === overId) return

    // 1. Calculate the new fractional index based on preceding/succeeding elements in the target column
    // 2. Fire the onTaskMove to update backend via API (which triggers the database REAL board_position update)
    if (onTaskMove) {
      // Mocked calculation for fractional index execution
      const stageTasks = tasks.filter((t) => t.board_stage_id === over.data.current?.task?.board_stage_id || overId)
      const overIndex = stageTasks.findIndex((t) => t.id === overId)
      const newPosition = overIndex >= 0 ? overIndex * 1024 : 0 // Simplified example calculation

      const activeTask = tasks.find(t => t.id === activeId)
      if (activeTask) {
         onTaskMove(activeId as string, activeTask.board_stage_id, newPosition)
      }
    }
  }

  return (
    <div className="flex h-full w-full overflow-x-auto bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6">
          <SortableContext items={stages.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
            {stages.map((stage) => {
              const stageTasks = tasks.filter((t) => t.board_stage_id === stage.id)
              return <CxKanbanColumn key={stage.id} stage={stage} tasks={stageTasks} />
            })}
          </SortableContext>
        </div>

        <DragOverlay>
          {activeTask ? <CxKanbanCard task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
