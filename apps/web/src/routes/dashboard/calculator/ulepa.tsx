import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type Rarity = "zwykły" | "unikatowy" | "heroiczny" | "ulepszony" | "legendarny";

interface RarityFactor {
	upgradeRarityFactor: number;
	upgradeGoldFactor: number;
}

const rarityFactors: Record<Rarity, RarityFactor> = {
	zwykły: { upgradeRarityFactor: 1, upgradeGoldFactor: 1 },
	unikatowy: { upgradeRarityFactor: 10, upgradeGoldFactor: 10 },
	heroiczny: { upgradeRarityFactor: 100, upgradeGoldFactor: 30 },
	ulepszony: { upgradeRarityFactor: -1, upgradeGoldFactor: 40 },
	legendarny: { upgradeRarityFactor: 1000, upgradeGoldFactor: 60 },
};

const upgradeLevelFactors = [0.0, 1.0, 2.1, 3.4, 5.0, 7.0];

function calculateUpgradePoints(lvl: number, rarity: Rarity): number[] {
	const factors = rarityFactors[rarity];
	if (!factors) {
		throw new Error("Nieznana rzadkość przedmiotu");
	}

	const upgradeCosts: number[] = [];

	for (let n = 1; n <= 5; n++) {
		let cost: number;
		if (rarity === "ulepszony") {
			cost = upgradeLevelFactors[n] * (150 * lvl + 27_000);
		} else {
			cost = factors.upgradeRarityFactor * upgradeLevelFactors[n] * (180 + lvl);
		}
		upgradeCosts.push(cost);
	}

	return upgradeCosts;
}

function calculateDifferentialCosts(upgradeCosts: number[]): number[] {
	const differentialCosts: number[] = [];
	for (let i = 0; i < upgradeCosts.length; i++) {
		if (i === 0) {
			differentialCosts.push(upgradeCosts[i]);
		} else {
			differentialCosts.push(upgradeCosts[i] - upgradeCosts[i - 1]);
		}
	}
	return differentialCosts;
}

export const Route = createFileRoute("/dashboard/calculator/ulepa")({
	component: RouteComponent,
	loader: () => ({
		crumb: "Kalkulator ulepy",
	}),
});

function RouteComponent() {
	const [itemLevel, setItemLevel] = useState<number>(280);
	const [itemRarity, setItemRarity] = useState<Rarity>("legendarny");
	const [results, setResults] = useState<{
		differentialCosts: number[];
		totalUpgradeCost: number;
		total75Percent: number;
	} | null>(null);

	const handleCalculate = () => {
		const upgradeCosts = calculateUpgradePoints(itemLevel, itemRarity);
		const differentialCosts = calculateDifferentialCosts(upgradeCosts);
		const totalUpgradeCost = differentialCosts.reduce(
			(sum, cost) => sum + cost,
			0
		);
		const total75Percent = totalUpgradeCost * 0.75;

		setResults({ differentialCosts, totalUpgradeCost, total75Percent });
	};

	return (
		<div className="max-w-xl lg:w-full">
			<h1 className="mb-4 font-bold text-2xl">Kalkulator ulepy</h1>
			<p className="mb-6 text-muted-foreground">
				Oblicz koszty ulepszenia przedmiotu na podstawie poziomu i rzadkości.
			</p>
			<div className="grid gap-4">
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="itemLevel">Poziom przedmiotu</Label>
						<Input
							id="itemLevel"
							onChange={(e) => setItemLevel(Number(e.target.value))}
							type="number"
							value={itemLevel}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="itemRarity">Rzadkość przedmiotu</Label>
						<Select
							onValueChange={(value: Rarity) => setItemRarity(value)}
							value={itemRarity}
						>
							<SelectTrigger id="itemRarity">
								<SelectValue placeholder="Wybierz rzadkość" />
							</SelectTrigger>
							<SelectContent>
								{Object.keys(rarityFactors).map((rarity) => (
									<SelectItem key={rarity} value={rarity}>
										{rarity.charAt(0).toUpperCase() + rarity.slice(1)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
				<Button onClick={handleCalculate}>Oblicz</Button>

				{results && (
					<div className="mt-4 w-[550px] space-y-4">
						<div>
							<h3 className="mb-2 font-semibold">
								Ilość potrzebna do ulepszenia przedmiotu o poziomie {itemLevel}{" "}
								({itemRarity}):
							</h3>
							<ul className="list-inside list-disc">
								{results.differentialCosts.map((cost, index) => (
									<li key={`upgrade-cost-${itemLevel}-${itemRarity}-${cost}`}>
										+{index + 1}: {cost.toLocaleString()} punktów ulepszenia
									</li>
								))}
							</ul>
						</div>
						<div>
							<h3 className="mb-2 font-semibold">Ekstrakcja:</h3>
							<p>
								Normalna (75%): {results.total75Percent.toLocaleString()}{" "}
								punktów ulepszenia
							</p>
							<p>
								Całkowita (100%): {results.totalUpgradeCost.toLocaleString()}{" "}
								punktów ulepszenia
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
