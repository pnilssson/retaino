import { ItemNotice } from '@/components/item-notice';

export function InlineError({
  message,
  title,
}: {
  message: string;
  title: string;
}) {
  return <ItemNotice description={message} title={title} tone="destructive" />;
}
