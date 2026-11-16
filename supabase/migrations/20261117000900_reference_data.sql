-- Upper Echelon · reference data shipped with the schema (categories, achievements, the Directory).
-- Directory facts were checked against each test's official page in November 2026. Where an author
-- does not state a value it is left empty and shown as "Not stated". Difficulty is an editorial estimate.

insert into public.forum_categories (slug, name, description, position, min_tier, is_advice, staff_only) values
  ('notice-board', 'Notice Board', 'Announcements and notes from the staff.', 1, 0, false, true),
  ('psychometrics', 'IQ & Psychometrics', 'Measurement, norms, reliability, and what scores do and do not mean.', 2, 0, false, false),
  ('test-discussions', 'Test Discussions', 'One room per test in the Directory. No answers, no hints.', 3, 0, false, false),
  ('puzzles', 'Puzzles & Riddles', 'Original problems and the pleasure of solving them. Mark spoilers.', 4, 0, false, false),
  ('mathematics', 'Mathematics', 'Proofs, problems and the occasional beautiful result.', 5, 0, false, false),
  ('philosophy', 'Philosophy', 'Arguments, not opinions. Steelman before you strike.', 6, 0, false, false),
  ('science', 'Science', 'Papers, methods and open questions across the sciences.', 7, 0, false, false),
  ('books', 'Books', 'What you are reading, and why it is worth the time.', 8, 0, false, false),
  ('advice', 'Advice & Experiences', 'Questions about study, work and thinking well. Mark the answer that helped.', 9, 0, true, false),
  ('introductions', 'Introductions', 'Say who you are and what you are curious about.', 10, 0, false, false),
  ('off-topic', 'Off-Topic', 'Everything else, within the guidelines.', 11, 0, false, false),
  ('inner-room', 'The Inner Room', 'A quieter room for members of the third tier and above.', 12, 3, false, false);

insert into public.achievements (code, name, description, family, position) values
  ('first_trial', 'First Trial', 'Complete a game in the Arena as a member.', 'arena', 1),
  ('full_battery', 'Full Battery', 'Set a result in all eight games.', 'arena', 2),
  ('ten_bests', 'Ten Bests', 'Beat your own personal best ten times.', 'arena', 3),
  ('top_decile', 'Top Decile', 'Reach the 90th percentile of members in any game (with at least 20 members ranked).', 'arena', 4),
  ('daily_first', 'Daily Discipline', 'Complete a daily challenge.', 'practice', 5),
  ('daily_seven', 'Seven Dailies', 'Complete seven daily challenges.', 'practice', 6),
  ('streak_3', 'Three Days', 'Practise three days in a row.', 'practice', 7),
  ('streak_7', 'A Full Week', 'Practise seven days in a row.', 'practice', 8),
  ('streak_30', 'Thirty Days', 'Practise thirty days in a row.', 'practice', 9),
  ('first_thread', 'First Word', 'Start your first thread.', 'forum', 10),
  ('first_reply', 'In Dialogue', 'Write your first reply.', 'forum', 11),
  ('helpful_10', 'Well Received', 'Receive ten upvotes on your writing.', 'forum', 12),
  ('helpful_50', 'Widely Read', 'Receive fifty upvotes on your writing.', 'forum', 13),
  ('solver', 'The Answer', 'Have a reply marked as the solution.', 'forum', 14),
  ('cartographer', 'Cartographer', 'Log a result from a test in the Directory.', 'directory', 15),
  ('fellow', 'Fellow', 'Reach the third tier and open the Inner Room.', 'rank', 16),
  ('laureate', 'Laureate', 'Reach the sixth and highest tier.', 'rank', 17);

insert into public.directory_tests
  (slug, name, author, organisation, measures, format, item_count, difficulty, ceiling, duration, cost, is_free,
   supervised, url, link_status, notes, score_scale, position)
