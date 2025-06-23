// Get username from URL parameters
function getUsername() {
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username');
    return username || 'User';
}

let storedUsername = getUsername();

// Insert username into welcome text
document.getElementById('username').textContent = storedUsername;

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', () => {
    window.location.href = 'index.html';
});

// DOM elements
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const chatMessages = document.getElementById('chatMessages');
const typingIndicator = document.getElementById('typingIndicator');

// Helper: Get user avatar (first letter of username)
function getUserAvatar() {
    return storedUsername.charAt(0).toUpperCase();
}

// Helper: Format time
function formatTime() {
    return new Date().toLocaleTimeString();
}

// Add message to chat window
function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;

    const avatar = isUser ? getUserAvatar() : '🤖';
    const avatarClass = isUser ? 'user-avatar' : 'bot-avatar';

    messageDiv.innerHTML = `
        <div class="message-content">
            <div class="${avatarClass}">${avatar}</div>
            <div class="message-text">
                <p>${text}</p>
            </div>
        </div>
        <div class="message-time">${formatTime()}</div>
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show/hide typing indicator
function showTypingIndicator() {
    if (typingIndicator) {
        typingIndicator.classList.add('active');
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

function hideTypingIndicator() {
    if (typingIndicator) {
        typingIndicator.classList.remove('active');
    }
}

// ✅ NEW: Calls your own backend instead of Gemini API directly
async function callGeminiAPI(message) {
    try {
        const response = await fetch('http://localhost:3000/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: message }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000
                },
                safetySettings: [
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        if (data?.candidates?.length > 0) {
            const parts = data.candidates[0].content.parts;
            const text = parts.map(p => p.text || '').join('\n').trim();
            return text || "🤖 I received your message but couldn't generate a response.";
        } else {
            return "🤖 Sorry, I couldn't understand that. Could you try rephrasing?";
        }
    } catch (error) {
        console.error('Error from Gemini API:', error);
        return "⚠️ There was a problem connecting to the Gemini API.";
    }
}

// Handle sending a message
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    sendButton.disabled = true;
    messageInput.disabled = true;

    addMessage(message, true);
    messageInput.value = '';

    showTypingIndicator();

    try {
        const aiResponse = await callGeminiAPI(message);
        hideTypingIndicator();
        addMessage(aiResponse);
    } catch (error) {
        hideTypingIndicator();
        addMessage("⚠️ Oops, something went wrong. Please try again.");
        console.error('Send message error:', error);
    } finally {
        sendButton.disabled = false;
        messageInput.disabled = false;
        messageInput.focus();
    }
}

// Event listeners
if (sendButton) {
    sendButton.addEventListener('click', sendMessage);
}

if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    messageInput.focus();
}

// On page load
document.addEventListener('DOMContentLoaded', async function () {
    console.log('Chat script loaded successfully');
    console.log(`Welcome ${storedUsername}!`);

    showTypingIndicator();
    try {
        const greeting = await callGeminiAPI(`Say a brief friendly hello to ${storedUsername} and introduce yourself as a helpful AI assistant. Keep it short and welcoming.`);
        hideTypingIndicator();
        addMessage(greeting);
    } catch (error) {
        hideTypingIndicator();
        addMessage(`👋 Hello ${storedUsername}! I'm your AI assistant powered by Gemini. How can I help you today?`);
    }
});
