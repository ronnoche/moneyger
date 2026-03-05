'use client';

import type { ReactNode } from 'react';
import { Card } from '@/components/ui';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, children, className }: PageHeaderProps) {
  return (
    <Card className={[children ? 'space-y-2.5' : '', className].filter(Boolean).join(' ')} dense>
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children ? <div>{children}</div> : null}
    </Card>
  );
}

