import {
  createRootRoute,
  createRoute,
  createRouter,
  parseSearchWith,
  stringifySearchWith
} from "@tanstack/react-router";
import { lazy } from "react";

const AdminDesk = lazy(() =>
  import("../desks/admin/AdminDesk").then((module) => ({ default: module.AdminDesk }))
);
const SaDesk = lazy(() =>
  import("../desks/sa/SaDesk").then((module) => ({ default: module.SaDesk }))
);
const AppDesk = lazy(() =>
  import("../desks/tenant/AppDesk").then((module) => ({ default: module.AppDesk }))
);
const BillingPrintRoute = lazy(() =>
  import("../desks/tenant/BillingPrintRoute").then((module) => ({
    default: module.BillingPrintRoute
  }))
);
const HealthPage = lazy(() =>
  import("../public/health/HealthPage").then((module) => ({ default: module.HealthPage }))
);
const TenantHome = lazy(() =>
  import("../public/tenant-home").then((module) => ({
    default: module.TenantHome
  }))
);
const TenantWorkspacePage = lazy(() =>
  import("../public/tenant-site/pages/workspace.page").then((module) => ({
    default: module.TenantWorkspacePage
  }))
);
const TenantFeaturesPage = lazy(() =>
  import("../public/tenant-site/pages/features.page").then((module) => ({
    default: module.TenantFeaturesPage
  }))
);
const TenantSecurityPage = lazy(() =>
  import("../public/tenant-site/pages/security.page").then((module) => ({
    default: module.TenantSecurityPage
  }))
);
const TenantBlogPage = lazy(() =>
  import("../public/tenant-blog-package").then((module) => ({
    default: module.TenantBlogPackagePage
  }))
);
const TenantBlogArticlePage = lazy(() =>
  import("../public/tenant-blog-package").then((module) => ({
    default: module.TenantBlogArticlePackagePage
  }))
);
const TenantUpdatesPage = lazy(() =>
  import("../public/tenant-site/pages/updates.page").then((module) => ({
    default: module.TenantUpdatesPage
  }))
);
const TenantAboutPage = lazy(() =>
  import("../public/tenant-site/pages/about.page").then((module) => ({
    default: module.TenantAboutPage
  }))
);
const TenantContactPage = lazy(() =>
  import("../public/tenant-site/pages/contact.page").then((module) => ({
    default: module.TenantContactPage
  }))
);
const TenantPrivacyPage = lazy(() =>
  import("../public/tenant-site/pages/privacy.page").then((module) => ({
    default: module.TenantPrivacyPage
  }))
);
const TenantTermsPage = lazy(() =>
  import("../public/tenant-site/pages/terms.page").then((module) => ({
    default: module.TenantTermsPage
  }))
);
const LoginPage = lazy(() =>
  import("../public/login/LoginPage").then((module) => ({ default: module.LoginPage }))
);
const SessionRefreshPage = lazy(() =>
  import("../public/session-refresh").then((module) => ({ default: module.SessionRefreshPage }))
);
const ForgotPasswordPage = lazy(() =>
  import("../public/password-recovery").then((module) => ({
    default: module.ForgotPasswordPage
  }))
);
const ResetPasswordPage = lazy(() =>
  import("../public/password-recovery").then((module) => ({
    default: module.ResetPasswordPage
  }))
);
const rootRoute = createRootRoute();

const homeRoute = createRoute({
  component: TenantHome,
  getParentRoute: () => rootRoute,
  path: "/"
});

const workspaceRoute = createRoute({
  component: TenantWorkspacePage,
  getParentRoute: () => rootRoute,
  path: "/workspace"
});

const featuresRoute = createRoute({
  component: TenantFeaturesPage,
  getParentRoute: () => rootRoute,
  path: "/features"
});

const securityRoute = createRoute({
  component: TenantSecurityPage,
  getParentRoute: () => rootRoute,
  path: "/security"
});

const blogRoute = createRoute({
  component: TenantBlogPage,
  getParentRoute: () => rootRoute,
  path: "/blog"
});

const blogArticleRoute = createRoute({
  component: TenantBlogArticlePage,
  getParentRoute: () => rootRoute,
  path: "/blog/$slug"
});

const updatesRoute = createRoute({
  component: TenantUpdatesPage,
  getParentRoute: () => rootRoute,
  path: "/updates"
});

const aboutRoute = createRoute({
  component: TenantAboutPage,
  getParentRoute: () => rootRoute,
  path: "/about"
});

const contactRoute = createRoute({
  component: TenantContactPage,
  getParentRoute: () => rootRoute,
  path: "/contact"
});

const privacyRoute = createRoute({
  component: TenantPrivacyPage,
  getParentRoute: () => rootRoute,
  path: "/privacy"
});

const termsRoute = createRoute({
  component: TenantTermsPage,
  getParentRoute: () => rootRoute,
  path: "/terms"
});

const healthRoute = createRoute({
  component: HealthPage,
  getParentRoute: () => rootRoute,
  path: "/status"
});

const tenantLoginRoute = createRoute({
  component: () => <LoginPage desk="tenant" title="App Login" />,
  getParentRoute: () => rootRoute,
  path: "/login"
});

const saLoginRoute = createRoute({
  component: () => <LoginPage desk="sa" title="Super Admin Login" />,
  getParentRoute: () => rootRoute,
  path: "/sa/login"
});

