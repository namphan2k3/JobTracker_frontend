import { useEffect, useState } from 'react';
import { useRoutes, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { routes } from './routes';

const SKIP_RESTORE_PREFIXES = ['/auth/', '/public/'];

function App() {
  const tryRestoreSession = useAuthStore((s) => s.tryRestoreSession);
  const [authBootstrapped, setAuthBootstrapped] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const skip = SKIP_RESTORE_PREFIXES.some((p) => location.pathname.startsWith(p));
    if (skip) {
      setAuthBootstrapped(true);
      return;
    }
    let isMounted = true;
    (async () => {
      try {
        await tryRestoreSession();
      } finally {
        if (isMounted) {
          setAuthBootstrapped(true);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [tryRestoreSession, location.pathname]);

  if (!authBootstrapped) {
    return null;
  }

  const element = useRoutes(routes);
  return element;
}

export default App;
