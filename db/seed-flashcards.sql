-- ═══════════════════════════════════════════════════════════════════
-- Learnora Official Flashcard Decks — Seed Data
-- Run AFTER schema.sql and seed.sql (needs subjects + at least 1 user)
-- Uses creator_id = 1 (first registered user / admin)
-- ═══════════════════════════════════════════════════════════════════

-- First, create the tables if they don't exist yet
CREATE TABLE IF NOT EXISTS flashcard_decks (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    creator_id     INT NOT NULL,
    subject_id     INT DEFAULT NULL,
    title          VARCHAR(200) NOT NULL,
    description    TEXT,
    visibility     ENUM('public','private') NOT NULL DEFAULT 'private',
    is_official    TINYINT NOT NULL DEFAULT 0,
    card_count     INT NOT NULL DEFAULT 0,
    times_studied  INT NOT NULL DEFAULT 0,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
    INDEX idx_creator (creator_id),
    INDEX idx_visibility (visibility),
    INDEX idx_official (is_official),
    INDEX idx_subject (subject_id),
    INDEX idx_popular (times_studied)
);

CREATE TABLE IF NOT EXISTS flashcard_cards (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    deck_id    INT NOT NULL,
    front      TEXT NOT NULL,
    back       TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deck_id) REFERENCES flashcard_decks(id) ON DELETE CASCADE,
    INDEX idx_deck (deck_id)
);