const saRefreshRoute = createRoute({
  component: SessionRefreshPage,
  getParentRoute: () => rootRoute,
  path: "/sa/refresh"
});

const adminLoginRoute = createRoute({
  component: () => <LoginPage desk="admin" title="Staff Admin Login" />,
  getParentRoute: () => rootRoute,
  path: "/admin/login"
});

const forgotPasswordRoute = createRoute({
  component: ForgotPasswordPage,
  getParentRoute: () => rootRoute,
  path: "/forgot-password"
});

const resetPasswordRoute = createRoute({
  component: ResetPasswordPage,
  getParentRoute: () => rootRoute,
  path: "/reset-password"
});

const saSplatRoute = createRoute({
  component: SaDesk,
  getParentRoute: () => rootRoute,
  path: "/sa/$"
});

const adminRoute = createRoute({
  component: AdminDesk,
  getParentRoute: () => rootRoute,
  path: "/admin"
});

const adminSplatRoute = createRoute({
  component: AdminDesk,
  getParentRoute: () => rootRoute,
  path: "/admin/$"
});

const quotationPrintRoute = createRoute({
  component: () => <BillingPrintRoute document="quotation" />,
  getParentRoute: () => rootRoute,
  path: "/app/billing/quotation/print"
});

const quotationRecordPrintRoute = createRoute({
  component: () => <BillingPrintRoute document="quotation" />,
  getParentRoute: () => rootRoute,
  path: "/app/billing/quotation/$quotationId/print"
});

const quotationRoute = createRoute({
  component: AppDesk,
  getParentRoute: () => rootRoute,
  path: "/app/billing/quotation"
});

const quotationNewRoute = createRoute({
  component: AppDesk,
  getParentRoute: () => rootRoute,
  path: "/app/billing/quotation/new"
});

const quotationRecordRoute = createRoute({
  component: AppDesk,
  getParentRoute: () => rootRoute,
  path: "/app/billing/quotation/$quotationId"
});

const quotationShowRoute = createRoute({
  component: AppDesk,
  getParentRoute: () => rootRoute,
  path: "/app/billing/quotation/$quotationId/show"
});

const quotationEditRoute = createRoute({
  component: AppDesk,
  getParentRoute: () => rootRoute,
  path: "/app/billing/quotation/$quotationId/edit"
});

const salesPrintRoute = createRoute({
  component: () => <BillingPrintRoute document="sales" />,
  getParentRoute: () => rootRoute,
  path: "/app/billing/sales/print"
});

const purchasePrintRoute = createRoute({
  component: () => <BillingPrintRoute document="purchase" />,
  getParentRoute: () => rootRoute,
  path: "/app/billing/purchase/print"
});

const exportSalesPrintRoute = createRoute({
  component: () => <BillingPrintRoute document="export-sales" />,
  getParentRoute: () => rootRoute,
  path: "/app/billing/export-sales/print"
});

const billingRecordRoutes = (
  ["sales", "purchase", "export-sales", "payment", "receipt"] as const
).flatMap((document) =>
  (
    [
      `/app/billing/${document}`,
      `/app/billing/${document}/new`,
      `/app/billing/${document}/$recordId`,
      `/app/billing/${document}/$recordId/show`,
      `/app/billing/${document}/$recordId/edit`
    ] as const
  ).map((path) =>
    createRoute({
      component: AppDesk,
      getParentRoute: () => rootRoute,
      path
    })
  )
);

const billingRecordPrintRoutes = (["sales", "purchase", "export-sales"] as const).map((document) =>
  createRoute({
    component: () => <BillingPrintRoute document={document} />,
    getParentRoute: () => rootRoute,
    path: `/app/billing/${document}/$recordId/print`
  })
);

const paymentPrintRoute = createRoute({
  component: AppDesk,
  getParentRoute: () => rootRoute,
  path: "/app/billing/payment/$recordId/print"
});

const receiptPrintRoute = createRoute({
  component: AppDesk,
  getParentRoute: () => rootRoute,
  path: "/app/billing/receipt/$recordId/print"
});

const appSplatRoute = createRoute({
  component: AppDesk,
  getParentRoute: () => rootRoute,
  path: "/app/$"
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  workspaceRoute,
  featuresRoute,
  securityRoute,
  blogRoute,
  blogArticleRoute,
  updatesRoute,
  aboutRoute,
  contactRoute,
  privacyRoute,
  termsRoute,
  healthRoute,
  tenantLoginRoute,
  saLoginRoute,
  saRefreshRoute,
  adminLoginRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  saSplatRoute,
  adminRoute,
  adminSplatRoute,
  quotationPrintRoute,
  quotationRecordPrintRoute,
  quotationRoute,
  quotationNewRoute,
  quotationRecordRoute,
  quotationShowRoute,
  quotationEditRoute,
  salesPrintRoute,
  purchasePrintRoute,
  exportSalesPrintRoute,
  ...billingRecordRoutes,
  ...billingRecordPrintRoutes,
  paymentPrintRoute,
  receiptPrintRoute,
  appSplatRoute
]);

export const router = createRouter({
  parseSearch: parseSearchWith((value) => value),
  routeTree,
  stringifySearch: stringifySearchWith(JSON.stringify)
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
