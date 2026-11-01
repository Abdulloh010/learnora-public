-- Learnora Sample Data Seed
-- Run this AFTER creating the schema (db/schema.sql)
-- Safe to run multiple times (uses INSERT IGNORE)

-- ─── Subjects ────────────────────────────────────────────────────────────────
INSERT IGNORE INTO subjects (id, name, slug, icon, color, description) VALUES
(1, 'Mathematics',  'math',        'fas fa-calculator',        '#4f46e5', 'Algebra, geometry, calculus and more'),
(2, 'Physics',      'physics',     'fas fa-bolt',              '#0891b2', 'Mechanics, electricity, waves and optics'),
(3, 'Chemistry',    'chemistry',   'fas fa-flask',             '#059669', 'Elements, reactions, organic chemistry'),
(4, 'Biology',      'biology',     'fas fa-dna',               '#dc2626', 'Cells, genetics, evolution, ecology'),
(5, 'English',      'english',     'fas fa-book-open',         '#d97706', 'Grammar, writing, literature'),
(6, 'History',      'history',     'fas fa-building-columns',  '#7c3aed', 'World history, civilizations, events');

-- ─── Quizzes ─────────────────────────────────────────────────────────────────
INSERT IGNORE INTO quizzes (id, subject_id, title, description, difficulty, grade_range, xp_reward, is_active) VALUES
(1,  1, 'Basic Algebra',         'Solve equations and work with variables',      'easy',   '6-7',    50,  1),
(2,  1, 'Geometry Fundamentals', 'Shapes, angles, area and perimeter',           'medium', '8-9',    80,  1),
(3,  2, 'Newton\'s Laws',        'Forces, motion and Newton\'s three laws',      'easy',   '8-9',    60,  1),
(4,  2, 'Electricity Basics',    'Circuits, voltage, current and resistance',    'medium', '10-11',  90,  1),
(5,  3, 'Periodic Table',        'Elements, symbols, atomic numbers',            'easy',   '8-9',    50,  1),
(6,  3, 'Chemical Reactions',    'Types of reactions and balancing equations',   'medium', '10-11',  80,  1),
(7,  4, 'Cell Biology',          'Cell structure, organelles and functions',     'easy',   '8-9',    60,  1),
(8,  4, 'Genetics',              'DNA, inheritance and Mendel\'s laws',          'medium', '10-11',  90,  1),
(9,  5, 'Grammar Essentials',    'Parts of speech, tenses and sentence types',  'easy',   '6-7',    50,  1),
(10, 5, 'Literary Devices',      'Metaphor, simile, alliteration and more',     'medium', '10-11',  70,  1),
(11, 6, 'Ancient Civilizations', 'Egypt, Greece, Rome and Mesopotamia',         'easy',   '6-7',    60,  1),
(12, 6, 'World War II',          'Causes, events and consequences of WWII',     'medium', '10-11', 100,  1);

-- ─── Questions — Quiz 1: Basic Algebra ──────────────────────────────────────
INSERT IGNORE INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, order_num) VALUES
(1, 'Solve for x: 2x + 4 = 12', '3', '4', '5', '6', 'b', 1),
(1, 'What is the value of 3x when x = 5?', '8', '10', '15', '20', 'c', 2),
(1, 'Simplify: 4x + 2x', '6x', '6x²', '8x', '2x', 'a', 3),
(1, 'Solve: x - 7 = 3', '4', '10', '-4', '3', 'b', 4),
(1, 'If 5x = 25, then x = ?', '4', '5', '6', '7', 'b', 5);

-- ─── Questions — Quiz 2: Geometry Fundamentals ──────────────────────────────
INSERT IGNORE INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, order_num) VALUES
(2, 'What is the sum of angles in a triangle?', '90°', '180°', '270°', '360°', 'b', 1),
(2, 'Area of a rectangle with length 6 and width 4?', '10', '20', '24', '30', 'c', 2),
(2, 'How many sides does a hexagon have?', '5', '6', '7', '8', 'b', 3),
(2, 'What is the perimeter of a square with side 5?', '10', '15', '20', '25', 'c', 4),
(2, 'The diameter is __ times the radius', '1', '2', '3', '4', 'b', 5);

-- ─── Questions — Quiz 3: Newton's Laws ──────────────────────────────────────
INSERT IGNORE INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, order_num) VALUES
(3, 'Newton\'s first law is also called the law of?', 'Motion', 'Inertia', 'Acceleration', 'Gravity', 'b', 1),
(3, 'Force = Mass × ?', 'Velocity', 'Speed', 'Acceleration', 'Distance', 'c', 2),
(3, 'If no net force acts on an object, it will?', 'Speed up', 'Slow down', 'Remain at rest or constant velocity', 'Change direction', 'c', 3),
(3, 'Newton\'s third law states every action has an equal and?', 'Greater reaction', 'Smaller reaction', 'Opposite reaction', 'Same reaction', 'c', 4),
(3, 'The SI unit of force is?', 'Watt', 'Joule', 'Newton', 'Pascal', 'c', 5);

