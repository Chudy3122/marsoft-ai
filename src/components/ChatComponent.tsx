'use client';

// src/components/ChatComponent.tsx
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { getOpenAIResponse, analyzePdfWithOpenAI, analyzeExcelWithOpenAI } from '@/lib/openai-service';
import PdfUploadButton from '@/components/PdfUploadButton';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ExcelUploadButton from '@/components/ExcelUploadButton';  // Nowy import
import KnowledgeLibraryButton from '@/components/KnowledgeLibraryButton';
import ActiveDocumentsBanner from '@/components/ActiveDocumentsBanner';
import KnowledgeLibraryPanel from './KnowledgeLibraryPanel';
// Definicja typów
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
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
  const [messages, setMessages] = useState<Message[]>([]);
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
  // Pobieranie historii czatów
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const response = await fetch('/api/chats');
        if (!response.ok) throw new Error('Problem z pobraniem czatów');
        
        const data = await response.json();
        setChats(data.chats);
        
        // Jeśli istnieją czaty i nie jest wybrany żaden, ustaw pierwszy jako aktywny
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
  
  // Załadowanie wiadomości dla wybranego czatu
  useEffect(() => {
    if (currentChatId) {
      const loadMessages = async () => {
        try {
          const response = await fetch(`/api/chats/${currentChatId}/messages`);
          if (!response.ok) throw new Error('Problem z pobraniem wiadomości');
          
          const data = await response.json();
          
          if (data.messages && data.messages.length > 0) {
            // Konwersja wiadomości z API do formatu potrzebnego w komponencie
            const formattedMessages = data.messages.map((msg: any) => ({
              id: msg.id,
              text: msg.content,
              sender: msg.role === 'user' ? 'user' : 'bot',
              timestamp: new Date(msg.createdAt)
            }));
            
            setMessages(formattedMessages);
          } else {
            // Początkowa wiadomość bota dla pustego czatu
            const initialMessage: Message = {
              id: uuidv4(),
              text: "Witaj w MarsoftAI! Jestem asystentem dla projektów UE. Jak mogę Ci pomóc w tworzeniu dokumentacji projektowej?",
              sender: 'bot',
              timestamp: new Date()
            };
            setMessages([initialMessage]);
            
            // Zapisz początkową wiadomość w bazie danych
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
          }
  
          // Dodatkowo załaduj dokument, jeśli istnieje dla tego czatu
          try {
            const docResponse = await fetch(`/api/chats/${currentChatId}/document`);
            if (docResponse.ok) {
              const docData = await docResponse.json();
              
              if (docData.document) {
                console.log("Załadowano dokument z bazy danych:", docData.document.title);
                // Ustaw stany dokumentu z danych z bazy
                setDocumentType(docData.document.fileType);
                setDocumentText(docData.document.content);
                setDocumentMetadata(docData.document.metadata);
                setDocumentInfo(docData.document.metadata);
                setDocumentChatId(currentChatId);
              } else {
                // Jeśli nie ma dokumentu dla tego czatu, wyczyść stany
                setDocumentType(null);
                setDocumentText(null);
                setDocumentMetadata(null);
                setDocumentInfo(null);
                setDocumentChatId(null);
              }
            }
          } catch (docError) {
            console.error("Błąd podczas ładowania dokumentu:", docError);
          }

          try {
            const docsResponse = await fetch(`/api/chats/${currentChatId}/documents`);
            if (docsResponse.ok) {
              const docsData = await docsResponse.json();
              setActiveDocumentIds(docsData.documentIds || []);
            }
          } catch (error) {
            console.error('Błąd podczas pobierania dokumentów czatu:', error);
          }

        } catch (error) {
          console.error('Błąd podczas pobierania wiadomości:', error);
        }
      };
      
      loadMessages();
    } else if (!loadingChats) {
      // Początkowa wiadomość bota dla nowego czatu
      const initialMessage: Message = {
        id: uuidv4(),
        text: "Witaj w MarsoftAI! Jestem asystentem dla projektów UE. Jak mogę Ci pomóc w tworzeniu dokumentacji projektowej?",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages([initialMessage]);
      setActiveDocumentIds([]);
      // Wyczyść stany dokumentu, gdy nie ma aktywnego czatu
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
      
      // Dodanie nowego czatu do listy
      const newChat = {
        id: data.chat.id,
        title: data.chat.title,
        createdAt: data.chat.createdAt,
        updatedAt: data.chat.updatedAt
      };
      
      setChats(prevChats => [newChat, ...prevChats]);
      setCurrentChatId(data.chat.id);
      
      // Resetowanie stanu dla nowego czatu - zaktualizowane
      setDocumentType(null);
      setDocumentText(null);
      setDocumentMetadata(null);
      setDocumentInfo(null);
      setDocumentChatId(null);
      
      // Dodanie początkowej wiadomości do czatu
      const initialMessage: Message = {
        id: uuidv4(),
        text: "Witaj w MarsoftAI! Jestem asystentem dla projektów UE. Jak mogę Ci pomóc w tworzeniu dokumentacji projektowej?",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages([initialMessage]);
      
      // Zapisanie początkowej wiadomości w bazie danych
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

  const handleExcelContent = (content: string, metadata: any) => {
    // Upewnij się, że mamy aktywny czat
    if (!currentChatId) {
      alert("Najpierw wybierz lub utwórz czat przed wgraniem arkusza Excel.");
      return;
    }
    
    // Ustaw stany dla dokumentu
    setDocumentType("excel");
    setDocumentText(content);
    setDocumentMetadata(metadata);
    setDocumentInfo(metadata);
    setDocumentChatId(currentChatId);
    
    // Zapisz dokument Excel w bazie danych
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
      
      // Dodaj nowy dokument do listy aktywnych dokumentów
      if (data.document && data.document.id) {
        const newDocumentId = data.document.id;
        
        // Sprawdź czy dokument jest już na liście
        if (!activeDocumentIds.includes(newDocumentId)) {
          const updatedActiveDocuments = [...activeDocumentIds, newDocumentId];
          setActiveDocumentIds(updatedActiveDocuments);
          
          // Aktualizuj listę aktywnych dokumentów w bazie danych
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
      
      // Dodaj wiadomość o wgranym pliku Excel do czatu
      const excelMessage: Message = {
        id: uuidv4(),
        text: `Wgrano arkusz Excel: "${metadata.title}" (${metadata.sheetCount} arkuszy, ${metadata.totalRows} wierszy). Możesz teraz zadawać pytania dotyczące jego zawartości.`,
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages((prevMessages) => [...prevMessages, excelMessage]);
      
      // Zapisz wiadomość w bazie danych
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputValue.trim() === '' || isLoading) return;
    
    const userInput = inputValue.trim();
    console.log("🔍 Wysyłanie zapytania:", userInput);
    
    // Jeśli nie ma aktywnego czatu, najpierw utwórz nowy
    if (!currentChatId) {
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
        setCurrentChatId(data.chat.id);
        
        // Dodanie nowego czatu do listy
        const newChat = {
          id: data.chat.id,
          title: data.chat.title,
          createdAt: data.chat.createdAt,
          updatedAt: data.chat.updatedAt
        };
        
        setChats(prevChats => [newChat, ...prevChats]);
      } catch (error) {
        console.error('Błąd podczas tworzenia czatu:', error);
        return;
      }
    }
    
    // Dodaj wiadomość użytkownika lokalnie
    const userMessage: Message = {
      id: uuidv4(),
      text: userInput,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    // Zapisz wiadomość użytkownika w bazie danych
    try {
      await fetch(`/api/chats/${currentChatId}/messages`, {
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
    
    try {
      console.log("🔍 Próba pobrania odpowiedzi z API OpenAI...");
      
      // Użycie funkcji pomocniczej do obsługi odpowiedzi
      response = await getAIResponseWithFallback(userInput);
      console.log("🔍 Otrzymano odpowiedź:", response);
      
      // Zapisz odpowiedź asystenta w bazie danych
      await fetch(`/api/chats/${currentChatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: response,
          role: 'assistant'
        }),
      });
      
      // Zaktualizuj tytuł czatu na podstawie pierwszej wiadomości użytkownika (jeśli to nowy czat)
      if (messages.length <= 1) {
        const title = userInput.length > 30 ? `${userInput.substring(0, 27)}...` : userInput;
        
        await fetch(`/api/chats/${currentChatId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: title
          }),
        });
        
        // Aktualizuj tytuł w lokalnej liście czatów
        setChats(prevChats => prevChats.map(chat => 
          chat.id === currentChatId ? {...chat, title: title} : chat
        ));
      }
      
    } catch (error) {
      console.error('🔍 Błąd podczas przetwarzania wiadomości:', error);
      response = "Przepraszam, wystąpił błąd podczas przetwarzania Twojego zapytania. Spróbuj ponownie później.";
    } finally {
      // Dodaj odpowiedź bota
      const botMessage: Message = {
        id: uuidv4(),
        text: response,
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages((prevMessages) => [...prevMessages, botMessage]);
      setIsLoading(false);
    }
  };

  // Funkcja pomocnicza do obsługi odpowiedzi z OpenAI
  const getAIResponseWithFallback = async (prompt: string): Promise<string> => {
    try {
      console.log("Aktywne dokumenty:", activeDocumentIds);
      
      // Używamy zawsze aktywnych dokumentów jako głównego źródła informacji
      if (activeDocumentIds.length > 0) {
        console.log(`Używam ${activeDocumentIds.length} aktywnych dokumentów do zapytania AI`);
        return await getOpenAIResponse(prompt, activeDocumentIds);
      } 
      // Jeśli nie ma aktywnych dokumentów, ale jest pojedynczy dokument wczytany
      else if (documentText && documentMetadata && documentChatId === currentChatId) {
        console.log("Używam pojedynczego dokumentu jako fallback:", documentType, documentMetadata.title);
        
        // Obsługa PDF/Excel bez aktualizacji activeDocumentIds (dla wstecznej kompatybilności)
        if (documentType === 'pdf') {
          return await analyzePdfWithOpenAI(documentText, documentMetadata, prompt);
        } else if (documentType === 'excel') {
          return await analyzeExcelWithOpenAI(documentText, documentMetadata, prompt);
        }
      }
      
      // Standardowe zapytanie bez dokumentów
      console.log("Używam standardowego zapytania bez dokumentów");
      return await getOpenAIResponse(prompt);
    } catch (error) {
      console.error("Błąd w getOpenAIResponse:", error);
      return "Przepraszam, wystąpił problem z połączeniem. Spróbuj ponownie za chwilę.";
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
    // Upewnij się, że mamy aktywny czat
    if (!currentChatId) {
      alert("Najpierw wybierz lub utwórz czat przed wgraniem dokumentu PDF.");
      return;
    }
    
    // Ustaw stany dla dokumentu
    setDocumentType("pdf");
    setDocumentText(content);
    setDocumentMetadata(metadata);
    setDocumentInfo(metadata);
    setDocumentChatId(currentChatId);
    
    // Zapisz dokument PDF w bazie danych
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
      
      // Dodaj nowy dokument do listy aktywnych dokumentów
      if (data.document && data.document.id) {
        const newDocumentId = data.document.id;
        
        // Sprawdź czy dokument jest już na liście
        if (!activeDocumentIds.includes(newDocumentId)) {
          const updatedActiveDocuments = [...activeDocumentIds, newDocumentId];
          setActiveDocumentIds(updatedActiveDocuments);
          
          // Aktualizuj listę aktywnych dokumentów w bazie danych
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
      
      // Dodaj wiadomość o wgranym PDF do czatu
      const pdfMessage: Message = {
        id: uuidv4(),
        text: `Wgrano dokument PDF: "${metadata.title}" (${metadata.pages} stron). Możesz teraz zadawać pytania dotyczące jego zawartości.`,
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages((prevMessages) => [...prevMessages, pdfMessage]);
      
      // Zapisz wiadomość w bazie danych
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
    e.stopPropagation(); // Zatrzymanie propagacji, aby nie wybierać czatu podczas usuwania
    
    if (!confirm('Czy na pewno chcesz usunąć tę konwersację?')) {
      return;
    }
    
    try {
      // API powinno usuwać dokument kaskadowo dzięki relacji w bazie danych
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Problem z usunięciem czatu');
      
      // Usuń czat z lokalnej listy
      setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
      
      // Jeśli usunięto aktywny czat, wybierz pierwszy dostępny lub ustaw null
      if (chatId === currentChatId) {
        const remainingChats = chats.filter(chat => chat.id !== chatId);
        if (remainingChats.length > 0) {
          setCurrentChatId(remainingChats[0].id);
        } else {
          setCurrentChatId(null);
          setMessages([]);
          
          // Wyczyść stany dokumentu
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
    <div style={{ 
      display: 'flex', 
      height: '100vh'
    }}>
      {/* Sidebar z historią czatów */}
      {showSidebar && (
        <div style={{ 
          width: '260px', 
          height: '100%', 
          borderRight: '1px solid #e5e7eb', 
          backgroundColor: 'white',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Przycisk nowego czatu */}
          <div style={{ padding: '16px' }}>
            <button
              onClick={handleNewChat}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#f9f9f9',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer'
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
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Historia czatów
            </div>
            
            {loadingChats ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                Ładowanie...
              </div>
            ) : chats.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
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
                        padding: '8px 12px',
                        borderRadius: '8px',
                        marginBottom: '4px',
                        cursor: 'pointer',
                        backgroundColor: currentChatId === chat.id ? 'rgba(163, 205, 57, 0.1)' : 'transparent',
                        border: currentChatId === chat.id ? '1px solid rgba(163, 205, 57, 0.3)' : '1px solid transparent',
                        position: 'relative'
                      }}
                    >
                      <div style={{ 
                        marginRight: '10px', 
                        color: '#6b7280',
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
                          color: '#374151',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {chat.title}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#6b7280'
                        }}>
                          {formatDate(chat.updatedAt)}
                        </div>
                      </div>
                      {/* Przycisk usuwania */}
                      <button
                        onClick={(e) => handleDeleteChat(chat.id, e)}
                        style={{
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#9ca3af',
                          padding: '4px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          opacity: 0.7,
                          transition: 'opacity 0.2s'
                        }}
                        title="Usuń"
                        onMouseOver={(e) => {
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.color = '#ef4444';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.opacity = '0.7';
                          e.currentTarget.style.color = '#9ca3af';
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        height: '100vh'
      }}>
        {/* Nagłówek */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: 'white'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center'
          }}>
            {/* Przycisk przełączania sidebara */}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              style={{
                marginRight: '12px',
                padding: '5px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={showSidebar ? "Ukryj historię" : "Pokaż historię"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            
            <div style={{ position: 'relative', width: '40px', height: '40px', marginRight: '12px' }}>
              <Image 
                src="/MarsoftAI.png" 
                alt="MarsoftAI Logo" 
                fill
                style={{ objectFit: 'contain' }}
                priority
              />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#333d3d' }}>MarsoftAI</h1>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px'
          }}>
             {/* Przycisk biblioteki wiedzy */}
            <KnowledgeLibraryButton
              currentChatId={currentChatId}
              activeDocumentIds={activeDocumentIds}
              onDocumentsSelected={handleDocumentsSelected}
            />
            {/* Przycisk wgrywania PDF */}
            <PdfUploadButton onPdfContent={handlePdfContent} />

            {/* Przycisk wgrywania Excel */}
            <ExcelUploadButton onExcelContent={handleExcelContent} />
            
            {/* Informacja o zalogowanym użytkowniku */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  backgroundColor: '#a3cd39', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 500,
                  fontSize: '14px'
                }}>
                  {session?.user?.name 
                    ? session.user.name.charAt(0).toUpperCase() 
                    : (session?.user?.email?.charAt(0).toUpperCase() || 'U')}
                </div>
                <span style={{ color: '#4b5563', fontWeight: 500 }}>
                  {session?.user?.name || session?.user?.email || 'Użytkownik'}
                </span>
              </button>
              
              {showUserMenu && (
                <div style={{
                  position: 'absolute',
                  top: '45px',
                  right: '0',
                  backgroundColor: 'white',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  borderRadius: '6px',
                  width: '160px',
                  zIndex: 10
                }}>
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 16px',
                      fontSize: '14px',
                      color: '#4b5563',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    Wyloguj się
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        
        {/* Obszar wiadomości */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px',
          backgroundColor: '#f9f9f9'
        }}>
          {/* Banner aktywnych dokumentów */}
          <ActiveDocumentsBanner
            documentIds={activeDocumentIds}
            onClearDocuments={() => setActiveDocumentIds([])}
            onChangeDocuments={() => setShowLibrary(true)}
          />
          {messages.map((message) => (
            <div 
              key={message.id} 
              style={{
                display: 'flex',
                justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '16px'
              }}
            >
              {message.sender === 'bot' && (
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  marginRight: '8px',
                  position: 'relative'
                }}>
                  <Image 
                    src="/MarsoftAI.png" 
                    alt="MarsoftAI" 
                    fill
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              )}
              
              <div style={{
                maxWidth: '80%',
                padding: '12px',
                borderRadius: '16px',
                backgroundColor: message.sender === 'user' ? '#a3cd39' : 'white',
                color: message.sender === 'user' ? 'white' : '#333333',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                border: message.sender === 'bot' ? '1px solid #e5e7eb' : 'none'
              }}>
                <div>{message.text}</div>
                <div style={{
                  fontSize: '12px',
                  color: message.sender === 'user' ? 'rgba(255, 255, 255, 0.8)' : '#9ca3af',
                  textAlign: 'right',
                  marginTop: '4px'
                }}>
                  {formatMessageTime(message.timestamp)}
                </div>
              </div>
              
              {message.sender === 'user' && (
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#a3cd39',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: '8px'
                }}>
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>
                    {session?.user?.name 
                      ? session.user.name.charAt(0).toUpperCase() 
                      : (session?.user?.email?.charAt(0).toUpperCase() || 'U')}
                  </span>
                </div>
              )}
            </div>
          ))}
          {showLibrary && (
            <KnowledgeLibraryPanel
              isOpen={showLibrary}
              onClose={() => setShowLibrary(false)}
              currentChatId={currentChatId}
              selectedDocumentIds={activeDocumentIds}
              onApply={handleDocumentsSelected}
            />
          )}
          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                overflow: 'hidden',
                marginRight: '8px',
                position: 'relative'
              }}>
                <Image 
                  src="/MarsoftAI.png" 
                  alt="MarsoftAI" 
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <div style={{
                padding: '12px',
                borderRadius: '16px',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#9ca3af',
                    animation: 'bounce 1s infinite alternate'
                  }}></div>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#9ca3af',
                    animation: 'bounce 1s infinite alternate',
                    animationDelay: '0.2s'
                  }}></div>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#9ca3af',
                    animation: 'bounce 1s infinite alternate',
                    animationDelay: '0.4s'
                  }}></div>
                </div>
              </div>
            </div>
          )}
          
          {/* Wskaźnik, gdy dokument jest załadowany */}
          {documentInfo && documentChatId === currentChatId && (
            <div 
              style={{
                margin: '8px 0',
                padding: '8px 12px',
                backgroundColor: 'rgba(163, 205, 57, 0.1)',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#4b5563',
                borderLeft: '3px solid #a3cd39',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                style={{ 
                  width: '16px', 
                  height: '16px', 
                  marginRight: '8px', 
                  color: documentType === 'excel' ? '#1D6F42' : '#E44D26' 
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
                {documentInfo.size && ` (${(documentInfo.size / 1024).toFixed(2)} KB)`}
              </span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input wiadomości */}
        <div style={{
          borderTop: '1px solid #e5e7eb',
          backgroundColor: 'white',
          padding: '16px'
        }}>
          <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
            <input
              value={inputValue}
              onChange={handleInputChange}
              placeholder="Napisz wiadomość..."
              style={{
                width: '100%',
                padding: '12px 48px 12px 16px',
                borderRadius: '12px',
                border: '1px solid #d1d5db',
                outline: 'none'
              }}
              disabled={isLoading}
            />
            <button
              type="submit"
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: '#a3cd39',
                color: 'white',
                borderRadius: '8px',
                padding: '8px',
                border: 'none',
                cursor: 'pointer',
                opacity: isLoading || inputValue.trim() === '' ? 0.5 : 1
              }}
              disabled={isLoading || inputValue.trim() === ''}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </form>
          <div style={{
            
          
          }}>
            
          </div>
        </div>
        <div style={{
          backgroundColor: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '4px',
          padding: '5px',
          margin: '10px 0',
          fontSize: '12px',
          textAlign: 'center',
          color: '#0369a1'
        }}>
          <strong>Uwaga:</strong> MarsoftAI służy wyłącznie do celów związanych z pracą nad projektami UE.
          Wszystkie zapytania są monitorowane.
        </div>
        <style jsx global>{`
          @keyframes bounce {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-4px);
            }
          }
        `}</style>
      </div>
    </div>
  );
}