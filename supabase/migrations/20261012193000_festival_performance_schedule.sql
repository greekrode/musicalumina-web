-- Published running order for a festival day.
-- Public pages read segment times and display names only. registration_id
-- links the row back to the verified registration; the registrations table
-- stays staff-only, so emails, phones, and payment data are not exposed.

create table if not exists public.festival_schedule_segments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  sort_order integer not null,
  kind text not null check (kind in ('opening', 'performance', 'awarding', 'break')),
  label text,
  session_number integer check (session_number is null or session_number > 0),
  subcategory_id uuid references public.event_subcategories(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint festival_schedule_segments_event_order unique (event_id, sort_order),
  constraint festival_schedule_segments_time check (ends_at > starts_at),
  constraint festival_schedule_segments_performance check (
    (kind = 'performance' and subcategory_id is not null)
    or (kind <> 'performance' and subcategory_id is null)
  )
);

create table if not exists public.festival_schedule_entries (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null references public.festival_schedule_segments(id) on delete cascade,
  registration_id uuid references public.registrations(id) on delete set null,
  order_index integer not null check (order_index > 0),
  display_name text not null,
  created_at timestamptz not null default now(),
  constraint festival_schedule_entries_order unique (segment_id, order_index)
);

create index if not exists festival_schedule_segments_event_idx
  on public.festival_schedule_segments (event_id, sort_order);

create index if not exists festival_schedule_segments_subcategory_idx
  on public.festival_schedule_segments (subcategory_id);

create index if not exists festival_schedule_entries_segment_idx
  on public.festival_schedule_entries (segment_id, order_index);

alter table public.festival_schedule_segments enable row level security;
alter table public.festival_schedule_entries enable row level security;

drop policy if exists "Anyone reads festival schedule segments" on public.festival_schedule_segments;
create policy "Anyone reads festival schedule segments"
  on public.festival_schedule_segments
  for select to anon, authenticated
  using (true);

drop policy if exists "Admins manage festival schedule segments" on public.festival_schedule_segments;
create policy "Admins manage festival schedule segments"
  on public.festival_schedule_segments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Anyone reads festival schedule entries" on public.festival_schedule_entries;
create policy "Anyone reads festival schedule entries"
  on public.festival_schedule_entries
  for select to anon, authenticated
  using (true);

drop policy if exists "Admins manage festival schedule entries" on public.festival_schedule_entries;
create policy "Admins manage festival schedule entries"
  on public.festival_schedule_entries
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.festival_schedule_segments, public.festival_schedule_entries to anon, authenticated;
grant insert, update, delete on public.festival_schedule_segments, public.festival_schedule_entries to authenticated;

-- Lumina Signature Piano Festival 2026 (2nd Edition), Saturday 17 Oct 2026.
-- Times are Asia/Jakarta. Re-running this migration must not duplicate the day.
insert into public.festival_schedule_segments (
  event_id, sort_order, kind, label, session_number, subcategory_id, starts_at, ends_at
)
select
  e.id,
  v.sort_order,
  v.kind,
  v.label,
  v.session_number,
  s.id,
  v.starts_at,
  v.ends_at
