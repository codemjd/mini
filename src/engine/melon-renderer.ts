import { Application, Rect, Renderable, Text } from "melonjs";
import type { RuntimeActor, SparkSceneDefinition } from "./model";
import type { SparkRuntimeWorld } from "./world";
import { disposeSparkMelonPlugins, registerSparkMelonPlugins } from "./plugins";

type MelonRenderer = Parameters<Renderable["draw"]>[0];
type MelonWorld = Application["world"];

class SparkBackground extends Renderable {
  constructor(width:number,height:number,private readonly theme:SparkSceneDefinition["background"]) {
    super(0,0,width,height); this.anchorPoint.set(0,0); this.name="spark-background";
  }
  draw(renderer:MelonRenderer):void {
    const x=this.pos.x,y=this.pos.y;
    const palettes:Record<SparkSceneDefinition["background"],string[]> = {
      "crystal-garden":["#102f3b","#1a4650","#1c514a","#245c4d","#2b6a58","#347765"],
      "sunset-ruins":["#33263e","#62394f","#8c4d4c","#985b49","#b66a4b","#d28c59"],
      "frost-cavern":["#10253f","#183e62","#23577b","#2b6a8c","#357b9c","#4a9bb0"],
      "desert-dunes":["#4a382c","#75513a","#98704a","#a47d4c","#b78c54","#c99e60"]
    };
    const colors=palettes[this.theme];
    renderer.save();
    renderer.setColor(colors[0]); renderer.fillRect(x,y,this.width,this.height);
    renderer.setColor(colors[1]); renderer.fillEllipse(x+145,y+90,220,110);
    renderer.setColor(colors[2]); renderer.fillEllipse(x+640,y+355,260,125);
    renderer.setColor(colors[3]); renderer.fillEllipse(x+400,y+225,310,155);
    renderer.setColor(colors[4]); renderer.fillEllipse(x+120,y+390,145,75);
    renderer.setColor(colors[5]); renderer.fillEllipse(x+730,y+85,115,60);
    renderer.setColor("rgba(255,255,255,0.07)");
    for(let i=0;i<13;i++){
      const sx=x+36+(i*67)%Math.max(1,this.width-72);
      const sy=y+52+(i*91)%Math.max(1,this.height-104);
      renderer.fillEllipse(sx,sy,2+(i%3),2+(i%3));
    }
    renderer.setColor("rgba(4,20,29,0.24)"); renderer.fillRect(x,y,this.width,14);
    renderer.restore();
  }
}

