/**
 * AI Financial Chatbot Assistant Logic
 */

let isBotThinking = false;

async function initAIAssistant() {
  Auth.requireAuth();
  UI.initLayout('ai-assistant');

  const form = document.getElementById('chat-form');
  if (form) {
    form.addEventListener('submit', handleSendMessage);
  }

  // Pre-load prompt chips
  setupPromptChips();
}

function setupPromptChips() {
  const chips = [
    'How much did I spend this month?',
    'What is my biggest expense category?',
    'How can I save more money next month?',
    'Am I on track with my monthly budget?',
    'Analyze my spending trends and give suggestions',
  ];

  const container = document.getElementById('prompt-chips-container');
  if (container) {
    container.innerHTML = chips.map(c => `
      <button class="prompt-chip" onclick="sendCustomPrompt('${c.replace(/'/g, "\\'")}')">
        ${c}
      </button>
    `).join('');
  }
}

function sendCustomPrompt(text) {
  const input = document.getElementById('chat-input');
  if (input) {
    input.value = text;
    document.getElementById('chat-form')?.dispatchEvent(new Event('submit'));
  }
}

async function handleSendMessage(e) {
  if (e) e.preventDefault();
  if (isBotThinking) return;

  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;

  // Append user message bubble
  appendChatBubble(message, 'user');
  input.value = '';

  // Append typing indicator
  const typingEl = appendTypingIndicator();
  isBotThinking = true;

  try {
    const res = await API.post('/ai/chat', { message });
    typingEl.remove();

    if (res.success && res.data) {
      appendChatBubble(formatMarkdown(res.data.message), 'ai', true);
    } else {
      appendChatBubble('I apologize, but I encountered an error analyzing your finances. Please try again.', 'ai');
    }
  } catch (err) {
    typingEl.remove();
    appendChatBubble('Sorry, could not connect to the AI engine. Please check your network or API settings.', 'ai');
  } finally {
    isBotThinking = false;
  }
}

function appendChatBubble(text, sender, isHtml = false) {
  const messagesContainer = document.getElementById('chat-messages');
  if (!messagesContainer) return;

  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${sender}`;

  if (isHtml) {
    bubble.innerHTML = text;
  } else {
    bubble.textContent = text;
  }

  messagesContainer.appendChild(bubble);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function appendTypingIndicator() {
  const messagesContainer = document.getElementById('chat-messages');
  const typing = document.createElement('div');
  typing.className = 'chat-bubble ai typing-indicator';
  typing.innerHTML = `
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  `;
  messagesContainer.appendChild(typing);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  return typing;
}

// Simple Markdown Formatter
function formatMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/^### (.*$)/gim, '<h3 style="font-size:15px; font-weight:700; margin-top:6px; margin-bottom:4px;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="font-size:16px; font-weight:700; margin-top:8px; margin-bottom:4px;">$1</h2>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul style="margin: 8px 0; padding-left: 20px;">$1</ul>')
    .replace(/\n\n/gim, '<p style="margin-bottom: 8px;"></p>');
}

window.initAIAssistant = initAIAssistant;
window.sendCustomPrompt = sendCustomPrompt;
