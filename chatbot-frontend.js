// ============================================================
//  GOD'S COVENANT HOSPITAL — Chatbot Frontend
//  Handles all chatbot UI, form capture, and AI conversation.
//  To change bot behaviour/knowledge, edit chatbot-config.js.
//  To change server URL, update API_BASE below.
// ============================================================

(function () {
  'use strict';

  // ── Auto-detect local vs deployed ────────────────────────
  const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : '';

  // ── State ────────────────────────────────────────────────
  let contactInfo = null;
  let conversationHistory = [];

  // ── DOM refs ─────────────────────────────────────────────
  const fab           = document.getElementById('chatFab');
  const panel         = document.getElementById('chatbotPanel');
  const closeBtn      = document.querySelector('.chat-close-btn');
  const welcomeScreen = document.getElementById('chatWelcomeScreen');
  const startBtn      = document.getElementById('chatStartBtn');
  const chatBody      = document.getElementById('chatBody');
  const chatMsgs      = document.getElementById('chatMessages');
  const formArea      = document.getElementById('chatFormArea');
  const chatForm      = document.getElementById('chatContactForm');
  const liveArea      = document.getElementById('chatLiveInput');
  const userInput     = document.getElementById('chatUserInput');
  const sendBtn       = document.getElementById('chatSendBtn');

  if (!fab || !panel) return;

  // ── Helpers ──────────────────────────────────────────────
  function timeStr() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // nl2br for displaying AI multi-line responses
  function nl2br(str) {
    return esc(str).replace(/\n/g, '<br>');
  }

  // Append a chat bubble and scroll to bottom
  function addMsg(html, type = 'bot', delayMs = 0) {
    return new Promise(resolve => {
      setTimeout(() => {
        const wrap = document.createElement('div');
        wrap.className = `chat-msg ${type}`;
        wrap.innerHTML = `<div class="chat-bubble">${html}</div><div class="chat-msg-time">${timeStr()}</div>`;
        chatMsgs.appendChild(wrap);
        chatMsgs.scrollTop = chatMsgs.scrollHeight;
        resolve();
      }, delayMs);
    });
  }

  // Animated typing indicator (three bouncing dots)
  function showTyping() {
    const el = document.createElement('div');
    el.className = 'chat-msg bot';
    el.id = 'gchTyping';
    el.innerHTML = `<div class="chat-bubble chat-typing">
      <span></span><span></span><span></span>
    </div>`;
    chatMsgs.appendChild(el);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
  }
  function hideTyping() {
    const el = document.getElementById('gchTyping');
    if (el) el.remove();
  }

  // ── Show form after "Start Chat" click ──────────────────
  async function startChat() {
    if (welcomeScreen) welcomeScreen.style.display = 'none';
    if (chatBody) chatBody.style.display = 'flex';
    await addMsg("👋 Welcome to <strong>God's Covenant Hospital</strong>!", 'bot', 200);
    await addMsg("Please fill in your details so we can personalise your experience.", 'bot', 900);
  }

  // ── Transition: form → live chat ─────────────────────────
  async function goLiveChat(name) {
    if (formArea) formArea.style.display = 'none';
    if (liveArea) {
      liveArea.style.display = 'flex';
      // small animation
      liveArea.style.opacity = '0';
      setTimeout(() => { liveArea.style.opacity = '1'; liveArea.style.transition = 'opacity 0.4s'; }, 10);
    }
    const first = name.split(' ')[0];
    await addMsg(
      `Thank you, <strong>${esc(first)}</strong>! ✅ Your details have been saved.<br><br>` +
      `I'm your GCH Assistant — feel free to ask me anything about our services, fees, appointments, or anything else!`,
      'bot', 500
    );
    if (userInput) userInput.focus();
  }

  // ── Send user text to backend → OpenAI → display reply ──
  async function sendToAI(text) {
    if (!text.trim()) return;

    // Add to history and display user bubble
    conversationHistory.push({ role: 'user', content: text });
    addMsg(esc(text), 'user');

    // Disable input while waiting
    if (userInput) userInput.disabled = true;
    if (sendBtn)   sendBtn.disabled   = true;

    showTyping();

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationHistory,
          contactName: contactInfo ? contactInfo.name : null,
        }),
      });
      hideTyping();

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply = data.reply || data.error || "Sorry, I couldn't get a response. Please call 08033254690.";

      conversationHistory.push({ role: 'assistant', content: reply });
      await addMsg(nl2br(reply), 'bot');

    } catch (err) {
      hideTyping();
      console.warn('GCH chatbot error:', err);
      await addMsg(
        "Sorry, I'm having trouble connecting right now. Please call " +
        "<strong>08033254690</strong> or WhatsApp us for immediate help.",
        'bot'
      );
    } finally {
      if (userInput) { userInput.disabled = false; userInput.focus(); }
      if (sendBtn)   sendBtn.disabled = false;
    }
  }

  // ── Save contact locally (backup if server unreachable) ──
  function backupLocally(data) {
    try {
      const list = JSON.parse(localStorage.getItem('gch_contacts') || '[]');
      list.push({ id: Date.now(), timestamp: new Date().toISOString(), ...data });
      localStorage.setItem('gch_contacts', JSON.stringify(list));
    } catch (e) { /* silent */ }
  }

  // ── Events ───────────────────────────────────────────────

  // FAB open/close
  fab.addEventListener('click', () => {
    panel.classList.toggle('open');
    const notif = fab.querySelector('.fab-notif');
    if (notif) notif.style.display = 'none';
  });
  if (closeBtn) closeBtn.addEventListener('click', () => panel.classList.remove('open'));

  // Start Chat button
  if (startBtn) startBtn.addEventListener('click', startChat);

  // Contact form submit
  if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      contactInfo = {
        name:    chatForm.chat_name.value.trim(),
        email:   chatForm.chat_email.value.trim(),
        phone:   chatForm.chat_phone.value.trim(),
        address: chatForm.chat_address.value.trim(),
        inquiry: chatForm.chat_inquiry.value,
        source:  'chatbot',
      };

      if (!contactInfo.name || !contactInfo.phone) return;

      // Show what the user typed as a bubble
      addMsg(`<strong>${esc(contactInfo.name)}</strong> — ${esc(contactInfo.phone)}`, 'user');

      // Save locally as backup
      backupLocally(contactInfo);

      // POST to server → Excel
      try {
        await fetch(`${API_BASE}/api/save-contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contactInfo),
        });
      } catch (err) {
        console.warn('Server unreachable — contact saved locally only.');
      }

      // Switch to live AI chat
      await goLiveChat(contactInfo.name);
    });
  }

  // Live chat send button
  function handleSend() {
    const text = userInput ? userInput.value.trim() : '';
    if (!text) return;
    if (userInput) userInput.value = '';
    sendToAI(text);
  }

  if (sendBtn)   sendBtn.addEventListener('click', handleSend);
  if (userInput) {
    userInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });
  }

})();
