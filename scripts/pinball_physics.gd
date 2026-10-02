extends RefCounted
## 彈珠物理核心。與網頁原型（pinball-prototype/index.html）的演算法一一對應，
## 改這裡就要同步改網頁版，並跑 tests/run_tests.gd。
##
## 為什麼不用 Godot 內建 RigidBody2D：
## - 擋板「接觸點線速度 = ω × r」要精準控制，才調得出彈射感
## - 固定子步進 + 純函式，測試可重現、與網頁原型手感一致

const W := 400.0
const H := 740.0
const DRAIN_Y := 750.0

class Seg:
	var a: Vector2
	var b: Vector2
	var kind: String
	var one_side := false
	var n := Vector2.ZERO
	var flash := 0.0
	func _init(p_a: Vector2, p_b: Vector2, p_kind: String = "wall") -> void:
		a = p_a
		b = p_b
		kind = p_kind

class Circ:
	var pos: Vector2
	var r: float
	var kind: String
	var flash := 0.0
	func _init(p_pos: Vector2, p_r: float, p_kind: String) -> void:
		pos = p_pos
		r = p_r
		kind = p_kind

class Flipper:
	var side: String
	var pivot: Vector2
	var angle := 0.0
	var omega := 0.0
	var pressed := false
	func _init(p_side: String, p_pivot: Vector2) -> void:
		side = p_side
		pivot = p_pivot

class Ball:
	var pos: Vector2
	var vel := Vector2.ZERO
	var r := 9.0
	var in_lane := [false, false, false]
	func _init(p_pos: Vector2) -> void:
		pos = p_pos

class Lane:
	var pos: Vector2
	var lit := false
	func _init(p_pos: Vector2) -> void:
		pos = p_pos

const SLING_TRIANGLES := [
	[Vector2(58, 470), Vector2(58, 545), Vector2(94, 580)],
	[Vector2(312, 470), Vector2(312, 545), Vector2(276, 580)],
]

var t: Dictionary
var segments: Array = []
var circles: Array = []
var flippers: Array = []
var lanes: Array = []
var ball: Ball = null


func _init(tuning: Dictionary) -> void:
	t = tuning


func p(group: String, key: String) -> float:
	return float(t[group][key])


func build_table(with_segments := true, with_circles := true, with_flippers := true, with_lanes := true) -> void:
	segments.clear()
	circles.clear()
	flippers.clear()
	lanes.clear()
	if with_segments:
		# 頂部圓弧：中心 (200,200) 半徑 180
		var n := 28
		for i in n:
			var a0 := PI + float(i) / n * PI
			var a1 := PI + float(i + 1) / n * PI
			segments.append(Seg.new(Vector2(200, 200) + Vector2(cos(a0), sin(a0)) * 180.0, Vector2(200, 200) + Vector2(cos(a1), sin(a1)) * 180.0))
		segments.append(Seg.new(Vector2(20, 200), Vector2(20, 540)))      # 左牆
		segments.append(Seg.new(Vector2(380, 200), Vector2(380, 740)))    # 右外牆
		segments.append(Seg.new(Vector2(350, 240), Vector2(350, 740)))    # 發射道內牆
		segments.append(Seg.new(Vector2(350, 702), Vector2(380, 702), "plunger"))
		var gate := Seg.new(Vector2(350, 240), Vector2(380, 205), "gate")  # 單向門
		gate.one_side = true
		gate.n = Vector2(-35, -30).normalized()
		segments.append(gate)
		segments.append(Seg.new(Vector2(20, 540), Vector2(100, 624)))     # 漏斗
		segments.append(Seg.new(Vector2(350, 540), Vector2(270, 624)))
		segments.append(Seg.new(Vector2(165, 66), Vector2(165, 108)))     # 燈道分隔
		segments.append(Seg.new(Vector2(215, 66), Vector2(215, 108)))
		for tri in SLING_TRIANGLES:
			segments.append(Seg.new(tri[0], tri[1]))
			segments.append(Seg.new(tri[1], tri[2]))
			segments.append(Seg.new(tri[0], tri[2], "sling"))
	if with_circles:
		circles.append(Circ.new(Vector2(135, 250), 0.0, "bumper"))
		circles.append(Circ.new(Vector2(245, 250), 0.0, "bumper"))
		circles.append(Circ.new(Vector2(190, 330), 0.0, "bumper"))
		for post in [Vector2(58, 470), Vector2(312, 470), Vector2(165, 66), Vector2(215, 66)]:
			circles.append(Circ.new(post, 4.0, "post"))
	if with_lanes:
		for x in [140.0, 190.0, 240.0]:
			lanes.append(Lane.new(Vector2(x, 92)))
	if with_flippers:
		flippers.append(Flipper.new("L", Vector2(100, 640)))
		flippers.append(Flipper.new("R", Vector2(270, 640)))
		for f in flippers:
			f.angle = flipper_rest(f)


func new_ball(pos := Vector2(365, 692)) -> Ball:
	var b := Ball.new(pos)
	b.r = p("ball", "radius")
	return b


func flipper_rest(f: Flipper) -> float:
	var r := deg_to_rad(p("flipper", "rest_deg"))
	return r if f.side == "L" else PI - r


func flipper_up(f: Flipper) -> float:
	var u := deg_to_rad(p("flipper", "rest_deg") - p("flipper", "stroke_deg"))
	return u if f.side == "L" else PI - u


