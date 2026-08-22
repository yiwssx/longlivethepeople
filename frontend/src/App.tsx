import { useEffect, useState, type MouseEvent } from 'react';
import MemorialPage from './pages/MemorialPage';
import WelcomePage from './pages/WelcomePage';

export type Navigate = (event: MouseEvent<HTMLAnchorElement>, path: string) => void;

const currentPath = () => window.location.pathname;

export default function App() {
  const [pathname, setPathname] = useState(currentPath);

  useEffect(() => {
    const handlePopState = () => setPathname(currentPath());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate: Navigate = (event, path) => {
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
    ) {
      return;
    }

    event.preventDefault();
    window.history.pushState(null, '', path);
    setPathname(path);
    window.scrollTo({ top: 0, left: 0 });
  };

  return pathname === '/memorial'
    ? <MemorialPage />
    : <WelcomePage onNavigate={navigate} />;
}
