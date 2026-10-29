-- TaskLens P0-3: ratings + El Salvador reseed (keeps 5 Miami pros for US demo).
-- Ratings feed the pro Trust score (running average, server-side only).

create table if not exists ratings (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  pro_id uuid references pros(id),
  stars int not null check (stars between 1 and 5),
  comment text default '',
  created_at timestamptz default now(),
  unique(job_id)
);

alter table ratings enable row level security;

drop policy if exists "ratings customer read" on ratings;
create policy "ratings customer read" on ratings
  for select using (
    exists (select 1 from jobs j where j.id = ratings.job_id and j.customer_id = auth.uid())
  );
drop policy if exists "ratings pro read" on ratings;
create policy "ratings pro read" on ratings
  for select using (
    exists (select 1 from pros p where p.id = ratings.pro_id and p.user_id = auth.uid())
  );

-- El Salvador seed: San Salvador metro + Santa Ana + San Miguel (USD rates).
-- Trim the Day-1 Miami pool to 5 keepers for the US demo (match/search is
-- distance-fenced, but 25 stale rows would clutter the admin views).
delete from pros where city like '%, FL'
  and name not in ('Carlos Mendez','Mike Ross','Maria Gonzalez','Carmen Diaz','Alex Johnson');
insert into pros (name, category, rating, reviews, rate_usd_hr, lat, lng, city) values
('Carlos Méndez','plumbing',4.9,214,45,13.6929,-89.2182,'San Salvador, SV'),
('Rosa Jiménez','plumbing',4.8,167,40,13.7000,-89.2000,'San Salvador, SV'),
('David Rivas','plumbing',4.7,98,42,13.7100,-89.2300,'Santa Tecla, SV'),
('Luis Fernández','plumbing',4.6,76,35,13.6900,-89.1900,'Soyapango, SV'),
('Ana Torres','plumbing',4.9,301,48,13.7200,-89.2100,'Antiguo Cuscatlán, SV'),
('Miguel Rosales','electrical',4.9,189,50,13.6929,-89.2182,'San Salvador, SV'),
('Elena Vásquez','electrical',4.8,143,48,13.7050,-89.2050,'San Salvador, SV'),
('Jaime Castro','electrical',4.7,87,44,13.7150,-89.1950,'Santa Tecla, SV'),
('Pedro Álvarez','electrical',4.8,176,46,13.6800,-89.2200,'San Salvador, SV'),
('Sofía Ramírez','electrical',4.6,64,40,13.9949,-89.5596,'Santa Ana, SV'),
('Tomás Henríquez','appliance',4.7,132,38,13.6929,-89.2182,'San Salvador, SV'),
('María González','appliance',4.9,228,40,13.7000,-89.2100,'San Salvador, SV'),
('Kevin Lee','appliance',4.5,59,36,13.7100,-89.2000,'Soyapango, SV'),
('Jorge Ruiz','appliance',4.6,91,37,13.4833,-88.1864,'San Miguel, SV'),
('Brian Smith','drywall_paint',4.8,154,30,13.6929,-89.2182,'San Salvador, SV'),
('Carmen Díaz','drywall_paint',4.9,203,32,13.7060,-89.2060,'San Salvador, SV'),
('Óscar Pérez','drywall_paint',4.7,118,28,13.7120,-89.2150,'Santa Tecla, SV'),
('Nina Fuentes','drywall_paint',4.8,139,30,13.6980,-89.2080,'Antiguo Cuscatlán, SV'),
('Alex Johnson','assembly',4.9,187,25,13.6929,-89.2182,'San Salvador, SV'),
('Diego Santos','assembly',4.7,94,22,13.7090,-89.1990,'San Salvador, SV'),
('Emma Wilson','assembly',4.8,121,26,13.7160,-89.1960,'Santa Tecla, SV'),
('Rafael Cruz','assembly',4.6,73,22,13.6820,-89.2180,'Soyapango, SV'),
('Lucía Herrera','cleaning',4.9,342,20,13.6929,-89.2182,'San Salvador, SV'),
('María Chicas','cleaning',4.8,256,18,13.7080,-89.2020,'San Salvador, SV'),
('Fresh Start SV','cleaning',4.7,198,18,13.7140,-89.2120,'Santa Tecla, SV')
on conflict do nothing;
