// File: ui/src/App.tsx
import React from 'react';
import { HomePage } from './pages/HomePage';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <HomePage />
    </div>
  );
};

export default App;
