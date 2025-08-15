import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    // Si pas de token, redirige vers la page de login (index)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (!token && router.pathname !== '/') {
        router.replace('/');
      }
      // Si connecté (token présent) et sur la page login, redirige vers dashboard
      if (token && router.pathname === '/') {
        router.replace('/Dashboard');
      }
    }
  }, [router.pathname]);

  return <Component {...pageProps} />;
}

export default MyApp;
