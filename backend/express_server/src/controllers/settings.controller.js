import bcrypt from 'bcrypt';
import fs from 'fs';
import prisma from '../db/prisma.js';
import { deleteDocument as esDeleteDocument, deleteUserDocuments, logAudit } from '../utils/elastic.js';

const getUserPreference = async (userId) => {
  let pref = await prisma.userPreference.findUnique({ where: { userId } });
  if (!pref) {
    pref = await prisma.userPreference.create({
      data: { userId },
    });
  }
  return pref;
};

const updateUsername = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { username } = req.body;

    if (!username?.trim()) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const clean = username.trim();

    if (clean.length < 3 || clean.length > 30) {
      return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
    }

    const existing = await prisma.user.findUnique({ where: { username: clean } });
    if (existing && existing.id !== userId) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { username: clean },
      select: { id: true, username: true, email: true, createdAt: true },
    });

    return res.status(200).json({ message: 'Username updated successfully', user: updated });
  } catch (err) {
    next(err);
  }
};

const updateEmail = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { email } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const clean = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const existing = await prisma.user.findUnique({ where: { email: clean } });
    if (existing && existing.id !== userId) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { email: clean },
      select: { id: true, username: true, email: true, createdAt: true },
    });

    return res.status(200).json({ message: 'Email updated successfully', user: updated });
  } catch (err) {
    next(err);
  }
};

const updatePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required to delete account' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    const documents = await prisma.document.findMany({
      where: { userId },
      select: { originalFilePath: true, redactedFilePath: true },
    });

    for (const doc of documents) {
      if (doc.originalFilePath && fs.existsSync(doc.originalFilePath)) {
        fs.unlinkSync(doc.originalFilePath);
      }
      if (doc.redactedFilePath && fs.existsSync(doc.redactedFilePath)) {
        fs.unlinkSync(doc.redactedFilePath);
      }
    }

    await logAudit({
      userId,
      username: user.username,
      action:   'ACCOUNT_DELETED',
    });
    await deleteUserDocuments(userId);
    await prisma.user.delete({ where: { id: userId } });

    return res.status(200).json({ message: 'Account deleted successfully' });
  } catch (err) {
    next(err);
  }
};

const deleteAllDocuments = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const documents = await prisma.document.findMany({
      where: { userId },
      select: { id: true, originalFilePath: true, redactedFilePath: true },
    });

    for (const doc of documents) {
      if (doc.originalFilePath && fs.existsSync(doc.originalFilePath)) {
        fs.unlinkSync(doc.originalFilePath);
      }
      if (doc.redactedFilePath && fs.existsSync(doc.redactedFilePath)) {
        fs.unlinkSync(doc.redactedFilePath);
      }
      await prisma.documentEntity.deleteMany({ where: { documentId: doc.id } });
    }

    await prisma.document.deleteMany({ where: { userId } });
    await deleteUserDocuments(userId);
    await logAudit({
      userId,
      username: req.user.username,
      action:   'ALL_DOCUMENTS_DELETED',
    });

    return res.status(200).json({ message: 'All documents deleted successfully' });
  } catch (err) {
    next(err);
  }
};

const getPreferences = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const pref = await getUserPreference(userId);
    return res.status(200).json({
      redactionMethod:     pref.redactionMethod,
      confidenceThreshold: pref.confidenceThreshold,
      entityTypes:         pref.entityTypes,
    });
  } catch (err) {
    next(err);
  }
};

const updatePreferences = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { redactionMethod, confidenceThreshold, entityTypes } = req.body;

    const validMethods = ['mask', 'hash', 'remove', 'fake'];
    if (redactionMethod && !validMethods.includes(redactionMethod)) {
      return res.status(400).json({ error: 'Invalid redaction method' });
    }

    if (confidenceThreshold !== undefined && (confidenceThreshold < 0 || confidenceThreshold > 100)) {
      return res.status(400).json({ error: 'Confidence threshold must be between 0 and 100' });
    }

    const pref = await prisma.userPreference.upsert({
      where: { userId },
      update: {
        ...(redactionMethod     !== undefined && { redactionMethod }),
        ...(confidenceThreshold !== undefined && { confidenceThreshold }),
        ...(entityTypes         !== undefined && { entityTypes }),
      },
      create: {
        userId,
        redactionMethod:     redactionMethod     ?? 'mask',
        confidenceThreshold: confidenceThreshold ?? 70,
        entityTypes:         entityTypes         ?? null,
      },
    });

    return res.status(200).json({
      message: 'Preferences saved successfully',
      preferences: {
        redactionMethod:     pref.redactionMethod,
        confidenceThreshold: pref.confidenceThreshold,
        entityTypes:         pref.entityTypes,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getAccountInfo = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, createdAt: true },
    });
    return res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
};

export {
  updateUsername,
  updateEmail,
  updatePassword,
  deleteAccount,
  deleteAllDocuments,
  getPreferences,
  updatePreferences,
  getAccountInfo,
};