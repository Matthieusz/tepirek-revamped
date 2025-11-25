import { Link } from "@tanstack/react-router";
import FuzzyText from "./FuzzyText";

export default function NotFound() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2">
      <FuzzyText baseIntensity={0.2} fontSize={158}>
        404
      </FuzzyText>
      <FuzzyText baseIntensity={0.1} fontSize={30}>
        Strona nie istnieje
      </FuzzyText>
      <Link className="mt-12" to="/dashboard">
        <FuzzyText baseIntensity={0.1} fontSize={18}>
          Wróć do głównej strony
        </FuzzyText>
      </Link>
    </div>
  );
}
