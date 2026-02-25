import { Clock, Construction, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ComingSoonProps {
  feature: string;
  description?: string;
}

export function ComingSoon({ feature, description }: ComingSoonProps) {
  return (
    <div className="flex h-full items-start justify-center p-8">
      <Card className="group relative w-full max-w-md overflow-hidden text-center">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-primary/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        {/* Floating sparkles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Sparkles className="absolute top-4 left-4 h-4 w-4 animate-bounce text-primary/30 [animation-delay:100ms]" />
          <Sparkles className="absolute top-8 right-8 h-3 w-3 animate-bounce text-primary/20 [animation-delay:300ms]" />
          <Sparkles className="absolute bottom-8 left-8 h-5 w-5 animate-bounce text-primary/25 [animation-delay:500ms]" />
        </div>

        <CardHeader className="relative z-10">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/5">
            <Construction className="size-8 animate-pulse text-primary" />
          </div>
          <CardTitle className="text-2xl">{feature}</CardTitle>
        </CardHeader>

        <CardContent className="relative z-10 space-y-4">
          <p className="text-muted-foreground">
            {description ??
              "Ta funkcja jest w trakcie tworzenia. Wróć wkrótce!"}
          </p>

          <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs">
            <Clock className="h-3 w-3" />
            <span>W przygotowaniu</span>
          </div>

          {/* Animated dots */}
          <div className="flex justify-center gap-1">
            <div className="size-2 animate-bounce rounded-full bg-primary/60 [animation-delay:0ms]" />
            <div className="size-2 animate-bounce rounded-full bg-primary/60 [animation-delay:150ms]" />
            <div className="size-2 animate-bounce rounded-full bg-primary/60 [animation-delay:300ms]" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
