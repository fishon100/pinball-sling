extends SceneTree
## 自動測試：對應規格 AC1–AC6（v1）、AC11–AC13（v2）。
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
		ac11_upper_flipper_shot(),
		ac12_drop_targets(),
		ac13_no_dead_zones(),
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


func flipper_hit_speed(t_along: float, idx := 0) -> float:
	var s := sim_new()
	s.flippers = [s.flippers[idx]]
	var f: Physics.Flipper = s.flippers[0]
	var dims := s.flipper_dims(f)
	var a := s.flipper_rest(f)
	var dir := Vector2(cos(a), sin(a))
	var up := Vector2(sin(a), -cos(a))
	var rr: float = dims[1] + (dims[2] - dims[1]) * t_along
	var q: Vector2 = f.pivot + dir * dims[0] * t_along
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
		var walls: Array = s.segments.filter(func(x): return x.kind != "gate" and x.kind != "target")
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
			var l := rng.randf() > 0.5
			var r := rng.randf() > 0.5
			for f in s.flippers:
				f.pressed = l if f.side == "L" else r
		var ev := []
		s.step_frame(ev)
		top = maxf(top, s.ball.vel.length())
		if Physics.has_event(ev, "drain"):
			s.ball = s.new_ball()
			s.ball.vel.y = -s.p("plunger", "max_speed")
	var cap := s.p("ball", "max_speed")
	return {"id": "AC6", "name": "球速永遠 ≤ max_speed", "pass": top <= cap + 1e-3, "value": "最高 %d / 上限 %d" % [roundi(top), roundi(cap)]}


func ac11_upper_flipper_shot() -> Dictionary:
	var v := flipper_hit_speed(0.85, 2)
	return {"id": "AC11", "name": "左上擋板尖端擊球速度 ≥ 1000 px/s", "pass": v >= 1000.0, "value": "%d px/s" % roundi(v)}


func ac12_drop_targets() -> Dictionary:
	var s := sim_new(true, false, false)
	s.segments = s.segments.filter(func(x): return x.kind == "target")
	var g: float = tuning["ball"]["gravity"]
	tuning["ball"]["gravity"] = 0.0
	var hit := false
	s.ball = s.new_ball(Vector2(290, 352))
	s.ball.vel = Vector2(600, 0)
	for i in 20:
		var ev := []
		s.step_frame(ev)
		if Physics.has_event(ev, "target"):
			hit = true
	s.ball = s.new_ball(Vector2(290, 352))
	s.ball.vel = Vector2(600, 0)
	for i in 20:
		s.step_frame([])
	var passed := s.ball.pos.x > 338.0 + s.p("ball", "radius")
	tuning["ball"]["gravity"] = g
	var knocked: bool = s.segments[0].down and not s.segments[1].down
	var before := s.all_targets_down()
	for t in s.segments:
		t.down = true
	var after := s.all_targets_down()
	var ok := hit and knocked and passed and not before and after
	return {"id": "AC12", "name": "落下靶撞倒後可穿過，全倒可偵測", "pass": ok,
		"value": "撞倒 %s・穿過 %s・全倒偵測 %s" % ["是" if knocked else "否", "是" if passed else "否", "正確" if (not before and after) else "錯誤"]}


static func point_in_tri(pt: Vector2, tri: Array) -> bool:
	var a: Vector2 = tri[0]
	var b: Vector2 = tri[1]
	var c: Vector2 = tri[2]
	var d1: float = (b - a).cross(pt - a)
	var d2: float = (c - b).cross(pt - b)
	var d3: float = (a - c).cross(pt - c)
	var has_neg: bool = d1 < 0 or d2 < 0 or d3 < 0
	var has_pos: bool = d1 > 0 or d2 > 0 or d3 > 0
	return not (has_neg and has_pos)


static func overlaps_geometry(s: Physics, pt: Vector2, r: float) -> bool:
	for sg in s.segments:
		var ab: Vector2 = sg.b - sg.a
		var k := clampf((pt - sg.a).dot(ab) / ab.length_squared(), 0.0, 1.0)
		if pt.distance_to(sg.a + ab * k) < r:
			return true
	for c in s.circles:
		var cr: float = s.p("bumper", "radius") if c.kind == "bumper" else c.r
		if pt.distance_to(c.pos) < r + cr:
			return true
	for f in s.flippers:
		var dims := s.flipper_dims(f)
		var dir := Vector2(cos(f.angle), sin(f.angle))
		var k := clampf((pt - f.pivot).dot(dir) / dims[0], 0.0, 1.0)
		if pt.distance_to(f.pivot + dir * dims[0] * k) < r + dims[1]:
			return true
	return false


## 卡球測試的放球點：台面內、圓弧下方、漏斗上方、不在彈弓三角形裡、不在發射道、不和任何物件重疊
func stuck_probe_points(step: int) -> Array:
	var s := sim_new(true, true, true)
	var r := s.p("ball", "radius")
	var pts := []
	var x := 20.0 + r
	while x <= 350.0 - r:
		var y := 60.0
		while y <= 610.0:
			var arc_y := 200.0 - sqrt(maxf(0.0, 180.0 * 180.0 - (x - 200.0) * (x - 200.0)))
			var funnel_y := 540.0 + (x - 20.0) * (84.0 / 80.0) if x < 185.0 else 540.0 + (350.0 - x) * (84.0 / 80.0)
			var pt := Vector2(x, y)
			var inside_sling := false
			for tri in Physics.SLING_TRIANGLES:
				if point_in_tri(pt, tri):
					inside_sling = true
			if y >= arc_y + r + 2.0 and y <= funnel_y - r - 2.0 and not inside_sling and not overlaps_geometry(s, pt, r):
				pts.append(pt)
			y += step
		x += step
	return pts


func ac13_no_dead_zones() -> Dictionary:
	# 在台面上每 20px 放一顆球（給 ±5 px/s 的小擾動），擋板不動；
	# 「卡住」＝速度 < 8 px/s 連續 3 秒（慢慢滾不算卡住）
	var pts := stuck_probe_points(20)
	var stuck_at := []
	var runs := 0
	for pt in pts:
		for vx in [5.0, -5.0]:
			var s := sim_new(true, true, true)
			s.ball = s.new_ball(pt)
			s.ball.vel.x = vx
			runs += 1
			var still := 0
			for i in 60 * 10:
				var ev := []
				s.step_frame(ev)
				if Physics.has_event(ev, "drain"):
					break
				still = still + 1 if s.ball.vel.length() < 8.0 else 0
				if still >= 180:
					stuck_at.append("(%d,%d)" % [roundi(s.ball.pos.x), roundi(s.ball.pos.y)])
					break
	var value := "%d 次放球，0 次卡住" % runs if stuck_at.is_empty() else "%d 次放球有 %d 次卡住：%s" % [runs, stuck_at.size(), " ".join(stuck_at.slice(0, 4))]
	return {"id": "AC13", "name": "台面沒有卡球死角", "pass": stuck_at.is_empty(), "value": value}
