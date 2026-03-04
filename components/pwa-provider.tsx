'use client';

import { useEffect, useState } from 'react';

interface Props {
  children: React.ReactNode;
}

export const PwaProvider = ({ children }: Props) => {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch((error) => {
        console.error('Service worker registration failed:', error);
      });
    }

    const syncOnlineState = () => setOffline(!navigator.onLine);
    syncOnlineState();
    window.addEventListener('online', syncOnlineState);
    window.addEventListener('offline', syncOnlineState);
    return () => {
      window.removeEventListener('online', syncOnlineState);
      window.removeEventListener('offline', syncOnlineState);
    };
  }, []);

  return (
    <>
      {offline ? <div className="bg-amber-100 px-4 py-2 text-sm text-amber-800">You are offline.</div> : null}
      {children}
    </>
  );
};

