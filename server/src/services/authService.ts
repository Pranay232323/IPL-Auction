import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';
import { getDb } from '../db/connection.js';
import { PublicUser, UserRecord } from '../types/domain.js';

export interface JwtPayloadClaims {
  userId: string;
  username: string;
  displayName: string;
}

const AVATAR_COLORS = [
  '#F59E0B',
  '#3B82F6',
  '#EF4444',
  '#10B981',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#F97316',
];

function pickAvatarColor(seed: string): string {
  let acc = 0;
  for (let i = 0; i < seed.length; i++) {
    acc += seed.charCodeAt(i);
  }
  return AVATAR_COLORS[acc % AVATAR_COLORS.length];
}

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.display_name,
    isGuest: Boolean(user.is_guest),
    avatarColor: user.avatar_color,
  };
}

export function signAuthToken(user: PublicUser): string {
  const payload: JwtPayloadClaims = {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
  };
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAuthToken(token: string): JwtPayloadClaims {
  return jwt.verify(token, env.jwtSecret) as JwtPayloadClaims;
}

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function registerUser(input: {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}): Promise<{ user: PublicUser; token: string }> {
  const db = getDb();
  const normalizedUsername = input.username.trim().toLowerCase();
  const normalizedEmail = input.email.trim().toLowerCase();
  const displayName = (input.displayName || input.username).trim();

  const existingByUsername = db
    .prepare('SELECT id FROM users WHERE LOWER(username) = ?')
    .get(normalizedUsername);
  if (existingByUsername) {
    throw new AuthError('Username is already taken.', 409);
  }

  const existingByEmail = db
    .prepare('SELECT id FROM users WHERE LOWER(email) = ?')
    .get(normalizedEmail);
  if (existingByEmail) {
    throw new AuthError('Email is already registered.', 409);
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const id = uuidv4();
  const avatarColor = pickAvatarColor(normalizedUsername);

  db.prepare(
    `INSERT INTO users (id, username, email, password_hash, display_name, is_guest, avatar_color)
     VALUES (?, ?, ?, ?, ?, 0, ?)`
  ).run(id, normalizedUsername, normalizedEmail, passwordHash, displayName, avatarColor);

  const created = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(id) as UserRecord;
  const publicUser = toPublicUser(created);
  const token = signAuthToken(publicUser);

  return { user: publicUser, token };
}

export async function loginUser(input: {
  identifier: string;
  password: string;
}): Promise<{ user: PublicUser; token: string }> {
  const db = getDb();
  const normalized = input.identifier.trim().toLowerCase();

  const userRow = db
    .prepare(
      'SELECT * FROM users WHERE (LOWER(username) = ? OR LOWER(email) = ?) AND is_guest = 0'
    )
    .get(normalized, normalized) as UserRecord | undefined;

  if (!userRow || !userRow.password_hash) {
    throw new AuthError('Invalid username/email or password.', 401);
  }

  const valid = await bcrypt.compare(input.password, userRow.password_hash);
  if (!valid) {
    throw new AuthError('Invalid username/email or password.', 401);
  }

  const publicUser = toPublicUser(userRow);
  const token = signAuthToken(publicUser);
  return { user: publicUser, token };
}

export function createGuestUser(displayNameInput?: string): {
  user: PublicUser;
  token: string;
} {
  const db = getDb();
  const id = uuidv4();
  const shortTag = id.slice(0, 5).toLowerCase();
  const username = `guest_${shortTag}_${Math.floor(100 + Math.random() * 900)}`;
  const displayName =
    displayNameInput && displayNameInput.trim().length >= 2
      ? displayNameInput.trim().slice(0, 28)
      : `Owner ${shortTag.toUpperCase()}`;
  const avatarColor = pickAvatarColor(id);

  db.prepare(
    `INSERT INTO users (id, username, email, password_hash, display_name, is_guest, avatar_color)
     VALUES (?, ?, NULL, NULL, ?, 1, ?)`
  ).run(id, username, displayName, avatarColor);

  const created = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(id) as UserRecord;
  const publicUser = toPublicUser(created);
  const token = signAuthToken(publicUser);
  return { user: publicUser, token };
}

export function getUserById(userId: string): PublicUser | null {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(userId) as UserRecord | undefined;
  return row ? toPublicUser(row) : null;
}

export function updateDisplayName(userId: string, displayName: string): PublicUser {
  const db = getDb();
  const trimmed = displayName.trim();
  db.prepare(
    `UPDATE users SET display_name = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(trimmed, userId);
  const row = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(userId) as UserRecord | undefined;
  if (!row) {
    throw new AuthError('User not found.', 404);
  }
  return toPublicUser(row);
}
