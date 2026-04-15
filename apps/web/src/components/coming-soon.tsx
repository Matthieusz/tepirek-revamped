import { Construction } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ComingSoonProps {
  feature: string;
  description?: string;
}

export const ComingSoon = ({ feature, description }: ComingSoonProps) => (
  <div className="flex h-full items-start justify-center p-8">
    <Card className="w-full max-w-md text-center">
      <CardHeader>
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
          <Construction className="size-8 text-muted-foreground" />
        </div>
        <CardTitle className="text-2xl">{feature}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          {description ?? "Ta funkcja jest w trakcie tworzenia."}
        </p>
      </CardContent>
    </Card>
  </div>
);
