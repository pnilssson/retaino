import { compileMDX } from 'next-mdx-remote/rsc';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import remarkGfm from 'remark-gfm';
import type {
  AnchorHTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react';
import type { LegalDocumentVersion } from '@retaino/shared/contracts';
import { routes } from '@/lib/routes';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

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
      className={cn('border bg-muted px-3 py-2 text-left', textStyles.body)}
    />
  ),
  td: (props: TdHTMLAttributes<HTMLTableCellElement>) => (
    <td {...props} className="border px-3 py-2 align-top" />
  ),
};

export async function LegalDocumentArticle({
  backHref = routes.home,
  backLabel,
  document,
}: LegalDocumentArticleProps) {
  const t = await getTranslations('Legal');
  const resolvedBackLabel = backLabel ?? t('backToHome');
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
          className={cn(
            'underline-offset-4 hover:text-foreground hover:underline',
            textStyles.meta,
          )}
          href={backHref}
        >
          {resolvedBackLabel}
        </Link>
        <div className="mt-8 border-b pb-6">
          <p className={cn(textStyles.itemTitle, 'text-muted-foreground')}>
            {t('policyEyebrow')}
          </p>
          <h1 className={cn('mt-4', textStyles.displayTitle)}>
            {document.title}
          </h1>
          <p className={cn('mt-5', textStyles.mutedBody)}>
            {t('documentMeta', {
              date: document.effectiveDate,
              version: document.documentVersion,
            })}
          </p>
        </div>
        <div className={cn('mt-8 space-y-6', textStyles.legalProse)}>
          {content}
        </div>
      </article>
    </main>
  );
}
