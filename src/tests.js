// Common standardised tests.
//
// The FORMAT of each test (sections, question counts, timings, score scales)
// is public information published by the test makers. The QUESTIONS below are
// original, written to match the style, structure and difficulty of each test.
// They are not reproduced from any real or past paper.

export const TESTS = [
  {
    id: "sat",
    name: "SAT",
    full: "Scholastic Assessment Test",
    who: "US undergraduate admissions",
    length: "2 hr 14 min",
    scaleLabel: "400 to 1600",
    scoring: "sat",
    note: "Digital and section adaptive since 2024. Each section has two modules, and how you do on the first decides whether the second is the harder or easier version.",
    format: [
      { n: "Reading and Writing", q: "2 modules of 27", t: "32 min each", tests: "Comprehension, rhetoric, grammar, vocabulary in context" },
      { n: "Math", q: "2 modules of 22", t: "35 min each", tests: "Algebra, advanced maths, problem solving, geometry" },
    ],
    questions: [
      {
        id: "sat1", section: "Reading and Writing", skill: "Words in context",
        passage: "Although the committee had spent months gathering testimony, its final report was notably ______: it ran to just four pages and offered no recommendations at all.",
        q: "Which choice completes the text with the most logical and precise word?",
        choices: ["exhaustive", "perfunctory", "contentious", "eloquent"],
        answer: 1,
        why: "The colon explains the blank: four pages and no recommendations. Perfunctory means done with minimum effort. Exhaustive is the opposite, and the text gives no sign of dispute or fine writing.",
      },
      {
        id: "sat2", section: "Reading and Writing", skill: "Transitions",
        passage: "Most seabirds drink saltwater and excrete the excess salt through glands above their eyes. ______, the albatross can spend years at sea without ever encountering fresh water.",
        q: "Which choice completes the text with the most logical transition?",
        choices: ["Nevertheless", "For instance", "In contrast", "Consequently"],
        answer: 3,
        why: "The second sentence is a result of the first: because the glands remove salt, the bird can stay at sea. Consequently signals that result. For instance would need the albatross to be an example of the mechanism, not an outcome.",
      },
      {
        id: "sat3", section: "Reading and Writing", skill: "Command of evidence",
        passage: "A researcher claimed that urban crows solve novel puzzles faster than rural crows because city life demands constant problem solving. She tested 40 crows from each population on a food box puzzle.",
        q: "Which finding, if true, would most directly support the researcher's claim?",
        choices: [
          "Urban crows were heavier on average than rural crows.",
          "Urban crows opened the box in a mean of 41 seconds; rural crows took a mean of 96 seconds.",
          "Both groups eventually opened the box.",
          "Urban crows were more likely to approach human observers.",
        ],
        answer: 1,
        why: "The claim is about speed on a novel puzzle. Only the timing comparison measures that. Weight, eventual success and boldness around humans do not test the stated claim.",
      },
      {
        id: "sat4", section: "Reading and Writing", skill: "Boundaries",
        passage: "The glaciologist returned from the ice sheet with three crates of core samples ______ each one drilled from a different depth.",
        q: "Which choice conforms to the conventions of Standard English?",
        choices: [", and", ",", ";", ":"],
        answer: 1,
        why: "What follows is not an independent clause, it is a modifying phrase describing the crates. A plain comma is correct. A semicolon or colon would each require or imply a full clause after it.",
      },
      {
        id: "sat5", section: "Math", skill: "Algebra",
        q: "If 3x + 2y = 18 and x = y + 1, what is the value of y?",
        choices: ["2", "3", "4", "5"],
        answer: 1,
        why: "Substitute x = y + 1 into the first equation: 3(y + 1) + 2y = 18, so 3y + 3 + 2y = 18, 5y = 15, y = 3.",
      },
      {
        id: "sat6", section: "Math", skill: "Problem solving",
        q: "A jacket is marked down 30 percent, and a member then takes a further 10 percent off the reduced price. The final price is what percent of the original?",
        choices: ["60 percent", "63 percent", "66 percent", "70 percent"],
        answer: 1,
        why: "Successive discounts multiply, they do not add. 0.70 x 0.90 = 0.63, so 63 percent. Adding the discounts to get 60 percent is the intended trap.",
      },
      {
        id: "sat7", section: "Math", skill: "Advanced maths",
        q: "The function f is defined by f(x) = x squared minus 6x + 11. What is the minimum value of f(x)?",
        choices: ["negative 2", "1", "2", "3"],
        answer: 2,
        why: "Complete the square: x squared minus 6x + 11 = (x minus 3) squared + 2. A square is never negative, so the minimum is 2, reached at x = 3.",
      },
      {
        id: "sat8", section: "Math", skill: "Geometry",
        q: "A circle in the xy plane has equation (x minus 4) squared + (y + 3) squared = 25. What is the length of its diameter?",
        choices: ["5", "10", "12.5", "25"],
        answer: 1,
        why: "In this form the right hand side is the radius squared, so r = 5 and the diameter is 10. Reading 25 as the radius is the common slip.",
      },
    ],
  },

  {
    id: "act",
    name: "ACT",
    full: "American College Testing",
    who: "US undergraduate admissions",
    length: "About 2 hr without the optional parts",
    scaleLabel: "1 to 36 composite",
    scoring: "act",
    note: "From 2025 the core test is English, Maths and Reading, with Science optional and no longer counted in the composite. Timing per question is tighter than the SAT, so pace matters more than difficulty.",
    format: [
      { n: "English", q: "50 questions", t: "35 min", tests: "Grammar, punctuation, rhetoric, conciseness" },
      { n: "Mathematics", q: "45 questions", t: "50 min", tests: "Algebra, geometry, trigonometry" },
      { n: "Reading", q: "36 questions", t: "40 min", tests: "Detail, inference, main idea across four passages" },
      { n: "Science (optional)", q: "40 questions", t: "40 min", tests: "Data interpretation, experiment design, conflicting views" },
    ],
    questions: [
      {
        id: "act1", section: "English", skill: "Conciseness",
        passage: "The volunteers, who were all people that had given their time freely without pay, assembled at dawn.",
        q: "Which choice is best?",
        choices: [
          "NO CHANGE",
          "who were all unpaid people giving time freely,",
          "who were unpaid,",
          "DELETE the underlined portion.",
        ],
        answer: 3,
        why: "Volunteer already means someone unpaid who gives time freely, so every version of the phrase is redundant. On the ACT, if a phrase adds nothing, deleting it is usually right.",
      },
      {
        id: "act2", section: "English", skill: "Modifiers",
        passage: "Rusting quietly in the barn for forty years, the farmer finally sold the tractor.",
        q: "Which choice best corrects the sentence?",
        choices: [
          "NO CHANGE",
          "the tractor was finally sold by the farmer.",
          "the farmer had finally sold the tractor.",
          "selling the tractor was what the farmer finally did.",
        ],
        answer: 1,
        why: "The opening phrase describes the tractor, not the farmer, so the tractor must be the subject that follows. As written, the farmer is the thing rusting in the barn.",
      },
      {
        id: "act3", section: "Mathematics", skill: "Ratios",
        q: "A recipe uses flour and sugar in the ratio 5 to 2. If 350 grams of flour are used, how much sugar is needed?",
        choices: ["70 g", "140 g", "175 g", "700 g"],
        answer: 1,
        why: "350 divided by 5 is 70 per part, and sugar is 2 parts, so 140 grams. Answer 70 comes from stopping after finding one part.",
      },
      {
        id: "act4", section: "Mathematics", skill: "Coordinate geometry",
        q: "What is the slope of a line perpendicular to the line through (1, 4) and (5, 12)?",
        choices: ["negative 2", "negative one half", "one half", "2"],
        answer: 1,
        why: "The slope through those points is (12 minus 4) over (5 minus 1) = 2. A perpendicular slope is the negative reciprocal, so negative one half.",
      },
      {
        id: "act5", section: "Reading", skill: "Inference",
        passage: "Marisol read the letter twice, folded it along its old creases, and put it back in the drawer beneath the winter linens. At dinner she asked about the weather in Lisbon, though no one had mentioned Portugal.",
        q: "The passage most strongly suggests that Marisol:",
        choices: [
          "intends to move to Lisbon soon",
          "is preoccupied by the letter but unwilling to raise it directly",
          "has never received a letter before",
          "dislikes the person who wrote to her",
        ],
        answer: 1,
        why: "She hides the letter but steers conversation toward its subject. That is preoccupation she will not name. The other options claim facts the passage never supplies.",
      },
      {
        id: "act6", section: "Science", skill: "Data interpretation",
        passage: "Enzyme activity was measured at five temperatures. 10C: 12 units. 20C: 27 units. 30C: 44 units. 40C: 51 units. 50C: 9 units.",
        q: "Which conclusion is best supported by the data?",
        choices: [
          "Activity rises steadily with temperature across the whole range.",
          "Activity peaks near 40C and falls sharply beyond it.",
          "Temperature has no effect on activity.",
          "Activity is highest at 50C.",
        ],
        answer: 1,
        why: "Activity climbs to 51 units at 40C then collapses to 9 at 50C, consistent with the enzyme denaturing. Option A ignores the last reading.",
      },
      {
        id: "act7", section: "Science", skill: "Experimental design",
        passage: "In the study above, all samples used the same enzyme concentration, the same substrate concentration and the same pH.",
        q: "Holding those three factors constant was necessary in order to:",
        choices: [
          "increase the total enzyme activity",
          "ensure any change in activity could be attributed to temperature",
          "make the experiment run faster",
          "reduce the number of trials required",
        ],
        answer: 1,
        why: "Controlling every other variable is what lets you attribute the result to the one you changed. It does not raise activity or speed anything up.",
      },
      {
        id: "act8", section: "English", skill: "Punctuation",
        passage: "She had three reasons for refusing the offer ______ the salary, the commute, and the manager.",
        q: "Which choice is best?",
        choices: [":", ";", ",", "and"],
        answer: 0,
        why: "A complete clause precedes a list that explains it, which is exactly what a colon is for. A semicolon would need a full clause after it, and a comma alone cannot introduce this list.",
      },
    ],
  },

  {
    id: "ssat",
    name: "SSAT",
    full: "Secondary School Admission Test",
    who: "Private secondary school admissions",
    length: "3 hr 5 min (Upper Level)",
    scaleLabel: "500 to 800 per section",
    scoring: "ssat",
    note: "Upper Level is for grades 8 to 11. There is a quarter mark penalty for wrong answers but none for blanks, so a genuine blind guess is not worth it. Percentiles compare you only against others of the same grade and gender who sat it in the last three years, which makes them look harsher than other tests.",
    format: [
      { n: "Writing sample", q: "1 prompt", t: "25 min", tests: "Unscored, sent to schools as a work sample" },
      { n: "Quantitative", q: "2 sections of 25", t: "30 min each", tests: "Arithmetic, algebra, geometry" },
      { n: "Reading", q: "40 questions", t: "40 min", tests: "Comprehension across 7 short passages" },
      { n: "Verbal", q: "60 questions", t: "30 min", tests: "30 synonyms and 30 analogies" },
    ],
    questions: [
      {
        id: "ss1", section: "Verbal", skill: "Synonyms",
        q: "TACITURN",
        choices: ["talkative", "reserved", "cheerful", "clumsy"],
        answer: 1,
        why: "Taciturn describes someone who says little. Talkative is its opposite, which is the distractor the test is fishing for.",
      },
      {
        id: "ss2", section: "Verbal", skill: "Synonyms",
        q: "MITIGATE",
        choices: ["worsen", "postpone", "lessen", "explain"],
        answer: 2,
        why: "To mitigate is to make less severe. It is often confused with mediate, which is to settle a dispute between parties.",
      },
      {
        id: "ss3", section: "Verbal", skill: "Analogies",
        q: "Drought is to rainfall as famine is to",
        choices: ["hunger", "food", "farming", "poverty"],
        answer: 1,
        why: "A drought is a shortage of rainfall, so a famine is a shortage of food. Hunger is the consequence, not the thing in short supply, and that is the trap.",
      },
      {
        id: "ss4", section: "Verbal", skill: "Analogies",
        q: "Chapter is to novel as movement is to",
        choices: ["dance", "symphony", "motion", "orchestra"],
        answer: 1,
        why: "A chapter is a named division of a novel; a movement is a named division of a symphony. An orchestra performs one but is not made of movements.",
      },
      {
        id: "ss5", section: "Quantitative", skill: "Fractions",
        q: "What is three quarters of two thirds of 48?",
        choices: ["16", "24", "32", "36"],
        answer: 1,
        why: "Two thirds of 48 is 32, and three quarters of 32 is 24. Working the operations in the wrong order still gives 24 here, but the intermediate value 32 is the listed trap.",
      },
      {
        id: "ss6", section: "Quantitative", skill: "Averages",
        q: "The average of four numbers is 15. Three of them are 12, 18 and 11. What is the fourth?",
        choices: ["15", "19", "20", "24"],
        answer: 1,
        why: "The four numbers total 4 x 15 = 60. The three given total 41, so the fourth is 19.",
      },
      {
        id: "ss7", section: "Quantitative", skill: "Geometry",
        q: "A rectangle has perimeter 36 cm and its length is twice its width. What is its area?",
        choices: ["36 sq cm", "54 sq cm", "72 sq cm", "108 sq cm"],
        answer: 2,
        why: "If width is w, then 2(w + 2w) = 36, so 6w = 36 and w = 6, length 12. Area is 6 x 12 = 72 square centimetres.",
      },
      {
        id: "ss8", section: "Reading", skill: "Comprehension",
        passage: "The lighthouse keeper kept two logs. The official one recorded weather, shipping and the hours the lamp burned. The other, which he showed no one, recorded the names of every vessel he had watched pass safely, and the three he had not.",
        q: "The second log suggests that the keeper:",
        choices: [
          "was careless in his official duties",
          "felt personally accountable for the ships he watched",
          "hoped to publish his memoirs",
          "disliked the shipping company",
        ],
        answer: 1,
        why: "He privately tracks the three that did not pass safely. Counting his failures alone points to personal accountability, not carelessness or ambition.",
      },
    ],
  },

  {
    id: "ielts",
    name: "IELTS",
    full: "International English Language Testing System",
    who: "Study and migration in the UK, Australia, Canada, New Zealand",
    length: "2 hr 45 min",
    scaleLabel: "Band 0 to 9",
    scoring: "ielts",
    note: "Academic and General Training differ only in Reading and Writing. Listening and Reading are each 40 marks converted to a band, and spelling counts, so a correct answer spelled wrong scores zero.",
    format: [
      { n: "Listening", q: "40 questions", t: "30 min plus 10 to transfer", tests: "Four recordings, played once only" },
      { n: "Reading", q: "40 questions", t: "60 min", tests: "Three long passages, no extra transfer time" },
      { n: "Writing", q: "2 tasks", t: "60 min", tests: "Task 1 describes data, Task 2 is an essay worth double" },
      { n: "Speaking", q: "3 parts", t: "11 to 14 min", tests: "Interview, long turn, discussion with an examiner" },
    ],
    questions: [
      {
        id: "ie1", section: "Reading", skill: "True, False, Not Given",
        passage: "The Svalbard Global Seed Vault opened in 2008 inside a mountain on a Norwegian island. It holds duplicate samples of seeds from gene banks worldwide. The vault has been opened for withdrawal once, in 2015, when researchers retrieved seeds originally deposited from Aleppo.",
        q: "Statement: The Svalbard vault is the largest seed bank in the world.",
        choices: ["True", "False", "Not Given"],
        answer: 2,
        why: "The passage never compares its size to any other bank. Not Given means the text is silent, which is different from the text contradicting it. Candidates lose most marks here by answering from outside knowledge.",
      },
      {
        id: "ie2", section: "Reading", skill: "True, False, Not Given",
        passage: "The Svalbard Global Seed Vault opened in 2008 inside a mountain on a Norwegian island. It holds duplicate samples of seeds from gene banks worldwide. The vault has been opened for withdrawal once, in 2015, when researchers retrieved seeds originally deposited from Aleppo.",
        q: "Statement: Seeds have been withdrawn from the vault on more than one occasion.",
        choices: ["True", "False", "Not Given"],
        answer: 1,
        why: "The passage says once, in 2015. The statement says more than one, which the text directly contradicts, so it is False rather than Not Given.",
      },
      {
        id: "ie3", section: "Reading", skill: "Matching headings",
        passage: "Section C: Early attempts at desalination boiled seawater and condensed the steam, which produced clean water but consumed enormous energy. Reverse osmosis, developed commercially in the 1960s, instead forces water through a membrane at pressure, cutting energy use by roughly half.",
        q: "Which heading best fits Section C?",
        choices: [
          "The environmental cost of brine disposal",
          "A shift in method that reduced energy demand",
          "Government funding for water research",
          "Why coastal cities grew so quickly",
        ],
        answer: 1,
        why: "The section contrasts an old energy hungry method with a newer efficient one. Headings must cover the whole section, not one detail, and the other three are never mentioned.",
      },
      {
        id: "ie4", section: "Reading", skill: "Sentence completion",
        passage: "Reverse osmosis forces water through a membrane at pressure, cutting energy use by roughly half.",
        q: "Complete the sentence with NO MORE THAN TWO WORDS: Reverse osmosis reduces energy consumption by approximately ______.",
        choices: ["one half", "two thirds", "a quarter", "ten percent"],
        answer: 0,
        why: "The text says roughly half, and the word limit forces the shortest exact form. Answers over the stated word limit score zero even when the meaning is right.",
      },
      {
        id: "ie5", section: "Listening", skill: "Form completion",
        passage: "Transcript: 'Right, so the booking is under Whitfield, that is W H I T F I E L D, and you wanted the Tuesday session at half past six rather than the Thursday one.'",
        q: "Complete the form: Name ______, Day: Tuesday, Time: 6.30 pm",
        choices: ["Whitfield", "Witfield", "Whitfeld", "Whitefield"],
        answer: 0,
        why: "The speaker spells it out, which is the examiner signalling that spelling is the mark. Each of the wrong options changes one letter and would score zero.",
      },
      {
        id: "ie6", section: "Listening", skill: "Distraction",
        passage: "Transcript: 'The tour leaves from the museum entrance at nine. Sorry, correction, the museum is closed for refurbishment, so it is the library steps at nine fifteen.'",
        q: "Where and when does the tour leave?",
        choices: [
          "Museum entrance at nine",
          "Library steps at nine fifteen",
          "Museum entrance at nine fifteen",
          "Library steps at nine",
        ],
        answer: 1,
        why: "The speaker corrects themselves, and the correction is always the answer. This self correction pattern is the most common distractor in IELTS Listening.",
      },
      {
        id: "ie7", section: "Reading", skill: "Yes, No, Not Given",
        passage: "The author writes: 'Proponents of the scheme point to falling costs, but they consistently ignore the decades of maintenance those costs do not include.'",
        q: "Statement: The writer believes supporters of the scheme present an incomplete picture of its costs.",
        choices: ["Yes", "No", "Not Given"],
        answer: 0,
        why: "Consistently ignore signals the writer's own view that something is being left out. Yes, No and Not Given are used for opinion claims, where True, False and Not Given are used for facts.",
      },
      {
        id: "ie8", section: "Writing", skill: "Task 1 language",
        passage: "Task 1: a line graph shows car ownership rising from 12 percent of households in 1970 to 71 percent in 2020.",
        q: "Which sentence is most appropriate for a Task 1 answer?",
        choices: [
          "I think it is great that so many people can afford cars now.",
          "Car ownership rose substantially over the period, climbing from 12 percent of households in 1970 to 71 percent in 2020.",
          "The graph is about cars and it goes up a lot.",
          "Car ownership will certainly continue rising after 2020.",
        ],
        answer: 1,
        why: "Task 1 rewards accurate, impersonal description with figures. Opinion, vagueness and prediction beyond the data all lose marks against the assessment criteria.",
      },
    ],
  },

  {
    id: "toefl",
    name: "TOEFL iBT",
    full: "Test of English as a Foreign Language",
    who: "University admissions, mainly the US and Canada",
    length: "About 2 hr",
    scaleLabel: "0 to 120",
    scoring: "toefl",
    note: "Shortened in July 2023. Each of the four sections is scored 0 to 30 and they add to 120. Reading and Listening are machine marked, Speaking and Writing are scored by a mix of human raters and automated scoring.",
    format: [
      { n: "Reading", q: "20 questions", t: "35 min", tests: "Two academic passages" },
      { n: "Listening", q: "28 questions", t: "36 min", tests: "Lectures and campus conversations" },
      { n: "Speaking", q: "4 tasks", t: "16 min", tests: "One independent and three integrated tasks" },
      { n: "Writing", q: "2 tasks", t: "29 min", tests: "Integrated essay and an academic discussion post" },
    ],
    questions: [
      {
        id: "tf1", section: "Reading", skill: "Vocabulary",
        passage: "Lichens are often the first organisms to colonise bare rock. Their acids slowly break down the mineral surface, and the resulting grit, mixed with dead lichen tissue, forms the rudimentary soil in which mosses can take hold.",
        q: "The word rudimentary in the passage is closest in meaning to:",
        choices: ["fertile", "basic", "artificial", "abundant"],
        answer: 1,
        why: "Rudimentary means undeveloped or basic, an early first stage. The passage describes soil only just beginning to form, which rules out fertile and abundant.",
      },
      {
        id: "tf2", section: "Reading", skill: "Factual information",
        passage: "Lichens are often the first organisms to colonise bare rock. Their acids slowly break down the mineral surface, and the resulting grit, mixed with dead lichen tissue, forms the rudimentary soil in which mosses can take hold.",
        q: "According to the passage, what contributes to the first soil on bare rock?",
        choices: [
          "Only the mineral grit from the rock",
          "Mineral grit together with dead lichen tissue",
          "Moss roots breaking the surface",
          "Rainwater carrying soil from elsewhere",
        ],
        answer: 1,
        why: "The passage names two components explicitly. Factual information questions are answered from the text alone, and the answer is almost always a paraphrase rather than a repeat.",
      },
      {
        id: "tf3", section: "Reading", skill: "Negative factual",
        passage: "Emperor penguins breed through the Antarctic winter. Males incubate the single egg on their feet for about 65 days without eating, huddling in colonies that rotate individuals from the cold edge to the warm centre. Females return from the sea to feed the chick.",
        q: "All of the following are stated about male emperor penguins EXCEPT:",
        choices: [
          "They incubate the egg on their feet.",
          "They go without food during incubation.",
          "They rotate positions within the huddle.",
          "They return to the sea before the egg hatches.",
        ],
        answer: 3,
        why: "The passage says females return from the sea, not males. Three options are supported and one is not, so the unsupported one is the answer. Reading too quickly makes the female detail attach to the wrong bird.",
      },
      {
        id: "tf4", section: "Reading", skill: "Sentence simplification",
        passage: "Although early telegraph companies competed fiercely for routes, the technical requirement that lines connect end to end eventually pushed them into agreements they had previously resisted.",
        q: "Which sentence best expresses the essential information in the highlighted sentence?",
        choices: [
          "Telegraph companies never cooperated with one another.",
          "Competition between telegraph companies was less intense than expected.",
          "The need for connected lines forced rival telegraph companies to cooperate despite their earlier resistance.",
          "Technical problems prevented telegraph lines from being connected.",
        ],
        answer: 2,
        why: "The core is the contrast: fierce competition, then cooperation forced by a technical need. The wrong options each drop or reverse one half of that contrast.",
      },
      {
        id: "tf5", section: "Reading", skill: "Inference",
        passage: "Tree rings from the region are wide for the years 1580 to 1595, then abruptly narrow for a decade. Settlement records from the same valley show the abandonment of two villages in 1599.",
        q: "What can be inferred from the passage?",
        choices: [
          "The villages were abandoned because of warfare.",
          "Growing conditions deteriorated in the years before the villages were abandoned.",
          "Tree rings are an unreliable record of climate.",
          "The villages were rebuilt shortly afterwards.",
        ],
        answer: 1,
        why: "Narrow rings indicate poor growing conditions, and they precede the abandonment. Inference questions want the smallest step beyond the text, not a cause the passage never mentions.",
      },
      {
        id: "tf6", section: "Reading", skill: "Rhetorical purpose",
        passage: "Consider the humble bicycle wheel. Its spokes carry no compression at all; they hold the rim in place purely by tension, which is why a wheel with one loose spoke quickly buckles.",
        q: "Why does the author mention the bicycle wheel?",
        choices: [
          "To argue that bicycles are poorly designed",
          "To illustrate a structural principle with a familiar example",
          "To compare cycling with other forms of transport",
          "To explain how to repair a wheel",
        ],
        answer: 1,
        why: "Rhetorical purpose asks why the detail is there, not what it says. The wheel is an everyday illustration of tension based structure.",
      },
      {
        id: "tf7", section: "Listening", skill: "Main idea",
        passage: "Transcript of a lecture opening: 'Last week we looked at how coral bleaching happens. Today I want to spend the whole hour on something more hopeful, which is what actually determines whether a bleached reef recovers or dies.'",
        q: "What is the lecture mainly about?",
        choices: [
          "The chemical process of coral bleaching",
          "The factors affecting recovery of bleached reefs",
          "The history of reef research",
          "Methods for measuring ocean temperature",
        ],
        answer: 1,
        why: "The speaker explicitly marks last week as bleaching and today as recovery. Lecturers almost always state the topic in the first thirty seconds, and the contrast with last week is the signal.",
      },
      {
        id: "tf8", section: "Listening", skill: "Attitude",
        passage: "Transcript: 'Student: I was going to write on all three poets. Professor: In eight pages? You could, I suppose. I have simply never seen it done well.'",
        q: "What does the professor imply?",
        choices: [
          "The student should write on all three poets.",
          "The topic is too broad for the assignment.",
          "The student's writing is weak.",
          "The assignment length will be extended.",
        ],
        answer: 1,
        why: "I have never seen it done well is polite discouragement. TOEFL tests understanding of indirect speech, where the literal words permit something the speaker is advising against.",
      },
    ],
  },
];

