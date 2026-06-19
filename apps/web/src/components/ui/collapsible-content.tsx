import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";

const CollapsibleContent = ({ ...props }: CollapsiblePrimitive.Panel.Props) => (
  <CollapsiblePrimitive.Panel data-slot="collapsible-content" {...props} />
);

export { CollapsibleContent };
