/* =====================================================================
   QuickChat - Client Application Logic
   ===================================================================== */

// Initialize Socket.io
const socket = io();

// DOM Elements
const viewLobby = document.getElementById('view-lobby');
const viewSearching = document.getElementById('view-searching');
const viewChat = document.getElementById('view-chat');

const btnFind = document.getElementById('btn-find');
const btnCancelFind = document.getElementById('btn-cancel-find');
const btnEnd = document.getElementById('btn-end');
const btnLeave = document.getElementById('btn-leave');
const btnRefind = document.getElementById('btn-refind');

const statOnlineText = document.getElementById('stat-online-text');
const searchTimer = document.getElementById('search-timer');
const searchingStatus = document.getElementById('searching-status');

const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const btnSend = document.getElementById('btn-send');
const typingIndicator = document.getElementById('typing-indicator');
const partnerLeftOverlay = document.getElementById('partner-left-overlay');
const partnerStatusText = document.getElementById('partner-status-text');

const soundToggleBtn = document.getElementById('sound-toggle-btn');
const soundIcon = document.getElementById('sound-icon');
const brandLogo = document.getElementById('brand-logo');

// App State
let currentView = 'lobby'; // 'lobby' | 'searching' | 'chat'
let timerInterval = null;
let searchSeconds = 0;
let soundEnabled = true;
let typingTimeout = null;
let isCurrentlyTyping = false;

// Audio Synthesizer (Zero asset dependencies, smooth modern sound design)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(type) {
  if (!soundEnabled) return;
  try {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const now = audioCtx.currentTime;

    if (type === 'match') {
      // Pleasant rising arpeggio for match found
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(440, now); // A4
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
      osc2.frequency.setValueAtTime(659.25, now + 0.1); // E5

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);

      osc1.start(now);
      osc2.start(now + 0.1);
      osc1.stop(now + 0.45);
      osc2.stop(now + 0.45);

    } else if (type === 'message') {
      // Soft pop / droplet for message
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.2);

    } else if (type === 'leave') {
      // Gentle descending tone when stranger leaves
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.exponentialRampToValueAtTime(261.63, now + 0.25); // C4

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch (err) {
    console.debug('Audio error:', err);
  }
}

// Switch between views
function switchView(viewName) {
  currentView = viewName;

  viewLobby.classList.remove('active');
  viewSearching.classList.remove('active');
  viewChat.classList.remove('active');

  if (viewName === 'lobby') {
    viewLobby.classList.add('active');
    stopSearchTimer();
    clearChatMessages(); // Completely wipe messages when returning to lobby
    partnerLeftOverlay.style.display = 'none';
    typingIndicator.style.display = 'none';
  } else if (viewName === 'searching') {
    viewSearching.classList.add('active');
    startSearchTimer();
  } else if (viewName === 'chat') {
    viewChat.classList.add('active');
    stopSearchTimer();
    partnerLeftOverlay.style.display = 'none';
    messageInput.disabled = false;
    btnSend.disabled = false;
    partnerStatusText.textContent = 'Connected';
    partnerStatusText.style.color = '#10b981';
    messageInput.focus();
  }

  // Refresh icons
  if (window.lucide) {
    lucide.createIcons();
  }
}

// Search timer helpers
function startSearchTimer() {
  searchSeconds = 0;
  updateTimerDisplay();
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    searchSeconds++;
    updateTimerDisplay();
  }, 1000);
}

function stopSearchTimer() {
  clearInterval(timerInterval);
  searchSeconds = 0;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const mins = String(Math.floor(searchSeconds / 60)).padStart(2, '0');
  const secs = String(searchSeconds % 60).padStart(2, '0');
  searchTimer.textContent = `${mins}:${secs}`;
}

// Clear all ephemeral messages from DOM
function clearChatMessages() {
  chatMessages.innerHTML = '';
}

