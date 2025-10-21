// Global window interface extensions
declare global {
  interface Window {
    currentUser?: {
      id: string;
    };
    currentUserId?: string;
  }
}

// Helper function to get user ID from global window
export const getCurrentUserId = (): string => {
  return window.currentUser?.id || window.currentUserId || 'demo-user';
};

export {}; // This makes the file a module