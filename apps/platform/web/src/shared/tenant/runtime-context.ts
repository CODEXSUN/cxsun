const COMPANY_CONTEXT_STORAGE_KEY = "cxsun.tenant.company-id";
const ACCOUNTING_YEAR_CONTEXT_STORAGE_KEY = "cxsun.tenant.financial-year-id";

export function publishCompanyContext(id: number) {
  window.localStorage.setItem(COMPANY_CONTEXT_STORAGE_KEY, String(id));
  window.dispatchEvent(new CustomEvent("cxsun:company-change", { detail: { id } }));
}

export function publishAccountingYear(id: number) {
  window.localStorage.setItem(ACCOUNTING_YEAR_CONTEXT_STORAGE_KEY, String(id));
  window.dispatchEvent(new CustomEvent("cxsun:accounting-year-change", { detail: { id } }));
}