-- ─── Questions — Quiz 4: Electricity Basics ─────────────────────────────────
INSERT IGNORE INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, order_num) VALUES
(4, 'Ohm\'s Law states V = ?', 'I + R', 'I - R', 'I × R', 'I / R', 'c', 1),
(4, 'Current is measured in?', 'Volts', 'Ohms', 'Watts', 'Amperes', 'd', 2),
(4, 'In a series circuit, the current is?', 'Different at each component', 'The same throughout', 'Zero', 'Shared equally', 'b', 3),
(4, 'Resistance is measured in?', 'Amperes', 'Volts', 'Ohms', 'Watts', 'c', 4),
(4, 'Power = Voltage × ?', 'Resistance', 'Current', 'Charge', 'Time', 'b', 5);

-- ─── Questions — Quiz 5: Periodic Table ─────────────────────────────────────
INSERT IGNORE INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, order_num) VALUES
(5, 'What is the chemical symbol for Gold?', 'Gd', 'Go', 'Au', 'Ag', 'c', 1),
(5, 'How many elements are in the periodic table?', '108', '116', '118', '120', 'c', 2),
(5, 'Which element has atomic number 1?', 'Helium', 'Hydrogen', 'Lithium', 'Carbon', 'b', 3),
(5, 'What is the symbol for Sodium?', 'So', 'Sd', 'Na', 'Sn', 'c', 4),
(5, 'Noble gases are in Group?', '1', '7', '8', '18', 'd', 5);

-- ─── Questions — Quiz 6: Chemical Reactions ─────────────────────────────────
INSERT IGNORE INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, order_num) VALUES
(6, 'In a combustion reaction, a substance reacts with?', 'Water', 'Nitrogen', 'Oxygen', 'Carbon', 'c', 1),
(6, 'What type of reaction produces a precipitate?', 'Synthesis', 'Decomposition', 'Combustion', 'Precipitation', 'd', 2),
(6, 'Balance: H2 + O2 → H2O. Coefficients are?', '1,1,1', '2,1,2', '1,2,2', '2,2,1', 'b', 3),
(6, 'An acid and base react to form?', 'An oxide', 'A salt and water', 'A gas only', 'A metal', 'b', 4),
(6, 'Which of these is an exothermic reaction?', 'Cooking food', 'Melting ice', 'Burning wood', 'Evaporation', 'c', 5);

-- ─── Questions — Quiz 7: Cell Biology ───────────────────────────────────────
INSERT IGNORE INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, order_num) VALUES
(7, 'Which organelle is known as the powerhouse of the cell?', 'Nucleus', 'Ribosome', 'Mitochondria', 'Vacuole', 'c', 1),
(7, 'The cell membrane is made of?', 'Protein only', 'Lipid bilayer', 'Carbohydrates', 'DNA', 'b', 2),
(7, 'Plant cells have cell walls made of?', 'Protein', 'Starch', 'Cellulose', 'Chitin', 'c', 3),
(7, 'Where is DNA stored in the cell?', 'Cytoplasm', 'Nucleus', 'Ribosome', 'Golgi body', 'b', 4),
(7, 'Photosynthesis occurs in the?', 'Mitochondria', 'Nucleus', 'Chloroplast', 'Vacuole', 'c', 5);

-- ─── Questions — Quiz 8: Genetics ───────────────────────────────────────────
INSERT IGNORE INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, order_num) VALUES
(8, 'DNA stands for?', 'Deoxyribonucleic acid', 'Deoxyribonitric acid', 'Dinitrogen acid', 'Dextrose nucleic acid', 'a', 1),
(8, 'Dominant alleles are represented by?', 'Lowercase letters', 'Uppercase letters', 'Numbers', 'Symbols', 'b', 2),
(8, 'A person with two identical alleles is?', 'Heterozygous', 'Codominant', 'Homozygous', 'Recessive', 'c', 3),
(8, 'Mendel used which plant for his experiments?', 'Maize', 'Pea plant', 'Sunflower', 'Wheat', 'b', 4),
(8, 'How many chromosomes do humans have?', '23', '44', '46', '48', 'c', 5);