func update_flipper(f: Flipper, dt: float) -> void:
	var target := flipper_up(f) if f.pressed else flipper_rest(f)
	var speed := deg_to_rad(p("flipper", "up_speed_deg_s") if f.pressed else p("flipper", "down_speed_deg_s"))
	var prev := f.angle
	var diff := target - f.angle
	var step := speed * dt
	if absf(diff) <= step:
		f.angle = target
	else:
		f.angle += signf(diff) * step
	f.omega = (f.angle - prev) / dt


func collide_segment(b: Ball, s: Seg, ev: Array) -> void:
	var ab := s.b - s.a
	var len2 := ab.length_squared()
	var tt := clampf((b.pos - s.a).dot(ab) / len2, 0.0, 1.0)
	var c := s.a + ab * tt
	var d := b.pos - c
	var d2 := d.length_squared()
	if d2 >= b.r * b.r:
		return
	if s.one_side and (b.pos - s.a).dot(s.n) < 0.0:
		return
	var dist := sqrt(d2)
	var n: Vector2 = Vector2(-ab.y, ab.x).normalized() if dist < 1e-6 else d / dist
	b.pos = c + n * b.r
	var vn := b.vel.dot(n)
	if vn >= 0.0:
		return
	var tan := Vector2(-n.y, n.x)
	var vt := b.vel.dot(tan)
	var vn_new := -vn * p("ball", "restitution_wall")
	if s.kind == "sling" and -vn > 40.0:
		vn_new = maxf(vn_new, p("sling", "kick_speed"))
		ev.append({"type": "sling", "pos": c, "seg": s})
	elif -vn > 260.0:
		ev.append({"type": "wall", "pos": c, "speed": -vn})
	b.vel = n * vn_new + tan * (vt * (1.0 - p("ball", "friction")))


func collide_circle(b: Ball, c: Circ, ev: Array) -> void:
	var r := p("bumper", "radius") if c.kind == "bumper" else c.r
	var d := b.pos - c.pos
	var big_r := b.r + r
	var d2 := d.length_squared()
	if d2 >= big_r * big_r:
		return
	var dist := maxf(sqrt(d2), 1e-6)
	var n := d / dist
	b.pos = c.pos + n * big_r
	var vn := b.vel.dot(n)
	if vn >= 0.0:
		return
	var vn_new := -vn * p("ball", "restitution_wall")
	if c.kind == "bumper":
		vn_new = maxf(vn_new, p("bumper", "kick_speed"))
		ev.append({"type": "bumper", "pos": c.pos, "circ": c})
	var tan := Vector2(-n.y, n.x)
	b.vel = n * vn_new + tan * b.vel.dot(tan)


func collide_flipper(b: Ball, f: Flipper, ev: Array) -> void:
	var length := p("flipper", "length")
	var dir := Vector2(cos(f.angle), sin(f.angle))
	var tt := clampf((b.pos - f.pivot).dot(dir) / length, 0.0, 1.0)
	var q := f.pivot + dir * length * tt
	var rr := p("flipper", "radius_base") + (p("flipper", "radius_tip") - p("flipper", "radius_base")) * tt
	var o := b.pos - q
	var big_r := b.r + rr
	var d2 := o.length_squared()
	if d2 >= big_r * big_r:
		return
	var dist := maxf(sqrt(d2), 1e-6)
	var n := o / dist
	b.pos = q + n * big_r
	# 擋板接觸點的線速度 = ω × r（尖端比根部快 → 打點有差）
	var lever := q - f.pivot + n * rr
	var vs := Vector2(-f.omega * lever.y, f.omega * lever.x) * p("flipper", "power")
	var rv := b.vel - vs
	var vn := rv.dot(n)
	if vn >= 0.0:
		return
	var tan := Vector2(-n.y, n.x)
	var vt := rv.dot(tan)
	b.vel = vs + n * (-vn * p("flipper", "restitution")) + tan * (vt * (1.0 - p("ball", "friction")))
	if absf(f.omega) > 1.0 and -vn > 200.0:
		ev.append({"type": "flipper", "pos": q, "speed": b.vel.length(), "t": tt})


## 一個子步：擋板 → 球 → 碰撞 → 限速
func substep(dt: float, ev: Array) -> void:
	for f in flippers:
		update_flipper(f, dt)
	var b := ball
	if b == null:
		return
	b.r = p("ball", "radius")
	b.vel.y += p("ball", "gravity") * dt
	b.vel *= 1.0 - p("ball", "damping") * dt
	b.pos += b.vel * dt
	for s in segments:
		collide_segment(b, s, ev)
	for c in circles:
		collide_circle(b, c, ev)
	for f in flippers:
		collide_flipper(b, f, ev)
	var max_speed := p("ball", "max_speed")
	if b.vel.length() > max_speed:
		b.vel = b.vel.normalized() * max_speed
	for i in lanes.size():
		var inside: bool = b.pos.distance_to(lanes[i].pos) < 14.0
		if inside and not b.in_lane[i]:
			ev.append({"type": "lane", "i": i, "pos": lanes[i].pos})
		b.in_lane[i] = inside
	if b.pos.y > DRAIN_Y:
		ev.append({"type": "drain"})


func substep_count() -> int:
	return maxi(1, roundi(p("physics", "substeps")))


## 一幀 = 1/60 秒 = substeps 個子步
func step_frame(ev: Array) -> void:
	var n := substep_count()
	var dt := 1.0 / 60.0 / n
	for i in n:
		substep(dt, ev)
		if has_event(ev, "drain"):
			break


static func has_event(ev: Array, type: String) -> bool:
	for e in ev:
		if e["type"] == type:
			return true
	return false


func ball_in_lane() -> bool:
	return ball != null and ball.pos.x > 350.0 and ball.pos.y > 600.0
