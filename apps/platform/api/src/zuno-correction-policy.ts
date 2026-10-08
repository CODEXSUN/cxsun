import { AppError } from "@cxsun/framework/errors";
import type { TextCorrectionPlan } from "@cxsun/zuno-api";

const identifier = /^[a-z][a-z0-9_]{1,63}$/u;
const deniedTable = /^(?:tenant_|platform_|migration_|queue_|zuno_)/u;
const editableColumn =
  /^(?:(?:[a-z0-9]+_)?(?:name|label|title|description|notes?|remarks?|comment|reference)|display_name)$/u;

export function validateZunoTextCorrectionPlan(plan: TextCorrectionPlan) {
  if (
    !identifier.test(plan.table) ||
    !identifier.test(plan.column) ||
    deniedTable.test(plan.table) ||
    !editableColumn.test(plan.column)
  ) {
    throw AppError.validation("This table or column is not eligible for a direct text correction.");
  }
  if (
    !Number.isSafeInteger(plan.rowId) ||
    plan.rowId < 1 ||
    plan.expectedValue === plan.replacementValue ||
    plan.expectedValue.length > 10_000 ||
    plan.replacementValue.length > 10_000
  ) {
    throw AppError.validation("The correction values or row ID are invalid.");
  }
}
