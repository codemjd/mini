import { Application, Renderable, Text } from "melonjs";
import type { RuntimeActor, SparkSceneDefinition } from "./model";
import type { SparkRuntimeWorld } from "./world";

type MelonRenderer = Parameters<Renderable["draw"]>[0];
type MelonWorld = Application["world"];

class SparkBackground extends Renderable {
  constructor(width:number,height:number) {
    super(0,0,width,height);
    this.anchorPoint.set(0,0);
    this.name = "spark-background";
  }

  draw(renderer:MelonRenderer):void {
    const x=this.pos.x, y=this.pos.y;
    renderer.save();
    renderer.setColor("#102f3b");
    renderer.fillRect(x,y,this.width,this.height);
    renderer.setColor("#1a4650");
    renderer.fillEllipse(x+145,y+90,220,110);
    renderer.setColor("#1c514a");
    renderer.fillEllipse(x+640,y+355,260,125);
    renderer.setColor("#245c4d");
    renderer.fillEllipse(x+400,y+225,310,155);
    renderer.setColor("#2b6a58");
    renderer.fillEllipse(x+120,y+390,145,75);
    renderer.setColor("#347765");
    renderer.fillEllipse(x+730,y+85,115,60);
    renderer.setColor("rgba(255,255,255,0.07)");
    for(let i=0;i<13;i++){
      const sx=x+36+(i*67)%Math.max(1,this.width-72);
      const sy=y+52+(i*91)%Math.max(1,this.height-104);
      renderer.fillEllipse(sx,sy,2+(i%3),2+(i%3));
    }
    renderer.setColor("rgba(4,20,29,0.24)");
    renderer.fillRect(x,y,this.width,14);
    renderer.restore();
  }
}

class SparkActorRenderable extends Renderable {
  actor:RuntimeActor;

  constructor(actor:RuntimeActor) {
    const radius=SparkActorRenderable.radius(actor);
    super(actor.x-radius,actor.y-radius,radius*2,radius*2);
    this.actor=actor;
    this.anchorPoint.set(0,0);
    this.name=actor.id;
  }

  static radius(actor:RuntimeActor):number {
    return Math.max(10,actor.size*(actor.kind==="coin"?15:20));
  }

  sync(actor:RuntimeActor):void {
    this.actor=actor;
    const radius=SparkActorRenderable.radius(actor);
    this.setSize(radius*2,radius*2);
    this.setPosition(actor.x-radius,actor.y-radius);
    this.isDirty=true;
  }

  draw(renderer:MelonRenderer):void {
    const a=this.actor, x=this.pos.x, y=this.pos.y, r=this.width/2;
    const cx=x+r, cy=y+r;
    renderer.save();

    if(a.kind==="coin"){
      const pulse=1+Math.sin(a.animationTime/170)*0.08;
      renderer.setColor("rgba(0,0,0,0.25)");
      renderer.fillEllipse(cx,cy+9,r*1.15,5);
      renderer.setColor("rgba(255,207,68,0.16)");
      renderer.fillEllipse(cx,cy,r*1.35*pulse,r*1.35*pulse);
      renderer.setColor("#ffcf45");
      renderer.beginPath();
      renderer.moveTo(cx,cy-r*pulse);
      renderer.lineTo(cx+r*0.68*pulse,cy);
      renderer.lineTo(cx,cy+r*pulse);
      renderer.lineTo(cx-r*0.68*pulse,cy);
      renderer.closePath();
      renderer.fill();
      renderer.setColor("#fff5b5");
      renderer.strokeLine(cx,cy-r*0.62,cx+r*0.35,cy);
    } else if(a.kind==="crate"){
      renderer.setColor("rgba(0,0,0,0.25)");
      renderer.fillEllipse(cx,cy+r*0.72,r*0.95,5);
      renderer.setColor("#754b38");
      renderer.fillRoundRect(cx-r*0.85,cy-r*0.72,r*1.7,r*1.45,7);
      renderer.setColor(a.color);
      renderer.fillRoundRect(cx-r*0.72,cy-r*0.62,r*1.44,r*1.25,5);
      renderer.setColor("#f5c58b");
      renderer.strokeRect(cx-r*0.55,cy-r*0.45,r*1.1,r*0.9);
      renderer.strokeLine(cx-r*0.55,cy-r*0.45,cx+r*0.55,cy+r*0.45);
      renderer.strokeLine(cx+r*0.55,cy-r*0.45,cx-r*0.55,cy+r*0.45);
    } else if(a.kind==="platform"){
      renderer.setColor("rgba(0,0,0,0.22)");
      renderer.fillRoundRect(cx-r,cy-r*0.2,r*2,r*0.85,8);
      renderer.setColor("#31596a");
      renderer.fillRoundRect(cx-r,cy-r*0.35,r*2,r*0.7,8);
      renderer.setColor(a.color);
      renderer.fillRoundRect(cx-r*0.9,cy-r*0.42,r*1.8,r*0.38,6);
      renderer.setColor("rgba(255,255,255,0.3)");
      renderer.strokeLine(cx-r*0.65,cy-r*0.18,cx+r*0.65,cy-r*0.18);
    } else {
      const hero=a.kind==="hero";
      const bodyColor=hero?a.color:"#dc785e";
      renderer.setColor("rgba(0,0,0,0.28)");
      renderer.fillEllipse(cx,cy+r*0.72,r*0.95,7);
      renderer.setColor(hero?"#9a6637":"#743e45");
      renderer.fillEllipse(cx,cy+r*0.08,r*0.82,r*0.88);
      renderer.setColor(bodyColor);
      renderer.fillEllipse(cx,cy-r*0.08,r*0.76,r*0.78);
      renderer.setColor(hero?"#ffe0a0":"#ffc2a6");
      renderer.fillEllipse(cx-r*0.2,cy-r*0.43,r*0.22,r*0.2);
      renderer.setColor("#20343d");
      renderer.fillEllipse(cx-r*0.22,cy-r*0.1,2.3,3.1);
      renderer.fillEllipse(cx+r*0.22,cy-r*0.1,2.3,3.1);
      renderer.setColor("rgba(255,255,255,0.42)");
      renderer.strokeEllipse(cx,cy-r*0.08,r*0.76,r*0.78);
      if(a.hitFlashMs>0){
        renderer.setColor("rgba(255,255,255,0.55)");
        renderer.fillEllipse(cx,cy-r*0.08,r*0.78,r*0.8);
      }
      if(a.kind==="enemy" || a.kind==="hero"){
        const ratio=Math.max(0,Math.min(1,a.health/Math.max(1,a.maximumHealth)));
        renderer.setColor("rgba(7,20,25,0.8)");
        renderer.fillRoundRect(cx-r,cy-r-13,r*2,5,3);
        renderer.setColor(ratio>0.55?"#63e6a3":ratio>0.25?"#f4c65c":"#f47768");
        renderer.fillRoundRect(cx-r+1,cy-r-12,(r*2-2)*ratio,3,2);
      }
    }
    renderer.restore();
  }
}

