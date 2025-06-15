// src/components/TitleBar.tsx

import React from 'react';
import '../App.css'; 

const TitleBar: React.FC = () => {

  const handleMinimize = () => {
    window.electronAPI.minimize();
  };

  const handleMaximize = () => {
    window.electronAPI.maximize();
  };

  const handleClose = () => {
    window.electronAPI.close();
  };

  return (
    <header className="title-bar fixed top-0 w-full z-50">
      <div className="title">Kiritori-Ai</div>
      <div className="window-controls">
        <button onClick={handleMinimize}>−</button>
        <button onClick={handleMaximize}>◻</button>
        <button onClick={handleClose} className="close-btn">×</button>
      </div>
    </header>
  );
};

export default TitleBar;