// Passage based items for the reading, listening and science sections. These
// cannot be generated the way maths and grammar can, so they are authored.
// Each passage carries several questions, the way a real paper does.

const ACT_READING = `Rain had not fallen on the valley in nineteen months. Elena walked the irrigation channel every morning anyway, clearing the grate of dust and the occasional bird, because her father had walked it every morning for forty years and because stopping would have meant something she was not ready to mean. The neighbours had gone in March, the Vasquez family in June. Their houses stood with the doors closed, which was somehow worse than if they had been left open.

On the last Tuesday of August she found water in the channel. Not much, a finger's depth, moving slowly and brown with silt. She stood looking at it for a long time before she went to tell anyone, and she was never afterwards able to explain to her husband why she had waited.`;

const ACT_SCIENCE = `Study 1: Seeds of a grass species were germinated at five soil salinities. Germination rate after 14 days was 94 percent at 0 g/L, 91 percent at 5 g/L, 72 percent at 10 g/L, 31 percent at 15 g/L, and 4 percent at 20 g/L.

Study 2: The same experiment was repeated with seeds collected from a coastal population of the same species. Results were 96 percent at 0 g/L, 95 percent at 5 g/L, 89 percent at 10 g/L, 74 percent at 15 g/L, and 38 percent at 20 g/L.`;

const SSAT_READING_1 = `The lighthouse keeper kept two logs. The official one recorded weather, shipping and the hours the lamp burned. The other, which he showed no one, recorded the names of every vessel he had watched pass safely, and the three he had not. He wrote in it only in the hour before dawn, when the lamp was still lit and there was nothing else to do but remember.`;

const SSAT_READING_2 = `Most people think of the octopus as a solitary animal, and for the most part it is. But off the coast of eastern Australia divers have found sites where dozens live together in dens dug from discarded shells. The animals there behave in ways solitary octopuses do not: they chase one another, they signal with colour changes, and they evict neighbours from dens. Whether this is a true society or simply many animals crowded onto the only available shelter is still argued.`;

const IE_CONGESTION = `Cities have experimented with congestion charging since Singapore introduced it in 1975. London followed in 2003, charging vehicles entering the centre on weekdays. Traffic within the zone fell by roughly a fifth in the first year, and bus journey times became markedly more reliable.

The scheme's critics predicted severe damage to retail in the charging zone. Studies conducted over the following decade found no such effect: shop takings inside the zone tracked the citywide average closely. What did change was the composition of traffic. Private cars declined sharply while taxis, buses and delivery vehicles made up a larger share.

Stockholm's scheme, introduced as a trial in 2006, is unusual in that it was put to a referendum after residents had lived with it for seven months. Support before the trial stood at around a third. After the trial it passed. Researchers have since argued that direct experience, rather than any argument made in the campaign, was what moved opinion.`;

const IELTS_LISTENING = `Transcript: 'Right, the community hall booking. That is under Okonkwo, O K O N K W O. You wanted the main hall, but I should say the main hall is being repainted that week, so I can only offer the annexe. It holds sixty rather than two hundred. The rate is forty pounds an hour, though for a registered charity it drops to twenty five. And you said Saturday the fourteenth, from two until six, so that is four hours.'`;

const TOEFL_READING = `The domestication of the horse transformed the Eurasian steppe, but establishing when it happened has proved unexpectedly difficult. Bones alone are ambiguous: an early domestic horse is anatomically almost identical to a wild one, and herd composition, often used as evidence elsewhere, is unreliable for a species that may have been kept primarily for milk rather than meat.

A more decisive line of evidence came from teeth. Horses ridden with a bit develop a characteristic wear pattern on the second premolar, where the metal repeatedly strikes the enamel. Analysis of steppe assemblages found this bit wear on specimens dated to roughly 3500 BCE, considerably earlier than most previous estimates.

The finding remains contested. Some researchers argue that comparable wear can arise from a horse chewing on hard forage, and that the pattern is therefore not diagnostic of riding. Others counter that the position and depth of the wear in the disputed specimens differ measurably from anything produced by diet.`;

const TOEFL_LISTENING = `Transcript of a lecture: 'So last week we finished with the classical account of memory as a filing cabinet, storage and retrieval, and I said we would come back to why that picture is now considered wrong. The evidence that broke it came from reconsolidation studies. Briefly: when you recall a memory, it becomes temporarily unstable, and it has to be written back. Which means every act of remembering is also an act of editing. That is uncomfortable if you are, say, a juror listening to eyewitness testimony, and we will spend the second half on exactly that problem.'`;

