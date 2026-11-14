import { createSparkProjectDocument } from "./editor/project-document";
import { DEFAULT_SPARK_SCRIPT } from "./scripting/spark-script";
import { SparkEditorController, type EditorObject, type ObjectKind } from "./editor/editor-controller";
import { resolveLocalCommand, type LocalAssistantAction } from "./local-assistant";
import "./style.css";

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}
const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("تعذر العثور على مساحة التطبيق");

app.innerHTML = `
  <header class="topbar">
    <a class="brand" href="#" aria-label="ورشة الشرارات"><span class="brand-mark">✦</span><span><strong>ورشة الشرارات</strong><small>MINI GAME STUDIO</small></span></a>
    <div class="top-actions"><span class="save-state" id="save-state"><i></i> جاهز للتحرير</span><button class="history-btn" id="undo-button" title="تراجع (Ctrl+Z)" disabled>↶</button><button class="history-btn" id="redo-button" title="إعادة (Ctrl+Y)" disabled>↷</button><button class="preview-btn" id="preview-button">▶ معاينة اللعبة</button><button class="stop-preview-btn" id="stop-preview" hidden>■ إيقاف المعاينة</button><button class="export-btn" id="import-button">استيراد</button><input id="import-file" type="file" accept=".json,application/json" hidden><button class="export-btn" id="export-button">تصدير JSON</button><button class="primary-btn" id="save-button">حفظ المشروع</button></div>
  </header>
  <main class="workspace">
    <aside class="sidebar">
      <div class="side-heading"><span>مساحة العمل</span><span class="muted">01</span></div>
      <button class="nav-item active"><span>▦</span> محرر المشهد</button>
      <button class="nav-item" disabled><span>♟</span> الشخصيات <em>لاحقًا</em></button>
      <button class="nav-item" disabled><span>◇</span> مكتبة الأصول <em>لاحقًا</em></button>
      <button class="nav-item" disabled><span>⌘</span> السلوكيات <em>لاحقًا</em></button>
      <div class="side-divider"></div>
      <div class="sidebar-note"><span>✦</span><p>أضف كائنًا، حدده، ثم اسحبه داخل ساحة اللعب. احفظ مشروعك لتعود إليه لاحقًا على هذا الجهاز.</p></div>
    </aside>
    <section class="editor">
      <div class="editor-heading"><div><span class="eyebrow">محرر الألعاب</span><h1>محرر المشهد</h1><p>أضف العناصر إلى لعبتك ورتّبها مباشرة داخل الساحة.</p></div><span class="version-tag">الإصدار 0.8 — محرر متعدد المشاهد</span></div>
      <div class="editor-layout">
        <div class="scene-column">
          <div class="stage-toolbar"><span>المشهد 01 <b>/</b> جزيرة البلورات</span><div class="stage-tools"><button id="grid-toggle" class="mini-tool" aria-pressed="true">شبكة ✓</button><button id="snap-toggle" class="mini-tool" aria-pressed="true">محاذاة ✓</button><button id="reset-view" class="mini-tool">إعادة العرض</button><span class="stage-size">جزيرة البلورات · 800 × 450</span></div></div>
          <section class="scene-manager" aria-label="إدارة المشاهد">
            <div class="scene-manager-heading"><div><strong>مشاهد المشروع</strong><small>كل مشهد له عناصره وأوامره الخاصة</small></div><div class="scene-manager-actions"><button id="scene-new" type="button">＋ جديد</button><button id="scene-duplicate" type="button">نسخ</button><button id="scene-rename" type="button">إعادة تسمية</button><button id="scene-delete" type="button">حذف</button></div></div>
            <div id="scene-tabs" class="scene-tabs" role="tablist" aria-label="مشاهد المشروع"></div>
            <div class="scene-manager-foot"><span id="scene-count">مشهد واحد</span><span>الحد الأقصى 30 مشهدًا · حفظ تلقائي مستقل</span></div>
          </section>
          <div class="stage-shell" id="stage-shell"><div id="game-stage" aria-label="مساحة تصميم اللعبة"></div></div><div id="touch-controls" class="touch-controls" hidden><span>تحكم اللمس من melonJS: عصا الحركة وزر الهجوم</span></div>
          <div class="hint-row" id="stage-hint" role="status" aria-live="polite"><span>✦</span> اجمع البلورات الأربع، واحذر حارس الوحل. هذه ساحة جاهزة للتعديل واللعب.</div>
        </div>
        <aside class="tools-panel">
          <div class="panel-section"><h2>إضافة عناصر</h2><button class="tool-button" id="add-hero"><span class="tool-icon hero-icon">●</span><span><strong>شخصية اللاعب</strong><small>الشخصية التي تتحكم بها</small></span><b>＋</b></button><button class="tool-button" id="add-enemy"><span class="tool-icon enemy-icon">◆</span><span><strong>عدو</strong><small>هدف للتجربة</small></span><b>＋</b></button><button class="tool-button" id="add-crate"><span class="tool-icon crate-icon">▧</span><span><strong>صندوق</strong><small>عنصر ثابت</small></span><b>＋</b></button><button class="tool-button" id="add-platform"><span class="tool-icon platform-icon">▬</span><span><strong>منصة</strong><small>سطح للمشهد</small></span><b>＋</b></button><button class="tool-button" id="add-coin"><span class="tool-icon coin-icon">●</span><span><strong>بلورة</strong><small>عنصر قابل للجمع في المعاينة</small></span><b>＋</b></button></div>
          <div class="panel-section asset-library"><h2>تركيبات جاهزة</h2><button class="preset-button" id="preset-coins"><span>✦</span><span><strong>مسار البلورات</strong><small>أربع بلورات لامعة</small></span></button><button class="preset-button" id="preset-barricade"><span>▤</span><span><strong>حاجز خشبي</strong><small>منصة وصندوقان</small></span></button><button class="preset-button" id="preset-rival"><span>⚔</span><span><strong>خصم للتحدي</strong><small>عدو بخصائص محسّنة</small></span></button><button class="preset-button" id="preset-camp"><span>⌂</span><span><strong>مخيم المستكشف</strong><small>مؤن وموقد وعناصر ديكور</small></span></button><button class="preset-button" id="preset-gate"><span>▥</span><span><strong>بوابة قديمة</strong><small>مدخل حجري مع ختم</small></span></button><button class="preset-button" id="preset-crystal-garden"><span>✧</span><span><strong>حديقة البلورات</strong><small>مجموعة بلورات بألوان مختلفة</small></span></button></div>
          <div class="panel-section object-manager"><h2>الكائنات في المشهد <span class="muted" id="object-count">0</span></h2><div id="object-list" class="object-list"></div></div>
          <div class="panel-section inspector"><h2>خصائص الكائن</h2><div id="inspector-empty">حدد كائنًا من الساحة لعرض خصائصه.</div><div id="inspector-content" hidden><strong id="selected-name"></strong><label>اسم الكائن<input id="object-name" type="text" maxlength="24"></label><label>الموقع الأفقي (X)<input id="position-x" type="number" min="0" max="800"></label><label>الموقع العمودي (Y)<input id="position-y" type="number" min="0" max="450"></label><div id="appearance-properties"><div class="inspector-subtitle">المظهر</div><label>الحجم<input id="creature-size" type="number" min="0.5" max="2.5" step="0.1"></label><label>لون العنصر<input id="creature-color" type="color"></label></div><div id="creature-properties"><div class="inspector-subtitle">خصائص الشخصية</div><label>الصحة (HP)<input id="creature-health" type="number" min="1" max="1000"></label><label>السرعة<input id="creature-speed" type="number" min="1" max="1000"></label><label>الضرر<input id="creature-damage" type="number" min="1" max="500"></label></div><div class="inspector-actions inspector-layer-actions"><button class="secondary-button" id="lock-object">قفل الكائن</button><button class="secondary-button" id="bring-forward">للأمام ↑</button><button class="secondary-button" id="send-backward">للخلف ↓</button></div><div class="inspector-actions"><button class="secondary-button" id="duplicate-object">نسخ الكائن</button><button class="danger-button" id="delete-object">حذف الكائن</button></div></div></div>
        </aside>
      </div>
      <section class="assistant-panel" aria-label="مساعد الورشة المحلي">
        <div class="assistant-heading">
          <div class="assistant-identity"><span class="assistant-mark">✦</span><div><strong>مساعد الورشة</strong><small>يفهم أوامرك وينفّذها داخل مشروعك</small></div></div>
          <span class="offline-pill"><i></i> محلي · بلا إنترنت · بلا AI</span>
        </div>
        <div class="assistant-body">
          <p class="assistant-response" id="assistant-response" role="status" aria-live="polite">أهلًا بك! أستطيع تجهيز لعبة مصغّرة، وإضافة العناصر، وتعديل البطل والعدو. أوامري محددة وواضحة وتعمل على جهازك.</p>
          <div class="assistant-examples" aria-label="أمثلة للأوامر">
            <button type="button" class="command-chip" data-assistant-command="جهز لعبة جمع البلورات">جهّز لعبة جاهزة</button>
            <button type="button" class="command-chip" data-assistant-command="أضف 4 عملات">أضف 4 بلورات</button>
            <button type="button" class="command-chip" data-assistant-command="اجعل البطل أسرع">سرّع البطل</button>
            <button type="button" class="command-chip" data-assistant-command="اجعل العدو أضعف">سهّل المواجهة</button>
          </div>
          <form class="assistant-input-row" id="assistant-form">
            <input id="assistant-input" type="text" maxlength="120" autocomplete="off" placeholder="اكتب أمرًا مثل: اجعل البطل أسرع أو أضف عدوًا..." aria-label="اكتب أمرًا للمساعد">
            <button type="submit" class="assistant-send">تنفيذ الأمر <span>←</span></button>
          </form>
          <div class="assistant-footnote"><span>●</span> مساعد قواعد محلي — لا يرسل نصوصك إلى أي خادم، ولا يدّعي فهم أوامر خارج قائمته.</div>
        </div>
      </section>
      <section class="code-workbench" aria-label="مساحة البرمجة المتقدمة">
        <div class="code-workbench-heading">
          <div><span class="eyebrow">للمستخدمين المتقدمين</span><h2>برمجة مخصصة · Spark Script</h2><p>اكتب أوامر صغيرة لتعديل عناصر المشهد تلقائيًا. بقية الورشة لا تحتاج إلى برمجة.</p></div>
          <span class="code-safety">واجهة أوامر محدودة وآمنة</span>
        </div>
        <textarea id="spark-script" class="spark-script-editor" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="مقتطف Spark Script"># إعداد بسيط للمشهد — الأوامر المدعومة فقط
set(&quot;hero&quot;, &quot;speed&quot;, 260);
set(&quot;enemy&quot;, &quot;health&quot;, 75);
spawn(&quot;coin&quot;, 420, 225);
note(&quot;تم تجهيز تحدٍ أسرع مع بلورة إضافية&quot;);</textarea>
        <div class="code-workbench-actions"><button type="button" class="run-script-button" id="run-script">▶ تنفيذ المقتطف</button><button type="button" class="reset-script-button" id="reset-script">استعادة المثال</button><span id="script-output" role="status" aria-live="polite">الأوامر: set · spawn · remove · note</span></div>
        <p class="code-workbench-footnote">Spark Script ليست JavaScript كاملًا: لا تستخدم eval ولا تتيح الشبكة أو الملفات أو واجهات المتصفح. كل مقتطف يُفحص أولًا، ويُنفّذ فقط عبر أوامر محددة على بيانات المشهد.</p>
      </section>
      <section class="welcome-panel"><div class="welcome-icon">✧</div><div><strong>مساحة صناعة ألعاب تتوسع باستمرار</strong><p>جرّب الأصول الجاهزة، عدّل مظهر كل عنصر، رتّب الطبقات، واستخدم التراجع والاستيراد والتصدير لحماية عملك.</p></div></section>
    </section>
  </main>
  <footer><span>ورشة الشرارات Mini</span><span>نبني الألعاب خطوة بخطوة ✦</span></footer>
`;

