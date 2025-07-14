'use client';

// src/components/ChatComponent.tsx
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { getOpenAIResponseWithManualSearch as getOpenAIResponse, analyzePdfWithOpenAI, analyzeExcelWithOpenAI, getOpenAIResponseWithWebSearch } from '@/lib/openai-service';
import PdfUploadButton from '@/components/PdfUploadButton';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ExcelUploadButton from '@/components/ExcelUploadButton';
import KnowledgeLibraryButton from '@/components/KnowledgeLibraryButton';
import ActiveDocumentsBanner from '@/components/ActiveDocumentsBanner';
import KnowledgeLibraryPanel from './KnowledgeLibraryPanel';
import RenameDialog from '@/components/RenameDialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { handleDocumentGeneration } from '@/lib/openai-service';
import PdfDocumentEmbed from '@/components/PdfDocumentEmbed';
import ReasoningDisplay from '@/components/ReasoningDisplay';
import { 
  getOpenAIResponseWithExtendedReasoning,
  analyzePdfWithExtendedReasoning,
  analyzeExcelWithExtendedReasoning,
  type ExtendedResponse,
  type ReasoningStep
} from '@/lib/openai-service-extended';

// Definicja typów
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ExtendedMessage extends Message {
  pdfUrl?: string;
  documentId?: string;
  reasoning?: {
    steps: ReasoningStep[];
    finalAnswer: string;
  };
}

interface Chat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export default function ChatComponent() {
  const { data: session } = useSession();
  const router = useRouter();
  