-- ─── Questions — Quiz 9: Grammar Essentials ─────────────────────────────────
INSERT IGNORE INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, order_num) VALUES
(9, 'Which of these is a noun?', 'Run', 'Quickly', 'Happiness', 'Blue', 'c', 1),
(9, 'Choose the correct past tense of "go"', 'Goed', 'Gone', 'Went', 'Going', 'c', 2),
(9, 'An adjective describes a?', 'Verb', 'Noun', 'Adverb', 'Pronoun', 'b', 3),
(9, 'Which sentence is in the passive voice?', 'She ate the cake', 'The cake was eaten by her', 'She eats cake', 'She will eat cake', 'b', 4),
(9, '"Very" in "very fast" is an?', 'Adjective', 'Noun', 'Adverb', 'Verb', 'c', 5);

-- ─── Questions — Quiz 10: Literary Devices ──────────────────────────────────
INSERT IGNORE INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, order_num) VALUES
(10, '"The moon is a silver coin" is an example of?', 'Simile', 'Metaphor', 'Alliteration', 'Onomatopoeia', 'b', 1),
(10, '"As brave as a lion" is an example of?', 'Metaphor', 'Hyperbole', 'Simile', 'Personification', 'c', 2),
(10, '"The wind whispered" is an example of?', 'Simile', 'Alliteration', 'Personification', 'Metaphor', 'c', 3),
(10, 'Repetition of the same consonant sound is called?', 'Assonance', 'Alliteration', 'Rhyme', 'Rhythm', 'b', 4),
(10, '"I have a million things to do" is an example of?', 'Simile', 'Metaphor', 'Hyperbole', 'Irony', 'c', 5);

-- ─── Questions — Quiz 11: Ancient Civilizations ─────────────────────────────
INSERT IGNORE INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, order_num) VALUES
(11, 'The Great Pyramid of Giza was built by?', 'Greeks', 'Romans', 'Egyptians', 'Babylonians', 'c', 1),
(11, 'Ancient Greek city-states are called?', 'Empires', 'Polis', 'Provinces', 'Territories', 'b', 2),
(11, 'The Roman Colosseum was used for?', 'Trade', 'Prayer', 'Gladiatorial contests', 'Government', 'c', 3),
(11, 'Writing in ancient Egypt used?', 'Latin', 'Hieroglyphics', 'Cuneiform', 'Runes', 'b', 4),
(11, 'Mesopotamia was located between which two rivers?', 'Nile and Congo', 'Tigris and Euphrates', 'Rhine and Danube', 'Indus and Ganges', 'b', 5);

-- ─── Questions — Quiz 12: World War II ──────────────────────────────────────
INSERT IGNORE INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, order_num) VALUES
(12, 'World War II began in?', '1935', '1939', '1941', '1942', 'b', 1),
(12, 'Which country did Germany invade to start WWII?', 'France', 'Poland', 'Russia', 'Britain', 'b', 2),
(12, 'The Allied powers included which of these?', 'Germany, Italy, Japan', 'USA, UK, USSR', 'Spain, France, China', 'Turkey, Egypt, India', 'b', 3),
(12, 'D-Day landings took place in?', 'Italy', 'Belgium', 'Normandy, France', 'Netherlands', 'c', 4),
(12, 'WWII ended in Europe in?', '1944', '1945', '1946', '1947', 'b', 5);

-- ─── ADDITIONAL QUALITY QUIZZES ──────────────────────────────────────────────

-- ─── Quizzes 13–24 ───────────────────────────────────────────────────────────
INSERT IGNORE INTO quizzes (id, subject_id, title, description, difficulty, grade_range, xp_reward, is_active) VALUES
(13, 1, 'Quadratic Equations',       'Factoring, the quadratic formula, and parabolas',     'hard',   '10-11', 120, 1),
(14, 1, 'Fractions & Percentages',   'Simplify, compare and compute with fractions & %',    'easy',   '6-7',    50, 1),
(15, 2, 'Waves & Sound',             'Wave properties, frequency, amplitude and sound',      'medium', '9-10',   80, 1),
(16, 2, 'Light & Optics',            'Reflection, refraction, lenses and mirrors',           'medium', '10-11',  90, 1),
(17, 3, 'Acids, Bases & pH',         'Properties of acids/bases, neutralisation and pH',     'medium', '9-10',   80, 1),
(18, 3, 'Organic Chemistry',         'Hydrocarbons, functional groups and reactions',        'hard',   '11-12', 120, 1),
(19, 4, 'Human Body Systems',        'Circulatory, respiratory and digestive systems',       'medium', '9-10',   80, 1),
(20, 4, 'Evolution & Natural Selection','Darwin, adaptation, speciation and evidence',       'medium', '10-11',  90, 1),
(21, 5, 'Punctuation & Writing',     'Commas, semicolons, apostrophes and style',            'medium', '8-9',    70, 1),
(22, 5, 'Shakespearean Literature',  'Key plays, characters, themes and quotes',             'hard',   '11-12', 110, 1),
(23, 6, 'The Cold War',              'USA vs USSR, arms race, proxy wars and détente',       'medium', '10-11', 100, 1),
(24, 6, 'The French Revolution',     'Causes, events, key figures and legacy 1789–1799',    'hard',   '11-12', 110, 1);

