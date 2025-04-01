import { apiRequest, apiGet, apiPost, apiDelete, getCsrfToken, fetchCsrfToken } from './csrfUtils';

// Base URL for API calls
const API_BASE_URL = 'http://127.0.0.1:8000';

/**
 * Document API functions
 */

// Fetch all documents
export const fetchDocuments = async () => {
  try {
    const response = await apiGet(`${API_BASE_URL}/api/get_documents/`);
    
    if (!response.ok) {
      // Clone the response before reading body
      const errorClone = response.clone();
      const errorText = await errorClone.text();
      throw new Error(`Failed to fetch documents: ${response.status} - ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
};

// Upload a document
export const uploadDocument = async (file, botType = 'document') => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('task_type', botType); // Use botType as task_type
    
    // Log the FormData to make sure it has content
    console.log('FormData file:', file);
    console.log('FormData task_type (bot type):', botType);
    console.log('FormData entries:');
    for (let pair of formData.entries()) {
      console.log(pair[0], pair[1]);
    }
    
    // Get the CSRF token directly
    const token = getCsrfToken();
    console.log('Using CSRF token:', token);
    
    // Use fetch directly to avoid any middleware issues
    const response = await fetch(`${API_BASE_URL}/api/upload_document/`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: {
        'X-CSRFToken': token,
      }
    });
    
    if (!response.ok) {
      // Safely clone and read the response
      const responseClone = response.clone();
      let errorText = '';
      try {
        errorText = await responseClone.text();
      } catch (e) {
        errorText = 'Could not read error response';
      }
      console.error('Server error response:', errorText);
      throw new Error(`Upload failed with status ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};


// Delete a document
export const deleteDocument = async (documentId) => {
  try {
    // First try to get a token, or fetch a new one if needed
    let token = getCsrfToken();
    if (!token) {
      await fetchCsrfToken(getBaseUrl());
      token = getCsrfToken();
      if (!token) {
        throw new Error('Could not obtain CSRF token for deletion');
      }
    }
    
    console.log('Using token for deletion:', token.substring(0, 5) + '...');
    
    const response = await fetch(`${API_BASE_URL}/api/delete_document/${documentId}/`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'X-CSRFToken': token,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const responseClone = response.clone();
      let errorMessage = `Failed to delete document: ${response.status}`;
      try {
        const errorText = await responseClone.text();
        errorMessage += ` - ${errorText}`;
      } catch (textError) {
        console.warn('Could not read error response body', textError);
      }
      throw new Error(errorMessage);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};


// Fetch chat sessions for a specific bot type
export const fetchChatSessions = async (botType) => {
  try {
    // Make sure we have a CSRF token first
    let token = getCsrfToken();
    if (!token) {
      await fetchCsrfToken(getBaseUrl());
    }
    
    const response = await fetch(`${API_BASE_URL}/api/chat_sessions/?bot_type=${botType}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorClone = response.clone();
      const errorText = await errorClone.text();
      throw new Error(`Failed to fetch chat sessions: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    // For document bot, try to extract document_id from metadata if available
    if (botType === 'document' && data.success && data.sessions) {
      data.sessions = data.sessions.map(session => {
        // Check if this session has metadata with document_id
        if (session.metadata && session.metadata.document_id) {
          return {
            ...session,
            document_id: session.metadata.document_id
          };
        }
        
        // Try to extract document_id from the session title or preview
        if (session.title && session.title.includes('Document:')) {
          const match = session.title.match(/Document: ([a-zA-Z0-9-]+)/);
          if (match && match[1]) {
            return {
              ...session,
              document_id: match[1]
            };
          }
        }
        
        return session;
      });
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    throw error;
  }
};


// Fetch chat messages for a specific session
export const fetchChatMessages = async (botType, sessionId) => {
  try {
    if (!sessionId) {
      console.error("No sessionId provided to fetchChatMessages");
      throw new Error("Session ID is required");
    }
    
    if (!botType) {
      console.error("No botType provided to fetchChatMessages");
      throw new Error("Bot type is required");
    }
    
    // Make sure we have a CSRF token first
    let token = getCsrfToken();
    if (!token) {
      console.log("No CSRF token found, fetching new one");
      await fetchCsrfToken(getBaseUrl());
      token = getCsrfToken();
      if (!token) {
        console.error("Failed to get CSRF token after retry");
      }
    }
    
    // URL encode the session ID to handle special characters
    const encodedSessionId = encodeURIComponent(sessionId);
    console.log(`Fetching messages for bot: ${botType}, session: ${sessionId} (encoded: ${encodedSessionId})`);
    
    // Use timestamp to prevent caching
    const timestamp = Date.now();
    const url = `${API_BASE_URL}/api/chat_messages/${botType}/${encodedSessionId}/?_t=${timestamp}`;
    
    console.log(`Making request to: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorClone = response.clone();
      let errorText;
      try {
        errorText = await errorClone.text();
      } catch (e) {
        errorText = `Error status: ${response.status}`;
      }
      console.error(`Server error response:`, errorText);
      throw new Error(`Failed to fetch chat messages: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`Received message data:`, data);
    
    if (!data || !data.messages) {
      console.warn("No messages in response or invalid response format", data);
    }
    
    // If document_id is in the response, add it to each message for easier tracking
    if (data.document_id) {
      if (data.messages && Array.isArray(data.messages)) {
        data.messages = data.messages.map(msg => ({
          ...msg,
          document_id: data.document_id
        }));
      }
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    throw error;
  }
};


// Send a message and get a response
export const sendChatMessage = async (message, botType, documentId = null, sessionId = null) => {
  try {
    // If we're sending a message with a document ID (which could be from a file upload in any bot)
    // make sure to refresh the CSRF token first
    if (documentId) {
      await fetchCsrfToken(getBaseUrl());
    }
    
    const token = getCsrfToken();
    if (!token) {
      console.warn("No CSRF token available for message send");
    }
    
    // Prepare the request body
    const requestBody = {
      message,
      botType,
      sessionId
    };
    
    // Only add documentId to the request if it has a value
    if (documentId) {
      requestBody.documentId = documentId;
    }
    
    console.log('Sending chat message with:', requestBody);
    
    const response = await fetch(`${API_BASE_URL}/api/process_message/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': token
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();      
      if (errorData.error && errorData.error.summary) {
        throw new Error(errorData.error.summary);
      } else if (errorData.message) {
        throw new Error(errorData.message);
      } else if (errorData.error) {
        throw new Error(errorData.error);
      } else {
        throw new Error(`Request failed with status ${response.status}`);
      }
    }
    
    const responseData = await response.json();
    
    // For document bot, store metadata about the document in the session
    if (botType === 'document' && documentId && responseData.session_id) {
      try {
        // Try to update session metadata to include document_id
        // Note: This is a custom approach - your backend would need to support this
        console.log(`Associating document ID ${documentId} with session ${responseData.session_id}`);
        
        // Include the document ID in the title for easier tracking
        const sessionTitle = responseData.session_title || "Untitled Conversation";
        const newTitle = sessionTitle.includes(`Document: ${documentId}`) 
          ? sessionTitle 
          : `Document: ${documentId} - ${sessionTitle}`;
        
        // Make an extra call to update the session with document information
        // Note: You'll need to implement this endpoint on your backend
        await fetch(`${API_BASE_URL}/api/update_session/`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': token
          },
          body: JSON.stringify({
            session_id: responseData.session_id || sessionId,
            bot_type: botType,
            title: newTitle,
            metadata: {
              document_id: documentId
            }
          })
        });
      } catch (err) {
        console.error('Error updating session with document info:', err);
        // This is non-critical, so we don't throw
      }
    }
    
    return responseData;
  } catch (error) {
    console.error('Error getting bot response:', error);
    throw error;
  }
};

// Delete a session and all its messages
export const deleteSession = async (botType, sessionId) => {
  try {
    // Make sure we have a CSRF token first
    let token = getCsrfToken();
    if (!token) {
      console.log("No CSRF token found, fetching new one");
      await fetchCsrfToken(getBaseUrl());
      token = getCsrfToken();
      if (!token) {
        console.error("Failed to get CSRF token after retry");
      }
    }
    
    const encodedSessionId = encodeURIComponent(sessionId);
    console.log(`Deleting session: ${sessionId} (encoded: ${encodedSessionId})`);
    
    const response = await fetch(`${API_BASE_URL}/api/delete_session/${botType}/${encodedSessionId}/`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': token
      }
    });
    
    if (!response.ok) {
      const errorClone = response.clone();
      let errorText;
      try {
        errorText = await errorClone.text();
      } catch (e) {
        errorText = `Error status: ${response.status}`;
      }
      console.error(`Server error response:`, errorText);
      throw new Error(`Failed to delete session: ${response.status} - ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
};

// Delete a specific message (both user question and bot response)
export const deleteMessage = async (botType, messageId) => {
  try {
    // Make sure we have a CSRF token first
    let token = getCsrfToken();
    if (!token) {
      console.log("No CSRF token found, fetching new one");
      await fetchCsrfToken(getBaseUrl());
      token = getCsrfToken();
      if (!token) {
        console.error("Failed to get CSRF token after retry");
      }
    }
    
    console.log(`Deleting message: ${messageId}`);
    
    const response = await fetch(`${API_BASE_URL}/api/delete_message/${botType}/${messageId}/`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': token
      }
    });
    
    if (!response.ok) {
      const errorClone = response.clone();
      let errorText;
      try {
        errorText = await errorClone.text();
      } catch (e) {
        errorText = `Error status: ${response.status}`;
      }
      console.error(`Server error response:`, errorText);
      throw new Error(`Failed to delete message: ${response.status} - ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};


// Get CSRF API URL
export const getCsrfTokenUrl = () => `${API_BASE_URL}/api/csrf-token/`;

// Export BASE URL for use elsewhere
export const getBaseUrl = () => API_BASE_URL;

