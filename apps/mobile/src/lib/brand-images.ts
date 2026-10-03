import { API_URL } from '@/lib/api';

/** Decorative photos (Wikimedia Commons, served from our uploads) with their required credit lines. */
export const BRAND_IMAGES = {
  welcome: {
    uri: `${API_URL}/uploads/places/2a4ef261-1958-41a7-a45e-3d6b96757415.jpg`,
    credit: 'Trakai Island Castle · BigHead · CC BY-SA 4.0',
  },
  profileCover: {
    uri: `${API_URL}/uploads/places/7531be69-ad3d-4d18-86b9-c3bf0fd0540d.jpg`,
    credit: 'Cēsis Castle · CesisCastle · CC BY-SA 4.0',
  },
} as const;
