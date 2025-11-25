import { isMatch, Link, useMatches } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export const BreadcrumbNav = () => {
  const matches = useMatches();
  const matchesWithCrumbs = matches.filter((match) =>
    isMatch(match, "loaderData.crumb")
  );

  const items = matchesWithCrumbs.map(({ pathname, loaderData }) => ({
    href: pathname,
    label: loaderData?.crumb,
  }));

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => (
          <BreadcrumbItem key={item.href}>
            <Link className="breadcrumb-link" to={item.href}>
              {item.label}
            </Link>
            {index < items.length - 1 && <BreadcrumbSeparator />}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
