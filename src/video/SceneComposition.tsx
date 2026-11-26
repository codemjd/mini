import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { CSSProperties, FC, ReactNode } from "react";
import type { Scene } from "../types/project";

const C = {
  ink: "#0b1222",
  panel: "rgba(18,29,49,.82)",
  mint: "#78ead7",
  violet: "#a99bff",
  gold: "#ffc98d",
  white: "#f5f7ff",
  muted: "#aab8cc"
};

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const rise = (frame: number, delay = 0, distance = 34) => ({
  opacity: interpolate(frame, [delay, delay + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }),
  transform: `translate3d(0,${interpolate(frame, [delay, delay + 18], [distance, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease })}px,0)`
});

const Glass: FC<{ children: ReactNode; style?: CSSProperties }> = ({ children, style }) => (
  <div style={{ border: "1px solid rgba(190,211,245,.14)", borderRadius: 28, background: "linear-gradient(145deg,rgba(25,40,66,.88),rgba(12,20,36,.76))", boxShadow: "0 32px 90px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.055)", ...style }}>{children}</div>
);

const DotField: FC<{ frame: number }> = ({ frame }) => (
  <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0, opacity: .35 }}>
    {Array.from({ length: 12 }, (_, i) => <circle key={i} cx={150 + i * 150} cy={110 + (i % 3) * 370} r={2 + (i % 3)} fill={i % 2 ? C.mint : C.violet} opacity={.35 + .25 * Math.sin((frame + i * 13) / 18)} />)}
    <path d="M0 820 C420 700 530 1000 970 820 S1530 680 1920 790" stroke="rgba(120,234,215,.12)" strokeWidth="2" fill="none" />
  </svg>
);

