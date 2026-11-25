import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { FC } from "react";
import type { Scene } from "../types/project";

export const SceneComposition: FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const progress = interpolate(frame, [0, Math.max(1, Math.round(fps * 0.75))], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const drift = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [18, -18], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const heading = scene.blocks.find((block) => block.kind === "heading")?.content ?? scene.title;
  const body = scene.blocks.find((block) => block.kind === "body")?.content ?? scene.narration;
  const metric = scene.blocks.find((block) => block.kind === "metric")?.content;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: scene.background,
        color: "#f3f6fc",
        overflow: "hidden",
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        direction: "rtl"
      }}
    >
      <AbsoluteFill
        style={{
          opacity: 0.34,
          backgroundImage: "linear-gradient(rgba(180,205,230,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(180,205,230,.08) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          transform: `translateX(${drift}px)`
        }}
      />
      <div style={{
        position: "absolute", width: "68%", aspectRatio: "1", left: "-19%", top: "-34%",
        border: "2px solid rgba(126,227,211,.24)", borderRadius: "50%",
        boxShadow: "0 0 0 65px rgba(126,227,211,.025), 0 0 0 130px rgba(126,227,211,.018)",
        transform: `translateY(${-drift}px) rotate(18deg)`
      }} />
      <div style={{
        position: "absolute", left: "13%", top: "19%", width: "37%", height: "62%",
        border: "1px solid rgba(163,151,255,.3)", borderRadius: "28px",
        background: "linear-gradient(145deg, rgba(255,255,255,.065), rgba(255,255,255,.012))",
        boxShadow: "0 32px 90px rgba(0,0,0,.18)",
        opacity: progress,
        transform: `translateY(${(1 - progress) * 38}px) rotate(-4deg)`
      }}>
        <div style={{ position: "absolute", top: "13%", right: "12%", color: "#9ce9dc", fontSize: 22, letterSpacing: 5 }}>EXPLAINER / {String(scene.id.slice(-2)).toUpperCase()}</div>
        <div style={{ position: "absolute", right: "12%", top: "30%", width: "56%", height: 10, borderRadius: 8, background: "rgba(235,243,255,.62)" }} />
        <div style={{ position: "absolute", right: "12%", top: "40%", width: "43%", height: 10, borderRadius: 8, background: "rgba(235,243,255,.3)" }} />
        <div style={{ position: "absolute", right: "12%", top: "50%", width: "49%", height: 10, borderRadius: 8, background: "rgba(235,243,255,.18)" }} />
        <div style={{
          position: "absolute", left: "12%", bottom: "12%", width: "30%", aspectRatio: "1",
          border: "4px solid rgba(126,227,211,.8)", borderRadius: "50%",
          boxShadow: "0 0 50px rgba(126,227,211,.14)"
        }} />
        {metric && <div style={{ position: "absolute", left: "17%", top: "17%", fontSize: 76, fontWeight: 700, color: "#b2a9ff" }}>{metric}</div>}
      </div>
      <div style={{
        position: "absolute", right: "10%", top: "24%", width: "39%",
        opacity: progress, transform: `translateY(${(1 - progress) * 28}px)`
      }}>
        <div style={{ color: "#9ce9dc", fontSize: 23, marginBottom: 22 }}>المشهد · {scene.title}</div>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.35, letterSpacing: "-1px", textWrap: "balance" }}>{heading}</div>
        <div style={{ marginTop: 26, maxWidth: "94%", color: "rgba(220,229,244,.72)", fontSize: 29, lineHeight: 1.8 }}>{body}</div>
        <div style={{ marginTop: 38, width: "38%", height: 6, borderRadius: 8, background: "rgba(255,255,255,.16)", overflow: "hidden" }}>
          <div style={{ width: `${Math.max(0, Math.min(100, (frame / Math.max(1, durationInFrames - 1)) * 100))}%`, height: "100%", background: "#81e5d5" }} />
        </div>
      </div>
      <div style={{ position: "absolute", bottom: "5%", left: "4%", color: "rgba(221,234,249,.25)", fontSize: 16, letterSpacing: 5 }}>EXPLAINER STUDIO</div>
    </AbsoluteFill>
  );
};
