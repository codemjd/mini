import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { CSSProperties, FC } from "react";
import type { Scene } from "../types/project";

const mint = "#83ead7";
const violet = "#b6a7ff";
const amber = "#ffc58a";
const glass: CSSProperties = {
  border: "1px solid rgba(224,235,255,.15)",
  background: "linear-gradient(145deg,rgba(255,255,255,.10),rgba(255,255,255,.025))",
  boxShadow: "0 30px 90px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.08)"
};

export const SceneComposition: FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const enter = interpolate(frame, [0, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const progress = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const drift = Math.sin(frame / 18) * 8;
  const exit = interpolate(frame, [Math.max(0, durationInFrames - 16), durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cameraX = Math.sin(progress * Math.PI * 1.4) * 10;
  const cameraY = Math.cos(progress * Math.PI * 1.2) * 7;
  const cameraScale = 1.018 + progress * 0.026;
  const heading = scene.blocks.find((b) => b.kind === "heading")?.content ?? scene.title;
  const body = scene.blocks.find((b) => b.kind === "body")?.content ?? scene.narration;
  const headingSize = heading.length > 34 ? 54 : heading.length > 23 ? 60 : 68;
  const steps = scene.blocks.filter((b) => b.kind === "step").slice(0, 4);
  const metrics = scene.blocks.filter((b) => b.kind === "metric").slice(0, 3);
  const labels = scene.blocks.filter((b) => b.kind === "shape").slice(0, 3);
  const sceneNo = scene.id.match(/(\d+)$/)?.[1] ?? "01";

  const visualCard = (title: string, subtitle: string, color: string, index: number) => (
    <div key={title} style={{ flex: 1, minHeight: 190, borderRadius: 20, border: "1px solid " + color + "66", background: "linear-gradient(155deg," + color + "22,rgba(255,255,255,.025))", padding: "18px 12px", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", transform: "translateY(" + (Math.sin(frame / 13 + index) * 5) + "px)", direction: "rtl" }}>
      <span style={{ color, fontSize: 15, letterSpacing: 2 }}>0{index + 1}</span>
      <div style={{ width: 58, height: 58, borderRadius: 17, border: "1px solid " + color, display: "grid", placeItems: "center", color, fontSize: 27, background: color + "18" }}>{["▤", "▦", "▣"][index]}</div>
      <strong style={{ fontSize: 23, color: "#f4f7ff" }}>{title}</strong>
      <span style={{ fontSize: 14, color: "rgba(225,233,248,.62)" }}>{subtitle}</span>
    </div>
  );

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 24% 18%," + scene.background + " 0%,#111827 68%,#0b1220 100%)", color: "#f4f7ff", overflow: "hidden", opacity: enter * exit, transform: "translate(" + cameraX + "px," + cameraY + "px) scale(" + cameraScale + ")", transformOrigin: "50% 50%", fontFamily: '"Noto Sans Arabic","Segoe UI",Tahoma,sans-serif', direction: "rtl" }}>
      <AbsoluteFill style={{ opacity: .17, backgroundImage: "linear-gradient(rgba(190,210,240,.11) 1px,transparent 1px),linear-gradient(90deg,rgba(190,210,240,.11) 1px,transparent 1px)", backgroundSize: "72px 72px", transform: "translate(" + drift + "px," + -drift + "px)" }} />
      <div style={{ position: "absolute", width: 760, height: 760, borderRadius: "50%", right: "-19%", top: "-54%", background: "radial-gradient(circle,rgba(131,234,215,.12),transparent 68%)" }} />
      <div style={{ position: "absolute", width: 650, height: 650, borderRadius: "50%", left: "-22%", bottom: "-58%", background: "radial-gradient(circle,rgba(182,167,255,.12),transparent 68%)" }} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(115deg,transparent 25%,rgba(255,255,255,.035) 48%,transparent 68%)", transform: "translateX(" + (interpolate(frame, [0, durationInFrames], [-18, 18]) * 18) + "%)" }} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", boxShadow: "inset 0 0 180px rgba(0,0,0,.28)" }} />

      <div style={{ position: "absolute", top: "8%", right: "9%", display: "flex", alignItems: "center", gap: 13, opacity: enter }}>
        <span style={{ width: 34, height: 2, background: mint }} />
        <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: 3, color: mint }}>الفكرة في دقائق</span>
      </div>

      <div style={{ position: "absolute", right: "9%", top: "23%", width: "37%", opacity: enter, transform: "translateY(" + ((1 - enter) * 30) + "px)" }}>
        <div style={{ fontSize: 18, color: "rgba(225,233,248,.5)", marginBottom: 22 }}>المشهد {sceneNo} <span style={{ color: "rgba(225,233,248,.22)" }}> / </span> {scene.title}</div>
        <div style={{ width: 54, height: 5, borderRadius: 9, background: "linear-gradient(90deg," + mint + "," + violet + ")", marginBottom: 26 }} />
        <div style={{ fontSize: headingSize, fontWeight: 800, lineHeight: 1.35, letterSpacing: "-1.8px", textShadow: "0 8px 38px rgba(0,0,0,.2)" }}>{heading}</div>
        <div style={{ marginTop: 28, maxWidth: "96%", fontSize: 29, lineHeight: 1.9, color: "rgba(225,233,248,.72)" }}>{body}</div>
        <div style={{ marginTop: 44, display: "flex", alignItems: "center", gap: 14 }}>
          <i style={{ width: 9, height: 9, borderRadius: "50%", background: mint, boxShadow: "0 0 18px " + mint }} />
          <span style={{ fontSize: 15, color: "rgba(225,233,248,.5)", letterSpacing: 2 }}>شرح بصري مبسّط</span>
        </div>
      </div>

      <div style={{ position: "absolute", left: "6%", top: "17%", width: "48%", height: "68%", opacity: enter, transform: "translateY(" + ((1 - enter) * 35) + "px) scale(" + (.97 + enter * .03) + ")" }}>
        <div style={{ position: "absolute", inset: "4% 5%", borderRadius: 34, background: "radial-gradient(ellipse,rgba(131,234,215,.13),transparent 65%)" }} />
        <div style={{ position: "absolute", width: "72%", height: "72%", left: "13%", top: "12%", border: "1px solid rgba(131,234,215,.2)", borderRadius: "50%", boxShadow: "0 0 0 32px rgba(131,234,215,.025),0 0 0 72px rgba(182,167,255,.025)", transform: "rotate(" + (frame * .15) + "deg)" }} />
        <div style={{ ...glass, position: "absolute", inset: "13% 5% 9%", borderRadius: 28, overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 24, left: 28, right: 28, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: violet, fontSize: 15, fontWeight: 700, letterSpacing: 3 }}>VISUAL EXPLAINER</span>
            <span style={{ color: "rgba(230,238,252,.4)", fontSize: 14, letterSpacing: 2 }}>FIG. 0{sceneNo}</span>
          </div>
          <div style={{ position: "absolute", inset: "20% 7% 12%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {scene.layout === "quote" ? (
              <div style={{ width: "88%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 22, direction: "rtl", transform: "translateY(" + (Math.sin(frame / 20) * 5) + "px)" }}>
                <div style={{ color: mint, fontSize: 112, lineHeight: .7, fontFamily: "Georgia,serif", opacity: .8 }}>”</div>
                <strong style={{ color: "#f7f8ff", fontSize: 43, lineHeight: 1.65, fontWeight: 800, textShadow: "0 12px 38px rgba(0,0,0,.24)" }}>{heading}</strong>
                <div style={{ width: 86, height: 4, borderRadius: 8, background: "linear-gradient(90deg," + mint + "," + violet + ")" }} />
                <div style={{ color: "rgba(225,233,248,.68)", fontSize: 22, lineHeight: 1.7 }}>{body}</div>
              </div>
            ) : scene.layout === "comparison" ? (
              <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 18, direction: "rtl" }}>
                {[0, 1].map((i) => {
                  const color = i === 0 ? violet : mint;
                  const label = steps[i]?.content ?? (i === 0 ? "الحالة الأولى" : "الحالة الثانية");
                  const reveal = interpolate(frame, [i * 8, i * 8 + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                  return <div key={i} style={{ ...glass, flex: 1, minHeight: 270, maxWidth: "42%", borderRadius: 24, padding: 26, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, borderColor: color + "88", background: "linear-gradient(155deg," + color + "24,rgba(255,255,255,.025))", opacity: reveal, transform: "translateY(" + ((1 - reveal) * 24) + "px) scale(" + (.96 + reveal * .04) + ")" }}>
                    <span style={{ color, fontSize: 16, letterSpacing: 2 }}>0{i + 1} / {i === 0 ? "A" : "B"}</span>
                    <div style={{ width: 94, height: 94, borderRadius: i === 0 ? 22 : "50%", border: "2px solid " + color, display: "grid", placeItems: "center", color, fontSize: 34, background: color + "15", boxShadow: "0 0 36px " + color + "22" }}>{i === 0 ? "−" : "+"}</div>
                    <strong style={{ color: "#f4f7ff", fontSize: 27, textAlign: "center" }}>{label}</strong>
                    <span style={{ color: "rgba(225,233,248,.5)", fontSize: 14 }}>{i === 0 ? "المشهد الأول" : "المشهد الثاني"}</span>
                  </div>;
                })}
              </div>
            ) : scene.layout === "flow" ? (
              <div style={{ width: "100%", position: "relative", display: "flex", alignItems: "center", justifyContent: "space-around", direction: "rtl", gap: 12 }}>
                <div style={{ position: "absolute", right: "10%", left: "10%", top: 56, height: 3, borderRadius: 4, background: "linear-gradient(90deg," + mint + "," + violet + "," + amber + ")", opacity: .55 }} />
                {(steps.length ? steps : [{ id: "f1", content: "المدخل" }, { id: "f2", content: "المعالجة" }, { id: "f3", content: "التحويل" }, { id: "f4", content: "النتيجة" }]).map((step, i, all) => {
                  const color = [mint, violet, amber, mint][i];
                  const reveal = interpolate(frame, [i * 10, i * 10 + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                  return <div key={step.id} style={{ zIndex: 1, width: (78 / all.length) + "%", display: "flex", flexDirection: "column", alignItems: "center", gap: 22, opacity: reveal, transform: "translateY(" + ((1 - reveal) * 22) + "px)" }}>
                    <div style={{ width: 108, height: 108, borderRadius: 30, border: "2px solid " + color, background: "linear-gradient(145deg," + color + "2a,rgba(13,20,34,.95))", display: "grid", placeItems: "center", color, fontSize: 34, fontWeight: 800, boxShadow: "0 16px 42px " + color + "20" }}>0{i + 1}</div>
                    <strong style={{ color: "#f4f7ff", fontSize: 22, textAlign: "center", lineHeight: 1.5 }}>{step.content}</strong>
                    <span style={{ color: "rgba(225,233,248,.48)", fontSize: 13 }}>خطوة {i + 1}</span>
                  </div>;
                })}
              </div>
            ) : scene.layout === "diagram" ? (
              <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", direction: "ltr", position: "relative" }}>
                {visualCard("المصدر", "بيانات أصلية", mint, 0)}
                {visualCard("حزم رقمية", "وحدات صغيرة", violet, 1)}
                {visualCard("الوجهة", "إعادة التجميع", amber, 2)}
                <div style={{ position: "absolute", left: "25%", right: "25%", top: "49%", height: 3, background: "linear-gradient(90deg," + mint + "," + violet + "," + amber + ")", zIndex: -1 }} />
                <div style={{ position: "absolute", left: (49 + Math.sin(frame / 8) * 12) + "%", top: "calc(49% - 7px)", width: 14, height: 14, borderRadius: 5, background: mint, boxShadow: "0 0 22px " + mint }} />
              </div>
            ) : scene.layout === "timeline" ? (
              <div style={{ width: "100%", display: "flex", justifyContent: "space-around", position: "relative", direction: "rtl" }}>
                <div style={{ position: "absolute", right: "12%", left: "12%", top: 35, height: 3, background: "linear-gradient(90deg," + mint + "," + violet + "," + amber + ")" }} />
                {(steps.length ? steps : [{ id: "a", content: "البداية" }, { id: "b", content: "التحول" }, { id: "c", content: "النتيجة" }]).map((step, i) => {
                  const reveal = interpolate(frame, [i * 9, i * 9 + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                  const color = [mint, violet, amber, mint][i];
                  return <div key={step.id} style={{ width: "27%", display: "flex", alignItems: "center", flexDirection: "column", gap: 22, opacity: reveal, transform: "translateY(" + ((1 - reveal) * 20) + "px)" }}>
                    <div style={{ width: 72, height: 72, borderRadius: 24, display: "grid", placeItems: "center", background: color + "18", border: "1px solid " + color, color, fontSize: 23, fontWeight: 800 }}>0{i + 1}</div>
                    <strong style={{ fontSize: 25, color: "#f4f7ff", textAlign: "center" }}>{step.content}</strong>
                    <span style={{ fontSize: 14, color: "rgba(225,233,248,.6)" }}>المرحلة {i + 1}</span>
                  </div>;
                })}
              </div>
            ) : scene.layout === "stats" ? (
              <div style={{ width: "100%", display: "flex", gap: 18, direction: "rtl" }}>
                {(metrics.length ? metrics : [{ id: "m1", content: "01" }, { id: "m2", content: "02" }, { id: "m3", content: "03" }]).map((m, i) => {
                  const color = [mint, violet, amber][i];
                  return <div key={m.id} style={{ flex: 1, minHeight: 240, borderRadius: 20, border: "1px solid " + color + "66", background: "linear-gradient(160deg," + color + "22,rgba(255,255,255,.02))", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, transform: "translateY(" + (Math.sin(frame / 15 + i) * 6) + "px)" }}>
                    <span style={{ color, fontSize: 17, letterSpacing: 2 }}>0{i + 1} / DATA</span>
                    <strong style={{ fontSize: 62, color: "#f4f7ff" }}>{m.content}</strong>
                    <span style={{ fontSize: 18, color: "rgba(225,233,248,.65)", textAlign: "center" }}>{labels[i]?.content ?? ["الفكرة الأولى", "الفكرة الثانية", "الفكرة الثالثة"][i]}</span>
                  </div>;
                })}
              </div>
            ) : scene.layout === "split" ? (
              <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 22, direction: "rtl" }}>
                <div style={{ ...glass, flex: 1, minHeight: 270, borderRadius: 20, padding: 24 }}>
                  <span style={{ color: violet, fontSize: 16, letterSpacing: 3 }}>BEFORE</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 38 }}>{[88, 64, 78, 48].map((w, i) => <div key={i} style={{ height: 9, width: w + "%", borderRadius: 9, background: violet + "88" }} />)}</div>
                  <div style={{ display: "flex", gap: 9, marginTop: 34 }}>{[0, 1, 2, 3].map(i => <i key={i} style={{ width: 22, height: 22, borderRadius: 6, background: violet, opacity: .35 + i * .15 }} />)}</div>
                </div>
                <div style={{ ...glass, flex: 1, minHeight: 270, borderRadius: 20, padding: 24 }}>
                  <span style={{ color: mint, fontSize: 16, letterSpacing: 3 }}>AFTER</span>
                  <div style={{ height: 130, marginTop: 26, borderRadius: 16, border: "1px solid " + mint + "66", background: "radial-gradient(circle," + mint + "33,transparent 68%)", display: "grid", placeItems: "center" }}>
                    <div style={{ width: 80, height: 80, borderRadius: "50%", border: "4px solid " + mint, boxShadow: "0 0 35px " + mint + "55", transform: "scale(" + (1 + Math.sin(frame / 12) * .04) + ")" }} />
                  </div>
                  <div style={{ marginTop: 24, height: 9, width: "78%", borderRadius: 9, background: mint + "88" }} />
                  <div style={{ marginTop: 13, height: 9, width: "52%", borderRadius: 9, background: mint + "55" }} />
                </div>
              </div>
            ) : (
              <div style={{ width: 330, height: 330, borderRadius: "50%", border: "1px solid rgba(131,234,215,.35)", display: "grid", placeItems: "center", boxShadow: "0 0 80px rgba(131,234,215,.1),inset 0 0 70px rgba(131,234,215,.06)", position: "relative" }}>
                <div style={{ position: "absolute", inset: 26, borderRadius: "50%", border: "1px dashed rgba(182,167,255,.55)", transform: "rotate(" + (frame * .35) + "deg)" }} />
                <div style={{ width: 145, height: 145, borderRadius: 36, background: "linear-gradient(145deg,rgba(131,234,215,.24),rgba(182,167,255,.14))", border: "1px solid rgba(131,234,215,.65)", display: "grid", placeItems: "center", fontSize: 54, color: mint, transform: "translateY(" + (Math.sin(frame / 18) * 9) + "px) rotate(8deg)", boxShadow: "0 20px 60px rgba(0,0,0,.22)" }}>✧</div>
              </div>
            )}
          </div>
          <div style={{ position: "absolute", bottom: 24, left: 28, right: 28, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "rgba(225,233,248,.42)", letterSpacing: 2 }}>EXPLAINER STUDIO</span>
            <div style={{ display: "flex", gap: 7 }}>{[mint, violet, amber].map(c => <i key={c} style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />)}</div>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: "6%", left: "9%", right: "9%", display: "flex", alignItems: "center", gap: 20 }}>
        <span style={{ fontSize: 14, color: "rgba(225,233,248,.35)", letterSpacing: 2 }}>EXPLAINER STUDIO</span>
        <div style={{ flex: 1, height: 3, borderRadius: 10, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
          <div style={{ width: (progress * 100) + "%", height: "100%", background: "linear-gradient(90deg," + mint + "," + violet + ")", boxShadow: "0 0 16px rgba(131,234,215,.55)" }} />
        </div>
        <span style={{ fontSize: 14, color: "rgba(225,233,248,.42)" }}>0{sceneNo}</span>
      </div>
    </AbsoluteFill>
  );
};
