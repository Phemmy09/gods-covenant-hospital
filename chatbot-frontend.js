// ============================================================
//  GOD'S COVENANT HOSPITAL — Chatbot Frontend
//  Handles all chatbot UI, form capture, and n8n webhook.
// ============================================================

(function () {
  'use strict';

  const N8N_WEBHOOK = 'https://n8n.izzytechub.com/webhook/9c92a3e7-7a31-4e82-809b-15aaf7dab3c4';

  // ── Auto-detect local vs deployed ────────────────────────
  const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : '';

  // ── State ────────────────────────────────────────────────
  let contactInfo = null;
  let conversationHistory = [];
  let summarySent = false;

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

  function nl2br(str) {
    return esc(str).replace(/\n/g, '<br>');
  }

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
  async function goLiveChat(name, webhookReply) {
    if (formArea) formArea.style.display = 'none';
    if (liveArea) {
      liveArea.style.display = 'flex';
      liveArea.style.opacity = '0';
      setTimeout(() => { liveArea.style.opacity = '1'; liveArea.style.transition = 'opacity 0.4s'; }, 10);
    }
    const first = name.split(' ')[0];
    if (webhookReply) {
      await addMsg(nl2br(webhookReply), 'bot', 500);
    } else {
      await addMsg(
        `Thank you, <strong>${esc(first)}</strong>! ✅ Your details have been saved.<br><br>` +
        `I'm your GCH Assistant — feel free to ask me anything about our services, fees, appointments, or anything else!`,
        'bot', 500
      );
    }
    if (userInput) userInput.focus();
  }

  // ── Send user text to n8n AI agent → display reply ──────
  async function sendToAI(text) {
    if (!text.trim()) return;

    conversationHistory.push({ role: 'user', content: text });
    addMsg(esc(text), 'user');

    if (userInput) userInput.disabled = true;
    if (sendBtn)   sendBtn.disabled   = true;

    showTyping();

    try {
      const res = await fetch(N8N_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'chat_message',
          message: text,
          contact: contactInfo,
          history: conversationHistory,
          timestamp: new Date().toISOString(),
        }),
      });
      hideTyping();

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json().catch(() => null);
      const reply = (data && (data.message || data.reply || data.output || data.text))
        || "Sorry, I couldn't get a response. Please call 08033254690.";

      conversationHistory.push({ role: 'assistant', content: reply });
      await addMsg(nl2br(reply), 'bot');

      // Auto-send summary on goodbye
      const goodbyeWords = ['bye', 'goodbye', 'thank you', 'thanks', 'that will be all', "that's all"];
      if (goodbyeWords.some(w => text.toLowerCase().includes(w))) {
        setTimeout(() => sendConversationSummary(), 2000);
      }

    } catch (err) {
      hideTyping();
      console.warn('GCH n8n webhook error:', err);
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

  // ── Save chat history to localStorage for admin log ─────
  function saveChatHistory() {
    if (!contactInfo || conversationHistory.length === 0) return;
    try {
      const histories = JSON.parse(localStorage.getItem('gch_chat_histories') || '[]');
      histories.push({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        contact: contactInfo,
        conversation: conversationHistory,
      });
      localStorage.setItem('gch_chat_histories', JSON.stringify(histories));
    } catch (e) { console.warn('Could not save chat history:', e); }
  }

  // ── Send conversation summary to n8n for email ──────────
  async function sendConversationSummary() {
    if (!contactInfo || conversationHistory.length === 0 || summarySent) return;
    summarySent = true;

    // Save to localStorage so admin page can display it
    saveChatHistory();

    const summaryText = conversationHistory.map(m =>
      `${m.role === 'user' ? contactInfo.name : 'GCH Assistant'}: ${m.content}`
    ).join('\n\n');

    const payload = {
      event: 'conversation_ended',
      contact: contactInfo,
      conversation: conversationHistory,
      summary: summaryText,
      timestamp: new Date().toISOString(),
    };

    try {
      await fetch(N8N_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(N8N_WEBHOOK, JSON.stringify(payload));
      }
      console.warn('Could not send conversation summary:', err);
    }
  }

  // ── Save contact locally (backup) ────────────────────────
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

  // Close button — send summary first
  if (closeBtn) {
    closeBtn.addEventListener('click', async () => {
      await sendConversationSummary();
      panel.classList.remove('open');
    });
  }

  // Start Chat button
  if (startBtn) startBtn.addEventListener('click', startChat);

  // Contact form submit — save details locally, start chat (n8n called at end)
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

      addMsg(`<strong>${esc(contactInfo.name)}</strong> — ${esc(contactInfo.phone)}`, 'user');
      backupLocally(contactInfo);

      // No webhook call here — n8n is called at end of conversation with full summary
      await goLiveChat(contactInfo.name, null);
    });
  }

  // Live chat send
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

  // Send summary on page close/refresh
  window.addEventListener('beforeunload', () => {
    if (contactInfo && conversationHistory.length > 0 && !summarySent) {
      summarySent = true;
      const payload = JSON.stringify({
        event: 'conversation_ended',
        contact: contactInfo,
        conversation: conversationHistory,
        summary: conversationHistory.map(m =>
          `${m.role === 'user' ? contactInfo.name : 'GCH Assistant'}: ${m.content}`
        ).join('\n\n'),
        timestamp: new Date().toISOString(),
      });
      navigator.sendBeacon(N8N_WEBHOOK, payload);
    }
  });

})();
