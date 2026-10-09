import { Fragment } from "react";
import { HouseIcon } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "../../components/breadcrumb";
import { cn } from "../../lib/utils";

export type AppHeaderBreadcrumb = {
  label: string;
  href?: string;
};

export type AppHeaderProps = {
  breadcrumbs: AppHeaderBreadcrumb[];
  homeHref: string;
  name?: string;
  className?: string;
};

export function AppHeader({ breadcrumbs, homeHref, name, className }: AppHeaderProps) {
  return (
    <header
      className={cn(
        "flex min-h-10 shrink-0 items-center justify-between gap-4 border-b bg-background px-4",
        className
      )}
    >
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex-nowrap overflow-hidden">
          <BreadcrumbItem className="shrink-0">
            <BreadcrumbLink aria-label="Go to overview" href={homeHref}>
              <HouseIcon aria-hidden="true" className="size-4" />
            </BreadcrumbLink>
          </BreadcrumbItem>
          {breadcrumbs.map((crumb, index) => (
            <Fragment key={`${crumb.label}-${index}`}>
              <BreadcrumbSeparator className="shrink-0" />
              <BreadcrumbItem className="min-w-0 flex-nowrap">
                {crumb.href ? (
                  <BreadcrumbLink className="truncate" href={crumb.href}>
                    {crumb.label}
                  </BreadcrumbLink>
                ) : index < breadcrumbs.length - 1 ? (
                  <span className="truncate">{crumb.label}</span>
                ) : (
                  <BreadcrumbPage className="truncate font-medium">{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      {name ? (
        <span className="shrink-0 text-sm font-medium text-muted-foreground">{name}</span>
      ) : null}
    </header>
  );
}
