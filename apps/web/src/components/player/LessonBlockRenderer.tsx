import type { SectionLessonBlock } from '@/src/lib/content-types';
import { CalloutBlock } from './blocks/CalloutBlock';
import { ChecklistBlock } from './blocks/ChecklistBlock';
import { CodeBlock } from './blocks/CodeBlock';
import { MarkdownBlock } from './blocks/MarkdownBlock';
import { QuizPlaceholderBlock } from './blocks/QuizPlaceholderBlock';

type LessonBlockRendererProps = {
  block: SectionLessonBlock;
};

export function LessonBlockRenderer({ block }: LessonBlockRendererProps) {
  switch (block.blockType) {
    case 'markdown':
      return <MarkdownBlock contentJson={block.contentJson} />;
    case 'callout':
      return <CalloutBlock contentJson={block.contentJson} />;
    case 'code':
      return <CodeBlock contentJson={block.contentJson} />;
    case 'checklist':
      return <ChecklistBlock contentJson={block.contentJson} />;
    case 'quiz':
      return <QuizPlaceholderBlock contentJson={block.contentJson} />;
    default:
      return (
        <div className="block blockUnknown">
          Unsupported block type: <code>{String((block as { blockType?: unknown }).blockType)}</code>
        </div>
      );
  }
}