-- ─── Questions — Quiz 13: Quadratic Equations ────────────────────────────────
INSERT IGNORE INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, order_num) VALUES
(13, 'What are the solutions of x² - 5x + 6 = 0?', 'x = 1 and x = 6', 'x = 2 and x = 3', 'x = -2 and x = -3', 'x = 3 and x = -2', 'b', 'Factoring: (x-2)(x-3)=0 gives x=2 and x=3.', 1),
(13, 'The quadratic formula is x = ?', '(-b ± √(b²-4ac)) / 2a', '(-b ± √(b+4ac)) / 2a', '(b ± √(b²-4ac)) / 2a', '(-b ± √(b²+4ac)) / 2a', 'a', 'The standard quadratic formula applies to ax²+bx+c=0.', 2),
(13, 'The graph of a quadratic equation is called a?', 'Hyperbola', 'Ellipse', 'Parabola', 'Circle', 'c', 'A quadratic function y=ax²+bx+c always graphs as a parabola.', 3),
(13, 'The discriminant b²-4ac > 0 means the equation has?', 'No real solutions', 'One real solution', 'Two real solutions', 'Infinite solutions', 'c', 'A positive discriminant indicates two distinct real roots.', 4),
(13, 'What is the vertex x-coordinate of y = x² - 4x + 7?', '2', '-2', '4', '-4', 'a', 'Vertex x = -b/2a = -(-4)/2(1) = 2.', 5),
(13, 'Solve: x² = 49', 'x = 7 only', 'x = -7 only', 'x = ±7', 'x = ±49', 'c', 'Taking square roots of both sides gives x = ±7.', 6),
(13, 'Which of these is a perfect square trinomial?', 'x² + 4x + 16', 'x² + 6x + 9', 'x² + 3x + 4', 'x² - 5x + 25', 'b', 'x²+6x+9 = (x+3)², a perfect square trinomial.', 7),
(13, 'If a > 0 in ax²+bx+c, the parabola opens?', 'Downward', 'Upward', 'Sideways', 'Horizontally', 'b', 'Positive leading coefficient means the parabola opens upward.', 8);

-- ─── Questions — Quiz 14: Fractions & Percentages ───────────────────────────
INSERT IGNORE INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, order_num) VALUES
(14, '1/2 + 1/3 = ?', '2/5', '2/6', '5/6', '3/5', 'c', 'Common denominator 6: 3/6 + 2/6 = 5/6.', 1),
(14, 'What is 25% of 80?', '15', '20', '25', '30', 'b', '25% = 25/100 = 0.25; 0.25 × 80 = 20.', 2),
(14, 'Simplify 18/24', '3/4', '2/3', '6/8', '9/12', 'a', 'GCF of 18 and 24 is 6; 18÷6 / 24÷6 = 3/4.', 3),
(14, '3/4 × 2/5 = ?', '5/9', '6/20', '5/20', '6/9', 'b', '3×2 / 4×5 = 6/20, which simplifies to 3/10.', 4),
(14, 'What percentage is 45 out of 180?', '20%', '25%', '30%', '40%', 'b', '45/180 × 100 = 25%.', 5),
(14, '3/4 ÷ 1/2 = ?', '3/8', '6/4', '3/2', '2/3', 'c', 'Dividing fractions: 3/4 × 2/1 = 6/4 = 3/2.', 6),
(14, 'A coat costs $80 after a 20% discount. What was the original price?', '$96', '$100', '$104', '$64', 'b', 'If 80 is 80% of original, original = 80/0.8 = $100.', 7),
(14, 'Express 0.375 as a fraction in lowest terms', '3/8', '37/100', '3/80', '4/10', 'a', '0.375 = 375/1000 = 3/8.', 8);

