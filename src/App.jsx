import { useEffect, useState } from 'react';
import { useRoutes } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { routes } from './routes';

function App() {
  const tryRestoreSession = useAuthStore((s) => s.tryRestoreSession);
  const [authBootstrapped, setAuthBootstrapped] = useState(false);

  useEffect(() => {
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
  }, [tryRestoreSession]);

  if (!authBootstrapped) {
    return null;
  }

  const element = useRoutes(routes);
  return element;
}

export default App;
