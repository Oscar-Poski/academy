import { INestApplication } from '@nestjs/common';
import { QuestionType, SectionVersionStatus } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

describe('Quiz Seed Data (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('seeds quiz questions for request-response-cycle published v1', async () => {
    const section = await prisma.section.findUnique({
      where: { slug: 'request-response-cycle' },
      select: { id: true }
    });
    expect(section).toBeTruthy();

    const version = await prisma.sectionVersion.findUnique({
      where: {
        sectionId_versionNumber: {
          sectionId: section!.id,
          versionNumber: 1
        }
      },
      select: { id: true, status: true }
    });
    expect(version).toBeTruthy();
    expect(version?.status).toBe(SectionVersionStatus.published);

    const questions = await prisma.question.findMany({
      where: { sectionVersionId: version!.id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }]
    });

    expect(questions.length).toBeGreaterThanOrEqual(1);
    expect(questions.some((question) => question.type === QuestionType.mcq)).toBe(true);
    expect(questions.some((question) => question.type === QuestionType.short_answer)).toBe(true);

    const sortOrders = questions.map((question) => question.sortOrder);
    expect(sortOrders).toEqual([...sortOrders].sort((a, b) => a - b));
    expect(new Set(sortOrders).size).toBe(sortOrders.length);
  });

  it('does not contain duplicate sort orders for seeded questions in the same section version', async () => {
    const section = await prisma.section.findUnique({
      where: { slug: 'request-response-cycle' },
      select: { id: true }
    });
    expect(section).toBeTruthy();

    const version = await prisma.sectionVersion.findUnique({
      where: {
        sectionId_versionNumber: {
          sectionId: section!.id,
          versionNumber: 1
        }
      },
      select: { id: true }
    });
    expect(version).toBeTruthy();

    const aggregate = await prisma.question.groupBy({
      by: ['sortOrder'],
      where: { sectionVersionId: version!.id },
      _count: { sortOrder: true }
    });

    for (const row of aggregate) {
      expect(row._count.sortOrder).toBe(1);
    }
  });
});
