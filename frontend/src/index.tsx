import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import AllReviewsPage from './components/AllReviewsPage';

function Root() {
  const [hash, setHash] = React.useState(window.location.hash);
  React.useEffect(() => {
    const handler = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return hash === '#/reviews' ? <AllReviewsPage /> : <App />;
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
