# REPORT

## Summary
Billing statement report generation for customer and supplier accounts, displaying transaction history with running balance.

## What We Done
- Billing statement page with date range filter, party type (customer/supplier), and party selection
- Transaction table with date, particulars, debit/credit amounts, running balance
- Nested navigation (reports list → billing statement)
- Static report (no API integration yet — uses placeholder authHeaders and comment-only request model)

## Gaps
- No API integration — report uses mock/placeholder code only
- No print/preview of report
- No export to PDF or Excel
- No other report types (sales summary, purchase summary, stock report, GST returns, P&L, balance sheet)
- No date range validation
- No chart/graph visualization
- No report scheduling or email dispatch

## Future Concepts
- Full API integration for all reports
- Report export (PDF, Excel, CSV)
- Sales register, purchase register, stock summary reports
- GST compliance reports (GSTR-1, GSTR-3B)
- Financial reports (Trial Balance, P&L, Balance Sheet)
- Dashboard with chart widgets (revenue, expenses, trends)
- Drill-down from summary to transaction details
- Scheduled email reports