let editorScene: SparkEditorController | null = null;



function getSparkScriptSource(): string {
  return document.querySelector<HTMLTextAreaElement>("#spark-script")?.value ?? "";
}

function setStatus(message: string) {
  const status = document.querySelector<HTMLElement>("#save-state");
  if (!status) return;
  const indicator = document.createElement("i");
  status.replaceChildren(indicator, document.createTextNode(" " + message));
}

editorScene = new SparkEditorController({
  getScriptSource: getSparkScriptSource,
  setScriptSource: source => {
    const editor = document.querySelector<HTMLTextAreaElement>("#spark-script");
    if (editor) editor.value = source;
  },
  setStatus
});
editorScene.create();



function runLocalAssistant(raw: string) {
  const response = document.querySelector<HTMLElement>("#assistant-response");
  const result = resolveLocalCommand(raw);
  if (!result) {
    if (response) response.textContent = "لم أتعرف على هذا الأمر بعد. جرّب: «أضف 4 عملات»، «اجعل البطل أسرع»، «اجعل العدو أضعف»، أو اكتب «ساعدني».";
    setStatus("المساعد المحلي: لم يتعرف على الأمر");
    return;
  }

  const scene = editorScene;
  const action: LocalAssistantAction = result.action;
  let completed = true;
  if (!scene && action.type !== "help") completed = false;
  else if (scene) {
    switch (action.type) {
      case "prepare-game": scene.buildStarterGame(); break;
      case "add-object": scene.addObject(action.kind); break;
      case "add-coins": scene.addCoins(action.count); break;
      case "tune":
        completed = action.target === "selected"
          ? scene.updateSelectedProperties(action.values)
          : scene.updateFirst(action.target, action.values);
        break;
      case "color":
        completed = action.target === "selected"
          ? scene.updateSelectedProperties({ color: action.color })
          : scene.updateFirst(action.target, { color: action.color });
        break;
      case "ease-game":
        completed = scene.updateFirst("enemy", { health: 55, speed: 90, damage: 8 });
        scene.updateFirst("hero", { health: 160, speed: 245 });
        break;
      case "delete-selected":
        if (!scene.getSelected()) completed = false;
        else scene.deleteSelected();
        break;
      case "duplicate-selected":
        if (!scene.getSelected()) completed = false;
        else scene.duplicateSelected();
        break;
      case "undo": scene.undo(); break;
      case "redo": scene.redo(); break;
      case "start-preview": scene.startPreview(); break;
      case "stop-preview": scene.stopPreview(); break;
      case "help": break;
    }
  }

  const finalMessage = completed
    ? result.reply
    : "لم أنفّذ الأمر لأن العنصر المطلوب غير موجود أو لا يوجد عنصر محدد. اختر عنصرًا أو أعد تجهيز اللعبة أولًا.";
  if (response) response.textContent = finalMessage;
  if (completed) setStatus("المساعد المحلي: " + finalMessage);
}

