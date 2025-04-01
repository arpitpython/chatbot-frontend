// helpers.js - Common utility functions

/**
 * Format a file size into a human-readable string
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + " bytes";
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  else return (bytes / 1048576).toFixed(1) + " MB";
};

/**
 * Format a date into a readable string
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Format a timestamp for chat messages
 * @param {Date|string} timestamp - Timestamp to format
 * @returns {string} Formatted time string
 */
export const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Get file type from file extension
 * @param {string} filename - Filename with extension
 * @returns {string} MIME type
 */
export const getFileTypeFromExtension = (filename) => {
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

/**
 * Gets a placeholder response for development/testing
 * @param {string} botType - Type of bot
 * @param {string} userMessage - User's message
 * @param {object} document - Selected document if applicable
 * @returns {object} Simulated bot response
 */
export const getSimulatedResponse = (botType, userMessage, document = null) => {
  let response;
  
  switch (botType) {
    case 'grammar':
      response = `I've analyzed your text: "${userMessage}". It appears to be grammatically correct.`;
      break;
    case 'email':
      response = `Here's a draft based on your request: 
      
      Dear [Recipient],
      
      I hope this email finds you well. ${userMessage}
      
      Please let me know if you need any further information.
      
      Best regards,
      [Your Name]`;
      break;
    case 'document':
      response = `Based on the document "${document?.name || 'unknown'}", here's what I can tell you about "${userMessage}":
      
      This is a simulated response for document analysis. In a production environment, this would contain actual insights about your document content related to your query.`;
      break;
    default:
      response = `I received your message: "${userMessage}". How can I assist you further?`;
  }
  
  return {
    id: Date.now(),
    content: response,
    sender: 'bot',
    timestamp: new Date()
  };
};