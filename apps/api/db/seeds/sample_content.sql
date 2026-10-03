-- Development / beta sample content. Idempotent: safe to re-run.
-- Coordinates are approximate and must pass the Phase 5 content QA before launch.

WITH src(slug, name, description, country, region, city, category, lat, lng, radius_m, difficulty, terrain, duration_min, family, dog, parking, xp) AS (
  VALUES
  -- Latvia
  ('turaida-castle',      'Turaida Castle',          'Red-brick medieval castle above the Gauja valley.',                'LV','vidzeme','Sigulda',   'castles',      57.1828, 24.8490, 250,'casual',   'Paved paths, some stairs',  90,  true,  true,  true,  150),
  ('cesis-castle',        'Cēsis Medieval Castle',   'One of the best-preserved Livonian Order castles in Latvia.',      'LV','vidzeme','Cēsis',     'castles',      57.3130, 25.2705, 250,'casual',   'Cobblestones, tower stairs',90,  true,  false, true,  150),
  ('bauska-castle',       'Bauska Castle',           'Castle ruins and palace where the Mūsa and Mēmele rivers meet.',   'LV','zemgale','Bauska',    'castles',      56.4015, 24.1770, 250,'casual',   'Grass and gravel',          60,  true,  true,  true,  150),
  ('rundale-palace',      'Rundāle Palace',          'Baroque palace by Rastrelli with French-style gardens.',           'LV','zemgale','Pilsrundāle','manors',      56.4136, 24.0247, 300,'casual',   'Flat gardens',              120, true,  false, true,  150),
  ('riga-old-town',       'Rīga Old Town',           'UNESCO-listed medieval centre of Rīga.',                           'LV','riga',   'Rīga',      'old-towns',    56.9474, 24.1068, 300,'casual',   'Cobblestones',              120, true,  true,  false, 100),
  ('gutmanis-cave',       'Gūtmaņa Cave',            'The largest grotto in the Baltics, carved into sandstone.',        'LV','vidzeme','Sigulda',   'caves',        57.1755, 24.8463, 200,'casual',   'Forest path, stairs',       30,  true,  true,  true,  100),
  ('venta-rapid',         'Ventas Rumba',            'The widest waterfall in Europe, in Kuldīga.',                      'LV','kurzeme','Kuldīga',   'waterfalls',   56.9681, 21.9786, 250,'casual',   'Riverbank, flat',           45,  true,  true,  true,  100),
  ('cape-kolka',          'Cape Kolka',              'Where the Gulf of Rīga meets the open Baltic Sea.',                'LV','kurzeme','Kolka',     'beaches',      57.7570, 22.5960, 400,'casual',   'Sand',                      60,  true,  true,  true,  150),
  ('jurmala-beach',       'Jūrmala Beach',           'Long white-sand beach at Majori.',                                 'LV','riga',   'Jūrmala',   'beaches',      56.9790, 23.7960, 500,'casual',   'Sand',                      60,  true,  true,  true,  75),
  ('daugavpils-fortress', 'Daugavpils Fortress',     'The last bastion fortress of its type built in the Russian Empire.','LV','latgale','Daugavpils','fortresses',  55.8855, 26.5150, 500,'casual',   'Flat, paved',               90,  true,  true,  true,  150),
  ('sigulda-castle',      'Sigulda Medieval Castle', 'Livonian Order castle ruins next to the New Castle.',              'LV','vidzeme','Sigulda',   'castles',      57.1640, 24.8510, 200,'casual',   'Paved paths',               45,  true,  true,  true,  150),
  ('kemeri-bog',          'Great Ķemeri Bog Boardwalk','Boardwalk trail across a raised bog in Ķemeri National Park.',   'LV','kurzeme','Jūrmala',   'bogs',         56.9200, 23.4800, 500,'explorer', 'Wooden boardwalk',          75,  true,  false, true,  125),

  -- Lithuania
  ('trakai-castle',       'Trakai Island Castle',    'Gothic red-brick castle on an island in Lake Galvė.',              'LT','vilnius','Trakai',    'castles',      54.6522, 24.9336, 300,'casual',   'Bridges, paved',            120, true,  true,  true,  150),
  ('gediminas-tower',     'Gediminas Tower',         'The symbol of Vilnius, on top of Castle Hill.',                    'LT','vilnius','Vilnius',   'castles',      54.6867, 25.2905, 150,'casual',   'Steep path or funicular',   45,  true,  true,  false, 150),
  ('vilnius-old-town',    'Vilnius Old Town',        'One of the largest surviving medieval old towns in Europe.',       'LT','vilnius','Vilnius',   'old-towns',    54.6810, 25.2870, 400,'casual',   'Cobblestones',              120, true,  true,  false, 100),
  ('kaunas-castle',       'Kaunas Castle',           'Gothic castle at the confluence of the Neris and Nemunas.',        'LT','kaunas', 'Kaunas',    'castles',      54.8988, 23.8853, 200,'casual',   'Flat, paved',               45,  true,  true,  true,  150),
  ('hill-of-crosses',     'Hill of Crosses',         'Pilgrimage site with hundreds of thousands of crosses.',           'LT','siauliai','Šiauliai', 'monuments',    56.0153, 23.4167, 250,'casual',   'Gravel paths',              45,  true,  true,  true,  150),
  ('parnidis-dune',       'Parnidis Dune',           'Huge drifting dune on the Curonian Spit near Nida.',               'LT','klaipeda','Nida',     'viewpoints',   55.2918, 21.0063, 400,'explorer', 'Sand, stairs',              60,  true,  false, true,  150),
  ('klaipeda-old-town',   'Klaipėda Old Town',       'Half-timbered old town of Lithuania''s port city.',                'LT','klaipeda','Klaipėda', 'old-towns',    55.7110, 21.1310, 300,'casual',   'Cobblestones',              90,  true,  true,  false, 100),
  ('kernave-mounds',      'Kernavė Hillforts',       'UNESCO archaeological site with five hillforts.',                  'LT','vilnius','Kernavė',   'monuments',    54.8870, 24.8510, 400,'explorer', 'Grass hills',               90,  true,  true,  true,  150),
  ('palanga-pier',        'Palanga Pier',            'Iconic pier for sunsets on the Baltic Sea.',                       'LT','klaipeda','Palanga',  'piers',        55.9180, 21.0480, 250,'casual',   'Wooden pier',               30,  true,  true,  false, 75),
  ('medininkai-castle',   'Medininkai Castle',       'One of the largest enclosure-type castles in Lithuania.',          'LT','vilnius','Medininkai','castles',      54.5400, 25.6500, 250,'casual',   'Grass',                     45,  true,  true,  true,  150),

  -- Estonia
  ('tallinn-old-town',    'Tallinn Old Town',        'Exceptionally intact medieval Hanseatic town.',                    'EE','harju',  'Tallinn',   'old-towns',    59.4370, 24.7450, 300,'casual',   'Cobblestones, hills',       120, true,  true,  false, 100),
  ('toompea-castle',      'Toompea Castle',          'Hilltop castle that houses the Estonian parliament.',              'EE','harju',  'Tallinn',   'castles',      59.4357, 24.7390, 200,'casual',   'Steep streets',             45,  true,  true,  false, 150),
  ('kuressaare-castle',   'Kuressaare Episcopal Castle','Best-preserved medieval stone castle in the Baltics.',          'EE','saare',  'Kuressaare','castles',      58.2470, 22.4790, 250,'casual',   'Flat, paved',               90,  true,  true,  true,  150),
  ('rakvere-castle',      'Rakvere Castle',          'Order castle on Vallimägi hill with a medieval theme park.',       'EE','laane-viru','Rakvere','castles',      59.3460, 26.3540, 250,'casual',   'Hill, gravel',              90,  true,  true,  true,  150),
  ('jagala-waterfall',    'Jägala Waterfall',        'The highest natural waterfall in Estonia.',                        'EE','harju',  'Jägala',    'waterfalls',   59.4497, 25.1717, 250,'casual',   'Riverbank, uneven',         30,  true,  true,  true,  100),
  ('viru-bog',            'Viru Bog Boardwalk',      'Boardwalk with an observation tower in Lahemaa National Park.',    'EE','harju',  'Lahemaa',   'bogs',         59.4630, 25.6440, 600,'explorer', 'Wooden boardwalk',          90,  true,  false, true,  125),
  ('tartu-town-hall',     'Tartu Town Hall Square',  'Heart of Estonia''s university city.',                             'EE','tartu',  'Tartu',     'old-towns',    58.3806, 26.7225, 200,'casual',   'Flat, paved',               45,  true,  true,  false, 100),
  ('parnu-beach',         'Pärnu Beach',             'Estonia''s summer capital beach.',                                 'EE','parnu',  'Pärnu',     'beaches',      58.3740, 24.4980, 500,'casual',   'Sand',                      60,  true,  true,  true,  75),
  ('narva-castle',        'Narva Castle',            'Hermann Castle on the border river facing Ivangorod.',             'EE','ida-viru','Narva',    'castles',      59.3770, 28.2020, 250,'casual',   'Paved',                     60,  true,  true,  true,  150),
  ('kopu-lighthouse',     'Kõpu Lighthouse',         'One of the oldest continuously operating lighthouses in the world.','EE','hiiu',  'Kõpu',      'lighthouses',  58.9160, 22.1990, 250,'casual',   'Stairs inside tower',       45,  true,  true,  true,  150),
  ('haapsalu-castle',     'Haapsalu Episcopal Castle','Castle ruins famous for the legend of the White Lady.',           'EE','laane',  'Haapsalu',  'castles',      58.9440, 23.5390, 200,'casual',   'Grass, paved',              60,  true,  true,  true,  150)
), upserted AS (
  INSERT INTO places (slug, name, description, country, region_id, city, category_id, geog, radius_m,
                      difficulty, terrain, est_duration_min, family_friendly, dog_friendly, parking, status)
  SELECT s.slug, s.name, s.description, s.country::country_code, r.id, s.city, s.category,
         ST_SetSRID(ST_MakePoint(s.lng, s.lat), 4326)::geography, s.radius_m,
         s.difficulty::difficulty, s.terrain, s.duration_min, s.family, s.dog, s.parking, 'published'
  FROM src s JOIN regions r ON r.slug = s.region
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description, country = EXCLUDED.country,
    region_id = EXCLUDED.region_id, city = EXCLUDED.city, category_id = EXCLUDED.category_id,
    geog = EXCLUDED.geog, radius_m = EXCLUDED.radius_m, difficulty = EXCLUDED.difficulty,
    terrain = EXCLUDED.terrain, est_duration_min = EXCLUDED.est_duration_min,
    family_friendly = EXCLUDED.family_friendly, dog_friendly = EXCLUDED.dog_friendly,
    parking = EXCLUDED.parking, status = EXCLUDED.status
  RETURNING id, slug
)
INSERT INTO challenges (slug, title, description, type, category_id, place_id, country, region_id,
                        difficulty, xp_reward, verification, status)
