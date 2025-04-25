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
    fileType: string;
    categoryId: string;
    createdAt: string;
    updatedAt?: string;
  }
  
  export interface DocumentContent extends Document {
    content: string;
  }