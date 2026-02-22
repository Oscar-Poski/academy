type QuizPlaceholderBlockProps = {
  contentJson: unknown;
};

function getPrompt(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || !("prompt" in value)) {
    return null;
  }

  const prompt = (value as { prompt?: unknown }).prompt;
  return typeof prompt === 'string' ? prompt : null;
}

export function QuizPlaceholderBlock({ contentJson }: QuizPlaceholderBlockProps) {
  const prompt = getPrompt(contentJson);

  return (
    <section className="block blockQuizPlaceholder">
      <div className="blockQuizBadge">Quiz Placeholder</div>
      <p className="blockQuizText">{prompt ?? 'Quiz content will be interactive in a future PR.'}</p>
    </section>
  );
}
