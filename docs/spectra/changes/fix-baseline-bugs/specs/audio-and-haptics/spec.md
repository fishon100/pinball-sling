## MODIFIED Requirements

### Requirement: Audio Sound And Music Toggles

The game SHALL start with sound effects and music on for a new save. The title screen SHALL offer a music toggle and the pause menu SHALL offer both a sound-effect toggle and a music toggle; each toggle SHALL take effect immediately (sound effects muted means no effect plays; music muted means the beat keeps running silently). Each toggle SHALL be stored in the save file (save.sfx, save.music) and SHALL be restored when the page is reloaded.

> 中文：音效和音樂可以在暫停選單（音樂也能在標題）開關，馬上生效，而且會記在存檔裡，重新整理後維持你選的設定。

#### Scenario: Mute sound effects from pause

- **WHEN** the player sets "音效：關" in the pause menu and resumes
- **THEN** brick hits, launches and drains SHALL make no sound while music continues

#### Scenario: Toggles survive a reload

- **WHEN** the player turns music off and reloads the page
- **THEN** the title screen SHALL show "音樂：關" and music SHALL stay muted
