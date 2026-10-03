import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import sharp from 'sharp';

import { checkText } from '../src/domain/moderation.js';
import { processImage } from '../src/services/photos.js';

describe('checkText', () => {
  it('accepts normal adventure posts', () => {
    assert.deepEqual(checkText('Sunrise at Cēsis castle was amazing! Kalnā uzkāpām 6:00.'), { ok: true });
    assert.deepEqual(checkText('Grabbed a coffee in Tartu, see www.example.com'), { ok: true });
  });

  it('blocks slurs, including leetspeak and stretched letters', () => {
    assert.equal(checkText('you are a f4ggot').ok, false);
    assert.equal(checkText('CUNTTTT').ok, false);
  });

  it('does not match blocked terms inside other words', () => {
    assert.deepEqual(checkText('Scunthorpe is not in the Baltics'), { ok: true });
  });

  it('flags link spam', () => {
    assert.deepEqual(checkText('http://a.com http://b.com http://c.com'), { ok: false, reason: 'link_spam' });
  });
});

describe('processImage', () => {
  it('re-encodes to JPEG, strips EXIF/GPS and limits size', async () => {
    const input = await sharp({ create: { width: 3000, height: 1500, channels: 3, background: '#0B5C7A' } })
      .withExif({ IFD0: { Make: 'TestCam' }, IFD3: { GPSLatitude: '56/1 57/1 0/1' } })
      .jpeg()
      .toBuffer();
    assert.ok((await sharp(input).metadata()).exif, 'fixture should carry EXIF');

    const output = await processImage(input);
    const meta = await sharp(output.data).metadata();
    assert.equal(meta.format, 'jpeg');
    assert.equal(meta.exif, undefined);
    assert.equal(output.width, 2048);
    assert.equal(output.height, 1024);
    assert.match(output.phash, /^[01]{64}$/);
  });

  it('rejects non-images', async () => {
    await assert.rejects(processImage(Buffer.from('not an image')), { code: 'unsupported_image' });
  });
});
