# TASKMANAGER

## Summary
Multi-tenant work tracking module for creating, assigning, and managing tasks with comments, subtasks, attachments, events, reminders, and campaigns. Supports task templates, categories, tags, and specialized campaign generation for sales verification and contact cleanup workflows.

## What We Done
- Task CRUD with title, description, priority, status workflow, assignment, and source record linking
- Task statuses: new, todo, in_progress, review, completed, cancelled
- Scoped listing (my, assigned-to-me, open, all) with user-based filtering
- Threaded comments with create/update/delete
- Subtasks with status, assignment, due date, and sorting
- Attachments with storage key and metadata
- Events (calendar entries) per task with create/delete
- Soft-delete and force-delete with cascading cleanup of child records
- Settings management per tenant (defaults, auto-reminder, claiming, confirmation)
- Categories and tags with autocomplete-style upsert
- Templates for reusable task definitions
- Campaign system with item checklist, status management (open, closed, reset), and item-to-task conversion
- Sales invoice GST/Tally verification campaign generator
- Contact phone/email verification campaign generator
- Reminders with completion tracking
- Auto-generated task numbers (TASK-YYYY-NNNN)
- Activity logging for all task mutations
- Queue events published for task lifecycle events

## Gaps
- No task-specific permission policies (currently uses `company.manage`)
- No recurring task generation from reminders
- No reminder queue worker/delivery mechanism
- No performance reporting beyond score field
- No quick-create task button integration from other modules
- No real-time notifications on task assignment/update
- No calendar view or Gantt chart
- No file upload UI tied to task manager (media_folder config exists but no upload endpoint)

## Future Concepts
- Task-specific RBAC policies (task.view, task.manage, task.assign, task.comment)
- Recurring task generation with queue-based scheduler
- Reminder delivery via email, dashboard, and push notifications
- Performance dashboard with completion rates, overdue counts, and category-wise stats
- Module integration contract for programmatic task creation from invoices, GST filings, etc.
- Calendar/Gantt view for task scheduling
- Real-time WebSocket updates for task changes
- Template-driven campaign generation with dynamic source queries
- Export/import tasks and campaigns