export const EXTRA = {
  act: [
    { id: "actr1", section: "Reading", skill: "Inference", passage: ACT_READING, q: "It can most reasonably be inferred that Elena continues walking the channel because:", choices: ["she expects the drought to end soon", "abandoning the routine would mean accepting something she resists", "her husband insists on it", "she is paid to maintain it"], answer: 1, why: "The narrator says stopping would have meant something she was not ready to mean. That is refusal to accept, not expectation of rain." },
    { id: "actr2", section: "Reading", skill: "Detail", passage: ACT_READING, q: "According to the passage, the Vasquez family left in:", choices: ["March", "June", "August", "the previous year"], answer: 1, why: "The neighbours left in March and the Vasquez family in June. Attaching the wrong month to the wrong family is the trap." },
    { id: "actr3", section: "Reading", skill: "Detail", passage: ACT_READING, q: "The narrator says the closed doors of the empty houses were:", choices: ["a relief to Elena", "worse than open doors would have been", "a sign the families would return", "unnoticed by Elena"], answer: 1, why: "The text states it plainly: closed doors were somehow worse than if they had been left open." },
    { id: "actr4", section: "Reading", skill: "Word meaning", passage: ACT_READING, q: "As used in the passage, the phrase 'a finger's depth' most nearly conveys that the water was:", choices: ["dangerously deep", "very shallow", "moving quickly", "clean"], answer: 1, why: "A finger's depth is a small measure, and the passage adds that it moved slowly and was full of silt." },
    { id: "actr5", section: "Reading", skill: "Main idea", passage: ACT_READING, q: "The passage as a whole is primarily concerned with:", choices: ["the science of drought", "one woman's persistence in a place others have left", "a dispute between neighbours", "the mechanics of irrigation"], answer: 1, why: "Every detail serves Elena staying and keeping the routine while the valley empties." },
    { id: "actr6", section: "Reading", skill: "Inference", passage: ACT_READING, q: "Elena's inability to explain why she waited before telling anyone most suggests that:", choices: ["she distrusted her husband", "the moment held a significance she could not articulate", "she doubted the water was real", "she wanted to claim the water for herself"], answer: 1, why: "The passage frames it as something she was never afterwards able to explain, which points to feeling beyond words rather than a motive." },
    { id: "actr7", section: "Reading", skill: "Structure", passage: ACT_READING, q: "The final paragraph differs from the first mainly in that it:", choices: ["shifts from routine to a single decisive event", "introduces a new narrator", "moves from present to past tense", "abandons the drought entirely"], answer: 0, why: "The first paragraph describes a repeated daily habit; the last describes one specific Tuesday when something changed." },
    { id: "actr8", section: "Reading", skill: "Tone", passage: ACT_READING, q: "The tone of the passage is best described as:", choices: ["restrained and elegiac", "comic and light", "angry and accusatory", "clinical and detached"], answer: 0, why: "The prose is quiet and understated while dealing with loss, which is restraint with an elegiac note. It is not detached, since Elena's inner life is central." },

    { id: "acts1", section: "Science", skill: "Data interpretation", passage: ACT_SCIENCE, q: "In Study 1, germination first falls below 50 percent between:", choices: ["0 and 5 g/L", "5 and 10 g/L", "10 and 15 g/L", "15 and 20 g/L"], answer: 2, why: "Study 1 goes 72 percent at 10 g/L then 31 percent at 15 g/L, so it crosses 50 percent in that interval." },
    { id: "acts2", section: "Science", skill: "Comparing studies", passage: ACT_SCIENCE, q: "At 15 g/L, germination in Study 2 exceeds that in Study 1 by approximately:", choices: ["12 percentage points", "31 percentage points", "43 percentage points", "74 percentage points"], answer: 2, why: "74 minus 31 is 43 percentage points. Answer 74 is simply the Study 2 value, not the difference." },
    { id: "acts3", section: "Science", skill: "Conclusions", passage: ACT_SCIENCE, q: "The results best support the conclusion that the coastal population:", choices: ["germinates faster at every salinity", "tolerates salt better than the population in Study 1", "cannot germinate in fresh water", "produces larger seeds"], answer: 1, why: "The coastal seeds hold up far better as salinity rises. Seed size is never measured, and both populations germinate well at 0 g/L." },
    { id: "acts4", section: "Science", skill: "Experimental design", passage: ACT_SCIENCE, q: "Using the same species in both studies was important because it allowed the researchers to:", choices: ["reduce the number of trials", "attribute differences to population rather than to species", "increase germination overall", "shorten the 14 day period"], answer: 1, why: "Holding species constant is what isolates population of origin as the variable being compared." },
    { id: "acts5", section: "Science", skill: "Prediction", passage: ACT_SCIENCE, q: "If Study 2 were extended to 25 g/L, the results most likely would show germination:", choices: ["above 74 percent", "between 38 and 74 percent", "below 38 percent", "exactly 0 percent"], answer: 2, why: "Germination falls monotonically with salinity in both studies, so extending the trend predicts a value below the 38 percent seen at 20 g/L. Claiming exactly zero goes further than the trend supports." },
    { id: "acts6", section: "Science", skill: "Hypothesis", passage: ACT_SCIENCE, q: "A researcher hypothesises that salt tolerance in this species is heritable rather than acquired during growth. Which additional result would best support that hypothesis?", choices: ["Coastal plants grow taller than inland plants", "Offspring of coastal plants raised inland for three generations retain high tolerance", "Salinity in the coastal soil varies seasonally", "Inland seeds germinate faster at 0 g/L"], answer: 1, why: "Tolerance surviving three generations away from salt water points to inheritance rather than an effect of the growing environment." },
  ],

  ssat: [
    { id: "ssr1", section: "Reading", skill: "Inference", passage: SSAT_READING_1, q: "The second log suggests that the keeper:", choices: ["was careless in his duties", "felt personally accountable for the ships he watched", "hoped to publish his memoirs", "disliked the shipping company"], answer: 1, why: "He privately records the three that did not pass safely. Counting your failures alone points to personal accountability." },
    { id: "ssr2", section: "Reading", skill: "Detail", passage: SSAT_READING_1, q: "The keeper wrote in the second log:", choices: ["at noon each day", "in the hour before dawn", "only during storms", "once a month"], answer: 1, why: "The passage says he wrote in it only in the hour before dawn." },
    { id: "ssr3", section: "Reading", skill: "Purpose", passage: SSAT_READING_1, q: "The author mentions the official log mainly to:", choices: ["show how busy the keeper was", "contrast a required record with a private one", "explain how lighthouses work", "criticise the keeper's employers"], answer: 1, why: "The official log exists in the passage to set up the contrast with the log he showed no one." },
    { id: "ssr4", section: "Reading", skill: "Tone", passage: SSAT_READING_1, q: "The tone of the passage is best described as:", choices: ["quietly sombre", "cheerful", "outraged", "impatient"], answer: 0, why: "The subject is remembered loss, handled without raised voice, which is quiet sombreness." },
    { id: "ssr5", section: "Reading", skill: "Main idea", passage: SSAT_READING_2, q: "The passage is mainly about:", choices: ["how octopuses hunt", "evidence that octopuses may be less solitary than assumed", "the danger of discarded shells", "diving techniques in Australia"], answer: 1, why: "Every detail supports the claim that these sites complicate the solitary reputation." },
    { id: "ssr6", section: "Reading", skill: "Detail", passage: SSAT_READING_2, q: "According to the passage, octopuses at these sites do all of the following EXCEPT:", choices: ["chase one another", "signal with colour changes", "evict neighbours from dens", "share food with neighbours"], answer: 3, why: "Three behaviours are listed and food sharing is not among them. EXCEPT questions ask which item is absent." },
    { id: "ssr7", section: "Reading", skill: "Inference", passage: SSAT_READING_2, q: "The final sentence suggests that scientists:", choices: ["have settled the question", "disagree about how to interpret the behaviour", "believe the sites are artificial", "plan to remove the shells"], answer: 1, why: "Still argued signals unresolved disagreement about interpretation, not about the observations themselves." },
    { id: "ssr8", section: "Reading", skill: "Word meaning", passage: SSAT_READING_2, q: "As used in the passage, 'evict' most nearly means:", choices: ["invite", "force out", "feed", "follow"], answer: 1, why: "To evict is to drive out of a dwelling, which fits dens and matches the competitive behaviours listed alongside it." },
  ],

  ielts: [
    { id: "ier1", section: "Reading", skill: "True, False, Not Given", passage: IE_CONGESTION, q: "Statement: London was the first city in the world to introduce congestion charging.", choices: ["True", "False", "Not Given"], answer: 1, why: "Singapore introduced it in 1975 and London followed in 2003, so the statement is contradicted by the text." },
    { id: "ier2", section: "Reading", skill: "True, False, Not Given", passage: IE_CONGESTION, q: "Statement: Retail takings inside the London zone fell sharply after charging began.", choices: ["True", "False", "Not Given"], answer: 1, why: "The text says studies found no such effect and that takings tracked the citywide average. Critics predicted it; it did not happen." },
    { id: "ier3", section: "Reading", skill: "True, False, Not Given", passage: IE_CONGESTION, q: "Statement: The London charge applies at weekends as well as on weekdays.", choices: ["True", "False", "Not Given"], answer: 2, why: "The passage says vehicles entering on weekdays and says nothing at all about weekends, so the text is silent." },
    { id: "ier4", section: "Reading", skill: "Sentence completion", passage: IE_CONGESTION, q: "Complete with NO MORE THAN THREE WORDS: In its first year, traffic in the London zone fell by about ______.", choices: ["a fifth", "a half", "two thirds", "a tenth"], answer: 0, why: "The text says roughly a fifth. Answers over the stated word limit score zero even when the meaning is right." },
    { id: "ier5", section: "Reading", skill: "Detail", passage: IE_CONGESTION, q: "What changed about traffic inside the London zone?", choices: ["Total vehicle numbers rose", "Private cars fell as a share while taxis, buses and deliveries rose", "Only buses were permitted", "Delivery vehicles were banned"], answer: 1, why: "The passage describes a change in composition, with private cars declining sharply and other categories taking a larger share." },
    { id: "ier6", section: "Reading", skill: "Yes, No, Not Given", passage: IE_CONGESTION, q: "Statement: The writer accepts that experience of the Stockholm scheme changed public opinion more than campaigning did.", choices: ["Yes", "No", "Not Given"], answer: 0, why: "The writer reports researchers arguing exactly that and does not distance themselves from it. Yes, No, Not Given is used for views rather than facts." },
    { id: "ier7", section: "Reading", skill: "Detail", passage: IE_CONGESTION, q: "What was unusual about the Stockholm scheme?", choices: ["It was free for residents", "It was voted on after people had already lived with it", "It applied only at weekends", "It was abandoned after seven months"], answer: 1, why: "The referendum came after a seven month trial, which the passage explicitly calls unusual." },
    { id: "ier8", section: "Reading", skill: "Matching headings", passage: IE_CONGESTION, q: "Which heading best fits the second paragraph?", choices: ["The origins of congestion charging", "A predicted harm that did not materialise", "How the charge is collected", "Objections from delivery firms"], answer: 1, why: "The paragraph is built around critics predicting retail damage and studies finding none. A heading must cover the paragraph, not one detail in it." },

    { id: "iel1", section: "Listening", skill: "Form completion", passage: IELTS_LISTENING, q: "Complete the form: Name ______", choices: ["Okonkwo", "Okonkwa", "Okonwko", "Okonko"], answer: 0, why: "The speaker spells it out letter by letter, which is the examiner signalling that spelling carries the mark. Each wrong option alters one letter and scores zero." },
    { id: "iel2", section: "Listening", skill: "Distraction", passage: IELTS_LISTENING, q: "Which room will the booking use?", choices: ["The main hall", "The annexe", "Both rooms", "Neither, the booking is cancelled"], answer: 1, why: "The main hall is mentioned then withdrawn because of repainting. The correction after but is the answer, which is the commonest IELTS listening trap." },
    { id: "iel3", section: "Listening", skill: "Detail", passage: IELTS_LISTENING, q: "What is the capacity of the room offered?", choices: ["Sixty", "Two hundred", "Twenty five", "Forty"], answer: 0, why: "The annexe holds sixty. Two hundred is the main hall, which is unavailable, and the other numbers are prices." },
    { id: "iel4", section: "Listening", skill: "Numbers", passage: IELTS_LISTENING, q: "What hourly rate applies to a registered charity?", choices: ["Forty pounds", "Twenty five pounds", "Sixty pounds", "Fourteen pounds"], answer: 1, why: "Forty is the standard rate and twenty five is the charity rate. Both numbers are said, so you must track which condition each attaches to." },
    { id: "iel5", section: "Listening", skill: "Calculation", passage: IELTS_LISTENING, q: "How many hours is the booking?", choices: ["Two", "Four", "Six", "Fourteen"], answer: 1, why: "Two until six is four hours, and the speaker confirms it. Fourteen is the date, not a duration." },
    { id: "iel6", section: "Listening", skill: "Detail", passage: IELTS_LISTENING, q: "On what date is the booking?", choices: ["Saturday the fourth", "Saturday the fourteenth", "Saturday the fortieth", "Sunday the fourteenth"], answer: 1, why: "Saturday the fourteenth. Fourteen and forty are the classic minimal pair IELTS uses to test careful listening." },
  ],

  toefl: [
    { id: "tfr1", section: "Reading", skill: "Vocabulary", passage: TOEFL_READING, q: "The word 'ambiguous' in the passage is closest in meaning to:", choices: ["fragile", "open to more than one interpretation", "abundant", "recently discovered"], answer: 1, why: "The sentence explains it directly: an early domestic horse looks almost identical to a wild one, so the bones do not settle the question." },
    { id: "tfr2", section: "Reading", skill: "Factual information", passage: TOEFL_READING, q: "According to the passage, why is herd composition unreliable evidence here?", choices: ["Herds were too small to study", "The horses may have been kept for milk rather than meat", "The bones were too damaged", "Herds were not recorded until later"], answer: 1, why: "The passage gives that reason explicitly. Herd composition arguments assume animals were kept for meat." },
    { id: "tfr3", section: "Reading", skill: "Factual information", passage: TOEFL_READING, q: "Where does the characteristic bit wear appear?", choices: ["On the skull", "On the second premolar", "On the spine", "On the front hooves"], answer: 1, why: "The passage names the second premolar, where the metal repeatedly strikes the enamel." },
    { id: "tfr4", section: "Reading", skill: "Negative factual", passage: TOEFL_READING, q: "All of the following are mentioned as difficulties in dating domestication EXCEPT:", choices: ["Domestic and wild bones look nearly identical", "Herd composition is an unreliable indicator", "Bit wear may have a dietary cause", "Steppe sites have never been excavated"], answer: 3, why: "The passage discusses analysis of steppe assemblages, so excavation clearly happened. The other three are all raised as difficulties." },
    { id: "tfr5", section: "Reading", skill: "Sentence simplification", passage: TOEFL_READING, q: "Which best expresses the essential information in the sentence about the disputed specimens?", choices: ["All bit wear comes from diet", "Supporters argue the wear in question differs measurably in position and depth from wear caused by feeding", "Researchers agree the wear proves riding", "The specimens were dated incorrectly"], answer: 1, why: "The core is a counterargument based on measurable differences in position and depth. The wrong options drop the counterargument or overstate agreement." },
    { id: "tfr6", section: "Reading", skill: "Inference", passage: TOEFL_READING, q: "It can be inferred that before this dental evidence, most estimates for domestication were:", choices: ["earlier than 3500 BCE", "later than 3500 BCE", "exactly 3500 BCE", "not attempted"], answer: 1, why: "The passage calls 3500 BCE considerably earlier than most previous estimates, so those estimates were later dates." },
    { id: "tfr7", section: "Reading", skill: "Rhetorical purpose", passage: TOEFL_READING, q: "Why does the author discuss hard forage?", choices: ["To explain what horses ate on the steppe", "To present a rival explanation for the tooth wear", "To argue that horses were never ridden", "To describe modern horse care"], answer: 1, why: "Rhetorical purpose asks why a detail appears. Forage is introduced as an alternative cause that would undercut the riding interpretation." },
    { id: "tfr8", section: "Reading", skill: "Overall organisation", passage: TOEFL_READING, q: "The passage is organised as:", choices: ["a problem, a proposed solution, and objections to it", "a chronological history of horse breeding", "a comparison of two regions", "a set of instructions"], answer: 0, why: "Paragraph one sets the difficulty, paragraph two offers the dental evidence, and paragraph three gives the objections and replies." },

    { id: "tfl1", section: "Listening", skill: "Main idea", passage: TOEFL_LISTENING, q: "What is the lecture mainly about?", choices: ["How filing cabinets work", "Why the storage and retrieval model of memory is now considered wrong", "The history of jury trials", "Techniques for improving memory"], answer: 1, why: "The speaker states it in the opening: last week was the classical account, today is why that picture is wrong." },
    { id: "tfl2", section: "Listening", skill: "Detail", passage: TOEFL_LISTENING, q: "According to the professor, what happens when a memory is recalled?", choices: ["It is permanently erased", "It becomes temporarily unstable and must be written back", "It moves to a different brain region", "It becomes more accurate"], answer: 1, why: "That is the reconsolidation claim the lecture is built on, and it is stated almost word for word." },
    { id: "tfl3", section: "Listening", skill: "Inference", passage: TOEFL_LISTENING, q: "The professor implies that eyewitness testimony is:", choices: ["more reliable than assumed", "potentially altered by the act of recalling it", "irrelevant to memory research", "always deliberately false"], answer: 1, why: "If remembering edits, then repeated recall by a witness may change the memory. Deliberate falsehood is never suggested." },
    { id: "tfl4", section: "Listening", skill: "Organisation", passage: TOEFL_LISTENING, q: "What will the second half of the lecture cover?", choices: ["The filing cabinet model", "The implications for eyewitness testimony", "Methods of brain imaging", "A review for the examination"], answer: 1, why: "The professor closes by saying they will spend the second half on exactly that problem, meaning jurors and eyewitnesses." },
    { id: "tfl5", section: "Listening", skill: "Function", passage: TOEFL_LISTENING, q: "Why does the professor mention last week's lecture?", choices: ["To apologise for running late", "To connect the new material to what students already know", "To assign extra reading", "To correct a student's error"], answer: 1, why: "Referring back establishes the point the new evidence overturns, which is a standard lecture opening move." },
    { id: "tfl6", section: "Listening", skill: "Attitude", passage: TOEFL_LISTENING, q: "The professor's use of the word 'uncomfortable' suggests that the finding is:", choices: ["difficult to accept because of its consequences", "physically painful to study", "poorly supported by evidence", "of no practical importance"], answer: 0, why: "The discomfort is about consequences, illustrated immediately by the juror example, not about the quality of the evidence." },
  ],
};

