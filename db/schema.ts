export * as sqliteSchema from "./schema.sqlite";
export * as pgSchema from "./schema.pg";

export interface Document {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewDocument {
  id?: string;
  title?: string;
  content?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
