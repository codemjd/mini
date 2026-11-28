@tool
extends VBoxContainer

const ELEMENTS := [
	{"name": "Node", "purpose": "العقدة الأساسية في Godot. تنظّم بقية العناصر ويمكن أن تحمل سكربتًا وإشارات."},
	{"name": "Node2D", "purpose": "عقدة أساس للمحتوى ثنائي الأبعاد. تملك موضعًا ودورانًا ومقياسًا."},
	{"name": "Sprite2D", "purpose": "تعرض صورة أو Texture داخل مشهد 2D. لا تنفّذ التصادم وحدها."},
	{"name": "CharacterBody2D", "purpose": "جسم للشخصيات التي تتحكم بحركتها عبر velocity و move_and_slide مع معالجة التصادم."},
	{"name": "Area2D", "purpose": "منطقة تراقب دخول الأجسام وخروجها عبر إشارات مثل body_entered."},
	{"name": "CollisionShape2D", "purpose": "تحدد شكل التصادم لعقدة فيزيائية أو Area2D. يجب أن يكون لها Shape2D."},
	{"name": "Control", "purpose": "العقدة الأساسية لعناصر الواجهة مثل الأزرار والنصوص والحاويات."},
	{"name": "Camera2D", "purpose": "تحدد الجزء المرئي من عالم 2D عندما تكون الكاميرا مفعّلة."},
	{"name": "Node3D", "purpose": "عقدة أساس للمحتوى ثلاثي الأبعاد، وتملك تحويلًا مكانيًا."},
	{"name": "MeshInstance3D", "purpose": "تعرض شبكة ثلاثية الأبعاد مثل صندوق أو كرة أو نموذج مستورد."}
]

const RECIPES := [
	{
		"name": "حركة لاعب 2D",
		"description": "حركة أساسية بأزرار الاتجاهات لجسم CharacterBody2D.",
		"code": "extends CharacterBody2D\n\n@export var speed: float = 240.0\n\nfunc _physics_process(_delta: float) -> void:\n\tvar direction := Input.get_vector(\n\t\t\"ui_left\", \"ui_right\", \"ui_up\", \"ui_down\"\n\t)\n\tvelocity = direction * speed\n\tmove_and_slide()"
	},
	{
		"name": "نظام صحة بسيط",
		"description": "متغير صحة مع إشارة عند تغيّرها ودالة لتلقي الضرر.",
		"code": "extends Node\n\nsignal health_changed(value: int)\n@export var max_health: int = 100\nvar health: int\n\nfunc _ready() -> void:\n\thealth = max_health\n\nfunc take_damage(amount: int) -> void:\n\thealth = maxi(health - amount, 0)\n\thealth_changed.emit(health)"
	},
	{
		"name": "التقاط عملة",
		"description": "استخدم Area2D وأرسل إشارة عند دخول اللاعب ثم احذف العملة.",
		"code": "extends Area2D\n\nsignal collected\n\nfunc _ready() -> void:\n\tbody_entered.connect(_on_body_entered)\n\nfunc _on_body_entered(body: Node2D) -> void:\n\tif body.is_in_group(\"player\"):\n\t\tcollected.emit()\n\t\tqueue_free()"
	},
	{
		"name": "مقذوف بسيط",
		"description": "مقذوف يتحرك باتجاه ثابت بسرعة محددة ثم يحذف نفسه بعد مدة.",
		"code": "extends Area2D\n\n@export var speed: float = 500.0\n@export var lifetime: float = 2.0\nvar direction := Vector2.RIGHT\n\nfunc _ready() -> void:\n\tget_tree().create_timer(lifetime).timeout.connect(queue_free)\n\nfunc _process(delta: float) -> void:\n\tglobal_position += direction * speed * delta"
	},
	{
		"name": "عدو يتبع اللاعب",
		"description": "سلوك حتمي بسيط: يتحرك نحو عقدة اللاعب دون ذكاء اصطناعي خارجي.",
		"code": "extends CharacterBody2D\n\n@export var speed: float = 120.0\n@export var target: Node2D\n\nfunc _physics_process(_delta: float) -> void:\n\tif not is_instance_valid(target):\n\t\tvelocity = Vector2.ZERO\n\t\treturn\n\tvelocity = global_position.direction_to(target.global_position) * speed\n\tmove_and_slide()"
	}
]

var _mode_toggle: CheckButton
var _advanced_note: Label
var _element_picker: OptionButton
var _element_description: Label
var _recipe_picker: OptionButton
var _recipe_description: Label
var _recipe_code: TextEdit
var _lab_preview: ColorRect
var _scale_slider: HSlider
var _rotation_slider: HSlider
var _beginner_mode := true