-- ─── Questions — Quiz 15: Waves & Sound ─────────────────────────────────────
INSERT IGNORE INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, order_num) VALUES
(15, 'The number of wave cycles per second is called?', 'Amplitude', 'Wavelength', 'Frequency', 'Speed', 'c', 'Frequency (Hz) measures how many complete cycles occur per second.', 1),
(15, 'Sound travels fastest through?', 'Vacuum', 'Air', 'Water', 'Steel', 'd', 'Sound travels fastest in solids due to closer-packed particles.', 2),
(15, 'The maximum displacement of a wave from its rest position is the?', 'Frequency', 'Wavelength', 'Period', 'Amplitude', 'd', 'Amplitude measures the height of the wave peak from equilibrium.', 3),
(15, 'The wave equation is v = ?', 'f × λ', 'f / λ', 'λ / f', 'f + λ', 'a', 'Wave speed = frequency × wavelength.', 4),
(15, 'Sound cannot travel through a?', 'Solid', 'Liquid', 'Gas', 'Vacuum', 'd', 'Sound needs a medium (particles) to travel — a vacuum has none.', 5),
(15, 'A higher frequency sound has a?', 'Lower pitch', 'Higher pitch', 'Larger wavelength', 'Slower speed', 'b', 'Human hearing perceives higher frequency as higher pitch.', 6),
(15, 'Longitudinal waves have oscillations that are?', 'Perpendicular to wave direction', 'Parallel to wave direction', 'Circular', 'Random', 'b', 'In longitudinal waves, particles vibrate in the same direction as energy transfer.', 7),
(15, 'The Doppler effect describes the change in perceived __ due to relative motion?', 'Amplitude', 'Speed', 'Frequency', 'Phase', 'c', 'The Doppler effect causes an apparent frequency shift as source/observer move.', 8);

-- ─── Questions — Quiz 16: Light & Optics ────────────────────────────────────
INSERT IGNORE INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, order_num) VALUES
(16, 'When light bounces off a surface it is called?', 'Refraction', 'Diffraction', 'Reflection', 'Absorption', 'c', 'Reflection is the bouncing of light off a surface according to the law of reflection.', 1),
(16, 'The bending of light as it passes from one medium to another is?', 'Reflection', 'Refraction', 'Diffraction', 'Dispersion', 'b', 'Refraction occurs because light changes speed in different media.', 2),
(16, 'A convex lens causes light rays to?', 'Diverge', 'Absorb', 'Converge', 'Reflect', 'c', 'A convex (converging) lens brings parallel rays to a focus point.', 3),
(16, 'The angle of incidence equals the angle of reflection. This is the law of?', 'Snell', 'Refraction', 'Reflection', 'Diffraction', 'c', 'The law of reflection states i = r, measured from the normal.', 4),
(16, 'White light split into colours by a prism demonstrates?', 'Reflection', 'Diffraction', 'Dispersion', 'Polarisation', 'c', 'A prism disperses white light because different wavelengths refract by different amounts.', 5),
(16, 'Which colour of light has the highest frequency?', 'Red', 'Orange', 'Violet', 'Yellow', 'c', 'Violet light has the shortest wavelength and thus the highest frequency in the visible spectrum.', 6),
(16, 'A concave mirror produces a virtual image when the object is?', 'Beyond the focal point', 'At the focal point', 'Between F and the mirror', 'At infinity', 'c', 'When the object is inside the focal length of a concave mirror, the image is virtual and upright.', 7),
(16, 'Total internal reflection occurs when light travels from?', 'Air to glass', 'Air to water', 'A denser to a less dense medium beyond the critical angle', 'A less dense to a denser medium', 'c', 'TIR requires the angle of incidence to exceed the critical angle and going from dense to less-dense medium.', 8);

-- ─── Questions — Quiz 17: Acids, Bases & pH ─────────────────────────────────
INSERT IGNORE INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, order_num) VALUES
(17, 'A pH of 7 indicates a solution is?', 'Acidic', 'Basic', 'Neutral', 'Strongly acidic', 'c', 'pH 7 is neutral — pure water is pH 7.', 1),
(17, 'Acids turn litmus paper?', 'Blue', 'Red', 'Green', 'Yellow', 'b', 'Litmus turns red in acidic solutions.', 2),
(17, 'The reaction between an acid and a base is called?', 'Oxidation', 'Reduction', 'Neutralisation', 'Combustion', 'c', 'Neutralisation produces a salt and water from acid + base.', 3),
(17, 'Hydrochloric acid has the formula?', 'H₂SO₄', 'HNO₃', 'HCl', 'H₃PO₄', 'c', 'HCl is hydrochloric acid, a strong acid.', 4),
(17, 'What is the pH of a strong acid like HCl (1M)?', '7', '10', '14', '0', 'd', 'A 1M solution of strong acid has pH close to 0.', 5),
(17, 'Which of these is an alkali?', 'Vinegar', 'Lemon juice', 'Sodium hydroxide', 'Carbonic acid', 'c', 'NaOH is a strong base (alkali) with pH > 7.', 6),
(17, 'Buffer solutions resist changes in?', 'Temperature', 'Colour', 'pH', 'Concentration', 'c', 'Buffers resist pH changes when small amounts of acid or base are added.', 7),
(17, 'Stomach acid primarily contains which acid?', 'Sulfuric acid', 'Hydrochloric acid', 'Nitric acid', 'Phosphoric acid', 'b', 'The stomach produces HCl to aid digestion.', 8);

