import { input } from "melonjs";
import type { SparkInputState, SparkSceneDefinition } from "./model";
import { SparkMelonRenderer } from "./melon-renderer";
import { SparkRuntimeWorld } from "./world";

const INPUT_BINDINGS:Array<[number,string,boolean?]>=[
 [input.KEY.LEFT,"spark-left"],[input.KEY.A,"spark-left"],
 [input.KEY.RIGHT,"spark-right"],[input.KEY.D,"spark-right"],
 [input.KEY.UP,"spark-up"],[input.KEY.W,"spark-up"],
 [input.KEY.DOWN,"spark-down"],[input.KEY.S,"spark-down"],
 [input.KEY.SPACE,"spark-attack",true],[input.KEY.X,"spark-attack",true]
];

export interface SparkRuntimeCallbacks{onStatus?:(message:string)=>void;onScore?:(score:number,total:number)=>void;onComplete?:()=>void;}

export class SparkGameRuntime{
 readonly world:SparkRuntimeWorld;
 private readonly renderer:SparkMelonRenderer;
 private started=false;
 private disposed=false;
 private inputBound=false;
 constructor(host:HTMLElement,scene:SparkSceneDefinition,private readonly callbacks:SparkRuntimeCallbacks={}){
  this.world=new SparkRuntimeWorld(scene);this.renderer=new SparkMelonRenderer(host,scene,this.world);
 }
 async start():Promise<void>{
  if(this.started||this.disposed)return;
  this.started=true;this.bindInput();
  try{
   await this.renderer.start(deltaMs=>this.frame(deltaMs));
   if(!this.disposed)this.callbacks.onStatus?.("معاينة melonJS جاهزة — لوحة المفاتيح وعصا اللمس ويد التحكم تعمل عبر نظام الإدخال الموحد");
  }catch(error){this.unbindInput();this.started=false;throw error;}
 }
 requestAttack():void{if(!this.disposed)this.world.requestAttack();}
 destroy():void{if(this.disposed)return;this.disposed=true;this.unbindInput();this.renderer.destroy();}
 private bindInput():void{if(this.inputBound)return;for(const [key,action,lock] of INPUT_BINDINGS)input.bindKey(key,action,lock,true);this.inputBound=true;}
 private unbindInput():void{if(!this.inputBound)return;for(const [key] of INPUT_BINDINGS)input.unbindKey(key);this.inputBound=false;}
 private frame(deltaMs:number):void{
  if(this.disposed)return;
  this.world.setInput(this.readMovement());this.world.advance(deltaMs);
  for(const event of this.world.consumeEvents()){
   this.callbacks.onStatus?.(event.message);
   if(event.type==="score"||event.type==="complete")this.callbacks.onScore?.(event.score??this.world.score,event.total??this.world.totalCollectibles);
   if(event.type==="complete"){this.renderer.setBanner("أحسنت! اكتملت الرحلة ✦");this.callbacks.onComplete?.();}
  }
 }
 private readMovement():SparkInputState{
  let x=0,y=0;
  if(input.isKeyPressed("spark-left"))x-=1;
  if(input.isKeyPressed("spark-right"))x+=1;
  if(input.isKeyPressed("spark-up"))y-=1;
  if(input.isKeyPressed("spark-down"))y+=1;
  if(input.isKeyPressed("spark-attack"))this.requestAttack();
  return{x,y};
 }
}
