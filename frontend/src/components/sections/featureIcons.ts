import {
  Baby,
  Building2,
  Droplets,
  Flame,
  MapPin,
  School,
  Store,
  Sun,
  type LucideIcon,
} from "lucide-react";

import type { FeatureIcon } from "@/content/site";

export const FEATURE_ICONS: Record<FeatureIcon, LucideIcon> = {
  sun: Sun,
  flame: Flame,
  droplets: Droplets,
  baby: Baby,
  mapPin: MapPin,
  store: Store,
  school: School,
  building: Building2,
};
