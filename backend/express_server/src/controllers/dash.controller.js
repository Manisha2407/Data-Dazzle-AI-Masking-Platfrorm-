import prisma from '../db/prisma.js';

const HOURLY_LIMIT = 10;

const getOneHourAgo = () => {
  const now = new Date();
  now.setHours(now.getHours() - 1);
  return now;
};

const getStartOfWeek = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  now.setDate(diff);
  now.setHours(0, 0, 0, 0);
  return now;
};

const getResetTime = async (userId) => {
  const oldest = await prisma.uploadTracking.findFirst({
    where: {
      userId,
      uploadedAt: { gte: getOneHourAgo() },
    },
    orderBy: { uploadedAt: 'asc' },
  });

  if (!oldest) return 60;

  const resetAt = new Date(oldest.uploadedAt.getTime() + 60 * 60 * 1000);
  const msLeft = resetAt - Date.now();
  return Math.max(1, Math.ceil(msLeft / 1000 / 60));
};

const getStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const allTime = await prisma.document.aggregate({
      where: { userId, status: 'complete' },
      _count: { id: true },
      _sum:   { totalEntities: true },
      _avg:   { processingTimeMs: true },
    });

    const allEntities = await prisma.documentEntity.aggregate({
      where: { document: { userId } },
      _avg: { confidence: true },
    });

    const thisWeek = await prisma.document.aggregate({
      where: {
        userId,
        status: 'complete',
        createdAt: { gte: getStartOfWeek() },
      },
      _count: { id: true },
      _sum:   { totalEntities: true },
    });

    return res.status(200).json({
      allTime: {
        totalDocuments:    allTime._count.id || 0,
        totalEntities:     allTime._sum.totalEntities || 0,
        avgConfidence:     allEntities._avg.confidence
                            ? Math.round(allEntities._avg.confidence * 100)
                            : 0,
        avgProcessingTime: allTime._avg.processingTimeMs
                            ? (allTime._avg.processingTimeMs / 1000).toFixed(1)
                            : '0.0',
      },
      thisWeek: {
        totalDocuments: thisWeek._count.id || 0,
        totalEntities:  thisWeek._sum.totalEntities || 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getUsage = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const count = await prisma.uploadTracking.count({
      where: {
        userId,
        uploadedAt: { gte: getOneHourAgo() },
      },
    });

    const resetsInMinutes = await getResetTime(userId);

    return res.status(200).json({
      used:            count,
      limit:           HOURLY_LIMIT,
      remaining:       Math.max(0, HOURLY_LIMIT - count),
      resetsInMinutes,
    });
  } catch (err) {
    next(err);
  }
};

const getEntityBreakdown = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const grouped = await prisma.documentEntity.groupBy({
      by: ['entityType'],
      where: { document: { userId } },
      _count: { entityType: true },
      orderBy: { _count: { entityType: 'desc' } },
    });

    const total = grouped.reduce((sum, g) => sum + g._count.entityType, 0);

    const breakdown = grouped.map(g => ({
      entityType:  g.entityType,
      count:       g._count.entityType,
      percentage:  total > 0
                    ? Math.round((g._count.entityType / total) * 100)
                    : 0,
    }));

    return res.status(200).json({ total, breakdown });
  } catch (err) {
    next(err);
  }
};

const getRecentDocuments = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const documents = await prisma.document.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      take:    5,
      select: {
        id:               true,
        filename:         true,
        fileType:         true,
        status:           true,
        totalEntities:    true,
        processingTimeMs: true,
        createdAt:        true,
        originalDeleted:  true,
      },
    });

    return res.status(200).json({ documents });
  } catch (err) {
    next(err);
  }
};

export { getStats, getUsage, getEntityBreakdown, getRecentDocuments };