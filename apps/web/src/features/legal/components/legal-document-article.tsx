import { compileMDX } from 'next-mdx-remote/rsc';
import Link from 'next/link';
import remarkGfm from 'remark-gfm';
import type {
  AnchorHTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react';
import type { LegalDocumentVersion } from '@retaino/shared/contracts';
import { routes } from '@/lib/routes';

type LegalDocumentArticleProps = {
  document: LegalDocumentVersion;
  backHref?: string;
  backLabel?: string;
};

const mdxComponents = {
  a: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      {...props}
      className="text-foreground underline underline-offset-2"
    />
  ),
  table: (props: TableHTMLAttributes<HTMLTableElement>) => (
    <div className="overflow-x-auto">
      <table {...props} className="w-full border-collapse" />
    </div>
  ),
  th: (props: ThHTMLAttributes<HTMLTableCellElement>) => (
    <th
      {...props}
      className="border bg-muted px-3 py-2 text-left font-normal text-foreground"
    />
  ),
  td: (props: TdHTMLAttributes<HTMLTableCellElement>) => (
    <td {...props} className="border px-3 py-2 align-top" />
  ),
};

export async function LegalDocumentArticle({
  backHref = routes.home,
  backLabel = 'Back to home',
  document,
}: LegalDocumentArticleProps) {
  const { content } = await compileMDX({
    source: document.bodyMdx,
    components: mdxComponents,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
      },
      parseFrontmatter: false,
    },
  });

  return (
    <main className="min-h-[calc(100svh-4rem)] w-full px-5 py-16 sm:px-8 lg:px-10">
      <article className="mx-auto w-full max-w-3xl">
        <Link
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          href={backHref}
        >
          {backLabel}
        </Link>
        <div className="mt-8 border-b pb-6">
          <p className="text-sm font-medium text-muted-foreground">
            Retaino policy
          </p>
          <h1 className="mt-4 text-4xl leading-tight tracking-normal text-foreground sm:text-5xl">
            {document.title}
          </h1>
          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            Effective {document.effectiveDate}, version{' '}
            {document.documentVersion}
          </p>
        </div>
        <div className="mt-8 space-y-6 text-[15px] leading-7 text-muted-foreground [&_code]:font-mono [&_code]:text-xs [&_code]:text-foreground [&_h1]:hidden [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:leading-8 [&_h2]:text-foreground [&_h3]:pt-2 [&_h3]:text-base [&_h3]:leading-7 [&_h3]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground">
          {content}
        </div>
      </article>
    </main>
  );
}