function renderSceneManager() {
  const sceneList = document.querySelector<HTMLDivElement>("#scene-tabs");
  const count = document.querySelector<HTMLElement>("#scene-count");
  if (!sceneList || !editorScene) return;
  const scenes = editorScene.getScenes();
  const activeId = editorScene.getActiveSceneId();
  sceneList.replaceChildren();
  for (const scene of scenes) {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "scene-tab" + (scene.id === activeId ? " active" : "");
    tab.dataset.sceneId = scene.id;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", String(scene.id === activeId));
    const name = document.createElement("strong");
    name.textContent = scene.name;
    const meta = document.createElement("small");
    meta.textContent = scene.objects.length + " عنصر";
    tab.append(name, meta);
    sceneList.append(tab);
  }
  if (count) count.textContent = scenes.length + (scenes.length === 1 ? " مشهد" : " مشاهد");
}

function renderEditor(objects: EditorObject[], selected: EditorObject | null) {
  renderSceneManager();
  const undo = document.querySelector<HTMLButtonElement>("#undo-button");
  const redo = document.querySelector<HTMLButtonElement>("#redo-button");
  if (undo) undo.disabled = !editorScene?.canUndo();
  if (redo) redo.disabled = !editorScene?.canRedo();
  const list = document.querySelector<HTMLDivElement>("#object-list")!;
  document.querySelector("#object-count")!.textContent = String(objects.length);
  list.innerHTML = objects.slice().reverse().map(item => `<button class="object-row ${selected?.id === item.id ? "selected" : ""}" data-object-id="${item.id}"><span>${({hero:"●",enemy:"◆",crate:"▧",platform:"▬",coin:"✦"} as Record<ObjectKind,string>)[item.kind]}</span>${({hero:"شخصية لاعب",enemy:"عدو",crate:"صندوق",platform:"منصة",coin:"عملة"} as Record<ObjectKind,string>)[item.kind]}<small>${item.locked ? "🔒 " : ""}${item.id.replace("object-", "#")}</small></button>`).join("") || '<p class="empty-list">لا توجد كائنات بعد. أضف أول كائن من الأدوات.</p>';
  const empty = document.querySelector<HTMLElement>("#inspector-empty")!;
  const content = document.querySelector<HTMLElement>("#inspector-content")!;
  empty.hidden = !!selected;
  content.hidden = !selected;
  if (selected) {
    document.querySelector("#selected-name")!.textContent = ({ hero: "شخصية اللاعب", enemy: "عدو", crate: "صندوق", platform: "منصة", coin: "عملة" } as Record<ObjectKind,string>)[selected.kind];
    (document.querySelector<HTMLInputElement>("#position-x")!).value = String(selected.x);
    (document.querySelector<HTMLInputElement>("#position-y")!).value = String(selected.y);
    (document.querySelector<HTMLInputElement>("#object-name")!).value = selected.name;
    const creature = document.querySelector<HTMLElement>("#creature-properties")!;
    creature.hidden = selected.kind !== "hero" && selected.kind !== "enemy";
    (document.querySelector<HTMLInputElement>("#creature-size")!).value = String(selected.size);
    (document.querySelector<HTMLInputElement>("#creature-color")!).value = selected.color;
    if (selected.kind === "hero" || selected.kind === "enemy") {
      (document.querySelector<HTMLInputElement>("#creature-health")!).value = String(selected.health);
      (document.querySelector<HTMLInputElement>("#creature-speed")!).value = String(selected.speed);
      (document.querySelector<HTMLInputElement>("#creature-damage")!).value = String(selected.damage);
    }
    const lockButton = document.querySelector<HTMLButtonElement>("#lock-object");
    if (lockButton) lockButton.textContent = selected.locked ? "فتح القفل 🔓" : "قفل الكائن 🔒";
  }
}
const disposeEditorRender = editorScene?.onChange(renderEditor);
if (editorScene) renderEditor(editorScene.getObjects(), editorScene.getSelected());


