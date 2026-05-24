import type { ComponentProps, ReactNode } from 'react';
import {
  AppPageContent,
  AppPageItem,
  AppPageSection,
} from '@/features/appshell/components/app-page-content';

type OnboardingItemProps = Omit<ComponentProps<'section'>, 'title'> & {
  description?: ReactNode;
  eyebrow?: ReactNode;
  title?: ReactNode;
};

export function OnboardingItem({
  children,
  description,
  title,
  ...props
}: OnboardingItemProps) {
  if (title) {
    return (
      <AppPageContent>
        <AppPageSection
          description={description}
          id={props.id}
          title={title}
        >
          {children}
        </AppPageSection>
      </AppPageContent>
    );
  }

  return (
    <AppPageContent>
      <AppPageItem asChild>
        <section {...props}>
          {children}
        </section>
      </AppPageItem>
    </AppPageContent>
  );
}
