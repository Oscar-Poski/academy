import { LessonBlockType, PrismaClient, SectionVersionStatus } from '@prisma/client';

const prisma = new PrismaClient();

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

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'student@academy.local' },
    update: { name: 'Academy Student' },
    create: {
      email: 'student@academy.local',
      name: 'Academy Student'
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

  console.log('Seed complete: user, path, module, sections, section versions, lesson blocks');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
