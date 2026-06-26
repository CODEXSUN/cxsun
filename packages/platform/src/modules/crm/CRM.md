# CRM

## Summary
Provides a simple sales pipeline management system with configurable pipelines, stages, leads, and deals. Tracks the full sales workflow from lead generation through deal closure with pipeline stage transitions and probability tracking.

## What We Done
- Pipeline CRUD with default pipeline auto-creation per tenant
- Pipeline stage management with configurable name, probability, sort order, and won/lost flags
- Lead management with source tracking, estimated value, and status
- Deal management with pipeline-stage assignment, probability, amount, and expected close date
- Full workspace endpoint returning all pipelines (with stages), leads, and deals in a single call
- Soft-delete with protection against deleting pipelines that have active deals
- Unique stage key constraint per pipeline
- Default 5-stage pipeline (Qualified, Proposal, Negotiation, Won, Lost) on creation

## Gaps
- No lead-to-deal conversion workflow (schema has `converted_deal_id` but no endpoint for conversion)
- No deal stage transition validation (deals can be moved to any stage freely)
- No contact/account linking beyond free-text fields
- No activity timeline or notes on individual deals/leads
- No reporting or funnel analytics
- No search or filtering on list endpoints
- No deal/lead assignment or team collaboration features

## Future Concepts
- Lead-to-deal conversion with data carry-over
- Pipeline stage transition rules and required fields per stage
- Activity feed and communication history per deal
- Sales funnel analytics (conversion rates, stage velocity)
- Deal forecasting based on probability and expected close date
- Email integration for deal communication
- Custom field definitions per pipeline
- Automated lead scoring and assignment
