import { Link, useMatches } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export const BreadcrumbNav = () => {
  const matches = useMatches();

  const crumbs = matches
    .map((match) => {
      // Prefer staticData.crumb, fall back to loaderData.crumb for dynamic routes
      const crumb =
        match.staticData?.crumb ??
        (match.loaderData as { crumb?: string } | undefined)?.crumb;
      return crumb ? { path: match.pathname, label: crumb } : null;
    })
    .filter(
      (crumb): crumb is { path: string; label: string } => crumb !== null
    );

  if (crumbs.length === 0) {
    return null;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <BreadcrumbItem key={crumb.path}>
              {index > 0 && <BreadcrumbSeparator />}
              {isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <Link className="breadcrumb-link" to={crumb.path}>
                  {crumb.label}
                </Link>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
