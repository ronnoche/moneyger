'use client';

import { useTransition } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui';

export const GoogleAuthCta = () => {
  const [isPending, startTransition] = useTransition();

  const handleContinue = () => {
    startTransition(() => {
      void signIn('google', { callbackUrl: '/budgets' });
    });
  };

  return (
    <Button type="button" size="lg" className="h-11 px-5 text-sm" onClick={handleContinue} disabled={isPending}>
      {isPending ? 'Redirecting to Google...' : 'Continue with Google ->'}
    </Button>
  );
};
