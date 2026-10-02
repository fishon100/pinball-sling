extends Node2D
## 遊戲主程式：輸入、得分、打擊感、繪圖。物理全部交給 pinball_physics.gd。
## 美術目前是程式畫的占位圖形，之後由美術資產（assets/）替換。

const Physics = preload("res://scripts/pinball_physics.gd")
const TuningLoader = preload("res://scripts/tuning.gd")

const COL_FIELD_TOP := Color("123b4e")
const COL_FIELD_BOTTOM := Color("0a2230")
const COL_BRASS := Color("d8ab4c")
const COL_LAMP := Color("f5e6bf")
const COL_RUBBER := Color("e4563f")
const COL_INK := Color("ece6d6")
const COL_MUTED := Color("8ea2ab")
const COL_DIM := Color("1d4a5e")

var tuning: Dictionary
var sim: Physics
var score := 0
var mult := 1
var balls_left := 3
var best := 0
var over := false
var plunger_hold := false
var charge := 0.0
var hitstop := 0.0
var shake := 0.0
var particles: Array = []
var popups: Array = []
var trail: Array = []
var last_hit := {}
var touches := {}            # 觸控 index → {"side": "L"/"R", "plunge": bool}
var key_state := {"L": false, "R": false, "plunge": false}
var demo := false            # --demo：自動發射＋自動擋板，用於錄影驗收
var font: Font


func _ready() -> void:
	tuning = TuningLoader.load_file("res://data/tuning.json")
	sim = Physics.new(tuning)
	font = ThemeDB.fallback_font
	demo = "--demo" in OS.get_cmdline_user_args()
	reset_game()


func reset_game() -> void:
	sim.build_table()
	sim.ball = sim.new_ball()
	score = 0
	mult = 1
	balls_left = 3
	over = false
	particles.clear()
	popups.clear()
	trail.clear()


# ---------------- 輸入 ----------------

func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		if event.pressed:
			if over:
				reset_game()
				return
			var side := "L" if event.position.x < Physics.W / 2.0 else "R"
			var plunge := side == "R" and sim.ball_in_lane()
			touches[event.index] = {"side": side, "plunge": plunge}
		else:
			touches.erase(event.index)
	elif event is InputEventKey and event.pressed and not event.echo:
		if event.physical_keycode == KEY_SPACE and over:
			reset_game()
		elif event.physical_keycode == KEY_UP and sim.ball != null:
			sim.ball.vel += Vector2(randf_range(-60, 60), -120)   # 推台
			shake = 4.0


func read_controls() -> Dictionary:
	var want := {
		"L": Input.is_physical_key_pressed(KEY_Z) or Input.is_physical_key_pressed(KEY_LEFT),
		"R": Input.is_physical_key_pressed(KEY_SLASH) or Input.is_physical_key_pressed(KEY_RIGHT),
		"plunge": Input.is_physical_key_pressed(KEY_SPACE),
	}
	for tch in touches.values():
		if tch.plunge:
			want.plunge = true
		else:
			want[tch.side] = true
	if demo:
		want = demo_controls()
	return want


func demo_controls() -> Dictionary:
	var want := {"L": false, "R": false, "plunge": false}
	var b := sim.ball
	if b == null:
		return want
	if sim.ball_in_lane():
		want.plunge = charge < 0.95
		return want
	# 球靠近擋板且往下掉時擊球
	if b.vel.y > 0 and b.pos.y > 590 and b.pos.y < 660:
		if b.pos.x < 185:
			want.L = true
		else:
			want.R = true
	return want


func apply_controls(want: Dictionary) -> void:
	for i in 2:
		var side := "L" if i == 0 else "R"
		var f: Physics.Flipper = sim.flippers[i]
		if want[side] and not f.pressed:
			rotate_lanes(side)
		f.pressed = want[side]
	if want.plunge and not plunger_hold and sim.ball_in_lane():
		plunger_hold = true
	elif not want.plunge and plunger_hold:
		plunger_hold = false
		if sim.ball_in_lane() and sim.ball.pos.y > 670.0:
			var lo := sim.p("plunger", "min_speed")
			var hi := sim.p("plunger", "max_speed")
			sim.ball.vel.y = -(lo + (hi - lo) * charge)
			Input.vibrate_handheld(20)
		charge = 0.0