class SparkRuntimeDriver extends Renderable {
  private readonly views:Map<string,SparkActorRenderable>;
  private readonly world:SparkRuntimeWorld;
  private readonly sceneWorld:MelonWorld;
  private readonly hud:Text;
  private readonly onFrame:(deltaMs:number)=>void;

  constructor(world:SparkRuntimeWorld,sceneWorld:MelonWorld,views:Map<string,SparkActorRenderable>,hud:Text,onFrame:(deltaMs:number)=>void) {
    super(0,0,1,1);
    this.world=world;
    this.sceneWorld=sceneWorld;
    this.views=views;
    this.hud=hud;
    this.onFrame=onFrame;
    this.alwaysUpdate=true;
    this.anchorPoint.set(0,0);
    this.name="spark-runtime-driver";
  }

  update(dt:number):boolean {
    this.onFrame(dt);
    const alive=new Set(this.world.getAliveActors().map(actor=>actor.id));
    for(const [id,view] of this.views){
      if(!alive.has(id)){
        this.sceneWorld.removeChild(view);
        this.views.delete(id);
      }
    }
    for(const actor of this.world.getAliveActors()){
      this.views.get(actor.id)?.sync(actor);
    }
    const hero=this.world.actors.find(actor=>actor.kind==="hero");
    this.hud.setText("البلورات  "+this.world.score+" / "+this.world.totalCollectibles+"     •     صحة البطل  "+Math.round(hero?.health??0));
    return true;
  }

  draw(_renderer:MelonRenderer):void {}
}

export class SparkMelonRenderer {
  private app:Application|null=null;
  private title:Text|null=null;
  private destroyed=false;

  constructor(private readonly host:HTMLElement,private readonly scene:SparkSceneDefinition,private readonly world:SparkRuntimeWorld) {}

  async start(onFrame:(deltaMs:number)=>void):Promise<void> {
    if(this.destroyed) return;
    const app=new Application(this.scene.width,this.scene.height,{
      parent:this.host,
      scale:"auto",
      scaleMethod:"fit",
      backgroundColor:"#102f3b"
    });
    await app.init();
    if(this.destroyed){
      app.destroy(true);
      return;
    }
    this.app=app;
    app.canvas.className="spark-preview-canvas";
    app.canvas.setAttribute("aria-label","معاينة اللعبة بمحرك melonJS");
    Object.assign(app.canvas.style,{
      position:"absolute",inset:"0",width:"100%",height:"100%",
      zIndex:"4",pointerEvents:"none"
    });
    app.world.sortOn="z";
    app.world.addChild(new SparkBackground(this.scene.width,this.scene.height),0);

    this.title=new Text(this.scene.width/2,13,{
      font:"Tahoma, Arial, sans-serif",size:18,fillStyle:"#fff3d2",
      strokeStyle:"#173b3d",lineWidth:4,textAlign:"center",textBaseline:"top",
      text:"✦  رحلة البلورات  ✦"
    });
    app.world.addChild(this.title,1000);

    const hud=new Text(18,17,{
      font:"Tahoma, Arial, sans-serif",size:15,fillStyle:"#fff3d2",
      strokeStyle:"#173b3d",lineWidth:3,textAlign:"left",textBaseline:"top",
      text:"البلورات  0 / "+this.world.totalCollectibles
    });
    app.world.addChild(hud,1001);

    const views=new Map<string,SparkActorRenderable>();
    for(const actor of this.world.getAliveActors()){
      const view=new SparkActorRenderable(actor);
      views.set(actor.id,view);
      app.world.addChild(view,10+views.size);
    }
    app.world.addChild(new SparkRuntimeDriver(this.world,app.world,views,hud,onFrame),2);
  }

  setBanner(message:string):void {
    this.title?.setText(message);
  }

  destroy():void {
    this.destroyed=true;
    this.app?.destroy(true);
    this.app=null;
    this.title=null;
  }
}
