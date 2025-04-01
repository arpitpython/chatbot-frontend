import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
  useNavigate,
} from "react-router-dom";
import { v4 as uuidv4 } from 'uuid';
import Navbar from "./components/Navbar/Navbar";
import LeftSidebar from "./components/LeftSidebar/LeftSidebar";
import ChatInterface from "./components/ChatInterface/ChatInterface";
import RightSidebar from "./components/RightSidebar/RightSidebar";
import { getCsrfToken, fetchCsrfToken } from "./utils/csrfUtils";
import { getSimulatedResponse } from "./utils/helpers"; 
import { 
  fetchDocuments, 
  uploadDocument as apiUploadDocument,
  deleteDocument as apiDeleteDocument,
  sendChatMessage,
  fetchChatSessions,
  fetchChatMessages,
  deleteSession,
  deleteMessage,
  getBaseUrl
} from "./utils/api";
import "./App.css";

// Main App wrapper that handles routing
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/chat/grammar" replace />} />
        <Route path="/chat" element={<Navigate to="/chat/grammar" replace />} />
        <Route path="/chat/:botType" element={<ChatApp />} />
        <Route path="/chat/:botType/new" element={<ChatApp newChat={true} />} />
        <Route path="/chat/:botType/:sessionId" element={<ChatApp />} />
      </Routes>
    </Router>
  );
}

