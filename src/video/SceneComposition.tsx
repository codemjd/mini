import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { FC, CSSProperties } from "react";
import type { Scene } from "../types/project";

const panel: CSSProperties = {
  position: "absolute",
  left: "13%",
  top: "19%",
  width: "37%",
  height: "62%",
  border: "1px solid rgba(163,151,255,.3)",
  borderRadius: 28,
  background: "linear-gradient(145deg, rgba(255,255,255,.065), rgba(255,255,255,.012))",
  boxShadow: "0 32px 90px rgba(0,0,0,.18)",
  overflow: "hidden"
};

const nodeStyle: CSSProperties = {
  width: "27%",
  height: "48%",
  padding: "22px 18px",
  boxSizing: "border-box",
  border: "1px solid rgba(156,233,220,.32)",
  borderRadius: 18,
  background: "linear-gradient(155deg, rgba(156,233,220,.13), rgba(255,255,255,.025))",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  direction: "rtl"
};

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

      <div style={{ ...panel, opacity: progress, transform: `translateY(${(1 - progress) * 38}px) rotate(-4deg)` }}>
        {scene.layout === "diagram" ? (
          <div style={{ position: "absolute", inset: "12%", display: "flex", alignItems: "center", justifyContent: "space-between", direction: "ltr" }}>
            <div style={nodeStyle}>
              <span style={{ color: "#9ce9dc", fontSize: 18, letterSpacing: 3 }}>01 / INPUT</span>
              <strong style={{ fontSize: 28, direction: "rtl" }}>المعلومة</strong>
              <span style={{ width: "72%", height: 7, borderRadius: 8, background: "rgba(235,243,255,.35)" }} />
            </div>
            <svg width="8%" height="46" viewBox="0 0 100 46" fill="none">
              <path d="M4 23H88M76 9L90 23L76 37" stroke="#9ce9dc" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ ...nodeStyle, borderColor: "rgba(178,169,255,.38)", background: "linear-gradient(155deg, rgba(178,169,255,.14), rgba(255,255,255,.025))" }}>
              <span style={{ color: "#b2a9ff", fontSize: 18, letterSpacing: 3 }}>02 / PACKET</span>
              <strong style={{ fontSize: 28, direction: "rtl" }}>حزم رقمية</strong>
              <span style={{ display: "flex", gap: 6 }}>
                <i style={{ width: 22, height: 22, borderRadius: 5, background: "#b2a9ff" }} />
                <i style={{ width: 22, height: 22, borderRadius: 5, background: "rgba(178,169,255,.45)" }} />
                <i style={{ width: 22, height: 22, borderRadius: 5, background: "rgba(178,169,255,.22)" }} />
              </span>
            </div>
            <svg width="8%" height="46" viewBox="0 0 100 46" fill="none">
              <path d="M4 23H88M76 9L90 23L76 37" stroke="#9ce9dc" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ ...nodeStyle, borderColor: "rgba(255,190,120,.34)", background: "linear-gradient(155deg, rgba(255,190,120,.12), rgba(255,255,255,.025))" }}>
              <span style={{ color: "#ffc58a", fontSize: 18, letterSpacing: 3 }}>03 / OUTPUT</span>
              <strong style={{ fontSize: 28, direction: "rtl" }}>الوجهة</strong>
              <span style={{ width: "82%", height: 7, borderRadius: 8, background: "rgba(235,243,255,.35)" }} />
            </div>
          </div>
        ) : scene.layout === "timeline" ? (
          <div style={{ position: "absolute", inset: "16% 8%", display: "flex", alignItems: "center", justifyContent: "space-between", direction: "rtl" }}>
            <div style={{ position: "absolute", right: "8%", left: "8%", top: "39%", height: 4, borderRadius: 8, background: "linear-gradient(90deg, rgba(129,229,213,.2), rgba(178,169,255,.8), rgba(129,229,213,.2))" }} />
            {(scene.blocks.filter((block) => block.kind === "step").length
              ? scene.blocks.filter((block) => block.kind === "step").slice(0, 4)
              : [
                  { id: "timeline-1", content: "البداية" },
                  { id: "timeline-2", content: "التحول" },
                  { id: "timeline-3", content: "النتيجة" }
                ]
            ).map((step, index, allSteps) => {
              const reveal = interpolate(frame, [index * 7, index * 7 + 12], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp"
              });
              return (
                <div key={step.id} style={{ position: "relative", zIndex: 1, width: `${Math.min(76, 100 / allSteps.length)}%`, display: "flex", flexDirection: "column", alignItems: "center", gap: 22, opacity: reveal, transform: `translateY(${(1 - reveal) * 24}px)` }}>
                  <div style={{ width: 72, height: 72, borderRadius: "50%", border: `3px solid ${index === 1 ? "#b2a9ff" : "#81e5d5"}`, background: "#192338", display: "grid", placeItems: "center", color: "#f4f6ff", fontSize: 27, fontWeight: 700, boxShadow: "0 0 30px rgba(129,229,213,.12)" }}>{String(index + 1).padStart(2, "0")}</div>
                  <strong style={{ maxWidth: "100%", textAlign: "center", fontSize: 25, lineHeight: 1.5, color: "#eaf0fb" }}>{step.content}</strong>
                </div>
              );
            })}
          </div>
        ) : scene.layout === "stats" ? (
          <div style={{ position: "absolute", inset: "17% 9%", display: "flex", alignItems: "stretch", gap: "4%", direction: "rtl" }}>
            {(scene.blocks.filter((block) => block.kind === "metric").length
              ? scene.blocks.filter((block) => block.kind === "metric").slice(0, 3)
              : [{ id: "metric-default", content: metric ?? "—" }]
            ).map((item, index) => {
              const reveal = interpolate(frame, [index * 8, index * 8 + 14], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp"
              });
              const accent = index === 1 ? "#b2a9ff" : index === 2 ? "#ffc58a" : "#81e5d5";
              const label = scene.blocks.filter((block) => block.kind === "shape")[index]?.content;
              return (
                <div key={item.id} style={{ flex: 1, borderRadius: 20, border: `1px solid ${accent}55`, background: `linear-gradient(155deg, ${accent}20, rgba(255,255,255,.025))`, padding: "9% 5%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 22, opacity: reveal, transform: `translateY(${(1 - reveal) * 30}px)` }}>
                  <span style={{ color: accent, fontSize: 19, letterSpacing: 3 }}>0{index + 1} / DATA</span>
                  <strong style={{ fontSize: 54, lineHeight: 1.2, textAlign: "center", overflowWrap: "anywhere" }}>{item.content}</strong>
                  {label && <span style={{ color: "rgba(235,243,255,.72)", fontSize: 20, textAlign: "center" }}>{label}</span>}
                  <div style={{ width: "64%", height: 7, borderRadius: 8, background: `${accent}66` }} />
                </div>
              );
            })}
          </div>
        ) : scene.layout === "split" ? (
          <div style={{ position: "absolute", inset: "10%", display: "flex", gap: "6%", direction: "ltr" }}>
            <div style={{ flex: 1, borderRadius: 16, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.025)", padding: 22, direction: "rtl" }}>
              <span style={{ color: "rgba(235,243,255,.48)", fontSize: 20 }}>قبل الوصول</span>
              <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 16 }}>
                {[92, 65, 82, 48, 74].map((width, index) => (
                  <div key={index} style={{ height: 13, width: `${width}%`, borderRadius: 8, background: "rgba(235,243,255,.24)" }} />
                ))}
              </div>
              <div style={{ marginTop: 36, display: "flex", gap: 8 }}>
                {[0, 1, 2, 3].map((item) => <i key={item} style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(178,169,255,.48)" }} />)}
              </div>
            </div>
            <div style={{ flex: 1, borderRadius: 16, border: "1px solid rgba(126,227,211,.28)", background: "rgba(126,227,211,.055)", padding: 22, direction: "rtl" }}>
              <span style={{ color: "#9ce9dc", fontSize: 20 }}>بعد التجميع</span>
              <div style={{ marginTop: 28, height: 150, borderRadius: 12, border: "1px solid rgba(126,227,211,.2)", background: "linear-gradient(145deg, rgba(126,227,211,.12), transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 90, height: 90, borderRadius: "50%", border: "5px solid #81e5d5", boxShadow: "0 0 35px rgba(126,227,211,.18)" }} />
              </div>
              <div style={{ marginTop: 24, height: 9, width: "80%", borderRadius: 8, background: "rgba(235,243,255,.38)" }} />
              <div style={{ marginTop: 12, height: 9, width: "58%", borderRadius: 8, background: "rgba(235,243,255,.2)" }} />
            </div>
          </div>
        ) : (
          <>
            <div style={{ position: "absolute", top: "13%", right: "12%", color: "#9ce9dc", fontSize: 22, letterSpacing: 5 }}>EXPLAINER / 01</div>
            <div style={{ position: "absolute", right: "12%", top: "30%", width: "56%", height: 10, borderRadius: 8, background: "rgba(235,243,255,.62)" }} />
            <div style={{ position: "absolute", right: "12%", top: "40%", width: "43%", height: 10, borderRadius: 8, background: "rgba(235,243,255,.3)" }} />
            <div style={{ position: "absolute", right: "12%", top: "50%", width: "49%", height: 10, borderRadius: 8, background: "rgba(235,243,255,.18)" }} />
            <div style={{ position: "absolute", left: "12%", bottom: "12%", width: "30%", aspectRatio: "1", border: "4px solid rgba(126,227,211,.8)", borderRadius: "50%", boxShadow: "0 0 50px rgba(126,227,211,.14)" }} />
            {metric && <div style={{ position: "absolute", left: "17%", top: "17%", fontSize: 76, fontWeight: 700, color: "#b2a9ff" }}>{metric}</div>}
          </>
        )}
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
