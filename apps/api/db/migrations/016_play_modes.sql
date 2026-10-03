-- New ways to play: level-gated challenges, photo challenges, route (distance) challenges,
-- "visit all of these in any order" challenges, and friend duels.

ALTER TABLE challenges ADD COLUMN min_level integer NOT NULL DEFAULT 1 CHECK (min_level BETWEEN 1 AND 100);

-- GPS tracks submitted for route challenges (kept as proof and for future route posts).
CREATE TABLE route_tracks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id   uuid NOT NULL REFERENCES challenge_attempts(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  distance_m   integer NOT NULL,
  duration_s   integer NOT NULL,
  points       jsonb NOT NULL,
  verdict      text NOT NULL CHECK (verdict IN ('accepted', 'rejected', 'flagged')),
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX route_tracks_user_idx ON route_tracks(user_id, created_at DESC);

-- Head-to-head friend challenges ("who completes more challenges this week?").
CREATE TABLE duels (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opponent_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric         text NOT NULL CHECK (metric IN ('challenges', 'xp', 'places')),
  duration_days  integer NOT NULL CHECK (duration_days BETWEEN 1 AND 31),
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'declined', 'cancelled', 'finished')),
  starts_at      timestamptz,
  ends_at        timestamptz,
  winner_id      uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (challenger_id <> opponent_id)
);
CREATE INDEX duels_challenger_idx ON duels(challenger_id, created_at DESC);
CREATE INDEX duels_opponent_idx ON duels(opponent_id, created_at DESC);

ALTER TABLE xp_events DROP CONSTRAINT xp_events_source_check;
ALTER TABLE xp_events ADD CONSTRAINT xp_events_source_check
  CHECK (source IN ('challenge', 'achievement', 'collection', 'daily', 'weekly', 'monthly', 'goal', 'streak', 'admin', 'duel'));

-- ---- Content -------------------------------------------------------------------------------

CREATE TEMP TABLE mode_src (
  slug text, type text, verification text, place text, category text, difficulty text, xp integer, min_level integer,
  requirements jsonb, title text, description text, lv_title text, lv_description text, ru_title text, ru_description text,
  stops text[]
) ON COMMIT DROP;