-- ─── Questions — Quiz 18: Organic Chemistry ─────────────────────────────────
INSERT IGNORE INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, order_num) VALUES
(18, 'Organic chemistry is primarily the study of compounds containing?', 'Nitrogen', 'Oxygen', 'Carbon', 'Hydrogen', 'c', 'Organic chemistry focuses on carbon-based compounds.', 1),
(18, 'Alkanes have the general formula?', 'CₙH₂ₙ', 'CₙH₂ₙ₋₂', 'CₙH₂ₙ₊₂', 'CₙHₙ', 'c', 'Saturated alkanes follow CₙH₂ₙ₊₂.', 2),
(18, 'What functional group do alcohols contain?', '-COOH', '-OH', '-NH₂', '-CHO', 'b', 'Alcohols are identified by the -OH (hydroxyl) group.', 3),
(18, 'Ethene (C₂H₄) is an example of an?', 'Alkane', 'Alkyne', 'Alkene', 'Aromatic hydrocarbon', 'c', 'Alkenes contain a carbon-carbon double bond, like C₂H₄.', 4),
(18, 'The process of breaking large hydrocarbons into smaller ones is called?', 'Polymerisation', 'Fermentation', 'Cracking', 'Distillation', 'c', 'Cracking is used in the petroleum industry to make useful fuels.', 5),
(18, 'Benzene (C₆H₆) is the simplest?', 'Alkane', 'Alkene', 'Aromatic compound', 'Alcohol', 'c', 'Benzene is the archetypal aromatic compound with a ring of 6 carbons.', 6),
(18, 'In addition polymerisation, monomers join by breaking their?', 'Single bonds', 'Ionic bonds', 'Double bonds', 'Hydrogen bonds', 'c', 'The C=C double bond in alkene monomers opens during addition polymerisation.', 7),
(18, 'Carboxylic acids contain the functional group?', '-OH', '-CHO', '-COOH', '-CO-', 'c', 'The -COOH group defines carboxylic acids such as ethanoic (acetic) acid.', 8);

-- ─── Questions — Quiz 19: Human Body Systems ────────────────────────────────
INSERT IGNORE INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, order_num) VALUES
(19, 'Which organ pumps blood through the body?', 'Lung', 'Liver', 'Heart', 'Kidney', 'c', 'The heart is the muscular pump of the circulatory system.', 1),
(19, 'Red blood cells carry oxygen using which protein?', 'Myosin', 'Actin', 'Haemoglobin', 'Collagen', 'c', 'Haemoglobin binds O₂ in red blood cells.', 2),
(19, 'Gas exchange in the lungs occurs in tiny sacs called?', 'Bronchi', 'Trachea', 'Alveoli', 'Capillaries', 'c', 'Alveoli have thin walls and rich blood supply for efficient gas exchange.', 3),
(19, 'Which organ filters waste products from the blood?', 'Liver', 'Spleen', 'Pancreas', 'Kidney', 'd', 'Kidneys filter blood to produce urine and maintain homeostasis.', 4),
(19, 'Insulin is produced by the?', 'Thyroid gland', 'Adrenal gland', 'Pancreas', 'Liver', 'c', 'Beta cells in the pancreas secrete insulin to regulate blood sugar.', 5),
(19, 'The longest bone in the human body is the?', 'Humerus', 'Tibia', 'Femur', 'Spine', 'c', 'The femur (thigh bone) is the longest and strongest bone.', 6),
(19, 'Which blood type is the universal donor?', 'A', 'B', 'AB', 'O', 'd', 'Blood type O negative can be donated to any patient.', 7),
(19, 'The part of the brain responsible for balance and coordination is the?', 'Cerebrum', 'Medulla oblongata', 'Cerebellum', 'Hypothalamus', 'c', 'The cerebellum coordinates voluntary movements and balance.', 8);

