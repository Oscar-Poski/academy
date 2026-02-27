import { INestApplication } from '@nestjs/common';
import { UnlockRuleType, UnlockScopeType } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

describe('Unlock Seed Data (e2e)', () => {
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

  it('seeds an active prereq_sections unlock rule for http-basics-module', async () => {
    const module = await prisma.module.findUnique({
      where: { slug: 'http-basics-module' },
      select: { id: true }
    });
    expect(module).toBeTruthy();

    const prerequisiteSection = await prisma.section.findUnique({
      where: { slug: 'request-response-cycle' },
      select: { id: true }
    });
    expect(prerequisiteSection).toBeTruthy();

    const rules = await prisma.unlockRule.findMany({
      where: {
        scopeType: UnlockScopeType.module,
        scopeId: module!.id,
        isActive: true
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }]
    });

    expect(rules.length).toBeGreaterThanOrEqual(1);

    const prereqRule = rules.find((rule) => rule.ruleType === UnlockRuleType.prereq_sections);
    expect(prereqRule).toBeTruthy();

    const ruleConfig = prereqRule!.ruleConfigJson as { section_ids?: unknown };
    expect(Array.isArray(ruleConfig.section_ids)).toBe(true);
    expect(ruleConfig.section_ids).toContain(prerequisiteSection!.id);
  });

  it('does not duplicate active seeded prereq_sections rule for module scope', async () => {
    const module = await prisma.module.findUnique({
      where: { slug: 'http-basics-module' },
      select: { id: true }
    });
    expect(module).toBeTruthy();

    const count = await prisma.unlockRule.count({
      where: {
        scopeType: UnlockScopeType.module,
        scopeId: module!.id,
        ruleType: UnlockRuleType.prereq_sections,
        isActive: true
      }
    });

    expect(count).toBe(1);
  });
});
