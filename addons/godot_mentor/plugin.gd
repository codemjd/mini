@tool
extends EditorPlugin

const MentorDockScript = preload("res://addons/godot_mentor/mentor_dock.gd")
const FeatureHubScript = preload("res://addons/godot_mentor/feature_hub.gd")

var mentor_tabs: TabContainer
var mentor_dock: Control
var feature_hub: Control


func _enter_tree() -> void:
	mentor_tabs = TabContainer.new()
	mentor_tabs.name = "مرشد Godot"
	mentor_tabs.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	mentor_tabs.size_flags_vertical = Control.SIZE_EXPAND_FILL

	mentor_dock = MentorDockScript.new()
	mentor_dock.name = "الدروس"
	mentor_tabs.add_child(mentor_dock)

	feature_hub = FeatureHubScript.new()
	feature_hub.name = "الأدوات"
	mentor_tabs.add_child(feature_hub)

	add_control_to_dock(DOCK_SLOT_LEFT_UL, mentor_tabs)


func _exit_tree() -> void:
	if is_instance_valid(mentor_tabs):
		remove_control_from_docks(mentor_tabs)
		mentor_tabs.queue_free()
