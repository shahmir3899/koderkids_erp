import React, { useState, useEffect } from "react";
import { sendMessageToRobot } from "../api";
import { useResponsive } from "../hooks/useResponsive";
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
  TOUCH_TARGETS,
} from "../utils/designConstants";

const RobotChat = () => {
  const { isMobile } = useResponsive();
  const [userInput, setUserInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);

  // ✅ Setup Speech Recognition on component mount
  useEffect(() => {
    if ("webkitSpeechRecognition" in window) {
      const speechRecognition = new window.webkitSpeechRecognition();
      speechRecognition.continuous = false;
      speechRecognition.interimResults = false;
      speechRecognition.lang = "en-US";

      speechRecognition.onstart = () => {
        setIsListening(true);
      };

      speechRecognition.onend = () => {
        setIsListening(false);
      };

      speechRecognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        handleUserInput(transcript);
      };

      setRecognition(speechRecognition);
    } else {
      alert("Speech recognition not supported in this browser. Try Chrome!");
    }
  }, []);

  // 🎙️ Start Listening to User
  const startListening = () => {
    if (recognition) {
      recognition.start();
    }
  };

  // ✉️ Handle User Input (Text or Voice)
  const handleUserInput = async (input) => {
    if (!input.trim()) return;
    
    const newUserMessage = { sender: "user", text: input };
    setChatHistory((prev) => [...prev, newUserMessage]);

    // Call Backend to Get Reply
    const response = await sendMessageToRobot(input);
    const botMessage = { sender: "bot", text: response };

    // Add Bot Reply to Chat History
    setChatHistory((prev) => [...prev, botMessage]);

    // 🎧 Speak Bot Reply
    speakReply(response);
  };

  // 🗣️ Speak Robot Reply
  const speakReply = (message) => {
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "en-US";
    speechSynthesis.speak(utterance);
  };

  // 📤 Send Text Input Manually
  const handleSend = () => {
    if (userInput.trim()) {
      handleUserInput(userInput);
      setUserInput("");
    }
  };

  // Get responsive styles
  const styles = getStyles(isMobile);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🤖 Robot Assistant</h2>

      <div style={styles.chatBox}>
        {chatHistory.map((msg, index) => (
          <div
            key={index}
            style={{
              ...styles.message,
              backgroundColor: msg.sender === "user"
                ? "rgba(16, 185, 129, 0.2)"
                : "rgba(248, 215, 218, 0.2)",
              alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
              color: msg.sender === "user" ? COLORS.status.success : COLORS.text.white,
            }}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <div style={styles.controls}>
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type your message..."
          style={styles.input}
        />
        <button onClick={handleSend} style={styles.sendButton}>
          {isMobile ? "📤" : "Send"}
        </button>
        <button onClick={startListening} style={styles.micButton}>
          {isListening ? "🎙️" : "🎤"} {!isMobile && (isListening ? "Listening..." : "Speak")}
        </button>
      </div>
    </div>
  );
};

// Responsive Styles Generator
const getStyles = (isMobile) => ({
  container: {
    width: "100%",
    maxWidth: isMobile ? "100%" : "450px",
    margin: isMobile ? 0 : "50px auto",
    ...MIXINS.glassmorphicCard,
    borderRadius: isMobile ? 0 : BORDER_RADIUS.lg,
    padding: isMobile ? SPACING.md : SPACING.lg,
    minHeight: isMobile ? "100vh" : "auto",
    display: "flex",
    flexDirection: "column",
  },
  title: {
    color: COLORS.text.white,
    fontSize: isMobile ? FONT_SIZES.xl : FONT_SIZES["2xl"],
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  chatBox: {
    flex: 1,
    minHeight: isMobile ? "calc(100vh - 200px)" : "300px",
    maxHeight: isMobile ? "none" : "400px",
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    display: "flex",
    flexDirection: "column",
    gap: SPACING.xs,
  },
  message: {
    padding: isMobile ? SPACING.sm : SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
    maxWidth: isMobile ? "85%" : "70%",
    fontSize: isMobile ? FONT_SIZES.sm : FONT_SIZES.md,
    lineHeight: "1.5",
    wordBreak: "break-word",
  },
  controls: {
    display: "flex",
    gap: SPACING.sm,
    flexWrap: isMobile ? "wrap" : "nowrap",
    // Safe area padding for mobile
    paddingBottom: isMobile ? `env(safe-area-inset-bottom, ${SPACING.sm})` : 0,
  },
  input: {
    flex: isMobile ? "1 1 100%" : 1,
    order: isMobile ? 1 : 0,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: COLORS.text.white,
    fontSize: "16px", // Prevents iOS zoom
    minHeight: TOUCH_TARGETS.large,
    transition: TRANSITIONS.fast,
  },
  sendButton: {
    padding: isMobile ? `${SPACING.sm} ${SPACING.md}` : `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: COLORS.status.success,
    color: "white",
    border: "none",
    borderRadius: BORDER_RADIUS.md,
    cursor: "pointer",
    minWidth: isMobile ? TOUCH_TARGETS.large : "auto",
    minHeight: TOUCH_TARGETS.large,
    fontSize: isMobile ? FONT_SIZES.lg : FONT_SIZES.md,
    fontWeight: "500",
    transition: TRANSITIONS.fast,
    order: isMobile ? 2 : 0,
    flex: isMobile ? "1 1 45%" : "none",
  },
  micButton: {
    padding: isMobile ? `${SPACING.sm} ${SPACING.md}` : `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: COLORS.primary,
    color: "white",
    border: "none",
    borderRadius: BORDER_RADIUS.md,
    cursor: "pointer",
    minWidth: isMobile ? TOUCH_TARGETS.large : "auto",
    minHeight: TOUCH_TARGETS.large,
    fontSize: isMobile ? FONT_SIZES.lg : FONT_SIZES.md,
    fontWeight: "500",
    transition: TRANSITIONS.fast,
    order: isMobile ? 3 : 0,
    flex: isMobile ? "1 1 45%" : "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
  },
});

export default RobotChat;