const IE_P2 = `The idea that a language shapes the thought of its speakers has had a turbulent history. In its strongest form, associated with Benjamin Lee Whorf, it held that speakers of different languages inhabit different conceptual worlds and that some ideas are literally unthinkable without the right vocabulary. That version collapsed under scrutiny in the 1960s, and for two decades the question was considered closed.

It reopened with better methods. Rather than asking whether language determines thought, researchers began asking whether it nudges it, and designed experiments precise enough to detect small effects. Speakers of languages that place an obligatory grammatical marker on the source of information, whether seen, heard or inferred, were found to remember the source of a statement slightly more reliably. Speakers of languages with absolute spatial terms, north and south rather than left and right, proved markedly better at orienting themselves in unfamiliar rooms.

The effects are real but modest, and their direction is disputed. It is not obvious whether the language trains the habit or whether a culture that needs the habit keeps the language feature. Most researchers now describe the relationship as a loop rather than a line.`;

const IE_P3 = `Antarctica has no permanent human population, no government and no owner. The Antarctic Treaty, signed in 1959 by twelve countries and now numbering more than fifty parties, suspended all territorial claims rather than settling them. Seven nations maintain claims on paper; none is recognised by the others, and the treaty freezes the whole question indefinitely.

The arrangement has held for six decades, which is longer than most people expected. Its durability rests on two features. The first is inspection: any party may inspect any station at any time, without notice, and refusal is not permitted. The second is the ban on military activity and on nuclear waste, which removed the most likely cause of conflict at a stroke.

Pressure is now coming from a direction the drafters did not anticipate. The 1991 environmental protocol banned mineral extraction, but it may be reviewed from 2048, and the countries best positioned to extract are also those with the largest research presence. Tourism, entirely unregulated by the original treaty, has grown from a few hundred visitors a year to more than one hundred thousand.`;

const IE_P4 = `For most of the twentieth century, the standard advice to anyone recovering from a back injury was rest. Patients were told to lie still, sometimes for weeks. The reasoning was intuitive: a damaged structure should not be loaded.

Trials from the 1990s onwards found the opposite. Patients encouraged to resume ordinary activity within days recovered faster and reported less pain at six months than those prescribed bed rest, and the gap widened the longer rest continued. Prolonged rest weakens the muscles that stabilise the spine, and the resulting deconditioning produces pain of its own, which is easily mistaken for the original injury failing to heal.

Changing practice proved harder than changing the evidence. Surveys a decade after the trials found that a substantial minority of clinicians still advised rest, and that patients themselves often expected it and were dissatisfied when it was not offered. The lesson drawn by health researchers was not that clinicians ignore evidence, but that advice which feels intuitively wrong to both parties needs active reinforcement to displace the older habit.`;

const TF_P2 = `Bioluminescence has evolved independently at least forty times, which is a strong indication that the underlying chemistry is easy for evolution to reach. In nearly every case the reaction is the same in outline: a small molecule called a luciferin is oxidised by an enzyme called a luciferase, and the energy released emerges as light rather than heat.

What differs is everything else. The luciferins of fireflies, of certain deep sea fish and of dinoflagellates are chemically unrelated compounds, and the enzymes that act on them share no common ancestry. Some organisms do not manufacture the chemistry at all: several fish species house luminous bacteria in specialised organs and control the light by shuttering it, much as one might cover a lantern.

The function varies as widely as the chemistry. In fireflies the light is a mating signal. In deep sea fish it is more often counterillumination, a downward glow that matches the faint light from above and erases the animal's silhouette from the view of anything hunting from below.`;

export const B1 = {
  ielts: [
    { id: "iep2a", section: "Reading", skill: "True, False, Not Given", passage: IE_P2, q: "Statement: Whorf's strongest version of the hypothesis is still widely accepted.", choices: ["True", "False", "Not Given"], answer: 1, why: "The passage says it collapsed under scrutiny in the 1960s, which contradicts the statement." },
    { id: "iep2b", section: "Reading", skill: "True, False, Not Given", passage: IE_P2, q: "Statement: Research on the question stopped entirely for around twenty years.", choices: ["True", "False", "Not Given"], answer: 0, why: "For two decades the question was considered closed, which supports the statement." },
    { id: "iep2c", section: "Reading", skill: "True, False, Not Given", passage: IE_P2, q: "Statement: Whorf conducted experiments on spatial orientation.", choices: ["True", "False", "Not Given"], answer: 2, why: "The spatial work is described as part of the later revival, and no link to Whorf is made. The text is simply silent." },
    { id: "iep2d", section: "Reading", skill: "Detail", passage: IE_P2, q: "Speakers of languages that mark the source of information were found to:", choices: ["speak more slowly", "recall where a statement came from slightly better", "have larger vocabularies", "orient themselves better"], answer: 1, why: "The passage attributes source recall to evidentiality marking. Orientation belongs to the other example." },
    { id: "iep2e", section: "Reading", skill: "Detail", passage: IE_P2, q: "What advantage was found for speakers of languages using absolute spatial terms?", choices: ["Faster reading", "Better orientation in unfamiliar rooms", "Better memory for faces", "Larger working memory"], answer: 1, why: "Markedly better at orienting themselves in unfamiliar rooms is stated directly." },
    { id: "iep2f", section: "Reading", skill: "Yes, No, Not Given", passage: IE_P2, q: "Statement: The writer considers the causal direction of these effects to be settled.", choices: ["Yes", "No", "Not Given"], answer: 1, why: "The writer says the direction is disputed and describes the relationship as a loop, which contradicts the statement." },
    { id: "iep2g", section: "Reading", skill: "Matching headings", passage: IE_P2, q: "Which heading best fits the second paragraph?", choices: ["The collapse of a strong claim", "A revival driven by sharper methods", "How children acquire grammar", "Vocabulary size across languages"], answer: 1, why: "The paragraph is about the question reopening once experiments became precise enough to detect small effects." },
    { id: "iep2h", section: "Reading", skill: "Sentence completion", passage: IE_P2, q: "Complete with NO MORE THAN TWO WORDS: Most researchers now describe the relationship between language and thought as ______ rather than a line.", choices: ["a loop", "a ladder", "a spiral", "a chain"], answer: 0, why: "A loop rather than a line is the phrase used, and it is within the word limit." },
    { id: "iep2i", section: "Reading", skill: "Inference", passage: IE_P2, q: "The phrase 'nudges it' suggests the writer regards the influence of language on thought as:", choices: ["overwhelming", "slight but genuine", "entirely absent", "impossible to study"], answer: 1, why: "A nudge is a small push, and the passage calls the effects real but modest." },

    { id: "iep3a", section: "Reading", skill: "True, False, Not Given", passage: IE_P3, q: "Statement: The Antarctic Treaty resolved all territorial claims to the continent.", choices: ["True", "False", "Not Given"], answer: 1, why: "It suspended claims rather than settling them, which the statement contradicts." },
    { id: "iep3b", section: "Reading", skill: "Detail", passage: IE_P3, q: "How many nations maintain territorial claims on paper?", choices: ["Twelve", "Seven", "Fifty", "None"], answer: 1, why: "Seven nations maintain claims. Twelve is the number of original signatories and fifty the current parties." },
    { id: "iep3c", section: "Reading", skill: "Detail", passage: IE_P3, q: "According to the passage, inspections of stations:", choices: ["require six months notice", "may happen at any time without notice", "are carried out by the United Nations", "occur once a decade"], answer: 1, why: "Any party may inspect any station at any time, without notice, and refusal is not permitted." },
    { id: "iep3d", section: "Reading", skill: "Detail", passage: IE_P3, q: "Which two activities does the treaty prohibit outright?", choices: ["Tourism and fishing", "Military activity and nuclear waste disposal", "Research and inspection", "Mining and shipping"], answer: 1, why: "The passage names the ban on military activity and on nuclear waste as the second stabilising feature." },
    { id: "iep3e", section: "Reading", skill: "True, False, Not Given", passage: IE_P3, q: "Statement: Mineral extraction is currently permitted in Antarctica.", choices: ["True", "False", "Not Given"], answer: 1, why: "The 1991 protocol banned it. The possibility of review from 2048 does not make it currently permitted." },
    { id: "iep3f", section: "Reading", skill: "Yes, No, Not Given", passage: IE_P3, q: "Statement: The writer suggests that countries with the largest research presence would also be best placed to mine.", choices: ["Yes", "No", "Not Given"], answer: 0, why: "The passage states exactly that, and the pairing is presented as a source of pressure." },
    { id: "iep3g", section: "Reading", skill: "Sentence completion", passage: IE_P3, q: "Complete with NO MORE THAN THREE WORDS: Tourism was ______ by the original treaty.", choices: ["entirely unregulated", "strictly limited", "completely banned", "carefully monitored"], answer: 0, why: "The text says tourism was entirely unregulated by the original treaty." },
    { id: "iep3h", section: "Reading", skill: "Detail", passage: IE_P3, q: "Visitor numbers to Antarctica have grown to more than:", choices: ["one thousand a year", "ten thousand a year", "one hundred thousand a year", "one million a year"], answer: 2, why: "The passage gives more than one hundred thousand, up from a few hundred." },
    { id: "iep3i", section: "Reading", skill: "Matching headings", passage: IE_P3, q: "Which heading best fits the final paragraph?", choices: ["Why the treaty was signed", "New pressures the drafters did not foresee", "The geography of the continent", "How inspections are conducted"], answer: 1, why: "The paragraph is built around mining review and unregulated tourism, both described as unanticipated." },

    { id: "iep4a", section: "Reading", skill: "Detail", passage: IE_P4, q: "What was the standard advice for back injury for most of the twentieth century?", choices: ["Immediate exercise", "Rest, sometimes for weeks", "Surgery", "Heat treatment"], answer: 1, why: "Patients were told to lie still, sometimes for weeks." },
    { id: "iep4b", section: "Reading", skill: "True, False, Not Given", passage: IE_P4, q: "Statement: Patients who resumed activity early reported less pain at six months.", choices: ["True", "False", "Not Given"], answer: 0, why: "This is stated directly as a trial finding." },
    { id: "iep4c", section: "Reading", skill: "Detail", passage: IE_P4, q: "Why does prolonged rest cause problems?", choices: ["It damages the bones", "It weakens the muscles that stabilise the spine", "It increases inflammation", "It causes weight gain"], answer: 1, why: "Deconditioning of the stabilising muscles produces pain of its own." },
    { id: "iep4d", section: "Reading", skill: "Inference", passage: IE_P4, q: "The passage suggests that pain caused by deconditioning is often mistaken for:", choices: ["a new injury", "the original injury failing to heal", "a psychological problem", "a side effect of medication"], answer: 1, why: "The text states this explicitly at the end of the second paragraph." },
    { id: "iep4e", section: "Reading", skill: "True, False, Not Given", passage: IE_P4, q: "Statement: All clinicians had changed their advice within ten years of the trials.", choices: ["True", "False", "Not Given"], answer: 1, why: "A substantial minority still advised rest a decade later, contradicting all." },
    { id: "iep4f", section: "Reading", skill: "Detail", passage: IE_P4, q: "According to the passage, patients themselves often:", choices: ["refused all treatment", "expected rest and were dissatisfied without it", "preferred surgery", "ignored clinical advice"], answer: 1, why: "Surveys found patients expected rest and were dissatisfied when it was not offered." },
    { id: "iep4g", section: "Reading", skill: "Yes, No, Not Given", passage: IE_P4, q: "Statement: The writer believes clinicians simply ignore evidence.", choices: ["Yes", "No", "Not Given"], answer: 1, why: "The passage explicitly says the lesson was not that clinicians ignore evidence." },
    { id: "iep4h", section: "Reading", skill: "Inference", passage: IE_P4, q: "What does the passage suggest is needed to displace an intuitive but wrong belief?", choices: ["Stronger medication", "Active reinforcement of the new advice", "Longer consultations", "More trials"], answer: 1, why: "The final sentence says such advice needs active reinforcement to displace the older habit." },
    { id: "iep4i", section: "Reading", skill: "Matching headings", passage: IE_P4, q: "Which heading best fits the whole passage?", choices: ["Why evidence alone does not change practice", "New surgical techniques for back pain", "The anatomy of the spine", "How to diagnose a back injury"], answer: 0, why: "The passage moves from old advice, to the evidence overturning it, to why practice lagged anyway." },
  ],

  toefl: [
    { id: "tfp2a", section: "Reading", skill: "Factual information", passage: TF_P2, q: "What does the frequency of independent evolution suggest to researchers?", choices: ["That the chemistry is easy for evolution to reach", "That all luminous species are related", "That the trait is disappearing", "That it evolved only in the deep sea"], answer: 0, why: "The opening sentence draws exactly that inference from at least forty independent origins." },
    { id: "tfp2b", section: "Reading", skill: "Factual information", passage: TF_P2, q: "In the general reaction described, what does the luciferase do?", choices: ["Produces heat", "Oxidises the luciferin", "Stores the light", "Absorbs oxygen from water"], answer: 1, why: "The enzyme oxidises the luciferin, releasing energy as light." },
    { id: "tfp2c", section: "Reading", skill: "Negative factual", passage: TF_P2, q: "All of the following are stated about luminous organisms EXCEPT:", choices: ["Some house bacteria rather than making the chemistry themselves", "Their luciferins can be chemically unrelated", "Their enzymes may share no ancestry", "They all use light to attract mates"], answer: 3, why: "Mating signals are given for fireflies specifically, while deep sea fish use counterillumination, so all is contradicted." },
    { id: "tfp2d", section: "Reading", skill: "Vocabulary", passage: TF_P2, q: "The word 'shuttering' in the passage is closest in meaning to:", choices: ["blocking from view", "amplifying", "changing colour", "sharing"], answer: 0, why: "The passage supplies the gloss itself: much as one might cover a lantern." },
    { id: "tfp2e", section: "Reading", skill: "Inference", passage: TF_P2, q: "It can be inferred that counterillumination is effective because predators:", choices: ["hunt from below and see silhouettes against the light above", "are attracted to bright colours", "cannot see at all", "hunt only at the surface"], answer: 0, why: "A downward glow matching the light from above only helps if the viewer is below looking up." },
    { id: "tfp2f", section: "Reading", skill: "Rhetorical purpose", passage: TF_P2, q: "Why does the author mention fireflies and deep sea fish together?", choices: ["To show that both are endangered", "To contrast two different functions of the same general chemistry", "To explain how fireflies migrate", "To argue that fish evolved from insects"], answer: 1, why: "They illustrate the closing point that function varies as widely as the chemistry does." },
  ],
};

