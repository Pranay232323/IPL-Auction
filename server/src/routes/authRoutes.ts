import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  AuthError,
  createGuestUser,
  loginUser,
  registerUser,
  signAuthToken,
  updateDisplayName,
} from '../services/authService.js';

export const authRouter = Router();

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(24, 'Username must be at most 24 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores'),
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  displayName: z.string().min(2).max(32).optional(),
});

const loginSchema = z.object({
  identifier: z.string().min(2, 'Enter your username or email'),
  password: z.string().min(1, 'Enter your password'),
});

const guestSchema = z.object({
  displayName: z.string().min(2).max(28).optional(),
});

const profileSchema = z.object({
  displayName: z.string().min(2).max(28),
});

authRouter.post('/register', async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' });
      return;
    }
    const result = await registerUser(parsed.data);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Registration failed due to server error.' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' });
      return;
    }
    const result = await loginUser(parsed.data);
    res.json(result);
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Login failed due to server error.' });
  }
});

authRouter.post('/guest', (req, res) => {
  try {
    const parsed = guestSchema.safeParse(req.body || {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid guest name' });
      return;
    }
    const result = createGuestUser(parsed.data.displayName);
    res.status(201).json(result);
  } catch {
    res.status(500).json({ error: 'Could not create guest session.' });
  }
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

authRouter.patch('/profile', requireAuth, (req, res) => {
  try {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success || !req.user) {
      res.status(400).json({ error: 'Display name must be 2–28 characters.' });
      return;
    }
    const updatedUser = updateDisplayName(req.user.id, parsed.data.displayName);
    const token = signAuthToken(updatedUser);
    res.json({ user: updatedUser, token });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});
