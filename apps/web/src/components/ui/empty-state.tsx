import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  message,
  className,
}: EmptyStateProps) => (
  <Card className={className}>
    <CardContent className="py-8">
      <div className="text-center">
        <Icon className="text-muted-foreground mx-auto size-8" />
        <p className="text-muted-foreground mt-2 text-sm">{message}</p>
      </div>
    </CardContent>
  </Card>
);
