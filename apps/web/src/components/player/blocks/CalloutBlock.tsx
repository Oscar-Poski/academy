import { Card } from '@/src/components/ui';
import { microcopy } from '@/src/lib/copy/microcopy';

type CalloutBlockProps = {
  contentJson: unknown;
};

function isCalloutContent(value: unknown): value is { text: string; level?: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'text' in value &&
    typeof (value as { text?: unknown }).text === 'string'
  );
}

export function CalloutBlock({ contentJson }: CalloutBlockProps) {
  if (!isCalloutContent(contentJson)) {
    return (
      <Card as="div" className="block blockInvalid" padding="none">
        {microcopy.player.blocks.invalidCalloutPayload}
      </Card>
    );
  }

  const level =
    'level' in contentJson && typeof contentJson.level === 'string' ? contentJson.level : 'info';

  return (
    <Card as="section" className={`block blockCallout blockCallout-${level}`} padding="none">
      <div className="blockCalloutLabel">{level}</div>
      <p className="blockCalloutText">{contentJson.text}</p>
    </Card>
  );
}
