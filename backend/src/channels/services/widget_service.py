def build_widget_js(channel_id: str, channel_key: str, chat_url: str) -> str:
    return f"""(function() {{
  const CHANNEL_ID = "{channel_id}";
  const CHANNEL_KEY = "{channel_key}";
  const CHAT_URL = "{chat_url}";

  // Inject shadow-DOM styles and markup
  const host = document.createElement("div");
  host.id = "sierra-widget-host";
  document.body.appendChild(host);
  const shadow = host.attachShadow({{ mode: "open" }});

  shadow.innerHTML = `
    <style>
      :host {{ all: initial; }}
      #toggle {{
        position: fixed; bottom: 24px; right: 24px; z-index: 9999;
        width: 52px; height: 52px; border-radius: 50%; border: none; cursor: pointer;
        background: #1a1a2e; color: #fff; font-size: 22px;
      }}
      #toggle:focus-visible {{ outline: 2px solid #4f8ef7; outline-offset: 2px; }}
      #panel {{
        display: none; position: fixed; bottom: 88px; right: 24px; z-index: 9999;
        width: 340px; height: 480px; border-radius: 12px; overflow: hidden;
        box-shadow: 0 8px 32px rgba(0,0,0,.18); flex-direction: column;
        background: #fff; font-family: system-ui, sans-serif;
      }}
      #panel.open {{ display: flex; }}
      #header {{
        background: #1a1a2e; color: #fff; padding: 14px 16px; font-size: 14px; font-weight: 600;
      }}
      #messages {{
        flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px;
      }}
      .msg {{
        max-width: 80%; padding: 8px 12px; border-radius: 10px; font-size: 13px; line-height: 1.45; word-break: break-word;
      }}
      .msg.user {{ align-self: flex-end; background: #1a1a2e; color: #fff; border-bottom-right-radius: 2px; }}
      .msg.assistant {{ align-self: flex-start; background: #f0f0f5; color: #111; border-bottom-left-radius: 2px; }}
      .msg.error {{ align-self: flex-start; background: #fee; color: #c00; }}
      #typing {{ align-self: flex-start; font-size: 12px; color: #888; padding: 4px 12px; display: none; }}
      #input-row {{ display: flex; border-top: 1px solid #eee; padding: 8px; gap: 6px; }}
      #input {{
        flex: 1; border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px;
        font-size: 13px; outline: none; resize: none; height: 36px; overflow: hidden;
      }}
      #input:focus {{ border-color: #1a1a2e; }}
      #send {{
        border: none; background: #1a1a2e; color: #fff; border-radius: 6px;
        padding: 0 14px; cursor: pointer; font-size: 13px; font-weight: 600;
      }}
      #send:focus-visible {{ outline: 2px solid #4f8ef7; outline-offset: 2px; }}
    </style>
    <button id="toggle" aria-label="Open chat">&#128172;</button>
    <div id="panel" role="dialog" aria-label="Chat" aria-modal="true">
      <div id="header">Chat with us</div>
      <div id="messages" aria-live="polite"></div>
      <div id="typing" aria-live="polite">Agent is typing\u2026</div>
      <div id="input-row">
        <textarea id="input" placeholder="Type a message\u2026" rows="1" aria-label="Message"></textarea>
        <button id="send">Send message</button>
      </div>
    </div>
  `;

  let sessionId = sessionStorage.getItem("sierra_session_" + CHANNEL_ID) || null;
  const toggle = shadow.getElementById("toggle");
  const panel = shadow.getElementById("panel");
  const messages = shadow.getElementById("messages");
  const input = shadow.getElementById("input");
  const send = shadow.getElementById("send");
  const typing = shadow.getElementById("typing");

  toggle.addEventListener("click", function() {{
    panel.classList.toggle("open");
    if (panel.classList.contains("open")) input.focus();
  }});

  function addMsg(role, text) {{
    const el = document.createElement("div");
    el.className = "msg " + role;
    el.textContent = text;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
  }}

  async function sendMsg() {{
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    addMsg("user", text);
    typing.style.display = "block";
    send.disabled = true;
    try {{
      const res = await fetch(CHAT_URL, {{
        method: "POST",
        headers: {{ "Content-Type": "application/json", "X-Channel-Key": CHANNEL_KEY }},
        body: JSON.stringify({{ message: text, session_id: sessionId }}),
      }});
      const data = await res.json();
      if (!res.ok) {{ addMsg("error", data.error?.message || "Something went wrong."); return; }}
      sessionId = data.session_id;
      sessionStorage.setItem("sierra_session_" + CHANNEL_ID, sessionId);
      addMsg("assistant", data.reply);
    }} catch (e) {{
      addMsg("error", "Could not reach the server. Please try again.");
    }} finally {{
      typing.style.display = "none";
      send.disabled = false;
      input.focus();
    }}
  }}

  send.addEventListener("click", sendMsg);
  input.addEventListener("keydown", function(e) {{
    if (e.key === "Enter" && !e.shiftKey) {{ e.preventDefault(); sendMsg(); }}
  }});
}})();
"""
