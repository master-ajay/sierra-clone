H = {"X-API-Key": "test-key-123"}


def _widget_channel(client):
    return client.post("/v1/channels", json={"agent_id": "ag-1", "name": "W", "type": "widget"}, headers=H).json()


def test_widget_js_returns_javascript(client):
    ch = _widget_channel(client)
    res = client.get(f"/v1/channels/{ch['channel_id']}/widget.js?channel_key={ch['channel_key']}")
    assert res.status_code == 200
    assert "application/javascript" in res.headers["content-type"]
    assert ch["channel_id"] in res.text
    assert "shadow" in res.text.lower() or "attachShadow" in res.text


def test_widget_js_wrong_key_returns_401(client):
    ch = _widget_channel(client)
    res = client.get(f"/v1/channels/{ch['channel_id']}/widget.js?channel_key=wrong")
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "unauthorized"


def test_widget_js_paused_returns_503(client):
    ch = _widget_channel(client)
    cid, ckey = ch["channel_id"], ch["channel_key"]
    client.patch(f"/v1/channels/{cid}", json={"status": "paused"}, headers=H)
    res = client.get(f"/v1/channels/{cid}/widget.js?channel_key={ckey}")
    assert res.status_code == 503


def test_widget_js_contains_send_message_copy(client):
    ch = _widget_channel(client)
    res = client.get(f"/v1/channels/{ch['channel_id']}/widget.js?channel_key={ch['channel_key']}")
    assert "Send message" in res.text


def test_widget_js_keyboard_accessible(client):
    ch = _widget_channel(client)
    res = client.get(f"/v1/channels/{ch['channel_id']}/widget.js?channel_key={ch['channel_key']}")
    assert "focus-visible" in res.text
    assert "aria-label" in res.text
