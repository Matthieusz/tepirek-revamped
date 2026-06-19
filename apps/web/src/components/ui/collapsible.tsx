import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";

const Collapsible = ({ ...props }: CollapsiblePrimitive.Root.Props) => (
  <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
);

export { Collapsible };