  // Stan dla historii czatów
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [loadingChats, setLoadingChats] = useState(true);
  const [activeDocumentIds, setActiveDocumentIds] = useState<string[]>([]);
  // Stan dla czatu
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [documentType, setDocumentType] = useState<string | null>(null);
  const [documentText, setDocumentText] = useState<string | null>(null);
  const [documentMetadata, setDocumentMetadata] = useState<any | null>(null);
  const [documentInfo, setDocumentInfo] = useState<any | null>(null);
  const [documentChatId, setDocumentChatId] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [chatToRename, setChatToRename] = useState<{id: string, title: string} | null>(null);
  const [showRenameInput, setShowRenameInput] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectionResults, setDetectionResults] = useState<any>(null);
  const [showDetectionModal, setShowDetectionModal] = useState(false);
  const [extendedReasoningEnabled, setExtendedReasoningEnabled] = useState(false);

  // Pobieranie historii czatów
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const response = await fetch('/api/chats');
        if (!response.ok) throw new Error('Problem z pobraniem czatów');
        
        const data = await response.json();
        setChats(data.chats);
        
        if (data.chats.length > 0 && !currentChatId) {
          setCurrentChatId(data.chats[0].id);
        }
      } catch (error) {
        console.error('Błąd podczas pobierania historii czatów:', error);
      } finally {
        setLoadingChats(false);
      }
    };
    
    fetchChats();
  }, [currentChatId]);
  
  useEffect(() => {
    const fetchUserSettings = async () => {
      try {
        const response = await fetch('/api/user/settings');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setWebSearchEnabled(data.webSearchEnabled !== undefined ? data.webSearchEnabled : false);
            setExtendedReasoningEnabled(data.extendedReasoningEnabled !== undefined ? data.extendedReasoningEnabled : false);
          }
        }
      } catch (error) {
        console.error('Błąd podczas pobierania ustawień użytkownika:', error);
      }
    };
    
    if (session?.user) {
      fetchUserSettings();
    }
  }, [session]);

  // Załadowanie wiadomości dla wybranego czatu
  useEffect(() => {
    if (currentChatId) {
      const loadMessages = async () => {
        try {
          const response = await fetch(`/api/chats/${currentChatId}/messages`);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Problem z pobraniem wiadomości:', errorData);
            throw new Error(errorData.error || `Problem z pobraniem wiadomości (kod ${response.status})`);
          }
          
          const data = await response.json();
          
          if (data.messages && data.messages.length > 0) {
            const formattedMessages = data.messages.map((msg: any) => ({
              id: msg.id,
              text: msg.content,
              sender: msg.role === 'user' ? 'user' : 'bot',
              timestamp: new Date(msg.createdAt),
              pdfUrl: msg.metadata && msg.metadata.hasPdf ? `/api/document/${msg.metadata.documentId}/pdf` : undefined,
              documentId: msg.metadata && msg.metadata.documentId,
              reasoning: msg.reasoning || undefined
            }));
            
            setMessages(formattedMessages);
          } else {
            const initialMessage: Message = {
              id: uuidv4(),
              text: "Witaj w MarsoftAI! Jestem asystentem dla projektów UE. Jak mogę Ci pomóc w tworzeniu dokumentacji projektowej?",
              sender: 'bot',
              timestamp: new Date()
            };
            setMessages([initialMessage]);
            
            try {
              await fetch(`/api/chats/${currentChatId}/messages`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  content: initialMessage.text,
                  role: 'assistant'
                }),
              });
            } catch (postError) {
              console.error('Błąd podczas zapisywania początkowej wiadomości:', postError);
            }
          }
  
          try {
            const docsResponse = await fetch(`/api/chats/${currentChatId}/documents`);
            if (docsResponse.ok) {
              const docsData = await docsResponse.json();
              if (Array.isArray(docsData.documentIds)) {
                setActiveDocumentIds(docsData.documentIds);
              } else {
                console.warn("Pobrana lista documentIds nie jest tablicą:", docsData.documentIds);
                setActiveDocumentIds([]);
              }
            } else {
              console.warn("Nie udało się pobrać dokumentów czatu, kod:", docsResponse.status);
              setActiveDocumentIds([]);
            }
          } catch (error) {
            console.error('Błąd podczas pobierania dokumentów czatu:', error);
            setActiveDocumentIds([]);
          }
          
        } catch (error) {
          console.error('Błąd podczas pobierania wiadomości:', error);
          setMessages([{
            id: uuidv4(),
            text: "Wystąpił problem z połączeniem. Spróbuj odświeżyć stronę lub skontaktuj się z administratorem.",
            sender: 'bot',
            timestamp: new Date()
          }]);
        }
      };
      
      loadMessages();
    } else if (!loadingChats) {
      const initialMessage: Message = {
        id: uuidv4(),
        text: "Witaj w MarsoftAI! Jestem asystentem dla projektów UE. Jak mogę Ci pomóc w tworzeniu dokumentacji projektowej?",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages([initialMessage]);
      setActiveDocumentIds([]);
      setDocumentType(null);
      setDocumentText(null);
      setDocumentMetadata(null);
      setDocumentInfo(null);
      setDocumentChatId(null);
    }
  }, [currentChatId, loadingChats]);

  // Funkcja do obsługi wyboru dokumentów
  const handleDocumentsSelected = (documentIds: string[]) => {
    setActiveDocumentIds(documentIds);
  };

  const handleRenameChat = async () => {
    if (!currentChatId || !newChatName.trim()) return;
    
    try {
      const response = await fetch(`/api/chats/${currentChatId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newChatName.trim()
        }),
      });
      
      if (!response.ok) throw new Error('Problem z aktualizacją nazwy czatu');
      
      setChats(prevChats => prevChats.map(chat => 
        chat.id === currentChatId ? {...chat, title: newChatName.trim()} : chat
      ));
      
      setShowRenameInput(false);
    } catch (error) {
      console.error('Błąd podczas zmiany nazwy czatu:', error);
      alert('Wystąpił problem podczas zmiany nazwy czatu.');
    }
  };

  // Przewijanie do najnowszej wiadomości
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Obsługa tworzenia nowego czatu
  const handleNewChat = async () => {
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Nowa konwersacja'
        }),
      });
      
      if (!response.ok) throw new Error('Problem z utworzeniem czatu');
      
      const data = await response.json();
      
      const newChat = {
        id: data.chat.id,
        title: data.chat.title,
        createdAt: data.chat.createdAt,
        updatedAt: data.chat.updatedAt
      };
      
      setChats(prevChats => [newChat, ...prevChats]);
      setCurrentChatId(data.chat.id);
      
      setDocumentType(null);
      setDocumentText(null);
      setDocumentMetadata(null);
      setDocumentInfo(null);
      setDocumentChatId(null);
      
      const initialMessage: Message = {
        id: uuidv4(),
        text: "Witaj w MarsoftAI! Jestem asystentem dla projektów UE. Jak mogę Ci pomóc w tworzeniu dokumentacji projektowej?",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages([initialMessage]);
      
      await fetch(`/api/chats/${data.chat.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: initialMessage.text,
          role: 'assistant'
        }),
      });
      
    } catch (error) {
      console.error('Błąd podczas tworzenia nowego czatu:', error);
    }
  };

  const toggleWebSearch = async () => {
    try {
      const newValue = !webSearchEnabled;
      
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webSearchEnabled: newValue
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setWebSearchEnabled(data.webSearchEnabled);
        }
      }
    } catch (error) {
      console.error('Błąd podczas aktualizacji ustawień użytkownika:', error);
    }
  };

  const toggleExtendedReasoning = async () => {
    try {
      const newValue = !extendedReasoningEnabled;
      
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          extendedReasoningEnabled: newValue
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setExtendedReasoningEnabled(data.extendedReasoningEnabled);
        }
      }
    } catch (error) {
      console.error('Błąd podczas aktualizacji ustawień użytkownika:', error);
    }
  };

  const handleExcelContent = (content: string, metadata: any) => {
    if (!currentChatId) {
      alert("Najpierw wybierz lub utwórz czat przed wgraniem arkusza Excel.");
      return;
    }
    
    setDocumentType("excel");
    setDocumentText(content);
    setDocumentMetadata(metadata);
    setDocumentInfo(metadata);
    setDocumentChatId(currentChatId);
    
    fetch(`/api/chats/${currentChatId}/document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: metadata.title || "Arkusz Excel",
        fileType: "excel",
        content: content,
        rows: metadata.totalRows || 0,
        columns: metadata.totalColumns || 0,
        pages: null,
        metadata: metadata
      }),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Problem z zapisem Excel');
      }
      return response.json();
    })
    .then(data => {
      console.log("Excel zapisany w bazie danych:", data);
      
      if (data.document && data.document.id) {
        const newDocumentId = data.document.id;
        
        if (!activeDocumentIds.includes(newDocumentId)) {
          const updatedActiveDocuments = [...activeDocumentIds, newDocumentId];
          setActiveDocumentIds(updatedActiveDocuments);
          
          fetch(`/api/chats/${currentChatId}/documents`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              documentIds: updatedActiveDocuments
            }),
          }).catch(error => {
            console.error('Błąd podczas aktualizacji aktywnych dokumentów:', error);
          });
        }
      }
      
      const excelMessage: Message = {
        id: uuidv4(),
        text: `Wgrano arkusz Excel: "${metadata.title}" (${metadata.sheetCount} arkuszy, ${metadata.totalRows} wierszy). Możesz teraz zadawać pytania dotyczące jego zawartości.`,
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages((prevMessages) => [...prevMessages, excelMessage]);
      
      return fetch(`/api/chats/${currentChatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: excelMessage.text,
          role: 'assistant'
        }),
      });
    })
    .catch(error => {
      console.error('Błąd podczas zapisywania Excel:', error);
      alert("Wystąpił problem podczas zapisywania arkusza Excel.");
    });
  };

  // Formatowanie daty
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return 'Dzisiaj';
    }
    
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Wczoraj';
    }
    
    return date.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short'
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputValue.trim() === '' || isLoading) return;
    
    const userInput = inputValue.trim();
    console.log("🔍 Wysyłanie zapytania:", userInput);
    
    setInputValue('');
    setIsLoading(true);
    
    let chatId = currentChatId;
    
    if (!chatId) {
      try {
        const response = await fetch('/api/chats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: userInput.length > 30 ? `${userInput.substring(0, 27)}...` : userInput
          }),
        });
        
        if (!response.ok) throw new Error('Problem z utworzeniem czatu');
        
        const data = await response.json();
        chatId = data.chat.id;
        setCurrentChatId(chatId);
        
        const newChat = {
          id: data.chat.id,
          title: data.chat.title,
          createdAt: data.chat.createdAt,
          updatedAt: data.chat.updatedAt
        };
        
        setChats(prevChats => [newChat, ...prevChats]);
      } catch (error) {
        console.error('Błąd podczas tworzenia czatu:', error);
        setIsLoading(false);
        return;
      }
    }
    
    const userMessage: ExtendedMessage = {
      id: uuidv4(),
      text: userInput,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    
    try {
      await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: userInput,
          role: 'user'
        }),
      });
    } catch (error) {
      console.error('Błąd podczas zapisywania wiadomości użytkownika:', error);
    }
    
    let response = "";
    let pdfUrl = undefined;
    let documentId = undefined;
    let reasoning = undefined;
    
    try {
      console.log("🔍 Sprawdzanie, czy zapytanie dotyczy generowania dokumentu...");
      
      const documentResult = await handleDocumentGeneration(userInput, chatId as string);
      
      if (documentResult.text) {
        response = documentResult.text;
        pdfUrl = documentResult.pdfUrl;
        documentId = documentResult.documentId;
      } else {
        console.log("🔍 Standardowe zapytanie. Próba pobrania odpowiedzi z API OpenAI...");
        const aiResult = await getAIResponseWithFallback(userInput);
        
        if (typeof aiResult === 'string') {
          response = aiResult;
        } else {
          response = aiResult.response;
          reasoning = aiResult.reasoning;
        }
      }
      
      console.log("🔍 Otrzymano odpowiedź:", response);
      
      await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: response,
          role: 'assistant',
          metadata: pdfUrl ? {
            hasPdf: true,
            documentId: documentId
          } : undefined,
          reasoning: reasoning || undefined
        }),
      });
      
      if (messages.length <= 1) {
        const title = userInput.length > 30 ? `${userInput.substring(0, 27)}...` : userInput;
        
        await fetch(`/api/chats/${chatId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: title
          }),
        });
        
        setChats(prevChats => prevChats.map(chat => 
          chat.id === chatId ? {...chat, title: title} : chat
        ));
      }
      
    } catch (error) {
      console.error('🔍 Błąd podczas przetwarzania wiadomości:', error);
      response = "Przepraszam, wystąpił błąd podczas przetwarzania Twojego zapytania. Spróbuj ponownie później.";
    } finally {
      const botMessage: ExtendedMessage = {
        id: uuidv4(),
        text: response,
        sender: 'bot',
        timestamp: new Date(),
        pdfUrl: pdfUrl,
        documentId: documentId,
        reasoning: reasoning
      };
      
      setMessages((prevMessages) => [...prevMessages, botMessage]);
      setIsLoading(false);
    }
  };

  // Funkcja pomocnicza do obsługi odpowiedzi z OpenAI
  const getAIResponseWithFallback = async (prompt: string): Promise<{
    response: string;
    reasoning?: { steps: ReasoningStep[]; finalAnswer: string };
  }> => {
    try {
      console.log("🔍 === START getAIResponseWithFallback ===");
      console.log("📋 Aktywne dokumenty:", activeDocumentIds);
      console.log("🌐 Wyszukiwanie web:", webSearchEnabled);
      console.log("🧠 Rozszerzone myślenie:", extendedReasoningEnabled);
      
      if (activeDocumentIds.length > 0) {
        console.log(`📚 Używam ${activeDocumentIds.length} aktywnych dokumentów z biblioteki wiedzy`);
        const result = await getOpenAIResponseWithExtendedReasoning(
          prompt, 
          activeDocumentIds, 
          webSearchEnabled,
          extendedReasoningEnabled
        );
        return result;
      } 
      else if (documentText && documentMetadata && documentChatId === currentChatId) {
        console.log("📄 Używam pojedynczego dokumentu jako fallback:", documentType, documentMetadata.title);
        
        if (documentType === 'pdf') {
          const result = await analyzePdfWithExtendedReasoning(
            documentText, 
            documentMetadata, 
            prompt, 
            [], 
            webSearchEnabled,
            extendedReasoningEnabled
          );
          return result;
        } else if (documentType === 'excel') {
          const result = await analyzeExcelWithExtendedReasoning(
            documentText, 
            documentMetadata, 
            prompt, 
            [], 
            webSearchEnabled,
            extendedReasoningEnabled
          );
          return result;
        }
      }
      
      console.log("💬 Używam standardowego zapytania bez dokumentów");
      const result = await getOpenAIResponseWithExtendedReasoning(
        prompt, 
        [], 
        webSearchEnabled,
        extendedReasoningEnabled
      );
      return result;
      
    } catch (error) {
      console.error("❌ Błąd w getAIResponseWithFallback:", error);
      return {
        response: "Przepraszam, wystąpił problem z połączeniem. Spróbuj ponownie za chwilę."
      };
    }
  };

  // Formatowanie daty dla wiadomości
  const formatMessageTime = (date: Date) => {
    return new Intl.DateTimeFormat('pl-PL', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Obsługa zawartości PDF
  const handlePdfContent = (content: string, metadata: any) => {
    if (!currentChatId) {
      alert("Najpierw wybierz lub utwórz czat przed wgraniem dokumentu PDF.");
      return;
    }
    
    setDocumentType("pdf");
    setDocumentText(content);
    setDocumentMetadata(metadata);
    setDocumentInfo(metadata);
    setDocumentChatId(currentChatId);
    
    fetch(`/api/chats/${currentChatId}/document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: metadata.title || "Dokument PDF",
        fileType: "pdf",
        content: content,
        pages: metadata.pages || 0,
        rows: null,
        columns: null,
        metadata: metadata
      }),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Problem z zapisem PDF');
      }
      return response.json();
    })
    .then(data => {
      console.log("PDF zapisany w bazie danych:", data);
      
      if (data.document && data.document.id) {
        const newDocumentId = data.document.id;
        
        if (!activeDocumentIds.includes(newDocumentId)) {
          const updatedActiveDocuments = [...activeDocumentIds, newDocumentId];
          setActiveDocumentIds(updatedActiveDocuments);
          
          fetch(`/api/chats/${currentChatId}/documents`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              documentIds: updatedActiveDocuments
            }),
          }).catch(error => {
            console.error('Błąd podczas aktualizacji aktywnych dokumentów:', error);
          });
        }
      }
      
      const pdfMessage: Message = {
        id: uuidv4(),
        text: `Wgrano dokument PDF: "${metadata.title}" (${metadata.pages} stron). Możesz teraz zadawać pytania dotyczące jego zawartości.`,
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages((prevMessages) => [...prevMessages, pdfMessage]);
      
      return fetch(`/api/chats/${currentChatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: pdfMessage.text,
          role: 'assistant'
        }),
      });
    })
    .catch(error => {
      console.error('Błąd podczas zapisywania PDF:', error);
      alert("Wystąpił problem podczas zapisywania dokumentu PDF.");
    });
  };
  
  // Usuwanie czatu
  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Czy na pewno chcesz usunąć tę konwersację?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Problem z usunięciem czatu');
      
      setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
      
      if (chatId === currentChatId) {
        const remainingChats = chats.filter(chat => chat.id !== chatId);
        if (remainingChats.length > 0) {
          setCurrentChatId(remainingChats[0].id);
        } else {
          setCurrentChatId(null);
          setMessages([]);
          
          setDocumentType(null);
          setDocumentText(null);
          setDocumentMetadata(null);
          setDocumentInfo(null);
          setDocumentChatId(null);
        }
      }
    } catch (error) {
      console.error('Błąd podczas usuwania czatu:', error);
    }
  };

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes networkFlow {
          0% { 
            transform: translateX(-100px) translateY(-50px) scale(0);
            opacity: 0;
          }
          50% { 
            opacity: 1;
            transform: translateX(50vw) translateY(0px) scale(1);
          }
          100% { 
            transform: translateX(100vw) translateY(50px) scale(0);
            opacity: 0;
          }
        }
        
        @keyframes aiPulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 0.3;
          }
          50% { 
            transform: scale(1.2);
            opacity: 0.8;
          }
        }
        
        @keyframes dataStream {
          0% { 
            transform: translateY(100vh) scaleY(0);
            opacity: 0;
          }
          20% { 
            opacity: 1;
            transform: translateY(80vh) scaleY(1);
          }
          80% { 
            opacity: 1;
            transform: translateY(20vh) scaleY(1);
          }
          100% { 
            transform: translateY(-20vh) scaleY(0);
            opacity: 0;
          }
        }
        
        @keyframes geometricFloat {
          0%, 100% { 
            transform: translateY(0px);
            opacity: 0.3;
          }
          50% { 
            transform: translateY(-10px);
            opacity: 0.6;
          }
        }
        
        @keyframes hexagonPulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 0.4;
          }
          50% { 
            transform: scale(1.05);
            opacity: 0.7;
          }
        }
        
        @keyframes circuitTrace {
          0% { stroke-dashoffset: 1000; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }

        .sidebar-container {
          animation: slideInLeft 0.8s ease-out;
        }
        
        .chat-container {
          animation: slideInRight 0.8s ease-out;
          z-index: 1;
        }
        
        
        .message-item {
          animation: fadeInUp 0.6s ease-out forwards;
          opacity: 0;
          position: relative;
          z-index: 1;
          pointer-events: none;
        }
        
        .ai-particle {
          animation: networkFlow 8s ease-in-out infinite;
        }
        
        .ai-particle:nth-child(1) { animation-delay: 0s; }
        .ai-particle:nth-child(2) { animation-delay: 2s; }
        .ai-particle:nth-child(3) { animation-delay: 4s; }
        .ai-particle:nth-child(4) { animation-delay: 6s; }
        
        .ai-node {
          animation: aiPulse 4s ease-in-out infinite;
        }
        
        .ai-node:nth-child(odd) { animation-delay: 2s; }
        
        .data-stream {
          animation: dataStream 6s ease-in-out infinite;
        }
        
        .data-stream:nth-child(1) { animation-delay: 0s; }
        .data-stream:nth-child(2) { animation-delay: 1s; }
        .data-stream:nth-child(3) { animation-delay: 2s; }
        .data-stream:nth-child(4) { animation-delay: 3s; }
        .data-stream:nth-child(5) { animation-delay: 4s; }
        
        .geometric-shape {
          animation: geometricFloat 8s ease-in-out infinite;
        }
        
        .geometric-shape:nth-child(even) { animation-delay: 4s; }
        
        .hexagon-ai {
          animation: hexagonPulse 6s ease-in-out infinite;
        }
        
        .circuit-line {
          animation: circuitTrace 10s ease-in-out infinite;
        }
        
        .input-focus:focus {
          transform: translateY(-1px);
          box-shadow: 0 8px 25px rgba(163, 205, 57, 0.25) !important;
          border-color: #a3cd39 !important;
        }
        
        .button-hover:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 25px rgba(163, 205, 57, 0.4);
        }
        
        .feature-item {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .feature-item:hover {
          transform: translateX(8px);
          background: rgba(163, 205, 57, 0.1);
          border-radius: 12px;
          padding: 8px 12px;
        }

        .markdown-content {
          color: rgba(255, 255, 255, 0.9);
        }

        .markdown-content h1,
        .markdown-content h2,
        .markdown-content h3,
        .markdown-content h4,
        .markdown-content h5,
        .markdown-content h6 {
          color: #a3cd39;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }

        .markdown-content p {
          margin-bottom: 0.75rem;
          line-height: 1.6;
        }

        .markdown-content ul,
        .markdown-content ol {
          margin-bottom: 0.75rem;
          padding-left: 1.5rem;
        }

        .markdown-content li {
          margin-bottom: 0.25rem;
        }

        .markdown-content code {
          background: rgba(163, 205, 57, 0.1);
          color: #a3cd39;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-size: 0.875rem;
        }

        .markdown-content pre {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(163, 205, 57, 0.2);
          border-radius: 0.5rem;
          padding: 1rem;
          overflow-x: auto;
          margin: 0.75rem 0;
        }

        .markdown-content pre code {
          background: none;
          padding: 0;
        }

        .markdown-content blockquote {
          border-left: 4px solid #a3cd39;
          padding-left: 1rem;
          margin: 0.75rem 0;
          font-style: italic;
          opacity: 0.8;
        }

        .markdown-content table {
          border-collapse: collapse;
          width: 100%;
          margin: 0.75rem 0;
        }

        .markdown-content th,
        .markdown-content td {
          border: 1px solid rgba(163, 205, 57, 0.2);
          padding: 0.5rem;
          text-align: left;
        }

        .markdown-content th {
          background: rgba(163, 205, 57, 0.1);
          font-weight: 600;
        }
      `}</style>
      
      <div style={{ 
        display: 'flex', 
        height: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d3748 50%, #1a202c 100%)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* AI Neural Network Background */}
        <svg style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          opacity: 0.03
        }}>
          <defs>
            <pattern id="circuit" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M20 20h60v60h-60z" fill="none" stroke="#a3cd39" strokeWidth="0.5"/>
              <circle cx="20" cy="20" r="2" fill="#a3cd39"/>
              <circle cx="80" cy="20" r="2" fill="#a3cd39"/>
              <circle cx="20" cy="80" r="2" fill="#a3cd39"/>
              <circle cx="80" cy="80" r="2" fill="#a3cd39"/>
              <path d="M20 20L80 80M80 20L20 80" stroke="#a3cd39" strokeWidth="0.3" opacity="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#circuit)"/>
          
          <path 
            className="circuit-line"
            d="M0,50 Q200,20 400,50 T800,50" 
            fill="none" 
            stroke="#a3cd39" 
            strokeWidth="2" 
            strokeDasharray="10,5"
            opacity="0.1"
          />
          <path 
            className="circuit-line"
            d="M0,150 Q300,120 600,150 T1200,150" 
            fill="none" 
            stroke="#a3cd39" 
            strokeWidth="1.5" 
            strokeDasharray="8,3"
            opacity="0.08"
            style={{ animationDelay: '3s' }}
          />
        </svg>
        
        {/* AI Data particles flowing */}
        <div className="ai-particle" style={{
          position: 'absolute',
          width: '3px',
          height: '3px',
          background: '#a3cd39',
          borderRadius: '50%',
          top: '15%',
          left: 0,
          zIndex: 1,
          boxShadow: '0 0 8px #a3cd39',
          opacity: 0.4
        }} />
        <div className="ai-particle" style={{
          position: 'absolute',
          width: '2px',
          height: '2px',
          background: '#8bc34a',
          borderRadius: '50%',
          top: '45%',
          left: 0,
          zIndex: 1,
          boxShadow: '0 0 6px #8bc34a',
          opacity: 0.3
        }} />
        <div className="ai-particle" style={{
          position: 'absolute',
          width: '3px',
          height: '3px',
          background: '#a3cd39',
          borderRadius: '50%',
          top: '75%',
          left: 0,
          zIndex: 1,
          boxShadow: '0 0 8px #a3cd39',
          opacity: 0.4
        }} />
        
        {/* Neural network nodes */}
        <div className="ai-node" style={{
          position: 'absolute',
          width: '8px',
          height: '8px',
          background: 'radial-gradient(circle, #a3cd39, #8bc34a)',
          borderRadius: '50%',
          top: '10%',
          left: '5%',
          zIndex: 1,
          boxShadow: '0 0 12px #a3cd39',
          opacity: 0.3
        }} />
        <div className="ai-node" style={{
          position: 'absolute',
          width: '6px',
          height: '6px',
          background: 'radial-gradient(circle, #8bc34a, #a3cd39)',
          borderRadius: '50%',
          top: '40%',
          left: '8%',
          zIndex: 1,
          boxShadow: '0 0 10px #8bc34a',
          opacity: 0.2
        }} />
        <div className="ai-node" style={{
          position: 'absolute',
          width: '7px',
          height: '7px',
          background: 'radial-gradient(circle, #a3cd39, #8bc34a)',
          borderRadius: '50%',
          top: '80%',
          left: '3%',
          zIndex: 1,
          boxShadow: '0 0 11px #a3cd39',
          opacity: 0.3
        }} />
        
        {/* Data streams on right side */}
        <div className="data-stream" style={{
          position: 'absolute',
          width: '2px',
          height: '40px',
          background: 'linear-gradient(to bottom, transparent, #a3cd39, transparent)',
          right: '15%',
          top: 0,
          zIndex: 1,
          opacity: 0.3
        }} />
        <div className="data-stream" style={{
          position: 'absolute',
          width: '1px',
          height: '30px',
          background: 'linear-gradient(to bottom, transparent, #8bc34a, transparent)',
          right: '25%',
          top: 0,
          zIndex: 1,
          opacity: 0.2
        }} />
        <div className="data-stream" style={{
          position: 'absolute',
          width: '2px',
          height: '35px',
          background: 'linear-gradient(to bottom, transparent, #a3cd39, transparent)',
          right: '35%',
          top: 0,
          zIndex: 1,
          opacity: 0.3
        }} />
        
        {/* Geometric AI shapes */}
        <div className="geometric-shape" style={{
          position: 'absolute',
          width: '15px',
          height: '15px',
          background: 'linear-gradient(45deg, rgba(163, 205, 57, 0.2), rgba(139, 195, 74, 0.1))',
          top: '20%',
          right: '15%',
          zIndex: 1,
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
          opacity: 0.3
        }} />
        <div className="geometric-shape hexagon-ai" style={{
          position: 'absolute',
          width: '12px',
          height: '12px',
          background: 'linear-gradient(60deg, rgba(84, 57, 205, 0.3), rgba(139, 195, 74, 0.1))',
          top: '60%',
          right: '25%',
          zIndex: 1,
          clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
          opacity: 0.2
        }} />

        {/* Sidebar z historią czatów */}
        {showSidebar && (
          <div className="sidebar-container" style={{ 
            width: '280px', 
            height: '100%', 
            backgroundColor: 'rgba(26, 26, 26, 0.95)',
            backdropFilter: 'blur(20px)',
            border: 'none',
            borderRight: '1px solid rgba(163, 205, 57, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            zIndex: 2
          }}>
            {/* Przycisk nowego czatu */}
            <div style={{ padding: '16px' }}>
              <button
                onClick={handleNewChat}
                className="button-hover"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'linear-gradient(135deg, #a3cd39 0%, #8bc34a 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  color: '#1a1a1a',
                  fontWeight: '600',
                  fontSize: '14px',
                  boxShadow: '0 4px 15px rgba(163, 205, 57, 0.3)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Nowa konwersacja</span>
              </button>
            </div>
            
            {/* Lista czatów */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '0 8px 16px 8px'
            }}>
              <div style={{ 
                padding: '8px 8px 8px 16px', 
                fontSize: '12px', 
                fontWeight: 600, 
                color: 'rgba(255, 255, 255, 0.6)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Historia czatów
              </div>
              
              {loadingChats ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(163, 205, 57, 0.3)',
                    borderTop: '2px solid #a3cd39',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto'
                  }} />
                </div>
              ) : chats.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
                  Brak historii czatów
                </div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {chats.map((chat) => (
                    <li key={chat.id}>
                      <div
                        onClick={() => setCurrentChatId(chat.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '12px',
                          borderRadius: '12px',
                          marginBottom: '6px',
                          cursor: 'pointer',
                          backgroundColor: currentChatId === chat.id ? 'rgba(163, 205, 57, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          border: currentChatId === chat.id ? '1px solid rgba(163, 205, 57, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                          position: 'relative',
                          backdropFilter: 'blur(10px)',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        onMouseEnter={(e) => {
                          if (currentChatId !== chat.id) {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.borderColor = 'rgba(163, 205, 57, 0.2)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (currentChatId !== chat.id) {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          }
                        }}
                      >
                        <div style={{ 
                          marginRight: '12px', 
                          color: currentChatId === chat.id ? '#a3cd39' : 'rgba(255, 255, 255, 0.6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                          </svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: currentChatId === chat.id ? 'white' : 'rgba(255, 255, 255, 0.8)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {chat.title}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: 'rgba(255, 255, 255, 0.5)',
                            marginTop: '2px'
                          }}>
                            {formatDate(chat.updatedAt)}
                          </div>
                        </div>
                        
                        {/* Przycisk zmiany nazwy */}
                        {currentChatId && (
                          <div style={{ position: 'relative' }}>
                            <button
                              onClick={() => {
                                const currentChat = chats.find(chat => chat.id === currentChatId);
                                if (currentChat) {
                                  setNewChatName(currentChat.title);
                                  setShowRenameInput(!showRenameInput);
                                }
                              }}
                              style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: 'rgba(255, 255, 255, 0.5)',
                                padding: '4px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                opacity: 0.7,
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Zmień nazwę"
                              onMouseOver={(e) => {
                                e.currentTarget.style.opacity = '1';
                                e.currentTarget.style.color = '#a3cd39';
                                e.currentTarget.style.backgroundColor = 'rgba(163, 205, 57, 0.1)';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.opacity = '0.7';
                                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            
                            {showRenameInput && (
                              <>
                                <div 
                                  style={{
                                    position: 'fixed',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    zIndex: 9998,
                                    backgroundColor: 'rgba(0, 0, 0, 0.6)'
                                  }}
                                  onClick={() => setShowRenameInput(false)}
                                ></div>
                                <div style={{
                                  position: 'fixed',
                                  top: '50%',
                                  left: '50%',
                                  transform: 'translate(-50%, -50%)',
                                  zIndex: 9999,
                                  width: '320px',
                                  backgroundColor: 'rgba(26, 26, 26, 0.95)',
                                  backdropFilter: 'blur(20px)',
                                  borderRadius: '16px',
                                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
                                  border: '1px solid rgba(163, 205, 57, 0.2)'
                                }}>
                                  <div style={{
                                    padding: '16px 20px',
                                    borderBottom: '1px solid rgba(163, 205, 57, 0.2)',
                                    fontSize: '16px',
                                    fontWeight: 600,
                                    color: 'white'
                                  }}>
                                    Zmień nazwę konwersacji
                                  </div>
                                  
                                  <div style={{ padding: '20px' }}>
                                    <div style={{
                                      fontSize: '14px',
                                      fontWeight: 500,
                                      color: 'rgba(255, 255, 255, 0.7)',
                                      marginBottom: '8px'
                                    }}>
                                      Nazwa:
                                    </div>
                                    
                                    <input
                                      type="text"
                                      value={newChatName}
                                      onChange={(e) => setNewChatName(e.target.value)}
                                      autoFocus
                                      className="input-focus"
                                      style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        fontSize: '14px',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        borderRadius: '8px',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        color: 'white',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                      }}
                                    />
                                  </div>
                                  
                                  <div style={{
                                    padding: '16px 20px',
                                    borderTop: '1px solid rgba(163, 205, 57, 0.2)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}>
                                    <button
                                      onClick={() => setShowRenameInput(false)}
                                      style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        backgroundColor: 'transparent',
                                        color: 'rgba(255, 255, 255, 0.7)',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                      }}
                                    >
                                      Anuluj
                                    </button>
                                    
                                    <button
                                      onClick={handleRenameChat}
                                      className="button-hover"
                                      style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #a3cd39, #8bc34a)',
                                        color: '#1a1a1a',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                      }}
                                      disabled={!newChatName.trim()}
                                    >
                                      Zapisz
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        
                        {/* Przycisk usuwania */}
                        <button
                          onClick={(e) => handleDeleteChat(chat.id, e)}
                          style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: 'rgba(255, 255, 255, 0.5)',
                            padding: '4px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            opacity: 0.7,
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginLeft: '4px'
                          }}
                          title="Usuń"
                          onMouseOver={(e) => {
                            e.currentTarget.style.opacity = '1';
                            e.currentTarget.style.color = '#ef4444';
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.opacity = '0.7';
                            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        
        {/* Główny obszar czatu */}
        <div className="chat-container" style={{ 
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          height: '100vh',
          position: 'relative',
          zIndex: 2
        }}>
          {/* Nagłówek */}
          <header style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            backgroundColor: 'rgba(26, 26, 26, 0.9)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(163, 205, 57, 0.2)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center'
            }}>
              {/* Przycisk przełączania sidebara */}
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                style={{
                  marginRight: '16px',
                  padding: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(163, 205, 57, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(163, 205, 57, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
                title={showSidebar ? "Ukryj historię" : "Pokaż historię"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255, 255, 255, 0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </button>
              
              <div style={{ 
                position: 'relative', 
                width: '36px', 
                height: '36px', 
                marginRight: '12px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(163, 205, 57, 0.2), transparent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Image 
                  src="/MarsoftAI.png" 
                  alt="MarsoftAI Logo" 
                  width={28}
                  height={28}
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </div>
              <h1 style={{ 
                fontSize: '24px', 
                fontWeight: 700, 
                color: 'white', 
                margin: 0,
                background: 'linear-gradient(135deg, #a3cd39, #8bc34a)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                MarsoftAI
              </h1>
            </div>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px'
            }}>
              {/* Przycisk włączania/wyłączania wyszukiwania */}
              <button
                onClick={toggleWebSearch}
                title={webSearchEnabled ? "Wyłącz wyszukiwanie w internecie" : "Włącz wyszukiwanie w internecie"}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 12px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: webSearchEnabled ? 'rgba(163, 205, 57, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: webSearchEnabled ? '1px solid rgba(163, 205, 57, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  gap: '6px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = webSearchEnabled ? 'rgba(163, 205, 57, 0.6)' : 'rgba(163, 205, 57, 0.3)';
                  e.currentTarget.style.backgroundColor = webSearchEnabled ? 'rgba(163, 205, 57, 0.2)' : 'rgba(163, 205, 57, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = webSearchEnabled ? 'rgba(163, 205, 57, 0.4)' : 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.backgroundColor = webSearchEnabled ? 'rgba(163, 205, 57, 0.15)' : 'rgba(255, 255, 255, 0.05)';
                }}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke={webSearchEnabled ? '#a3cd39' : 'rgba(255, 255, 255, 0.6)'} 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  {!webSearchEnabled && <line x1="4" y1="18" x2="18" y2="4" stroke="#ef4444" strokeWidth="2"></line>}
                </svg>
                <span style={{ 
                  fontSize: '14px', 
                  fontWeight: '500',
                  color: webSearchEnabled ? '#a3cd39' : 'rgba(255, 255, 255, 0.7)',
                  whiteSpace: 'nowrap'
                }}>
                  {webSearchEnabled ? 'Wyszukiwanie ON' : 'Wyszukiwanie OFF'}
                </span>
              </button>

              {/* Przycisk włączania/wyłączania rozszerzonego myślenia */}
              <button
                onClick={toggleExtendedReasoning}
                title={extendedReasoningEnabled ? "Wyłącz rozszerzone myślenie" : "Włącz rozszerzone myślenie"}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 12px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: extendedReasoningEnabled ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: extendedReasoningEnabled ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  gap: '6px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = extendedReasoningEnabled ? 'rgba(168, 85, 247, 0.6)' : 'rgba(168, 85, 247, 0.3)';
                  e.currentTarget.style.backgroundColor = extendedReasoningEnabled ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = extendedReasoningEnabled ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.backgroundColor = extendedReasoningEnabled ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.05)';
                }}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke={extendedReasoningEnabled ? '#a855f7' : 'rgba(255, 255, 255, 0.6)'} 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M12 2L2 12l10 10 10-10L12 2z"/>
                  <path d="M12 6v6l4 4"/>
                </svg>
                <span style={{ 
                  fontSize: '14px', 
                  fontWeight: '500',
                  color: extendedReasoningEnabled ? '#a855f7' : 'rgba(255, 255, 255, 0.7)',
                  whiteSpace: 'nowrap'
                }}>
                  Myślenie
                </span>
              </button>

              {/* Biblioteka Wiedzy */}
              <button
                onClick={() => setShowLibrary(true)}
                title="Biblioteka Wiedzy"
                style={{
                  display: 'flex',
                  alignItems: 'center', 
                  justifyContent: 'center',
                  padding: '0 12px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  gap: '6px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(163, 205, 57, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(163, 205, 57, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="rgba(255, 255, 255, 0.6)" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                <span style={{ 
                  fontSize: '14px', 
                  fontWeight: '500',
                  color: 'rgba(255, 255, 255, 0.7)',
                  whiteSpace: 'nowrap'
                }}>
                  Biblioteka
                </span>
              </button>

              {/* BEZPOŚREDNIE INPUTY */}
              <input
                id="pdf-upload-direct"
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  if (file.type !== 'application/pdf') {
                    alert('Proszę wybrać plik PDF.');
                    return;
                  }
                  
                  try {
                    console.log('📄 Wczytuję PDF:', file.name);
                    
                    const formData = new FormData();
                    formData.append('file', file);
                    
                    const response = await fetch('/api/process-pdf', {
                      method: 'POST',
                      body: formData
                    });
                    
                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(errorData.error || 'Błąd podczas przetwarzania pliku');
                    }
                    
                    const data = await response.json();
                    console.log('✅ PDF przetworzony:', data);
                    
                    if (typeof handlePdfContent === 'function') {
                      handlePdfContent(data.text, data.metadata);
                    } else {
                      console.log('📄 Treść PDF:', data.text.substring(0, 200) + '...');
                      alert('PDF wczytany pomyślnie! (sprawdź konsolę)');
                    }
                    
                    (e.target as HTMLInputElement).value = '';
                  } catch (err) {
                    console.error('❌ Błąd PDF:', err);
                    const errorMessage = err instanceof Error ? err.message : 'Nieznany błąd';
                    alert(`Błąd podczas wczytywania PDF: ${errorMessage}`);
                  }
                }}
              />

              <input
                id="excel-upload-direct"
                type="file"
                accept=".xlsx,.xls,.xlsm,.xlsb,.csv"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  try {
                    console.log('📊 Wczytuję Excel:', file.name);
                    
                    const XLSX = await import('xlsx');
                    
                    const arrayBuffer = await file.arrayBuffer();
                    const workbook = XLSX.read(arrayBuffer, {
                      type: 'array',
                      cellDates: true,
                      cellStyles: true,
                      cellNF: true,
                    });

                    const sheetNames = workbook.SheetNames;
                    const allSheetsData: Record<string, any> = {};
                    let allSheetsText = '';
                    let totalRows = 0;
                    let totalColumns = 0;
                    
                    sheetNames.forEach(sheetName => {
                      const worksheet = workbook.Sheets[sheetName];
                      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                      
                      allSheetsData[sheetName] = jsonData;
                      
                      if (jsonData.length > 0) {
                        totalRows += jsonData.length;
                        for (const row of jsonData) {
                          if (Array.isArray(row) && row.length > totalColumns) {
                            totalColumns = row.length;
                          }
                        }
                      }
                      
                      allSheetsText += `# Arkusz: ${sheetName}\n\n`;
                      const csvData = XLSX.utils.sheet_to_csv(worksheet);
                      allSheetsText += csvData + '\n\n';
                    });

                    const metadata = {
                      title: file.name,
                      size: file.size,
                      type: file.type,
                      sheetNames: sheetNames,
                      sheetCount: sheetNames.length,
                      totalRows: totalRows,
                      totalColumns: totalColumns,
                      lastModified: new Date(file.lastModified).toISOString(),
                      data: allSheetsData
                    };

                    console.log('✅ Excel przetworzony:', metadata);
                    
                    if (typeof handleExcelContent === 'function') {
                      handleExcelContent(allSheetsText, metadata);
                    } else {
                      console.log('📊 Treść Excel:', allSheetsText.substring(0, 200) + '...');
                      alert('Excel wczytany pomyślnie! (sprawdź konsolę)');
                    }
                    
                    (e.target as HTMLInputElement).value = '';
                  } catch (err) {
                    console.error('❌ Błąd Excel:', err);
                    const errorMessage = err instanceof Error ? err.message : 'Nieznany błąd';
                    alert(`Błąd podczas wczytywania Excel: ${errorMessage}`);
                  }
                }}
              />

              {/* Wgraj PDF */}
              <button
                onClick={() => {
                  console.log('🖱️ Kliknięto przycisk PDF');
                  const input = document.getElementById('pdf-upload-direct') as HTMLInputElement;
                  if (input) {
                    console.log('✅ Znaleziono input PDF, klikam...');
                    input.click();
                  } else {
                    console.error('❌ Nie znaleziono input PDF');
                  }
                }}
                title="Wgraj PDF"
                className="button-hover"
                style={{
                  display: 'flex',
                  alignItems: 'center', 
                  justifyContent: 'center',
                  padding: '0 12px',
                  height: '38px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #a3cd39 0%, #8bc34a 100%)',
                  border: 'none',
                  cursor: 'pointer',
                  gap: '6px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 4px 15px rgba(163, 205, 57, 0.3)'
                }}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="#1a1a1a" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="12" y1="18" x2="12" y2="12"></line>
                  <line x1="9" y1="15" x2="15" y2="15"></line>
                </svg>
                <span style={{ 
                  fontSize: '14px', 
                  fontWeight: '600',
                  color: '#1a1a1a',
                  whiteSpace: 'nowrap'
                }}>
                  PDF
                </span>
              </button>

              {/* Wgraj XLS */}
              <button
                onClick={() => {
                  console.log('🖱️ Kliknięto przycisk Excel');
                  const input = document.getElementById('excel-upload-direct') as HTMLInputElement;
                  if (input) {
                    console.log('✅ Znaleziono input Excel, klikam...');
                    input.click();
                  } else {
                    console.error('❌ Nie znaleziono input Excel');
                  }
                }}
                title="Wgraj XLS"
                style={{
                  display: 'flex',
                  alignItems: 'center', 
                  justifyContent: 'center',
                  padding: '0 12px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  gap: '6px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(163, 205, 57, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(163, 205, 57, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="rgba(255, 255, 255, 0.6)" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <span style={{ 
                  fontSize: '14px', 
                  fontWeight: '500',
                  color: 'rgba(255, 255, 255, 0.7)',
                  whiteSpace: 'nowrap'
                }}>
                  XLS
                </span>
              </button>
                       
              {/* Przycisk użytkownika - CONTAINER */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('User button clicked, current state:', showUserMenu);
                    setShowUserMenu(!showUserMenu);
                  }} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    height: '38px',
                    padding: '0 10px',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backdropFilter: 'blur(10px)',
                    position: 'relative',
                    zIndex: 1,
                    pointerEvents: 'auto'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(163, 205, 57, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(163, 205, 57, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  <div style={{ 
                    width: '28px', 
                    height: '28px', 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #a3cd39, #8bc34a)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#1a1a1a',
                    fontWeight: 600,
                    fontSize: '14px',
                    boxShadow: '0 2px 8px rgba(163, 205, 57, 0.3)'
                  }}>
                    {session?.user?.name?.charAt(0).toUpperCase() || 
                     session?.user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span style={{ 
                    color: 'rgba(255, 255, 255, 0.8)', 
                    fontWeight: 500,
                    fontSize: '14px'
                  }}>
                    {session?.user?.name || 
                     session?.user?.email?.split('@')[0] || 
                     'Użytkownik'}
                    {session?.user?.role === 'admin' && (
                      <span style={{ 
                        marginLeft: '4px',
                        fontSize: '12px',
                        color: '#a3cd39',
                        fontWeight: 600
                      }}>
                        (Admin)
                      </span>
                    )}
                  </span>
                </button>
                
                {/* MENU DROPDOWN */}
                {showUserMenu && (
                  <>
                    {/* Overlay do zamykania menu - BARDZO WYSOKI Z-INDEX */}
                    <div 
                      style={{
                        position: 'fixed', // FIXED zamiast absolute!
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 2147483647, // BARDZO wysoki!
                        background: 'rgba(0, 0, 0, 0.1)', // Lekkie przyciemnienie żeby zobaczyć czy działa
                        pointerEvents: 'auto'
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔥 OVERLAY CLICKED - Closing menu');
                        setShowUserMenu(false);
                      }}
                    />
                    
                    {/* Menu dropdown - RENDEROWANE JAKO PORTAL W BODY */}
                    <div 
                      style={{
                        position: 'fixed', // FIXED zamiast absolute!
                        top: '60px', // Stała pozycja od góry
                        right: '20px', // Stała pozycja od prawej
                        backgroundColor: 'rgba(26, 26, 26, 0.98)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
                        borderRadius: '12px',
                        width: '220px',
                        zIndex: 999999, // NAJWYŻSZY MOŻLIWY Z-INDEX!
                        border: '1px solid rgba(163, 205, 57, 0.3)',
                        overflow: 'visible', // VISIBLE zamiast hidden!
                        pointerEvents: 'auto',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        // Dodane dla pewności:
                        isolation: 'isolate', // Tworzy nowy stacking context
                        transform: 'translateZ(0)', // Force hardware acceleration
                      }}
                    >
                      {/* Sekcja informacji o użytkowniku */}
                      <div style={{
                        padding: '16px',
                        borderBottom: '1px solid rgba(163, 205, 57, 0.2)',
                        fontSize: '14px',
                        pointerEvents: 'auto'
                      }}>
                        <div style={{ fontWeight: 600, color: 'white' }}>
                          {session?.user?.name || 'Użytkownik'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '2px' }}>
                          {session?.user?.email || 'email@example.com'}
                        </div>
                      </div>
                      
                      {/* Przycisk wylogowania */}
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          
                          console.log('🔥 LOGOUT BUTTON CLICKED!');
                          console.log('Event target:', e.target);
                          console.log('Current target:', e.currentTarget);
                          
                          // Zamknij menu od razu
                          setShowUserMenu(false);
                          
                          try {
                            console.log('🔄 Calling signOut with session:', session);
                            
                            // NOWA METODA - próba różnych sposobów wylogowania
                            const result = await signOut({ 
                              callbackUrl: '/login',
                              redirect: false // Nie przekierowuj automatycznie
                            });
                            
                            console.log('✅ SignOut result:', result);
                            
                            // Ręczne przekierowanie
                            window.location.href = '/login';
                            
                          } catch (error) {
                            console.error('❌ Błąd podczas wylogowania:', error);
                            
                            // MEGA FALLBACK
                            try {
                              // Wyczyść wszystko
                              if (typeof window !== 'undefined') {
                                // Wyczyść localStorage i sessionStorage
                                localStorage.clear();
                                sessionStorage.clear();
                                
                                // Wyczyść wszystkie cookies
                                document.cookie.split(";").forEach((c) => {
                                  document.cookie = c
                                    .replace(/^ +/, "")
                                    .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                                });
                                
                                // Wyczyść też cookies next-auth specjalnie
                                const authCookies = ['next-auth.session-token', 'next-auth.callback-url', 'next-auth.csrf-token'];
                                authCookies.forEach(cookieName => {
                                  document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                                });
                              }
                              
                              console.log('🔄 Manual cleanup done, redirecting...');
                              window.location.replace('/login'); // replace zamiast href
                              
                            } catch (fallbackError) {
                              console.error('❌ Fallback failed, reloading page:', fallbackError);
                              window.location.reload();
                            }
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          width: '100%',
                          padding: '14px 16px',
                          fontSize: '14px',
                          color: '#ef4444',
                          backgroundColor: 'transparent',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          gap: '10px',
                          border: 'none',
                          outline: 'none',
                          textAlign: 'left',
                          pointerEvents: 'auto', // WAŻNE!
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          position: 'relative',
                          zIndex: 1000000, // JESZCZE WYŻSZY!
                          // Dodane:
                          touchAction: 'manipulation', // Dla mobile
                          WebkitTapHighlightColor: 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          console.log('🖱️ Mouse enter logout button');
                          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                          e.currentTarget.style.color = '#ff5555';
                        }}
                        onMouseLeave={(e) => {
                          console.log('🖱️ Mouse leave logout button');
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#ef4444';
                        }}
                        onMouseDown={(e) => {
                          console.log('🖱️ Mouse down on logout button');
                        }}
                        onMouseUp={(e) => {
                          console.log('🖱️ Mouse up on logout button');
                        }}
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          style={{ 
                            flexShrink: 0,
                            pointerEvents: 'none' // SVG nie blokuje kliknięć
                          }}
                        >
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                          <polyline points="16 17 21 12 16 7"></polyline>
                          <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        <span style={{ 
                          flexGrow: 1,
                          pointerEvents: 'none' // Span nie blokuje kliknięć
                        }}>
                          Wyloguj się
                        </span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>
          
          
          {/* Obszar wiadomości */}
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '20px',
            background: 'rgba(0, 0, 0, 0.2)'
          }}>
            {/* Status wyszukiwania */}
            <div style={{
              backgroundColor: webSearchEnabled ? 'rgba(163, 205, 57, 0.1)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${webSearchEnabled ? 'rgba(163, 205, 57, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '8px',
              padding: '8px 12px',
              margin: '0 0 16px 0',
              fontSize: '12px',
              textAlign: 'center',
              color: webSearchEnabled ? '#a3cd39' : 'rgba(255, 255, 255, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              backdropFilter: 'blur(10px)'
            }}>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                {!webSearchEnabled && <line x1="4" y1="18" x2="18" y2="4" stroke="currentColor" strokeWidth="2"></line>}
              </svg>
              <span>
                {webSearchEnabled 
                  ? 'Wyszukiwanie w internecie włączone. Bot może korzystać z aktualnych danych z sieci.'
                  : 'Wyszukiwanie w internecie wyłączone. Bot korzysta tylko z dostępnych dokumentów i własnej wiedzy.'}
              </span>
            </div>
            
            {/* Banner aktywnych dokumentów */}
            <ActiveDocumentsBanner
              documentIds={activeDocumentIds}
              onClearDocuments={() => setActiveDocumentIds([])}
              onChangeDocuments={() => setShowLibrary(true)}
            />
            
            {messages.map((message, index) => (
              <div 
                key={message.id} 
                className="message-item"
                style={{
                  display: 'flex',
                  justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: '20px',
                  animationDelay: `${index * 0.1}s`
                }}
              >
                {message.sender === 'bot' && (
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    marginRight: '12px',
                    position: 'relative',
                    background: 'radial-gradient(circle, rgba(163, 205, 57, 0.2), transparent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid rgba(163, 205, 57, 0.3)'
                  }}>
                    <Image 
                      src="/MarsoftAI.png" 
                      alt="MarsoftAI" 
                      width={32}
                      height={32}
                      style={{ objectFit: 'contain' }}
                    />
                  </div>
                )}
                
                <div style={{
                  maxWidth: '75%',
                  padding: '16px 20px',
                  borderRadius: '16px',
                  backgroundColor: message.sender === 'user' 
                    ? 'linear-gradient(135deg, #a3cd39 0%, #8bc34a 100%)' 
                    : 'rgba(26, 26, 26, 0.8)',
                  color: message.sender === 'user' ? '#1a1a1a' : 'rgba(255, 255, 255, 0.9)',
                  boxShadow: message.sender === 'user' 
                    ? '0 8px 25px rgba(163, 205, 57, 0.3)' 
                    : '0 8px 25px rgba(0, 0, 0, 0.3)',
                  border: message.sender === 'bot' ? '1px solid rgba(163, 205, 57, 0.2)' : 'none',
                  backdropFilter: 'blur(20px)',
                  background: message.sender === 'user' 
                    ? 'linear-gradient(135deg, #a3cd39 0%, #8bc34a 100%)' 
                    : 'rgba(26, 26, 26, 0.9)'
                }}>
                  {message.sender === 'bot' ? (
                    <div className="markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.text}
                      </ReactMarkdown>
                      {message.reasoning && (
                        <ReasoningDisplay reasoning={message.reasoning} />
                      )}
                    </div>
                  ) : (
                    <div style={{ fontWeight: 500 }}>
                      {message.text}
                    </div>
                  )}
                  
                  {/* PDF Embed */}
                  {message.sender === 'bot' && message.pdfUrl && (
                    <div style={{ marginTop: '12px', width: '100%' }}>
                      <PdfDocumentEmbed 
                        pdfUrl={message.pdfUrl} 
                        title={`Wygenerowany dokument`} 
                        height={400}
                      />
                    </div>
                  )}
                  
                  <div style={{
                    fontSize: '12px',
                    color: message.sender === 'user' 
                      ? 'rgba(26, 26, 26, 0.7)' 
                      : 'rgba(255, 255, 255, 0.5)',
                    textAlign: 'right',
                    marginTop: '8px'
                  }}>
                    {formatMessageTime(message.timestamp)}
                  </div>
                </div>
                
                {message.sender === 'user' && (
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #a3cd39, #8bc34a)',
                    color: '#1a1a1a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: '12px',
                    boxShadow: '0 4px 15px rgba(163, 205, 57, 0.4)',
                    border: '2px solid rgba(163, 205, 57, 0.3)'
                  }}>
                    <span style={{ fontSize: '16px', fontWeight: 600 }}>
                      {session?.user?.name 
                        ? session.user.name.charAt(0).toUpperCase() 
                        : (session?.user?.email?.charAt(0).toUpperCase() || 'U')}
                    </span>
                  </div>
                )}
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  marginRight: '12px',
                  position: 'relative',
                  background: 'radial-gradient(circle, rgba(163, 205, 57, 0.2), transparent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid rgba(163, 205, 57, 0.3)'
                }}>
                  <Image 
                    src="/MarsoftAI.png" 
                    alt="MarsoftAI" 
                    width={32}
                    height={32}
                    style={{ objectFit: 'contain' }}
                  />
                </div>
                <div style={{
                  padding: '16px 20px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(26, 26, 26, 0.9)',
                  border: '1px solid rgba(163, 205, 57, 0.2)',
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
                  backdropFilter: 'blur(20px)'
                }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#a3cd39',
                      animation: 'bounce 1s infinite alternate'
                    }}></div>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#a3cd39',
                      animation: 'bounce 1s infinite alternate',
                      animationDelay: '0.2s'
                    }}></div>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#a3cd39',
                      animation: 'bounce 1s infinite alternate',
                      animationDelay: '0.4s'
                    }}></div>
                    <span style={{ 
                      marginLeft: '8px', 
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '14px' 
                    }}>
                      Myślę...
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Wskaźnik aktywnego dokumentu */}
            {documentInfo && documentChatId === currentChatId && (
              <div 
                style={{
                  margin: '12px 0',
                  padding: '12px 16px',
                  backgroundColor: 'rgba(163, 205, 57, 0.1)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  borderLeft: '4px solid #a3cd39',
                  display: 'flex',
                  alignItems: 'center',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(163, 205, 57, 0.2)'
                }}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  style={{ 
                    width: '18px', 
                    height: '18px', 
                    marginRight: '10px', 
                    color: documentType === 'excel' ? '#a3cd39' : '#a3cd39' 
                  }}
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
                <span>
                  Aktywny dokument: "{documentInfo.title}"
                  {documentType === 'pdf' && documentInfo.pages && ` (${documentInfo.pages} stron)`}
                  {documentType === 'excel' && documentInfo.sheetCount && ` (${documentInfo.sheetCount} arkuszy, ${documentInfo.totalRows} wierszy)`}
                  {documentInfo.size && ` • ${(documentInfo.size / 1024).toFixed(2)} KB`}
                </span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input wiadomości */}
          <div style={{
            backgroundColor: 'rgba(26, 26, 26, 0.9)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(163, 205, 57, 0.2)',
            padding: '20px'
          }}>
            <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Napisz wiadomość..."
                rows={3}
                className="input-focus"
                style={{
                  width: '100%',
                  padding: '16px 60px 16px 20px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  outline: 'none',
                  resize: 'none',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(10px)'
                }}
                disabled={isLoading}
              />
              <button
                type="submit"
                className="button-hover"
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: isLoading || inputValue.trim() === '' 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : 'linear-gradient(135deg, #a3cd39, #8bc34a)',
                  color: isLoading || inputValue.trim() === '' ? 'rgba(255, 255, 255, 0.4)' : '#1a1a1a',
                  borderRadius: '12px',
                  padding: '10px',
                  border: 'none',
                  cursor: isLoading || inputValue.trim() === '' ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isLoading || inputValue.trim() === '' 
                    ? 'none' 
                    : '0 4px 15px rgba(163, 205, 57, 0.4)'
                }}
                disabled={isLoading || inputValue.trim() === ''}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </form>
            
            {/* Disclaimer */}
            <div style={{
              backgroundColor: 'rgba(163, 205, 57, 0.1)',
              border: '1px solid rgba(163, 205, 57, 0.2)',
              borderRadius: '8px',
              padding: '8px 12px',
              marginTop: '12px',
              fontSize: '12px',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(10px)'
            }}>
              <strong>Uwaga:</strong> MarsoftAI służy wyłącznie do celów związanych z pracą nad projektami UE.
              Wszystkie zapytania są monitorowane.
            </div>
          </div>
        </div>
        
        {/* Biblioteka wiedzy panel */}
        {showLibrary && (
          <KnowledgeLibraryPanel
            isOpen={showLibrary}
            onClose={() => setShowLibrary(false)}
            currentChatId={currentChatId}
            selectedDocumentIds={activeDocumentIds}
            onApply={handleDocumentsSelected}
          />
        )}
        
        {/* Dialog zmiany nazwy */}
        {showRenameDialog && chatToRename && (
          <RenameDialog
            isOpen={showRenameDialog}
            currentName={chatToRename.title}
            onClose={() => setShowRenameDialog(false)}
            onRename={handleRenameChat}
          />
        )}
        
        {/* Modal wykrywania */}
        {showDetectionModal && detectionResults && (
          <>
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                zIndex: 1000,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
              onClick={() => setShowDetectionModal(false)}
            />
            <div style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(26, 26, 26, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
              width: '500px',
              maxWidth: '90vw',
              maxHeight: '80vh',
              overflow: 'auto',
              zIndex: 1001,
              padding: '24px',
              border: '1px solid rgba(163, 205, 57, 0.2)'
            }}>
              <h2 style={{ marginTop: 0, color: 'white', fontSize: '20px', fontWeight: 600 }}>Wykryte terminy</h2>
              
              <p style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                Znaleziono <strong style={{ color: '#a3cd39' }}>{detectionResults.totalDetected}</strong> potencjalnych terminów, 
                z czego <strong style={{ color: '#a3cd39' }}>{detectionResults.totalCreated}</strong> zostało dodanych do projektu.
              </p>
              
              <div style={{ marginTop: '20px' }}>
                <h3 style={{ color: '#a3cd39' }}>Projekt</h3>
                <p style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  <strong>{detectionResults.project?.name}</strong><br />
                  {new Date(detectionResults.project?.startDate).toLocaleDateString('pl-PL')} - {new Date(detectionResults.project?.endDate).toLocaleDateString('pl-PL')}
                </p>
              </div>
              
              {detectionResults.createdItems && detectionResults.createdItems.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <h3 style={{ color: '#a3cd39' }}>Dodane pozycje</h3>
                  
                  <div style={{ maxHeight: '300px', overflow: 'auto', marginTop: '12px' }}>
                    {detectionResults.createdItems.map((item: any) => (
                      <div 
                        key={item.id} 
                        style={{ 
                          padding: '12px',
                          borderLeft: `4px solid ${item.type === 'task' ? '#a3cd39' : '#ff9800'}`,
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          marginBottom: '8px',
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{ fontWeight: 600, color: 'white' }}>
                          {item.type === 'task' ? 'Zadanie: ' : 'Kamień milowy: '}
                          {item.name || item.title}
                        </div>
                        <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px' }}>
                          {item.type === 'task' 
                            ? `${new Date(item.startDate).toLocaleDateString('pl-PL')} - ${new Date(item.endDate).toLocaleDateString('pl-PL')}`
                            : `Termin: ${new Date(item.date).toLocaleDateString('pl-PL')}`
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div style={{ 
                marginTop: '24px', 
                display: 'flex', 
                justifyContent: 'space-between',
                borderTop: '1px solid rgba(163, 205, 57, 0.2)',
                paddingTop: '20px'
              }}>
                <button
                  onClick={() => setShowDetectionModal(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Zamknij
                </button>
                
                <button
                  onClick={() => {
                    setShowDetectionModal(false);
                    router.push(`/projects/${detectionResults.project?.id}`);
                  }}
                  className="button-hover"
                  style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #a3cd39, #8bc34a)',
                    color: '#1a1a1a',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  Przejdź do projektu
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}