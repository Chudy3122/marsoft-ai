// src/types/knowledge.ts
export interface Category {
    id: string;
    name: string;
    parentId: string | null;
    subCategories: Category[];
    createdAt: string;
    updatedAt: string;
  }
  
  export interface Document {
  id: string;
  title: string;
  description?: string; // Dodano description
  fileType: string;
  fileSize?: number; // Dodano fileSize
  uploadedBy?: string; // Dodano uploadedBy
  uploadedByEmail?: string; // Dodano uploadedByEmail  
  categoryId: string;
  categoryName?: string;
  createdAt: string;
  updatedAt: string;
  isOwner?: boolean; // Dodano isOwner
}
  
  export interface DocumentContent extends Document {
    content: string;
  }