## 按擋板讓燈道亮燈輪轉（真實彈珠台的 lane change）
func rotate_lanes(side: String) -> void:
	var lit := []
	for l in sim.lanes:
		lit.append(l.lit)
	var shift := 1 if side == "L" else lit.size() - 1
	for i in sim.lanes.size():
		sim.lanes[i].lit = lit[(i + shift) % lit.size()]


# ---------------- 主迴圈 ----------------

func _physics_process(delta: float) -> void:
	tick_fx(delta)
	if over:
		queue_redraw()
		return
	apply_controls(read_controls())
	if plunger_hold:
		charge = minf(1.0, charge + delta / sim.p("plunger", "charge_time"))
	if hitstop > 0.0:
		hitstop -= delta          # 頓幀：物理暫停一瞬間
		queue_redraw()
		return
	var ev := []
	sim.step_frame(ev)
	handle_events(ev)
	if sim.ball != null:
		trail.append(sim.ball.pos)
		while trail.size() > int(sim.p("juice", "trail")):
			trail.pop_front()
	queue_redraw()


func tick_fx(delta: float) -> void:
	shake *= exp(-14.0 * delta)
	for c in sim.circles:
		c.flash = maxf(0.0, c.flash - delta)
	for s in sim.segments:
		s.flash = maxf(0.0, s.flash - delta)
	for pt in particles:
		pt.pos += pt.vel * delta
		pt.vel *= 0.9
		pt.life -= delta
	particles = particles.filter(func(x): return x.life > 0.0)
	for pp in popups:
		pp.life -= delta
	popups = popups.filter(func(x): return x.life > 0.0)
	if not last_hit.is_empty():
		last_hit.life -= delta


# ---------------- 事件 → 分數與打擊感 ----------------

func handle_events(ev: Array) -> void:
	var seen := {}
	for e in ev:
		var key: String = e.type + str(e.get("circ", "")) + str(e.get("seg", "")) + str(e.get("i", ""))
		if seen.has(key):
			continue
		seen[key] = true
		match e.type:
			"bumper":
				e.circ.flash = sim.p("juice", "flash_ms") / 1000.0
				add_score(int(sim.p("bumper", "score")), e.pos + Vector2(0, -30))
				burst(e.pos, COL_LAMP, 12)
				hit_feedback(1.0)
			"sling":
				e.seg.flash = sim.p("juice", "flash_ms") / 1000.0
				add_score(int(sim.p("sling", "score")), (e.seg.a + e.seg.b) / 2.0 + Vector2(0, -20))
				burst(e.pos, COL_RUBBER, 8)
				hit_feedback(0.7)
			"flipper":
				last_hit = {"speed": e.speed, "t": e.t, "life": 1.6}
				if e.speed > 1700.0:
					shake = maxf(shake, sim.p("juice", "shake_px") * 0.4)
			"lane":
				var lane = sim.lanes[e.i]
				if not lane.lit:
					lane.lit = true
					add_score(int(sim.p("lane", "score")), lane.pos + Vector2(0, 24))
				if sim.lanes.all(func(l): return l.lit):
					for l in sim.lanes:
						l.lit = false
					mult = mini(mult + 1, int(sim.p("lane", "max_mult")))
					popups.append({"pos": Vector2(190, 150), "text": "x%d" % mult, "life": 1.2, "big": true})
			"drain":
				lose_ball()


func add_score(pts: int, at: Vector2) -> void:
	var v := pts * mult
	score += v
	popups.append({"pos": at, "text": "+%d" % v, "life": 0.7, "big": false})


