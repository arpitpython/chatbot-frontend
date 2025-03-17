import React, { useState } from "react";
import "./LeftSidebar.css";

const LeftSidebar = ({
  selectedBot,
  onBotChange,
  documents,
  onDocumentSelect,
  onDocumentUpload,
  onDocumentDelete,
  chatSessions,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Function to handle bot type change
  const handleBotChange = (e) => {
    onBotChange(e.target.value);
  };

  // Function to handle file selection for document upload
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // In a real app, you'd upload the file to a server here using an API call

      // For now, just create a document object with local data
      const newDocument = {
        id: Date.now(),
        name: file.name,
        type: file.type || getFileTypeFromExtension(file.name),
        size: file.size,
        lastModified: file.lastModified,
        // In a real app, this would be the URL to the uploaded file
        url: URL.createObjectURL(file),
      };

      onDocumentUpload(newDocument);
    }
  };

  // Function to handle document deletion
  const handleDeleteDocument = (e, documentId) => {
    e.stopPropagation(); // Prevent document selection when clicking delete
    onDocumentDelete(documentId);
  };

  // Generate a preview of chat sessions for non-document bots
  const renderSessionPreviews = () => {
    const sessions = chatSessions[selectedBot];

    if (sessions.length === 0) {
      return (
        <div className="empty-sessions">
          <p>No previous conversations.</p>
        </div>
      );
    }

    // Group messages by session (for demonstration, every 10 messages is a new session)
    const sessionChunks = [];
    for (let i = 0; i < sessions.length; i += 10) {
      sessionChunks.push(sessions.slice(i, i + 10));
    }

    return sessionChunks.map((session, index) => {
      // Get the first message content as a preview
      const previewMessage = session[0]?.content || "New Conversation";
      const timestamp = session[0]?.timestamp || new Date();
      return (
        <div key={index} className="session-item">
          <div className="session-preview">
            {previewMessage.slice(0, 30)}...
          </div>
          <div className="session-time">{formatDate(timestamp)}</div>
        </div>
      );
    });
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

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  };

  // Get file icon based on file type
  const getFileIcon = (fileType, fileName) => {
    const extension = fileName.split(".").pop().toLowerCase();

    if (fileType.includes("pdf") || extension === "pdf") {
      return <i className="file-icon pdf-icon"></i>;
    } else if (
      fileType.includes("word") ||
      extension === "doc" ||
      extension === "docx"
    ) {
      return <i className="file-icon doc-icon"></i>;
    } else if (
      fileType.includes("excel") ||
      extension === "xls" ||
      extension === "xlsx" ||
      extension === "csv"
    ) {
      return <i className="file-icon excel-icon"></i>;
    } else if (fileType.includes("image")) {
      return <i className="file-icon image-icon"></i>;
    } else {
      return <i className="file-icon default-icon"></i>;
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
                  <div className="upload-icon"></div>
                  <div>Click to upload or drag a file here</div>
                </div>
                <input
                  id="document-upload"
                  type="file"
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                />
              </label>

              {/* Document list with separate scroll area */}
              <div className="document-list-container">
                <h4>Uploaded Documents</h4>
                <div className="document-list">
                  {documents.length > 0 ? (
                    documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="document-card"
                        onClick={() => onDocumentSelect(doc)}
                      >
                        <div className="document-card-content">
                          {getFileIcon(doc.type, doc.name)}
                          <div className="document-info">
                            <div className="document-name">{doc.name}</div>
                            <div className="document-meta">
                              {formatFileSize(doc.size)}
                            </div>
                          </div>
                        </div>
                        <button
                          className="document-delete-btn"
                          onClick={(e) => handleDeleteDocument(e, doc.id)}
                          title="Delete document"
                        >
                          <span className="delete-icon"></span>
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
              <option value="document">Document Bot</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
};

export default LeftSidebar;
