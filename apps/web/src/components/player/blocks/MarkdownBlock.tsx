import { Card } from '@/src/components/ui';
import { microcopy } from '@/src/lib/copy/microcopy';

type MarkdownBlockProps = {
  contentJson: unknown;
};

function isMarkdownContent(value: unknown): value is { markdown: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'markdown' in value &&
    typeof (value as { markdown?: unknown }).markdown === 'string'
  );
}

export function MarkdownBlock({ contentJson }: MarkdownBlockProps) {
  if (!isMarkdownContent(contentJson)) {
    return (
      <Card as="div" className="block blockInvalid" padding="none">
        {microcopy.player.blocks.invalidMarkdownPayload}
      </Card>
    );
  }

  return (
    <Card as="section" className="block blockMarkdown playerBlockProse" padding="none">
      <pre className="blockMarkdownText">{contentJson.markdown}</pre>
    </Card>
  );
}
