import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw"; // Install this: npm install rehype-raw
import "./ChatInterface.css";

const ChatInterface = ({
  messages,
  onSendMessage,
  selectedBot,
  selectedDocument,
  onMessageDelete,
  isNewChat,
}) => {
  const [messageInput, setMessageInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to the bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize the textarea when content changes
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to get the correct scrollHeight
      textareaRef.current.style.height = "auto";
      // Set the height to the scrollHeight to fit the content
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [messageInput]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Allow submission if there's text OR a file (or both)
    if (messageInput.trim() || selectedFile) {
      onSendMessage(messageInput, selectedFile);
      setMessageInput("");
      setSelectedFile(null); // Clear the file after sending
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    if (e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      
      // Focus the textarea after file selection
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  // Remove selected file
  const handleRemoveFile = () => {
    setSelectedFile(null);
    
    // Focus the textarea after removing file
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Format timestamp for display
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handle message deletion
  const handleMessageDelete = (messageId) => {
    if (onMessageDelete && window.confirm("Delete this message?")) {
      // Extract the original message ID (without the _user or _bot suffix)
      const originalId = messageId.split('_')[0];
      onMessageDelete(originalId);
    }
  };

  // Get placeholder text based on selected bot
  const getPlaceholderText = () => {
    if (selectedFile) {
      return "Add a message (optional)...";
    }

    switch (selectedBot) {
      case "grammar":
        return "Enter text to check grammar...";
      case "email":
        return "Type your email content...";
      case "document":
        return selectedDocument
          ? `Ask a question about ${selectedDocument.name}...`
          : "First upload or select a document...";
      case "meeting_insights":
        return "Ask about meeting insights...";
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
        return selectedDocument 
          ? `Document: ${selectedDocument.name}` 
          : "Document Chat Bot";
      case "meeting_insights":
        return "Meeting Insights";
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
        return selectedDocument
          ? `You're chatting about "${selectedDocument.name}". Ask any questions about this document!`
          : "Upload a document and ask me questions about it. I'll help you understand and analyze the content.";
      case "meeting_insights":
        return "I can provide insights from your meetings. Ask me about key points, summaries, or decisions!";
      default:
        return "How can I assist you today?";
    }
  };

  // Function to detect if content is HTML or Markdown
  const detectContentType = (content) => {
    if (!content) return 'text';
    
    // Check if content has HTML tags
    const hasHtmlTags = /<[a-z][\s\S]*>/i.test(content);
    
    // Check if content has markdown indicators
    const hasMarkdownIndicators = /(\*\*|__|\#|\-\s|\d\.\s|\>\s)/i.test(content);
    
    if (hasHtmlTags) return 'html';
    if (hasMarkdownIndicators) return 'markdown';
    return 'text';
  };

  // Process content based on its type
  const preprocessContent = (content) => {
    if (!content) return '';
    
    // Detect content type
    const contentType = detectContentType(content);
    
    if (contentType === 'html') {
      let processed = content;
      processed = processed.replace(/<div>([\s\S]*?)<\/div>/g, '$1');
      processed = processed.replace(/<div\s*>\s*<\/div>/g, '');
      return processed;
    } else {
      let processed = content;
      processed = processed.replace(/\n{3,}/g, '\n\n');
      processed = processed.replace(/\n{2,}(#{1,6})\s/g, '\n$1 ');
      processed = processed.replace(/\n{2,}(\s*[-*+])\s/g, '\n$1 ');
      processed = processed.replace(/\n{2,}(\s*\d+\.)\s/g, '\n$1 ');
      processed = processed.replace(/(\*\*[^*:]+)\*\*\s*:/g, '$1:**');
      processed = processed.replace(/(\*\*[^*:]+:\*\*)\n+/g, '$1 ');
      processed = processed.replace(/\n\n(\*\*Suggestions\*\*)/g, '\n$1');
      processed = processed.replace(/\n\n(\*\*Disclaimer\*\*)/g, '\n$1');
      
      return processed;
    }
  };

  // Render content based on its type
  const renderContent = (content) => {
    if (!content) return null;
    
    const contentType = detectContentType(content);
    const processedContent = preprocessContent(content);
    
    if (contentType === 'html') {
      return (
        <div 
          className="html-content"
          dangerouslySetInnerHTML={{ __html: processedContent }} 
        />
      );
    } else {
      // Use ReactMarkdown for markdown content
      return (
        <ReactMarkdown
          rehypePlugins={[rehypeRaw]} // Allows HTML inside markdown
          components={{
            p: ({node, children, ...props}) => (
              <p style={{margin: '0.1em 0'}} {...props}>{children}</p>
            ),
            strong: ({node, children, ...props}) => (
              <strong style={{display: 'inline'}} {...props}>{children}</strong>
            ),
            ul: ({node, ...props}) => (
              <ul style={{margin: '0.2em 0', paddingLeft: '1.5em'}} {...props} />
            ),
            li: ({node, ...props}) => (
              <li style={{marginBottom: '0.1em'}} {...props} />
            ),
            em: ({node, ...props}) => (
              <em style={{display: 'inline', fontSize: '0.9em', color: '#666'}} {...props} />
            )
          }}
        >
          {processedContent}
        </ReactMarkdown>
      );
    }
  };

  // Group messages by user-bot pairs
  const renderMessages = () => {
    if (messages.length === 0) {
      return (
        <div className="chat-welcome">
          <h3>Welcome to {getBotTitle()}</h3>
          <p>{getWelcomeMessage()}</p>
        </div>
      );
    }

    // Filter out undefined/null messages
    const validMessages = messages.filter(m => m);
    
    // Group messages so user and bot responses are treated as pairs
    const messageGroups = [];
    for (let i = 0; i < validMessages.length; i += 2) {
      const userMessage = validMessages[i];
      const botMessage = validMessages[i + 1];
      
      if (userMessage) {
        messageGroups.push({
          id: userMessage.id,
          user: userMessage,
          bot: botMessage
        });
      }
    }

    return messageGroups.map((group) => (
      <div key={group.id} className="message-group">
        {/* User message */}
        <div className="message user">
          <div className="message-content">{group.user.content}</div>
          <div className="message-footer">
            <span className="message-timestamp">
              {formatTime(group.user.timestamp)}
            </span>
            {onMessageDelete && (
              <button 
                className="message-delete-btn"
                onClick={() => handleMessageDelete(group.id)}
                title="Delete this conversation"
              >
                <i className="fas fa-trash-alt"></i>
              </button>
            )}
          </div>
        </div>
        
        {/* Bot message - using universal content renderer */}
        {group.bot && (
          <div className="message bot">
            <div className="message-content bot-content">
              {renderContent(group.bot.content)}
            </div>
            <div className="message-timestamp">
              {formatTime(group.bot.timestamp)}
            </div>
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h2>{getBotTitle()}</h2>
        {selectedBot === 'document' && selectedDocument && (
          <div className="chat-subtitle">
            Chat history is specific to this document
          </div>
        )}
      </div>

      <div className="chat-messages">
        {renderMessages()}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <form onSubmit={handleSubmit} className="chat-input-form">
          <div className="input-area">
            {/* Inline file preview */}
            {selectedFile && (
              <div className="inline-file-preview">
                <i className="fas fa-file"></i>
                <span className="file-name">{selectedFile.name}</span>
                <button 
                  type="button" 
                  className="remove-file-btn"
                  onClick={handleRemoveFile}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            )}
            
            <textarea
              ref={textareaRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={getPlaceholderText()}
              className="chat-input"
              disabled={selectedBot === "document" && !selectedDocument}
              rows="1"
            />
            
            {/* File upload button - available for all bots now */}
            <label 
              htmlFor="file-upload" 
              className="file-upload-btn"
              title="Attach a file (PDF, Word, or TXT only)"
            >
              <i className="fas fa-paperclip"></i>
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileSelect}
                style={{ display: "none" }}
                disabled={selectedBot === "document" && !selectedDocument}
              />
            </label>
            
            <button
              type="submit"
              className="chat-input-send"
              disabled={(selectedBot === "document" && !selectedDocument) || 
                       (!messageInput.trim() && !selectedFile)}
            >
              <span className="send-icon"></span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;