CREATE TABLE IF NOT EXISTS flashcard_study_sessions (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT NOT NULL,
    deck_id          INT NOT NULL,
    cards_studied    INT NOT NULL DEFAULT 0,
    cards_known      INT NOT NULL DEFAULT 0,
    cards_learning   INT NOT NULL DEFAULT 0,
    xp_earned        INT NOT NULL DEFAULT 0,
    duration_seconds INT NOT NULL DEFAULT 0,
    completed_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (deck_id) REFERENCES flashcard_decks(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_deck (deck_id)
);

CREATE TABLE IF NOT EXISTS flashcard_card_progress (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    card_id     INT NOT NULL,
    confidence  TINYINT NOT NULL DEFAULT 0,
    times_seen  INT NOT NULL DEFAULT 0,
    last_seen   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES flashcard_cards(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_user_card (user_id, card_id),
    INDEX idx_user (user_id)
);

-- ─── DECK 1: Mathematics — Algebra Essentials ────────────────────
INSERT INTO flashcard_decks (id, creator_id, subject_id, title, description, visibility, is_official, card_count) VALUES
(1, 1, 1, 'Algebra Essentials', 'Key algebra concepts, formulas and definitions every student needs to know', 'public', 1, 12);

INSERT INTO flashcard_cards (deck_id, front, back, sort_order) VALUES
(1, 'What is a variable?', 'A symbol (usually a letter) that represents an unknown value in an expression or equation.', 1),
(1, 'What is the Quadratic Formula?', 'x = (-b ± √(b² - 4ac)) / 2a — used to solve ax² + bx + c = 0', 2),
(1, 'What does "PEMDAS" stand for?', 'Parentheses, Exponents, Multiplication, Division, Addition, Subtraction — the order of operations.', 3),
(1, 'What is the slope-intercept form?', 'y = mx + b, where m is the slope and b is the y-intercept.', 4),
(1, 'What is the difference between an expression and an equation?', 'An expression has no equal sign (e.g., 3x + 5). An equation has an equal sign (e.g., 3x + 5 = 14).', 5),
(1, 'What is factoring?', 'Breaking down a polynomial into simpler expressions (factors) that multiply together to give the original.', 6),
(1, 'What is the distributive property?', 'a(b + c) = ab + ac — multiply the outside term by each term inside the parentheses.', 7),
(1, 'What is an inequality?', 'A mathematical statement showing that two expressions are not equal, using <, >, ≤, or ≥.', 8),
(1, 'What is the absolute value of a number?', 'Its distance from zero on the number line, always non-negative. |−5| = 5, |3| = 3.', 9),
(1, 'What are like terms?', 'Terms with the same variable raised to the same power. Example: 3x² and 7x² are like terms.', 10),
(1, 'What is a polynomial?', 'An expression with one or more terms, each consisting of a coefficient and variable(s) raised to non-negative integer powers.', 11),
(1, 'What is the zero product property?', 'If ab = 0, then either a = 0 or b = 0 (or both). Used to solve factored equations.', 12);

-- ─── DECK 2: Mathematics — Geometry Key Theorems ─────────────────
INSERT INTO flashcard_decks (id, creator_id, subject_id, title, description, visibility, is_official, card_count) VALUES
(2, 1, 1, 'Geometry Key Theorems', 'Essential geometry theorems, postulates and formulas', 'public', 1, 10);

INSERT INTO flashcard_cards (deck_id, front, back, sort_order) VALUES
(2, 'What is the Pythagorean Theorem?', 'a² + b² = c² — In a right triangle, the sum of the squares of the two legs equals the square of the hypotenuse.', 1),
(2, 'Area of a circle', 'A = πr² — where r is the radius.', 2),
(2, 'Area of a triangle', 'A = ½ × base × height', 3),
(2, 'What are supplementary angles?', 'Two angles that add up to 180°.', 4),
(2, 'What are complementary angles?', 'Two angles that add up to 90°.', 5),
(2, 'Sum of interior angles of a triangle', '180° — always, regardless of the type of triangle.', 6),
(2, 'Circumference of a circle', 'C = 2πr or C = πd — where r is radius and d is diameter.', 7),
(2, 'What is a congruent shape?', 'Shapes that have the same size and shape. All corresponding sides and angles are equal.', 8),
(2, 'Volume of a rectangular prism', 'V = length × width × height', 9),
(2, 'What is the sum of interior angles of any polygon?', '(n − 2) × 180° — where n is the number of sides.', 10);

-- ─── DECK 3: Physics — Newton''s Laws of Motion ──────────────────
INSERT INTO flashcard_decks (id, creator_id, subject_id, title, description, visibility, is_official, card_count) VALUES
(3, 1, 2, 'Newton''s Laws of Motion', 'The three fundamental laws that describe how objects move', 'public', 1, 10);

INSERT INTO flashcard_cards (deck_id, front, back, sort_order) VALUES
(3, 'State Newton''s First Law', 'An object at rest stays at rest, and an object in motion stays in motion at constant velocity, unless acted upon by an unbalanced force. (Law of Inertia)', 1),
(3, 'State Newton''s Second Law', 'Force = mass × acceleration (F = ma). The acceleration of an object depends on the net force and its mass.', 2),
(3, 'State Newton''s Third Law', 'For every action, there is an equal and opposite reaction.', 3),
(3, 'What is inertia?', 'The tendency of an object to resist changes in its state of motion. More mass = more inertia.', 4),
(3, 'What is the unit of force?', 'Newton (N). 1 N = 1 kg × 1 m/s².', 5),
(3, 'What is friction?', 'A force that opposes the relative motion of two surfaces in contact. It converts kinetic energy to thermal energy.', 6),
(3, 'What is acceleration?', 'The rate of change of velocity over time. a = Δv / Δt. Unit: m/s².', 7),
(3, 'What is the difference between mass and weight?', 'Mass is the amount of matter (kg, constant everywhere). Weight is the gravitational force on mass (W = mg, varies by location).', 8),
(3, 'What is terminal velocity?', 'The constant maximum velocity reached when air resistance equals gravitational force, so net force = 0.', 9),
(3, 'What is momentum?', 'p = mass × velocity. A measure of how hard it is to stop a moving object. Unit: kg·m/s.', 10);

-- ─── DECK 4: Physics — Electricity Fundamentals ─────────────────
INSERT INTO flashcard_decks (id, creator_id, subject_id, title, description, visibility, is_official, card_count) VALUES
(4, 1, 2, 'Electricity Fundamentals', 'Circuits, voltage, current, resistance and Ohm''s Law', 'public', 1, 10);

INSERT INTO flashcard_cards (deck_id, front, back, sort_order) VALUES
(4, 'What is Ohm''s Law?', 'V = IR — Voltage (V) equals Current (I) times Resistance (R).', 1),
(4, 'What is electric current?', 'The flow of electric charge through a conductor. Measured in Amperes (A). I = Q/t.', 2),
(4, 'What is voltage?', 'The electric potential difference between two points. It "pushes" current through a circuit. Measured in Volts (V).', 3),
(4, 'What is resistance?', 'Opposition to current flow. Measured in Ohms (Ω). Depends on material, length, thickness, and temperature.', 4),
(4, 'Series circuit vs. parallel circuit', 'Series: components connected end-to-end, one path for current. Parallel: components connected across each other, multiple paths for current.', 5),
(4, 'What is electrical power?', 'P = VI = I²R = V²/R — the rate at which electrical energy is converted. Measured in Watts (W).', 6),
(4, 'What is a conductor?', 'A material that allows electric current to flow easily. Examples: copper, aluminum, silver.', 7),
(4, 'What is an insulator?', 'A material that resists the flow of electric current. Examples: rubber, plastic, glass.', 8),
(4, 'What happens to total resistance in a series circuit?', 'R_total = R1 + R2 + R3 + ... — resistances add up.', 9),
(4, 'What happens to total resistance in a parallel circuit?', '1/R_total = 1/R1 + 1/R2 + 1/R3 + ... — total resistance decreases.', 10);

-- ─── DECK 5: Chemistry — Periodic Table Essentials ───────────────
INSERT INTO flashcard_decks (id, creator_id, subject_id, title, description, visibility, is_official, card_count) VALUES
(5, 1, 3, 'Periodic Table Essentials', 'Key elements, groups and periodic trends every chemistry student should know', 'public', 1, 12);

INSERT INTO flashcard_cards (deck_id, front, back, sort_order) VALUES
(5, 'What is the atomic number?', 'The number of protons in an atom''s nucleus. It defines the element and its position on the periodic table.', 1),
(5, 'What are the first 10 elements in order?', 'H (Hydrogen), He (Helium), Li (Lithium), Be (Beryllium), B (Boron), C (Carbon), N (Nitrogen), O (Oxygen), F (Fluorine), Ne (Neon).', 2),
(5, 'What are alkali metals?', 'Group 1 elements (Li, Na, K, Rb, Cs, Fr). Very reactive, soft metals that form +1 ions.', 3),
(5, 'What are noble gases?', 'Group 18 elements (He, Ne, Ar, Kr, Xe, Rn). Very stable, unreactive gases with full outer electron shells.', 4),
(5, 'What are halogens?', 'Group 17 elements (F, Cl, Br, I, At). Highly reactive nonmetals that form -1 ions.', 5),
(5, 'What is electronegativity?', 'The ability of an atom to attract electrons in a chemical bond. Increases across a period, decreases down a group.', 6),
(5, 'What is ionization energy?', 'The energy required to remove an electron from an atom. Generally increases across a period and decreases down a group.', 7),
(5, 'What is an isotope?', 'Atoms of the same element with different numbers of neutrons. Same atomic number, different mass number.', 8),
(5, 'What is an ion?', 'An atom that has gained or lost electrons. Cation = positive (lost e⁻), Anion = negative (gained e⁻).', 9),
(5, 'What is atomic mass?', 'The weighted average mass of all naturally occurring isotopes of an element, measured in atomic mass units (amu).', 10),
(5, 'What is a period on the periodic table?', 'A horizontal row. Elements in the same period have the same number of electron shells.', 11),
(5, 'What is a group on the periodic table?', 'A vertical column. Elements in the same group have the same number of valence electrons and similar properties.', 12);

-- ─── DECK 6: Chemistry — Chemical Reactions ──────────────────────
INSERT INTO flashcard_decks (id, creator_id, subject_id, title, description, visibility, is_official, card_count) VALUES
(6, 1, 3, 'Chemical Reactions', 'Types of reactions, balancing equations and key concepts', 'public', 1, 10);

INSERT INTO flashcard_cards (deck_id, front, back, sort_order) VALUES
(6, 'What is a chemical reaction?', 'A process where reactants are transformed into products by breaking and forming chemical bonds.', 1),
(6, 'What are the 5 main types of chemical reactions?', 'Synthesis (A+B→AB), Decomposition (AB→A+B), Single replacement, Double replacement, Combustion.', 2),
(6, 'What is a balanced equation?', 'An equation where the number of atoms of each element is equal on both sides, obeying the Law of Conservation of Mass.', 3),
(6, 'What is an exothermic reaction?', 'A reaction that releases heat/energy to the surroundings. Products have less energy than reactants. Example: combustion.', 4),
(6, 'What is an endothermic reaction?', 'A reaction that absorbs heat/energy from surroundings. Products have more energy than reactants. Example: photosynthesis.', 5),
(6, 'What is a catalyst?', 'A substance that speeds up a chemical reaction without being consumed. It lowers the activation energy.', 6),
(6, 'What is the Law of Conservation of Mass?', 'Matter cannot be created or destroyed in a chemical reaction. Total mass of reactants = total mass of products.', 7),
(6, 'What is activation energy?', 'The minimum energy required for a chemical reaction to occur.', 8),
(6, 'What is a precipitate?', 'An insoluble solid that forms during a chemical reaction in solution.', 9),
(6, 'What is oxidation-reduction (redox)?', 'A reaction involving transfer of electrons. Oxidation = loss of electrons. Reduction = gain of electrons. (OIL RIG)', 10);

-- ─── DECK 7: Biology — Cell Biology ──────────────────────────────
INSERT INTO flashcard_decks (id, creator_id, subject_id, title, description, visibility, is_official, card_count) VALUES
(7, 1, 4, 'Cell Biology', 'Cell structures, organelles and their functions', 'public', 1, 12);

INSERT INTO flashcard_cards (deck_id, front, back, sort_order) VALUES
(7, 'What is the cell membrane?', 'A selectively permeable phospholipid bilayer that controls what enters and exits the cell.', 1),
(7, 'What is the nucleus?', 'The control center of the cell containing DNA. Surrounded by a nuclear envelope with pores.', 2),
(7, 'What are mitochondria?', 'The "powerhouse of the cell" — organelles that produce ATP through cellular respiration.', 3),
(7, 'What are ribosomes?', 'Small organelles that synthesize proteins by translating mRNA. Found free or on rough ER.', 4),
(7, 'What is the endoplasmic reticulum (ER)?', 'Rough ER: studded with ribosomes, makes proteins. Smooth ER: no ribosomes, makes lipids and detoxifies.', 5),
(7, 'What is the Golgi apparatus?', 'Modifies, packages and ships proteins and lipids to their destinations. Like the cell''s "post office."', 6),
(7, 'What are lysosomes?', 'Organelles containing digestive enzymes that break down waste, old organelles, and foreign material.', 7),
(7, 'Plant cell vs animal cell — key differences', 'Plant cells have: cell wall, chloroplasts, large central vacuole. Animal cells have: centrioles, small vacuoles, no cell wall.', 8),
(7, 'What is chloroplast?', 'Organelle in plant cells that performs photosynthesis — converts light energy to glucose using CO₂ and H₂O.', 9),
(7, 'What is the cytoplasm?', 'The gel-like fluid inside the cell (between membrane and nucleus) where organelles are suspended.', 10),
(7, 'What is osmosis?', 'The diffusion of water molecules across a selectively permeable membrane from high to low water concentration.', 11),
(7, 'What is ATP?', 'Adenosine triphosphate — the main energy currency of cells. Produced mainly in mitochondria.', 12);

-- ─── DECK 8: Biology — Genetics Fundamentals ─────────────────────
INSERT INTO flashcard_decks (id, creator_id, subject_id, title, description, visibility, is_official, card_count) VALUES
(8, 1, 4, 'Genetics Fundamentals', 'DNA, inheritance, Mendel''s laws and key genetic terms', 'public', 1, 10);

INSERT INTO flashcard_cards (deck_id, front, back, sort_order) VALUES
(8, 'What is DNA?', 'Deoxyribonucleic acid — a double-helix molecule made of nucleotides (A, T, G, C) that carries genetic instructions.', 1),
(8, 'What is a gene?', 'A segment of DNA that codes for a specific protein or trait.', 2),
(8, 'What is an allele?', 'Different versions of the same gene. Example: for eye color, one allele for brown and one for blue.', 3),
(8, 'Dominant vs recessive alleles', 'Dominant (uppercase, e.g., B): expressed when one or two copies present. Recessive (lowercase, e.g., b): only expressed when two copies present.', 4),
(8, 'What is a genotype?', 'The genetic makeup of an organism (e.g., BB, Bb, or bb).', 5),
(8, 'What is a phenotype?', 'The observable characteristics/traits of an organism resulting from its genotype and environment.', 6),
(8, 'What is Mendel''s Law of Segregation?', 'Each organism has two alleles for each trait, and these alleles separate during gamete formation so each gamete carries only one.', 7),
(8, 'What is a Punnett square?', 'A diagram used to predict the genotype and phenotype ratios of offspring from a genetic cross.', 8),
(8, 'What is mitosis?', 'Cell division producing 2 identical daughter cells with the same chromosome number. Used for growth and repair.', 9),
(8, 'What is meiosis?', 'Cell division producing 4 genetically unique gametes (sex cells) with half the chromosome number. Enables genetic diversity.', 10);

-- ─── DECK 9: English — Grammar Essentials ────────────────────────
INSERT INTO flashcard_decks (id, creator_id, subject_id, title, description, visibility, is_official, card_count) VALUES
(9, 1, 5, 'Grammar Essentials', 'Parts of speech, tenses and essential grammar rules', 'public', 1, 10);

INSERT INTO flashcard_cards (deck_id, front, back, sort_order) VALUES
(9, 'What are the 8 parts of speech?', 'Noun, Pronoun, Verb, Adjective, Adverb, Preposition, Conjunction, Interjection.', 1),
(9, 'What is a noun?', 'A word that names a person, place, thing, or idea. Example: "teacher," "school," "happiness."', 2),
(9, 'What is a verb?', 'A word that expresses an action or state of being. Example: "run," "think," "is."', 3),
(9, 'What is an adjective?', 'A word that describes or modifies a noun. Example: "tall," "beautiful," "three."', 4),
(9, 'What is an adverb?', 'A word that modifies a verb, adjective, or another adverb. Often ends in -ly. Example: "quickly," "very."', 5),
(9, 'What is a conjunction?', 'A word that connects words, phrases, or clauses. Coordinating: for, and, nor, but, or, yet, so (FANBOYS).', 6),
(9, 'What is simple past tense?', 'Describes completed actions in the past. Regular verbs add -ed. Example: "She walked to school."', 7),
(9, 'What is present perfect tense?', 'Describes actions completed at an unspecified time or continuing to now. Have/has + past participle. "I have studied."', 8),
(9, 'What is a clause?', 'A group of words with a subject and a verb. Independent clauses can stand alone; dependent clauses cannot.', 9),
(9, 'Active voice vs passive voice', 'Active: subject performs action ("The cat chased the mouse"). Passive: subject receives action ("The mouse was chased by the cat").', 10);

-- ─── DECK 10: English — Literary Devices ─────────────────────────
INSERT INTO flashcard_decks (id, creator_id, subject_id, title, description, visibility, is_official, card_count) VALUES
(10, 1, 5, 'Literary Devices', 'Metaphor, simile, irony and other essential literary techniques', 'public', 1, 10);

INSERT INTO flashcard_cards (deck_id, front, back, sort_order) VALUES
(10, 'What is a metaphor?', 'A figure of speech that directly compares two unlike things WITHOUT using "like" or "as." Example: "Time is money."', 1),
(10, 'What is a simile?', 'A comparison using "like" or "as." Example: "Her smile was bright as the sun."', 2),
(10, 'What is personification?', 'Giving human qualities to non-human things. Example: "The wind whispered through the trees."', 3),
(10, 'What is irony?', 'A contrast between expectation and reality. Types: verbal (saying opposite), situational (unexpected outcome), dramatic (audience knows more than characters).', 4),
(10, 'What is alliteration?', 'Repetition of the same initial consonant sound. Example: "Peter Piper picked a peck of pickled peppers."', 5),
(10, 'What is foreshadowing?', 'Hints or clues about events that will happen later in the story. Builds suspense and anticipation.', 6),
(10, 'What is hyperbole?', 'Extreme exaggeration for emphasis or humor. Example: "I''ve told you a million times!"', 7),
(10, 'What is onomatopoeia?', 'Words that imitate sounds. Examples: "buzz," "crash," "sizzle," "whisper."', 8),
(10, 'What is symbolism?', 'Using an object, person, or event to represent something beyond its literal meaning. Example: a dove symbolizing peace.', 9),
(10, 'What is a theme?', 'The central message or underlying meaning of a literary work. Not the plot, but the lesson or insight. Example: "Good vs. evil."', 10);

-- ─── DECK 11: History — Ancient Civilizations ────────────────────
INSERT INTO flashcard_decks (id, creator_id, subject_id, title, description, visibility, is_official, card_count) VALUES
(11, 1, 6, 'Ancient Civilizations', 'Key facts about Egypt, Greece, Rome and Mesopotamia', 'public', 1, 10);

INSERT INTO flashcard_cards (deck_id, front, back, sort_order) VALUES
(11, 'Where did the first civilizations arise?', 'In river valleys: Mesopotamia (Tigris-Euphrates), Egypt (Nile), India (Indus), China (Yellow River) — around 3500-3000 BCE.', 1),
(11, 'What is Mesopotamia?', 'The "land between two rivers" (Tigris & Euphrates), in modern-day Iraq. Home to Sumerians, Babylonians, and Assyrians.', 2),
(11, 'What was the Code of Hammurabi?', 'One of the earliest known written legal codes (c. 1754 BCE), from Babylon. Famous for "an eye for an eye" principle.', 3),
(11, 'What were the Egyptian pyramids built for?', 'As tombs for pharaohs. The Great Pyramid of Giza was built for Pharaoh Khufu around 2560 BCE.', 4),
(11, 'What is democracy''s origin?', 'Ancient Athens, Greece (c. 508 BCE). Citizens could vote directly on laws. Only free adult males could participate.', 5),
(11, 'Who was Alexander the Great?', 'King of Macedonia (356-323 BCE) who conquered the Persian Empire, Egypt, and parts of India, spreading Greek culture (Hellenism).', 6),
(11, 'What was the Roman Republic?', 'A form of government (509-27 BCE) where elected officials (consuls, senators) ruled. Had a system of checks and balances.', 7),
(11, 'What caused the fall of the Roman Empire?', 'Multiple factors: political corruption, military overextension, economic problems, invasions by Germanic tribes. Western Rome fell in 476 CE.', 8),
(11, 'What was cuneiform?', 'One of the earliest writing systems, developed by Sumerians in Mesopotamia. Used wedge-shaped marks on clay tablets.', 9),
(11, 'What was the Silk Road?', 'Ancient trade network connecting China to the Mediterranean (c. 130 BCE-1453 CE). Traded silk, spices, ideas, and religions.', 10);

-- ─── DECK 12: History — World War II ─────────────────────────────
INSERT INTO flashcard_decks (id, creator_id, subject_id, title, description, visibility, is_official, card_count) VALUES
(12, 1, 6, 'World War II Key Facts', 'Causes, major events and consequences of the Second World War', 'public', 1, 10);

INSERT INTO flashcard_cards (deck_id, front, back, sort_order) VALUES
(12, 'When did World War II take place?', 'September 1, 1939 (Germany invades Poland) to September 2, 1945 (Japan surrenders).', 1),
(12, 'What were the main causes of WWII?', 'Treaty of Versailles resentment, rise of fascism/Nazism, appeasement policy failure, German expansion, and economic depression.', 2),
(12, 'Who were the Axis Powers?', 'Germany (Hitler), Italy (Mussolini), and Japan (Hirohito/Tojo). Later joined by Hungary, Romania, Bulgaria.', 3),
(12, 'Who were the Allied Powers?', 'UK (Churchill), USA (Roosevelt/Truman), Soviet Union (Stalin), France, China, and many others.', 4),
(12, 'What was D-Day?', 'June 6, 1944 — Allied invasion of Normandy, France. The largest amphibious military operation in history. Turned the tide in Europe.', 5),
(12, 'What was the Holocaust?', 'The systematic genocide of 6 million Jews and millions of others (Roma, disabled, political prisoners) by Nazi Germany.', 6),
(12, 'What happened at Hiroshima and Nagasaki?', 'The US dropped atomic bombs on these Japanese cities (August 6 and 9, 1945), leading to Japan''s surrender and the end of WWII.', 7),
(12, 'What was the Battle of Stalingrad?', 'A major battle (1942-43) where the Soviet Union defeated Germany. A turning point on the Eastern Front. One of the bloodiest battles in history.', 8),
(12, 'What was the United Nations?', 'An international organization founded in 1945 after WWII to maintain peace, security, and cooperation among nations.', 9),
(12, 'What were the consequences of WWII?', 'Over 70 million deaths, creation of the UN, beginning of the Cold War, decolonization, division of Germany, and the nuclear age.', 10);
