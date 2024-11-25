import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Mint from './components/Mint';
import Marketplace from './components/Marketplace';

const App = () => {
  const linkStyle = {
    textDecoration: 'none',
    color: 'black',
    padding: '0.5rem',
    fontSize: '1rem',
  };

  return (
    <Router>
      <nav style={{ display: 'flex', justifyContent: 'space-around', padding: '1rem', background: '#f5f5f5' }}>
        <Link to="/" style={linkStyle}>
          Marketplace
        </Link>
        <Link to="/mint" style={linkStyle}>
          Mint Video
        </Link>
      </nav>

      <Routes>
        <Route path="/" element={<Marketplace />} />
        <Route path="/mint" element={<Mint />} />
      </Routes>
    </Router>
  );
};

export default App;
