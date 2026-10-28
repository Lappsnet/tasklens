-- TaskLens seed: 25 pros across 6 categories near Miami, FL
-- Run: psql $SUPABASE_DB_URL -f 002_seed.sql  (or via /admin Reset demo)
insert into pros (name, category, rating, reviews, rate_usd_hr, lat, lng, city) values
-- plumbing (5)
('Carlos Mendez','plumbing',4.9,214,95,25.7617,-80.1918,'Miami, FL'),
('Rosa Jimenez','plumbing',4.8,167,85,25.7743,-80.1937,'Miami, FL'),
('Dave Kowalski','plumbing',4.7,98,90,25.7825,-80.2090,'Miami, FL'),
('Luis Fernandez','plumbing',4.6,76,70,25.7500,-80.2100,'Miami, FL'),
('Ana Torres','plumbing',4.9,301,100,25.7900,-80.1800,'Miami, FL'),
-- electrical (5)
('Mike Ross','electrical',4.9,189,110,25.7617,-80.1918,'Miami, FL'),
('Elena Vasquez','electrical',4.8,143,105,25.7650,-80.2000,'Miami, FL'),
('James Carter','electrical',4.7,87,95,25.7750,-80.1850,'Miami, FL'),
('Pedro Alvarez','electrical',4.8,176,100,25.7550,-80.1950,'Coral Gables, FL'),
('Sofia Ramirez','electrical',4.6,64,85,25.8000,-80.2100,'Miami, FL'),
-- appliance (4)
('Tom Baker','appliance',4.7,132,80,25.7617,-80.1918,'Miami, FL'),
('Maria Gonzalez','appliance',4.9,228,85,25.7700,-80.1900,'Miami, FL'),
('Kevin Lee','appliance',4.5,59,75,25.7800,-80.2000,'Miami, FL'),
('Jorge Ruiz','appliance',4.6,91,78,25.7500,-80.1800,'Miami, FL'),
-- drywall/paint (4)
('Brian Smith','drywall_paint',4.8,154,65,25.7617,-80.1918,'Miami, FL'),
('Carmen Diaz','drywall_paint',4.9,203,70,25.7660,-80.1960,'Miami, FL'),
('Oscar Perez','drywall_paint',4.7,118,60,25.7720,-80.2050,'Hialeah, FL'),
('Nina Petrova','drywall_paint',4.8,139,72,25.7580,-80.1880,'Miami, FL'),
-- assembly (4)
('Alex Johnson','assembly',4.9,187,55,25.7617,-80.1918,'Miami, FL'),
('Diego Santos','assembly',4.7,94,50,25.7690,-80.1990,'Miami, FL'),
('Emma Wilson','assembly',4.8,121,58,25.7760,-80.1860,'Miami Beach, FL'),
('Rafael Cruz','assembly',4.6,73,48,25.7520,-80.2080,'Little Havana, FL'),
-- cleaning (3)
('Clean Team Lucia','cleaning',4.9,342,45,25.7617,-80.1918,'Miami, FL'),
('Sparkle Maria','cleaning',4.8,256,42,25.7680,-80.1920,'Miami, FL'),
('Fresh Start Co','cleaning',4.7,198,40,25.7740,-80.2020,'Miami, FL')
on conflict do nothing;