values
  ('mensa-norway', 'Mensa Norway Online IQ Test', 'Mensa Norway', 'Mensa Norway',
   'Non-verbal pattern reasoning. Each puzzle is a 3×3 grid of figures with one missing; you choose the piece that completes it.',
   '35 visual matrix puzzles, six options each, rising in difficulty', 35, 'moderate',
   'Scores reported from IQ 85 to 145 (SD 15)', '25 minutes', 'Free', true, false,
   'https://test.mensa.no/', 'ok',
   'An indication of general ability, not a substitute for a supervised test. One point per correct answer, no penalty for wrong answers, no bonus for finishing early.',
   'IQ (SD 15)', 1),

  ('the-mental-inventor', 'The Mental Inventor', 'Matthew Scillitani', 'Neurolus Psychometrics',
   'General ability through verbal, numerical and spatial items. Presented as a supervised admissions exam for high-IQ societies.',
   '40 items, supervised', 40, 'very_hard', null, '3 hours', 'US$35', false, true,
   'https://neurolus.com/exams/mental', 'ok',
   'For adults aged 18 or older, in English. One attempt only; retesting is not permitted.', 'IQ (SD 15)', 10),

  ('numerologica', 'Numerologica', 'Matthew Scillitani', 'Neurolus Psychometrics',
   'Verbal, numerical and logical reasoning, offered as a timed recreational test.',
   '30 items, unsupervised; reference aids and a pocket calculator allowed', 30, 'hard', null, '2 hours', 'US$8', false, false,
   'https://neurolus.com/diversions/numerologica', 'ok',
   'One attempt only; retesting is not permitted.', 'IQ (SD 15)', 11),

  ('mahirs-iq-tests', 'Mahir''s IQ Tests', 'Mahir Wu', null,
   'A collection of high-range tests by one author, including Numeric Revivification, NIT, NIT-II, CAT and CAT-II.',
   'Several separate tests; see each test''s own page', null, 'very_hard', 'Varies by test', null, null, null, false,
   'https://mahirwu.wixsite.com/iqtests/en', 'ok',
   'Item counts, time limits and fees are given on the individual test pages.', 'IQ (SD 15)', 12),

  ('three-sonnets', 'Three Sonnets', 'Heinrich Siemens', null,
   'Knowledge-assisted problem solving. Cryptic items set in three sonnets; some have a covert question behind the overt one.',
   '42 items; books and the Internet may be used; one submission', 42, 'extreme',
   'Raw score from the author; a norm by Paul Cooijmans is published separately', 'No time limit stated', null, null, false,
   'https://www.tweeback.com/hriq/three-sonnets.pdf', 'ok',
   'Some answers are case-sensitive. Items must not be discussed or published.', 'Raw score', 13),

  ('916-test', '916 Test', 'Laurent Dubois', null,
   'A high-range test listed among tests by other authors. Its official page could not be reached when this entry was written, so its contents are unverified.',
   null, null, 'very_hard', null, null, null, null, false,
   'http://www.chez.com/remuemeninges/916.htm', 'unreachable',
   'The official page returned an error in November 2026. If you know where the test now lives, tell the staff.', 'IQ (SD 15)', 14),

  ('numerus-basic', 'NUMERUS BASIC', 'Ivan Ivec', 'UltimaIQ',
   'Numerical sequence reasoning: find the missing term in each sequence, answered as an integer or a fraction.',
   '20 number sequences', 20, 'hard', 'IQ 160 (SD 15)', 'No time limit stated', 'Free', true, false,
   'http://free.ultimaiq.net/numerus_basic.htm', 'ok',
   'The author advises no more than two attempts for an accurate score.', 'IQ (SD 15)', 15),

  ('numericore', 'Numericore Test', 'Daniel Fourie', null,
   'Numerical and spatial-logical problem solving.',
   '14 problems: 10 numerical and 4 spatial/logical', 14, 'very_hard', null, null, null, null, false,
   'https://numericore.weebly.com/', 'ok',
   'The author states it is accepted for admission by GOTHIQ, Opal Quest Group and TENIQ.', 'IQ (SD 15)', 16),

  ('zollys-iq-tests', 'Zolly''s IQ Tests', 'Zolly Darko', null,
   'A large catalogue of high-range tests in numerical, spatial, verbal and mixed form.',
   'Send-in tests answered by email, plus several free tests with instant results', null, 'very_hard',
   'Varies by test', null, '€5 scoring fee for send-in tests; some tests free', null, false,
   'https://zollydarko.com/iq-tests/index.htm', 'ok',
   'The site notes that the norms of its free tests are theoretical.', 'IQ (SD 15)', 17),

  ('numerus-strictus-logicae-36', 'Numerus Strictus Logicae 36', 'Andrei Udriște', null,
   'Numerical logic puzzles that need only basic arithmetic, careful observation and step-by-step deduction.',
   '36 items; no calculator needed', 36, 'extreme', null, null, null, null, false,
   'https://nsl36.netlify.app/', 'ok',
   'Described by its author as uncommonly difficult. A certificate is offered.', 'IQ (SD 15)', 18),

  ('cogn-iq', 'Cogn-IQ', 'Xavier Jouve', 'Cogn-IQ',
   'Online cognitive tests and psychometric experiments, including the Jouve-Cerebrals Test of Induction (inductive reasoning).',
   'Several online tests', null, 'hard', 'Varies by test', null, 'Free tests available', null, false,
   'https://www.cogn-iq.org/', 'ok',
   'The site blocks automated checks, so details here come from the author''s published materials.', 'IQ (SD 15)', 19),

  ('lda-swan', 'LDA-SWaN', 'Gianluigi Lombardi', null,
   'General intelligence (g) through logic-divergent analogies that mix space, words and numbers.',
   '30 analogies', 30, 'extreme', 'Aimed at one to five standard deviations above average', null, null, null, false,
   'https://ldaswantest.wixsite.com/iqtest', 'ok', null, 'IQ (SD 15)', 20),

  ('thetis', 'THETIS Adaptive Online IQ Test', 'Jo Christopher M. Resquites', 'EngineeredIQ',
   'Fluid reasoning, adaptive. No vocabulary, arithmetic or prior knowledge is needed.',
   'About 30 adaptive puzzles after a 16-puzzle practice module', 30, 'hard',
   'Reports up to IQ 230+ (SD 15); most precise between about 55 and 200', '25–45 minutes', 'US$29.99 per session', false, false,
   'https://engineerediq.org/', 'ok',
   'Results include a 95% range, a percentile and facet scores.', 'IQ (SD 15)', 21),

  ('slse-form-i', 'Strict Logic Sequences Examination', 'Jonathan Wai', null,
   'Detecting patterns in sequences, mostly numerical with some letters. Presented by the author as an experimental measure of the high range.',
   '50 items, four of them in two parts; answers by email', 50, 'extreme',
   'Raw score only; no IQ is reported', 'Untimed', '€10 or US$15', false, false,
   'https://iq-tests-for-the-high-range.com/others/slse.html', 'ok',
   'Score reports can take several weeks. Answers must not be shared.', 'Raw score', 22),

  ('slse-form-ii', 'Strict Logic Sequences Examination – Form II', 'Jonathan Wai', null,
   'Continuing numerical sequences. Presented by the author as an experimental measure of the high range.',
   '30 number sequences; answers by email', 30, 'extreme', null, 'Untimed', '€10 or US$15', false, false,
   'https://iq-tests-for-the-high-range.com/others/slse2.html', 'ok', null, 'Raw score', 23),

  ('slse-spatial-48', 'Strict Logic Spatial Examination 48', 'Jonathan Wai', null,
   'Detecting patterns in visual, spatial items. Presented by the author as an experimental measure of the high range.',
   'Visual pattern items over several pages', null, 'extreme', null, 'Untimed', null, null, false,
   'https://iq-tests-for-the-high-range.com/others/slse_sp/', 'ok', null, 'Raw score', 24);
