// src/components/ReasoningDisplay.tsx
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ReasoningStep {
  id: string;
  title: string;
  content: string;
  type: 'analysis' | 'planning' | 'execution' | 'verification';
}

interface ReasoningDisplayProps {
  reasoning: {
    steps: ReasoningStep[];
    finalAnswer: string;
  };
}

const ReasoningDisplay: React.FC<ReasoningDisplayProps> = ({ reasoning }) => {
  const [expandedSteps, setExpandedSteps] = useState<string[]>([]);
  const [showAllSteps, setShowAllSteps] = useState(false);

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => 
      prev.includes(stepId) 
        ? prev.filter(id => id !== stepId)
        : [...prev, stepId]
    );
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'analysis':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11H1v3h8v3l3-3.5L9 11z"/>
            <path d="M22 12h-6"/>
          </svg>
        );
      case 'planning':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        );
      case 'execution':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 12l10 10 10-10L12 2z"/>
            <path d="M12 6v6l4 4"/>
          </svg>
        );
      case 'verification':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      backgroundColor: '#fafafa',
      marginTop: '12px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div 
        onClick={() => setShowAllSteps(!showAllSteps)}
        style={{
          padding: '12px 16px',
          backgroundColor: '#f3f4f6',
          borderBottom: '1px solid #e5e7eb',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 12l10 10 10-10L12 2z"/>
            <path d="M12 6v6l4 4"/>
          </svg>
          <span style={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151'
          }}>
            Proces myślowy ({reasoning.steps.length} kroków)
          </span>
        </div>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="#6b7280" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          style={{
            transform: showAllSteps ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {/* Steps */}
      {showAllSteps && (
        <div style={{ padding: '0' }}>
          {reasoning.steps.map((step, index) => (
            <div key={step.id} style={{
              borderBottom: index < reasoning.steps.length - 1 ? '1px solid #e5e7eb' : 'none'
            }}>
              <div
                onClick={() => toggleStep(step.id)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  backgroundColor: expandedSteps.includes(step.id) ? '#f9fafb' : 'transparent',
                  transition: 'background-color 0.2s'
                }}
              >
                <div style={{
                  minWidth: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  {index + 1}
                </div>
                {getStepIcon(step.type)}
                <span style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  flex: 1
                }}>
                  {step.title}
                </span>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="14" 
                  height="14" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="#9ca3af" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  style={{
                    transform: expandedSteps.includes(step.id) ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }}
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
              
              {expandedSteps.includes(step.id) && (
                <div style={{
                  padding: '0 16px 16px 64px',
                  fontSize: '13px',
                  color: '#4b5563',
                  lineHeight: '1.5',
                  backgroundColor: '#f9fafb'
                }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {step.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReasoningDisplay;