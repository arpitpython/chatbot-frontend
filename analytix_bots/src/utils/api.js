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
export const uploadDocument = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    // Log the FormData to make sure it has content
    console.log('FormData file:', file);
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

/**
 * Chat API functions
 */

// Send a message and get a response
export const sendChatMessage = async (message, botType, documentId = null) => {
  try {
    const response = await apiPost(`${API_BASE_URL}/api/chat/`, {
      message,
      botType,
      documentId
    });
    
    if (!response.ok) {
      const responseClone = response.clone();
      let errorMessage = `Failed to get bot response: ${response.status}`;
      try {
        const errorText = await responseClone.text();
        errorMessage += ` - ${errorText}`;
      } catch (textError) {
        console.warn('Could not read error response body', textError);
      }
      throw new Error(errorMessage);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting bot response:', error);
    throw error;
  }
};

// Get CSRF API URL
export const getCsrfTokenUrl = () => `${API_BASE_URL}/api/csrf-token/`;

// Export BASE URL for use elsewhere
export const getBaseUrl = () => API_BASE_URL;
