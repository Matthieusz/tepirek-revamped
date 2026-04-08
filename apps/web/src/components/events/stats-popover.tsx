import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface StatsPopoverProps {
  pointWorth: number | null;
  totalBets: number;
}

export const StatsPopover = ({ pointWorth, totalBets }: StatsPopoverProps) => (
  <Popover>
    <PopoverTrigger
      render={
        <Button size="icon" variant="ghost">
          <Info className="size-4" />
        </Button>
      }
    />
    <PopoverContent className="w-auto p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground text-sm">Obstawienia</span>
          <span className="font-semibold">{totalBets}</span>
        </div>
        {pointWorth !== null && pointWorth > 0 && (
          <div className="flex items-center justify-between gap-6">
            <span className="text-muted-foreground text-sm">
              Wartość punktu
            </span>
            <span className="font-semibold font-mono">{pointWorth} zł/pkt</span>
          </div>
        )}
      </div>
    </PopoverContent>
  </Popover>
);