from public.events e
join (
  values
    (10, 'opening', 'Opening', null::integer, null::text, null::text, '2026-10-17 09:30:00+07'::timestamptz, '2026-10-17 09:40:00+07'::timestamptz),
    (20, 'performance', null, 1, 'Introductory', 'Group A', '2026-10-17 09:40:00+07'::timestamptz, '2026-10-17 09:42:00+07'::timestamptz),
    (30, 'performance', null, 1, 'Introductory', 'Group B', '2026-10-17 09:42:00+07'::timestamptz, '2026-10-17 10:02:00+07'::timestamptz),
    (40, 'performance', null, 1, 'Preparatory', 'Group A', '2026-10-17 10:02:00+07'::timestamptz, '2026-10-17 10:08:00+07'::timestamptz),
    (50, 'performance', null, 1, 'Exam', 'Grade 3', '2026-10-17 10:08:00+07'::timestamptz, '2026-10-17 10:20:00+07'::timestamptz),
    (60, 'performance', null, 1, 'Free Choice', 'Group B', '2026-10-17 10:20:00+07'::timestamptz, '2026-10-17 10:32:00+07'::timestamptz),
    (70, 'awarding', 'Awarding', 1, null, null, '2026-10-17 10:32:00+07'::timestamptz, '2026-10-17 10:47:00+07'::timestamptz),
    (80, 'break', 'Intermission', null, null, null, '2026-10-17 10:47:00+07'::timestamptz, '2026-10-17 11:02:00+07'::timestamptz),
    (90, 'performance', null, 2, 'Introductory', 'Group C', '2026-10-17 11:02:00+07'::timestamptz, '2026-10-17 11:17:00+07'::timestamptz),
    (100, 'performance', null, 2, 'Preparatory', 'Group B1', '2026-10-17 11:17:00+07'::timestamptz, '2026-10-17 11:37:00+07'::timestamptz),
    (110, 'performance', null, 2, 'Exam', 'Grade 1', '2026-10-17 11:37:00+07'::timestamptz, '2026-10-17 11:43:00+07'::timestamptz),
    (120, 'performance', null, 2, 'Exam', 'Grade 2', '2026-10-17 11:43:00+07'::timestamptz, '2026-10-17 11:54:00+07'::timestamptz),
    (130, 'awarding', 'Awarding', 2, null, null, '2026-10-17 11:54:00+07'::timestamptz, '2026-10-17 12:10:00+07'::timestamptz),
    (140, 'break', 'Lunch break', null, null, null, '2026-10-17 12:10:00+07'::timestamptz, '2026-10-17 13:10:00+07'::timestamptz),
    (150, 'performance', null, 3, 'Preparatory', 'Group C', '2026-10-17 13:10:00+07'::timestamptz, '2026-10-17 13:40:00+07'::timestamptz),
    (160, 'performance', null, 3, 'Free Choice', 'Group A', '2026-10-17 13:40:00+07'::timestamptz, '2026-10-17 13:49:00+07'::timestamptz),
    (170, 'performance', null, 3, 'Elementary', 'Group A', '2026-10-17 13:49:00+07'::timestamptz, '2026-10-17 13:54:00+07'::timestamptz),
    (180, 'performance', null, 3, 'Exam', 'Grade 4', '2026-10-17 13:54:00+07'::timestamptz, '2026-10-17 14:04:00+07'::timestamptz),
    (190, 'awarding', 'Awarding', 3, null, null, '2026-10-17 14:04:00+07'::timestamptz, '2026-10-17 14:17:00+07'::timestamptz),
    (200, 'break', 'Intermission', null, null, null, '2026-10-17 14:17:00+07'::timestamptz, '2026-10-17 14:32:00+07'::timestamptz),
    (210, 'performance', null, 4, 'Elementary', 'Group C', '2026-10-17 14:32:00+07'::timestamptz, '2026-10-17 14:57:00+07'::timestamptz),
    (220, 'performance', null, 4, 'Elementary', 'Group B', '2026-10-17 14:57:00+07'::timestamptz, '2026-10-17 15:25:00+07'::timestamptz),
    (230, 'performance', null, 4, 'Piano Duet', 'Group B', '2026-10-17 15:25:00+07'::timestamptz, '2026-10-17 15:27:00+07'::timestamptz),
    (240, 'awarding', 'Awarding', 4, null, null, '2026-10-17 15:27:00+07'::timestamptz, '2026-10-17 15:39:00+07'::timestamptz),
    (250, 'break', 'Intermission', null, null, null, '2026-10-17 15:39:00+07'::timestamptz, '2026-10-17 15:54:00+07'::timestamptz),
    (260, 'performance', null, 5, 'Preparatory', 'Group B2', '2026-10-17 15:54:00+07'::timestamptz, '2026-10-17 16:12:00+07'::timestamptz),
    (270, 'performance', null, 5, 'Elementary', 'Group D', '2026-10-17 16:12:00+07'::timestamptz, '2026-10-17 16:15:00+07'::timestamptz),
    (280, 'performance', null, 5, 'Exam', 'Grade Initial', '2026-10-17 16:15:00+07'::timestamptz, '2026-10-17 16:19:00+07'::timestamptz),
    (290, 'performance', null, 5, 'Intermediate', 'Group B', '2026-10-17 16:19:00+07'::timestamptz, '2026-10-17 16:28:00+07'::timestamptz),
    (300, 'performance', null, 5, 'Free Choice', 'Group C', '2026-10-17 16:28:00+07'::timestamptz, '2026-10-17 16:51:00+07'::timestamptz),
    (310, 'awarding', 'Awarding', 5, null, null, '2026-10-17 16:51:00+07'::timestamptz, '2026-10-17 17:03:00+07'::timestamptz),
    (320, 'break', 'Intermission', null, null, null, '2026-10-17 17:03:00+07'::timestamptz, '2026-10-17 17:18:00+07'::timestamptz),
    (330, 'performance', null, 6, 'Exam', 'Grade 8', '2026-10-17 17:18:00+07'::timestamptz, '2026-10-17 17:27:00+07'::timestamptz),
    (340, 'performance', null, 6, 'Free Choice', 'Group D', '2026-10-17 17:27:00+07'::timestamptz, '2026-10-17 17:41:00+07'::timestamptz),
    (350, 'performance', null, 6, 'Intermediate', 'Group C', '2026-10-17 17:41:00+07'::timestamptz, '2026-10-17 17:56:00+07'::timestamptz),
    (360, 'performance', null, 6, 'Free Choice', 'Group E', '2026-10-17 17:56:00+07'::timestamptz, '2026-10-17 18:07:00+07'::timestamptz),
    (370, 'performance', null, 6, 'Exam', 'Grade 5', '2026-10-17 18:07:00+07'::timestamptz, '2026-10-17 18:12:00+07'::timestamptz),
    (380, 'performance', null, 6, 'Senior', 'Group A', '2026-10-17 18:12:00+07'::timestamptz, '2026-10-17 18:16:00+07'::timestamptz),
    (390, 'awarding', 'Awarding', 6, null, null, '2026-10-17 18:16:00+07'::timestamptz, '2026-10-17 18:25:00+07'::timestamptz)
) as v(sort_order, kind, label, session_number, category_name, subcategory_name, starts_at, ends_at)
  on true
