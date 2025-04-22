'use client';

// src/components/DocumentTemplates.tsx
import React, { useState } from 'react';
import { documentTemplates } from '../lib/knowledge';
import ReactMarkdown from 'react-markdown';

const DocumentTemplates: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('wszystkie');
  
  // Unikalne kategorie szablonów
  const categories = ['wszystkie', ...Array.from(new Set(documentTemplates.map(template => template.category)))];
  
  // Filtrowanie szablonów według kategorii
  const filteredTemplates = selectedCategory === 'wszystkie'
    ? documentTemplates
    : documentTemplates.filter(template => template.category === selectedCategory);
  
  // Pobranie zawartości wybranego szablonu
  const templateContent = selectedTemplate
    ? documentTemplates.find(template => template.id === selectedTemplate)?.content
    : null;
  
  return (
    <div className="flex flex-col md:flex-row gap-4 h-[600px]">
      <div className="w-full md:w-1/3 overflow-y-auto">
        <div className="mb-4">
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Filtruj według kategorii:
          </label>
          <select
            id="category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                selectedTemplate === template.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => setSelectedTemplate(template.id)}
            >
              <h3 className="font-semibold">{template.name}</h3>
              <p className={`text-sm ${selectedTemplate === template.id ? 'text-blue-100' : 'text-gray-600'}`}>
                {template.description}
              </p>
            </div>
          ))}
        </div>
      </div>
      
      <div className="w-full md:w-2/3 overflow-y-auto bg-gray-50 rounded-lg p-4">
        {templateContent ? (
          <div className="prose max-w-none">
            <ReactMarkdown>
              {templateContent}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Wybierz szablon z listy po lewej stronie, aby zobaczyć jego zawartość.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentTemplates;