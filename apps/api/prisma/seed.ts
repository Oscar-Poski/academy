import {
  LessonBlockType,
  PrismaClient,
  QuestionType,
  SectionVersionStatus,
  UserRole,
  UnlockRuleType,
  UnlockScopeType
} from '@prisma/client';

const prisma = new PrismaClient();
const SEEDED_STUDENT_PASSWORD_HASH = '$2b$10$rI7AKMGo2fEWYkXlBf9fWOf5z0fGHQllXifWfM6M0ehAFri0W2Dxq';
const SEEDED_ADMIN_PASSWORD_HASH = '$2b$10$8eaRbSEeV4fCO8xjW8fkE.gU3P7m.7hRd2.EUk7QjVbup73QFdKVK';

async function upsertSectionVersionWithPublishedBlocks(params: {
  sectionId: string;
  versionNumber: number;
  status: SectionVersionStatus;
  changeLog: string;
  createdBy: string;
  publishedBlocks?: Array<{
    blockOrder: number;
    blockType: LessonBlockType;
    contentJson: Record<string, unknown>;
    estimatedSeconds?: number;
  }>;
}) {
  const version = await prisma.sectionVersion.upsert({
    where: {
      sectionId_versionNumber: {
        sectionId: params.sectionId,
        versionNumber: params.versionNumber
      }
    },
    update: {
      status: params.status,
      changeLog: params.changeLog,
      createdBy: params.createdBy,
      publishedAt: params.status === SectionVersionStatus.published ? new Date() : null
    },
    create: {
      sectionId: params.sectionId,
      versionNumber: params.versionNumber,
      status: params.status,
      changeLog: params.changeLog,
      createdBy: params.createdBy,
      publishedAt: params.status === SectionVersionStatus.published ? new Date() : null
    }
  });

  if (params.publishedBlocks && params.publishedBlocks.length > 0) {
    await prisma.$transaction(async (tx) => {
      await tx.lessonBlock.deleteMany({ where: { sectionVersionId: version.id } });
      await tx.lessonBlock.createMany({
        data: params.publishedBlocks.map((block) => ({
          sectionVersionId: version.id,
          blockOrder: block.blockOrder,
          blockType: block.blockType,
          contentJson: block.contentJson,
          estimatedSeconds: block.estimatedSeconds
        }))
      });
    });
  }
}

async function replaceSeedQuestionsForVersion(params: {
  sectionVersionId: string;
  questions: Array<{
    type: QuestionType;
    prompt: string;
    optionsJson: Record<string, unknown> | null;
    answerKeyJson: Record<string, unknown>;
    explanation?: string;
    points?: number;
    sortOrder: number;
  }>;
}) {
  await prisma.question.deleteMany({
    where: { sectionVersionId: params.sectionVersionId }
  });

  if (params.questions.length === 0) {
    return;
  }

  await prisma.question.createMany({
    data: params.questions.map((question) => ({
      sectionVersionId: params.sectionVersionId,
      type: question.type,
      prompt: question.prompt,
      optionsJson: question.optionsJson,
      answerKeyJson: question.answerKeyJson,
      explanation: question.explanation ?? null,
      points: question.points ?? 1,
      sortOrder: question.sortOrder
    }))
  });
}