left join public.event_categories c
  on c.event_id = e.id and c.name = v.category_name
left join public.event_subcategories s
  on s.category_id = c.id and s.name = v.subcategory_name
where e.title = 'Lumina Signature Piano Festival 2026 (2nd Edition)'
  and not exists (
    select 1 from public.festival_schedule_segments existing
    where existing.event_id = e.id
  )
  and (
    v.kind <> 'performance'
    or s.id is not null
  );

insert into public.festival_schedule_entries (
  segment_id, registration_id, order_index, display_name
)
select seg.id, r.id, v.order_index, v.display_name
from public.events e
join (
  values
    ('Introductory', 'Group A', 1, 'Aaron Shawn Wijaya'),
    ('Introductory', 'Group B', 1, 'Elaine Lillian Edeli'),
    ('Introductory', 'Group B', 2, 'Sheralma Dinara Kusuma'),
    ('Introductory', 'Group B', 3, 'Harvey Adiwena Tjong'),
    ('Introductory', 'Group B', 4, 'Kyrie Richiemurad Reiza'),
    ('Introductory', 'Group B', 5, 'Livia Calista Batubara'),
    ('Introductory', 'Group B', 6, 'Gregorius Axl Mulyono'),
    ('Introductory', 'Group B', 7, 'Valletta Malta Wardhana'),
    ('Introductory', 'Group B', 8, 'Karen Chua'),
    ('Introductory', 'Group B', 9, 'Aerin Wu'),
    ('Introductory', 'Group B', 10, 'Jordan Cliff Han'),
    ('Introductory', 'Group B', 11, 'Stacya Tjhia'),
    ('Introductory', 'Group B', 12, 'Alessa Layne Phoan'),
    ('Introductory', 'Group B', 13, 'Clarisa Meira Riga Tarigan'),
    ('Preparatory', 'Group A', 1, 'Victoria Dewi Ayudia'),
    ('Preparatory', 'Group A', 2, 'Chloe Alana Poh'),
    ('Preparatory', 'Group A', 3, 'Harper Jade Wilson'),
    ('Exam', 'Grade 3', 1, 'Allegra Chrysta Rose Teja'),
    ('Exam', 'Grade 3', 2, 'James Collins Han'),
    ('Exam', 'Grade 3', 3, 'Keisha Elmira Azzahra'),
    ('Exam', 'Grade 3', 4, 'Adelyne Ryhs Yu'),
    ('Exam', 'Grade 3', 5, 'Josephine Kalista Kusman'),
    ('Exam', 'Grade 3', 6, 'Nadya Aradry Tjen'),
    ('Free Choice', 'Group B', 1, 'Bianca Regatta Lee'),
    ('Free Choice', 'Group B', 2, 'Hou Jin Yi'),
    ('Free Choice', 'Group B', 3, 'Sadina Ufairah Ramadhani'),
    ('Free Choice', 'Group B', 4, 'Hailey Tjandra'),
    ('Free Choice', 'Group B', 5, 'Giorgio Theodore Khoe'),
    ('Free Choice', 'Group B', 6, 'Celine Vionita Yunkins'),
    ('Free Choice', 'Group B', 7, 'Nayla Azarine Adriansyah'),
    ('Introductory', 'Group C', 1, 'Gwen Alessa Subianto'),
    ('Introductory', 'Group C', 2, 'Eleanor Louise Kartawinata'),
    ('Introductory', 'Group C', 3, 'Lafael Ahzafani Reiza'),
    ('Introductory', 'Group C', 4, 'Jacob Reynard Jie'),
    ('Introductory', 'Group C', 5, 'Emma Cornelia Edeli'),
    ('Introductory', 'Group C', 6, 'Adriel Carlson Pangestu'),
    ('Introductory', 'Group C', 7, 'Queenetta Clairine Stevilie'),
    ('Introductory', 'Group C', 8, 'Estella Fidelexia'),
    ('Introductory', 'Group C', 9, 'Mirabelle Elisse Lee Sentono'),
    ('Introductory', 'Group C', 10, 'Nicola Elizabeth Purnama'),
    ('Preparatory', 'Group B1', 1, 'Lauren Djayadi Li'),
    ('Preparatory', 'Group B1', 2, 'Olivia Faith Katuari'),
    ('Preparatory', 'Group B1', 3, 'Alden Theodore Frey'),
    ('Preparatory', 'Group B1', 4, 'Alana Ruby Wisesa'),
    ('Preparatory', 'Group B1', 5, 'Jillian Naomi Hill'),
    ('Preparatory', 'Group B1', 6, 'Elliana Adeline Salaam'),
    ('Preparatory', 'Group B1', 7, 'Jason Alexander Chondro'),
    ('Preparatory', 'Group B1', 8, 'Cedric Gilbert Bakara'),
    ('Preparatory', 'Group B1', 9, 'Rachel Allison Suryahusada'),
    ('Preparatory', 'Group B1', 10, 'Raphaelangela Imelda Adji'),
    ('Exam', 'Grade 1', 1, 'Dylan Wayne Katuari'),
    ('Exam', 'Grade 1', 2, 'Kenji Sukiatmo'),
    ('Exam', 'Grade 1', 3, 'Drexcell Kent Mardjuki'),
    ('Exam', 'Grade 1', 4, 'Stanley Tjia'),
    ('Exam', 'Grade 2', 1, 'Hailey Kalyana Tjia'),
    ('Exam', 'Grade 2', 2, 'Darrell Maximilian Frey'),
    ('Exam', 'Grade 2', 3, 'Chloe Vievienne Kencana'),
    ('Exam', 'Grade 2', 4, 'Madelyn Kaycia Yunarto'),
    ('Exam', 'Grade 2', 5, 'Jason Nathanael'),
    ('Exam', 'Grade 2', 6, 'Giselle Naomi Woo'),
    ('Exam', 'Grade 2', 7, 'Nikolas Ezrae Widjaja'),
    ('Preparatory', 'Group C', 1, 'Emily Madeleine Kartakusuma'),
    ('Preparatory', 'Group C', 2, 'Caitlyn Olivia Chondro'),
    ('Preparatory', 'Group C', 3, 'Sofia Danika Ratulangi'),
    ('Preparatory', 'Group C', 4, 'Cairo Celian Zhao'),
    ('Preparatory', 'Group C', 5, 'Emmalyn Laticia Salaam'),
    ('Preparatory', 'Group C', 6, 'Shemuel Adriel Hasea Limbong'),
    ('Preparatory', 'Group C', 7, 'Adelyne Ryhs Yu'),
    ('Preparatory', 'Group C', 8, 'Nicholas Liam Ang'),
    ('Preparatory', 'Group C', 9, 'Grace Angela Cahyaindra'),
    ('Preparatory', 'Group C', 10, 'Matthew Benneth Anggadi'),
    ('Preparatory', 'Group C', 11, 'Rayya Jingga Luvena'),
    ('Preparatory', 'Group C', 12, 'Joelle Ashlyn Ferbiansah'),
    ('Preparatory', 'Group C', 13, 'Ramadhania Nayyara Kusuma'),
    ('Preparatory', 'Group C', 14, 'Callysta Orzora Manalu'),
    ('Preparatory', 'Group C', 15, 'Benjamin Lucas Setiawan'),
    ('Free Choice', 'Group A', 1, 'Yehezkiel Tristan'),
    ('Free Choice', 'Group A', 2, 'Carolina Chelsea Soemara'),
    ('Free Choice', 'Group A', 3, 'Arina Lynn Wijaya'),
    ('Free Choice', 'Group A', 4, 'Cleine Valerie Sugianto'),
    ('Free Choice', 'Group A', 5, 'Farashilya Ainaya Heryunda'),
    ('Elementary', 'Group A', 1, 'Dominikus Maheswara Sadewo'),
    ('Elementary', 'Group A', 2, 'Elina Hartono'),
    ('Exam', 'Grade 4', 1, 'Theodore Asher'),
    ('Exam', 'Grade 4', 2, 'Maximillian Prakuswo'),
    ('Exam', 'Grade 4', 3, 'Mileva Asher'),
    ('Exam', 'Grade 4', 4, 'Heinrich Xavier Wibawa'),
    ('Elementary', 'Group C', 1, 'Chloe Jocelyn Widjaja'),
    ('Elementary', 'Group C', 2, 'Callysta Orzora Manalu'),
    ('Elementary', 'Group C', 3, 'Cleo Aurelia Lie'),
    ('Elementary', 'Group C', 4, 'Caoimhe Avalokitesvara Ludgardis Laurentius'),
    ('Elementary', 'Group C', 5, 'Carissa Orzora Manalu'),
    ('Elementary', 'Group C', 6, 'Maria Clairine Mulyono'),
    ('Elementary', 'Group C', 7, 'Danielle Lynn Setiawan'),
    ('Elementary', 'Group C', 8, 'Jason Carson Han'),
    ('Elementary', 'Group C', 9, 'Mikhayla Sybilla Hadinata'),
    ('Elementary', 'Group C', 10, 'Stephanie Gwen Liem'),
    ('Elementary', 'Group B', 1, 'Catherine Dewi Arianna'),
    ('Elementary', 'Group B', 2, 'Godric Farrell Bakara'),
    ('Elementary', 'Group B', 3, 'Giselline Michaela Wenas'),
    ('Elementary', 'Group B', 4, 'Enzo Kaven Gozali'),
    ('Elementary', 'Group B', 5, 'Kimberly Natalia Kurniawan'),
    ('Elementary', 'Group B', 6, 'Noreen Kirana Yahya'),
    ('Elementary', 'Group B', 7, 'Ellen Gracella Prastio'),
    ('Elementary', 'Group B', 8, 'Audrey Ellianna Lukman'),
    ('Elementary', 'Group B', 9, 'Marsha Emmelin Saputra'),
    ('Elementary', 'Group B', 10, 'Collin Louis Asihwardji'),
    ('Elementary', 'Group B', 11, 'Peter Aji Gora Yohanoven Hutahaean'),
    ('Piano Duet', 'Group B', 1, 'James Collins Han & Cherry Carissa Ho'),
    ('Preparatory', 'Group B2', 1, 'Lucas Differson Tio'),
    ('Preparatory', 'Group B2', 2, 'Chloe Avery Quinn'),
    ('Preparatory', 'Group B2', 3, 'Jayden Knight Widjaja'),
    ('Preparatory', 'Group B2', 4, 'Leia Aryanna Lion'),
    ('Preparatory', 'Group B2', 5, 'Claire Susanto'),
    ('Preparatory', 'Group B2', 6, 'Shannon Gracia Wongso'),
    ('Preparatory', 'Group B2', 7, 'Karen Alexandra Gunarso'),
    ('Preparatory', 'Group B2', 8, 'Gabriella Emily Mulyono'),
    ('Preparatory', 'Group B2', 9, 'Michaella Madeleine'),
    ('Elementary', 'Group D', 1, 'Caitlyn Ovelia Tan'),
    ('Exam', 'Grade Initial', 1, 'Samantha Victoria Susanto'),
    ('Exam', 'Grade Initial', 2, 'Kaiden Feder Woo'),
    ('Intermediate', 'Group B', 1, 'Amanda Nararya Alani'),
    ('Intermediate', 'Group B', 2, 'Catherine Jane Tjitrokusumo'),
    ('Intermediate', 'Group B', 3, 'Davin Matthew Kristian'),
    ('Free Choice', 'Group C', 1, 'Liam Yong Jun Lim'),
    ('Free Choice', 'Group C', 2, 'Carissa Orzora Manalu'),
    ('Free Choice', 'Group C', 3, 'Darius Axel Wijaya'),
    ('Free Choice', 'Group C', 4, 'Ester Gabrielle Shalom Tambunan'),
    ('Free Choice', 'Group C', 5, 'Beverlyn Mettakhemadevi Winata'),
    ('Free Choice', 'Group C', 6, 'Jaden Venzel Arifin'),
    ('Free Choice', 'Group C', 7, 'Rachel Aurellia Bonita Panjaitan'),
    ('Free Choice', 'Group C', 8, 'Lindsy Alexa D''Letizia'),
    ('Exam', 'Grade 8', 1, 'Nicole Mila Khoman'),
    ('Exam', 'Grade 8', 2, 'Shan Immanuel Wiryadi Siaoputra'),
    ('Exam', 'Grade 8', 3, 'Rachel Nathania Suyanto'),
    ('Free Choice', 'Group D', 1, 'Stephen Christopher Jenry'),
    ('Free Choice', 'Group D', 2, 'Jayrell Keyson Corich'),
    ('Free Choice', 'Group D', 3, 'Violane Ziola'),
    ('Free Choice', 'Group D', 4, 'Nicole Mila Khoman'),
    ('Intermediate', 'Group C', 1, 'Dominique Clarence Djaya'),
    ('Intermediate', 'Group C', 2, 'Renelyn Cael'),
    ('Intermediate', 'Group C', 3, 'Grace Milana Tjokro'),
    ('Intermediate', 'Group C', 4, 'Clara Tobias Iskandar'),
    ('Intermediate', 'Group C', 5, 'Jovita Krissanti Farosi Nainggolan'),
    ('Free Choice', 'Group E', 1, 'Christhard Pangaribuan'),
    ('Free Choice', 'Group E', 2, 'Rachel Nathania Suyanto'),
    ('Free Choice', 'Group E', 3, 'James Alexander Tan'),
    ('Exam', 'Grade 5', 1, 'Audi Winter Lee'),
    ('Exam', 'Grade 5', 2, 'Bianca Beatrice Moeljono'),
    ('Senior', 'Group A', 1, 'Sophie Felicia Darmawan')
) as v(category_name, subcategory_name, order_index, display_name)
  on true
