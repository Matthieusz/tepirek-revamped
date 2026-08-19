ALTER TABLE "legendary_items" ALTER COLUMN "equipment_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "legendary_equipment_type";--> statement-breakpoint
CREATE TYPE "legendary_equipment_type" AS ENUM('weapon', 'orb', 'armor', 'helmet', 'boots', 'gloves', 'ring', 'necklace', 'shield');--> statement-breakpoint
ALTER TABLE "legendary_items" ALTER COLUMN "equipment_type" SET DATA TYPE "legendary_equipment_type" USING "equipment_type"::"legendary_equipment_type";