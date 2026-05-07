type PlaceholderPageProps = {
  description: string;
  title: string;
};

export function PlaceholderPage({ description, title }: PlaceholderPageProps) {
  return (
    <main className="flex flex-1 bg-background">
      <section className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
        <div>
          <p className="text-sm text-muted-foreground">Workspace</p>
          <h1 className="mt-2 text-2xl leading-tight tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </section>
    </main>
  );
}
