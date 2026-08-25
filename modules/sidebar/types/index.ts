export interface SidebarDocument {
    id: string;
    title: string;
    content: string;
    isPinned: boolean;
    isArchived: boolean;
    createdAt: Date | string | number;
    updatedAt: Date | string | number;
}