-- Reference data the game logic depends on.

INSERT INTO categories (id, parent_id, name, icon, sort) VALUES
  ('history',      NULL, 'History',      '🏰', 10),
  ('nature',       NULL, 'Nature',       '🌲', 20),
  ('coast',        NULL, 'Baltic Coast', '🌊', 30),
  ('adventure',    NULL, 'Adventure',    '🥾', 40),
  ('photography',  NULL, 'Photography',  '📸', 50),
  ('food',         NULL, 'Food',         '🍴', 60),
  ('cities',       NULL, 'Cities',       '🏙️', 70),
  ('family',       NULL, 'Family',       '👨‍👩‍👧', 80),

  ('castles',      'history', 'Castles',        '🏰', 11),
  ('manors',       'history', 'Manor houses',   '🏛️', 12),
  ('churches',     'history', 'Churches',       '⛪', 13),
  ('fortresses',   'history', 'Fortresses',     '🛡️', 14),
  ('old-towns',    'history', 'Old towns',      '🏘️', 15),
  ('monuments',    'history', 'Monuments',      '🗿', 16),
  ('museums',      'history', 'Museums',        '🖼️', 17),

  ('forests',      'nature', 'Forests',          '🌲', 21),
  ('national-parks','nature','National parks',   '🏞️', 22),
  ('nature-trails','nature', 'Nature trails',    '🥾', 23),
  ('waterfalls',   'nature', 'Waterfalls',       '💧', 24),
  ('lakes',        'nature', 'Lakes',            '🏝️', 25),
  ('rivers',       'nature', 'Rivers',           '🏞️', 26),
  ('cliffs',       'nature', 'Cliffs',           '🪨', 27),
  ('caves',        'nature', 'Caves',            '🕳️', 28),
  ('bogs',         'nature', 'Bogs',             '🌾', 29),

  ('beaches',      'coast', 'Beaches',           '🏖️', 31),
  ('lighthouses',  'coast', 'Lighthouses',       '🗼', 32),
  ('piers',        'coast', 'Piers',             '🌉', 33),
  ('coastal-trails','coast','Coastal trails',    '🌊', 34),
  ('seaside-towns','coast', 'Seaside towns',     '⚓', 35),

  ('hiking',       'adventure', 'Hiking',              '🥾', 41),
  ('cycling',      'adventure', 'Cycling',             '🚲', 42),
  ('kayaking',     'adventure', 'Kayaking',            '🛶', 43),
  ('sup',          'adventure', 'SUP',                 '🏄', 44),
  ('climbing',     'adventure', 'Climbing',            '🧗', 45),
  ('long-routes',  'adventure', 'Long-distance routes','🧭', 46),

  ('sunrise',      'photography', 'Sunrise',      '🌅', 51),
  ('sunset',       'photography', 'Sunset',       '🌇', 52),
  ('viewpoints',   'photography', 'Viewpoints',   '🔭', 53),
  ('architecture', 'photography', 'Architecture', '🏛️', 54),
  ('wildlife',     'photography', 'Wildlife',     '🐾', 55),
  ('landscapes',   'photography', 'Landscapes',   '🏔️', 56),
  ('bridges',      'photography', 'Bridges',      '🌉', 57);

INSERT INTO regions (country, slug, name) VALUES
  ('LV', 'riga',      'Rīga'),
  ('LV', 'vidzeme',   'Vidzeme'),
  ('LV', 'kurzeme',   'Kurzeme'),
  ('LV', 'zemgale',   'Zemgale'),
  ('LV', 'latgale',   'Latgale'),
  ('LT', 'vilnius',   'Vilnius County'),
  ('LT', 'kaunas',    'Kaunas County'),
  ('LT', 'klaipeda',  'Klaipėda County'),
  ('LT', 'siauliai',  'Šiauliai County'),
  ('LT', 'aukstaitija','Aukštaitija'),
  ('LT', 'dzukija',   'Dzūkija'),
  ('EE', 'harju',     'Harju County'),
  ('EE', 'tartu',     'Tartu County'),
  ('EE', 'parnu',     'Pärnu County'),
  ('EE', 'saare',     'Saare County'),
  ('EE', 'hiiu',      'Hiiu County'),
  ('EE', 'laane-viru','Lääne-Viru County'),
  ('EE', 'ida-viru',  'Ida-Viru County'),
  ('EE', 'laane',     'Lääne County');

