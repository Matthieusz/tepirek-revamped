import FuzzyText from "./FuzzyText";

export default function NotFound() {
	return (
		<div className="flex h-full w-full items-center justify-center text-wrap">
			<FuzzyText baseIntensity={0.2}>404</FuzzyText>
		</div>
	);
}
