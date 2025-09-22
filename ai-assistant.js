const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";
const STORAGE_KEY = "gym-tracker-gemini-api-key";
const SYSTEM_PROMPT = `Sei un coach di forza e ipertrofia. Trasforma il resoconto testuale dell'atleta in:
1. Un riepilogo strutturato dell'allenamento appena svolto, organizzando ogni esercizio con serie, ripetizioni, carico, tempo di recupero e note tecniche utili.
2. Evidenzia eventuali lacune o punti di attenzione (mobilità, tecnica, gestione del carico, recupero).
3. Suggerisci come impostare il prossimo allenamento collegato (progressioni su volume, intensità, varianti alternative, lavoro complementare).

Rispondi sempre in italiano con il seguente formato Markdown:
## Allenamento Strutturato
- elenco puntato o tabella ordinata degli esercizi svolti
## Punti Chiave da Tenere a Mente
- bullet concisi
## Suggerimenti per il Prossimo Allenamento
- bullet con progressioni, metriche da monitorare e eventuali note sul recupero

Se mancano dati nel testo dell'utente, esplicita cosa servirebbe per completare il quadro e fornisci comunque indicazioni generiche ma pratiche.`;

const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const promptInput = document.getElementById("prompt-input");
const sendButton = document.getElementById("send-btn");
const apiKeyInput = document.getElementById("api-key-input");
const saveApiKeyButton = document.getElementById("save-api-key");
const clearApiKeyButton = document.getElementById("clear-api-key");
const toggleVisibilityButton = document.getElementById("toggle-visibility");
const togglePanelButton = document.getElementById("toggle-api-panel");
const panelBody = document.getElementById("api-panel-body");
const apiStatus = document.getElementById("api-status");

const conversation = [];

function appendMessage(role, text, options = {}) {
    const wrapper = document.createElement("div");
    wrapper.className = `message ${role}` + (options.error ? " error" : "");

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;

    wrapper.appendChild(bubble);
    chatWindow.appendChild(wrapper);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return wrapper;
}

function showTypingIndicator() {
    const wrapper = document.createElement("div");
    wrapper.className = "message assistant typing";

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    for (let i = 0; i < 3; i += 1) {
        const dot = document.createElement("span");
        dot.className = "typing-dot";
        bubble.appendChild(dot);
    }

    wrapper.appendChild(bubble);
    chatWindow.appendChild(wrapper);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return wrapper;
}

function setStatus(message, type = "info") {
    if (!apiStatus) return;
    apiStatus.textContent = message;
    apiStatus.className = `status-message ${type}`;
}

function loadStoredApiKey() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        apiKeyInput.value = stored;
        setStatus("API key caricata dal browser.", "success");
    }
}

function saveApiKey() {
    const value = apiKeyInput.value.trim();
    if (!value) {
        setStatus("Inserisci una API key valida prima di salvare.", "error");
        return;
    }
    localStorage.setItem(STORAGE_KEY, value);
    setStatus("API key salvata in locale.", "success");
}

function clearApiKey() {
    localStorage.removeItem(STORAGE_KEY);
    apiKeyInput.value = "";
    setStatus("API key rimossa dal browser.", "info");
}

function toggleApiKeyVisibility() {
    const currentType = apiKeyInput.getAttribute("type");
    const nextType = currentType === "password" ? "text" : "password";
    apiKeyInput.setAttribute("type", nextType);
    const isVisible = nextType === "text";
    toggleVisibilityButton.setAttribute("aria-pressed", String(isVisible));
    toggleVisibilityButton.textContent = isVisible ? "🙈" : "👁";
}

function toggleApiPanel() {
    const expanded = togglePanelButton.getAttribute("aria-expanded") === "true";
    togglePanelButton.setAttribute("aria-expanded", String(!expanded));
    togglePanelButton.textContent = expanded ? "Mostra" : "Nascondi";
    panelBody.hidden = expanded;
}

async function callGemini(apiKey) {
    const payload = {
        systemInstruction: {
            role: "system",
            parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: conversation.map((message) => ({
            role: message.role,
            parts: [{ text: message.text }]
        })),
        generationConfig: {
            temperature: 0.7,
            topK: 32,
            topP: 0.95
        }
    };

    const response = await fetch(`${API_URL}?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        let errorDetail = response.statusText;
        try {
            const err = await response.json();
            errorDetail = err?.error?.message || JSON.stringify(err);
        } catch (parseError) {
            // ignore
        }
        throw new Error(`Gemini ha restituito un errore (${response.status}): ${errorDetail}`);
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];
    if (!candidate) {
        throw new Error("Risposta vuota dal modello.");
    }

    if (candidate.finishReason === "SAFETY") {
        throw new Error("La richiesta è stata bloccata dalle policy di sicurezza di Gemini.");
    }

    const text = candidate.content?.parts?.map((part) => part.text).join("\n").trim();
    if (!text) {
        throw new Error("Non sono riuscito a leggere la risposta del modello.");
    }

    return text;
}

function autoResizeTextarea() {
    promptInput.style.height = "auto";
    const computed = Math.min(promptInput.scrollHeight, 220);
    promptInput.style.height = `${computed}px`;
}

async function handleSubmit(event) {
    event.preventDefault();
    const userMessage = promptInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    if (!userMessage) {
        return;
    }

    if (!apiKey) {
        setStatus("Inserisci l'API key di Gemini per inviare la richiesta.", "error");
        return;
    }

    sendButton.disabled = true;
    promptInput.disabled = true;

    appendMessage("user", userMessage);
    conversation.push({ role: "user", text: userMessage });
    promptInput.value = "";
    autoResizeTextarea();

    const typingIndicator = showTypingIndicator();

    try {
        const reply = await callGemini(apiKey);
        chatWindow.removeChild(typingIndicator);
        appendMessage("assistant", reply);
        conversation.push({ role: "model", text: reply });
        setStatus("Risposta ricevuta da Gemini.", "success");
    } catch (error) {
        chatWindow.removeChild(typingIndicator);
        appendMessage("assistant", error.message, { error: true });
        conversation.pop();
        setStatus(error.message, "error");
    } finally {
        sendButton.disabled = false;
        promptInput.disabled = false;
        promptInput.focus();
    }
}

saveApiKeyButton?.addEventListener("click", saveApiKey);
clearApiKeyButton?.addEventListener("click", clearApiKey);
toggleVisibilityButton?.addEventListener("click", toggleApiKeyVisibility);
togglePanelButton?.addEventListener("click", toggleApiPanel);
chatForm?.addEventListener("submit", handleSubmit);
promptInput?.addEventListener("input", autoResizeTextarea);

promptInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        chatForm.requestSubmit();
    }
});

window.addEventListener("load", () => {
    loadStoredApiKey();
    autoResizeTextarea();
});
