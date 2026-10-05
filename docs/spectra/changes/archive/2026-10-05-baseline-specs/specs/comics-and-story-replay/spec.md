## Purpose

The comic system tells the game's fairy-tale story as panel comics between stages and lets the player re-watch every segment already seen. It defines how panels reveal, how the player advances or skips, when each of the 16 segments plays, the replay gallery and the layout rules that keep bubbles readable.

## ADDED Requirements

### Requirement: Comic Panel Reveal Sequence

Each comic panel SHALL reveal in this order, measured from the moment the panel appears: the frame and background fade and scale in over 0–0.32 s; cast members pop in starting at 0.28 s, each one 0.12 s after the previous; the caption box eases in from 0.45 s; speech bubbles pop in from 0.62 s, each one 0.3 s after the previous. Text SHALL type out at 34 characters per second starting 0.5 s after the panel appears, caption first and then bubbles in order. Panels marked as memories SHALL carry a sepia tint. Lines SHALL wrap so that none of "，。！？、…）」』：；～—" starts a line.

> 中文：每一格依序出現：先框和背景，再角色一個一個跳出來，再旁白，最後對話框，字像打字機一樣一個一個出來。

#### Scenario: Reveal order inside one panel

- **WHEN** a panel with two cast members, a caption and two bubbles appears
- **THEN** cast 1 SHALL start at 0.28 s, cast 2 at 0.40 s, the caption at 0.45 s, bubble 1 at 0.62 s and bubble 2 at 0.92 s

##### Example: Typewriter length

- **GIVEN** a panel whose caption and bubbles total 34 characters
- **WHEN** no tap happens
- **THEN** all text SHALL be fully typed 1.5 s after the panel appears

### Requirement: Comic Tap Advance And Skip

While a comic plays, the game SHALL pause gameplay. A tap (or Space/Enter) SHALL first complete the current panel (all text typed and all elements shown); a tap on a completed panel SHALL show the next panel on the page; a tap after the last panel of a page SHALL slide to the next page over 0.35 s; a tap after the last panel of the last page SHALL fade the comic out over 0.3 s and continue. The prompt in the lower right SHALL read "點一下 ▶", "點一下翻頁 ▶" or "點一下開始 ▶" accordingly. The "跳過劇情 ▶▶" button (or Escape) SHALL end the whole queued comic sequence at once with the same 0.3 s fade.

> 中文：看漫畫時點一下先把這一格補完，再點一下出下一格、翻頁；右上「跳過劇情」可以整段跳過。

#### Scenario: First tap completes the panel

- **WHEN** the player taps while the current panel is still typing
- **THEN** the panel SHALL show all its text immediately and SHALL NOT advance to the next panel

#### Scenario: Skip ends all queued segments

- **WHEN** two segments are queued and the player presses "跳過劇情 ▶▶" on the first page
- **THEN** the comic layer SHALL close and the game SHALL continue to the stage intro

### Requirement: Story Playback Schedule

The game SHALL play comic segments before and after stages as follows: "intro" before stage 1; "d1_fish" before stage 5; "dN_start" before the first stage of districts 2–5 (stages 11, 21, 31, 41); "dN_boss" before each boss stage (10, 20, 30, 40, 50); "dN_clear" after boss stages 10, 20, 30, 40; "ending" after stage 50, followed by the credits. Before a stage, a segment SHALL play only if save.seenComic does not contain it, except boss segments, which SHALL play every time. Every segment SHALL be recorded in save.seenComic when it starts playing (also if it is then skipped). Retrying a stage from the results screen and continuing after game over SHALL NOT play any before-stage segment. The first stage that uses a layout with the fish 阿鰭 (stage 5) SHALL be preceded by the "d1_fish" segment.

> 中文：每段漫畫第一次一定播，首領前的漫畫每次都播；重玩這關和投幣續關不播；阿鰭第一次出現在台面前，一定先播阿鰭的漫畫。

