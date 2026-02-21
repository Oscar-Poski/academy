import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, SectionVersionStatus } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Content API (e2e)', () => {
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

  it('GET /v1/paths returns aggregated counts', async () => {
    const response = await request(app.getHttpServer()).get('/v1/paths').expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);

    const seededPath = response.body.find((path: { slug: string }) => path.slug === 'web-pentest-path');
    expect(seededPath).toBeDefined();
    expect(seededPath.moduleCount).toBeGreaterThanOrEqual(1);
    expect(seededPath.sectionCount).toBeGreaterThanOrEqual(2);
  });

  it('GET /v1/paths/:pathId returns ordered module and section tree', async () => {
    const path = await prisma.path.findUnique({ where: { slug: 'web-pentest-path' } });
    expect(path).toBeTruthy();

    const response = await request(app.getHttpServer()).get(`/v1/paths/${path!.id}`).expect(200);

    expect(response.body.id).toBe(path!.id);
    expect(Array.isArray(response.body.modules)).toBe(true);
    expect(response.body.modules.length).toBeGreaterThan(0);
    expect(Array.isArray(response.body.modules[0].sections)).toBe(true);

    const moduleSortOrders = response.body.modules.map((m: { sortOrder: number }) => m.sortOrder);
    const sortedModuleSortOrders = [...moduleSortOrders].sort((a, b) => a - b);
    expect(moduleSortOrders).toEqual(sortedModuleSortOrders);
  });

  it('GET /v1/modules/:moduleId returns ordered sections', async () => {
    const module = await prisma.module.findUnique({ where: { slug: 'http-basics-module' } });
    expect(module).toBeTruthy();

    const response = await request(app.getHttpServer()).get(`/v1/modules/${module!.id}`).expect(200);

    expect(response.body.id).toBe(module!.id);
    expect(Array.isArray(response.body.sections)).toBe(true);
    expect(response.body.sections.length).toBeGreaterThanOrEqual(2);

    const sortOrders = response.body.sections.map((s: { sortOrder: number }) => s.sortOrder);
    const sortedSortOrders = [...sortOrders].sort((a, b) => a - b);
    expect(sortOrders).toEqual(sortedSortOrders);
  });

  it('GET /v1/sections/:sectionId returns published version only with navigation', async () => {
    const section = await prisma.section.findUnique({ where: { slug: 'request-response-cycle' } });
    expect(section).toBeTruthy();

    const response = await request(app.getHttpServer()).get(`/v1/sections/${section!.id}`).expect(200);

    expect(response.body.id).toBe(section!.id);
    expect(typeof response.body.sectionVersionId).toBe('string');
    expect(Array.isArray(response.body.lessonBlocks)).toBe(true);
    expect(response.body.lessonBlocks.length).toBeGreaterThanOrEqual(3);
    expect(response.body.navigation).toBeDefined();
    expect(['string', 'object']).toContain(typeof response.body.navigation.prevSectionId);
    expect(['string', 'object']).toContain(typeof response.body.navigation.nextSectionId);

    const resolvedVersion = await prisma.sectionVersion.findUnique({
      where: { id: response.body.sectionVersionId }
    });

    expect(resolvedVersion).toBeTruthy();
    expect(resolvedVersion!.status).toBe(SectionVersionStatus.published);

    const blockOrders = response.body.lessonBlocks.map((block: { blockOrder: number }) => block.blockOrder);
    const sortedBlockOrders = [...blockOrders].sort((a, b) => a - b);
    expect(blockOrders).toEqual(sortedBlockOrders);
  });
});
