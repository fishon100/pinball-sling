extends Node2D
## 遊戲主程式：輸入、規則（模式／狂熱／球保險）、得分、打擊感、繪圖。物理全部交給 pinball_physics.gd。
## 規則與網頁原型 tools/tuning-prototype/index.html 一致。
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
const COL_OK := Color("6fcf8f")
const TICK := 1.0 / 60.0

var tuning: Dictionary
var sim: Physics
var mode := "classic"        # "classic" 經典 3 球／"timed" 限時
var score := 0
var mult := 1
var balls_left := 3
var best := {"classic": 0, "timed": 0}
var over := false
var launches := 0
var time_left := 0.0
var fever := 0.0             # 狂熱剩餘秒數
var ball_save := 0.0         # 球保險剩餘秒數
var target_reset := 0.0      # 落下靶重新立起倒數
var plunger_hold := false
var charge := 0.0
var hitstop := 0.0
var shake := 0.0
var particles: Array = []
var popups: Array = []
var trail: Array = []
var last_hit := {}
var touches := {}            # 觸控 index → {"side": "L"/"R", "plunge": bool}
var demo := false            # --demo：自動發射＋自動擋板，用於錄影驗收
var font: Font


func _ready() -> void:
	tuning = TuningLoader.load_file("res://data/tuning.json")
	sim = Physics.new(tuning)
	font = ThemeDB.fallback_font
	demo = "--demo" in OS.get_cmdline_user_args()
	reset_game("classic")


func reset_game(new_mode: String) -> void:
	mode = new_mode
	sim.build_table()
	sim.ball = sim.new_ball()
	score = 0
	mult = 1
	balls_left = 3
	over = false
	time_left = sim.p("rules", "time_attack_s")
	fever = 0.0
	ball_save = 0.0
	target_reset = 0.0
	particles.clear()
	popups.clear()
	trail.clear()


# ---------------- 輸入 ----------------

func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		var side := "L" if event.position.x < Physics.W / 2.0 else "R"
		if event.pressed:
			if over:
				reset_game("classic" if side == "L" else "timed")   # 左半＝經典、右半＝限時
				return
			var plunge := side == "R" and sim.ball_in_lane()
			touches[event.index] = {"side": side, "plunge": plunge}
		else:
			touches.erase(event.index)
	elif event is InputEventKey and event.pressed and not event.echo:
		if over:
			match event.physical_keycode:
				KEY_1:
					reset_game("classic")
				KEY_2:
					reset_game("timed")
				KEY_SPACE:
					reset_game(mode)
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
	# 球往下掉、靠近擋板時才擊球（避免一直按著把球卡在接球位置）
	var falling := b.vel.y > 60.0
	if falling and b.pos.y > 590 and b.pos.y < 655:
		if b.pos.x < 185:
			want.L = true
		else:
			want.R = true
	if falling and b.pos.y > 315 and b.pos.y < 375 and b.pos.x < 105:
		want.L = true
	return want


func apply_controls(want: Dictionary) -> void:
	for side in ["L", "R"]:
		var first := true
		for f in sim.flippers:
			if f.side != side:
				continue
			if first and want[side] and not f.pressed:
				rotate_lanes(side)
			first = false
			f.pressed = want[side]          # 左鍵同時控制左擋板與左上擋板
	if want.plunge and not plunger_hold and sim.ball_in_lane():
		plunger_hold = true
	elif not want.plunge and plunger_hold:
		plunger_hold = false
		if sim.ball_in_lane() and sim.ball.pos.y > 670.0:
			var lo := sim.p("plunger", "min_speed")
			var hi := sim.p("plunger", "max_speed")
			sim.ball.vel.y = -(lo + (hi - lo) * charge)
			launches += 1
			if mode == "classic":
				ball_save = sim.p("rules", "ball_save_s")
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
		if demo:
			reset_game("timed" if mode == "classic" else "classic")
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
	game_tick()
	if sim.ball != null:
		trail.append(sim.ball.pos)
		while trail.size() > int(sim.p("juice", "trail")):
			trail.pop_front()
	queue_redraw()


