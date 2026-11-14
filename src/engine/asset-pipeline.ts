import { loader, Sprite, TextureAtlas } from "melonjs";

export type SparkAssetManifest=Parameters<typeof loader.preload>[0];
export interface SparkAtlasAnimations{[name:string]:string[];}

export async function preloadSparkAssets(assets:SparkAssetManifest):Promise<void>{
 await loader.preload(assets,undefined,false);
}

export function createSparkAnimatedSprite(
 x:number,y:number,atlasJsonKey:string,atlasImageKey:string,
 animations:SparkAtlasAnimations,initialAnimation:string,frameDelayMs=100
):Sprite{
 const atlas=new TextureAtlas(loader.getJSON(atlasJsonKey),loader.getImage(atlasImageKey));
 const frames=[...new Set(Object.values(animations).flat())];
 if(frames.length===0)throw new Error("Spark atlas animation list is empty");
 const settings=atlas.getAnimationSettings(frames);
 const sprite=new Sprite(x,y,{...settings,image:atlas,anchorPoint:{x:0.5,y:0.5}});
 for(const [name,sequence] of Object.entries(animations))if(sequence.length)sprite.addAnimation(name,sequence,frameDelayMs);
 if(!animations[initialAnimation])throw new Error("Unknown initial Spark animation: "+initialAnimation);
 sprite.setCurrentAnimation(initialAnimation);
 return sprite;
}
