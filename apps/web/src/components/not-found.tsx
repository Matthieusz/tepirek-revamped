import { Link } from "@tanstack/react-router";

export default function NotFound() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2">
      <Link className="mt-12" to="/dashboard">
        Wróć do głównej strony
      </Link>
    </div>
  );
}