const AR_FICTION = `My grandmother kept the shop for fifty one years and never once put a price on anything. She carried the whole inventory in her head, and the price she named depended on who was asking. The Bhatt family, whose father had been out of work since the mill closed, paid less for rice than the doctor's wife did, and neither of them knew it.

I learned this at fourteen, working Saturdays, when I rang up a tin of oil at the number printed on the delivery invoice and my grandmother put her hand over mine on the register. Afterwards she explained it exactly once, in two sentences, and never referred to it again. What she said was that a shop is not a machine, and that anyone who cannot tell the difference between a price and a cost should work somewhere else.

I have thought about those two sentences for thirty years. At the time I understood them as an instruction about kindness. I understand them now as something harder: a claim that judgement cannot be delegated to a system, and that the moment you write the number on the tin you have decided to stop looking at the person in front of you.`;

const AR_SOCIAL = `Between 1880 and 1920, the American public library transformed from a subscription institution serving the professional classes into a free municipal service. The usual explanation credits Andrew Carnegie, who funded more than sixteen hundred library buildings. The explanation is incomplete in an instructive way.

Carnegie's grants paid for buildings only. He required, as a condition, that the municipality commit permanent tax revenue to staffing and stock, typically ten percent of the construction cost annually, in perpetuity. Towns that took the money were therefore obliged to create a permanent line in the municipal budget, and that obligation, not the building, is what made the libraries survive.

Historians who have studied the refusals find the condition was decisive in the other direction too. Several hundred towns declined the grant, and the recorded objections almost never concern the building. They concern the tax. What Carnegie was really offering was not a library but a mechanism for converting a one time gift into a permanent public commitment, and a significant minority of communities understood the offer precisely and refused it.`;

const AR_SCIENCE = `Ocean currents are driven by wind at the surface and by density at depth. The density component, known as thermohaline circulation, depends on cold salty water sinking in the North Atlantic, and it is the sinking that pulls warm surface water northward behind it.

Freshwater from melting ice dilutes the surface layer and makes it less dense, so it sinks less readily. Models have long predicted that sufficient freshening would slow the circulation. What has been difficult is measurement: the system is enormous, slow, and was not directly instrumented until an array of moorings was installed across the Atlantic in 2004.

Two decades of data now exist. They show substantial variability from year to year, considerably more than models anticipated, which complicates any claim about long term trend. Some researchers read a weakening signal in the record; others argue that twenty years is too short to separate a trend from the natural swing, and that the honest position is that the record cannot yet answer the question it was built to answer.`;

const SS_P3 = `The first successful transatlantic telegraph cable was laid in 1866, but three earlier attempts had failed. The 1858 cable worked for three weeks, carrying messages so faint that a single word took two minutes to send, before an engineer applied excessive voltage in an effort to speed it up and destroyed the insulation permanently.`;

const SS_P4 = `Ravens are among the few animals known to plan for the future. In one experiment, birds were shown a tool that opened a puzzle box containing food, then had the box removed. A day later, offered a tray holding the tool along with several attractive distractor objects, the ravens selected the tool, even though the box was nowhere in sight and would not reappear for another fifteen minutes.`;

const SS_P5 = `The village had one telephone, in the post office, and when it rang everyone within hearing looked up. Mrs Achebe would answer, listen, and then walk out into the road to find whoever the call was for. In this way news arrived publicly, and there was no such thing as private bad news, only bad news that everyone learned at slightly different speeds.`;

const SS_P6 = `Bamboo is a grass, not a tree, and some species grow nearly a metre a day. The stalk emerges from the ground at its final diameter and never thickens, which is why a bamboo forest looks so uniform. What appear to be separate plants are usually a single organism connected underground, and when one stalk flowers, every stalk of that organism flowers at the same time, sometimes across continents, and then the whole thing dies.`;

export const B2 = {
  act: [
    { id: "arf1", section: "Reading", skill: "Main idea", passage: AR_FICTION, q: "The passage is primarily concerned with:", choices: ["the economics of running a small shop", "the narrator's changing understanding of a lesson", "a dispute between two customers", "the closure of a mill"], answer: 1, why: "The structure moves from the event, to the young narrator's reading of it, to the different reading thirty years later." },
    { id: "arf2", section: "Reading", skill: "Detail", passage: AR_FICTION, q: "The narrator was how old when the incident occurred?", choices: ["Ten", "Fourteen", "Twenty", "Fifty one"], answer: 1, why: "I learned this at fourteen. Fifty one is the number of years the grandmother kept the shop." },
    { id: "arf3", section: "Reading", skill: "Inference", passage: AR_FICTION, q: "The detail that neither family knew about the different prices most strongly suggests that the grandmother:", choices: ["was ashamed of the practice", "did not intend it as visible charity", "was defrauding her customers", "kept poor records"], answer: 1, why: "Charity nobody is told about is not performed for credit. Shame is never indicated and the records are in her head, not poor." },
    { id: "arf4", section: "Reading", skill: "Function", passage: AR_FICTION, q: "The grandmother putting her hand over the narrator's on the register mainly serves to:", choices: ["show physical affection", "stop an action without speaking", "demonstrate how the register works", "indicate she was unwell"], answer: 1, why: "It is a silent intervention at the moment the printed price is about to be used." },
    { id: "arf5", section: "Reading", skill: "Word meaning", passage: AR_FICTION, q: "As used in the passage, the distinction between 'a price and a cost' most nearly concerns:", choices: ["profit margins", "what a thing is worth versus what it takes from the buyer", "wholesale versus retail", "cash versus credit"], answer: 1, why: "The whole passage turns on the buyer's circumstances, so cost is what paying takes from that particular person." },
    { id: "arf6", section: "Reading", skill: "Inference", passage: AR_FICTION, q: "The narrator's mature understanding differs from the youthful one chiefly in that it:", choices: ["rejects the grandmother's view", "sees a claim about judgement rather than simple kindness", "focuses on the shop's finances", "concerns the Bhatt family specifically"], answer: 1, why: "The final paragraph states the shift: from kindness to a claim that judgement cannot be delegated." },
    { id: "arf7", section: "Reading", skill: "Detail", passage: AR_FICTION, q: "According to the passage, the grandmother explained her practice:", choices: ["repeatedly over many years", "exactly once, briefly", "in a written note", "only to other shopkeepers"], answer: 1, why: "Exactly once, in two sentences, and never referred to it again." },
    { id: "arf8", section: "Reading", skill: "Tone", passage: AR_FICTION, q: "The narrator's attitude toward the grandmother is best described as:", choices: ["reverent but still questioning", "dismissive", "resentful", "indifferent"], answer: 0, why: "Thirty years of reflection shows deep regard, while I understand them now as something harder shows continued reconsideration." },
    { id: "arf9", section: "Reading", skill: "Structure", passage: AR_FICTION, q: "The three paragraphs move from:", choices: ["general practice, to a specific incident, to reflection", "reflection, to argument, to conclusion", "dialogue, to description, to dialogue", "the present, to the future, to the past"], answer: 0, why: "Paragraph one describes the long standing practice, two narrates the single incident, three reflects on it." },

    { id: "ars1", section: "Reading", skill: "Main idea", passage: AR_SOCIAL, q: "The main point of the passage is that:", choices: ["Carnegie built more libraries than anyone else", "the funding condition, not the buildings, explains the libraries' survival", "American libraries were originally free", "most towns refused Carnegie's money"], answer: 1, why: "The passage says explicitly that the obligation, not the building, is what made the libraries survive." },
    { id: "ars2", section: "Reading", skill: "Detail", passage: AR_SOCIAL, q: "Carnegie's grants paid for:", choices: ["buildings only", "buildings and staff", "books only", "staff and stock"], answer: 0, why: "Buildings only, with the town committing tax revenue for the rest." },
    { id: "ars3", section: "Reading", skill: "Detail", passage: AR_SOCIAL, q: "What annual commitment did Carnegie typically require?", choices: ["One percent of construction cost", "Ten percent of construction cost", "Half the construction cost", "No ongoing commitment"], answer: 1, why: "Typically ten percent of the construction cost annually, in perpetuity." },
    { id: "ars4", section: "Reading", skill: "Inference", passage: AR_SOCIAL, q: "The author calls the usual explanation 'incomplete in an instructive way' mainly because it:", choices: ["understates the number of libraries", "omits the mechanism that actually mattered", "wrongly dates the transformation", "confuses Carnegie with another donor"], answer: 1, why: "The passage goes on to supply the missing mechanism, which is the permanent tax commitment." },
    { id: "ars5", section: "Reading", skill: "Detail", passage: AR_SOCIAL, q: "According to the passage, towns that refused the grant objected mainly to:", choices: ["the architecture", "the tax obligation", "Carnegie's business practices", "the location offered"], answer: 1, why: "The recorded objections almost never concern the building; they concern the tax." },
    { id: "ars6", section: "Reading", skill: "Inference", passage: AR_SOCIAL, q: "The author's remark that refusing communities 'understood the offer precisely' implies that they:", choices: ["misread Carnegie's intentions", "grasped that they were being asked for a permanent commitment", "wanted a larger grant", "opposed public education"], answer: 1, why: "Understanding precisely means seeing the permanent obligation, which is what they declined." },
    { id: "ars7", section: "Reading", skill: "Word meaning", passage: AR_SOCIAL, q: "As used in the passage, 'in perpetuity' most nearly means:", choices: ["for one generation", "without end", "at the town's discretion", "during construction"], answer: 1, why: "It contrasts with the one time gift, so it means permanently." },
    { id: "ars8", section: "Reading", skill: "Detail", passage: AR_SOCIAL, q: "Before this transformation, American public libraries mainly served:", choices: ["schoolchildren", "the professional classes, by subscription", "factory workers", "rural households"], answer: 1, why: "The opening sentence describes a subscription institution serving the professional classes." },
    { id: "ars9", section: "Reading", skill: "Purpose", passage: AR_SOCIAL, q: "The final paragraph mainly serves to:", choices: ["describe library architecture", "support the argument using evidence from towns that refused", "criticise Carnegie personally", "predict the future of libraries"], answer: 1, why: "The refusals are offered as confirming evidence, since the objections were about the tax rather than the building." },

    { id: "arn1", section: "Reading", skill: "Main idea", passage: AR_SCIENCE, q: "The passage is mainly about:", choices: ["how wind drives surface currents", "the difficulty of determining whether the circulation is weakening", "the discovery of the Atlantic Ocean", "methods of desalination"], answer: 1, why: "The passage builds toward the measurement problem and the disagreement about what the record shows." },
    { id: "arn2", section: "Reading", skill: "Detail", passage: AR_SCIENCE, q: "Thermohaline circulation depends on:", choices: ["warm fresh water rising in the tropics", "cold salty water sinking in the North Atlantic", "tidal forces from the moon", "wind at the surface only"], answer: 1, why: "The passage names the sinking of cold salty water in the North Atlantic as the density driver." },
    { id: "arn3", section: "Reading", skill: "Cause and effect", passage: AR_SCIENCE, q: "Why does meltwater potentially slow the circulation?", choices: ["It raises the water temperature", "It dilutes the surface layer, making it less dense so it sinks less readily", "It increases salinity", "It blocks the current physically"], answer: 1, why: "Freshening reduces density, and sinking is what pulls the warm water north." },
    { id: "arn4", section: "Reading", skill: "Detail", passage: AR_SCIENCE, q: "Direct measurement of the system began in:", choices: ["1866", "1958", "2004", "2024"], answer: 2, why: "An array of moorings was installed across the Atlantic in 2004." },
    { id: "arn5", section: "Reading", skill: "Data reasoning", passage: AR_SCIENCE, q: "The year to year variability found in the record:", choices: ["was smaller than models anticipated", "was larger than models anticipated and complicates trend claims", "was exactly as predicted", "was not measured"], answer: 1, why: "Considerably more than models anticipated, which complicates any claim about long term trend." },
    { id: "arn6", section: "Reading", skill: "Conflicting views", passage: AR_SCIENCE, q: "Researchers who resist claiming a weakening trend argue mainly that:", choices: ["the moorings are inaccurate", "twenty years is too short to separate trend from natural variation", "the circulation does not exist", "models are always wrong"], answer: 1, why: "That is their stated position, and the passage frames it as the honest reading of a short record." },
    { id: "arn7", section: "Reading", skill: "Inference", passage: AR_SCIENCE, q: "The phrase 'the record cannot yet answer the question it was built to answer' most strongly suggests that:", choices: ["the array was badly designed", "more time, rather than better instruments, is what is needed", "the question was the wrong one", "the data have been lost"], answer: 1, why: "The limitation named is the length of the record, not the quality of the instruments." },
    { id: "arn8", section: "Reading", skill: "Word meaning", passage: AR_SCIENCE, q: "As used in the passage, 'freshening' most nearly means:", choices: ["becoming less salty", "becoming colder", "becoming faster", "becoming cleaner"], answer: 0, why: "It refers to dilution by freshwater from melting ice, which lowers salinity." },
    { id: "arn9", section: "Reading", skill: "Structure", passage: AR_SCIENCE, q: "The passage is organised as:", choices: ["mechanism, then prediction, then the state of the evidence", "a chronological history of oceanography", "a comparison of two oceans", "a set of policy recommendations"], answer: 0, why: "Paragraph one gives the mechanism, two the prediction and measurement problem, three what the data do and do not show." },
  ],

  ssat: [
    { id: "ssp3a", section: "Reading", skill: "Detail", passage: SS_P3, q: "How long did the 1858 cable operate?", choices: ["Three days", "Three weeks", "Three months", "Three years"], answer: 1, why: "The passage says it worked for three weeks." },
    { id: "ssp3b", section: "Reading", skill: "Detail", passage: SS_P3, q: "What destroyed the 1858 cable?", choices: ["A storm", "Excessive voltage applied by an engineer", "A ship's anchor", "Corrosion from seawater"], answer: 1, why: "An engineer applied excessive voltage trying to speed it up and destroyed the insulation." },
    { id: "ssp3c", section: "Reading", skill: "Inference", passage: SS_P3, q: "The detail that a single word took two minutes suggests that the 1858 cable was:", choices: ["extremely fast", "barely usable", "never connected", "used only for emergencies"], answer: 1, why: "Two minutes per word is workable in principle but close to useless in practice, which is why speeding it up was attempted." },
    { id: "ssp3d", section: "Reading", skill: "Detail", passage: SS_P3, q: "How many attempts failed before the successful cable?", choices: ["One", "Two", "Three", "Four"], answer: 2, why: "Three earlier attempts had failed before the 1866 success." },
    { id: "ssp3e", section: "Reading", skill: "Word meaning", passage: SS_P3, q: "As used in the passage, 'faint' most nearly means:", choices: ["weak", "dishonest", "rapid", "expensive"], answer: 0, why: "Faint signals are weak ones, which is why each word took so long." },
    { id: "ssp3f", section: "Reading", skill: "Purpose", passage: SS_P3, q: "The passage mainly serves to:", choices: ["explain how telegraphy works", "recount the failure that preceded a success", "criticise Victorian engineering", "describe life at sea"], answer: 1, why: "The focus is the 1858 failure, framed by the eventual 1866 success." },

    { id: "ssp4a", section: "Reading", skill: "Main idea", passage: SS_P4, q: "The passage is mainly about:", choices: ["how ravens build nests", "evidence that ravens can plan ahead", "the design of puzzle boxes", "the diet of wild birds"], answer: 1, why: "The whole experiment is presented as evidence of planning for the future." },
    { id: "ssp4b", section: "Reading", skill: "Detail", passage: SS_P4, q: "How long after seeing the tool were the ravens offered the tray?", choices: ["Fifteen minutes", "One hour", "A day", "A week"], answer: 2, why: "A day later, offered a tray holding the tool. Fifteen minutes is how long until the box returned." },
    { id: "ssp4c", section: "Reading", skill: "Inference", passage: SS_P4, q: "The distractor objects were included in order to:", choices: ["reward the birds", "test whether the choice of tool was deliberate", "make the tray heavier", "distract the researchers"], answer: 1, why: "If the raven picks the tool over attractive alternatives, the choice is unlikely to be accidental." },
    { id: "ssp4d", section: "Reading", skill: "Detail", passage: SS_P4, q: "At the moment of choosing, the puzzle box was:", choices: ["in front of the bird", "nowhere in sight", "being opened by a researcher", "full of food"], answer: 1, why: "The box was nowhere in sight and would not reappear for fifteen minutes." },
    { id: "ssp4e", section: "Reading", skill: "Word meaning", passage: SS_P4, q: "As used in the passage, 'distractor' most nearly describes an object that is:", choices: ["essential to the task", "there to tempt a wrong choice", "invisible", "poisonous"], answer: 1, why: "Distractors are attractive alternatives whose purpose is to draw an incorrect selection." },
    { id: "ssp4f", section: "Reading", skill: "Inference", passage: SS_P4, q: "The experiment is impressive chiefly because the ravens chose the tool:", choices: ["faster than expected", "when it had no immediate use", "without ever seeing it before", "in complete darkness"], answer: 1, why: "The tool was useless at the moment of choosing, which is what makes the choice future directed." },

    { id: "ssp5a", section: "Reading", skill: "Main idea", passage: SS_P5, q: "The passage mainly describes:", choices: ["how a single telephone shaped village life", "the history of the post office", "a quarrel between neighbours", "how telephones are built"], answer: 0, why: "Every detail follows from there being one telephone that everyone could hear." },
    { id: "ssp5b", section: "Reading", skill: "Detail", passage: SS_P5, q: "Where was the telephone?", choices: ["In the school", "In the post office", "In Mrs Achebe's house", "In the road"], answer: 1, why: "The village had one telephone, in the post office." },
    { id: "ssp5c", section: "Reading", skill: "Inference", passage: SS_P5, q: "The final sentence suggests that in the village:", choices: ["news travelled slowly", "privacy about serious news was impossible", "nobody received bad news", "the telephone was rarely used"], answer: 1, why: "There was no such thing as private bad news, only differences in when people heard it." },
    { id: "ssp5d", section: "Reading", skill: "Function", passage: SS_P5, q: "The detail that everyone within hearing looked up mainly conveys:", choices: ["how loud the telephone was", "how rare and significant a call was", "that the villagers were nosy", "that the post office was crowded"], answer: 1, why: "A shared reaction to every ring shows the event was uncommon and consequential." },
    { id: "ssp5e", section: "Reading", skill: "Tone", passage: SS_P5, q: "The tone of the passage is best described as:", choices: ["nostalgic and observant", "angry", "scientific", "humorous and mocking"], answer: 0, why: "The narrator describes a vanished arrangement with careful attention and no criticism." },
    { id: "ssp5f", section: "Reading", skill: "Inference", passage: SS_P5, q: "Mrs Achebe's role can best be described as:", choices: ["an owner of the telephone", "an informal messenger for the village", "a government official", "a telephone engineer"], answer: 1, why: "She answers, listens and then carries the message to its recipient." },

    { id: "ssp6a", section: "Reading", skill: "Detail", passage: SS_P6, q: "According to the passage, bamboo is:", choices: ["a tree", "a grass", "a vine", "a moss"], answer: 1, why: "The first clause states that bamboo is a grass, not a tree." },
    { id: "ssp6b", section: "Reading", skill: "Detail", passage: SS_P6, q: "Why does a bamboo forest look uniform?", choices: ["The stalks are all the same age", "Each stalk emerges at its final diameter and never thickens", "The stalks are pruned", "All bamboo is one species"], answer: 1, why: "No thickening over time means no variation in stalk width." },
    { id: "ssp6c", section: "Reading", skill: "Inference", passage: SS_P6, q: "The passage suggests that what look like separate bamboo plants:", choices: ["compete with one another", "are usually one connected organism", "are different species", "were planted by people"], answer: 1, why: "They are usually a single organism connected underground." },
    { id: "ssp6d", section: "Reading", skill: "Detail", passage: SS_P6, q: "When one stalk of an organism flowers:", choices: ["only that stalk dies", "every stalk of that organism flowers, then the whole thing dies", "the forest grows faster", "nothing else happens"], answer: 1, why: "Simultaneous flowering across the organism is followed by the death of the whole thing." },
    { id: "ssp6e", section: "Reading", skill: "Detail", passage: SS_P6, q: "How fast can some bamboo species grow?", choices: ["A centimetre a day", "Nearly a metre a day", "A metre a year", "It is not stated"], answer: 1, why: "Some species grow nearly a metre a day." },
    { id: "ssp6f", section: "Reading", skill: "Inference", passage: SS_P6, q: "The mention that flowering can occur 'across continents' is striking because it implies:", choices: ["bamboo grows only in one place", "the organisms are synchronised despite great distance", "flowering is unpredictable", "each stalk decides separately"], answer: 1, why: "Simultaneity across continents means the timing is not driven by local conditions." },
    { id: "ssp6g", section: "Reading", skill: "Main idea", passage: SS_P6, q: "The passage is best described as:", choices: ["an argument for planting bamboo", "a set of unusual facts about how bamboo grows", "a warning about an invasive species", "instructions for harvesting bamboo"], answer: 1, why: "It presents several surprising biological facts without arguing a position." },
  ],
};

