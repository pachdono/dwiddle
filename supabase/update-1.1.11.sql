-- Adds the 1.1.11 update log. Run in the Supabase SQL editor.
insert into public.updates (version, title, body, published_at) values
('1.1.11', 'Big update',
'- Profile pictures: Dwiddle, Puddle and Dwiddle dressed up
- Turn your notes into a notebook, with highlights and pictures
- Past paper practice, timed like the real thing
- Mind maps you can move and add to
- Theme scenes with Dwiddle, and falling petals and more
- Ruler and protractor move with any tool
- Sound effects instead of voice lines
- Podcast in Practice
- Report bugs and complaints, with email replies', now());