## 每個物理幀推進規則計時
func game_tick() -> void:
	fever = maxf(0.0, fever - TICK)
	ball_save = maxf(0.0, ball_save - TICK)
	if target_reset > 0.0:
		target_reset -= TICK
		if target_reset <= 0.0:
			for s in sim.segments:
				if s.kind == "target":
					s.down = false
	if mode == "timed":
		time_left = maxf(0.0, time_left - TICK)
		if time_left <= 0.0:
			end_game()


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
				var pts := sim.p("bumper", "score") * (sim.p("fever", "mult") if fever > 0.0 else 1.0)
				add_score(int(pts), e.pos + Vector2(0, -30))
				burst(e.pos, COL_RUBBER if fever > 0.0 else COL_LAMP, 12)
				hit_feedback(1.0)
			"sling":
				e.seg.flash = sim.p("juice", "flash_ms") / 1000.0
				add_score(int(sim.p("sling", "score")), (e.seg.a + e.seg.b) / 2.0 + Vector2(0, -20))
				burst(e.pos, COL_RUBBER, 8)
				hit_feedback(0.7)
			"target":
				e.seg.flash = sim.p("juice", "flash_ms") / 1000.0
				add_score(int(sim.p("target", "score")), e.pos + Vector2(-30, 0))
				burst(e.pos, COL_BRASS, 8)
				hit_feedback(0.6)
				if sim.all_targets_down() and target_reset <= 0.0:
					start_fever()
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
					popup(Vector2(190, 150), "x%d" % mult, true, 1.2)
			"drain":
				lose_ball()


func start_fever() -> void:
	fever = sim.p("fever", "duration_s")
	target_reset = 1.0
	popup(Vector2(185, 300), "FEVER x%d" % int(sim.p("fever", "mult")), true, 1.4)
	burst(Vector2(185, 400), COL_RUBBER, 30)
	hit_feedback(1.4)


func popup(at: Vector2, text: String, big := false, life := 0.7) -> void:
	popups.append({"pos": at, "text": text, "life": life, "big": big})


func add_score(pts: int, at: Vector2) -> void:
	var v := pts * mult
	score += v
	popup(at, "+%d" % v)


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
	trail.clear()
	if mode == "timed":
		sim.ball = sim.new_ball()           # 限時模式：無限球
		mult = 1
		popup(Vector2(185, 600), "NEXT BALL", true)
		return
	if ball_save > 0.0:
		sim.ball = sim.new_ball()           # 球保險：不扣球
		ball_save = 0.0
		popup(Vector2(185, 600), "BALL SAVED", true, 1.2)
		Input.vibrate_handheld(30)
		return
	balls_left -= 1
	Input.vibrate_handheld(60)
	if balls_left <= 0:
		end_game()
	else:
		sim.ball = sim.new_ball()
		mult = 1


func end_game() -> void:
	over = true
	sim.ball = null
	fever = 0.0
	best[mode] = maxi(best[mode], score)


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
	if fever > 0.0:
		var pulse := 0.12 + 0.06 * sin(Time.get_ticks_msec() / 120.0)
		draw_rect(Rect2(0, 0, Physics.W, Physics.H), Color(COL_RUBBER, pulse))
	for y in range(40, int(Physics.H), 40):
		draw_line(Vector2(20, y), Vector2(350, y), Color(1, 1, 1, 0.035), 1.0)
	draw_rect(Rect2(350, 205, 30, 535), Color(0, 0, 0, 0.25))
	for tri in Physics.SLING_TRIANGLES:
		draw_colored_polygon(PackedVector2Array(tri), Color(COL_BRASS, 0.12))
	if fever > 0.0:
		draw_string(font, Vector2(0, 440), "FEVER x%d" % int(sim.p("fever", "mult")), HORIZONTAL_ALIGNMENT_CENTER, 370, 30, COL_LAMP)
		draw_string(font, Vector2(0, 466), "%ds" % ceili(fever), HORIZONTAL_ALIGNMENT_CENTER, 370, 18, COL_BRASS)


