import type {
  ComponentProps,
  ReactNode,
} from 'react';
import { ContentSection } from '@/features/appshell/components/content-section';

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
      <div className="grid gap-5">
        <ContentSection
          description={description}
          id={props.id}
          title={title}
        >
          {children}
        </ContentSection>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <ContentSection asChild>
        <section {...props}>
          {children}
        </section>
      </ContentSection>
    </div>
  );
}