async function replaceSeedUnlockRulesForModule(params: {
  moduleId: string;
  prerequisiteSectionIds: string[];
}) {
  await prisma.unlockRule.deleteMany({
    where: {
      scopeType: UnlockScopeType.module,
      scopeId: params.moduleId
    }
  });

  await prisma.unlockRule.createMany({
    data: [
      {
        scopeType: UnlockScopeType.module,
        scopeId: params.moduleId,
        ruleType: UnlockRuleType.prereq_sections,
        ruleConfigJson: {
          section_ids: params.prerequisiteSectionIds
        },
        isActive: true,
        priority: 10
      }
    ]
  });
}

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'student@academy.local' },
    update: {
      name: 'Academy Student',
      role: UserRole.user,
      passwordHash: SEEDED_STUDENT_PASSWORD_HASH
    },
    create: {
      email: 'student@academy.local',
      name: 'Academy Student',
      role: UserRole.user,
      passwordHash: SEEDED_STUDENT_PASSWORD_HASH
    }
  });

  await prisma.user.upsert({
    where: { email: 'admin@academy.local' },
    update: {
      name: 'Academy Admin',
      role: UserRole.admin,
      passwordHash: SEEDED_ADMIN_PASSWORD_HASH
    },
    create: {
      email: 'admin@academy.local',
      name: 'Academy Admin',
      role: UserRole.admin,
      passwordHash: SEEDED_ADMIN_PASSWORD_HASH
    }
  });

  const path = await prisma.path.upsert({
    where: { slug: 'web-pentest-path' },
    update: {
      title: 'Web Pentest Path',
      description: 'PR-1 seeded learning path',
      status: 'published',
      sortOrder: 1
    },
    create: {
      slug: 'web-pentest-path',
      title: 'Web Pentest Path',
      description: 'PR-1 seeded learning path',
      status: 'published',
      sortOrder: 1
    }
  });

  const module = await prisma.module.upsert({
    where: { slug: 'http-basics-module' },
    update: {
      pathId: path.id,
      title: 'HTTP Basics',
      description: 'Foundational web protocol concepts',
      status: 'published',
      sortOrder: 1
    },
    create: {
      pathId: path.id,
      slug: 'http-basics-module',
      title: 'HTTP Basics',
      description: 'Foundational web protocol concepts',
      status: 'published',
      sortOrder: 1
    }
  });

  const sectionOne = await prisma.section.upsert({
    where: { slug: 'request-response-cycle' },
    update: {
      moduleId: module.id,
      title: 'Request/Response Cycle',
      sortOrder: 1,
      hasQuiz: true
    },
    create: {
      moduleId: module.id,
      slug: 'request-response-cycle',
      title: 'Request/Response Cycle',
      sortOrder: 1,
      hasQuiz: true
    }
  });

  const sectionTwo = await prisma.section.upsert({
    where: { slug: 'headers-and-cookies' },
    update: {
      moduleId: module.id,
      title: 'Headers and Cookies',
      sortOrder: 2,
      hasQuiz: false
    },
    create: {
      moduleId: module.id,
      slug: 'headers-and-cookies',
      title: 'Headers and Cookies',
      sortOrder: 2,
      hasQuiz: false
    }
  });

  await upsertSectionVersionWithPublishedBlocks({
    sectionId: sectionOne.id,
    versionNumber: 1,
    status: SectionVersionStatus.published,
    changeLog: 'Initial published version',
    createdBy: user.id,
    publishedBlocks: [
      {
        blockOrder: 1,
        blockType: LessonBlockType.markdown,
        contentJson: { markdown: '# Request/Response\nHTTP starts with a request and ends with a response.' },
        estimatedSeconds: 90
      },
      {
        blockOrder: 2,
        blockType: LessonBlockType.callout,
        contentJson: { level: 'info', text: 'Status codes indicate outcome class and result.' },
        estimatedSeconds: 45
      },
      {
        blockOrder: 3,
        blockType: LessonBlockType.code,
        contentJson: { language: 'http', snippet: 'GET /health HTTP/1.1\nHost: academy.local' },
        estimatedSeconds: 120
      }
    ]
  });

  await upsertSectionVersionWithPublishedBlocks({
    sectionId: sectionOne.id,
    versionNumber: 2,
    status: SectionVersionStatus.draft,
    changeLog: 'Draft with upcoming quiz tweaks',
    createdBy: user.id
  });

  await upsertSectionVersionWithPublishedBlocks({
    sectionId: sectionTwo.id,
    versionNumber: 1,
    status: SectionVersionStatus.published,
    changeLog: 'Initial published version',
    createdBy: user.id,
    publishedBlocks: [
      {
        blockOrder: 1,
        blockType: LessonBlockType.markdown,
        contentJson: { markdown: '# Headers\nHeaders carry metadata for requests and responses.' },
        estimatedSeconds: 80
      },
      {
        blockOrder: 2,
        blockType: LessonBlockType.quiz,
        contentJson: {
          prompt: 'Which header commonly carries auth tokens?',
          options: ['Accept', 'Authorization', 'Cache-Control'],
          answer: 'Authorization'
        },
        estimatedSeconds: 60
      },
      {
        blockOrder: 3,
        blockType: LessonBlockType.checklist,
        contentJson: { items: ['Inspect Set-Cookie', 'Validate HttpOnly', 'Validate SameSite'] },
        estimatedSeconds: 75
      }
    ]
  });

  await upsertSectionVersionWithPublishedBlocks({
    sectionId: sectionTwo.id,
    versionNumber: 2,
    status: SectionVersionStatus.draft,
    changeLog: 'Draft adding new cookie examples',
    createdBy: user.id
  });

  const sectionOnePublishedVersion = await prisma.sectionVersion.findUnique({
    where: {
      sectionId_versionNumber: {
        sectionId: sectionOne.id,
        versionNumber: 1
      }
    },
    select: { id: true }
  });

  if (sectionOnePublishedVersion) {
    await replaceSeedQuestionsForVersion({
      sectionVersionId: sectionOnePublishedVersion.id,
      questions: [
        {
          type: QuestionType.mcq,
          prompt: 'Which HTTP method is typically used for a read-only fetch operation?',
          optionsJson: {
            options: ['GET', 'POST', 'DELETE', 'PATCH']
          },
          answerKeyJson: { correct_option: 'GET' },
          explanation: 'GET is conventionally used for safe, read-only requests.',
          points: 1,
          sortOrder: 1
        },
        {
          type: QuestionType.mcq,
          prompt: 'Which status code range represents successful responses?',
          optionsJson: {
            options: ['1xx', '2xx', '3xx', '5xx']
          },
          answerKeyJson: { correct_option: '2xx' },
          explanation: '2xx indicates that a request was successfully received and processed.',
          points: 1,
          sortOrder: 2
        },
        {
          type: QuestionType.short_answer,
          prompt: 'Name the header that identifies the destination host in an HTTP/1.1 request.',
          optionsJson: null,
          answerKeyJson: { accepted: ['host'], mode: 'exact_ci' },
          explanation: 'The Host header is required in HTTP/1.1 requests.',
          points: 1,
          sortOrder: 3
        }
      ]
    });
  }

  await replaceSeedUnlockRulesForModule({
    moduleId: module.id,
    prerequisiteSectionIds: [sectionOne.id]
  });

  console.log(
    'Seed complete: user, path, module, sections, section versions, lesson blocks, quiz questions, and unlock rules'
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
