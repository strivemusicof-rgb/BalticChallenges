// SQL for seasonal events, shared by 015_events.sql and later content migrations. Every statement is
// idempotent, so running it again only adds what is missing (new places, new events, new goals).
export const q = (value) => `'${String(value).replace(/'/g, "''")}'`;
export const json = (value) => `${q(JSON.stringify(value))}::jsonb`;
const riga = (day) => `${q(`${day} 00:00 Europe/Riga`)}::timestamptz`;

export function eventSql(events, { goals = false } = {}) {
  const lines = [];
  for (const event of events) {
    const { slug, starts, ends, xp, badgeXp, sort, en, lv, ru } = event;
    lines.push(`-- ${en.title}`);
    lines.push(
      `INSERT INTO collections (slug, title, description, icon, kind, country, xp_reward, starts_at, ends_at, status, sort, i18n)
VALUES (${q(slug)}, ${q(en.title)}, ${q(en.description)}, '', 'seasonal', 'LV', ${xp}, ${riga(starts)}, ${riga(ends)}, 'published', ${sort},
        ${json({ lv: { title: lv.title, description: lv.description }, ru: { title: ru.title, description: ru.description } })})
ON CONFLICT (slug) DO NOTHING;`,
    );
    if (goals && event.communityGoal) {
      // Only fills in a goal the admin has not set yet.
      lines.push(
        `UPDATE collections SET community_goal = ${event.communityGoal}, community_xp = ${event.communityXp ?? 0}
WHERE slug = ${q(slug)} AND community_goal = 0;`,
      );
    }

    event.places.forEach((place, index) => {
      const challenge = `${slug}-${place}`;
      // Titles are "<event>: <place name>" in each language; descriptions add the radius hint.
      // New challenges follow the event's current state, so a switched-off event stays off.
      lines.push(
        `INSERT INTO challenges (slug, title, description, type, category_id, place_id, country, region_id, difficulty, xp_reward,
                        verification, starts_at, ends_at, status, i18n)
SELECT ${q(challenge)}, ${q(`${en.short}: `)} || p.name, ${q(en.hint)} || ' ' || p.description || ' Get within ' || p.radius_m || ' m to complete.',
       'seasonal', p.category_id, p.id, p.country, p.region_id, 'casual', 150, 'gps', ev.starts_at, ev.ends_at, ev.status,
       jsonb_build_object(
         'lv', jsonb_build_object('title', ${q(`${lv.short}: `)} || coalesce(p.i18n->'lv'->>'name', p.name),
               'description', ${q(lv.hint)} || ' ' || coalesce(p.i18n->'lv'->>'description', p.description) || ' Pietuvojies ' || p.radius_m || ' m attālumā, lai izpildītu.'),
         'ru', jsonb_build_object('title', ${q(`${ru.short}: `)} || coalesce(p.i18n->'ru'->>'name', p.name),
               'description', ${q(ru.hint)} || ' ' || coalesce(p.i18n->'ru'->>'description', p.description) || ' Подойдите ближе чем на ' || p.radius_m || ' м, чтобы выполнить.'))
FROM places p, collections ev WHERE p.slug = ${q(place)} AND ev.slug = ${q(slug)}
ON CONFLICT (slug) DO NOTHING;
INSERT INTO collection_items (collection_id, challenge_id, position)
SELECT c.id, ch.id, ${index + 1} FROM collections c, challenges ch WHERE c.slug = ${q(slug)} AND ch.slug = ${q(challenge)}
ON CONFLICT DO NOTHING;`,
      );
    });

    lines.push(
      `INSERT INTO achievements (id, title, description, icon, rule, xp_reward, is_hidden, sort, i18n)
VALUES (${q(slug)}, ${q(en.badge)}, ${q(en.badgeDescription)}, '', ${json({ type: 'collection_completed', collection: slug })}, ${badgeXp}, true, 100 + ${sort},
        ${json({ lv: { title: lv.badge, description: lv.badgeDescription }, ru: { title: ru.badge, description: ru.badgeDescription } })})
ON CONFLICT (id) DO NOTHING;`,
      '',
    );
  }
  return lines;
}
