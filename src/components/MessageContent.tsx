// components/MessageContent.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MessageContentProps {
  content: string;
}

const MessageContent: React.FC<MessageContentProps> = ({ content }) => {
  // Wstępne przetwarzanie tekstu dla poprawy formatowania list
  const preprocessText = (text: string) => {
    // Zastępowanie pojedynczych punktów oddzielonych spacjami na prawidłową listę Markdown
    return text
      // Zamiana punktów z symbolem "•" na listy Markdown
      .replace(/•\s+([^\n•]+)(?=\n|$)/g, '- $1\n')
      // Zamiana numeracji "1." na prawidłowe listy numerowane Markdown
      .replace(/(\d+)\.\s+([^\n]+)(?=\n|$)/g, '$1. $2\n')
      // Dodawanie pustych linii przed i po listach dla lepszego renderowania
      .replace(/\n(- .*)/g, '\n\n$1')
      .replace(/(- .*)\n([^-])/g, '$1\n\n$2');
  };

  const processedContent = preprocessText(content);

  return (
    <div className="message-content">
      <ReactMarkdown
        components={{
          // Dostosowanie renderowania elementów listy
          li: ({ node, ...props }) => (
            <li className="mb-1 pl-1" {...props} />
          ),
          // Dostosowanie renderowania paragrafów
          p: ({ node, ...props }) => (
            <p className="mb-3" {...props} />
          ),
          // Dostosowanie renderowania nagłówków
          h1: ({ node, ...props }) => (
            <h1 className="text-xl font-bold mb-3 mt-4" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-lg font-semibold mb-2 mt-3" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-base font-medium mb-2 mt-3" {...props} />
          ),
          // Dostosowanie renderowania list
          ul: ({ node, ...props }) => (
            <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal pl-5 mb-4 space-y-1" {...props} />
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default MessageContent;