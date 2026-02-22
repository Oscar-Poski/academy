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
    return <div className="block blockInvalid">Invalid markdown block payload.</div>;
  }

  return (
    <section className="block blockMarkdown">
      <pre className="blockMarkdownText">{contentJson.markdown}</pre>
    </section>
  );
}
