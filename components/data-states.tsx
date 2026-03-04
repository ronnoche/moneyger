'use client';

import type { ReactNode } from 'react';
import { Card } from '@/components/ui';

export function LoadingState({ label = 'Loading data...' }: { label?: string }) {
  return (
    <Card className="text-sm text-muted-foreground" dense>
      {label}
    </Card>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Card className="border-danger text-sm text-danger" dense>
      {message}
    </Card>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <Card className="space-y-2 text-center" dense>
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      {action ? <div className="pt-1">{action}</div> : null}
    </Card>
  );
}