func draw_segments() -> void:
	for s in sim.segments:
		match s.kind:
			"sling":
				draw_line(s.a, s.b, COL_LAMP if s.flash > 0.0 else COL_RUBBER, 7.0 if s.flash > 0.0 else 5.0, true)
			"target":
				if s.down:
					draw_line(s.a, s.b, COL_DIM, 3.0, true)
				else:
					draw_line(s.a, s.b, Color.WHITE if s.flash > 0.0 else COL_LAMP, 7.0, true)
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
	var dims := sim.flipper_dims(f)
	var length: float = dims[0]
	var rb: float = dims[1]
	var rt: float = dims[2]
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
		var y: float = pp.pos.y - (0.7 - minf(pp.life, 0.7)) * 30.0
		draw_string(font, Vector2(pp.pos.x - 100, y), pp.text, HORIZONTAL_ALIGNMENT_CENTER, 200, size, Color(COL_LAMP, minf(1.0, pp.life * 2.0)))
	if ball_save > 0.0 and sim.ball != null and not sim.ball_in_lane():
		draw_string(font, Vector2(35, 708), "BALL SAVE %.1fs" % ball_save, HORIZONTAL_ALIGNMENT_CENTER, 300, 11, COL_OK)
	if not last_hit.is_empty() and last_hit.life > 0.0:
		var txt := "HIT %d px/s  @ %d%%" % [roundi(last_hit.speed), roundi(last_hit.t * 100.0)]
		draw_string(font, Vector2(35, 726), txt, HORIZONTAL_ALIGNMENT_CENTER, 300, 11, Color(COL_INK, minf(1.0, last_hit.life)))
	if over:
		draw_rect(Rect2(0, 0, Physics.W, Physics.H), Color(0.04, 0.08, 0.11, 0.82))
		draw_string(font, Vector2(0, 250), "GAME OVER" if launches > 0 else "PINBALL", HORIZONTAL_ALIGNMENT_CENTER, Physics.W, 34, COL_LAMP)
		if launches > 0:
			draw_string(font, Vector2(0, 280), "CLASSIC" if mode == "classic" else "TIME ATTACK", HORIZONTAL_ALIGNMENT_CENTER, Physics.W, 13, COL_MUTED)
			draw_string(font, Vector2(0, 312), str(score), HORIZONTAL_ALIGNMENT_CENTER, Physics.W, 22, COL_BRASS)
		draw_mode_box(28.0, "CLASSIC", "3 balls + ball save", best.classic)
		draw_mode_box(212.0, "TIME ATTACK", "%ds, unlimited balls" % int(sim.p("rules", "time_attack_s")), best.timed)
		draw_string(font, Vector2(0, 550), "TAP LEFT / RIGHT (or 1 / 2) TO PLAY", HORIZONTAL_ALIGNMENT_CENTER, Physics.W, 13, COL_INK)


func draw_mode_box(x: float, title: String, sub: String, best_score: int) -> void:
	var rect := Rect2(x, 380, 160, 130)
	draw_rect(rect, COL_BRASS, false, 2.0)
	draw_string(font, Vector2(x, 420), title, HORIZONTAL_ALIGNMENT_CENTER, 160, 17, COL_LAMP)
	draw_string(font, Vector2(x, 446), sub, HORIZONTAL_ALIGNMENT_CENTER, 160, 11, COL_MUTED)
	draw_string(font, Vector2(x, 482), "BEST %d" % best_score, HORIZONTAL_ALIGNMENT_CENTER, 160, 12, COL_BRASS)


func draw_hud() -> void:
	draw_string(font, Vector2(28, 52), str(score), HORIZONTAL_ALIGNMENT_LEFT, -1, 22, COL_LAMP)
	draw_string(font, Vector2(28, 72), "x%d" % mult, HORIZONTAL_ALIGNMENT_LEFT, -1, 14, COL_BRASS)
	if mode == "timed":
		draw_string(font, Vector2(290, 52), "%ds" % ceili(time_left), HORIZONTAL_ALIGNMENT_RIGHT, 60, 18, COL_LAMP)
	else:
		for i in 3:
			draw_circle(Vector2(312 + i * 12, 47), 4.0, COL_LAMP if i < balls_left else COL_DIM)
