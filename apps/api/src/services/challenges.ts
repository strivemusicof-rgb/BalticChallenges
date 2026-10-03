import type { DbClient } from '../db.js';
import { tr, type I18n } from '../i18n.js';

export interface ChallengeSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: string;
  categoryId: string;
  categoryName: string;
  icon: string;
  country: string | null;
  difficulty: string;
  xpReward: number;
  verification: string;
  isPro: boolean;
  endsAt: string | null;
  place: {
    id: string;
    name: string;
    city: string | null;
    lat: number;
    lng: number;
    radiusM: number;
  } | null;
  imageUrl: string | null;
  imageCredit: string | null;
  distanceM: number | null;
  userStatus: 'in_progress' | 'completed' | 'flagged' | null;
}

export interface ChallengeQuery {
  userId: string | null;
  lat?: number | undefined;
  lng?: number | undefined;
  radiusKm?: number | undefined;
  category?: string | undefined;
  countries?: string[] | undefined;
  status?: 'completed' | 'uncompleted' | 'in_progress' | undefined;
  ids?: string[] | undefined;
  search?: string | undefined;
  sort?: 'distance' | 'xp' | 'title' | 'daily' | undefined;
  excludeIds?: string[] | undefined;
  limit?: number | undefined;
}

interface Row {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: string;
  category_id: string;
  category_name: string;
  icon: string;
  country: string | null;
  difficulty: string;
  xp_reward: number;
  verification: string;
  is_pro: boolean;
  ends_at: Date | null;
  place_id: string | null;
  place_name: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  radius_m: number | null;
  image_url: string | null;
  image_credit: string | null;
  distance_m: number | null;
  user_status: ChallengeSummary['userStatus'];
  ch_i18n: I18n;
  cat_i18n: I18n;
  place_i18n: I18n;
}

export async function findChallenges(db: DbClient, query: ChallengeQuery): Promise<ChallengeSummary[]> {
  const params: unknown[] = [];
  const param = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };

  const hasPoint = query.lat !== undefined && query.lng !== undefined;
  const point = hasPoint ? `ST_SetSRID(ST_MakePoint(${param(query.lng)}::float8, ${param(query.lat)}::float8), 4326)::geography` : null;
  const userParam = param(query.userId);

  const where: string[] = [
    `ch.status = 'published'`,
    `(ch.starts_at IS NULL OR ch.starts_at <= now())`,
    `(ch.ends_at IS NULL OR ch.ends_at > now())`,
  ];
  if (point && query.radiusKm) where.push(`ST_DWithin(p.geog, ${point}, ${param(query.radiusKm * 1000)})`);
  if (query.category) {
    const category = param(query.category);
    where.push(`(ch.category_id = ${category} OR cat.parent_id = ${category})`);
  }
  if (query.countries?.length) where.push(`ch.country = ANY(${param(query.countries)}::country_code[])`);
  if (query.ids?.length) where.push(`ch.id = ANY(${param(query.ids)}::uuid[])`);
  if (query.excludeIds?.length) where.push(`ch.id <> ALL(${param(query.excludeIds)}::uuid[])`);
  if (query.search) {
    const term = param(`%${query.search.replace(/[%_\\]/g, (match) => `\\${match}`)}%`);
    where.push(`(ch.title ILIKE ${term} OR p.name ILIKE ${term} OR p.city ILIKE ${term} OR ch.i18n::text ILIKE ${term} OR p.i18n::text ILIKE ${term})`);
  }
  if (query.status === 'completed') where.push(`a.status = 'completed'`);
  if (query.status === 'in_progress') where.push(`a.status = 'in_progress'`);
  if (query.status === 'uncompleted') where.push(`(a.status IS NULL OR a.status = 'in_progress')`);

  const distance = point ? `ST_Distance(p.geog, ${point})` : 'NULL::float8';
  const orderBy = {
    distance: point ? 'distance_m ASC NULLS LAST' : 'ch.title',
    xp: 'ch.xp_reward DESC, ch.title',
    title: 'ch.title',
    // Stable per Riga calendar day, different every day.
    daily: `md5(ch.id::text || ((now() AT TIME ZONE 'Europe/Riga')::date)::text)`,
  }[query.sort ?? (point ? 'distance' : 'title')];

  const limit = param(Math.min(Math.max(query.limit ?? 50, 1), 200));

  const { rows } = await db.query<Row>(
    `SELECT ch.id, ch.slug, ch.title, ch.description, ch.type, ch.category_id, cat.name AS category_name, cat.icon,
            ch.country::text AS country, ch.difficulty, ch.xp_reward, ch.verification, ch.is_pro, ch.ends_at,
            p.id AS place_id, p.name AS place_name, p.city,
            ST_Y(p.geog::geometry) AS lat, ST_X(p.geog::geometry) AS lng, p.radius_m,
            p.images[1] AS image_url, p.image_credit, ch.i18n AS ch_i18n, cat.i18n AS cat_i18n, p.i18n AS place_i18n,
            ${distance} AS distance_m,
            a.status AS user_status
     FROM challenges ch
     JOIN categories cat ON cat.id = ch.category_id
     LEFT JOIN places p ON p.id = ch.place_id
     LEFT JOIN challenge_attempts a
       ON a.challenge_id = ch.id AND a.user_id = ${userParam}::uuid AND a.status IN ('in_progress', 'completed', 'flagged')
     WHERE ${where.join(' AND ')}
     ORDER BY ${orderBy}
     LIMIT ${limit}`,
    params,
  );
  return rows.map(toSummary);
}

