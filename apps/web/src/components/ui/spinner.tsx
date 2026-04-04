import { Loader2 } from "lucide-react";

export function Spinner() {
  return (
    <div className="flex w-full items-center justify-center py-12">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}
