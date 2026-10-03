import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import sharp, { type Sharp } from 'sharp';

import type { Config } from '../config.js';
import type { DbClient } from '../db.js';
import { badRequest } from '../errors.js';

export const PHOTO_MAX_BYTES = 12 * 1024 * 1024;
const MAX_EDGE = 2048;

export interface ProcessedImage {
  data: Buffer;
  width: number;
  height: number;
  /** 64-bit difference hash as a string of 0/1, for duplicate detection. */
  phash: string;
}

/**
 * Re-encodes an upload to JPEG. Re-encoding drops every metadata block (EXIF, GPS, XMP),
 * which keeps photo locations private and neutralises malformed-container tricks.
 */
export async function processImage(input: Buffer, maxEdge = MAX_EDGE): Promise<ProcessedImage> {
  let image: Sharp;
  try {
    image = sharp(input, { failOn: 'error', limitInputPixels: 50_000_000 }).rotate();
    const meta = await image.metadata();
    if (!meta.format || !['jpeg', 'png', 'webp', 'heif', 'avif'].includes(meta.format)) {
      throw new Error('unsupported');
    }
  } catch {
    throw badRequest('unsupported_image', 'Upload a JPEG, PNG, WebP or HEIC image');
  }

  const { data, info } = await image
    .resize(maxEdge, maxEdge, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  return { data, width: info.width, height: info.height, phash: await differenceHash(data) };
}

export async function differenceHash(input: Buffer): Promise<string> {
  const pixels = await sharp(input).grayscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer();
  let bits = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      bits += pixels[row * 9 + col]! > pixels[row * 9 + col + 1]! ? '1' : '0';
    }
  }
  return bits;
}

export function createPhotoStore(config: Config) {
  const uploadsBase = `${config.PUBLIC_BASE_URL.replace(/\/$/, '')}/uploads/`;

  const urlFor = (storageKey: string) => `${uploadsBase}${storageKey}`;

  function localPathForUrl(url: string | null): string | null {
    if (!url?.startsWith(uploadsBase)) return null;
    const relative = url.slice(uploadsBase.length);
    if (relative.includes('..')) return null;
    return path.join(config.UPLOAD_DIR, relative);
  }

  async function write(storageKey: string, data: Buffer) {
    const target = path.join(config.UPLOAD_DIR, storageKey);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data);
  }

  async function removeKey(storageKey: string) {
    await unlink(path.join(config.UPLOAD_DIR, storageKey)).catch(() => undefined);
  }

  async function removeUrl(url: string | null) {
    const file = localPathForUrl(url);
    if (file) await unlink(file).catch(() => undefined);
  }

  /** Stores a processed photo and its row; returns the photo plus any earlier near-duplicates by other users. */
  async function savePhoto(db: DbClient, userId: string, input: Buffer) {
    const image = await processImage(input);
    const storageKey = `photos/${userId}/${randomUUID()}.jpg`;
    await write(storageKey, image.data);
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO photos (user_id, storage_key, mime_type, width, height, bytes, phash)
       VALUES ($1, $2, 'image/jpeg', $3, $4, $5, $6::bit(64)) RETURNING id`,
      [userId, storageKey, image.width, image.height, image.data.length, image.phash],
    );
    const duplicates = await db.query<{ id: string }>(
      `SELECT id FROM photos
       WHERE user_id <> $1 AND phash IS NOT NULL
         AND length(replace((phash # $2::bit(64))::text, '0', '')) <= 4
       LIMIT 5`,
      [userId, image.phash],
    );
    return {
      id: rows[0]!.id,
      url: urlFor(storageKey),
      width: image.width,
      height: image.height,
      duplicateOf: duplicates.rows.map((row) => row.id),
    };
  }

  return { urlFor, localPathForUrl, write, removeKey, removeUrl, savePhoto };
}

export type PhotoStore = ReturnType<typeof createPhotoStore>;
