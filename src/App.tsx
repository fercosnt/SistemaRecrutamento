import React from 'react';
import { GlassShowcase } from './components/GlassShowcase';
import { Toaster } from 'sonner@2.0.3';

function App() {
  return (
    <>
      <GlassShowcase />
      <Toaster position="top-right" />
    </>
  );
}

export default App;
