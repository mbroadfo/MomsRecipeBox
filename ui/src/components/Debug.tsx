import React from 'react';
import { getCurrentUserId } from '../utils/api';

/**
 * Debug component to show current user and other debugging info
 */
const Debug: React.FC = () => {
  const userId = getCurrentUserId();
  
  // Get window dimensions
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  return (
    <div className="fixed bottom-0 left-0 p-2 bg-black bg-opacity-70 text-white text-xs z-50 rounded-tr-md m-2">
      <div>User: {userId}</div>
      <div>Screen: {width}×{height}</div>
      <div>Env: {process.env.NODE_ENV || 'unknown'}</div>
    </div>
  );
};

export default Debug;
