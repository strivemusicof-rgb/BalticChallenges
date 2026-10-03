-- Beta content, batch 2: brings every country past 30 challenges and adds specialist collections.
-- Coordinates are approximate (radius is widened where unsure) and must pass content QA before launch.

WITH src(slug, name, description, country, region, city, category, lat, lng, radius_m, difficulty, terrain, duration_min, family, dog, parking, xp) AS (
  VALUES
  -- Latvia
  ('riga-cathedral',       'Rīga Cathedral',            'The largest medieval church in the Baltics, on Dome Square.',          'LV','riga',    'Rīga',       'churches',      56.9491, 24.1045, 150,'casual',  'Paved square',               45,  true,  true,  false, 100),
  ('house-of-blackheads',  'House of the Blackheads',   'Ornate Dutch Renaissance guild house on Town Hall Square.',            'LV','riga',    'Rīga',       'architecture',  56.9473, 24.1069, 150,'casual',  'Paved square',               30,  true,  true,  false, 100),
  ('freedom-monument',     'Freedom Monument',          'Milda holds three stars above Rīga — a symbol of independence.',       'LV','riga',    'Rīga',       'monuments',     56.9515, 24.1133, 150,'casual',  'Paved',                      20,  true,  true,  false, 75),
  ('riga-central-market',  'Rīga Central Market',       'Food market housed in five former Zeppelin hangars.',                 'LV','riga',    'Rīga',       'food',          56.9438, 24.1155, 250,'casual',  'Indoor, flat',               60,  true,  false, false, 100),
  ('riga-art-nouveau',     'Art Nouveau District',      'Alberta iela, lined with Eisenstein''s Art Nouveau façades.',          'LV','riga',    'Rīga',       'architecture',  56.9594, 24.1083, 200,'casual',  'Pavements',                  45,  true,  true,  false, 100),
  ('national-library-lv',  'Castle of Light',           'The National Library of Latvia on the left bank of the Daugava.',      'LV','riga',    'Rīga',       'architecture',  56.9435, 24.0948, 200,'casual',  'Paved',                      45,  true,  false, true,  100),
  ('st-peters-riga',       'St. Peter''s Church',       'Gothic church whose tower gives the best view over Old Rīga.',         'LV','riga',    'Rīga',       'viewpoints',    56.9475, 24.1092, 150,'casual',  'Lift to viewing gallery',    45,  true,  false, false, 100),
  ('karosta-north-pier',   'Karosta Northern Pier',     'Wave-battered breakwater at the former naval port of Liepāja.',        'LV','kurzeme', 'Liepāja',    'piers',         56.5570, 20.9900, 500,'casual',  'Concrete pier, uneven',      45,  true,  true,  true,  100),
  ('liepaja-beach',        'Liepāja Beach',             'Wide blue-flag beach beside the Seaside Park.',                        'LV','kurzeme', 'Liepāja',    'beaches',       56.5110, 20.9970, 600,'casual',  'Sand',                       60,  true,  true,  true,  75),
  ('kuldiga-old-town',     'Kuldīga Old Town',          'UNESCO-listed wooden old town on the Venta.',                          'LV','kurzeme', 'Kuldīga',    'old-towns',     56.9685, 21.9650, 300,'casual',  'Cobblestones',               60,  true,  true,  true,  100),
  ('ventspils-castle',     'Ventspils Castle',          'Livonian Order castle, one of the oldest in Latvia.',                  'LV','kurzeme', 'Ventspils',  'castles',       57.3955, 21.5640, 250,'casual',  'Paved',                      60,  true,  true,  true,  150),
  ('ventspils-beach',      'Ventspils Beach',           'Blue-flag beach with dunes near the Ventspils south pier.',            'LV','kurzeme', 'Ventspils',  'beaches',       57.3920, 21.5430, 600,'casual',  'Sand',                       60,  true,  true,  true,  75),
  ('aglona-basilica',      'Aglona Basilica',           'Latgale''s great pilgrimage church between two lakes.',               'LV','latgale', 'Aglona',     'churches',      56.1315, 27.0060, 300,'casual',  'Flat grounds',               45,  true,  true,  true,  125),
  ('koknese-castle',       'Koknese Castle Ruins',      'Castle ruins on the Daugava with the Garden of Destinies nearby.',     'LV','vidzeme', 'Koknese',    'castles',       56.6413, 25.4245, 300,'casual',  'Grass paths',                45,  true,  true,  true,  150),
  ('jelgava-palace',       'Jelgava Palace',            'Rastrelli''s baroque palace of the Dukes of Courland.',               'LV','zemgale', 'Jelgava',    'manors',        56.6545, 23.7325, 250,'casual',  'Flat, paved',                45,  true,  true,  true,  125),
  ('mezotne-palace',       'Mežotne Palace',            'Classicist palace above the Lielupe river.',                           'LV','zemgale', 'Mežotne',    'manors',        56.4394, 24.0517, 250,'casual',  'Park paths',                 60,  true,  true,  true,  125),
  ('krimulda-manor',       'Krimulda Manor',            'Manor house on the Gauja valley slope, across from Turaida.',          'LV','vidzeme', 'Sigulda',    'manors',        57.1760, 24.8340, 300,'casual',  'Forest paths, slopes',       60,  true,  true,  true,  125),
  ('slitere-lighthouse',   'Slītere Lighthouse',        'Lighthouse on the ancient Baltic Ice Lake shore in Slītere park.',     'LV','kurzeme', 'Slītere',    'lighthouses',   57.6285, 22.2890, 300,'casual',  'Forest road, tower stairs',  45,  true,  true,  true,  150),
  ('zvartes-iezis',        'Zvārtes Rock',              'Sandstone cliff on the Amata river in Gauja National Park.',           'LV','vidzeme', 'Amata',      'cliffs',        57.2365, 25.0405, 500,'explorer','Forest trail, steps',        90,  true,  true,  true,  150),
  ('cesis-old-town',       'Cēsis Old Town',            'Cobbled streets and St. John''s Church around the castle park.',       'LV','vidzeme', 'Cēsis',      'old-towns',     57.3118, 25.2725, 300,'casual',  'Cobblestones',               60,  true,  true,  true,  100),

  -- Lithuania
  ('vilnius-cathedral',    'Vilnius Cathedral',         'Neoclassical cathedral and bell tower on Cathedral Square.',           'LT','vilnius', 'Vilnius',    'churches',      54.6857, 25.2877, 150,'casual',  'Paved square',               30,  true,  true,  false, 100),
  ('gate-of-dawn',         'Gate of Dawn',              'The last surviving city gate of Vilnius, with its famous chapel.',     'LT','vilnius', 'Vilnius',    'monuments',     54.6741, 25.2894, 150,'casual',  'Cobblestones',               20,  true,  true,  false, 100),
  ('uzupis',               'Užupis Republic',           'Self-declared artists'' republic with its own constitution.',          'LT','vilnius', 'Vilnius',    'cities',        54.6814, 25.2955, 250,'casual',  'Cobblestones, hills',        45,  true,  true,  false, 75),
  ('st-annes-vilnius',     'St. Anne''s Church',        'Flamboyant Gothic brick church Napoleon wanted to carry to Paris.',    'LT','vilnius', 'Vilnius',    'churches',      54.6830, 25.2931, 150,'casual',  'Paved',                      20,  true,  true,  false, 100),
  ('three-crosses',        'Hill of Three Crosses',     'Viewpoint over the Vilnius Old Town rooftops.',                        'LT','vilnius', 'Vilnius',    'viewpoints',    54.6866, 25.2975, 200,'casual',  'Steep path, stairs',         45,  true,  true,  false, 125),
  ('vilnius-tv-tower',     'Vilnius TV Tower',          'The tallest structure in Lithuania with a revolving café.',            'LT','vilnius', 'Vilnius',    'viewpoints',    54.6871, 25.2149, 200,'casual',  'Lift',                       60,  true,  false, true,  100),
  ('kaunas-old-town',      'Kaunas Old Town',           'Town Hall Square, the "White Swan" of Kaunas.',                        'LT','kaunas',  'Kaunas',     'old-towns',     54.8967, 23.8857, 250,'casual',  'Cobblestones',               60,  true,  true,  false, 100),
  ('pazaislis-monastery',  'Pažaislis Monastery',       'Italian baroque monastery by the Kaunas Lagoon.',                      'LT','kaunas',  'Kaunas',     'churches',      54.8753, 24.0186, 300,'casual',  'Flat grounds',               60,  true,  true,  true,  125),
  ('ninth-fort',           'Ninth Fort',                'Fortress and memorial museum of the Kaunas Fortress ring.',            'LT','kaunas',  'Kaunas',     'fortresses',    54.9497, 23.8789, 300,'casual',  'Flat, paved',                90,  false, false, true,  150),
  ('rumsiskes-museum',     'Rumšiškės Open-Air Museum', 'Lithuanian village life across 175 hectares of farmsteads.',           'LT','kaunas',  'Rumšiškės',  'museums',       54.8600, 24.2000, 800,'casual',  'Country paths',              180, true,  true,  true,  150),
  ('witches-hill',         'Hill of Witches',           'Forest trail of wooden folk sculptures in Juodkrantė.',                'LT','klaipeda','Juodkrantė', 'nature-trails', 55.5419, 21.1173, 400,'casual',  'Forest trail, steps',        45,  true,  true,  true,  125),
  ('nida',                 'Nida',                      'Fishermen''s village of blue and brown houses on the Curonian Spit.',  'LT','klaipeda','Nida',       'seaside-towns', 55.3036, 21.0055, 400,'casual',  'Flat',                       90,  true,  true,  true,  100),
  ('smiltyne-sea-museum',  'Lithuanian Sea Museum',     'Maritime museum in a 19th-century fort at the tip of the spit.',       'LT','klaipeda','Smiltynė',   'museums',       55.7180, 21.0960, 400,'casual',  'Flat',                       120, true,  false, true,  100),
  ('birzai-castle',        'Biržai Castle',             'Bastion castle on Lake Širvėna, Lithuania''s oldest artificial lake.', 'LT','aukstaitija','Biržai',  'castles',       56.2011, 24.7564, 250,'casual',  'Grass, paved',               60,  true,  true,  true,  150),
  ('raudone-castle',       'Raudonė Castle',            'Neo-Gothic castle with a viewing tower above the Nemunas.',            'LT','kaunas',  'Raudonė',    'castles',       55.1009, 23.1241, 300,'casual',  'Park paths, tower stairs',   45,  true,  true,  true,  150),
  ('panemune-castle',      'Panemunė Castle',           'Renaissance castle in the Nemunas loops near Vilkyškiai.',             'LT','kaunas',  'Vytėnai',    'castles',       55.0784, 22.6522, 400,'casual',  'Park paths',                 45,  true,  true,  true,  150),
  ('siauliai-cathedral',   'Šiauliai Cathedral',        'Renaissance cathedral with a sundial square beside it.',               'LT','siauliai','Šiauliai',   'churches',      55.9342, 23.3134, 300,'casual',  'Paved',                      30,  true,  true,  true,  100),
  ('palanga-amber-museum', 'Palanga Amber Museum',      'Tyszkiewicz Palace in the botanical park, home of Baltic amber.',      'LT','klaipeda','Palanga',    'museums',       55.9085, 21.0647, 300,'casual',  'Park paths',                 90,  true,  false, true,  100),
  ('resurrection-church',  'Christ''s Resurrection Church','Modernist church with a rooftop terrace over Kaunas.',              'LT','kaunas',  'Kaunas',     'viewpoints',    54.8999, 23.9232, 200,'casual',  'Lift to terrace',            30,  true,  false, true,  100),
  ('anyksciai-treetop',    'Anykščiai Treetop Walk',    'Elevated walkway and tower above the Šventoji forest.',                'LT','aukstaitija','Anykščiai','nature-trails', 55.5359, 25.0836, 500,'casual',  'Boardwalk, ramps',           60,  true,  false, true,  125),
  ('grutas-park',          'Grūtas Park',               'Open-air collection of Soviet-era statues near Druskininkai.',         'LT','dzukija', 'Grūtas',     'museums',       54.0459, 24.0697, 500,'casual',  'Forest paths',               90,  true,  false, true,  125),

  -- Estonia
  ('kadriorg-palace',      'Kadriorg Palace',           'Peter the Great''s baroque palace and park.',                         'EE','harju',   'Tallinn',    'manors',        59.4383, 24.7910, 300,'casual',  'Park paths',                 90,  true,  true,  true,  125),
  ('nevsky-cathedral',     'Alexander Nevsky Cathedral','Onion-domed Orthodox cathedral on Toompea hill.',                      'EE','harju',   'Tallinn',    'churches',      59.4360, 24.7395, 150,'casual',  'Steep streets',              20,  true,  true,  false, 100),
  ('kohtuotsa-viewpoint',  'Kohtuotsa Viewpoint',       'The postcard view over Tallinn''s red roofs.',                         'EE','harju',   'Tallinn',    'viewpoints',    59.4380, 24.7400, 150,'casual',  'Steep streets',              20,  true,  true,  false, 100),
  ('telliskivi',           'Telliskivi Creative City',  'Former factory turned street-art, food and design quarter.',           'EE','harju',   'Tallinn',    'cities',        59.4400, 24.7290, 250,'casual',  'Flat',                       60,  true,  true,  true,  75),
  ('seaplane-harbour',     'Seaplane Harbour',          'Maritime museum in 1917 concrete hangars with a submarine.',           'EE','harju',   'Tallinn',    'museums',       59.4517, 24.7380, 300,'casual',  'Flat',                       120, true,  false, true,  100),
  ('tallinn-tv-tower',     'Tallinn TV Tower',          'Glass-floored viewing deck 170 m above Pirita.',                      'EE','harju',   'Tallinn',    'viewpoints',    59.4711, 24.8875, 200,'casual',  'Lift',                       60,  true,  false, true,  100),
  ('pirita-convent',       'Pirita Convent Ruins',      'Ruins of St. Bridget''s convent by the Pirita river.',                 'EE','harju',   'Tallinn',    'churches',      59.4685, 24.8355, 250,'casual',  'Grass, gravel',              45,  true,  true,  true,  100),
  ('keila-waterfall',      'Keila Waterfall',           'Waterfall and manor park on the Keila river.',                         'EE','harju',   'Keila-Joa',  'waterfalls',    59.3922, 24.3015, 300,'casual',  'Park paths, bridges',        45,  true,  true,  true,  100),
  ('pakri-lighthouse',     'Pakri Lighthouse',          'Tall lighthouse above the limestone cliffs of the Pakri peninsula.',   'EE','harju',   'Paldiski',   'lighthouses',   59.3898, 24.0395, 300,'explorer','Clifftop, keep back from edge',45, true,  true,  true,  150),
  ('palmse-manor',         'Palmse Manor',              'Restored baroque manor at the heart of Lahemaa National Park.',        'EE','laane-viru','Palmse',   'manors',        59.5075, 25.9545, 300,'casual',  'Park paths',                 90,  true,  true,  true,  125),
  ('sagadi-manor',         'Sagadi Manor',              'Pink manor house with a forest museum in Lahemaa.',                    'EE','laane-viru','Sagadi',   'manors',        59.5379, 26.0569, 300,'casual',  'Park paths',                 60,  true,  true,  true,  125),
  ('kasmu',                'Käsmu Captains'' Village',  'Seafaring village with a boulder-strewn coastal trail.',               'EE','laane-viru','Käsmu',    'seaside-towns', 59.6030, 25.9170, 500,'casual',  'Village roads, rocky shore', 90,  true,  true,  true,  100),
  ('toome-hill',           'Toome Hill',                'Park with the ruins of Tartu Cathedral and the Angel''s Bridge.',      'EE','tartu',   'Tartu',      'monuments',     58.3800, 26.7140, 250,'casual',  'Park paths, slopes',         45,  true,  true,  false, 100),
  ('estonian-national-museum','Estonian National Museum','Striking museum built on a former Soviet airfield runway.',           'EE','tartu',   'Tartu',      'museums',       58.3958, 26.7495, 300,'casual',  'Flat',                       150, true,  false, true,  100),
  ('kaali-crater',         'Kaali Meteorite Crater',    'A 110 m crater left by a meteorite some 3,500 years ago.',             'EE','saare',   'Kaali',      'landscapes',    58.3726, 22.6694, 250,'casual',  'Short path',                 30,  true,  true,  true,  125),
  ('angla-windmills',      'Angla Windmill Hill',       'The last row of traditional windmills on Saaremaa.',                   'EE','saare',   'Angla',      'architecture',  58.5258, 22.6902, 300,'casual',  'Grass',                      30,  true,  true,  true,  100),
  ('panga-cliff',          'Panga Cliff',               'Saaremaa''s highest coastal cliff above the Baltic Sea.',              'EE','saare',   'Panga',      'cliffs',        58.5640, 22.2700, 500,'explorer','Clifftop, keep back from edge',45, true,  true,  true,  150),
  ('valaste-waterfall',    'Valaste Waterfall',         'Estonia''s highest waterfall, dropping off the North Estonian Klint.', 'EE','ida-viru','Valaste',    'waterfalls',    59.4442, 27.3363, 300,'casual',  'Viewing platform, stairs',   30,  true,  true,  true,  125),
  ('kuremae-convent',      'Pühtitsa Convent',          'Orthodox convent with green domes in Kuremäe.',                        'EE','ida-viru','Kuremäe',    'churches',      59.1983, 27.5285, 300,'casual',  'Flat grounds',               45,  true,  false, true,  100),
  ('riisa-bog-trail',      'Riisa Bog Trail',           'Boardwalk across a raised bog in Soomaa National Park.',               'EE','parnu',   'Soomaa',     'bogs',          58.4220, 25.0950, 600,'explorer','Wooden boardwalk',           75,  true,  false, true,  125)
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
  ('riga-highlights',    'Rīga Highlights',     'The must-sees of the Latvian capital.',                  '🏙️', 'special',  'LV', 400, 'published', 60),
  ('vilnius-highlights', 'Vilnius Highlights',  'Baroque churches, gates and viewpoints of Vilnius.',     '⛪', 'special',  'LT', 400, 'published', 70),
  ('tallinn-highlights', 'Tallinn Highlights',  'From Toompea to the TV Tower.',                          '🏰', 'special',  'EE', 400, 'published', 80),
  ('baltic-manors',      'Baltic Manors',       'Palaces and manor houses across the three countries.',   '🏛️', 'category', NULL, 600, 'published', 90),
  ('sacred-places',      'Sacred Places',       'Cathedrals, convents and pilgrimage sites.',             '🕍', 'category', NULL, 600, 'published', 100),
  ('waterfalls-cliffs',  'Falls & Cliffs',      'Waterfalls, sandstone rocks and limestone cliffs.',      '💧', 'category', NULL, 500, 'published', 110)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, icon = EXCLUDED.icon,
  kind = EXCLUDED.kind, country = EXCLUDED.country, xp_reward = EXCLUDED.xp_reward,
  status = EXCLUDED.status, sort = EXCLUDED.sort;

-- Rebuild membership for every seeded collection (batch 1 ran before these challenges existed).
INSERT INTO collection_items (collection_id, challenge_id, position)
SELECT col.id, ch.id, row_number() OVER (PARTITION BY col.id ORDER BY ch.title)
FROM collections col
JOIN challenges ch ON ch.status = 'published'
JOIN places p ON p.id = ch.place_id
WHERE (col.kind = 'country' AND ch.country = col.country)
   OR (col.slug = 'baltic-castles' AND ch.category_id = 'castles')
   OR (col.slug = 'baltic-coast' AND ch.category_id IN (SELECT id FROM categories WHERE id = 'coast' OR parent_id = 'coast'))
   OR (col.slug = 'riga-highlights' AND p.city = 'Rīga')
   OR (col.slug = 'vilnius-highlights' AND p.city = 'Vilnius')
   OR (col.slug = 'tallinn-highlights' AND p.city = 'Tallinn')
   OR (col.slug = 'baltic-manors' AND ch.category_id = 'manors')
   OR (col.slug = 'sacred-places' AND ch.category_id = 'churches')
   OR (col.slug = 'waterfalls-cliffs' AND ch.category_id IN ('waterfalls', 'cliffs'))
ON CONFLICT (collection_id, challenge_id) DO UPDATE SET position = EXCLUDED.position;