function toSummary(row: Row): ChallengeSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: tr(row.ch_i18n, 'title', row.title),
    description: tr(row.ch_i18n, 'description', row.description),
    type: row.type,
    categoryId: row.category_id,
    categoryName: tr(row.cat_i18n, 'name', row.category_name),
    icon: row.icon,
    country: row.country,
    difficulty: row.difficulty,
    xpReward: row.xp_reward,
    verification: row.verification,
    isPro: row.is_pro,
    endsAt: row.ends_at?.toISOString() ?? null,
    place:
      row.place_id && row.lat !== null && row.lng !== null
        ? {
            id: row.place_id,
            name: tr(row.place_i18n, 'name', row.place_name ?? ''),
            city: row.city,
            lat: row.lat,
            lng: row.lng,
            radiusM: row.radius_m ?? 150,
          }
        : null,
    imageUrl: row.image_url,
    imageCredit: row.image_credit,
    distanceM: row.distance_m === null ? null : Math.round(row.distance_m),
    userStatus: row.user_status,
  };
}

export async function findChallengeDetail(db: DbClient, idOrSlug: string, userId: string | null) {
  const { rows } = await db.query<{ id: string }>(
    `SELECT id FROM challenges WHERE (id::text = $1 OR slug = $1) AND status = 'published'`,
    [idOrSlug],
  );
  const id = rows[0]?.id;
  if (!id) return null;
  const [summary] = await findChallenges(db, { userId, ids: [id], limit: 1 });
  if (!summary) return null;

  const [place, stats, collections, steps] = await Promise.all([
    summary.place
      ? db.query<{
          terrain: string | null;
          accessibility: string | null;
          est_duration_min: number | null;
          family_friendly: boolean | null;
          dog_friendly: boolean | null;
          parking: boolean | null;
          season_months: number[];
          opening_hours: unknown;
          official_url: string | null;
          temporarily_closed: boolean;
          difficulty: string;
          images: string[];
          region: string | null;
        }>(
          `SELECT p.terrain, p.accessibility, p.est_duration_min, p.family_friendly, p.dog_friendly, p.parking,
                  p.season_months, p.opening_hours, p.official_url, p.temporarily_closed, p.difficulty, p.images,
                  r.name AS region
           FROM places p LEFT JOIN regions r ON r.id = p.region_id WHERE p.id = $1`,
          [summary.place.id],
        )
      : null,
    db.query<{ explorers: number }>(
      `SELECT count(*) AS explorers FROM challenge_attempts WHERE challenge_id = $1 AND status = 'completed'`,
      [id],
    ),
    db.query<{ slug: string; title: string; icon: string; i18n: I18n }>(
      `SELECT c.slug, c.title, c.icon, c.i18n FROM collection_items ci JOIN collections c ON c.id = ci.collection_id
       WHERE ci.challenge_id = $1 AND c.status = 'published' ORDER BY c.sort`,
      [id],
    ),
    db.query<{
      id: string;
      position: number;
      title: string;
      place_id: string | null;
      place_name: string | null;
      place_i18n: I18n;
      lat: number;
      lng: number;
      radius_m: number;
      image_url: string | null;
      steps_done: number | null;
    }>(
      `SELECT s.id, s.position, s.title, s.place_id, p.name AS place_name, p.i18n AS place_i18n,
              ST_Y(coalesce(s.geog, p.geog)::geometry) AS lat, ST_X(coalesce(s.geog, p.geog)::geometry) AS lng,
              coalesce(s.radius_m, p.radius_m, 150) AS radius_m, p.images[1] AS image_url,
              (SELECT a.steps_done FROM challenge_attempts a WHERE a.challenge_id = s.challenge_id AND a.user_id = $2::uuid
                 AND a.status IN ('in_progress', 'completed', 'flagged')) AS steps_done
       FROM challenge_steps s LEFT JOIN places p ON p.id = s.place_id
       WHERE s.challenge_id = $1 ORDER BY s.position`,
      [id, userId],
    ),
  ]);

  const placeRow = place?.rows[0];
  return {
    ...summary,
    explorers: stats.rows[0]?.explorers ?? 0,
    steps: steps.rows.map((step) => ({
      id: step.id,
      position: step.position,
      title: step.place_name ? tr(step.place_i18n, 'name', step.place_name) : step.title,
      placeId: step.place_id,
      lat: step.lat,
      lng: step.lng,
      radiusM: step.radius_m,
      imageUrl: step.image_url,
      done: summary.userStatus === 'completed' || (step.steps_done ?? 0) >= step.position,
    })),
    collections: collections.rows.map(({ i18n, ...row }) => ({ ...row, title: tr(i18n, 'title', row.title) })),
    safety: placeRow
      ? {
          difficulty: placeRow.difficulty,
          terrain: placeRow.terrain,
          accessibility: placeRow.accessibility,
          estimatedDurationMin: placeRow.est_duration_min,
          familyFriendly: placeRow.family_friendly,
          dogFriendly: placeRow.dog_friendly,
          parking: placeRow.parking,
          seasonMonths: placeRow.season_months,
          openingHours: placeRow.opening_hours,
          officialUrl: placeRow.official_url,
          temporarilyClosed: placeRow.temporarily_closed,
          region: placeRow.region,
        }
      : null,
    images: placeRow?.images ?? [],
  };
}