const assistantForm = document.querySelector<HTMLFormElement>("#assistant-form");
const assistantInput = document.querySelector<HTMLInputElement>("#assistant-input");
assistantForm?.addEventListener("submit", event => {
  event.preventDefault();
  const command = assistantInput?.value.trim() ?? "";
  if (!command) return;
  runLocalAssistant(command);
  if (assistantInput) assistantInput.value = "";
});
document.querySelectorAll<HTMLButtonElement>("[data-assistant-command]").forEach(button => {
  button.addEventListener("click", () => runLocalAssistant(button.dataset.assistantCommand ?? ""));
});
document.querySelector("#scene-new")?.addEventListener("click", () => {
  const name = window.prompt("اسم المشهد الجديد", "مشهد جديد");
  if (name !== null) editorScene?.createScene(name);
});
document.querySelector("#scene-duplicate")?.addEventListener("click", () => editorScene?.duplicateScene());
document.querySelector("#scene-rename")?.addEventListener("click", () => {
  const current = editorScene?.getScenes().find(scene => scene.id === editorScene.getActiveSceneId());
  if (!current) return;
  const name = window.prompt("الاسم الجديد للمشهد", current.name);
  if (name !== null) editorScene?.renameScene(name);
});
document.querySelector("#scene-delete")?.addEventListener("click", () => {
  if (window.confirm("حذف المشهد الحالي؟ لا يمكن التراجع عن حذف المشهد.")) editorScene?.deleteScene();
});
document.querySelector("#scene-tabs")?.addEventListener("click", event => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("[data-scene-id]");
  if (target?.dataset.sceneId) editorScene?.switchScene(target.dataset.sceneId);
});
document.querySelector("#preset-coins")?.addEventListener("click", () => editorScene?.addPreset("coins"));
document.querySelector("#preset-barricade")?.addEventListener("click", () => editorScene?.addPreset("barricade"));
document.querySelector("#preset-rival")?.addEventListener("click", () => editorScene?.addPreset("rival"));
document.querySelector("#preset-camp")?.addEventListener("click", () => editorScene?.addPreset("camp"));
document.querySelector("#preset-gate")?.addEventListener("click", () => editorScene?.addPreset("gate"));
document.querySelector("#preset-crystal-garden")?.addEventListener("click", () => editorScene?.addPreset("crystal-garden"));
document.querySelector("#add-hero")?.addEventListener("click", () => editorScene?.addObject("hero"));
document.querySelector("#add-crate")?.addEventListener("click", () => editorScene?.addObject("crate"));
document.querySelector("#save-button")?.addEventListener("click", () => editorScene?.save());
document.querySelector("#undo-button")?.addEventListener("click", () => editorScene?.undo());
document.querySelector("#redo-button")?.addEventListener("click", () => editorScene?.redo());
document.querySelector("#lock-object")?.addEventListener("click", () => editorScene?.toggleSelectedLock());
document.querySelector("#bring-forward")?.addEventListener("click", () => editorScene?.moveLayer(1));
document.querySelector("#send-backward")?.addEventListener("click", () => editorScene?.moveLayer(-1));
document.querySelector("#import-button")?.addEventListener("click", () => document.querySelector<HTMLInputElement>("#import-file")?.click());
document.querySelector<HTMLInputElement>("#import-file")?.addEventListener("change", async event => {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (file.size > 2_000_000) { setStatus("حجم ملف المشروع أكبر من 2 ميغابايت"); input.value = ""; return; }
  try { editorScene?.importProject(await file.text()); }
  catch { setStatus("تعذر استيراد الملف — تعذر قراءة الملف المحدد"); }
  input.value = "";
});
document.addEventListener("keydown", event => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
  const target = event.target as HTMLElement | null;
  if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
  const key = event.key.toLowerCase();
  if (key === "z" && !event.shiftKey) { event.preventDefault(); editorScene?.undo(); }
  else if (key === "y" || (key === "z" && event.shiftKey)) { event.preventDefault(); editorScene?.redo(); }
  else if (key === "s") { event.preventDefault(); editorScene?.save(); }
});
document.querySelector("#delete-object")?.addEventListener("click", () => editorScene?.deleteSelected());
document.querySelector("#duplicate-object")?.addEventListener("click", () => editorScene?.duplicateSelected());
document.querySelector("#preview-button")?.addEventListener("click", () => editorScene?.startPreview());
document.querySelector("#stop-preview")?.addEventListener("click", () => editorScene?.stopPreview());
document.querySelector("#grid-toggle")?.addEventListener("click", event => { const button = event.currentTarget as HTMLButtonElement; const visible = button.getAttribute("aria-pressed") !== "true"; button.setAttribute("aria-pressed", String(visible)); button.textContent = visible ? "شبكة ✓" : "شبكة"; editorScene?.setGridVisible(visible); });
document.querySelector("#snap-toggle")?.addEventListener("click", event => { const button = event.currentTarget as HTMLButtonElement; const enabled = button.getAttribute("aria-pressed") !== "true"; button.setAttribute("aria-pressed", String(enabled)); button.textContent = enabled ? "محاذاة ✓" : "محاذاة"; editorScene?.setSnapToGrid(enabled); });
document.querySelector("#reset-view")?.addEventListener("click", () => { const canvas = document.querySelector<HTMLCanvasElement>("#game-stage canvas"); if (canvas) canvas.scrollIntoView({ behavior: "smooth", block: "center" }); });
document.querySelector("#export-button")?.addEventListener("click", () => { const payload = editorScene?.getProjectDocument() ?? createSparkProjectDocument([], getSparkScriptSource()); const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "spark-workshop-project.json"; link.click(); URL.revokeObjectURL(url); setStatus("تم تصدير ملف المشروع"); });
document.querySelector("#run-script")?.addEventListener("click", () => {
  const result = editorScene?.applySparkScript(getSparkScriptSource());
  if (!result) setStatus("تعذر الوصول إلى محرر المشهد");
});
document.querySelector("#reset-script")?.addEventListener("click", () => {
  const editor = document.querySelector<HTMLTextAreaElement>("#spark-script");
  if (editor) editor.value = DEFAULT_SPARK_SCRIPT;
  editorScene?.save();
  const output = document.querySelector<HTMLElement>("#script-output");
  if (output) output.textContent = "تمت استعادة المثال الجاهز";
});
document.querySelector("#spark-script")?.addEventListener("change", () => editorScene?.save());
document.querySelector("#add-enemy")?.addEventListener("click", () => editorScene?.addObject("enemy"));
document.querySelector("#add-platform")?.addEventListener("click", () => editorScene?.addObject("platform"));
document.querySelector("#add-coin")?.addEventListener("click", () => editorScene?.addObject("coin"));
document.querySelector("#object-list")?.addEventListener("click", event => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("[data-object-id]");
  if (target) editorScene?.select(target.dataset.objectId ?? null);
});
document.querySelector<HTMLInputElement>("#object-name")?.addEventListener("change", event => { const value = (event.currentTarget as HTMLInputElement).value.trim(); if (value) editorScene?.updateProperties({ name: value }); });
for (const prop of ["health", "speed", "damage", "size"] as const) {
  document.querySelector<HTMLInputElement>(`#creature-${prop}`)?.addEventListener("change", event => {
    const input = event.currentTarget as HTMLInputElement;
    const limits = prop === "size" ? [0.5, 2.5] : prop === "damage" ? [1, 500] : [1, 1000];
    const value = clampNumber(Number(input.value) || limits[0], limits[0], limits[1]);
    input.value = String(value);
    if (prop === "size" || editorScene?.getSelected()?.kind === "hero" || editorScene?.getSelected()?.kind === "enemy") editorScene?.updateProperties({ [prop]: value });
  });
}
document.querySelector<HTMLInputElement>("#creature-color")?.addEventListener("change", event => editorScene?.updateProperties({ color: (event.currentTarget as HTMLInputElement).value }));
for (const axis of ["x", "y"] as const) {
  document.querySelector<HTMLInputElement>(`#position-${axis}`)?.addEventListener("change", event => {
    const input = event.currentTarget as HTMLInputElement;
    const selected = editorScene?.getSelected();
    if (!selected) return;
    editorScene?.updatePosition(axis === "x" ? Number(input.value) : selected.x, axis === "y" ? Number(input.value) : selected.y);
  });
}
window.addEventListener("beforeunload", () => { disposeEditorRender?.(); editorScene?.destroy(); }, { once: true });
