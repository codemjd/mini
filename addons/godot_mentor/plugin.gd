@tool
extends EditorPlugin

const MentorDockScript = preload("res://addons/godot_mentor/mentor_dock.gd")
const FeatureHubScript = preload("res://addons/godot_mentor/feature_hub.gd")

var mentor_dock: Control
var feature_hub: Control


func _enter_tree() -> void:
	mentor_dock = MentorDockScript.new()
	mentor_dock.name = "مرشد Godot"
	add_control_to_dock(DOCK_SLOT_LEFT_UL, mentor_dock)

	feature_hub = FeatureHubScript.new()
	feature_hub.name = "أدوات المرشد"
	add_control_to_dock(DOCK_SLOT_RIGHT_UL, feature_hub)


func _exit_tree() -> void:
	if is_instance_valid(mentor_dock):
		remove_control_from_docks(mentor_dock)
		mentor_dock.queue_free()
	if is_instance_valid(feature_hub):
		remove_control_from_docks(feature_hub)
		feature_hub.queue_free()