func hit_feedback(power: float) -> void:
	hitstop = maxf(hitstop, sim.p("juice", "hitstop_ms") / 1000.0)
	shake = maxf(shake, sim.p("juice", "shake_px") * power)
	Input.vibrate_handheld(int(sim.p("juice", "vibrate_ms")))


func burst(at: Vector2, color: Color, n: int) -> void:
	for i in n:
		var a := randf() * TAU
		var spd := 260.0 * randf_range(0.4, 1.0)
		particles.append({"pos": at, "vel": Vector2(cos(a), sin(a)) * spd, "life": 0.35, "max": 0.35, "color": color})


func lose_ball() -> void:
	balls_left -= 1
	trail.clear()
	Input.vibrate_handheld(60)
	if balls_left <= 0:
		over = true
		sim.ball = null
		best = maxi(best, score)
		if demo:
			reset_game()
	else:
		sim.ball = sim.new_ball()
		mult = 1


# ---------------- 繪圖 ----------------

func _draw() -> void:
	var off := Vector2.ZERO
	if shake > 0.1:
		off = Vector2(randf_range(-shake, shake), randf_range(-shake, shake))
	draw_set_transform(off)
	draw_field()
	draw_lanes()
	draw_segments()
	draw_circles()
	for f in sim.flippers:
		draw_flipper(f)
	draw_plunger()
	draw_ball()
	draw_set_transform(Vector2.ZERO)
	draw_fx()
	draw_hud()


func draw_field() -> void:
	var bands := 24
	for i in bands:
		var c := COL_FIELD_TOP.lerp(COL_FIELD_BOTTOM, float(i) / (bands - 1))
		draw_rect(Rect2(0, Physics.H * i / bands, Physics.W, Physics.H / bands + 1), c)
	for y in range(40, int(Physics.H), 40):
		draw_line(Vector2(20, y), Vector2(350, y), Color(1, 1, 1, 0.035), 1.0)
	draw_rect(Rect2(350, 205, 30, 535), Color(0, 0, 0, 0.25))
	for tri in Physics.SLING_TRIANGLES:
		draw_colored_polygon(PackedVector2Array(tri), Color(COL_BRASS, 0.12))


func draw_segments() -> void:
	for s in sim.segments:
		match s.kind:
			"sling":
				draw_line(s.a, s.b, COL_LAMP if s.flash > 0.0 else COL_RUBBER, 7.0 if s.flash > 0.0 else 5.0, true)
			"gate":
				draw_line(s.a, s.b, COL_MUTED, 2.0, true)
			"plunger":
				pass
			_:
				draw_line(s.a, s.b, COL_BRASS, 4.0, true)
				draw_circle(s.a, 2.0, COL_BRASS)
				draw_circle(s.b, 2.0, COL_BRASS)


func draw_circles() -> void:
	var flash_max := maxf(sim.p("juice", "flash_ms") / 1000.0, 0.001)
	for c in sim.circles:
		if c.kind == "post":
			draw_circle(c.pos, c.r, COL_BRASS)
			continue
		var r := sim.p("bumper", "radius")
		var lit: bool = c.flash > 0.0
		var k: float = 1.0 + 0.12 * (c.flash / flash_max) if lit else 1.0
		if lit:
			draw_circle(c.pos, r * 1.7, Color(COL_LAMP, 0.25))
		draw_circle(c.pos, r * k, COL_RUBBER)
		draw_circle(c.pos, r * 0.72 * k, Color.WHITE if lit else COL_LAMP)
		draw_circle(c.pos, r * 0.3, COL_BRASS)


func draw_lanes() -> void:
	for l in sim.lanes:
		if l.lit:
			draw_circle(l.pos, 14.0, Color(COL_LAMP, 0.2))
		draw_circle(l.pos, 7.0, COL_LAMP if l.lit else COL_DIM)


