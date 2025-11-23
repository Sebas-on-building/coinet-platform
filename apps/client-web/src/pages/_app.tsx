import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { enforceHTTPS } from '../utils/security';

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    enforceHTTPS();
  }, []);
  return <Component {...pageProps} />;
}

export default MyApp; 