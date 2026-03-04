'use client';

import type { ReactNode } from 'react';
import { Card } from '@/components/ui';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <Card className="flex flex-wrap items-start justify-between gap-4" dense>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </Card>
  );
}