const ELEMENT_DETAILS := [
	"تقع في أصل شجرة المشهد، ولا تمثل صورة بحد ذاتها.",
	"تدعم التحويلات الهرمية؛ تحويل الأب يؤثر في الأبناء.",
	"يمكن تغيير texture و offset و flip_h و flip_v من المفتش.",
	"تستخدم move_and_slide بعد تحديث velocity داخل _physics_process.",
	"اضبط collision_layer و collision_mask لتحديد ما تراقبه المنطقة.",
	"تأكد من تعيين shape ومن أن disabled غير مفعّل.",
	"تعتمد على anchors و offsets لتناسب أحجام الشاشات المختلفة.",
	"يمكن ضبط smoothing و limits لتلطيف حركة الكاميرا.",
	"تستخدم Transform3D، وتتبعها عقد مكانية أخرى في المشهد.",
	"تحتاج إلى Mesh صالح، ويمكن تخصيص مظهره عبر material_override."
]

const RECIPE_DETAILS := [
	"ضع السكربت على CharacterBody2D، وتأكد من وجود إعدادات ui_left وui_right وui_up وui_down في Input Map.",
	"يمكن ربط health_changed بواجهة المستخدم باستخدام connect بدل جعل مكوّن الصحة يعرف الواجهة.",
	"أضف العقدة إلى مجموعة player من Node > Groups، واضبط طبقات التصادم لتناسب اللعبة.",
	"عيّن direction قبل إضافة المقذوف إلى الشجرة، وأضف CollisionShape2D إلى Area2D.",
	"اسند target من Inspector أو عبر get_node. هذا سلوك برمجي ثابت وليس تعلمًا آليًا."
]


func _ready() -> void:
	layout_direction = Control.LAYOUT_DIRECTION_RTL
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	size_flags_vertical = Control.SIZE_EXPAND_FILL
	custom_minimum_size = Vector2(280, 0)
	add_theme_constant_override("separation", 8)
	_build_ui()


func _build_ui() -> void:
	var heading := Label.new()
	heading.text = "أدوات مرشد Godot"
	heading.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	heading.add_theme_font_size_override("font_size", 20)
	add_child(heading)

	var intro := Label.new()
	intro.text = "أدوات تعليمية عملية — دون اتصال بمساعد ذكاء اصطناعي."
	intro.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	intro.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	add_child(intro)

	_mode_toggle = CheckButton.new()
	_mode_toggle.text = "وضع المبتدئ"
	_mode_toggle.button_pressed = true
	_mode_toggle.toggled.connect(_on_beginner_toggled)
	add_child(_mode_toggle)

	_advanced_note = Label.new()
	_advanced_note.text = "نعرض الأساسيات أولًا. يمكنك إيقاف الوضع لإظهار المصطلحات الإضافية."
	_advanced_note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	add_child(_advanced_note)

	var tabs := TabContainer.new()
	tabs.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tabs.size_flags_vertical = Control.SIZE_EXPAND_FILL
	add_child(tabs)
	_build_elements_tab(tabs)
	_build_recipes_tab(tabs)
	_build_lab_tab(tabs)


func _build_elements_tab(tabs: TabContainer) -> void:
	var page := VBoxContainer.new()
	page.name = "شرح العناصر"
	page.add_theme_constant_override("separation", 8)
	tabs.add_child(page)

	var note := Label.new()
	note.text = "اختر عنصرًا لمعرفة وظيفته ومتى تستخدمه."
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	page.add_child(note)

	_element_picker = OptionButton.new()
	_element_picker.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	for element in ELEMENTS:
		_element_picker.add_item(str(element["name"]))
	_element_picker.item_selected.connect(_on_element_selected)
	page.add_child(_element_picker)

	_element_description = Label.new()
	_element_description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_element_description.size_flags_vertical = Control.SIZE_EXPAND_FILL
	page.add_child(_element_description)
	_on_element_selected(0)


func _build_recipes_tab(tabs: TabContainer) -> void:
	var page := VBoxContainer.new()
	page.name = "قوالب الأكواد"
	page.add_theme_constant_override("separation", 8)
	tabs.add_child(page)

	_recipe_picker = OptionButton.new()
	_recipe_picker.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	for recipe in RECIPES:
		_recipe_picker.add_item(str(recipe["name"]))
	_recipe_picker.item_selected.connect(_on_recipe_selected)
	page.add_child(_recipe_picker)

	_recipe_description = Label.new()
	_recipe_description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	page.add_child(_recipe_description)

	_recipe_code = TextEdit.new()
	_recipe_code.editable = false
	_recipe_code.wrap_mode = TextEdit.LINE_WRAPPING_NONE
	_recipe_code.layout_direction = Control.LAYOUT_DIRECTION_LTR
	_recipe_code.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_recipe_code.custom_minimum_size = Vector2(0, 180)
	_recipe_code.add_theme_font_size_override("font_size", 12)
	page.add_child(_recipe_code)

	var copy := Button.new()
	copy.text = "نسخ القالب"
	copy.custom_minimum_size = Vector2(0, 44)
	copy.pressed.connect(_copy_recipe)
	page.add_child(copy)
	_on_recipe_selected(0)


