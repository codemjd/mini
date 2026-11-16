export { SparkGameRuntime } from "./game-runtime";
export { createRuntimeSceneFromObjects } from "./project-adapter";
export type { LegacyEditorObject } from "./project-adapter";
export type { SparkSceneDefinition, SparkObjectDefinition, SparkBehavior, SparkObjectKind } from "./model";
export { SparkTimeManager } from "./time-manager";
export { registerSparkMelonPlugins } from "./plugins";

export { preloadSparkAssets, createSparkAnimatedSprite } from './asset-pipeline';
export type { SparkAssetManifest, SparkAtlasAnimations } from './asset-pipeline';
