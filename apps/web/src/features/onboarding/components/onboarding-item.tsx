import type { ComponentProps, ReactNode } from 'react';
import {
  AppPageContent,
  AppPageItem,
} from '@/features/appshell/components/app-page-content';
import {
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemTitle,
} from '@/components/ui/item';
import { textStyles } from '@/lib/text-styles';

type OnboardingItemProps = Omit<ComponentProps<'section'>, 'title'> & {
  description?: ReactNode;
  eyebrow?: ReactNode;
  title?: ReactNode;
};

export function OnboardingItem({
  children,
  description,
  eyebrow,
  title,
  ...props
}: OnboardingItemProps) {
  return (
    <AppPageContent>
      <AppPageItem asChild>
        <section {...props}>
          {title ? (
            <ItemHeader className="items-start">
              <ItemContent className="gap-2">
                {eyebrow ? (
                  <p className={textStyles.meta}>{eyebrow}</p>
                ) : null}
                <ItemTitle className="flex-wrap">{title}</ItemTitle>
                {description ? (
                  <ItemDescription className="max-w-2xl">
                    {description}
                  </ItemDescription>
                ) : null}
              </ItemContent>
            </ItemHeader>
          ) : null}
          {children}
        </section>
      </AppPageItem>
    </AppPageContent>
  );
}
