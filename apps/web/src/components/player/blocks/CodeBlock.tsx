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
    return <div className="block blockInvalid">Invalid code block payload.</div>;
  }

  const language =
    'language' in contentJson && typeof contentJson.language === 'string' ? contentJson.language : 'text';

  return (
    <section className="block blockCode">
      <div className="blockCodeHeader">{language}</div>
      <pre className="blockCodePre">
        <code>{contentJson.snippet}</code>
      </pre>
    </section>
  );
}
