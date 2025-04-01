import React, { useState, useEffect } from "react";
import "./RightSidebar.css";

const RightSidebar = ({ selectedDocument }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [previewContent, setPreviewContent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedDocument) {
      loadDocumentPreview(selectedDocument);
    } else {
      setPreviewContent(null);
    }
  }, [selectedDocument]);

  // Function to load document preview
  const loadDocumentPreview = (document) => {
    setIsLoading(true);

    if (!document) {
      setIsLoading(false);
      setPreviewContent(null);
      return;
    }

    // Different preview handling based on file type
    const { type, url, name } = document;
    const extension = name ? name.split(".").pop().toLowerCase() : "";
    const fileType = type ? type.toString() : "";
    
    // Simulate preview loading delay
    setTimeout(() => {
      setIsLoading(false);

      // Generate preview content based on file type
      if (fileType.includes("pdf") || extension === "pdf") {
        setPreviewContent({ type: "pdf", url });
      } else if (
        fileType.includes("word") ||
        extension === "doc" ||
        extension === "docx"
      ) {
        setPreviewContent({ type: "doc", url });
      } else if (
        fileType.includes("excel") ||
        extension === "xls" ||
        extension === "xlsx" ||
        extension === "csv"
      ) {
        setPreviewContent({ type: "excel", url });
      } else if (fileType.includes("image")) {
        setPreviewContent({ type: "image", url });
      } else {
        setPreviewContent({ type: "unknown", url });
      }
    }, 500);
  };

  // Determine header text
  const headerText = isCollapsed
    ? "Document Viewer"
    : selectedDocument
    ? selectedDocument.name
    : "Document Viewer";

  return (
    <div className={`right-sidebar ${isCollapsed ? "collapsed" : ""}`}>
      {/* Header with expand/collapse button integrated */}
      <div className="document-viewer-header">
        <div className="header-title-area">
          <button
            className="collapse-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            <span
              className={`collapse-icon ${isCollapsed ? "is-collapsed" : ""}`}
            ></span>
          </button>
          <h3>{headerText}</h3>
        </div>

        {!isCollapsed && selectedDocument && (
          <button
            className="download-button"
            onClick={() => window.open(selectedDocument.url, "_blank")}
          >
            Download
          </button>
        )}
      </div>

      {/* Document content area - only shown when not collapsed */}
      {!isCollapsed && (
        <div className="document-viewer-content">
          {isLoading ? (
            <div className="document-loading">
              <div className="loading-spinner"></div>
              <p>Loading document preview...</p>
            </div>
          ) : !selectedDocument ? (
            <div className="empty-document-message">
              <div className="empty-doc-icon"></div>
              <p>No document selected</p>
              <p className="empty-doc-subtitle">
                Please select a document from the left sidebar.
              </p>
            </div>
          ) : (
            renderDocumentContent(previewContent, selectedDocument)
          )}
        </div>
      )}
    </div>
  );
};

// Helper function to render document content based on type
const renderDocumentContent = (previewContent, document) => {
  if (!previewContent) return null;

  const { type, url } = previewContent;
  const { name } = document;

  switch (type) {
    case "pdf":
      return (
        <div className="pdf-document-preview">
          <embed
            src={url}
            title={name}
            width="100%"
            height="100%"
            type="application/pdf"
            className="pdf-iframe"
          />
        </div>
      );

    case "doc":
      // In a real app, you'd convert DOC to HTML or use a viewer API
      return (
        <div className="doc-document-preview">
          <div className="doc-viewer">
            <div className="doc-icon"></div>
            <h3 className="doc-title">{name}</h3>
            <div className="doc-content">
              <p>This is a Word document preview.</p>
              <div className="doc-preview-content">
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
                  euismod justo nec odio commodo, in tincidunt justo fringilla.
                  Vivamus vitae ligula vel enim efficitur luctus.
                </p>
                <p>
                  Pellentesque habitant morbi tristique senectus et netus et
                  malesuada fames ac turpis egestas. Donec lacinia magna vel
                  enim efficitur, at consequat eros imperdiet.
                </p>
                <ul>
                  <li>Point one of the document</li>
                  <li>Second important point</li>
                  <li>Third item with additional details</li>
                </ul>
                <p>
                  Cras varius tellus vitae felis pulvinar, nec facilisis sem
                  ultricies. Morbi quis est non est maximus tempus.
                </p>
              </div>
            </div>
          </div>
        </div>
      );

    case "excel":
      return (
        <div className="excel-document-preview">
          <div className="excel-viewer">
            <div className="excel-icon"></div>
            <h3 className="excel-title">{name}</h3>
            <div className="excel-preview-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1001</td>
                    <td>Product A</td>
                    <td>Electronics</td>
                    <td>$1,200.00</td>
                  </tr>
                  <tr>
                    <td>1002</td>
                    <td>Product B</td>
                    <td>Furniture</td>
                    <td>$450.00</td>
                  </tr>
                  <tr>
                    <td>1003</td>
                    <td>Product C</td>
                    <td>Office Supplies</td>
                    <td>$45.99</td>
                  </tr>
                  <tr>
                    <td>1004</td>
                    <td>Product D</td>
                    <td>Electronics</td>
                    <td>$650.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );

    case "image":
      return (
        <div className="image-document-preview">
          <img src={url} alt={name} className="image-preview" />
        </div>
      );

    default:
      return (
        <div className="unknown-document-preview">
          <div className="file-icon-large"></div>
          <h3>{name}</h3>
          <p className="preview-message">
            Preview not available for this file type.
          </p>
          <button
            className="download-button"
            onClick={() => window.open(url, "_blank")}
          >
            Download File
          </button>
        </div>
      );
  }
};

export default RightSidebar;