-- Level curve: anchor levels from the product spec, linearly interpolated between them.
WITH anchors(level, xp) AS (
  VALUES (1, 0), (2, 100), (3, 250), (4, 500), (5, 850), (10, 5000), (20, 15000), (50, 100000)
), spans AS (
  SELECT level AS l0, xp AS x0,
         lead(level) OVER (ORDER BY level) AS l1,
         lead(xp)    OVER (ORDER BY level) AS x1
  FROM anchors
), curve AS (
  SELECT g AS level,
         (x0 + (x1 - x0) * (g - l0)::numeric / (l1 - l0))::integer AS xp
  FROM spans, generate_series(l0, l1 - 1) AS g
  WHERE l1 IS NOT NULL
  UNION ALL SELECT 50, 100000
)
INSERT INTO levels (level, xp_required, title)
SELECT level, xp,
  CASE
    WHEN level >= 50 THEN 'Baltic Master'
    WHEN level >= 30 THEN 'Trailblazer'
    WHEN level >= 20 THEN 'Pathfinder'
    WHEN level >= 10 THEN 'Adventurer'
    WHEN level >= 5  THEN 'Explorer'
    ELSE 'Newcomer'
  END
FROM curve;

INSERT INTO achievements (id, title, description, icon, rule, xp_reward, sort) VALUES
  ('first-step',     'First Step',       'Complete your first challenge.',      '🥾', '{"type":"challenges_completed","count":1}',   50,  10),
  ('challenges-5',   'Getting Started',  'Complete 5 challenges.',              '⭐', '{"type":"challenges_completed","count":5}',   100, 20),
  ('challenges-10',  'On a Roll',        'Complete 10 challenges.',             '🌟', '{"type":"challenges_completed","count":10}',  150, 30),
  ('challenges-25',  'Seasoned Explorer','Complete 25 challenges.',             '💫', '{"type":"challenges_completed","count":25}',  250, 40),
  ('challenges-50',  'Relentless',       'Complete 50 challenges.',             '🔥', '{"type":"challenges_completed","count":50}',  400, 50),
  ('challenges-100', 'Centurion',        'Complete 100 challenges.',            '🏅', '{"type":"challenges_completed","count":100}', 750, 60),
  ('castle-hunter',  'Castle Hunter',    'Visit 5 castles.',                    '🏰', '{"type":"category_completed","category":"castles","count":5}',  200, 100),
  ('castle-master',  'Castle Master',    'Visit 25 castles.',                   '👑', '{"type":"category_completed","category":"castles","count":25}', 750, 110),
  ('baltic-coast',   'Baltic Coast',     'Visit 10 coastal locations.',         '🌊', '{"type":"category_completed","category":"coast","count":10}',   300, 120),
  ('road-warrior',   'Road Warrior',     'Complete challenges in 10 cities.',   '🚗', '{"type":"cities_visited","count":10}',  300, 130),
  ('three-nations',  'Three Nations',    'Complete a challenge in Latvia, Lithuania and Estonia.', '🧭', '{"type":"countries_visited","count":3}', 300, 140),
  ('latvia-explorer',    'Latvia Explorer',    'Complete the Discover Latvia collection.',    '🇱🇻', '{"type":"collection_completed","collection":"discover-latvia"}',    0, 200),
  ('lithuania-explorer', 'Lithuania Explorer', 'Complete the Discover Lithuania collection.', '🇱🇹', '{"type":"collection_completed","collection":"discover-lithuania"}', 0, 210),
  ('estonia-explorer',   'Estonia Explorer',   'Complete the Discover Estonia collection.',   '🇪🇪', '{"type":"collection_completed","collection":"discover-estonia"}',   0, 220),
  ('baltic-explorer',    'Baltic Explorer',    'Complete all three country collections.',     '🏆', '{"type":"achievements_unlocked","achievements":["latvia-explorer","lithuania-explorer","estonia-explorer"]}', 1000, 230);
