import "@fortawesome/fontawesome-free/css/all.min.css";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LeftSidebar.css";

const LeftSidebar = ({
  selectedBot,
  onBotChange,
  documents,
  onDocumentSelect,
  onDocumentUpload,
  onDocumentDelete,
  chatSessions,
  selectedDocumentId,
  isDocumentsLoading,
  activeSessionId,
  onSessionSelect,
  onNewChat,
  isNewChat,
  onSessionDelete,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  
  // Set the first document as selected by default when documents change
  React.useEffect(() => {
    if (documents.length > 0 && (!selectedDocumentId || !documents.find(doc => doc.id === selectedDocumentId))) {
      onDocumentSelect(documents[0]);
    }
  }, [documents, selectedDocumentId, onDocumentSelect]);

  // Function to handle bot type change
  const handleBotChange = (e) => {
    const newBotType = e.target.value;
    
    // Call the parent handler
    onBotChange(newBotType);
  };

  // Function to handle file selection for document upload
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const newDocument = {
        id: Date.now(),
        name: file.name,
        type: file.type || getFileTypeFromExtension(file.name),
        size: file.size,
        lastModified: file.lastModified,
        url: URL.createObjectURL(file),
        file: file
      };
      onDocumentUpload(newDocument);
    }
  };

  // Function to handle document selection
  const handleDocumentSelect = (doc) => {
    onDocumentSelect(doc);
  };

  // Function to handle document deletion
  const handleDeleteDocument = (e, documentId) => {
    e.stopPropagation(); // Prevent document selection when clicking delete
    onDocumentDelete(documentId);
  };

  // Function to handle session selection
  const handleSessionSelect = (sessionId) => {
    console.log("LeftSidebar: Selecting session:", sessionId);
    // Call the parent handler with the current bot type
    onSessionSelect(sessionId);
  };
  
  // Function to handle session deletion
  const handleSessionDelete = (e, sessionId) => {
    e.stopPropagation(); // Prevent session selection when clicking delete
    if (onSessionDelete && window.confirm("Are you sure you want to delete this conversation?")) {
      onSessionDelete(sessionId);
    }
  };

  // Generate a preview of chat sessions for non-document bots
  const renderSessionPreviews = () => {
    const sessions = chatSessions[selectedBot] || [];

    return (
      <>
        {/* New Chat Button */}
        <div 
          className={`new-chat-button ${isNewChat ? 'active' : ''}`}
          onClick={onNewChat}
        >
          <i className="fas fa-plus-circle"></i>
          <span>New Chat</span>
        </div>
        
        {/* Session List */}
        {sessions.length === 0 ? (
          <div className="empty-sessions">
            <p>No previous conversations.</p>
          </div>
        ) : (
          <div className="session-list">
            {sessions.map((session) => (
              <div 
                key={session.id} 
                className={`session-item ${session.id === activeSessionId ? 'active' : ''}`}
                onClick={() => handleSessionSelect(session.id)}
              >
                <div className="session-preview">
                  <i className="fas fa-comment"></i>
                  <div className="session-text">
                    <div className="session-title">
                      {session.title || "Untitled Conversation"}
                    </div>
                    <div className="session-excerpt">
                      {session.preview || "No preview available"}
                    </div>
                  </div>
                </div>
                <div className="session-time">{formatDate(session.created_at)}</div>
                {/* Delete session button */}
                <button
                  className="session-delete-btn"
                  onClick={(e) => handleSessionDelete(e, session.id)}
                  title="Delete conversation"
                >
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  // Helper function to format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Helper function to get file type from extension
  const getFileTypeFromExtension = (filename) => {
    const extension = filename.split(".").pop().toLowerCase();

    switch (extension) {
      case "pdf":
        return "application/pdf";
      case "doc":
      case "docx":
        return "application/msword";
      case "xls":
      case "xlsx":
        return "application/vnd.ms-excel";
      case "csv":
        return "text/csv";
      case "txt":
        return "text/plain";
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "png":
        return "image/png";
      default:
        return "application/octet-stream";
    }
  };

  // Get file icon based on file type
  const getFileIcon = (fileType, fileName) => {
    const extension = fileName ? fileName.split(".").pop().toLowerCase() : "";
    const fileTypeStr = fileType ? fileType.toString() : "";

    if (fileTypeStr.includes("pdf") || extension === "pdf") {
      return <i className="fas fa-file-pdf file-icon"></i>;
    } else if (
      fileTypeStr.includes("word") ||
      extension === "doc" ||
      extension === "docx"
    ) {
      return <i className="fas fa-file-word file-icon"></i>;
    } else if (
      fileTypeStr.includes("excel") ||
      extension === "xls" ||
      extension === "xlsx" ||
      extension === "csv"
    ) {
      return <i className="fas fa-file-excel file-icon"></i>;
    } else if (fileTypeStr.includes("image")) {
      return <i className="fas fa-file-image file-icon"></i>;
    } else {
      return <i className="fas fa-file file-icon"></i>;
    }
  };

  // Determine header text
  const headerText =
    selectedBot === "document" ? "Documents" : "Conversation History";

  return (
    <div className={`left-sidebar ${isCollapsed ? "collapsed" : ""}`}>
      {/* Header with collapse/expand button */}
      <div className="sidebar-header">
        <h3>{isCollapsed ? "" : headerText}</h3>
        <button
          className="collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          <span
            className={`collapse-icon ${isCollapsed ? "is-collapsed" : ""}`}
          ></span>
        </button>
      </div>

      {/* Content section - changes based on selected bot */}
      {!isCollapsed && (
        <>
          {selectedBot === "document" ? (
            // Document bot UI
            <div className="document-section">
              {/* Document upload area - now at the top for document bot */}
              <label htmlFor="document-upload" className="document-upload">
                <div className="upload-content">
                  <div className="upload-icon">
                    <i className="fas fa-cloud-upload-alt"></i>
                  </div>
                  <div>Upload Document</div>
                </div>
                <input
                  id="document-upload"
                  type="file"
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                />
              </label>

              {/* Clear conversation button for document bot if a document is selected */}
              {selectedDocumentId && (
                <div 
                  className={`new-chat-button ${isNewChat ? 'active' : ''}`}
                  onClick={onNewChat}
                >
                  <i className="fas fa-plus-circle"></i>
                  <span>Clear Conversation</span>
                </div>
              )}

              {/* Document list with separate scroll area */}
              <div className="document-list-container">
                <h4>Uploaded Documents</h4>
                <div className="document-list">
                  {isDocumentsLoading ? (
                    <div className="document-loading">
                      <div className="loading-spinner"></div>
                      <p>Loading documents...</p>
                    </div>
                  ) : documents.length > 0 ? (
                    documents.map((doc) => (
                      <div
                        key={doc.id}
                        className={`document-card ${doc.id === selectedDocumentId ? "active" : ""}`}
                        onClick={() => handleDocumentSelect(doc)}
                      >
                        <div className="document-card-content">
                          {getFileIcon(doc.type, doc.name)}
                          <div className="document-info">
                            <div className="document-name">{doc.name}</div>
                            <div className="document-meta">
                              {doc.created_at ? formatDate(doc.created_at) : ""}
                            </div>
                          </div>
                        </div>
                        <button
                          className="document-delete-btn"
                          onClick={(e) => handleDeleteDocument(e, doc.id)}
                          title="Delete document"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="empty-documents">
                      No documents uploaded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // UI for grammar and email bots
            <div className="session-history">{renderSessionPreviews()}</div>
          )}

          {/* Bot selection dropdown - always visible */}
          <div className="bot-selector">
            <label htmlFor="bot-select">Select Chatbot:</label>
            <select
              id="bot-select"
              value={selectedBot}
              onChange={handleBotChange}
            >
              <option value="grammar">Grammar Bot</option>
              <option value="email">Email Bot</option>
              <option value="meeting_insights">Meeting Insights</option>
              <option value="document">Document Bot</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
};

export default LeftSidebar;
