import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import LeftSidebar from "./components/LeftSidebar/LeftSidebar";
import ChatInterface from "./components/ChatInterface/ChatInterface";
import RightSidebar from "./components/RightSidebar/RightSidebar";
import { getCsrfToken, fetchCsrfToken } from "./utils/csrfUtils";
import { getSimulatedResponse } from "./utils/helpers"; // Fixed path with .js extension
import { 
  fetchDocuments, 
  uploadDocument as apiUploadDocument,
  deleteDocument as apiDeleteDocument,
  sendChatMessage,
  getBaseUrl
} from "./utils/api"; // Fixed path with .js extension
import "./App.css";


function App() {
  // State for the selected bot type
  const [selectedBot, setSelectedBot] = useState("grammar"); // Options: 'grammar', 'email', 'document'

  // State for documents (only relevant for document bot)
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [csrfReady, setCsrfReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // State for chat history
  const [chatSessions, setChatSessions] = useState({
    grammar: [],
    email: [],
    document: [],
  });

  // State for current chat messages
  const [messages, setMessages] = useState([]);

  // Initialize CSRF token on component mount
  useEffect(() => {
    const initCsrf = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        await fetchCsrfToken(getBaseUrl());
        setCsrfReady(true);
        console.log("CSRF token initialized successfully");
      } catch (err) {
        console.error("CSRF initialization error:", err);
        setError("Failed to initialize CSRF protection. Please refresh the page.");
        
        // Try again after a delay
        setTimeout(initCsrf, 3000);
      } finally {
        setIsLoading(false);
      }
    };
    
    initCsrf();
  }, []);

  // Always fetch CSRF token when bot type changes to document
  useEffect(() => {
    if (selectedBot === 'document') {
      const refreshCsrf = async () => {
        try {
          await fetchCsrfToken(getBaseUrl());
          console.log("CSRF token refreshed for document bot");
        } catch (err) {
          console.error("CSRF refresh error:", err);
        }
      };
      
      refreshCsrf();
    }
  }, [selectedBot]);

  // Fetch documents when csrfReady changes or when selectedBot changes to 'document'
  useEffect(() => {
    if (!csrfReady || selectedBot !== 'document') {
      return;
    }
    
    const loadDocuments = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await fetchDocuments();
        
        if (result.success && result.documents) {
          setDocuments(result.documents);
          
          // Set the first document as selected if available and none is currently selected
          if (result.documents.length > 0 && !selectedDocument) {
            setSelectedDocument(result.documents[0]);
          }
        }
      } catch (err) {
        console.error("Error loading documents:", err);
        setError("Failed to load documents. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDocuments();
  }, [csrfReady, selectedBot]);

  // Function to handle bot selection change
  const handleBotChange = (botType) => {
    setSelectedBot(botType);
    // Load the correct session history for the selected bot
    setMessages(chatSessions[botType]);
  };

  // Function to handle document upload
  const handleDocumentUpload = async (newDocument) => {
    if (!csrfReady) {
      // Try to refresh the CSRF token first
      try {
        await fetchCsrfToken(getBaseUrl());
        setCsrfReady(true);
      } catch (err) {
        setError("CSRF protection not ready. Please refresh the page and try again.");
        return;
      }
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiUploadDocument(newDocument.file);
      
      if (result.success) {
        // Create document object from response
        const uploadedDocument = {
          id: result.id,
          name: result.name,
          type: result.type,
          size: result.size,
          url: result.url,
        };
        
        // Add the new document to state
        const updatedDocuments = [uploadedDocument, ...documents];
        setDocuments(updatedDocuments);
        
        // Automatically select the newly uploaded document
        setSelectedDocument(uploadedDocument);
      } else {
        throw new Error(result.message || "Upload failed");
      }
    } catch (err) {
      console.error("Error uploading document:", err);
      setError(`Failed to upload document: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle document selection
  const handleDocumentSelect = (document) => {
    setSelectedDocument(document);
  };

  // Function to handle document deletion
  const handleDocumentDelete = async (documentId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Always try to refresh the token before deletion
      if (!csrfReady) {
        try {
          await fetchCsrfToken(getBaseUrl());
          setCsrfReady(true);
        } catch (err) {
          throw new Error("CSRF protection not ready. Please refresh the page and try again.");
        }
      }
      
      // Perform the document deletion
      await apiDeleteDocument(documentId);
      
      // Update local state after successful deletion
      const updatedDocuments = documents.filter(doc => doc.id !== documentId);
      setDocuments(updatedDocuments);
      
      // If the deleted document was selected, clear the selection
      if (selectedDocument && selectedDocument.id === documentId) {
        setSelectedDocument(updatedDocuments.length > 0 ? updatedDocuments[0] : null);
      }
    } catch (err) {
      console.error("Error deleting document:", err);
      setError(`Failed to delete document: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle sending a message
  const handleSendMessage = async (content) => {
    if (selectedBot === 'document' && !csrfReady) {
      // Try to refresh the CSRF token first
      try {
        await fetchCsrfToken(getBaseUrl());
        setCsrfReady(true);
      } catch (err) {
        setError("CSRF protection not ready. Please refresh the page and try again.");
        return;
      }
    }
    
    // Create the user message
    const newMessage = {
      id: Date.now(),
      content,
      sender: "user",
      timestamp: new Date(),
    };

    // Add message to current messages
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);

    // Update session history for the current bot
    setChatSessions({
      ...chatSessions,
      [selectedBot]: updatedMessages,
    });

    try {
      // In a production app, call the API to get the bot's response
      // For now, simulate a response
      /* 
      const response = await sendChatMessage(
        content, 
        selectedBot, 
        selectedDocument?.id || null
      );
      
      const botResponse = {
        id: Date.now(),
        content: response.message,
        sender: 'bot',
        timestamp: new Date()
      };
      */
      
      // Simulate a response for now
      setTimeout(() => {
        const botResponse = getSimulatedResponse(
          selectedBot, 
          content, 
          selectedDocument
        );
        
        const messagesWithResponse = [...updatedMessages, botResponse];
        setMessages(messagesWithResponse);
        
        // Update session history
        setChatSessions({
          ...chatSessions,
          [selectedBot]: messagesWithResponse
        });
      }, 1000);
      
    } catch (err) {
      console.error("Error getting bot response:", err);
      setError(`Failed to get response: ${err.message}`);
      
      // Add an error message to the chat
      const errorMessage = {
        id: Date.now(),
        content: `Sorry, I couldn't process your request. Please try again.`,
        sender: "bot",
        timestamp: new Date(),
      };
      
      const messagesWithError = [...updatedMessages, errorMessage];
      setMessages(messagesWithError);
      
      // Update session history
      setChatSessions({
        ...chatSessions,
        [selectedBot]: messagesWithError,
      });
    }
  };

  return (
    <Router>
      <div className="app">
        <Navbar />
        
        {error && (
          <div className="error-banner">
            {error}
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}
        
        {isLoading && (
          <div className="loading-indicator">
            Loading...
          </div>
        )}
        
        <div className="main-container">
          <LeftSidebar
            selectedBot={selectedBot}
            onBotChange={handleBotChange}
            documents={documents}
            onDocumentSelect={handleDocumentSelect}
            onDocumentUpload={handleDocumentUpload}
            onDocumentDelete={handleDocumentDelete}
            chatSessions={chatSessions}
          />

          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            selectedBot={selectedBot}
            selectedDocument={selectedDocument}
          />

          {/* Right sidebar - only for document bot */}
          {selectedBot === "document" && (
            <RightSidebar selectedDocument={selectedDocument} />
          )}
        </div>
      </div>

      <Routes>
        <Route path="/" element={<Navigate to="/chat" />} />
        <Route path="/chat" element={null} />
        <Route path="/chat/:botType" element={null} />
      </Routes>
    </Router>
  );
}

export default App;
