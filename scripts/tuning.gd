extends RefCounted
## 讀取手感參數。數值一律來自 data/tuning.json，禁止寫死在程式裡。

static func load_file(path: String) -> Dictionary:
	var text := FileAccess.get_file_as_string(path)
	if text.is_empty():
		push_error("找不到手感參數檔：%s" % path)
		return {}
	var data = JSON.parse_string(text)
	if typeof(data) != TYPE_DICTIONARY:
		push_error("手感參數檔格式錯誤：%s" % path)
		return {}
	return data
