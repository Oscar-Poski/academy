import { microcopy } from '@/src/lib/copy/microcopy';

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
      <div className="blockQuizBadge">{microcopy.player.blocks.quizPlaceholderBadge}</div>
      <p className="blockQuizText">{prompt ?? microcopy.player.blocks.quizPlaceholderText}</p>
    </section>
  );
}
