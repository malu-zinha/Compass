import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import './HomePage.css';

function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="home-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <div className="home-content">
        <div className="home-message">
          <h1>Em desenvolvimento</h1>
          <p>Esta página está sendo construída</p>
        </div>
      </div>
    </div>
  );
}

export default HomePage;

