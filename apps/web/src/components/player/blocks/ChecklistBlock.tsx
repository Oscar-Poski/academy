import { Card } from '@/src/components/ui';
import { microcopy } from '@/src/lib/copy/microcopy';

type ChecklistBlockProps = {
  contentJson: unknown;
};

function isChecklistContent(value: unknown): value is { items: string[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'items' in value &&
    Array.isArray((value as { items?: unknown }).items) &&
    (value as { items: unknown[] }).items.every((item) => typeof item === 'string')
  );
}

export function ChecklistBlock({ contentJson }: ChecklistBlockProps) {
  if (!isChecklistContent(contentJson)) {
    return (
      <Card as="div" className="block blockInvalid" padding="none">
        {microcopy.player.blocks.invalidChecklistPayload}
      </Card>
    );
  }

  return (
    <Card as="section" className="block blockChecklist" padding="none">
      <ul className="blockChecklistList">
        {contentJson.items.map((item) => (
          <li key={item} className="blockChecklistItem">
            <span className="blockChecklistMarker" aria-hidden="true">
              □
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
