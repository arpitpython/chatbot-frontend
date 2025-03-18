// Store the CSRF token once obtained
let csrfToken = null;

/**
 * Get the CSRF token from cookies
 */
export const getCsrfTokenFromCookie = () => {
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];

  return cookieValue || null;
};

/**
 * Fetch the CSRF token from the server
 */
export const fetchCsrfToken = async (baseUrl) => {
  try {
    // First check if there's already a token in the cookie
    const existingToken = getCsrfTokenFromCookie();
    if (existingToken) {
      console.log("Using existing CSRF token from cookie");
      csrfToken = existingToken;
      return existingToken;
    }

    // If no token in cookie, make a request to get one
    console.log("Fetching new CSRF token from server");
    const response = await fetch(`${baseUrl}/api/csrf-token/`, {
      method: 'GET',
      credentials: 'include', // Ensure cookies are included
      cache: 'no-store', // Don't cache this request
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch CSRF token: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.csrfToken) {
      throw new Error('Server did not return a CSRF token');
    }
    
    csrfToken = data.csrfToken;
    console.log("New CSRF token obtained:", csrfToken.substring(0, 5) + '...');
    
    // Force a pause to ensure the cookie is set properly
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error;
  }
};

/**
 * Get the CSRF token, fetching it if necessary
 */
export const getCsrfToken = () => {
  // First check our cached token
  if (csrfToken) {
    return csrfToken;
  }
  
  // Then check cookies
  const cookieValue = getCsrfTokenFromCookie();
  if (cookieValue) {
    csrfToken = cookieValue;
    return cookieValue;
  }
  
  console.warn("No CSRF token available in memory or cookies");
  return null;
};

/**
 * Make an API request with CSRF token included
 */
export const apiRequest = async (url, options = {}) => {
  try {
    const baseUrl = url.split('/api/')[0]; 
    const token = getCsrfToken();  // Get CSRF token

    // Extract method from options or default to GET
    const method = options.method || 'GET';
    
    // Prepare headers
    const headers = {
      'X-CSRFToken': token,
      'Accept': 'application/json',
      ...(options.headers || {}),
    };

    // Don't set Content-Type for FormData
    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    } else if (
      options.body && 
      typeof options.body === 'object' && 
      !headers['Content-Type'] &&
      !(options.body instanceof FormData)
    ) {
      headers['Content-Type'] = 'application/json';
    }

    // Prepare request options
    const requestOptions = {
      ...options,
      method,
      credentials: 'include', // Important for cookies
      mode: 'cors',
      headers,
    };

    // Convert body to JSON string if it's an object but not FormData
    if (
      requestOptions.body && 
      typeof requestOptions.body === 'object' && 
      !(requestOptions.body instanceof FormData) &&
      !requestOptions.body.toString().includes('[object FormData]')
    ) {
      try {
        // Only stringify if not already a string
        if (typeof requestOptions.body !== 'string') {
          requestOptions.body = JSON.stringify(requestOptions.body);
        }
      } catch (e) {
        console.warn('Could not stringify request body:', e);
      }
    }

    // Log the request details for debugging
    console.log(`${method} request to ${url} with CSRF token: ${token.substring(0, 5)}...`);
    
    // Make the request
    const response = await fetch(url, requestOptions);
    
    // Clone the response before attempting to read it in case of errors
    const responseClone = response.clone();
    
    // Handle non-OK responses by logging details
    if (!response.ok) {
      try {
        const errorText = await responseClone.text();
        console.error(`Server returned error status: ${response.status}`, errorText);
      } catch (e) {
        console.error(`Server returned error status: ${response.status}`, "Could not read response body");
      }
    }
    
    return response;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

// Helper methods that use the same signature
export const apiGet = (url) => apiRequest(url, { method: 'GET' });
export const apiPost = (url, data) => apiRequest(url, { method: 'POST', body: data });
export const apiPut = (url, data) => apiRequest(url, { method: 'PUT', body: data });
export const apiDelete = (url) => apiRequest(url, { method: 'DELETE' });