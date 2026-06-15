import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { buildNoIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = buildNoIndexMetadata();

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
