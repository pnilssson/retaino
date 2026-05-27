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
  fallback: ReactNode;
  hasImage?: boolean | null;
  imageUrl?: string | null;
};

export function SidebarAvatar({
  alt,
  className,
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
        className,
      )}
    >
      {shouldShowImage && imageUrl ? (
        <Image
          alt={alt}
          className="size-full object-cover"
          height={32}
          onError={() => setFailedImageUrl(imageUrl)}
          src={imageUrl}
          unoptimized
          width={32}
        />
      ) : (
        fallback
      )}
    </span>
  );
}