const SCI_1 = `Experiment 1: A pendulum was released from rest and its period measured for five lengths, with mass held constant at 200 g.
Length 0.25 m: period 1.00 s. 0.50 m: 1.42 s. 1.00 m: 2.01 s. 1.50 m: 2.46 s. 2.00 m: 2.84 s.

Experiment 2: The 1.00 m pendulum was repeated with four different masses.
50 g: 2.00 s. 100 g: 2.01 s. 500 g: 2.01 s. 1000 g: 2.00 s.`;

const SCI_2 = `Three soil samples were tested for water retention. Each 500 g sample received 200 mL of water, and the volume draining through in 10 minutes was recorded.
Sand: 178 mL drained. Loam: 96 mL drained. Clay: 21 mL drained.

The experiment was repeated after each sample was compacted under a 5 kg weight for one hour.
Sand: 171 mL. Loam: 74 mL. Clay: 6 mL.`;

const SCI_3 = `Scientist 1: The dark colouring of the peppered moth spread through industrial regions because soot darkened tree bark, so pale moths became conspicuous to birds and were eaten more often. The frequency of dark moths fell again after clean air legislation, exactly as the predation explanation requires.

Scientist 2: Predation is real but insufficient. Dark forms also appeared in regions with little industry, and the decline after clean air legislation began before bark lichens had substantially recovered. Some additional factor, possibly a direct physiological cost of the dark pigment, must be operating alongside predation.`;

const SCI_4 = `A reaction between marble chips and hydrochloric acid was monitored by mass loss over 5 minutes.
Trial A, 1.0 M acid, large chips: 1.8 g lost.
Trial B, 1.0 M acid, small chips: 3.1 g lost.
Trial C, 2.0 M acid, large chips: 3.4 g lost.
Trial D, 2.0 M acid, small chips: 5.9 g lost.
Trial E, 2.0 M acid, small chips, heated to 40 C: 8.6 g lost.`;

const SS_P7 = `Cartography was once a state secret. In sixteenth century Portugal and Spain, charts showing routes to the Indies were classified, and copying one carried the death penalty. The reasoning was straightforward: a route that took a decade and many lives to establish could be given away on a single sheet of paper. What eventually broke the system was not espionage but employment. Navigators moved between crowns for better pay, and they carried what they knew in their heads, where no law could reach it.`;

