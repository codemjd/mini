import type { SparkEditorObjectKind } from "./project-document";

export type SparkAssetCategory = "characters" | "enemies" | "environment" | "collectibles";

export interface SparkAssetDefinition {
  id: string;
  name: string;
  description: string;
  category: SparkAssetCategory;
  categoryLabel: string;
  kind: SparkEditorObjectKind;
  icon: string;
  color: string;
  size: number;
}

export const SPARK_ASSETS: readonly SparkAssetDefinition[] = [
  { id: "hero-scout", name: "المستكشف", description: "شخصية سريعة بلون ذهبي", category: "characters", categoryLabel: "شخصيات", kind: "hero", icon: "●", color: "#ffbd59", size: 1.08 },
  { id: "hero-arcane", name: "حارس البلور", description: "شخصية بنفسجية للمغامرات", category: "characters", categoryLabel: "شخصيات", kind: "hero", icon: "✦", color: "#a98bff", size: 1.18 },
  { id: "enemy-slime", name: "وحش الوحل", description: "خصم أخضر للتجربة", category: "enemies", categoryLabel: "أعداء", kind: "enemy", icon: "◆", color: "#71c98b", size: 1.12 },
  { id: "enemy-ember", name: "حارس الجمر", description: "خصم أحمر ثقيل", category: "enemies", categoryLabel: "أعداء", kind: "enemy", icon: "◆", color: "#e86b62", size: 1.25 },
  { id: "crate-wood", name: "صندوق خشبي", description: "عنصر بيئي ثابت", category: "environment", categoryLabel: "بيئة", kind: "crate", icon: "▧", color: "#b8794d", size: 1.08 },
  { id: "crate-moss", name: "صندوق الطحالب", description: "صندوق بلون طبيعي", category: "environment", categoryLabel: "بيئة", kind: "crate", icon: "▧", color: "#729779", size: 1.15 },
  { id: "platform-stone", name: "منصة حجرية", description: "سطح عريض للمشهد", category: "environment", categoryLabel: "بيئة", kind: "platform", icon: "▬", color: "#71859c", size: 1.35 },
  { id: "platform-moss", name: "منصة عشبية", description: "سطح أخضر للمناطق الطبيعية", category: "environment", categoryLabel: "بيئة", kind: "platform", icon: "▬", color: "#5f9b78", size: 1.25 },
  { id: "crystal-blue", name: "بلورة زرقاء", description: "مقتنى لامع قابل للجمع", category: "collectibles", categoryLabel: "مقتنيات", kind: "coin", icon: "✦", color: "#69c8e8", size: 1.15 },
  { id: "crystal-violet", name: "بلورة بنفسجية", description: "مقتنى بلون بنفسجي", category: "collectibles", categoryLabel: "مقتنيات", kind: "coin", icon: "✧", color: "#b89aff", size: 1.2 },
  { id: "crystal-emerald", name: "بلورة زمردية", description: "مقتنى أخضر لامع", category: "collectibles", categoryLabel: "مقتنيات", kind: "coin", icon: "✦", color: "#83d6a4", size: 1.15 },
  { id: "crystal-sun", name: "جوهرة الشمس", description: "مقتنى ذهبي نادر", category: "collectibles", categoryLabel: "مقتنيات", kind: "coin", icon: "✧", color: "#ffd166", size: 1.28 }
];

export function findSparkAsset(id: string): SparkAssetDefinition | undefined {
  return SPARK_ASSETS.find(asset => asset.id === id);
}