const Diagram: FC<{ frame: number }> = ({ frame }) => {
  const labels = ["تقسيم", "توجيه", "استقبال"];
  const colors = [C.mint, C.violet, C.gold];
  return (
    <Glass style={{ position: "absolute", left: "7%", top: "18%", width: "47%", height: "62%", padding: "4.2% 3.2%" }}>
      <div style={{ color: C.muted, fontSize: 19, letterSpacing: 4, textAlign: "left" }}>DATA FLOW / 03 STEPS</div>
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", height: "76%", direction: "rtl" }}>
        <div style={{ position: "absolute", top: "42%", left: "13%", right: "13%", height: 3, background: "linear-gradient(90deg,rgba(120,234,215,.2),rgba(169,155,255,.8),rgba(255,201,141,.2))" }} />
        {labels.map((label, i) => {
          const p = interpolate(frame, [i * 9, i * 9 + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
          return <div key={label} style={{ zIndex: 1, width: "27%", display: "flex", flexDirection: "column", alignItems: "center", gap: 22, opacity: p, transform: `translateY(${(1-p)*28}px)` }}>
            <div style={{ width: 116, height: 116, borderRadius: 30, border: `1px solid ${colors[i]}88`, background: `linear-gradient(145deg,${colors[i]}30,rgba(12,20,36,.9))`, boxShadow: `0 0 42px ${colors[i]}22`, display: "grid", placeItems: "center" }}>
              {i === 0 ? <svg width="62" height="62" viewBox="0 0 62 62"><rect x="7" y="8" width="48" height="12" rx="4" fill={colors[i]}/><rect x="7" y="25" width="32" height="12" rx="4" fill={colors[i]} opacity=".7"/><rect x="7" y="42" width="40" height="12" rx="4" fill={colors[i]} opacity=".4"/></svg> : i === 1 ? <svg width="62" height="62" viewBox="0 0 62 62"><path d="M8 31H48M35 17L49 31L35 45" stroke={colors[i]} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="12" cy="31" r="7" fill={colors[i]}/></svg> : <svg width="62" height="62" viewBox="0 0 62 62"><path d="M11 31L24 44L51 16" stroke={colors[i]} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
            </div>
            <strong style={{ color: C.white, fontSize: 29 }}>{label}</strong>
            <span style={{ color: colors[i], fontSize: 17, letterSpacing: 3 }}>0{i+1}</span>
          </div>;
        })}
      </div>
      <div style={{ height: 5, borderRadius: 9, background: "rgba(255,255,255,.08)", overflow: "hidden" }}><div style={{ width: `${Math.min(100, frame / 120 * 100)}%`, height: "100%", background: C.mint }} /></div>
    </Glass>
  );
};

const SplitVisual: FC<{ frame: number }> = ({ frame }) => (
  <Glass style={{ position: "absolute", left: "7%", top: "18%", width: "47%", height: "62%", padding: "4%" }}>
    <div style={{ display: "flex", justifyContent: "space-between", color: C.muted, fontSize: 18, letterSpacing: 3 }}><span>REASSEMBLY</span><span style={{ color: C.mint }}>DATA / 02</span></div>
    <div style={{ position: "absolute", inset: "24% 12%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", width: 310, height: 310, borderRadius: "50%", border: "1px dashed rgba(120,234,215,.32)", transform: `rotate(${frame * .6}deg)` }} />
      <div style={{ position: "absolute", width: 230, height: 230, borderRadius: "50%", border: "1px solid rgba(169,155,255,.3)", transform: `rotate(-${frame * .8}deg)` }} />
      {[0,1,2,3,4,5].map(i => {
        const angle = i * Math.PI / 3 + frame * .018;
        const x = 150 * Math.cos(angle), y = 150 * Math.sin(angle);
        const p = interpolate(frame, [i * 5, i * 5 + 18], [0,1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return <div key={i} style={{ position: "absolute", width: 54, height: 54, borderRadius: 15, border: "1px solid rgba(169,155,255,.7)", background: "linear-gradient(145deg,rgba(169,155,255,.45),rgba(169,155,255,.08))", boxShadow: "0 0 28px rgba(169,155,255,.2)", transform: `translate(${x}px,${y}px) scale(${p})`, opacity: p }} />;
      })}
      <div style={{ width: 128, height: 128, borderRadius: 36, background: "linear-gradient(145deg,#78ead7,#2e9f9c)", boxShadow: "0 0 65px rgba(120,234,215,.3)", display: "grid", placeItems: "center", color: "#09212b", fontSize: 28, fontWeight: 800 }}>DATA</div>
    </div>
    <div style={{ position: "absolute", bottom: "9%", right: "10%", color: C.muted, fontSize: 20 }}>تصل الأجزاء ثم تُرتّب من جديد</div>
  </Glass>
);

const StatsVisual: FC<{ scene: Scene; frame: number }> = ({ scene, frame }) => {
  const metrics = scene.blocks.filter(b => b.kind === "metric").slice(0,3);
  const labels = scene.blocks.filter(b => b.kind === "shape").slice(0,3);
  const accents = [C.mint, C.violet, C.gold];
  return <div style={{ position: "absolute", left: "7%", top: "21%", width: "47%", display: "flex", gap: 18 }}>
    {metrics.map((item,i) => <Glass key={item.id} style={{ flex: 1, minHeight: 390, padding: "34px 18px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 28, ...rise(frame,i*9,35) }}>
      <span style={{ color: accents[i], fontSize: 18, letterSpacing: 3 }}>INSIGHT / 0{i+1}</span>
      <strong style={{ fontSize: 66, color: C.white }}>{item.content}</strong>
      <div style={{ width: 54, height: 4, borderRadius: 8, background: accents[i], boxShadow: `0 0 22px ${accents[i]}` }} />
      <span style={{ color: C.muted, textAlign: "center", fontSize: 23, lineHeight: 1.6 }}>{labels[i]?.content ?? "الفكرة الأساسية"}</span>
    </Glass>)}
  </div>;
};

const TimelineVisual: FC<{ scene: Scene; frame: number }> = ({ scene, frame }) => {
  const steps = scene.blocks.filter(b => b.kind === "step").slice(0,4);
  return <Glass style={{ position: "absolute", left: "7%", top: "24%", width: "47%", height: "52%", padding: "5% 4%" }}>
    <div style={{ color: C.muted, fontSize: 18, letterSpacing: 4 }}>THE JOURNEY / TIMELINE</div>
    <div style={{ position: "relative", display: "flex", justifyContent: "space-around", alignItems: "center", height: "80%", direction: "rtl" }}>
      <div style={{ position: "absolute", top: "35%", right: "10%", left: "10%", height: 3, background: "linear-gradient(90deg,rgba(120,234,215,.15),rgba(169,155,255,.85),rgba(255,201,141,.3))" }} />
      {steps.map((step,i) => <div key={step.id} style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 24, ...rise(frame,i*10,28) }}>
        <div style={{ width: 84, height: 84, borderRadius: 26, display: "grid", placeItems: "center", border: `2px solid ${i===1?C.violet:C.mint}`, background: "#14233a", color: C.white, fontSize: 29, boxShadow: "0 0 34px rgba(120,234,215,.12)" }}>0{i+1}</div>
        <strong style={{ color: C.white, fontSize: 26 }}>{step.content}</strong>
      </div>)}
    </div>
  </Glass>;
};

export const SceneComposition: FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const progress = interpolate(frame, [0, Math.max(1, Math.round(fps * .8))], [0,1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const heading = scene.blocks.find(b => b.kind === "heading")?.content ?? scene.title;
  const body = scene.blocks.find(b => b.kind === "body")?.content ?? scene.narration;
  const sceneIndex = scene.id.match(/(\d+)$/)?.[1] ?? "01";
  const accent = scene.layout === "stats" ? C.gold : scene.layout === "split" ? C.violet : C.mint;
  const drift = interpolate(frame, [0, Math.max(1,durationInFrames-1)], [0,22], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return <AbsoluteFill style={{ background: "radial-gradient(ellipse at 16% 18%,#1d3450 0%,#111c30 37%,#0a1120 100%)", color: C.white, overflow: "hidden", fontFamily: '"Noto Sans Arabic","Segoe UI",Tahoma,sans-serif', direction: "rtl" }}>
    <AbsoluteFill style={{ opacity: .18, backgroundImage: "linear-gradient(rgba(170,194,224,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(170,194,224,.12) 1px,transparent 1px)", backgroundSize: "72px 72px", transform: `translate3d(${drift}px,0,0)` }} />
    <DotField frame={frame} />
    <div style={{ position: "absolute", width: 690, height: 690, border: "1px solid rgba(120,234,215,.12)", borderRadius: "50%", left: -310, top: -360, boxShadow: "0 0 0 70px rgba(120,234,215,.018),0 0 0 140px rgba(169,155,255,.018)", transform: `rotate(${frame*.12}deg)` }} />
    <div style={{ position: "absolute", top: "7%", right: "7%", left: "7%", display: "flex", justifyContent: "space-between", alignItems: "center", ...rise(frame,0,14) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}><div style={{ width: 12, height: 12, borderRadius: 4, background: C.mint, boxShadow: "0 0 18px rgba(120,234,215,.8)" }} /><span style={{ fontSize: 17, letterSpacing: 4, color: "#c3d0e2" }}>EXPLAINER STUDIO</span></div>
      <span style={{ color: "#71839e", fontSize: 16, letterSpacing: 3 }}>FIELD NOTES  /  {sceneIndex.padStart(2,"0")}</span>
    </div>
    <div style={{ position: "absolute", left: "7%", right: "7%", bottom: "7%", height: 3, background: "rgba(255,255,255,.1)", borderRadius: 8 }}>
      <div style={{ height: "100%", width: `${Math.min(100, frame/Math.max(1,durationInFrames-1)*100)}%`, background: `linear-gradient(90deg,${C.mint},${C.violet})`, boxShadow: "0 0 14px rgba(120,234,215,.35)" }} />
    </div>

    {scene.layout === "diagram" ? <Diagram frame={frame} /> :
      scene.layout === "split" ? <SplitVisual frame={frame} /> :
      scene.layout === "timeline" ? <TimelineVisual scene={scene} frame={frame} /> :
      scene.layout === "stats" ? <StatsVisual scene={scene} frame={frame} /> :
      <Glass style={{ position: "absolute", left: "7%", top: "20%", width: "47%", height: "59%", overflow: "hidden", ...rise(frame,5,42) }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 45%,rgba(120,234,215,.18),transparent 54%)" }} />
        <div style={{ position: "absolute", width: 390, height: 390, borderRadius: "50%", border: "1px solid rgba(120,234,215,.42)", left: "calc(50% - 195px)", top: "calc(50% - 195px)", boxShadow: "0 0 0 32px rgba(120,234,215,.035),0 0 0 68px rgba(169,155,255,.025)", transform: `rotate(${frame*.35}deg)` }} />
        <div style={{ position: "absolute", width: 190, height: 190, borderRadius: 48, left: "calc(50% - 95px)", top: "calc(50% - 95px)", background: "linear-gradient(145deg,#8af0dc,#3d9f9e)", boxShadow: "0 25px 70px rgba(45,190,173,.24)", display: "grid", placeItems: "center", color: "#09212b", fontSize: 38, fontWeight: 900, transform: `rotate(${interpolate(frame,[0,durationInFrames],[0,8],{extrapolateRight:"clamp"})}deg)` }}>NET</div>
        <div style={{ position: "absolute", left: "12%", bottom: "12%", color: "#a9b9ce", fontSize: 17, letterSpacing: 4 }}>A CONNECTED WORLD</div>
      </Glass>
    }

    <div style={{ position: "absolute", right: "61%", top: "22%", width: "32%", ...rise(frame,8,36) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 26 }}><span style={{ width: 30, height: 2, background: accent }} /><span style={{ color: accent, fontSize: 20, letterSpacing: 1 }}>المشهد {sceneIndex}</span></div>
      <div style={{ fontSize: 57, fontWeight: 800, lineHeight: 1.42, letterSpacing: "-1.5px", textWrap: "balance" }}>{heading}</div>
      <div style={{ marginTop: 25, maxWidth: "96%", color: "#b7c4d7", fontSize: 27, lineHeight: 1.85, fontWeight: 400 }}>{body}</div>
      <div style={{ marginTop: 38, display: "flex", alignItems: "center", gap: 12, color: "#788ba5", fontSize: 16, letterSpacing: 2 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: accent }} /> VISUAL EXPLANATION</div>
    </div>
  </AbsoluteFill>;
};