// ChatApp component that handles the actual application logic
function ChatApp({ newChat = false }) {
  // Get URL parameters and navigation functions
  const { botType, sessionId } = useParams();
  const navigate = useNavigate();
  
  // Validate bot type from URL
  const validBotTypes = ['grammar', 'email', 'meeting_insights', 'document'];
  const initialBotType = validBotTypes.includes(botType) ? botType : 'grammar';

  // In your parent component
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);

  // Document-specific message cache to store separate conversation histories
  const [documentMessagesCache, setDocumentMessagesCache] = useState({});

  // State for the selected bot type
  const [selectedBot, setSelectedBot] = useState(initialBotType);

  // State for documents (only relevant for document bot)
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [csrfReady, setCsrfReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDocumentsLoading, setIsDocumentsLoading] = useState(false);
  const [isNewChat, setIsNewChat] = useState(newChat || false);

  // State for session management
  const [activeSessionId, setActiveSessionId] = useState(
    isNewChat ? null : (sessionId || null)
  );
  const [chatSessions, setChatSessions] = useState({
    grammar: [],
    email: [],
    meeting_insights: [],
    document: [],
  });

  // State for current chat messages
  const [messages, setMessages] = useState([]);

  // When URL botType changes, update selected bot
  useEffect(() => {
    if (validBotTypes.includes(botType) && botType !== selectedBot) {
      handleBotChange(botType);
    }
  }, [botType]);

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

  // Load sessions when bot type changes
  useEffect(() => {
    if (selectedBot) {
      loadChatSessions(selectedBot);
    }
  }, [selectedBot]);

  // React to URL params - session ID or "new"
  useEffect(() => {
    // Only apply this logic for non-document bots or when document bot but no document is selected
    if (selectedBot === 'document' && selectedDocument) {
      return;
    }
    
    if (sessionId === 'new') {
      // Handle "new chat" URL
      setIsNewChat(true);
      setActiveSessionId(null);
      setMessages([]);
      // Clear error when creating a new chat
      setError(null);
    } else if (sessionId) {
      // Handle specific session ID
      console.log("Loading session:", sessionId);
      setIsNewChat(false);
      setActiveSessionId(sessionId);
      
      // Force load messages for this session, even if activeSessionId hasn't changed
      // This ensures messages load after a page refresh
      loadChatMessages(sessionId);
    } else if (!sessionId && !isNewChat && chatSessions[selectedBot]?.length > 0) {
      // If no session specified but sessions exist, select the first one
      const firstSession = chatSessions[selectedBot][0];
      if (firstSession) {
        const urlSafeSessionId = encodeURIComponent(firstSession.id);
        navigate(`/chat/${selectedBot}/${urlSafeSessionId}`, { replace: true });
      }
    }
  }, [sessionId, chatSessions, selectedBot]);
  
  // Load chat sessions for a specific bot type
  const loadChatSessions = async (botType) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchChatSessions(botType);
      
      if (result.success && result.sessions) {
        // Sort sessions by last activity (newest first)
        const sortedSessions = result.sessions.sort((a, b) => 
          new Date(b.last_activity) - new Date(a.last_activity)
        );
        
        // Update the sessions for this bot type
        setChatSessions(prevSessions => ({
          ...prevSessions,
          [botType]: sortedSessions
        }));
        
        // If we're not in a new chat and no session is active yet,
        // but sessions exist, select the first one
        if (!isNewChat && !activeSessionId && sortedSessions.length > 0) {
          const firstSession = sortedSessions[0];
          setActiveSessionId(firstSession.id);
          loadChatMessages(firstSession.id);
          
          // Update URL to include session ID
          const urlSafeSessionId = encodeURIComponent(firstSession.id);
          navigate(`/chat/${botType}/${urlSafeSessionId}`, { replace: true });
        }
      }
    } catch (err) {
      console.error("Error loading chat sessions:", err);
      setError("Failed to load chat history. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // Load chat messages for a specific session
  const loadChatMessages = async (sessionId) => {
    if (!sessionId) {
      console.log("No session ID provided, skipping message load");
      return;
    }
    
    console.log("Loading messages for session:", sessionId);
    setIsLoading(true);
    setError(null);
    setMessages([]); // Clear messages while loading
    
    try {
      // Add a small delay to ensure that the backend has time to process
      // This helps with race conditions on page refresh
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Make sure CSRF token is refreshed first
      if (!getCsrfToken()) {
        await fetchCsrfToken(getBaseUrl());
      }
      
      const result = await fetchChatMessages(selectedBot, sessionId);
      
      if (result && result.success && result.messages && Array.isArray(result.messages)) {
        console.log(`Loaded ${result.messages.length} messages`);
        
        // Make sure all messages have unique IDs and proper timestamps
        const processedMessages = result.messages.map((msg, index) => ({
          ...msg,
          id: msg.id || `${Date.now()}_${index}_${msg.sender}`,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
          sessionId: msg.sessionId || sessionId
        }));
        
        // If we're in document bot, save these messages to the document cache as well
        if (selectedBot === 'document' && selectedDocument) {
          setDocumentMessagesCache(prevCache => ({
            ...prevCache,
            [selectedDocument.id]: processedMessages
          }));
        }
        
        setMessages(processedMessages);
      } else {
        console.warn("No messages returned or success flag was false:", result);
        // Don't set error here - it might be a legitimate empty conversation
      }
    } catch (err) {
      console.error("Error loading chat messages:", err);
      setError("Failed to load chat messages. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch documents when csrfReady changes or when selectedBot changes to 'document'
  useEffect(() => {
    if (!csrfReady || selectedBot !== 'document') {
      return;
    }
    
    const loadDocuments = async () => {
      setIsDocumentsLoading(true);
      setError(null);
      
      try {
        const result = await fetchDocuments();
        
        if (result.success && result.documents) {
          setDocuments(result.documents);
          
          // Set the first document as selected if available and none is currently selected
          if (result.documents.length > 0 && !selectedDocument) {
            const firstDoc = result.documents[0];
            setSelectedDocument(firstDoc);
            setSelectedDocumentId(firstDoc.id);
            
            // Check if we have cached messages for this document
            if (documentMessagesCache[firstDoc.id]) {
              setMessages(documentMessagesCache[firstDoc.id]);
            } else {
              // Find sessions related to this document
              const documentSessions = chatSessions.document.filter(session => 
                session.document_id === firstDoc.id
              );
              
              if (documentSessions.length > 0) {
                // Use the most recent session
                const latestSession = documentSessions[0];
                setActiveSessionId(latestSession.id);
                setIsNewChat(false);
                loadChatMessages(latestSession.id);
              } else {
                // No existing sessions for this document
                setMessages([]);
                setActiveSessionId(null);
                setIsNewChat(true);
              }
            }
          }
        }
      } catch (err) {
        console.error("Error loading documents:", err);
        setError("Failed to load documents. Please try again later.");
      } finally {
        setIsDocumentsLoading(false);
      }
    };
    
    loadDocuments();
  }, [csrfReady, selectedBot]);


  // Function to handle deleting a session
  const handleSessionDelete = async (sessionId) => {
    try {
      setIsLoading(true);
      const result = await deleteSession(selectedBot, sessionId);
      
      if (result.success) {
        // Remove session from the sessions list
        setChatSessions(prevSessions => ({
          ...prevSessions,
          [selectedBot]: prevSessions[selectedBot].filter(session => session.id !== sessionId)
        }));
        
        // If the deleted session was active, create a new chat IMMEDIATELY
        if (sessionId === activeSessionId) {
          // Clear messages before navigating
          setMessages([]);
          setActiveSessionId(null);
          setIsNewChat(true);
          navigate(`/chat/${selectedBot}/new`, { replace: true });
        }
        
        setError(null);
      } else {
        setError("Failed to delete conversation. Please try again.");
      }
    } catch (err) {
      console.error("Error deleting session:", err);
      setError("Failed to delete conversation. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  
  // Function to handle deleting a message
  const handleMessageDelete = async (messageId) => {
    try {
      setIsLoading(true);
      const result = await deleteMessage(selectedBot, messageId);
      
      if (result.success) {
        const updatedMessages = messages.filter(
          msg => !msg.id.startsWith(messageId)
        );
        
        if (updatedMessages.length === 0) {
          handleNewChat();
        } else {
          setMessages(updatedMessages);
          
          // Update document message cache if we're in document bot
          if (selectedBot === 'document' && selectedDocument) {
            setDocumentMessagesCache(prevCache => ({
              ...prevCache,
              [selectedDocument.id]: updatedMessages
            }));
          }
        }
        
        loadChatSessions(selectedBot);        
        setError(null);
      } else {
        setError("Failed to delete message. Please try again.");
      }
    } catch (err) {
      console.error("Error deleting message:", err);
      setError("Failed to delete message. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle creating a new chat
  const handleNewChat = () => {
    setIsNewChat(true);
    setActiveSessionId(null);
    setMessages([]);
    
    if (selectedBot === 'document' && selectedDocument) {
      // For document bot, we stay on the same URL but clear the messages
      // Update document message cache to reflect empty chat
      setDocumentMessagesCache(prevCache => ({
        ...prevCache,
        [selectedDocument.id]: []
      }));
    } else {
      navigate(`/chat/${selectedBot}/new`, { replace: true });
    }
  };

  // Function to handle session selection
  const handleSessionSelect = async (sessionId) => {
    console.log("App: Handling session selection for:", sessionId);
    
    if (sessionId === activeSessionId && messages.length > 0) {
      console.log("Session already active with messages, skipping reload");
      return;
    }
    
    setIsNewChat(false);
    setActiveSessionId(sessionId);
    setMessages([]);
    
    await loadChatMessages(sessionId);
    
    // We don't update URL for document bot, since the URL should be document-based
    if (selectedBot !== 'document') {
      const urlSafeSessionId = encodeURIComponent(sessionId);
      navigate(`/chat/${selectedBot}/${urlSafeSessionId}`, { replace: true });
    }
  };

  // Function to handle bot selection change
  const handleBotChange = (botType) => {
    if (validBotTypes.includes(botType) && botType !== selectedBot) {
      setSelectedBot(botType);
      setMessages([]);
      
      // When changing bot type, reset to default behavior:
      // If we have sessions, show the first one, otherwise show new chat
      if (chatSessions[botType]?.length > 0) {
        const firstSession = chatSessions[botType][0];
        const urlSafeSessionId = encodeURIComponent(firstSession.id);
        navigate(`/chat/${botType}/${urlSafeSessionId}`, { replace: true });
      } else {
        navigate(`/chat/${botType}/new`, { replace: true });
      }
    }
  };

  // Function to handle document upload
  const handleDocumentUpload = async (newDocument) => {
    if (!csrfReady) {
      try {
        await fetchCsrfToken(getBaseUrl());
        setCsrfReady(true);
      } catch (err) {
        setError("CSRF protection not ready. Please refresh the page and try again.");
        return;
      }
    }
    
    setIsDocumentsLoading(true);
    setError(null);
    
    try {
      // Pass the current selected bot type as the task_type
      const result = await apiUploadDocument(newDocument.file, selectedBot);
      
      if (result.success) {
        // Create document object from response
        const uploadedDocument = {
          id: result.id,
          name: result.name,
          type: result.type,
          size: result.size,
          url: result.url,
          task_type: result.task_type || selectedBot, // Include task_type (bot type) in state
          created_at: result.created_at
        };
        
        // Add the new document to state
        const updatedDocuments = [uploadedDocument, ...documents];
        setDocuments(updatedDocuments);
        
        // Automatically select the newly uploaded document
        setSelectedDocument(uploadedDocument);
        setSelectedDocumentId(uploadedDocument.id);
        
        // Clear messages for the new document
        setMessages([]);
        setActiveSessionId(null);
        setIsNewChat(true);
        
        // Initialize empty message cache for this document
        setDocumentMessagesCache(prevCache => ({
          ...prevCache,
          [uploadedDocument.id]: []
        }));
      } else {
        throw new Error(result.message || "Upload failed");
      }
    } catch (err) {
      console.error("Error uploading document:", err);
      setError(`Failed to upload document: ${err.message}`);
    } finally {
      setIsDocumentsLoading(false);
    }
  };


  // Function to handle document selection
  const handleDocumentSelect = (document) => {
    // Don't do anything if the same document is already selected
    if (document.id === selectedDocumentId) {
      return;
    }
    
    setSelectedDocumentId(document.id);
    setSelectedDocument(document);
    
    // First check if we have cached messages for this document
    if (documentMessagesCache[document.id]) {
      console.log("Using cached messages for document:", document.id);
      setMessages(documentMessagesCache[document.id]);
      
      // Find the session ID for this document
      const documentSession = chatSessions.document.find(session => 
        session.document_id === document.id
      );
      
      if (documentSession) {
        setActiveSessionId(documentSession.id);
        setIsNewChat(false);
      } else {
        setActiveSessionId(null);
        setIsNewChat(true);
      }
    } else {
      // No cached messages, try to find a session for this document
      const documentSessions = chatSessions.document.filter(session => 
        session.document_id === document.id
      );
      
      if (documentSessions.length > 0) {
        // Use the most recent session
        const latestSession = documentSessions[0];
        setActiveSessionId(latestSession.id);
        setIsNewChat(false);
        loadChatMessages(latestSession.id);
      } else {
        // No existing sessions for this document
        setMessages([]);
        setActiveSessionId(null);
        setIsNewChat(true);
      }
    }
  };

  // Function to handle document deletion
  const handleDocumentDelete = async (documentId) => {
    setIsDocumentsLoading(true);
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
      
      // Also remove from document cache
      setDocumentMessagesCache(prevCache => {
        const newCache = {...prevCache};
        delete newCache[documentId];
        return newCache;
      });
      
      // If the deleted document was selected, clear the selection
      if (selectedDocument && selectedDocument.id === documentId) {
        if (updatedDocuments.length > 0) {
          const firstDoc = updatedDocuments[0];
          setSelectedDocument(firstDoc);
          setSelectedDocumentId(firstDoc.id);
          
          // Load messages for the first document
          if (documentMessagesCache[firstDoc.id]) {
            setMessages(documentMessagesCache[firstDoc.id]);
            
            // Find the session for this document
            const documentSession = chatSessions.document.find(session => 
              session.document_id === firstDoc.id
            );
            
            if (documentSession) {
              setActiveSessionId(documentSession.id);
              setIsNewChat(false);
            } else {
              setActiveSessionId(null);
              setIsNewChat(true);
            }
          } else {
            setMessages([]);
            setActiveSessionId(null);
            setIsNewChat(true);
          }
        } else {
          setSelectedDocument(null);
          setSelectedDocumentId(null);
          setMessages([]);
          setActiveSessionId(null);
          setIsNewChat(true);
        }
      }
    } catch (err) {
      console.error("Error deleting document:", err);
      setError(`Failed to delete document: ${err.message}`);
    } finally {
      setIsDocumentsLoading(false);
    }
  };

  // Function to handle sending a message
  const handleSendMessage = async (content, file = null) => {
    // Check for CSRF readiness
    if ((selectedBot === 'document' || file) && !csrfReady) {
      try {
        await fetchCsrfToken(getBaseUrl());
        setCsrfReady(true);
      } catch (err) {
        setError("CSRF protection not ready. Please refresh the page and try again.");
        return;
      }
    }
    
    // Create a new session ID if one doesn't exist yet
    const currentSessionId = activeSessionId || `${uuidv4()}`;
    if (!activeSessionId) {
      setActiveSessionId(currentSessionId);
      setIsNewChat(false);
      const urlSafeSessionId = encodeURIComponent(currentSessionId);
      
      // Only update URL for non-document bots
      if (selectedBot !== 'document') {
        navigate(`/chat/${selectedBot}/${urlSafeSessionId}`, { replace: true });
      }
    }
    
    // Create the user message
    let messageContent = content;
    if (file) {
      // If there's a file, append file info to the message content
      const fileInfo = `[File: ${file.name}]`;
      messageContent = content ? `${content}\n${fileInfo}` : fileInfo;
    }

    const newMessage = {
      id: Date.now() + '_user',
      content: messageContent,
      sender: "user",
      timestamp: new Date(),
      sessionId: currentSessionId
    };

    // Add message to current messages
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    
    // If we're in document bot, update the document cache
    if (selectedBot === 'document' && selectedDocument) {
      setDocumentMessagesCache(prevCache => ({
        ...prevCache,
        [selectedDocument.id]: updatedMessages
      }));
    }

    try {
      // Handle file upload if provided
      let documentId = selectedDocument?.id || null;
      
      if (file) {
        // Upload the file first and get its ID
        try {
          // If we're in document bot mode, use the currently selected document
          if (selectedBot === 'document' && selectedDocument) {
            documentId = selectedDocument.id;
          } else {
            // For other bots, upload the file first with the current bot type
            const uploadResult = await apiUploadDocument(file, selectedBot);
            
            if (uploadResult.success) {
              documentId = uploadResult.id;
              
              // For document bot, update the selected document
              if (selectedBot === 'document') {
                const uploadedDocument = {
                  id: uploadResult.id,
                  name: uploadResult.name,
                  type: uploadResult.type,
                  size: uploadResult.size,
                  url: uploadResult.url,
                  task_type: uploadResult.task_type || selectedBot, // Add bot type as task_type
                  created_at: uploadResult.created_at
                };
                
                setSelectedDocument(uploadedDocument);
                setSelectedDocumentId(uploadedDocument.id);
                
                // Initialize cache for this document
                setDocumentMessagesCache(prevCache => ({
                  ...prevCache,
                  [uploadedDocument.id]: updatedMessages
                }));
              }
            } else {
              throw new Error(uploadResult.message || "File upload failed");
            }
          }
        } catch (err) {
          console.error("Error uploading attached file:", err);
          throw new Error(`Failed to upload file: ${err.message}`);
        }
      }
      
      // Now continue with the rest of your handleSendMessage function...
      // Call actual API for production
      const response = await sendChatMessage(
        content, 
        selectedBot, 
        documentId,
        currentSessionId
      );
      
      const botResponse = {
        id: Date.now() + '_bot',
        content: response.message || response.bot_response,
        sender: 'bot',
        timestamp: new Date(),
        sessionId: currentSessionId
      };
      
      const messagesWithResponse = [...updatedMessages, botResponse];
      setMessages(messagesWithResponse);
      
      // If we're in document bot, update the document cache with the bot response
      if (selectedBot === 'document' && selectedDocument) {
        setDocumentMessagesCache(prevCache => ({
          ...prevCache,
          [selectedDocument.id]: messagesWithResponse
        }));
      }
      
      // Update session list after a successful message exchange
      loadChatSessions(selectedBot);
      
    } catch (err) {
      console.error("Error getting bot response:", err);
      setError(`Failed to get response: ${err.message}`);
      
      // Add an error message to the chat
      const errorMessage = {
        id: Date.now() + '_error',
        content: `Sorry, I couldn't process your request. Please try again.`,
        sender: "bot",
        timestamp: new Date(),
        sessionId: currentSessionId
      };
      
      const messagesWithError = [...updatedMessages, errorMessage];
      setMessages(messagesWithError);
      
      // If we're in document bot, update the document cache with the error message
      if (selectedBot === 'document' && selectedDocument) {
        setDocumentMessagesCache(prevCache => ({
          ...prevCache,
          [selectedDocument.id]: messagesWithError
        }));
      }
    }
  };


  return (
    <div className="app">
      <Navbar />
      
      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      
      {isLoading && (
        <div className="loading-indicator"></div>
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
          selectedDocumentId={selectedDocumentId}
          isDocumentsLoading={isDocumentsLoading}
          activeSessionId={activeSessionId}
          onSessionSelect={handleSessionSelect}
          onNewChat={handleNewChat}
          onSessionDelete={handleSessionDelete}
          isNewChat={isNewChat}
        />

        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          selectedBot={selectedBot}
          selectedDocument={selectedDocument}
          onMessageDelete={handleMessageDelete}
          isNewChat={isNewChat}
        />

        {/* Right sidebar - only for document bot */}
        {selectedBot === "document" && (
          <RightSidebar selectedDocument={selectedDocument} />
        )}
      </div>
    </div>
  );
}

export default App;
