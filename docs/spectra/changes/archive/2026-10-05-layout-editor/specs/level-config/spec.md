## ADDED Requirements

### Requirement: Table Layout Editor

The page `web/street/editor.html` SHALL offer a 「台面」 mode, next to the brick wall mode, that edits the layout of the selected stage on the stage's own table drawn with the game's art. In this mode the planner SHALL be able to: add a pop bumper by clicking, move it by dragging and delete the selected one, with a 「左右對稱」 switch that is on by default and mirrors every added or moved bumper at x = 360 − x; add a rubber rail segment, drag either end or the whole segment, and delete it; add, move and delete boost pads (56 × 14); add or remove the fish, drag its swim line (y) and its left and right bounds, and type its speed. Positions SHALL stay inside the table (x 20–340, y 340–1000). The editor SHALL show live warnings, listing the affected stages, when a bumper, fish lane point or boost pad is closer than 46 px to a brick or the boss of any stage that uses the layout, when a boost pad is closer than 46 px to a bumper, or when an object is below y 900 (near the paddle), and SHALL run the same stuck-spot probe as the sync on request (「檢查卡球」). The editor SHALL list the stages that use the layout and SHALL let the planner either edit it for all of them or save it as a new layout id used only by the current stage. 「複製」 SHALL copy one tab-separated row in the layout-table column order (代號, 名稱, 中柱座標, 阿鰭, 彈力牆, 加速帶左上角) using the same text formats as the layout table; after saving as a new layout the editor SHALL remind the planner to set the stage's 「台面配置」 to the new id.

> 中文：編輯器的「台面」模式可以直接在台面上新增、拖曳、刪除中柱（預設左右對稱，可關掉）、彈力牆、加速帶，以及調整阿鰭的游泳路線與速度；離磚太近、太靠近滑板會即時提醒，也能一鍵檢查卡球；共用的台面可以選「全部一起改」或「另存新台面」；按「複製」得到台面配置表的一列，貼回試算表。

#### Scenario: Symmetric bumper

- **WHEN** the planner, with 「左右對稱」 on, adds a bumper at (90, 700)
- **THEN** the layout gains bumpers at (90, 700) and (270, 700), and moving one of them to (100, 690) moves the other to (260, 690)

#### Scenario: Asymmetric bumper

- **WHEN** the planner turns 「左右對稱」 off and adds a bumper at (90, 700)
- **THEN** the layout gains only the bumper at (90, 700)

#### Scenario: Copy a layout row

- **WHEN** the planner edits layout d_tri so it has bumpers (80,700) and (280,700), no fish, no rails and boost pads (82,773) and (222,773), and presses 「複製」
- **THEN** the clipboard holds "d_tri\t雙柱\t80,700; 280,700\t\t\t82,773; 222,773"

#### Scenario: Warning for a bumper near bricks

- **WHEN** the planner moves a bumper of layout a_pair to (100, 470), inside the brick area of stage 1
- **THEN** the editor warns that the bumper is closer than 46 px to a brick on stage 1 (and every other stage using a_pair)

#### Scenario: Save as a new layout

- **WHEN** the planner, on stage 35 (layout d_high, used by several stages), chooses 「另存成新台面」 with the id d_high_35
- **THEN** the copied row starts with "d_high_35", the edits do not change d_high in the editor, and the editor tells the planner to set stage 35's 「台面配置」 to d_high_35

#### Scenario: Stuck check on request

- **WHEN** the planner presses 「檢查卡球」
- **THEN** the editor runs the stuck probe on the edited layout in both control modes and shows either "沒有卡球死角" or the stuck positions
