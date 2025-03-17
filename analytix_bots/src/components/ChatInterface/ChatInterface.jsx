import React, { useState, useRef, useEffect } from "react";
import "./ChatInterface.css";

const ChatInterface = ({
  messages,
  onSendMessage,
  selectedBot,
  selectedDocument,
}) => {
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef(null);

  // Auto-scroll to the bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (messageInput.trim()) {
      onSendMessage(messageInput);
      setMessageInput("");
    }
  };

  // Format timestamp for display
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get placeholder text based on selected bot
  const getPlaceholderText = () => {
    switch (selectedBot) {
      case "grammar":
        return "Enter text to check grammar...";
      case "email":
        return "Type your email content...";
      case "document":
        return selectedDocument
          ? `Ask a question about ${selectedDocument.name}...`
          : "First upload or select a document...";
      default:
        return "Type a message...";
    }
  };

  // Get bot-specific title or instructions
  const getBotTitle = () => {
    switch (selectedBot) {
      case "grammar":
        return "Grammar Correction Bot";
      case "email":
        return "Email Assistant Bot";
      case "document":
        return "Document Chat Bot";
      default:
        return "Chatbot Assistant";
    }
  };

  // Get welcome message based on selected bot
  const getWelcomeMessage = () => {
    switch (selectedBot) {
      case "grammar":
        return "I can help you correct grammar and improve your writing. Type some text to get started!";
      case "email":
        return "I can help you draft professional emails. Let me know what you need!";
      case "document":
        return "Upload a document and ask me questions about it. I'll help you understand and analyze the content.";
      default:
        return "How can I assist you today?";
    }
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h2>{getBotTitle()}</h2>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <h3>Welcome to {getBotTitle()}</h3>
            <p>{getWelcomeMessage()}</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`message ${message.sender}`}>
              {message.content}
              <div className="message-timestamp">
                {formatTime(message.timestamp)}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <form onSubmit={handleSubmit} className="chat-input-form">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder={getPlaceholderText()}
            className="chat-input"
            disabled={selectedBot === "document" && !selectedDocument}
          />
          <button
            type="submit"
            className="chat-input-send"
            disabled={selectedBot === "document" && !selectedDocument}
          >
            <span className="send-icon"></span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