-- ─── Questions — Quiz 20: Evolution & Natural Selection ─────────────────────
INSERT IGNORE INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, order_num) VALUES
(20, 'Charles Darwin published "On the Origin of Species" in?', '1839', '1859', '1879', '1899', 'b', 'Darwin published his landmark work on natural selection in 1859.', 1),
(20, 'Natural selection favours individuals that are best?', 'Largest', 'Colourful', 'Adapted to their environment', 'Fast-moving', 'c', 'Individuals better adapted survive and reproduce more successfully.', 2),
(20, 'The gradual change in species over time is called?', 'Mutation', 'Adaptation', 'Evolution', 'Speciation', 'c', 'Evolution is the process of change in heritable characteristics over generations.', 3),
(20, 'Homologous structures in different species indicate?', 'Convergent evolution', 'A common ancestor', 'Similar environment', 'Similar diet', 'b', 'Homologous structures suggest organisms share a common evolutionary origin.', 4),
(20, 'The formation of a new species from existing ones is called?', 'Mutation', 'Natural selection', 'Speciation', 'Adaptation', 'c', 'Speciation occurs when populations diverge genetically until they can no longer interbreed.', 5),
(20, 'Darwin''s finches in the Galapagos Islands are an example of?', 'Genetic drift', 'Adaptive radiation', 'Mass extinction', 'Convergent evolution', 'b', 'Different beak shapes evolved to exploit different food sources — adaptive radiation.', 6),
(20, 'Which scientist co-developed the theory of evolution by natural selection with Darwin?', 'Gregor Mendel', 'Alfred Russel Wallace', 'Thomas Huxley', 'Louis Pasteur', 'b', 'Alfred Russel Wallace independently developed the theory and corresponded with Darwin.', 7),
(20, 'Antibiotic resistance in bacteria is an example of?', 'Lamarckian evolution', 'Genetic engineering', 'Natural selection in action', 'Epigenetics', 'c', 'Bacteria with resistance genes survive antibiotic treatment and reproduce — classic natural selection.', 8);

-- ─── Questions — Quiz 21: Punctuation & Writing ─────────────────────────────
INSERT IGNORE INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, order_num) VALUES
(21, 'Which sentence uses a comma correctly?', 'I went to the shop, and I bought milk.', 'I went, to the shop and I bought milk.', 'I went to the shop and, I bought milk.', 'I, went to the shop and I bought milk.', 'a', 'A comma before a coordinating conjunction (and/but/or) joining two independent clauses is correct.', 1),
(21, 'An apostrophe in "can''t" indicates?', 'Possession', 'A contraction (cannot)', 'Plural', 'A quotation', 'b', 'The apostrophe replaces the missing letters in contractions.', 2),
(21, 'A semicolon is correctly used to?', 'Introduce a list', 'Join two closely related independent clauses', 'Show possession', 'End a question', 'b', 'Semicolons link two related main clauses without a conjunction.', 3),
(21, 'Which is the correct possessive form for a group of students?', 'Students''s books', 'Student''s books', 'Students'' books', 'Studentss books', 'c', 'For plural nouns ending in -s, add only an apostrophe after the s.', 4),
(21, 'The Oxford comma is placed?', 'After the first item in a list', 'Before the final "and" in a list', 'After the final item', 'Before the first item', 'b', 'The Oxford (serial) comma appears before the final conjunction in a list of three or more.', 5),
(21, 'Which punctuation mark introduces a list or explanation?', 'Semicolon', 'Comma', 'Colon', 'Dash', 'c', 'A colon introduces a list, quotation, or explanatory phrase.', 6),
(21, 'A sentence fragment is a group of words that?', 'Contains a subject and a verb', 'Expresses a complete thought', 'Lacks a subject or a verb', 'Contains two independent clauses', 'c', 'A fragment is incomplete — it lacks a subject, verb, or complete thought.', 7),
(21, 'Parentheses () are used to add?', 'Emphasis', 'Non-essential supplementary information', 'A pause', 'A direct address', 'b', 'Parentheses enclose additional, non-essential information.', 8);

-- ─── Questions — Quiz 22: Shakespearean Literature ───────────────────────────
INSERT IGNORE INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, order_num) VALUES
(22, 'In which city is "Romeo and Juliet" set?', 'Florence', 'Rome', 'Verona', 'Venice', 'c', 'Shakespeare set Romeo and Juliet in Verona, Italy.', 1),
(22, '"To be, or not to be" is a soliloquy spoken by?', 'Macbeth', 'Othello', 'King Lear', 'Hamlet', 'd', 'Hamlet speaks this famous soliloquy in Act III of Hamlet.', 2),
(22, 'The witches in Macbeth are also called the?', 'Fates', 'Three Sisters', 'Wyrd Sisters', 'Prophetesses', 'c', 'They are often called the Weird (Wyrd) Sisters in the play.', 3),
(22, 'What is the name of Prospero''s spirit servant in "The Tempest"?', 'Puck', 'Ariel', 'Caliban', 'Trinculo', 'b', 'Ariel is the airy spirit who serves Prospero throughout The Tempest.', 4),
(22, 'Shakespeare''s plays are written primarily in?', 'Free verse', 'Iambic pentameter', 'Sonnets only', 'Prose only', 'b', 'Most of Shakespeare''s poetry is in iambic pentameter (10 syllables per line, da-DUM rhythm).', 5),
(22, 'In "Othello", who manipulates Othello into jealousy?', 'Cassio', 'Roderigo', 'Iago', 'Brabantio', 'c', 'Iago is the villain who engineers Othello''s jealousy and downfall.', 6),
(22, 'Which Shakespeare play features the character Shylock?', 'Twelfth Night', 'The Merchant of Venice', 'A Midsummer Night''s Dream', 'Much Ado About Nothing', 'b', 'Shylock is the Jewish moneylender in The Merchant of Venice.', 7),
(22, '"All the world''s a stage" is from which play?', 'As You Like It', 'Hamlet', 'King Lear', 'Twelfth Night', 'a', 'Jacques delivers this speech in Act II of As You Like It.', 8);

