import type { ComponentProps } from "react";

import { AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type MargonemCharacterAvatarImageProps = ComponentProps<typeof AvatarImage>;

/** Shows the top-left frame from Margonem's 4x4 sprite sheet at its natural 4:5 ratio. */
export const MargonemCharacterAvatarImage = ({
  className,
  style,
  ...props
}: MargonemCharacterAvatarImageProps) => (
  <AvatarImage
    {...props}
    className={cn(
      "absolute top-0 left-0 h-[400%] w-[400%] max-w-none rounded-none object-fill",
      className
    )}
    style={style}
  />
);
