import { plugin } from "melonjs";
import { TiledInflatePlugin } from "@melonjs/tiled-inflate-plugin";

let registered=false;

/** Register Spark's selected official melonJS plugins exactly once. */
export function registerSparkMelonPlugins():void {
  if(registered) return;
  plugin.register(TiledInflatePlugin);
  registered=true;
}