join public.event_categories c
  on c.event_id = e.id and c.name = v.category_name
join public.event_subcategories s
  on s.category_id = c.id and s.name = v.subcategory_name
join public.festival_schedule_segments seg
  on seg.event_id = e.id and seg.subcategory_id = s.id and seg.kind = 'performance'
join public.registrations r
  on r.event_id = e.id
  and r.subcategory_id = s.id
  and r.participant_name = v.display_name
  and r.status = 'verified'
where e.title = 'Lumina Signature Piano Festival 2026 (2nd Edition)'
  and not exists (
    select 1
    from public.festival_schedule_entries existing
    join public.festival_schedule_segments existing_seg on existing_seg.id = existing.segment_id
    where existing_seg.event_id = e.id
  );

do $$
declare
  v_event uuid;
  v_segments integer;
  v_performances integer;
  v_entries integer;
  v_unlinked integer;
begin
  select id into v_event
  from public.events
  where title = 'Lumina Signature Piano Festival 2026 (2nd Edition)';

  if v_event is null then
    raise exception 'LSPF 2026 2nd edition event was not found';
  end if;

  select count(*), count(*) filter (where kind = 'performance')
  into v_segments, v_performances
  from public.festival_schedule_segments
  where event_id = v_event;

  select count(*), count(*) filter (where registration_id is null)
  into v_entries, v_unlinked
  from public.festival_schedule_entries e
  join public.festival_schedule_segments s on s.id = e.segment_id
  where s.event_id = v_event;

  if v_segments <> 39 or v_performances <> 27 or v_entries <> 150 or v_unlinked <> 0 then
    raise exception
      'LSPF schedule seed mismatch: segments %, performances %, entries %, unlinked %',
      v_segments, v_performances, v_entries, v_unlinked;
  end if;
end $$;
