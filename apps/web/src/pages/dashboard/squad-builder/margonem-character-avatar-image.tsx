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
    className={cn("rounded-none", className)}
    style={{
      borderRadius: 0,
      height: "400%",
      left: 0,
      maxWidth: "none",
      objectFit: "fill",
      position: "absolute",
      top: 0,
      width: "400%",
      ...style,
    }}
  />
);
