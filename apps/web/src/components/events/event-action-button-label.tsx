interface EventActionButtonLabelProps {
  actionPending: boolean;
  actionType: "delete" | "toggle" | undefined;
  active: boolean;
}

export const EventActionButtonLabel = ({
  actionPending,
  actionType,
  active,
}: EventActionButtonLabelProps) => {
  if (actionPending) {
    return "Przetwarzanie...";
  }

  if (actionType === "delete") {
    return "Usuń";
  }

  return active ? "Dezaktywuj" : "Aktywuj";
};