func _build_lab_tab(tabs: TabContainer) -> void:
	var page := VBoxContainer.new()
	page.name = "مختبر التجربة"
	page.add_theme_constant_override("separation", 8)
	tabs.add_child(page)

	var note := Label.new()
	note.text = "غيّر المقياس والدوران وشاهد النتيجة فورًا. هذه معاينة تعليمية معزولة لا تعدّل مشروعك تلقائيًا."
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	page.add_child(note)

	var preview_frame := PanelContainer.new()
	preview_frame.size_flags_vertical = Control.SIZE_EXPAND_FILL
	preview_frame.custom_minimum_size = Vector2(0, 190)
	page.add_child(preview_frame)

	var center := CenterContainer.new()
	center.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	center.size_flags_vertical = Control.SIZE_EXPAND_FILL
	preview_frame.add_child(center)

	_lab_preview = ColorRect.new()
	_lab_preview.color = Color(0.12, 0.62, 0.86, 1.0)
	_lab_preview.custom_minimum_size = Vector2(76, 76)
	center.add_child(_lab_preview)

	var scale_label := Label.new()
	scale_label.text = "المقياس"
	page.add_child(scale_label)
	_scale_slider = HSlider.new()
	_scale_slider.min_value = 0.5
	_scale_slider.max_value = 2.5
	_scale_slider.step = 0.1
	_scale_slider.value = 1.0
	_scale_slider.value_changed.connect(_apply_lab_values)
	page.add_child(_scale_slider)

	var rotation_label := Label.new()
	rotation_label.text = "الدوران"
	page.add_child(rotation_label)
	_rotation_slider = HSlider.new()
	_rotation_slider.min_value = -180.0
	_rotation_slider.max_value = 180.0
	_rotation_slider.step = 5.0
	_rotation_slider.value = 0.0
	_rotation_slider.value_changed.connect(_apply_lab_values)
	page.add_child(_rotation_slider)

	var reset := Button.new()
	reset.text = "إعادة ضبط المختبر"
	reset.custom_minimum_size = Vector2(0, 44)
	reset.pressed.connect(_reset_lab)
	page.add_child(reset)


func _on_beginner_toggled(enabled: bool) -> void:
	_beginner_mode = enabled
	if enabled:
		_advanced_note.text = "وضع المبتدئ: شرح مختصر وخطوات أساسية. أدوات Godot الأصلية تبقى كما هي."
	else:
		_advanced_note.text = "الوضع الموسّع: أظهرنا التفاصيل التقنية الإضافية لكل عنصر وقالب."
	_advanced_note.visible = true
	_on_element_selected(_element_picker.selected)
	_on_recipe_selected(_recipe_picker.selected)


func _on_element_selected(index: int) -> void:
	if index < 0 or index >= ELEMENTS.size():
		return
	var element: Dictionary = ELEMENTS[index]
	_element_description.text = str(element["name"]) + "\n\n" + str(element["purpose"])
	if not _beginner_mode:
		_element_description.text += "\n\nتفصيل إضافي: " + ELEMENT_DETAILS[index]


func _on_recipe_selected(index: int) -> void:
	if index < 0 or index >= RECIPES.size():
		return
	var recipe: Dictionary = RECIPES[index]
	_recipe_description.text = str(recipe["description"])
	if not _beginner_mode:
		_recipe_description.text += "\n\nتفصيل إضافي: " + RECIPE_DETAILS[index]
	_recipe_code.text = str(recipe["code"])


func _copy_recipe() -> void:
	if _recipe_code == null or _recipe_code.text.is_empty():
		return
	DisplayServer.clipboard_set(_recipe_code.text)


func _apply_lab_values(_value: float = 0.0) -> void:
	if _lab_preview == null:
		return
	var factor := float(_scale_slider.value)
	_lab_preview.scale = Vector2(factor, factor)
	_lab_preview.rotation_degrees = float(_rotation_slider.value)


func _reset_lab() -> void:
	_scale_slider.value = 1.0
	_rotation_slider.value = 0.0
	_apply_lab_values()