class SparkActorRenderable extends Renderable {
  actor:RuntimeActor;
  constructor(actor:RuntimeActor,private readonly world:SparkRuntimeWorld) {
    const radius=SparkActorRenderable.radius(actor);
    super(actor.x-radius,actor.y-radius,radius*2,radius*2);
    this.actor=actor; this.anchorPoint.set(0,0); this.name=actor.id;
    // Sensor bodies let melonJS own SAT broadphase/contact events without
    // letting the physics solver overwrite Spark's authoritative positions.
    this.bodyDef={
      type:"kinematic",
      shapes:[new Rect(0,0,radius*2,radius*2)],
      isSensor:true,gravityScale:0,fixedRotation:true
    };
  }
  static radius(actor:RuntimeActor):number {
    return Math.max(10,actor.size*(actor.kind==="coin"?15:20));
  }
  onCollisionActive(_response:unknown,other:Renderable):void {
    if(other.name) this.world.setPhysicsContact(this.actor.id,other.name,true);
  }
  onCollisionEnd(_response:unknown,other:Renderable):void {
    if(other.name) this.world.setPhysicsContact(this.actor.id,other.name,false);
  }
  sync(actor:RuntimeActor):void {
    this.actor=actor;
    const radius=SparkActorRenderable.radius(actor);
    this.setSize(radius*2,radius*2);
    this.setPosition(actor.x-radius,actor.y-radius);
    this.isDirty=true;
  }
  draw(renderer:MelonRenderer):void {
    const a=this.actor,x=this.pos.x,y=this.pos.y,baseRadius=this.width/2;
    const motion=a.motion ?? "idle";
    const phase=a.animationTime/1000;
    const pulse=motion==="pulse" ? 1+Math.sin(phase*3.5)*0.09 : 1;
    const bob=motion==="float" ? Math.sin(phase*2.4+a.x)*5 : motion==="bounce" ? -Math.abs(Math.sin(phase*3.2+a.y))*7 : 0;
    const sway=motion==="wobble" ? Math.sin(phase*4.5+a.x)*2.5 : 0;
    const r=baseRadius*pulse,cx=x+baseRadius+sway,cy=y+baseRadius+bob;
    renderer.save();
    if(a.kind==="coin"){
      const pulse=1+Math.sin(a.animationTime/170)*0.08;
      renderer.setColor("rgba(0,0,0,0.25)"); renderer.fillEllipse(cx,cy+9,r*1.15,5);
      renderer.setColor("rgba(255,207,68,0.16)"); renderer.fillEllipse(cx,cy,r*1.35*pulse,r*1.35*pulse);
      renderer.setColor("#ffcf45"); renderer.fillEllipse(cx,cy,r*0.68*pulse,r*pulse);
      renderer.setColor("#fff5b5");
      renderer.strokeLine(cx,cy-r*0.62,cx+r*0.35,cy);
      renderer.strokeLine(cx+r*0.35,cy,cx,cy+r*0.62);
      renderer.strokeLine(cx,cy+r*0.62,cx-r*0.35,cy);
      renderer.strokeLine(cx-r*0.35,cy,cx,cy-r*0.62);
    } else if(a.kind==="crate"){
      renderer.setColor("rgba(0,0,0,0.25)"); renderer.fillEllipse(cx,cy+r*0.72,r*0.95,5);
      renderer.setColor("#754b38"); renderer.fillRect(cx-r*0.85,cy-r*0.72,r*1.7,r*1.45);
      renderer.setColor(a.color); renderer.fillRect(cx-r*0.72,cy-r*0.62,r*1.44,r*1.25);
      renderer.setColor("#f5c58b"); renderer.strokeRect(cx-r*0.55,cy-r*0.45,r*1.1,r*0.9);
      renderer.strokeLine(cx-r*0.55,cy-r*0.45,cx+r*0.55,cy+r*0.45);
      renderer.strokeLine(cx+r*0.55,cy-r*0.45,cx-r*0.55,cy+r*0.45);
    } else if(a.kind==="platform"){
      renderer.setColor("rgba(0,0,0,0.22)"); renderer.fillRect(cx-r,cy-r*0.2,r*2,r*0.85);
      renderer.setColor("#31596a"); renderer.fillRect(cx-r,cy-r*0.35,r*2,r*0.7);
      renderer.setColor(a.color); renderer.fillRect(cx-r*0.9,cy-r*0.42,r*1.8,r*0.38);
      renderer.setColor("rgba(255,255,255,0.3)"); renderer.strokeLine(cx-r*0.65,cy-r*0.18,cx+r*0.65,cy-r*0.18);
    } else {
      const hero=a.kind==="hero",bodyColor=hero?a.color:"#dc785e";
      const breathe=1+Math.sin(a.animationTime/(hero?310:260))*0.018;
      renderer.setColor("rgba(0,0,0,0.28)"); renderer.fillEllipse(cx,cy+r*0.72,r*0.95,7);
      renderer.setColor(hero?"#9a6637":"#743e45"); renderer.fillEllipse(cx,cy+r*0.08,r*0.82,r*0.88);
      renderer.setColor(bodyColor); renderer.fillEllipse(cx,cy-r*0.08,r*0.76*breathe,r*0.78/breathe);
      renderer.setColor(hero?"#ffe0a0":"#ffc2a6"); renderer.fillEllipse(cx-r*0.2,cy-r*0.43,r*0.22,r*0.2);
      renderer.setColor("#20343d"); renderer.fillEllipse(cx-r*0.22,cy-r*0.1,2.3,3.1); renderer.fillEllipse(cx+r*0.22,cy-r*0.1,2.3,3.1);
      renderer.setColor("rgba(255,255,255,0.42)"); renderer.strokeEllipse(cx,cy-r*0.08,r*0.76,r*0.78);
      if(a.hitFlashMs>0){renderer.setColor("rgba(255,255,255,0.55)");renderer.fillEllipse(cx,cy-r*0.08,r*0.78,r*0.8);}
      if(a.kind==="enemy"||a.kind==="hero"){
        const ratio=Math.max(0,Math.min(1,a.health/Math.max(1,a.maximumHealth)));
        renderer.setColor("rgba(7,20,25,0.8)"); renderer.fillRect(cx-r,cy-r-13,r*2,5);
        renderer.setColor(ratio>0.55?"#63e6a3":ratio>0.25?"#f4c65c":"#f47768");
        renderer.fillRect(cx-r+1,cy-r-12,(r*2-2)*ratio,3);
      }
    }
    renderer.restore();
  }
}

