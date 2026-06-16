import prisma from '../db/prisma.js';

const HOURLY_LIMIT = 10;

const getOneHourAgo = () => {
  const now = new Date();
  now.setHours(now.getHours() - 1);
  return now;
};

const getUploadCountThisHour = async (userId) => {
  return await prisma.uploadTracking.count({
    where: {
      userId,
      uploadedAt: { gte: getOneHourAgo() },
    },
  });
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

const uploadLimit = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const count = await getUploadCountThisHour(userId);

    if (count >= HOURLY_LIMIT) {
      const resetsInMinutes = await getResetTime(userId);
      return res.status(429).json({
        error:           'Hourly upload limit reached',
        limit:           HOURLY_LIMIT,
        used:            count,
        resetsInMinutes,
      });
    }

    req.uploadsThisHour = count;
    next();
  } catch (err) {
    next(err);
  }
};

export default uploadLimit;