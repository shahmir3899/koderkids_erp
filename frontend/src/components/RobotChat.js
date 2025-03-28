import React, { useState, useEffect } from "react";
import { sendMessageToRobot } from "../api";

const RobotChat = () => {
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

  return (
    <div style={styles.container}>
      <h2>🤖 Robot Assistant</h2>
      
      <div style={styles.chatBox}>
        {chatHistory.map((msg, index) => (
          <div
            key={index}
            style={{
              ...styles.message,
              backgroundColor: msg.sender === "user" ? "#d1e7dd" : "#f8d7da",
              alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
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
          placeholder="Type your message..."
          style={styles.input}
        />
        <button onClick={handleSend} style={styles.sendButton}>Send</button>
        <button onClick={startListening} style={styles.micButton}>
          {isListening ? "🎙️ Listening..." : "🎤 Speak"}
        </button>
      </div>
    </div>
  );
};

// 🎨 Basic Styles
const styles = {
  container: {
    width: "400px",
    margin: "50px auto",
    border: "1px solid #ccc",
    borderRadius: "10px",
    padding: "20px",
    backgroundColor: "#fff",
  },
  chatBox: {
    height: "300px",
    overflowY: "auto",
    border: "1px solid #ccc",
    borderRadius: "5px",
    padding: "10px",
    marginBottom: "10px",
  },
  message: {
    padding: "10px",
    borderRadius: "8px",
    marginBottom: "5px",
    maxWidth: "70%",
  },
  controls: {
    display: "flex",
    gap: "5px",
  },
  input: {
    flex: 1,
    padding: "10px",
    borderRadius: "5px",
    border: "1px solid #ccc",
  },
  sendButton: {
    padding: "10px 15px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  micButton: {
    padding: "10px 15px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
};

export default RobotChat;