class SparkRuntimeDriver extends Renderable {
  constructor(
    private readonly world:SparkRuntimeWorld,
    private readonly sceneWorld:MelonWorld,
    private readonly views:Map<string,SparkActorRenderable>,
    private readonly hud:Text,
    private readonly onFrame:(deltaMs:number)=>void
  ){super(0,0,1,1);this.alwaysUpdate=true;this.anchorPoint.set(0,0);this.name="spark-runtime-driver";}
  update(dt:number):boolean {
    this.onFrame(dt);
    const alive=new Set(this.world.getAliveActors().map(actor=>actor.id));
    for(const [id,view] of this.views) if(!alive.has(id)){this.sceneWorld.removeChild(view);this.views.delete(id);}
    for(const actor of this.world.getAliveActors()) this.views.get(actor.id)?.sync(actor);
    const hero=this.world.actors.find(actor=>actor.kind==="hero");
    this.hud.setText("البلورات  "+this.world.score+" / "+this.world.totalCollectibles+"     •     صحة البطل  "+Math.round(hero?.health??0)+"     •     تلامس "+this.world.getPhysicsContactCount());
    return true;
  }
  draw(_renderer:MelonRenderer):void{}
}

export class SparkMelonRenderer {
  private app:Application|null=null;
  private title:Text|null=null;
  private destroyed=false;
  constructor(private readonly host:HTMLElement,private readonly scene:SparkSceneDefinition,private readonly world:SparkRuntimeWorld){}
  async start(onFrame:(deltaMs:number)=>void):Promise<void>{
    if(this.destroyed)return;
    const app=new Application(this.scene.width,this.scene.height,{parent:this.host,scale:"auto",scaleMethod:"fit",backgroundColor:"#102f3b"});
    await app.init();
    if(this.destroyed){app.destroy(true);return;}
    this.app=app;
    await registerSparkMelonPlugins(app);
    app.canvas.className="spark-preview-canvas";
    app.canvas.setAttribute("aria-label","معاينة اللعبة بمحرك melonJS");
    app.canvas.dataset.sparkEngine="melonjs";
    Object.assign(app.canvas.style,{position:"absolute",inset:"0",width:"100%",height:"100%",zIndex:"4",pointerEvents:"auto",touchAction:"none"});
    this.host.dataset.sparkInput="melonjs-gamepad-plugin";
    app.world.sortOn="z";
    app.world.addChild(new SparkBackground(this.scene.width,this.scene.height,this.scene.background),0);
    this.title=new Text(this.scene.width/2,13,{font:"Tahoma, Arial, sans-serif",size:18,fillStyle:"#fff3d2",strokeStyle:"#173b3d",lineWidth:4,textAlign:"center",textBaseline:"top",text:"✦  رحلة البلورات  ✦"});
    app.world.addChild(this.title,1000);
    const hud=new Text(18,17,{font:"Tahoma, Arial, sans-serif",size:15,fillStyle:"#fff3d2",strokeStyle:"#173b3d",lineWidth:3,textAlign:"left",textBaseline:"top",text:"البلورات  0 / "+this.world.totalCollectibles});
    app.world.addChild(hud,1001);
    const views=new Map<string,SparkActorRenderable>();
    for(const actor of this.world.getAliveActors()){const view=new SparkActorRenderable(actor,this.world);views.set(actor.id,view);app.world.addChild(view,10+views.size);}
    app.world.addChild(new SparkRuntimeDriver(this.world,app.world,views,hud,onFrame),2);
  }
  setBanner(message:string):void{this.title?.setText(message);}
  destroy():void{
    this.destroyed=true;disposeSparkMelonPlugins();this.app?.destroy(true);this.app=null;this.title=null;delete this.host.dataset.sparkInput;
  }
}
