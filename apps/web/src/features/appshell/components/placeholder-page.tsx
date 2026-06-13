import { AppPageHeader } from './app-page-header';

type PlaceholderPageProps = {
  description: string;
  title: string;
};

export function PlaceholderPage({ description, title }: PlaceholderPageProps) {
  return (
    <main className="flex flex-1 bg-background" id="main-content">
      <section className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
        <AppPageHeader
          description={description}
          eyebrow="Workspace"
          title={title}
        />
      </section>
    </main>
  );
}