export const B3 = {
  act: [
    { id: "sc1a", section: "Science", skill: "Data interpretation", passage: SCI_1, q: "As pendulum length increases, the period:", choices: ["decreases", "increases", "stays constant", "varies randomly"], answer: 1, why: "Period rises from 1.00 s at 0.25 m to 2.84 s at 2.00 m throughout." },
    { id: "sc1b", section: "Science", skill: "Data interpretation", passage: SCI_1, q: "What do the results of Experiment 2 show about mass?", choices: ["Heavier masses give longer periods", "Mass has essentially no effect on period", "Mass halves the period", "Mass doubles the period"], answer: 1, why: "Across a twentyfold change in mass the period varies only between 2.00 and 2.01 s." },
    { id: "sc1c", section: "Science", skill: "Interpolation", passage: SCI_1, q: "A 0.75 m pendulum of mass 200 g would most likely have a period closest to:", choices: ["1.10 s", "1.75 s", "2.40 s", "3.00 s"], answer: 1, why: "It must fall between 1.42 s at 0.50 m and 2.01 s at 1.00 m, and 1.75 s is the only option in that range." },
    { id: "sc1d", section: "Science", skill: "Relationships", passage: SCI_1, q: "Quadrupling the length from 0.25 m to 1.00 m changed the period by a factor closest to:", choices: ["1", "2", "4", "8"], answer: 1, why: "1.00 s to 2.01 s is roughly double, which is what a square root relationship predicts for a fourfold change." },
    { id: "sc1e", section: "Science", skill: "Experimental design", passage: SCI_1, q: "Why was mass held constant in Experiment 1?", choices: ["To save time", "So that any change in period could be attributed to length", "To make the pendulum swing faster", "Because mass could not be measured"], answer: 1, why: "Controlling every other variable is what isolates the one being varied." },
    { id: "sc1f", section: "Science", skill: "Conclusions", passage: SCI_1, q: "Taken together, the two experiments best support the conclusion that period depends on:", choices: ["mass only", "length only, among the variables tested", "both equally", "neither"], answer: 1, why: "Length changes the period substantially while mass does not, across the ranges tested." },
    { id: "sc1g", section: "Science", skill: "Prediction", passage: SCI_1, q: "A 2.00 m pendulum of mass 800 g would have a period closest to:", choices: ["1.42 s", "2.01 s", "2.84 s", "4.10 s"], answer: 2, why: "Length sets the period and mass does not matter, so it matches the 2.00 m result of 2.84 s." },
    { id: "sc1h", section: "Science", skill: "Evaluation", passage: SCI_1, q: "Which additional measurement would best test whether the length relationship holds beyond the range studied?", choices: ["A 200 g pendulum at 1.00 m", "A 4.00 m pendulum", "A 300 g pendulum at 0.50 m", "A repeat of the 0.25 m trial"], answer: 1, why: "Extending beyond 2.00 m is the only option that tests outside the range already covered." },

    { id: "sc2a", section: "Science", skill: "Data interpretation", passage: SCI_2, q: "Which soil retained the most water before compaction?", choices: ["Sand", "Loam", "Clay", "All were equal"], answer: 2, why: "Clay drained only 21 mL of 200 mL, so it retained the most." },
    { id: "sc2b", section: "Science", skill: "Calculation", passage: SCI_2, q: "How much water did loam retain before compaction?", choices: ["96 mL", "104 mL", "126 mL", "200 mL"], answer: 1, why: "200 mL applied minus 96 mL drained leaves 104 mL retained. Reading 96 straight off the table is the trap." },
    { id: "sc2c", section: "Science", skill: "Comparing conditions", passage: SCI_2, q: "Compaction affected drainage by:", choices: ["increasing it in every soil", "decreasing it in every soil", "leaving it unchanged", "increasing it only in clay"], answer: 1, why: "Every drained volume falls after compaction: 178 to 171, 96 to 74, 21 to 6." },
    { id: "sc2d", section: "Science", skill: "Data interpretation", passage: SCI_2, q: "Which soil was affected proportionally most by compaction?", choices: ["Sand", "Loam", "Clay", "All equally"], answer: 2, why: "Clay fell from 21 to 6 mL, a drop of about 70 percent, far larger proportionally than sand's 4 percent." },
    { id: "sc2e", section: "Science", skill: "Conclusions", passage: SCI_2, q: "The results best support the conclusion that drainage is fastest in soils with:", choices: ["the smallest particles", "the largest particles", "the most organic matter", "the highest temperature"], answer: 1, why: "Sand has the coarsest particles and drains most, clay the finest and drains least." },
    { id: "sc2f", section: "Science", skill: "Application", passage: SCI_2, q: "A gardener wanting to reduce watering frequency should choose soil most like:", choices: ["sand", "loam", "clay", "any of them"], answer: 2, why: "Clay retains the most water, so it needs watering least often, whatever its other drawbacks." },
    { id: "sc2g", section: "Science", skill: "Experimental design", passage: SCI_2, q: "Using 500 g of each soil and 200 mL of water in every trial was necessary to:", choices: ["speed up drainage", "allow a fair comparison between soil types", "prevent compaction", "reduce evaporation"], answer: 1, why: "Equal quantities are what make the drained volumes comparable across the three soils." },
    { id: "sc2h", section: "Science", skill: "Inference", passage: SCI_2, q: "Compaction most likely reduces drainage by:", choices: ["adding water to the soil", "reducing the space between particles", "raising the temperature", "changing the particle chemistry"], answer: 1, why: "Pressing the sample closes pore space, and water moves through pores." },

    { id: "sc3a", section: "Science", skill: "Conflicting viewpoints", passage: SCI_3, q: "Both scientists agree that:", choices: ["predation by birds played a role", "the dark pigment is physiologically costly", "industry had no effect", "the moths are now extinct"], answer: 0, why: "Scientist 2 opens by granting that predation is real, and merely calls it insufficient." },
    { id: "sc3b", section: "Science", skill: "Conflicting viewpoints", passage: SCI_3, q: "Scientist 2's main objection is that predation alone:", choices: ["is impossible to observe", "cannot account for dark forms in non industrial areas or the timing of the decline", "was disproved by legislation", "applies only to pale moths"], answer: 1, why: "Those two observations are exactly the evidence Scientist 2 raises." },
    { id: "sc3c", section: "Science", skill: "Evidence", passage: SCI_3, q: "Which finding would most strengthen Scientist 1?", choices: ["Dark moths found in a remote forest", "Birds shown to take pale moths far more often on soot darkened bark", "Dark pigment shown to shorten lifespan", "Lichen recovery shown to be slow"], answer: 1, why: "That is the direct predation mechanism Scientist 1 proposes, tested against the bark condition." },
    { id: "sc3d", section: "Science", skill: "Evidence", passage: SCI_3, q: "Which finding would most strengthen Scientist 2?", choices: ["Dark moths declining fastest where lichens recovered first", "Dark moths surviving equally well in clean and sooty regions", "Dark caterpillars shown to grow more slowly than pale ones even without predators", "Birds shown to prefer dark moths"], answer: 2, why: "A cost that appears with no predators present is exactly the additional physiological factor proposed." },
    { id: "sc3e", section: "Science", skill: "Conflicting viewpoints", passage: SCI_3, q: "The timing argument used by Scientist 2 concerns the fact that the decline began:", choices: ["after lichens fully recovered", "before lichens had substantially recovered", "before the legislation passed", "a century after the legislation"], answer: 1, why: "Scientist 2 says the decline began before bark lichens had substantially recovered." },
    { id: "sc3f", section: "Science", skill: "Inference", passage: SCI_3, q: "Scientist 1 would most likely respond to the non industrial dark moths by arguing that:", choices: ["they do not exist", "local predation conditions there may also favour dark forms", "pigment is costly", "the moths migrated from cities"], answer: 1, why: "Scientist 1's framework is predation driven by visibility, so the natural reply extends that mechanism to local conditions." },
    { id: "sc3g", section: "Science", skill: "Conclusions", passage: SCI_3, q: "The disagreement is best characterised as being about:", choices: ["whether natural selection occurs", "whether predation is the sole mechanism or one of several", "whether the moths are a single species", "whether legislation was effective"], answer: 1, why: "Scientist 2 accepts predation and disputes only its sufficiency." },
    { id: "sc3h", section: "Science", skill: "Evaluation", passage: SCI_3, q: "A study finding dark and pale moths equally likely to be eaten in every condition would:", choices: ["support Scientist 1 strongly", "weaken Scientist 1 severely", "have no bearing on either", "prove Scientist 2 entirely"], answer: 1, why: "Scientist 1's whole explanation depends on differential predation, so removing it removes the mechanism." },

    { id: "sc4a", section: "Science", skill: "Data interpretation", passage: SCI_4, q: "Comparing Trials A and B shows the effect of:", choices: ["acid concentration", "chip size", "temperature", "reaction time"], answer: 1, why: "A and B share 1.0 M acid and differ only in chip size, so that is the variable isolated." },
    { id: "sc4b", section: "Science", skill: "Data interpretation", passage: SCI_4, q: "Comparing Trials A and C shows the effect of:", choices: ["acid concentration", "chip size", "temperature", "mass of marble"], answer: 0, why: "Both use large chips, and only the concentration changes from 1.0 to 2.0 M." },
    { id: "sc4c", section: "Science", skill: "Conclusions", passage: SCI_4, q: "Smaller chips increase the rate because they:", choices: ["are chemically different", "provide greater surface area for the acid to act on", "are warmer", "dissolve the acid"], answer: 1, why: "Breaking a solid into smaller pieces exposes more surface, which is where the reaction happens." },
    { id: "sc4d", section: "Science", skill: "Comparing trials", passage: SCI_4, q: "Which trial produced the greatest mass loss?", choices: ["Trial B", "Trial C", "Trial D", "Trial E"], answer: 3, why: "Trial E lost 8.6 g, the highest, combining strong acid, small chips and heat." },
    { id: "sc4e", section: "Science", skill: "Isolating variables", passage: SCI_4, q: "Which pair isolates the effect of temperature?", choices: ["A and B", "C and D", "D and E", "A and E"], answer: 2, why: "D and E share concentration and chip size, differing only in heating." },
    { id: "sc4f", section: "Science", skill: "Prediction", passage: SCI_4, q: "A trial using 1.0 M acid, small chips, heated to 40 C would most likely lose:", choices: ["less than 1.8 g", "between 3.1 and 8.6 g", "more than 8.6 g", "exactly 5.9 g"], answer: 1, why: "It is Trial B plus heat, so it should exceed B's 3.1 g but stay below E, which also has the stronger acid." },
    { id: "sc4g", section: "Science", skill: "Conclusions", passage: SCI_4, q: "The results support the conclusion that reaction rate increases with:", choices: ["only concentration", "only surface area", "concentration, surface area and temperature", "none of these"], answer: 2, why: "Each of the three variables raises the mass lost when changed on its own." },
    { id: "sc4h", section: "Science", skill: "Evaluation", passage: SCI_4, q: "To be confident the trends are real rather than experimental noise, the researchers should first:", choices: ["use a different acid", "repeat each trial several times", "extend the time to an hour", "measure volume instead of mass"], answer: 1, why: "Repetition is what distinguishes a real difference from random variation between single runs." },
  ],

  ssat: [
    { id: "ssp7a", section: "Reading", skill: "Main idea", passage: SS_P7, q: "The passage mainly explains:", choices: ["how maps are drawn", "why sea charts were kept secret and how the secrecy failed", "the geography of the Indies", "the history of the death penalty"], answer: 1, why: "The passage gives the reason for secrecy and then what undid it." },
    { id: "ssp7b", section: "Reading", skill: "Detail", passage: SS_P7, q: "What was the penalty for copying a classified chart?", choices: ["A fine", "Imprisonment", "Death", "Exile"], answer: 2, why: "Copying one carried the death penalty." },
    { id: "ssp7c", section: "Reading", skill: "Detail", passage: SS_P7, q: "According to the passage, what ended the system of secrecy?", choices: ["Espionage", "Navigators changing employers", "New printing technology", "A change in the law"], answer: 1, why: "The passage says it was not espionage but employment, with navigators moving between crowns." },
    { id: "ssp7d", section: "Reading", skill: "Inference", passage: SS_P7, q: "The phrase 'where no law could reach it' suggests that knowledge held in memory was:", choices: ["easily forgotten", "impossible to regulate", "written down secretly", "worth less than a chart"], answer: 1, why: "A law can seize a document but cannot confiscate what someone remembers." },
    { id: "ssp7e", section: "Reading", skill: "Detail", passage: SS_P7, q: "Why were the routes considered so valuable?", choices: ["They were beautiful", "They cost a decade and many lives to establish", "They were required by law", "They were easy to copy"], answer: 1, why: "The passage gives that cost as the straightforward reasoning behind classification." },
    { id: "ssp7f", section: "Reading", skill: "Word meaning", passage: SS_P7, q: "As used in the passage, 'classified' most nearly means:", choices: ["sorted into groups", "kept officially secret", "published widely", "drawn to scale"], answer: 1, why: "The context is state secrecy with a death penalty for copying, not categorisation." },
  ],
};

// IELTS Academic Reading: three long passages of 13 to 14 questions each,
// which is the real shape of the paper. The passage stays on screen while you
// work through its questions.

const P1 = `THE RETURN OF THE URBAN RIVER

For most of the twentieth century, the rivers running through European and North American cities were treated as a problem to be hidden. They flooded, they smelled, and they occupied land that planners wanted for roads. The solution adopted almost everywhere was culverting: the river was straightened, lined with concrete and roofed over, and a street or a car park was built on top. By 1970 several major cities had buried more than half their watercourses. In Los Angeles the process was so thorough that the river became a byword for absence, a concrete channel dry for most of the year and known to most residents only as a film location.

The engineering logic was sound as far as it went. A straight concrete channel moves water faster than a meandering earth one, and moving water away quickly does reduce local flooding. What the calculation omitted was where the water went next. Accelerated flow does not disappear; it arrives downstream sooner and in greater volume, concentrating the flood risk on whichever community lies at the end of the pipe. Through the 1980s a series of expensive downstream failures made this trade off difficult to ignore.

Daylighting, the practice of removing the covering and restoring a buried river to the surface, began as a small scale environmental gesture and became mainstream for reasons that were largely economic. The Cheonggyecheon stream in Seoul is the case most often cited. A four kilometre elevated motorway carrying 168,000 vehicles a day was demolished in 2003 and the stream beneath it uncovered, at a cost of some 380 million dollars. Traffic modelling had predicted severe congestion. What happened instead is now a standard illustration of a phenomenon traffic engineers call disappearing traffic: journeys that had been made by car were not displaced onto other roads but were simply not made, or were made by other means, and measured congestion in the surrounding district fell.

The environmental results were substantial and, unlike the traffic effects, largely as predicted. Air temperature along the restored corridor fell by an average of 3.6 degrees Celsius relative to parallel streets, an effect attributed to evaporation and to the removal of the heat absorbing road deck. Small particulate concentrations dropped by roughly a third. Fish species recorded in the stream rose from four to more than sixty within six years, and bird species from six to thirty six.

Critics of the project make two arguments that are worth separating. The first is that Cheonggyecheon is not really a restored river at all. Its original flow is insufficient to sustain the channel, so some 120,000 tonnes of water are pumped in daily from the Han River and from groundwater collected in the subway system. In hydrological terms it is closer to a very long water feature than to a functioning watercourse. Defenders reply that this is true and largely beside the point, since the project was never presented as ecological restoration in the strict sense.

The second criticism is harder to dismiss. Property values along the corridor rose sharply, and the small businesses that had occupied the area beneath the motorway, many of them decades old, were relocated to a site several kilometres away where trade was substantially worse. This pattern, in which environmental improvement is followed by the displacement of the people who lived with the previous conditions, has since been documented in enough restoration projects to acquire a name, and it now features in the planning stage of most such schemes rather than in the recriminations afterwards.

What has changed most is the default assumption. A city considering what to do with a buried watercourse in 1970 asked what it would cost to daylight it. The same city today is more likely to ask what it costs to keep it buried, and the answer increasingly includes the maintenance liability of ageing concrete culverts, many of which were built with a design life that has already expired.`;

const P2 = `THE SLEEP OF ANIMALS

Every animal with a nervous system appears to sleep, or to do something sufficiently like sleep that biologists are willing to use the word. This near universality is itself a puzzle. Sleep is dangerous: an unconscious animal cannot feed, cannot mate, and cannot detect a predator. Any trait that costly which nonetheless persists across every branch of the animal kingdom must be doing something the organism cannot do without.

Defining sleep in creatures very unlike ourselves has required behavioural rather than neurological criteria, since most animals do not have the brain structures that produce the human electroencephalogram. Four criteria are conventionally applied. The animal must adopt a characteristic posture or location; it must show reduced responsiveness to stimuli; the state must be rapidly reversible, which distinguishes it from hibernation or coma; and it must be subject to homeostatic regulation, meaning that an animal deprived of it will subsequently take more of it than usual. That last criterion does most of the work, because it distinguishes genuine sleep from mere quiescence.

By these standards the jellyfish Cassiopea sleeps, a finding published in 2017 that surprised many researchers because jellyfish have no brain at all, only a diffuse nerve net. The animals pulse rhythmically, and at night the pulsing slows by about a third. They respond more slowly to being moved. And when researchers disturbed them through the night with pulses of water, the animals pulsed less the following day, exactly as the homeostatic criterion requires. Whatever sleep is for, it evidently does not require a centralised brain.

The most striking adaptations are found in animals for which ordinary sleep is impossible. Fur seals in the water sleep with one cerebral hemisphere at a time, keeping the corresponding eye open and one flipper paddling; on land the same animals sleep with both hemispheres together, in the ordinary way. Great frigatebirds, which remain airborne for weeks, sleep in flight, but only for around 42 minutes a day in total, compared with more than twelve hours when they are on land. Since the birds are demonstrably capable of functioning on 42 minutes for weeks at a time, the obvious question is what the other twelve hours are for.

The dominant contemporary answer concerns waste. The brain has no lymphatic vessels, and for a long time it was unclear how it disposed of the metabolic debris that accumulates during activity. Work published in 2013 described a system, since named the glymphatic system, in which cerebrospinal fluid is driven through the brain tissue along channels that widen during sleep. In sleeping mice the space between brain cells was found to increase by around sixty per cent, and clearance of injected proteins, including the amyloid beta associated with Alzheimer's disease, was roughly twice as fast as in waking animals.

This account is attractive, not least because it offers a mechanism connecting chronic sleep loss to neurodegenerative disease, and it has been widely reported as though it were settled. Several groups have since raised difficulties. One 2024 study using different measurement techniques reported the opposite result, finding clearance to be faster during waking, and the discrepancy has not been resolved. The disagreement matters beyond the laboratory, because a great deal of public health messaging now rests on a mechanism that remains genuinely contested.

It is worth noting that sleep is unlikely to have a single function. A process conserved across animals as different as a jellyfish and a frigatebird, and modified so extensively in each lineage, is more plausibly a platform on which many different maintenance operations have been assembled than a solution to one problem.`;

const P3 = `WRITING SYSTEMS AND THE PROBLEM OF DECIPHERMENT

Of the many writing systems developed in antiquity, a substantial number have never been read. The failures are instructive, because they reveal what decipherment actually depends on, and it is rarely the cleverness of the decipherer.

Three conditions make decipherment possible. The first is quantity: a system attested by only a few dozen short inscriptions offers too little internal structure to work with, however brilliant the analyst. The second is a known language: if the language behind the script is one already understood, the problem reduces to matching signs to sounds, which is difficult but tractable. The third, most valuable and rarest, is a bilingual text, in which the same content appears in the unknown script alongside a known one.

The decipherment of Egyptian hieroglyphs had all three. The Rosetta Stone provided the bilingual, Coptic provided a descendant of the underlying language, and the corpus was enormous. Even so it took two decades, and the decisive step was conceptual rather than evidential. Scholars had assumed hieroglyphs were purely symbolic, each sign standing for an idea. Champollion's insight was that the system was mixed: some signs represent sounds, some represent ideas, and some indicate which category a neighbouring sign belongs to. No amount of additional material would have helped without abandoning the original assumption.

Linear B, the script of Bronze Age Crete and mainland Greece, had no bilingual at all. Michael Ventris, an architect by profession, succeeded in 1952 by a different route. Working from the observation that certain sign groups appeared with small variations in endings, he built a grid relating signs that shared a consonant to those that shared a vowel, without knowing the value of either. The grid was a structural claim about the language, not a reading of it. When he tentatively assigned values consistent with the grid, recognisable Greek words emerged, which was a genuine surprise: the prevailing view had been that the language of Bronze Age Crete could not be Greek. The decipherment was accepted rapidly because it made testable predictions on tablets that had not yet been published.

Linear A, the earlier Cretan script from which Linear B was adapted, remains unread, and the reasons are precisely instructive. The corpus is small, perhaps 1,500 documents, most of them brief administrative lists. Because Linear B borrowed many of its signs, the phonetic values of Linear A signs can be guessed with fair confidence. The words can therefore be pronounced. What nobody can do is understand them, because the underlying language appears to be unrelated to anything known. Decipherment in the sense of sound values has largely succeeded; decipherment in the sense of meaning has not moved in seventy years.

The Indus Valley script presents the hardest case and has attracted the largest number of claimed solutions, none accepted. The corpus consists of some 4,000 inscriptions averaging fewer than five signs each, with the longest running to seventeen. There is no bilingual, no securely identified descendant language, and vigorous disagreement about whether the sequences encode language at all rather than functioning as heraldic or accounting marks. Statistical work on sign order has been offered on both sides of that question and has convinced neither.

The pattern across these cases is consistent. Decipherment succeeds when the material is abundant enough to reveal structure and when at least one anchor exists outside the script itself. Where those conditions are absent, ingenuity does not compensate, and the honest position is that some scripts will not be read unless the ground yields more of them.`;

