import { useState } from "react";
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
import "./App.css";

function App() {
  // State for the selected bot type
  const [selectedBot, setSelectedBot] = useState("grammar"); // Options: 'grammar', 'email', 'document'

  // State for documents (only relevant for document bot)
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);

  // State for chat history
  const [chatSessions, setChatSessions] = useState({
    grammar: [],
    email: [],
    document: [],
  });

  // State for current chat messages
  const [messages, setMessages] = useState([]);

  // Function to handle bot selection change
  const handleBotChange = (botType) => {
    setSelectedBot(botType);
    // Load the correct session history for the selected bot
    setMessages(chatSessions[botType]);
  };

  // Function to handle document upload
  const handleDocumentUpload = (newDocument) => {
    // In a real app, you'd make an API call to upload to the server
    // Example API call (commented out):
    //
    // const formData = new FormData();
    // formData.append('file', file);
    // fetch('/api/documents', {
    //   method: 'POST',
    //   body: formData
    // })
    // .then(response => response.json())
    // .then(data => {
    //   // Add the new document to state
    //   const updatedDocuments = [...documents, data];
    //   setDocuments(updatedDocuments);
    //   setSelectedDocument(data);
    // })
    // .catch(error => {
    //   console.error('Error uploading document:', error);
    // });

    // For demo purposes, we'll just update the state directly
    const updatedDocuments = [...documents, newDocument];
    setDocuments(updatedDocuments);

    // Automatically select the newly uploaded document
    setSelectedDocument(newDocument);
  };

  // Function to handle document selection
  const handleDocumentSelect = (document) => {
    setSelectedDocument(document);
  };

  // Function to handle document deletion
  const handleDocumentDelete = (documentId) => {
    // In a real app, you'd make an API call to delete from the server
    // Example API call (commented out):
    //
    // fetch(`/api/documents/${documentId}`, {
    //   method: 'DELETE'
    // })
    // .then(response => {
    //   if (response.ok) {
    //     // Update local state after successful deletion
    //     const updatedDocuments = documents.filter(doc => doc.id !== documentId);
    //     setDocuments(updatedDocuments);
    //
    //     // If the deleted document was selected, clear the selection
    //     if (selectedDocument && selectedDocument.id === documentId) {
    //       setSelectedDocument(updatedDocuments.length > 0 ? updatedDocuments[0] : null);
    //     }
    //   } else {
    //     throw new Error('Failed to delete document');
    //   }
    // })
    // .catch(error => {
    //   console.error('Error deleting document:', error);
    // });

    // For demo purposes, just update the state
    const updatedDocuments = documents.filter((doc) => doc.id !== documentId);
    setDocuments(updatedDocuments);

    // If the deleted document was selected, update selection
    if (selectedDocument && selectedDocument.id === documentId) {
      setSelectedDocument(
        updatedDocuments.length > 0 ? updatedDocuments[0] : null
      );
    }
  };

  // Function to handle sending a message
  const handleSendMessage = (content) => {
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

    // Here you would normally call a backend API to get the bot's response
    // For example:
    // fetch('/api/chat', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     message: content,
    //     botType: selectedBot,
    //     documentId: selectedDocument?.id || null
    //   }),
    // })
    // .then(response => response.json())
    // .then(data => {
    //   const botResponse = {
    //     id: Date.now(),
    //     content: data.response,
    //     sender: 'bot',
    //     timestamp: new Date()
    //   };
    //
    //   const messagesWithResponse = [...updatedMessages, botResponse];
    //   setMessages(messagesWithResponse);
    //
    //   // Update session history
    //   setChatSessions({
    //     ...chatSessions,
    //     [selectedBot]: messagesWithResponse
    //   });
    // })
    // .catch(error => {
    //   console.error('Error getting bot response:', error);
    // });

    // For now, simulate a response after a short delay
    setTimeout(() => {
      const botResponse = {
        id: Date.now(),
        content: `This is a simulated response from the ${selectedBot} bot.${
          selectedDocument ? ` About document: ${selectedDocument.name}` : ""
        }`,
        sender: "bot",
        timestamp: new Date(),
      };

      const messagesWithResponse = [...updatedMessages, botResponse];
      setMessages(messagesWithResponse);

      // Update session history for the current bot
      setChatSessions({
        ...chatSessions,
        [selectedBot]: messagesWithResponse,
      });
    }, 1000);
  };

  return (
    <Router>
      <div className="app">
        <Navbar />
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
        <Route path="/chat" element={null} />{" "}
        {/* Chat UI is already rendered in the main layout */}
        <Route path="/chat/:botType" element={null} />{" "}
        {/* Will be used for deep linking to specific bot types */}
      </Routes>
    </Router>
  );
}

export default App;
