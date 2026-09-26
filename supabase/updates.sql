-- Every update so far, as short lists. Run in the Supabase SQL editor after
-- staff.sql. It replaces whatever is in the update logs.
delete from public.updates;

insert into public.updates (version, title, body, published_at) values
('1.0.0', 'First release',
'- Notes, questions and study sheets from your material
- Flashcards and practice exams
- Accounts and sync', '2026-09-12 17:00+00'),

('1.0.3', 'Desktop apps',
'- Mac and Windows apps
- Auto updates
- New landing page', '2026-09-12 17:56+00'),

('1.0.5', 'New look',
'- Redesigned app
- Fixed Mac app saying it is damaged', '2026-09-14 06:52+00'),

('1.0.6', 'Smaller downloads',
'- Smaller installers
- One click install', '2026-09-16 03:25+00'),

('1.0.8', 'Solve',
'- Added Solve
- Sign up popup', '2026-09-23 06:54+00'),

('1.0.9', 'Learn',
'- Added Learn (lessons)
- Better notes and questions', '2026-09-24 06:07+00'),

('1.1.0', 'New sidebar',
'- New sidebar
- Fuller notes', '2026-09-24 07:20+00'),

('1.1.1', 'UI polish',
'- Better UI
- New duck', '2026-09-24 11:01+00'),

('1.1.2', 'Themes',
'- Added themes
- Better home page
- Longer lessons', '2026-09-24 11:53+00'),

('1.1.3', 'Update settings',
'- Choose when to update', '2026-09-24 12:13+00'),

('1.1.4', 'Multiple files',
'- Add several files at once', '2026-09-24 12:41+00'),

('1.1.5', 'Phones and YouTube',
'- Phone layout
- Chat with Dwiddle
- YouTube and lecture recording', '2026-09-25 07:49+00'),

('1.1.6', 'Library and exams',
'- Delete from Library
- Highlight exam passages
- Full screen', '2026-09-25 08:36+00'),

('1.1.7', 'Notebooks',
'- Added Notebooks
- Mind maps and audio overviews
- XP and levels', '2026-09-25 14:15+00'),

('1.1.8', 'Notebook upgrade',
'- Revealer pen
- Folders and covers
- Practice hub', '2026-09-25 15:13+00'),

('1.1.9', 'Voice fix',
'- Dwiddle talks less', '2026-09-25 15:19+00'),

('1.1.10', 'Pen and phone fixes',
'- Fixed pen issues
- Ruler, compass and lasso
- More fonts
- Better phone layout', '2026-09-26 16:19+00'),

(null, 'Accounts',
'- What''s new on the front page
- Account details
- Bug reports', '2026-09-26 16:53+00');
