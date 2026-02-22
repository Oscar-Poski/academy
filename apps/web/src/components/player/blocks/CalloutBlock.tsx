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
    return <div className="block blockInvalid">Invalid callout block payload.</div>;
  }

  const level =
    'level' in contentJson && typeof contentJson.level === 'string' ? contentJson.level : 'info';

  return (
    <section className={`block blockCallout blockCallout-${level}`}>
      <div className="blockCalloutLabel">{level}</div>
      <p className="blockCalloutText">{contentJson.text}</p>
    </section>
  );
}
