import { Activity as ActivityIcon, Bike, Dumbbell, Footprints, Leaf, Moon, Waves, type LucideIcon } from "lucide-react";
import type { PlanType } from "@/types";
import { DISCIPLINES } from "@/lib/training/disciplines";
import { cn } from "@/lib/utils";

export const DISCIPLINE_ICONS: Record<PlanType, LucideIcon> = {
  swim: Waves,
  bike: Bike,
  run: Footprints,
  strength: Dumbbell,
  recovery: Leaf,
  other: ActivityIcon,
  rest: Moon,
};

/** Round tinted badge with the discipline icon. Colour is always paired with an icon or label. */
export function DisciplineBadge({ type, size = "md", className }: { type: PlanType; size?: "sm" | "md" | "lg"; className?: string }) {
  const Icon = DISCIPLINE_ICONS[type];
  const color = DISCIPLINES[type].colorVar;
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full",
        size === "sm" && "size-7 [&_svg]:size-3.5",
        size === "md" && "size-9 [&_svg]:size-4",
        size === "lg" && "size-11 [&_svg]:size-5",
        className,
      )}
      style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, white)`, color: `color-mix(in srgb, ${color} 78%, #202720)` }}
    >
      <Icon strokeWidth={1.9} />
    </span>
  );
}

export function DisciplineDot({ type, className }: { type: PlanType; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full", className)} style={{ backgroundColor: DISCIPLINES[type].colorVar }} />;
}