SELECT 'visit-' || s.slug,
       CASE WHEN c.parent_id = 'history' THEN 'Discover ' ELSE 'Visit ' END || s.name,
       s.description || ' Get within ' || s.radius_m || ' m to complete.',
       CASE WHEN c.parent_id = 'history' THEN 'discover' ELSE 'visit' END::challenge_type,
       s.category, u.id, s.country::country_code, r.id, s.difficulty::difficulty, s.xp,
       CASE WHEN c.parent_id = 'history' THEN 'gps_checkin' ELSE 'gps' END::verification_type,
       'published'
FROM src s
JOIN upserted u ON u.slug = s.slug
JOIN regions r ON r.slug = s.region
JOIN categories c ON c.id = s.category
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, type = EXCLUDED.type,
  category_id = EXCLUDED.category_id, place_id = EXCLUDED.place_id, country = EXCLUDED.country,
  region_id = EXCLUDED.region_id, difficulty = EXCLUDED.difficulty, xp_reward = EXCLUDED.xp_reward,
  verification = EXCLUDED.verification, status = EXCLUDED.status;

INSERT INTO collections (slug, title, description, icon, kind, country, xp_reward, status, sort) VALUES
  ('discover-latvia',    'Discover Latvia',    'Explore the castles, coast and forests of Latvia.',   '🇱🇻', 'country',  'LV', 1000, 'published', 10),
  ('discover-lithuania', 'Discover Lithuania', 'From Trakai to the Curonian Spit.',                   '🇱🇹', 'country',  'LT', 1000, 'published', 20),
  ('discover-estonia',   'Discover Estonia',   'Medieval towns, islands and bogs of Estonia.',        '🇪🇪', 'country',  'EE', 1000, 'published', 30),
  ('baltic-castles',     'Baltic Castles',     'Every castle across the three Baltic states.',        '🏰', 'category', NULL, 750,  'published', 40),
  ('baltic-coast',       'Baltic Coast',       'Beaches, piers and lighthouses along the Baltic Sea.','🌊', 'category', NULL, 500,  'published', 50)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, icon = EXCLUDED.icon,
  kind = EXCLUDED.kind, country = EXCLUDED.country, xp_reward = EXCLUDED.xp_reward,
  status = EXCLUDED.status, sort = EXCLUDED.sort;

INSERT INTO collection_items (collection_id, challenge_id, position)
SELECT col.id, ch.id, row_number() OVER (PARTITION BY col.id ORDER BY ch.title)
FROM collections col
JOIN challenges ch ON ch.status = 'published' AND (
     (col.kind = 'country' AND ch.country = col.country)
  OR (col.slug = 'baltic-castles' AND ch.category_id = 'castles')
  OR (col.slug = 'baltic-coast' AND ch.category_id IN (SELECT id FROM categories WHERE id = 'coast' OR parent_id = 'coast'))
)
WHERE col.slug IN ('discover-latvia', 'discover-lithuania', 'discover-estonia', 'baltic-castles', 'baltic-coast')
ON CONFLICT (collection_id, challenge_id) DO UPDATE SET position = EXCLUDED.position;
