'use client';

import { SessionProvider } from 'next-auth/react';

interface Props {
  children: React.ReactNode;
}

export function AppSessionProvider({ children }: Props) {
  return <SessionProvider>{children}</SessionProvider>;
}