#### Scenario: Seen segment is not replayed before a stage

- **WHEN** the player starts stage 11 a second time after having seen "d2_start"
- **THEN** no comic SHALL play before the stage intro

#### Scenario: Boss segment plays every time

- **WHEN** the player starts stage 10 after having seen "d1_boss"
- **THEN** "d1_boss" SHALL play again

#### Scenario: Fish appears only after its comic

- **WHEN** the stages are scanned from 1 upward
- **THEN** the first stage whose layout has the fish SHALL be stage 5, and storyBefore of some stage up to it SHALL include "d1_fish"

### Requirement: Story Replay Gallery

The map's "📖 劇情回放" button SHALL open a list of all 16 segments in SR.COMIC_TITLES order, numbered 1–16. A segment present in save.seenComic SHALL show its title and "點一下重看" and SHALL play when tapped, returning to the gallery afterwards; an unseen segment SHALL show "還沒看到" and "繼續玩下去就會解鎖" and SHALL be disabled. Every key of SR.COMICS SHALL have a title in SR.COMIC_TITLES and every title SHALL have a comic. "返回地圖" SHALL return to the map.

> 中文：地圖上的「劇情回放」列出 16 段漫畫，看過的可以點來重看，沒看過的顯示「還沒看到」。

#### Scenario: Replay a seen segment

- **WHEN** the player has seen "intro" and taps entry 1 "序章：灰城" in the gallery
- **THEN** the intro comic SHALL play and the gallery SHALL be shown again when it ends

#### Scenario: Unseen segment is locked

- **WHEN** the player opens the gallery without having seen "d3_boss"
- **THEN** entry 9 SHALL read "還沒看到" and SHALL NOT respond to taps

#### Scenario: Titles and comics match one to one

- **WHEN** SR.COMICS and SR.COMIC_TITLES are compared
- **THEN** both SHALL contain the same 16 keys

### Requirement: Fairy Tale Story Content

The story text SHALL be a fairy tale: the first caption of "intro" SHALL start with "很久很久以前", the "ending" text SHALL contain "從此以後", no text SHALL say the player is (or turns into) a pinball ("鋼珠", "變成彈珠"), the villain SHALL be named "灰先生" (never "灰老大"), and the hero 小葵 ("kid") SHALL appear in "intro". The game UI SHALL NOT display the design-only story-structure labels 起／承／轉／合 (the district "act" field) anywhere on screen.

> 中文：故事是童話，「很久很久以前」開頭、「從此以後」結尾，反派叫灰先生；畫面上不能出現「起承轉合」。

#### Scenario: Fairy tale framing

- **WHEN** all comic captions and bubbles are checked
- **THEN** the intro SHALL start with "很久很久以前", the ending SHALL contain "從此以後" and the villain speaker name SHALL be "灰先生"

#### Scenario: Stage label hides the story structure

- **WHEN** stage 23 is being played
- **THEN** the stage chip SHALL read "屋頂 3-3" and SHALL NOT contain 起, 承, 轉 or 合

### Requirement: Comic Layout Constraints

Every comic page SHALL have at most 5 panels laid out in rows inside the 400×740 page with 12 px margins and 10 px gaps; panels SHALL NOT overlap or leave the page and SHALL be at least 90 px tall. Every panel background and cast member SHALL exist in the comic renderer, every speaker SHALL exist in SR.SPEAKERS, every bubble SHALL hold at most 32 characters, SHALL stay inside its panel, SHALL NOT cover any character's face, and a bubble with a tail SHALL belong to a character drawn in that panel.

> 中文：每頁最多 5 格、格子不重疊不出頁；對話框最多 32 字、不出格、不蓋到臉，說話的人一定在格子裡。

#### Scenario: All pages pass layout checks

- **WHEN** every page of every segment is laid out
- **THEN** no panel SHALL overlap another, exceed the page, be under 90 px tall, or contain a bubble over 32 characters, outside the panel or over a face

