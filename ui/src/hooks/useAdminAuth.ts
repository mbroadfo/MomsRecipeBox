import { useContext } from 'react';
import AdminContext from '../contexts/AdminContext';
import type { AuthContextType } from '../auth/types';

export const useAdminAuth = (): AuthContextType => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminProvider');
  }
  return context;
};