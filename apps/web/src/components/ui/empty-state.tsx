import type { ReactElement } from "react";

import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  icon: ReactElement;
  message: string;
  className?: string;
}

export const EmptyState = ({ icon, message, className }: EmptyStateProps) => (
  <Card className={className}>
    <CardContent className="py-8">
      <div className="text-center">
        <div className="text-muted-foreground [&>svg]:mx-auto [&>svg]:size-8">
          {icon}
        </div>
        <p className="text-muted-foreground mt-2 text-sm">{message}</p>
      </div>
    </CardContent>
  </Card>
);
