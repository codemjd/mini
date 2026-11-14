import { input, plugin, type Application } from "melonjs";
import { TiledInflatePlugin } from "@melonjs/tiled-inflate-plugin";
import { GamepadPlugin } from "@melonjs/gamepad-plugin";

type DisposablePlugin={destroy?:()=>void;teardown?:()=>Promise<void>};

function disposeNamedPlugin(name:string):void{
 const instance=plugin.cache[name] as DisposablePlugin|undefined;
 if(!instance)return;
 instance.destroy?.();
 if(instance.teardown)void instance.teardown();
 delete plugin.cache[name];
}

export async function registerSparkMelonPlugins(app:Application):Promise<void>{
 if(!plugin.get(TiledInflatePlugin))plugin.register(TiledInflatePlugin,"sparkTiledInflate");
 disposeNamedPlugin("sparkGamepad");
 disposeNamedPlugin("sparkDebug");
 disposeNamedPlugin("sparkCapacitor");
 plugin.register(GamepadPlugin,"sparkGamepad",{
  sticks:[{position:{left:68,bottom:72},radius:56,dpad:true,keys:{
   left:input.KEY.LEFT,right:input.KEY.RIGHT,up:input.KEY.UP,down:input.KEY.DOWN
  }}],
  buttons:[{key:input.KEY.SPACE,label:"هجوم",position:{right:72,bottom:76},radius:36}],
  color:"#fff0cf",opacity:0.48,haptics:14,vibrate:true
 },app);
 if(new URLSearchParams(window.location.search).get("debug")==="1"){
  const {DebugPanelPlugin}=await import("@melonjs/debug-plugin");
  plugin.register(DebugPanelPlugin,"sparkDebug",input.KEY.F1,app);
 }
 const {Capacitor}=await import("@capacitor/core");
 if(Capacitor.isNativePlatform()){
  const {CapacitorPlugin}=await import("@melonjs/capacitor-plugin");
  plugin.register(CapacitorPlugin,"sparkCapacitor",{pauseAudio:true});
 }
}

export function disposeSparkMelonPlugins():void{
 disposeNamedPlugin("sparkGamepad");
 disposeNamedPlugin("sparkDebug");
 disposeNamedPlugin("sparkCapacitor");
}
