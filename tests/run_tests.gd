extends SceneTree
## 自動測試：對應規格 AC1–AC6。
## 執行：godot --headless --path . --script res://tests/run_tests.gd
## 全過回傳 exit code 0，任何一項失敗回傳 1（AI 與 CI 都靠這個判斷）。

const Physics = preload("res://scripts/pinball_physics.gd")
const TuningLoader = preload("res://scripts/tuning.gd")

var tuning: Dictionary


func _init() -> void:
	tuning = TuningLoader.load_file("res://data/tuning.json")
	var results := [
		ac1_flipper_stroke_time(),
		ac2_tip_shot_speed(),
		ac3_tip_faster_than_base(),
		ac4_no_tunneling(),
		ac5_bumper_kick(),
		ac6_speed_cap(),
	]
	var passed := 0
	for r in results:
		print("%s %s  %s  (%s)" % ["PASS" if r.pass else "FAIL", r.id, r.name, r.value])
		if r.pass:
			passed += 1
	print("---- %d/%d passed ----" % [passed, results.size()])
	quit(0 if passed == results.size() else 1)


func sim_new(segments := false, circles := false, flippers := true) -> Physics:
	var s := Physics.new(tuning)
	s.build_table(segments, circles, flippers, false)
	return s


func flipper_hit_speed(t_along: float) -> float:
	var s := sim_new()
	s.flippers = [s.flippers[0]]
	var f: Physics.Flipper = s.flippers[0]
	var a := s.flipper_rest(f)
	var dir := Vector2(cos(a), sin(a))
	var up := Vector2(sin(a), -cos(a))
	var rr := s.p("flipper", "radius_base") + (s.p("flipper", "radius_tip") - s.p("flipper", "radius_base")) * t_along
	var q := f.pivot + dir * s.p("flipper", "length") * t_along
	s.ball = s.new_ball(q + up * (rr + s.p("ball", "radius") + 0.5))
	f.pressed = true
	var best := 0.0
	for i in 12:
		s.step_frame([])
		best = maxf(best, s.ball.vel.length())
	return best


func ac1_flipper_stroke_time() -> Dictionary:
	var s := sim_new()
	var f: Physics.Flipper = s.flippers[0]
	var dt := 1.0 / 60.0 / s.substep_count()
	f.pressed = true
	var time := 0.0
	while absf(f.angle - s.flipper_up(f)) > 1e-9 and time < 1.0:
		s.update_flipper(f, dt)
		time += dt
	return {"id": "AC1", "name": "擋板從靜止到全舉 ≤ 50 ms", "pass": time <= 0.050 + 1e-9, "value": "%.1f ms" % (time * 1000.0)}


func ac2_tip_shot_speed() -> Dictionary:
	var v := flipper_hit_speed(0.85)
	return {"id": "AC2", "name": "擋板尖端擊球速度 ≥ 1500 px/s", "pass": v >= 1500.0, "value": "%d px/s" % roundi(v)}


func ac3_tip_faster_than_base() -> Dictionary:
	var tip := flipper_hit_speed(0.9)
	var base := flipper_hit_speed(0.25)
	return {"id": "AC3", "name": "尖端擊球比根部快", "pass": tip > base * 1.2, "value": "尖 %d / 根 %d" % [roundi(tip), roundi(base)]}


static func crosses(p0: Vector2, p1: Vector2, s: Physics.Seg) -> bool:
	var d1 := (s.b - s.a).cross(p0 - s.a)
	var d2 := (s.b - s.a).cross(p1 - s.a)
	var d3 := (p1 - p0).cross(s.a - p0)
	var d4 := (p1 - p0).cross(s.b - p0)
	return d1 * d2 < 0.0 and d3 * d4 < 0.0


func ac4_no_tunneling() -> Dictionary:
	var tunnels := 0
	var steps := 0
	var s0 := sim_new()
	var n := s0.substep_count()
	var dt := 1.0 / 60.0 / n
	for k in 32:
		var a := float(k) / 32.0 * TAU
		var s := sim_new(true, true, true)
		var walls: Array = s.segments.filter(func(x): return x.kind != "gate")
		s.ball = s.new_ball(Vector2(185, 420))
		s.ball.vel = Vector2(cos(a), sin(a)) * s.p("ball", "max_speed")
		for i in 90 * n:
			var before := s.ball.pos
			var ev := []
			s.substep(dt, ev)
			steps += 1
			if Physics.has_event(ev, "drain"):
				break
			var hit := false
			for w in walls:
				if crosses(before, s.ball.pos, w):
					hit = true
					break
			var p := s.ball.pos
			if hit or (p.y < 620.0 and (p.x < 19.0 or p.x > 381.0 or p.y < 19.0)):
				tunnels += 1
				break
	return {"id": "AC4", "name": "最高速撞牆不穿出桌面", "pass": tunnels == 0, "value": "32 個方向、%d 個子步，穿牆 %d 次" % [steps, tunnels]}


func ac5_bumper_kick() -> Dictionary:
	var s := sim_new(false, false, false)
	s.circles = [Physics.Circ.new(Vector2(200, 300), 0.0, "bumper")]
	s.ball = s.new_ball(Vector2(260, 300))
	s.ball.vel = Vector2(-120, 0)
	var g: float = tuning["ball"]["gravity"]
	tuning["ball"]["gravity"] = 0.0
	var best := 0.0
	for i in 30:
		s.step_frame([])
		best = maxf(best, s.ball.vel.length())
	tuning["ball"]["gravity"] = g
	var kick := s.p("bumper", "kick_speed")
	return {"id": "AC5", "name": "撞彈跳柱後速度 ≥ kick_speed", "pass": best >= kick * 0.99, "value": "%d / 目標 %d" % [roundi(best), roundi(kick)]}


func ac6_speed_cap() -> Dictionary:
	var s := sim_new(true, true, true)
	s.build_table()
	s.ball = s.new_ball()
	s.ball.vel.y = -s.p("plunger", "max_speed")
	var rng := RandomNumberGenerator.new()
	rng.seed = 7
	var top := 0.0
	for i in 60 * 20:
		if i % 9 == 0:
			s.flippers[0].pressed = rng.randf() > 0.5
			s.flippers[1].pressed = rng.randf() > 0.5
		var ev := []
		s.step_frame(ev)
		top = maxf(top, s.ball.vel.length())
		if Physics.has_event(ev, "drain"):
			s.ball = s.new_ball()
			s.ball.vel.y = -s.p("plunger", "max_speed")
	var cap := s.p("ball", "max_speed")
	return {"id": "AC6", "name": "球速永遠 ≤ max_speed", "pass": top <= cap + 1e-3, "value": "最高 %d / 上限 %d" % [roundi(top), roundi(cap)]}