func draw_flipper(f: Physics.Flipper) -> void:
	var length := sim.p("flipper", "length")
	var rb := sim.p("flipper", "radius_base")
	var rt := sim.p("flipper", "radius_tip")
	var tip := f.pivot + Vector2(cos(f.angle), sin(f.angle)) * length
	var pts := PackedVector2Array()
	var seg := 10
	for i in seg + 1:
		var a := f.angle + PI / 2.0 - PI * i / seg
		pts.append(tip + Vector2(cos(a), sin(a)) * rt)
	for i in seg + 1:
		var a := f.angle - PI / 2.0 - PI * i / seg
		pts.append(f.pivot + Vector2(cos(a), sin(a)) * rb)
	draw_colored_polygon(pts, COL_LAMP)
	pts.append(pts[0])
	draw_polyline(pts, COL_RUBBER, 2.5, true)
	draw_circle(f.pivot, 3.5, COL_BRASS)


func draw_plunger() -> void:
	var y := 702.0 + charge * 26.0
	draw_rect(Rect2(353, y, 24, 6), COL_BRASS)
	draw_rect(Rect2(362, y + 6, 6, Physics.H - y), Color(COL_BRASS, 0.4))
	if plunger_hold:
		draw_rect(Rect2(382, 720 - charge * 120, 3, charge * 120), COL_RUBBER)


func draw_ball() -> void:
	var b := sim.ball
	if b == null:
		return
	var n := trail.size()
	for i in n:
		var a := float(i + 1) / (n + 1)
		draw_circle(trail[i], b.r * (0.5 + 0.5 * a), Color(COL_LAMP, 0.22 * a))
	draw_circle(b.pos, b.r, Color("56646d"))
	draw_circle(b.pos - Vector2(1, 1), b.r * 0.82, Color("c9d3d8"))
	draw_circle(b.pos - Vector2(b.r * 0.35, b.r * 0.35), b.r * 0.35, Color.WHITE)


func draw_fx() -> void:
	for pt in particles:
		draw_rect(Rect2(pt.pos - Vector2(1.5, 1.5), Vector2(3, 3)), Color(pt.color, clampf(pt.life / pt.max, 0.0, 1.0)))
	for pp in popups:
		var size := 26 if pp.big else 15
		var y: float = pp.pos.y - (0.7 - pp.life) * 30.0
		draw_string(font, Vector2(pp.pos.x - 60, y), pp.text, HORIZONTAL_ALIGNMENT_CENTER, 120, size, Color(COL_LAMP, minf(1.0, pp.life * 2.0)))
	if not last_hit.is_empty() and last_hit.life > 0.0:
		var txt := "HIT %d px/s  @ %d%%" % [roundi(last_hit.speed), roundi(last_hit.t * 100.0)]
		draw_string(font, Vector2(35, 726), txt, HORIZONTAL_ALIGNMENT_CENTER, 300, 11, Color(COL_INK, minf(1.0, last_hit.life)))
	if over:
		draw_rect(Rect2(0, 0, Physics.W, Physics.H), Color(0.04, 0.08, 0.11, 0.78))
		draw_string(font, Vector2(0, 320), "GAME OVER", HORIZONTAL_ALIGNMENT_CENTER, Physics.W, 34, COL_LAMP)
		draw_string(font, Vector2(0, 360), str(score), HORIZONTAL_ALIGNMENT_CENTER, Physics.W, 20, COL_BRASS)
		draw_string(font, Vector2(0, 392), "BEST %d" % best, HORIZONTAL_ALIGNMENT_CENTER, Physics.W, 13, COL_INK)
		draw_string(font, Vector2(0, 430), "TAP / SPACE TO RESTART", HORIZONTAL_ALIGNMENT_CENTER, Physics.W, 13, COL_INK)


func draw_hud() -> void:
	draw_string(font, Vector2(28, 52), str(score), HORIZONTAL_ALIGNMENT_LEFT, -1, 22, COL_LAMP)
	draw_string(font, Vector2(28, 72), "x%d" % mult, HORIZONTAL_ALIGNMENT_LEFT, -1, 14, COL_BRASS)
	for i in 3:
		draw_circle(Vector2(312 + i * 12, 47), 4.0, COL_LAMP if i < balls_left else COL_DIM)
