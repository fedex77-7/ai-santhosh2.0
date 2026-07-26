// EmailJS Initialization
(function() {
    emailjs.init("FKnQFlga2fuKJ-z08");
})();

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyANotcjrN-oGPa97KsqpJQmTp7E0eXCmhA",
  authDomain: "santhosh-ai-e2465.firebaseapp.com",
  projectId: "santhosh-ai-e2465",
  storageBucket: "santhosh-ai-e2465.firebasestorage.app",
  messagingSenderId: "318363946402",
  appId: "1:318363946402:web:c953d0621780d5ec3036fb",
  measurementId: "G-T5BMBNHQ6N"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const BACKEND_URL = "https://santhoshai2-0.onrender.com/api/chat";

let chatHistory = [];
let generatedOTP = null;
let currentUserEmail = null;

// Send OTP Logic
function sendOTP() {
  const email = document.getElementById("userEmail").value.trim();
  const status = document.getElementById("loginStatus");

  if (!email) {
    status.style.color = "#f87171";
    status.innerText = "ദയവായി ഇമെയിൽ വിലാസം നൽകുക!";
    return;
  }

  generatedOTP = Math.floor(1000 + Math.random() * 9000).toString();
  status.style.color = "#38bdf8";
  status.innerText = "OTP അയക്കുന്നു...";

  emailjs.send("Service_4b43nui", "template_7csira9", {
    to_email: email,
    otp_code: generatedOTP
  })
  .then(function() {
    status.style.color = "#4ade80";
    status.innerText = "OTP ഇമെയിലിലേക്ക് അയച്ചിട്ടുണ്ട്!";
    document.getElementById("otpGroup").style.display = "block";
    document.getElementById("sendOtpBtn").style.display = "none";
  }, function(error) {
    console.error("EmailJS Error:", error);
    status.style.color = "#f87171";
    status.innerText = "OTP അയക്കാൻ സാധിച്ചില്ല!";
  });
}

// Verify OTP
function verifyOTP() {
  const userOTP = document.getElementById("otpInput").value.trim();
  const status = document.getElementById("loginStatus");

  if (userOTP === generatedOTP) {
    currentUserEmail = document.getElementById("userEmail").value.trim();
    document.getElementById("loginCard").style.display = "none";
    document.getElementById("chatContainer").style.display = "flex";
    document.getElementById("userHeaderTitle").innerText = currentUserEmail.split('@')[0];
    
    loadChatHistory();
  } else {
    status.style.color = "#f87171";
    status.innerText = "തെറ്റായ OTP!";
  }
}

function startGuestChat() {
  currentUserEmail = null;
  document.getElementById("loginCard").style.display = "none";
  document.getElementById("chatContainer").style.display = "flex";
  document.getElementById("userHeaderTitle").innerText = "Guest User";
}

function exitChat() {
  document.getElementById("chatContainer").style.display = "none";
  document.getElementById("loginCard").style.display = "block";
  document.getElementById("otpGroup").style.display = "none";
  document.getElementById("sendOtpBtn").style.display = "block";
  document.getElementById("userEmail").value = "";
  document.getElementById("otpInput").value = "";
  document.getElementById("loginStatus").innerText = "";
  document.getElementById("chatBox").innerHTML = '<div class="message bot-message"><div class="msg-content">നമസ്കാരം! ഞാൻ എങ്ങനെ സഹായിക്കേണ്ടത്?</div></div>';
  chatHistory = [];
  currentUserEmail = null;
  generatedOTP = null;
}

// Load Chat History from Firestore
async function loadChatHistory() {
  if (!currentUserEmail) return;

  try {
    const docRef = db.collection("chats").doc(currentUserEmail);
    const doc = await docRef.get();

    if (doc.exists) {
      chatHistory = doc.data().messages || [];
      const chatBox = document.getElementById("chatBox");
      chatBox.innerHTML = "";

      chatHistory.forEach(msg => {
        appendMessage(msg.content, msg.role === "user" ? "user-message" : "bot-message");
      });
    }
  } catch (error) {
    console.error("Firebase Read Error:", error);
  }
}

// Save Chat History to Firestore
async function saveChatToFirebase() {
  if (!currentUserEmail) return;

  try {
    await db.collection("chats").doc(currentUserEmail).set({
      messages: chatHistory,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error("Firebase Save Error:", error);
  }
}

// Messaging Logic
async function sendMessage() {
  const inputElement = document.getElementById("userInput");
  const chatBox = document.getElementById("chatBox");
  const userText = inputElement.value.trim();

  if (!userText) return;

  appendMessage(userText, "user-message");
  inputElement.value = "";

  chatHistory.push({ role: "user", content: userText });

  const loadingElement = document.createElement("div");
  loadingElement.className = "message bot-message";
  loadingElement.innerHTML = '<div class="msg-content">ചിന്തിക്കുന്നു...</div>';
  chatBox.appendChild(loadingElement);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatHistory })
    });

    const data = await response.json();
    chatBox.removeChild(loadingElement);

    if (data.choices && data.choices[0].message) {
      const botReply = data.choices[0].message.content;
      appendMessage(botReply, "bot-message");
      chatHistory.push({ role: "assistant", content: botReply });

      saveChatToFirebase();
    } else {
      appendMessage("മറുപടി ലഭിച്ചില്ല. വീണ്ടും ശ്രമിക്കുക.", "bot-message");
    }

  } catch (error) {
    console.error("Error:", error);
    chatBox.removeChild(loadingElement);
    appendMessage("സെർവർ കണക്ഷൻ എറർ!", "bot-message");
  }
}

function appendMessage(text, className) {
  const chatBox = document.getElementById("chatBox");
  const messageElement = document.createElement("div");
  messageElement.className = `message ${className}`;
  messageElement.innerHTML = `<div class="msg-content">${text}</div>`;
  chatBox.appendChild(messageElement);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function handleKeyPress(event) {
  if (event.key === "Enter") {
    sendMessage();
  }
}