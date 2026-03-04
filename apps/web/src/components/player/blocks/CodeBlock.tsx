import { Card } from '@/src/components/ui';
import { microcopy } from '@/src/lib/copy/microcopy';

type CodeBlockProps = {
  contentJson: unknown;
};

function isCodeContent(value: unknown): value is { snippet: string; language?: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'snippet' in value &&
    typeof (value as { snippet?: unknown }).snippet === 'string'
  );
}

export function CodeBlock({ contentJson }: CodeBlockProps) {
  if (!isCodeContent(contentJson)) {
    return (
      <Card as="div" className="block blockInvalid" padding="none">
        {microcopy.player.blocks.invalidCodePayload}
      </Card>
    );
  }

  const language =
    'language' in contentJson && typeof contentJson.language === 'string' ? contentJson.language : 'text';

  return (
    <Card as="section" className="block blockCode" padding="none">
      <div className="blockCodeHeader">{language}</div>
      <pre className="blockCodePre">
        <code>{contentJson.snippet}</code>
      </pre>
    </Card>
  );
}