// Append message bubble
function appendMessage({ sender, text, timestamp }) {
  const row = document.createElement('div');
  row.classList.add('msg-row', sender);

  const author = document.createElement('span');
  author.classList.add('msg-author');
  author.textContent = sender === 'me' ? 'You' : 'Stranger';

  const bubble = document.createElement('div');
  bubble.classList.add('msg-bubble');
  bubble.textContent = text;

  const time = document.createElement('span');
  time.classList.add('msg-time');
  const date = timestamp ? new Date(timestamp) : new Date();
  time.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  row.appendChild(author);
  row.appendChild(bubble);
  row.appendChild(time);

  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Append system notice
function appendSystemNotice(text) {
  const notice = document.createElement('div');
  notice.classList.add('msg-system');
  notice.textContent = text;
  chatMessages.appendChild(notice);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Event Listeners

// 1. Click FIND on Base Page
btnFind.addEventListener('click', () => {
  // Ensure audio context is ready on user gesture
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  socket.emit('find_match');
  searchingStatus.textContent = 'Searching for an available stranger...';
  switchView('searching');
});

// 2. Click Cancel while searching
btnCancelFind.addEventListener('click', () => {
  socket.emit('cancel_find');
  switchView('lobby');
});

// 3. Click End in chatbox (User leaves -> immediately goes to main page)
btnEnd.addEventListener('click', () => {
  if (confirm('End this conversation and return to the main page?')) {
    socket.emit('end_chat');
    switchView('lobby');
  }
});

// 4. Click Leave after stranger left (Directs to main page)
btnLeave.addEventListener('click', () => {
  socket.emit('leave_room');
  switchView('lobby');
});

// 5. Click Find Next after stranger left (Instant re-find)
btnRefind.addEventListener('click', () => {
  socket.emit('leave_room');
  clearChatMessages();
  partnerLeftOverlay.style.display = 'none';
  socket.emit('find_match');
  searchingStatus.textContent = 'Searching for someone new...';
  switchView('searching');
});

// Brand click to home
brandLogo.addEventListener('click', () => {
  if (currentView === 'chat') {
    if (confirm('Leave current conversation?')) {
      socket.emit('end_chat');
      switchView('lobby');
    }
  } else if (currentView === 'searching') {
    socket.emit('cancel_find');
    switchView('lobby');
  }
});

// Sound toggle
soundToggleBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  if (soundEnabled) {
    soundIcon.setAttribute('data-lucide', 'volume-2');
    soundToggleBtn.style.color = '#818cf8';
  } else {
    soundIcon.setAttribute('data-lucide', 'volume-x');
    soundToggleBtn.style.color = 'var(--text-sub)';
  }
  if (window.lucide) {
    lucide.createIcons();
  }
});

// Chat Form Submit (Send message)
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  // Append locally
  const now = Date.now();
  appendMessage({ sender: 'me', text, timestamp: now });
  playTone('message');

  // Send over WebSocket
  socket.emit('send_message', { text });

  // Clear input
  messageInput.value = '';
  messageInput.focus();

  // Reset typing indicator
  if (isCurrentlyTyping) {
    isCurrentlyTyping = false;
    socket.emit('typing_status', { isTyping: false });
  }
});

// Typing detection
messageInput.addEventListener('input', () => {
  if (!isCurrentlyTyping) {
    isCurrentlyTyping = true;
    socket.emit('typing_status', { isTyping: true });
  }

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    isCurrentlyTyping = false;
    socket.emit('typing_status', { isTyping: false });
  }, 1200);
});

// Socket Event Handlers

// Online stats update
socket.on('stats_update', (data) => {
  if (data && typeof data.online === 'number') {
    const online = data.online;
    const inChat = data.inChat || 0;
    statOnlineText.textContent = `${online} online • ${inChat} chatting`;
  }
});

// Waiting in queue confirmation
socket.on('waiting_for_match', () => {
  searchingStatus.textContent = 'In queue. Waiting for another user to connect...';
});

// Search cancelled
socket.on('search_cancelled', () => {
  switchView('lobby');
});

// Match Found
socket.on('match_found', (data) => {
  clearChatMessages();
  switchView('chat');
  playTone('match');
  appendSystemNotice('Connected with a random stranger! Say hello.');
});

// Incoming message from stranger
socket.on('receive_message', (data) => {
  typingIndicator.style.display = 'none';
  appendMessage({
    sender: 'stranger',
    text: data.text,
    timestamp: data.timestamp
  });
  playTone('message');
});

// Stranger is typing status
socket.on('partner_typing', (data) => {
  if (data.isTyping) {
    typingIndicator.style.display = 'flex';
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } else {
    typingIndicator.style.display = 'none';
  }
});

// Partner has left the chat (The core notification requirement)
socket.on('partner_left', () => {
  playTone('leave');
  typingIndicator.style.display = 'none';
  messageInput.disabled = true;
  btnSend.disabled = true;
  partnerStatusText.textContent = 'Disconnected';
  partnerStatusText.style.color = '#ef4444';

  appendSystemNotice('The other person has left the conversation.');

  // Show the requested "person leave" notification overlay with "Leave" button
  partnerLeftOverlay.style.display = 'flex';
  if (window.lucide) {
    lucide.createIcons();
  }
});

// Self ended chat confirmation
socket.on('chat_ended_self', () => {
  switchView('lobby');
});

// Left room confirmed
socket.on('left_room_confirmed', () => {
  switchView('lobby');
});

// Mobile virtual keyboard & viewport adjustments
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    if (currentView === 'chat') {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  });
}

messageInput.addEventListener('focus', () => {
  setTimeout(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 300);
});

// Initialize icons on first load
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    lucide.createIcons();
  }
});