const mk = (id, passage, skill, q, choices, answer, why) => ({ id, section: "Reading", skill, passage, q, choices, answer, why });

export const IELTS_READING = [
  // Passage 1, questions 1 to 13
  mk("ir1", P1, "True, False, Not Given", "Statement: By 1970 several major cities had buried over half of their watercourses.", ["True", "False", "Not Given"], 0, "The second sentence of paragraph one states exactly this."),
  mk("ir2", P1, "True, False, Not Given", "Statement: Culverting was introduced mainly to create space for housing.", ["True", "False", "Not Given"], 1, "The passage says planners wanted the land for roads, not housing, so the statement is contradicted."),
  mk("ir3", P1, "True, False, Not Given", "Statement: The Los Angeles river channel carries water all year round.", ["True", "False", "Not Given"], 1, "It is described as dry for most of the year, which contradicts the statement."),
  mk("ir4", P1, "Detail", "According to the passage, what did the original engineering calculation fail to consider?", ["The cost of concrete", "Where the accelerated water went next", "The effect on fish", "The opinion of residents"], 1, "Paragraph two says the omission was where the water went, arriving downstream sooner and in greater volume."),
  mk("ir5", P1, "Sentence completion", "Complete with NO MORE THAN TWO WORDS: Accelerated flow concentrates flood risk on the community lying at the end of the ______.", ["pipe", "river", "street", "channel"], 0, "The text says whichever community lies at the end of the pipe, and the limit is two words."),
  mk("ir6", P1, "Detail", "What was demolished to uncover the Cheonggyecheon stream?", ["A railway bridge", "An elevated motorway", "A row of factories", "A car park"], 1, "A four kilometre elevated motorway carrying 168,000 vehicles a day."),
  mk("ir7", P1, "Detail", "Traffic modelling before the Seoul project predicted:", ["no change", "severe congestion", "an increase in cycling", "lower property values"], 1, "The passage says modelling predicted severe congestion, and that this is not what happened."),
  mk("ir8", P1, "Vocabulary in context", "In the passage, 'disappearing traffic' refers to journeys that were:", ["diverted to other roads", "not made at all, or made by other means", "made at night instead", "made more quickly"], 1, "The passage defines the term directly in that sentence."),
  mk("ir9", P1, "Detail", "By how much did air temperature along the restored corridor fall?", ["1.2 degrees", "3.6 degrees", "6.0 degrees", "36 degrees"], 1, "An average of 3.6 degrees Celsius relative to parallel streets."),
  mk("ir10", P1, "Summary completion", "Complete the summary: Fish species rose from four to more than ______ within six years.", ["sixty", "thirty six", "six", "one hundred"], 0, "Fish rose to more than sixty; thirty six is the figure for bird species."),
  mk("ir11", P1, "Detail", "Why is Cheonggyecheon described by critics as not truly a restored river?", ["It flows in the wrong direction", "Its water is pumped in from elsewhere", "It is too short", "It freezes in winter"], 1, "Some 120,000 tonnes of water are pumped in daily from the Han River and the subway groundwater."),
  mk("ir12", P1, "Yes, No, Not Given", "Statement: The writer regards the criticism about displaced businesses as more serious than the criticism about pumped water.", ["Yes", "No", "Not Given"], 0, "The writer calls the second criticism harder to dismiss, and says the first is largely beside the point."),
  mk("ir13", P1, "Matching headings", "Which heading best fits the final paragraph?", ["The engineering of concrete channels", "A reversal in what cities take for granted", "Wildlife returns to Seoul", "The cost of the Cheonggyecheon project"], 1, "The paragraph is about the default question changing from the cost of daylighting to the cost of staying buried."),

  // Passage 2, questions 14 to 26
  mk("ir14", P2, "Detail", "Why does the passage describe sleep as a puzzle?", ["It is rare among animals", "It is costly yet universal", "It cannot be measured", "It varies by season"], 1, "An unconscious animal cannot feed, mate or watch for predators, yet every nervous system does it."),
  mk("ir15", P2, "Detail", "Why are behavioural rather than neurological criteria used to define sleep across species?", ["Behaviour is easier to film", "Most animals lack the brain structures that produce a human EEG", "Neurological equipment is expensive", "Behaviour is more accurate"], 1, "The passage gives that reason directly at the start of paragraph two."),
  mk("ir16", P2, "Detail", "Which criterion does the passage say does most of the work in defining sleep?", ["A characteristic posture", "Reduced responsiveness", "Rapid reversibility", "Homeostatic regulation"], 3, "The passage says that last criterion does most of the work, because it separates sleep from mere quiescence."),
  mk("ir17", P2, "True, False, Not Given", "Statement: Cassiopea jellyfish possess a centralised brain.", ["True", "False", "Not Given"], 1, "They have no brain at all, only a diffuse nerve net, which contradicts the statement."),
  mk("ir18", P2, "Detail", "What happened when researchers disturbed jellyfish through the night?", ["They pulsed faster the next day", "They pulsed less the following day", "They stopped pulsing permanently", "They changed colour"], 1, "They pulsed less the following day, which satisfies the homeostatic criterion."),
  mk("ir19", P2, "Detail", "How do fur seals sleep while in the water?", ["Both hemispheres together", "One hemisphere at a time", "They do not sleep in water", "Floating motionless"], 1, "One cerebral hemisphere at a time, with one eye open and a flipper paddling."),
  mk("ir20", P2, "Sentence completion", "Complete with A NUMBER: Great frigatebirds sleep for around ______ minutes a day in flight.", ["42", "12", "60", "24"], 0, "Around 42 minutes a day in total while airborne."),
  mk("ir21", P2, "Inference", "The writer raises the question of what the other twelve hours are for in order to suggest that:", ["frigatebirds are lazy on land", "much of ordinary sleep may serve purposes beyond bare necessity", "the measurements were wrong", "sleep is unnecessary"], 1, "If weeks on 42 minutes is survivable, the far longer land sleep needs a separate explanation."),
  mk("ir22", P2, "Detail", "What did the 2013 work describe?", ["A new species of mouse", "A system in which cerebrospinal fluid clears waste through channels that widen during sleep", "A drug for Alzheimer's disease", "A method of measuring sleep in jellyfish"], 1, "That is the glymphatic system as the passage describes it."),
  mk("ir23", P2, "Detail", "In sleeping mice, the space between brain cells increased by approximately:", ["six per cent", "sixteen per cent", "sixty per cent", "six hundred per cent"], 2, "Around sixty per cent, with clearance roughly twice as fast as in waking animals."),
  mk("ir24", P2, "Yes, No, Not Given", "Statement: The writer accepts the waste clearance account of sleep as settled.", ["Yes", "No", "Not Given"], 1, "The writer notes it has been reported as settled but says the discrepancy is unresolved and the mechanism genuinely contested."),
  mk("ir25", P2, "Detail", "What did a 2024 study using different techniques report?", ["The same result as the 2013 work", "That clearance is faster during waking", "That mice do not sleep", "That amyloid beta is harmless"], 1, "It reported the opposite result, finding clearance faster during waking."),
  mk("ir26", P2, "Yes, No, Not Given", "Statement: The writer thinks sleep probably serves more than one function.", ["Yes", "No", "Not Given"], 0, "The final paragraph argues it is more plausibly a platform for many maintenance operations than one solution."),

  // Passage 3, questions 27 to 40
  mk("ir27", P3, "Detail", "According to the passage, what does successful decipherment rarely depend on?", ["Quantity of material", "The cleverness of the decipherer", "A known language", "A bilingual text"], 1, "The opening paragraph states that it is rarely the cleverness of the decipherer."),
  mk("ir28", P3, "Detail", "Which of the three conditions does the passage call the rarest?", ["A large corpus", "A known underlying language", "A bilingual text", "A trained analyst"], 2, "The third, most valuable and rarest, is a bilingual text."),
  mk("ir29", P3, "True, False, Not Given", "Statement: The decipherment of Egyptian hieroglyphs was completed within five years.", ["True", "False", "Not Given"], 1, "The passage says it took two decades even with all three conditions present."),
  mk("ir30", P3, "Detail", "What was Champollion's decisive insight?", ["That the Rosetta Stone was genuine", "That the system was mixed, with signs for sounds, ideas and categories", "That Coptic was unrelated to Egyptian", "That hieroglyphs were purely symbolic"], 1, "Abandoning the purely symbolic assumption for a mixed system was the conceptual step."),
  mk("ir31", P3, "Inference", "The passage suggests that in the Egyptian case, additional material alone would have been:", ["sufficient", "insufficient without abandoning a false assumption", "impossible to obtain", "misleading"], 1, "The text says no amount of additional material would have helped without abandoning the original assumption."),
  mk("ir32", P3, "Detail", "What was Michael Ventris's profession?", ["Linguist", "Architect", "Archaeologist", "Historian"], 1, "The passage identifies him as an architect by profession."),
  mk("ir33", P3, "Detail", "Ventris's grid was built on the observation that:", ["certain sign groups varied in their endings", "the tablets were written in Greek", "a bilingual text existed", "the signs resembled Egyptian ones"], 0, "He worked from sign groups appearing with small variations in endings."),
  mk("ir34", P3, "Detail", "What made the Linear B decipherment surprising?", ["The tablets were forgeries", "The language turned out to be Greek", "The script had no vowels", "The corpus was tiny"], 1, "The prevailing view had been that the language of Bronze Age Crete could not be Greek."),
  mk("ir35", P3, "Detail", "Why was the Linear B decipherment accepted quickly?", ["Ventris was famous", "It made testable predictions on unpublished tablets", "It was supported by a bilingual", "No alternative existed"], 1, "Predictions confirmed on tablets not yet published is what settled it."),
  mk("ir36", P3, "Detail", "Why can Linear A words be pronounced but not understood?", ["The signs are illegible", "The sound values are inferable from Linear B, but the language is unrelated to anything known", "The tablets are damaged", "Nobody has attempted it"], 1, "The passage separates the two senses of decipherment for exactly this case."),
  mk("ir37", P3, "Detail", "Approximately how many Indus Valley inscriptions exist?", ["1,500", "4,000", "17", "40,000"], 1, "Some 4,000 inscriptions, averaging fewer than five signs. 1,500 is the Linear A figure."),
  mk("ir38", P3, "Detail", "What is disputed about the Indus Valley sequences?", ["Their age", "Whether they encode language at all", "Where they were found", "Who excavated them"], 1, "There is vigorous disagreement about whether they encode language or function as heraldic or accounting marks."),
  mk("ir39", P3, "Yes, No, Not Given", "Statement: The writer believes ingenuity can compensate for a lack of material.", ["Yes", "No", "Not Given"], 1, "The final paragraph says plainly that ingenuity does not compensate where the conditions are absent."),
  mk("ir40", P3, "Matching headings", "Which heading best fits the passage as a whole?", ["The life of Michael Ventris", "What decipherment actually requires", "The history of ancient Crete", "How to read hieroglyphs"], 1, "Each case is used to illustrate the three conditions set out at the start."),
];

// Fold the passage sets into their tests.
TESTS.forEach((t) => {
  if (EXTRA[t.id]) t.questions = [...t.questions, ...EXTRA[t.id]];
  if (B1[t.id]) t.questions = [...t.questions, ...B1[t.id]];
  if (B2[t.id]) t.questions = [...t.questions, ...B2[t.id]];
  if (B3[t.id]) t.questions = [...t.questions, ...B3[t.id]];
  // IELTS reading is three long passages, so it replaces rather than adds.
  if (t.id === "ielts") {
    t.questions = [...t.questions.filter((q) => q.section !== "Reading"), ...IELTS_READING];
  }
});

export const TEST_QUESTIONS = TESTS.flatMap((t) =>
  t.questions.map((q) => ({ ...q, test: t.name, testId: t.id })),
);

// Which sections can actually be sat here, at what length, and where the
// questions come from. `build` names a generator in generate.js; `pool` means
// the section draws from this test's authored items instead, which caps it
// below the real paper length and is flagged as a short form.
export const SECTIONS = {
  sat: [
    { id: "rw", name: "Reading and Writing", real: 54, minutes: 64, build: "satRW",
      note: "Two modules of 27 at 32 minutes each." },
    { id: "math", name: "Math", real: 44, minutes: 70, build: "satMath",
      note: "Two modules of 22 at 35 minutes each." },
  ],
  act: [
    { id: "english", name: "English", real: 50, minutes: 35, build: "actEnglish" },
    { id: "math", name: "Mathematics", real: 45, minutes: 50, build: "actMath" },
    { id: "reading", name: "Reading", real: 36, minutes: 40, pool: "Reading" },
    { id: "science", name: "Science", real: 40, minutes: 40, pool: "Science",
      note: "Optional since 2025 and no longer part of the composite." },
    { id: "writing", name: "Writing", real: 1, minutes: 40, kind: "writing",
      note: "Optional essay, scored separately from the composite." },
  ],
  ssat: [
    { id: "quant", name: "Quantitative", real: 50, minutes: 60, build: "ssatQuant",
      note: "Two sections of 25 at 30 minutes each." },
    { id: "verbal", name: "Verbal", real: 60, minutes: 30, build: "ssatVerbal",
      note: "30 synonyms and 30 analogies." },
    { id: "reading", name: "Reading", real: 40, minutes: 40, pool: "Reading" },
    { id: "writing", name: "Writing sample", real: 1, minutes: 25, kind: "writing",
      note: "Unscored, but sent to every school you apply to." },
  ],
  ielts: [
    { id: "listening", name: "Listening", real: 40, minutes: 30, pool: "Listening", audio: true, plays: 1,
      note: "Each recording is played once only, as in the real test." },
    { id: "reading", name: "Reading", real: 40, minutes: 60, pool: "Reading" },
    { id: "writing", name: "Writing", real: 2, minutes: 60, kind: "writing" },
    { id: "speaking", name: "Speaking", real: 3, minutes: 14, kind: "speaking" },
  ],
  toefl: [
    { id: "reading", name: "Reading", real: 20, minutes: 35, pool: "Reading" },
    { id: "listening", name: "Listening", real: 28, minutes: 36, pool: "Listening", audio: true, plays: 2,
      note: "You may replay a lecture here, which the real test does not allow, because note taking is the skill it wants." },
    { id: "speaking", name: "Speaking", real: 4, minutes: 16, kind: "speaking" },
    { id: "writing", name: "Writing", real: 2, minutes: 29, kind: "writing" },
  ],
};
