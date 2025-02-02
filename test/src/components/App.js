/* global qeen */
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

import Home from './Home';
import Product from './Product';
import Checkout from './Checkout';
import About from './About';
import Nav from './Nav';

import '../styles/App.css';

function AnalyticsWrapper({ children }) {
  const location = useLocation();
  const isPdp = location.pathname.includes('/product/');
  const analyticsEndpoint = 'http://localhost:8080/log';

  useEffect(() => {
    // qeen.fetchQeenContent('dev');

    if (isPdp && parseInt(location.pathname.split('/').pop()) % 2 === 1) {
      qeen.setContentServed();
    } else {
      qeen.resetContentServed();
    }
  
    qeen.initPageSession({
      qeenDeviceId: 'dev',
      requestUrl: window.location.href,
      analyticsEndpoint: analyticsEndpoint,
      projectId: '123',
      websiteId: '456',
      contentServingId: isPdp ? String(qeen.randInt()) : '0',
      contentId: isPdp ? 'optimised' : '-',
      contentStatus: '[SET_VIA_SERVER_TEMPLATE]',
      productId: '[SET_VIA_SERVER_TEMPLATE]',
      isPdp: isPdp,
      idleTime: 60_000,
    });

    qeen.bindClickEvents(new qeen.InteractionEvent('CLICK_LINK', '.nav'));
  }, [location]);

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AnalyticsWrapper>
        <Nav />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/checkout" element={<Checkout />} />
        </Routes>
      </AnalyticsWrapper>
    </BrowserRouter>
  );
}

export default App;