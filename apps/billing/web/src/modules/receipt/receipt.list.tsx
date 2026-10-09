import { Eye, Pencil, Send, Trash2, XCircle } from "lucide-react";
import { WorkspaceRowActions } from "@cxsun/ui/workspace/row-actions";
import { WorkspaceStatusBadge } from "@cxsun/ui/workspace/status";
import {
  BillingDocumentTotalsTable,
  type BillingDocumentReportRecord,
  type BillingDocumentTotalsViewMode
} from "../../shared/document/document-totals-report";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableLoadingState,
  WorkspaceTablePanel
} from "@cxsun/ui/workspace/table";
import { formatReceiptDate, formatReceiptMoney } from "./receipt.services";
import type { Receipt } from "./receipt.types";

export function ReceiptList({
  canEditEntries,
  canEditFinalizedEntries,
  entries,
  loading,
  onCancel,
  onDelete,
  onEdit,
  onPost,
  onView,
  totalsRecords,
  totalsView
}: {
  canEditEntries: boolean;
  canEditFinalizedEntries: boolean;
  entries: Receipt[];
  loading: boolean;
  onCancel: (receipt: Receipt) => void;
  onDelete: (receipt: Receipt) => void;
  onEdit: (receipt: Receipt) => void;
  onPost: (receipt: Receipt) => void;
  onView: (receipt: Receipt) => void;
  totalsRecords: BillingDocumentReportRecord[];
  totalsView: BillingDocumentTotalsViewMode;
}) {
  return (
    <WorkspaceTablePanel>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          {totalsView === "bill" ? (
            <>
              <thead className="bg-muted/50">
                <tr>
                  {[
                    "Receipt no",
                    "Date",
                    "Customer",
                    "Mode",
                    "Amount",
                    "Unallocated",
                    "Status",
                    "Action"
                  ].map((label) => (
                    <th
                      className="border-b border-border/70 px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      key={label}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((receipt) => (
                  <tr
                    aria-label={`View receipt ${receipt.receiptNumber}`}
                    className="cursor-pointer border-b border-border/70 last:border-0 [&>td]:transition-colors hover:[&>td]:bg-muted/60 focus-visible:[&>td]:bg-muted/60 focus-visible:outline-none"
                    key={receipt.id}
                    onClick={(event) => {
                      if ((event.target as Element).closest("button, input, a")) return;
                      onView(receipt);
                    }}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onView(receipt);
                      }
                    }}
                    tabIndex={0}
                  >
                    <td className="px-4 py-3 font-semibold">{receipt.receiptNumber}</td>
                    <td className="px-4 py-3">{formatReceiptDate(receipt.receiptDate)}</td>
                    <td className="px-4 py-3">{receipt.customerName}</td>
                    <td className="px-4 py-3 capitalize">{receipt.receiptMode}</td>
                    <td className="px-4 py-3 font-medium">
                      {formatReceiptMoney(receipt.totalAmount)}
                    </td>
                    <td className="px-4 py-3">{formatReceiptMoney(receipt.unallocatedAmount)}</td>
                    <td className="px-4 py-3">
                      <ReceiptStatus receipt={receipt} />
                    </td>
                    <td className="px-4 py-3">
                      <WorkspaceRowActions
                        actions={[
                          {
                            id: "view",
                            icon: <Eye className="size-4" />,
                            label: "View",
                            onSelect: () => onView(receipt)
                          },
                          ...(canEditEntries &&
                          (receipt.status === "draft" || canEditFinalizedEntries)
                            ? [
                                {
                                  id: "edit",
                                  icon: <Pencil className="size-4" />,
                                  label: "Edit",
                                  onSelect: () => onEdit(receipt)
                                },
                                ...(receipt.status === "draft"
                                  ? [
                                      {
                                        id: "post",
                                        icon: <Send className="size-4" />,
                                        label: "Post",
                                        onSelect: () => onPost(receipt)
                                      },
                                      {
                                        id: "delete",
                                        icon: <Trash2 className="size-4" />,
                                        label: "Delete draft",
                                        tone: "destructive" as const,
                                        onSelect: () => onDelete(receipt)
                                      }
                                    ]
                                  : [])
                              ]
                            : []),
                          ...(receipt.status === "posted"
                            ? [
                                {
                                  id: "cancel",
                                  icon: <XCircle className="size-4" />,
                                  label: "Cancel",
                                  tone: "destructive" as const,
                                  onSelect: () => onCancel(receipt)
                                }
                              ]
                            : [])
                        ]}
                        title={receipt.receiptNumber}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          ) : (
            <BillingDocumentTotalsTable
              primaryLabel="Amount"
              records={totalsRecords}
              secondaryLabel="Allocated"
              totalsView={totalsView}
            />
          )}
        </table>
      </div>
      {!loading && !entries.length ? (
        <WorkspaceTableEmptyState>
          No receipts found. Create the first receipt voucher for this tenant.
        </WorkspaceTableEmptyState>
      ) : null}
      {loading ? <WorkspaceTableLoadingState /> : null}
    </WorkspaceTablePanel>
  );
}
function ReceiptStatus({ receipt }: { receipt: Receipt }) {
  const tone =
    receipt.status === "posted" ? "success" : receipt.status === "cancelled" ? "danger" : "warning";
  return <WorkspaceStatusBadge label={receipt.status} status={receipt.status} tone={tone} />;
}
