import type { SectionLessonBlock } from '@/src/lib/content-types';
import { Card } from '@/src/components/ui';
import { microcopy } from '@/src/lib/copy/microcopy';
import { CalloutBlock } from './blocks/CalloutBlock';
import { ChecklistBlock } from './blocks/ChecklistBlock';
import { CodeBlock } from './blocks/CodeBlock';
import { MarkdownBlock } from './blocks/MarkdownBlock';

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
      return null;
    default:
      return (
        <Card as="div" className="block blockUnknown" padding="none">
          {microcopy.player.blocks.unsupportedType} <code>{String((block as { blockType?: unknown }).blockType)}</code>
        </Card>
      );
  }
}
