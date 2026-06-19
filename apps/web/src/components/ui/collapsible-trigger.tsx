import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";

const CollapsibleTrigger = ({
  ...props
}: CollapsiblePrimitive.Trigger.Props) => (
  <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />
);

export { CollapsibleTrigger };