INSERT INTO mode_src VALUES
  -- Photo challenges: GPS check-in plus a photo taken there.
  ('photo-kolka-sunset', 'photo', 'gps_photo', 'cape-kolka', 'sunset', 'explorer', 250, 1, '{}',
   'Photograph the sunset at Cape Kolka', 'Catch the sun going down where two seas meet, and take a photo to complete.',
   'Nofotografē saulrietu Kolkasragā', 'Noķer saulrietu vietā, kur satiekas divas jūras, un uzņem foto, lai izpildītu.',
   'Сфотографируйте закат на мысе Колка', 'Поймайте закат там, где встречаются два моря, и сделайте фото.', NULL),
  ('photo-rundale-garden', 'photo', 'gps_photo', 'rundale-palace', 'photography', 'casual', 200, 1, '{}',
   'Photograph the Rundāle rose garden', 'Find the best view of the palace from its French garden and take a photo.',
   'Nofotografē Rundāles rožu dārzu', 'Atrodi labāko skatu uz pili no franču dārza un uzņem foto.',
   'Сфотографируйте розарий Рундале', 'Найдите лучший вид на дворец из французского сада и сделайте фото.', NULL),
  ('photo-turaida-tower', 'photo', 'gps_photo', 'turaida-castle', 'viewpoints', 'casual', 200, 1, '{}',
   'Photograph Gauja from Turaida tower', 'Climb the main tower and photograph the valley below.',
   'Nofotografē Gauju no Turaidas torņa', 'Uzkāp galvenajā tornī un nofotografē ieleju.',
   'Сфотографируйте Гаую с башни Турайды', 'Поднимитесь на главную башню и сфотографируйте долину.', NULL),
  -- Route challenges: record a walk of at least the given distance that starts near the place.
  ('route-jurmala-beach-5k', 'route', 'route', 'jurmala-beach', 'hiking', 'casual', 300, 1, '{"distanceKm": 5, "maxSpeedKmh": 25}',
   'Walk 5 km along Jūrmala beach', 'Start near Majori and record a 5 km walk or run along the sea.',
   'Noej 5 km gar Jūrmalas pludmali', 'Sāc pie Majoriem un ieraksti 5 km pastaigu vai skrējienu gar jūru.',
   'Пройдите 5 км по пляжу Юрмалы', 'Начните у Майори и запишите прогулку или пробежку 5 км вдоль моря.', NULL),
  ('route-kemeri-bog-3k', 'route', 'route', 'kemeri-bog', 'nature-trails', 'casual', 250, 1, '{"distanceKm": 3, "maxSpeedKmh": 15}',
   'Walk the Great Ķemeri Bog trail', 'Record the full 3 km boardwalk loop through the bog.',
   'Izstaigā Lielā Ķemeru tīreļa taku', 'Ieraksti visu 3 km laipu loku cauri purvam.',
   'Пройдите тропу по Большому Кемерскому болоту', 'Запишите весь 3-километровый круг по дощатой тропе.', NULL),
  ('route-sigulda-10k', 'route', 'route', 'sigulda-castle', 'hiking', 'adventurer', 600, 10, '{"distanceKm": 10, "maxSpeedKmh": 25}',
   'Gauja valley 10 km hike', 'For level 10+ explorers: record a 10 km hike in the Gauja valley starting in Sigulda.',
   'Gaujas ielejas 10 km pārgājiens', '10. līmeņa ceļotājiem: ieraksti 10 km pārgājienu Gaujas ielejā, sākot Siguldā.',
   'Поход 10 км по долине Гауи', 'Для исследователей 10+ уровня: запишите поход на 10 км по долине Гауи от Сигулды.', NULL),
  -- Collection challenges: visit every place, in any order.
  ('set-riga-churches', 'collection', 'gps', 'riga-cathedral', 'churches', 'casual', 450, 1, '{"anyOrder": true}',
   'Three churches of Old Rīga', 'Visit the Dome, St. Peter''s and the House of the Blackheads square, in any order.',
   'Trīs Vecrīgas baznīcas', 'Apmeklē Domu, Sv. Pētera baznīcu un Rātslaukumu jebkurā secībā.',
   'Три храма Старой Риги', 'Посетите Домский собор, церковь Святого Петра и Ратушную площадь в любом порядке.',
   ARRAY['riga-cathedral', 'st-peters-riga', 'house-of-blackheads']),
  ('set-kurzeme-coast', 'collection', 'gps', 'cape-kolka', 'coast', 'explorer', 700, 1, '{"anyOrder": true}',
   'Kurzeme coast road trip', 'Cape Kolka, Slītere lighthouse, Ventspils beach and Liepāja beach, in any order.',
   'Kurzemes piekrastes ceļojums', 'Kolkasrags, Slīteres bāka, Ventspils un Liepājas pludmales jebkurā secībā.',
   'Путешествие по побережью Курземе', 'Мыс Колка, маяк Слитере, пляжи Вентспилса и Лиепаи в любом порядке.',
   ARRAY['cape-kolka', 'slitere-lighthouse', 'ventspils-beach', 'liepaja-beach']),
  ('set-latvian-palaces', 'collection', 'gps', 'rundale-palace', 'manors', 'explorer', 900, 10, '{"anyOrder": true}',
   'Palaces of Zemgale', 'For level 10+ explorers: Rundāle, Jelgava, Mežotne and Bauska, in any order.',
   'Zemgales pilis', '10. līmeņa ceļotājiem: Rundāle, Jelgava, Mežotne un Bauska jebkurā secībā.',
   'Дворцы Земгале', 'Для исследователей 10+ уровня: Рундале, Елгава, Межотне и Бауска в любом порядке.',
   ARRAY['rundale-palace', 'jelgava-palace', 'mezotne-palace', 'bauska-castle']);

INSERT INTO challenges (slug, title, description, type, category_id, place_id, country, region_id, difficulty, xp_reward,
                        verification, requirements, min_level, status, i18n)
SELECT s.slug, s.title, s.description, s.type::challenge_type, s.category, p.id, p.country, p.region_id, s.difficulty::difficulty,
       s.xp, s.verification::verification_type, s.requirements, s.min_level, 'published',
       jsonb_build_object('lv', jsonb_build_object('title', s.lv_title, 'description', s.lv_description),
                          'ru', jsonb_build_object('title', s.ru_title, 'description', s.ru_description))
FROM mode_src s JOIN places p ON p.slug = s.place
ON CONFLICT (slug) DO NOTHING;

INSERT INTO challenge_steps (challenge_id, position, title, kind, place_id, geog, radius_m)
SELECT ch.id, stop.position, p.name, 'visit', p.id, p.geog, p.radius_m
FROM mode_src s
JOIN challenges ch ON ch.slug = s.slug
CROSS JOIN LATERAL unnest(s.stops) WITH ORDINALITY AS stop(slug, position)
JOIN places p ON p.slug = stop.slug
WHERE s.stops IS NOT NULL
ON CONFLICT (challenge_id, position) DO NOTHING;
