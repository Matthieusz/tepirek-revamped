import { Construction } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ComingSoonProps = {
  feature: string;
  description?: string;
};

export function ComingSoon({ feature, description }: ComingSoonProps) {
  return (
    <div className="flex h-full items-start p-8">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <Construction className="size-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">{feature}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {description ??
              "Ta funkcja jest w trakcie tworzenia. Wróć wkrótce!"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
