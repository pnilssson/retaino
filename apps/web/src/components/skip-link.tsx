type SkipLinkProps = {
  label: string;
};

export function SkipLink({ label }: SkipLinkProps) {
  return (
    <a
      className="sr-only fixed top-3 left-3 z-[100] rounded-md bg-background px-3 py-2 text-sm font-medium text-foreground shadow-lg ring-2 ring-ring focus:not-sr-only focus:outline-none"
      href="#main-content"
    >
      {label}
    </a>
  );
}
