"use client";

import Image from 'next/image';
import {
  type ReactNode,
  useState,
} from 'react';
import { cn } from '@/lib/utils';

type SidebarAvatarProps = {
  alt: string;
  className?: string;
  collapsedFallback?: ReactNode;
  fallback: ReactNode;
  hasImage?: boolean | null;
  imageUrl?: string | null;
};

export function SidebarAvatar({
  alt,
  className,
  collapsedFallback,
  fallback,
  hasImage,
  imageUrl,
}: SidebarAvatarProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const shouldShowImage = Boolean(
    hasImage && imageUrl && failedImageUrl !== imageUrl,
  );

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-md',
        collapsedFallback &&
          'group-data-[collapsible=icon]:size-4 group-data-[collapsible=icon]:rounded-none group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:text-sidebar-foreground',
        className,
      )}
    >
      {shouldShowImage && imageUrl ? (
        <Image
          alt={alt}
          className={cn(
            'size-full object-cover',
            collapsedFallback && 'group-data-[collapsible=icon]:hidden',
          )}
          height={32}
          onError={() => setFailedImageUrl(imageUrl)}
          src={imageUrl}
          unoptimized
          width={32}
        />
      ) : null}
      {!shouldShowImage || !imageUrl ? (
        <span
          className={cn(
            'contents',
            collapsedFallback && 'group-data-[collapsible=icon]:hidden',
          )}
        >
          {fallback}
        </span>
      ) : null}
      {collapsedFallback ? (
        <span className="hidden group-data-[collapsible=icon]:contents">
          {collapsedFallback}
        </span>
      ) : null}
    </span>
  );
}