-- ─── Questions — Quiz 23: The Cold War ──────────────────────────────────────
INSERT IGNORE INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, order_num) VALUES
(23, 'The Cold War was primarily a conflict between?', 'USA and China', 'USA and the USSR', 'NATO and Japan', 'UK and USSR', 'b', 'The Cold War (1947–1991) was an ideological standoff between the USA and Soviet Union.', 1),
(23, 'The arms race involved the competition to build?', 'Conventional armies', 'Nuclear weapons', 'Naval fleets', 'Chemical weapons', 'b', 'Both superpowers developed massive nuclear arsenals during the arms race.', 2),
(23, 'NATO was formed in which year?', '1945', '1947', '1949', '1955', 'c', 'NATO (North Atlantic Treaty Organization) was established on 4 April 1949.', 3),
(23, 'The Berlin Wall was built in?', '1953', '1959', '1961', '1968', 'c', 'East Germany constructed the Berlin Wall on 13 August 1961.', 4),
(23, 'The Cuban Missile Crisis occurred in?', '1960', '1962', '1965', '1968', 'b', 'In October 1962, the world came closest to nuclear war over Soviet missiles in Cuba.', 5),
(23, 'The policy of Mutually Assured Destruction (MAD) relied on the logic of?', 'First-strike advantage', 'Nuclear deterrence', 'Conventional superiority', 'Economic sanctions', 'b', 'MAD deterred nuclear war because an attack would guarantee the attacker''s own destruction.', 6),
(23, 'The Soviet policy of "glasnost" (openness) was introduced by?', 'Stalin', 'Khrushchev', 'Brezhnev', 'Gorbachev', 'd', 'Mikhail Gorbachev introduced glasnost and perestroika in the late 1980s.', 7),
(23, 'The Cold War officially ended with?', 'The fall of the Berlin Wall in 1989', 'The dissolution of the USSR in 1991', 'The signing of SALT II', 'Reagan''s "Evil Empire" speech', 'b', 'The Cold War ended with the formal dissolution of the Soviet Union on 25 December 1991.', 8);

-- ─── Questions — Quiz 24: The French Revolution ─────────────────────────────
INSERT IGNORE INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, order_num) VALUES
(24, 'The French Revolution began in?', '1776', '1783', '1789', '1799', 'c', 'The Revolution is conventionally dated from 1789, beginning with the Estates-General and storming of the Bastille.', 1),
(24, 'The storming of the Bastille took place on?', '4 July 1789', '14 July 1789', '21 June 1789', '10 August 1792', 'b', '14 July 1789 — now celebrated as Bastille Day in France.', 2),
(24, 'The three ideals of the French Revolution were Liberty, Equality and?', 'Democracy', 'Fraternity', 'Justice', 'Sovereignty', 'b', '"Liberté, Égalité, Fraternité" became the motto of the French Republic.', 3),
(24, 'Which French king was executed by guillotine in 1793?', 'Louis XIV', 'Louis XV', 'Louis XVI', 'Napoleon I', 'c', 'King Louis XVI was executed on 21 January 1793 by guillotine.', 4),
(24, 'The "Reign of Terror" was led by?', 'Napoleon Bonaparte', 'Marie Antoinette', 'Maximilien Robespierre', 'Jacques Necker', 'c', 'Robespierre and the Committee of Public Safety directed the Terror (1793–1794).', 5),
(24, 'The Declaration of the Rights of Man was adopted in?', 'June 1789', 'August 1789', 'January 1793', 'November 1799', 'b', 'It was adopted by the National Constituent Assembly on 26 August 1789.', 6),
(24, 'Napoleon Bonaparte seized power in the coup of?', '18 Brumaire (1799)', '9 Thermidor (1794)', '10 August (1792)', 'Varennes (1791)', 'a', 'Napoleon''s coup d''état of 18 Brumaire (9 November 1799) ended the Directory.', 7),
(24, 'The main social grievance that fuelled the Revolution was?', 'Religious persecution', 'Unfair taxation on the Third Estate', 'Foreign invasion', 'Military defeat', 'b', 'The Third Estate (commoners) bore the tax burden while clergy and nobles were largely exempt.', 8);