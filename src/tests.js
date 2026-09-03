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

const IELTS_READING = `Cities have experimented with congestion charging since Singapore introduced it in 1975. London followed in 2003, charging vehicles entering the centre on weekdays. Traffic within the zone fell by roughly a fifth in the first year, and bus journey times became markedly more reliable.

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
    { id: "ier1", section: "Reading", skill: "True, False, Not Given", passage: IELTS_READING, q: "Statement: London was the first city in the world to introduce congestion charging.", choices: ["True", "False", "Not Given"], answer: 1, why: "Singapore introduced it in 1975 and London followed in 2003, so the statement is contradicted by the text." },
    { id: "ier2", section: "Reading", skill: "True, False, Not Given", passage: IELTS_READING, q: "Statement: Retail takings inside the London zone fell sharply after charging began.", choices: ["True", "False", "Not Given"], answer: 1, why: "The text says studies found no such effect and that takings tracked the citywide average. Critics predicted it; it did not happen." },
    { id: "ier3", section: "Reading", skill: "True, False, Not Given", passage: IELTS_READING, q: "Statement: The London charge applies at weekends as well as on weekdays.", choices: ["True", "False", "Not Given"], answer: 2, why: "The passage says vehicles entering on weekdays and says nothing at all about weekends, so the text is silent." },
    { id: "ier4", section: "Reading", skill: "Sentence completion", passage: IELTS_READING, q: "Complete with NO MORE THAN THREE WORDS: In its first year, traffic in the London zone fell by about ______.", choices: ["a fifth", "a half", "two thirds", "a tenth"], answer: 0, why: "The text says roughly a fifth. Answers over the stated word limit score zero even when the meaning is right." },
    { id: "ier5", section: "Reading", skill: "Detail", passage: IELTS_READING, q: "What changed about traffic inside the London zone?", choices: ["Total vehicle numbers rose", "Private cars fell as a share while taxis, buses and deliveries rose", "Only buses were permitted", "Delivery vehicles were banned"], answer: 1, why: "The passage describes a change in composition, with private cars declining sharply and other categories taking a larger share." },
    { id: "ier6", section: "Reading", skill: "Yes, No, Not Given", passage: IELTS_READING, q: "Statement: The writer accepts that experience of the Stockholm scheme changed public opinion more than campaigning did.", choices: ["Yes", "No", "Not Given"], answer: 0, why: "The writer reports researchers arguing exactly that and does not distance themselves from it. Yes, No, Not Given is used for views rather than facts." },
    { id: "ier7", section: "Reading", skill: "Detail", passage: IELTS_READING, q: "What was unusual about the Stockholm scheme?", choices: ["It was free for residents", "It was voted on after people had already lived with it", "It applied only at weekends", "It was abandoned after seven months"], answer: 1, why: "The referendum came after a seven month trial, which the passage explicitly calls unusual." },
    { id: "ier8", section: "Reading", skill: "Matching headings", passage: IELTS_READING, q: "Which heading best fits the second paragraph?", choices: ["The origins of congestion charging", "A predicted harm that did not materialise", "How the charge is collected", "Objections from delivery firms"], answer: 1, why: "The paragraph is built around critics predicting retail damage and studies finding none. A heading must cover the paragraph, not one detail in it." },

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

// Fold the passage sets into their tests.
TESTS.forEach((t) => {
  if (EXTRA[t.id]) t.questions = [...t.questions, ...EXTRA[t.id]];
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
    { id: "listening", name: "Listening", real: 40, minutes: 30, soon: true },
    { id: "reading", name: "Reading", real: 40, minutes: 60, pool: "Reading" },
    { id: "writing", name: "Writing", real: 2, minutes: 60, kind: "writing" },
    { id: "speaking", name: "Speaking", real: 3, minutes: 14, kind: "speaking" },
  ],
  toefl: [
    { id: "reading", name: "Reading", real: 20, minutes: 35, pool: "Reading" },
    { id: "listening", name: "Listening", real: 28, minutes: 36, soon: true },
    { id: "speaking", name: "Speaking", real: 4, minutes: 16, kind: "speaking" },
    { id: "writing", name: "Writing", real: 2, minutes: 29, kind: "writing" },
  ],
};
