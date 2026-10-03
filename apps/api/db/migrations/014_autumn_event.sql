-- First seasonal event: "Autumn in Latvia" (22 Sep – 30 Nov 2026).
-- Seasonal challenges sit at existing places, only exist inside the window, and together form a limited collection with a badge.

CREATE TEMP TABLE autumn_src (
  slug text, place text, category text, xp integer, title text, description text,
  lv_title text, lv_description text, ru_title text, ru_description text
) ON COMMIT DROP;

INSERT INTO autumn_src VALUES
  ('autumn-zvartes', 'zvartes-iezis', 'nature', 200,
   'Golden leaves at Zvārtes Rock', 'Walk the Amata trail when the forest turns gold. Get within 300 m of the rock to complete.',
   'Zelta lapas pie Zvārtes ieža', 'Izstaigā Amatas taku, kad mežs kļūst zeltains. Pietuvojies klintij 300 m attālumā, lai izpildītu.',
   'Золотая листва у скалы Зварте', 'Пройдите тропу вдоль Аматы, когда лес становится золотым. Подойдите к скале ближе чем на 300 м.'),
  ('autumn-turaida', 'turaida-castle', 'castles', 200,
   'Autumn colours over Turaida', 'The Gauja valley at its most colourful, seen from the castle tower. Get within 250 m to complete.',
   'Rudens krāsas pār Turaidu', 'Gaujas ieleja viskrāsainākajā laikā, skatoties no pils torņa. Pietuvojies 250 m attālumā, lai izpildītu.',
   'Осенние краски над Турайдой', 'Долина Гауи в самый яркий сезон — вид с башни замка. Подойдите ближе чем на 250 м.'),
  ('autumn-gutmanis', 'gutmanis-cave', 'nature', 150,
   'Autumn walk to Gūtmaņa Cave', 'A short forest walk through falling leaves to the largest grotto in the Baltics. Get within 200 m to complete.',
   'Rudens pastaiga līdz Gūtmaņa alai', 'Īsa meža pastaiga caur krītošām lapām līdz lielākajai alai Baltijā. Pietuvojies 200 m attālumā, lai izpildītu.',
   'Осенняя прогулка к пещере Гутманя', 'Короткая лесная прогулка по опавшей листве к крупнейшему гроту Балтии. Подойдите ближе чем на 200 м.'),
  ('autumn-kemeri', 'kemeri-bog', 'nature', 200,
   'Morning mist on the Ķemeri bog', 'Autumn mornings bring fog and red cranberries to the boardwalk. Get within 400 m to complete.',
   'Rīta migla Ķemeru tīrelī', 'Rudens rītos laipu taku klāj migla un sarkanas dzērvenes. Pietuvojies 400 m attālumā, lai izpildītu.',
   'Утренний туман на Кемерском болоте', 'Осенним утром тропу окутывает туман, а вокруг краснеет клюква. Подойдите ближе чем на 400 м.'),
  ('autumn-venta', 'venta-rapid', 'nature', 200,
   'Autumn at Ventas Rumba', 'The widest waterfall in Europe framed by autumn trees in Kuldīga. Get within 300 m to complete.',
   'Rudens pie Ventas rumbas', 'Platākais ūdenskritums Eiropā rudens koku ielokā Kuldīgā. Pietuvojies 300 m attālumā, lai izpildītu.',
   'Осень у Вентас румбы', 'Самый широкий водопад Европы в обрамлении осенних деревьев в Кулдиге. Подойдите ближе чем на 300 м.'),
  ('autumn-rundale', 'rundale-palace', 'manors', 200,
   'Autumn in the Rundāle gardens', 'The French gardens of Rastrelli''s palace in their autumn colours. Get within 300 m to complete.',
   'Rudens Rundāles dārzos', 'Rastrelli pils franču dārzi rudens krāsās. Pietuvojies 300 m attālumā, lai izpildītu.',
   'Осень в садах Рундале', 'Французские сады дворца Растрелли в осенних красках. Подойдите ближе чем на 300 м.');

INSERT INTO challenges (slug, title, description, type, category_id, place_id, country, region_id, difficulty, xp_reward,
                        verification, starts_at, ends_at, status, i18n)
SELECT s.slug, s.title, s.description, 'seasonal', s.category, p.id, p.country, p.region_id, 'casual', s.xp, 'gps',
       '2026-09-22 00:00 Europe/Riga', '2026-12-01 00:00 Europe/Riga', 'published',
       jsonb_build_object('lv', jsonb_build_object('title', s.lv_title, 'description', s.lv_description),
                          'ru', jsonb_build_object('title', s.ru_title, 'description', s.ru_description))
FROM autumn_src s JOIN places p ON p.slug = s.place
ON CONFLICT (slug) DO NOTHING;

INSERT INTO collections (slug, title, description, icon, kind, country, xp_reward, starts_at, ends_at, status, sort, i18n)
VALUES ('autumn-latvia-2026', 'Autumn in Latvia', 'Six autumn spots before the leaves fall. Limited edition: ends 30 November.',
        '🍂', 'seasonal', 'LV', 750, '2026-09-22 00:00 Europe/Riga', '2026-12-01 00:00 Europe/Riga', 'published', 1,
        '{"lv":{"title":"Rudens Latvijā","description":"Sešas rudens vietas, pirms nokrīt lapas. Ierobežots laiks: līdz 30. novembrim."},"ru":{"title":"Осень в Латвии","description":"Шесть осенних мест, пока не опали листья. Ограниченное время: до 30 ноября."}}')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO collection_items (collection_id, challenge_id, position)
SELECT c.id, ch.id, row_number() OVER (ORDER BY s.slug)
FROM autumn_src s
JOIN challenges ch ON ch.slug = s.slug
JOIN collections c ON c.slug = 'autumn-latvia-2026'
ON CONFLICT DO NOTHING;

INSERT INTO achievements (id, title, description, icon, rule, xp_reward, sort, i18n)
VALUES ('autumn-2026', 'Autumn Explorer 2026', 'Complete the Autumn in Latvia event before 30 November 2026.', '🍂',
        '{"type":"collection_completed","collection":"autumn-latvia-2026"}', 250, 5,
        '{"lv":{"title":"Rudens pētnieks 2026","description":"Pabeidz pasākumu “Rudens Latvijā” līdz 2026. gada 30. novembrim."},"ru":{"title":"Осенний исследователь 2026","description":"Завершите событие «Осень в Латвии» до 30 ноября 2026 года."}}')
ON CONFLICT (id) DO NOTHING;
