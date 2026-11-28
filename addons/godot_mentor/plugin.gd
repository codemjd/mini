@tool
extends EditorPlugin

const MentorDockScript = preload("res://addons/godot_mentor/mentor_dock.gd")

var mentor_dock: Control


func _enter_tree() -> void:
	mentor_dock = MentorDockScript.new()
	mentor_dock.name = "مرشد Godot"
	add_control_to_dock(DOCK_SLOT_LEFT_UL, mentor_dock)


func _exit_tree() -> void:
	if is_instance_valid(mentor_dock):
		remove_control_from_docks(mentor_dock)
		mentor_dock.queue_free()
