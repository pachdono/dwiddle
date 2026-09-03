// Writing and speaking tasks.
//
// These cannot be marked by matching an answer key, so each task gives you the
// real prompt on the real clock, then scores you against the test's own public
// assessment criteria, which you apply to your own answer. Self assessment is
// how these are practised without an examiner, and the app says so plainly
// rather than pretending a machine graded it.

export const RUBRICS = {
  ielts: {
    name: "IELTS band descriptors",
    scale: [4, 5, 5.5, 6, 6.5, 7, 7.5, 8, 9],
    unit: "band",
    criteria: [
      { n: "Task response", hint: "Did you answer every part of the question, with a clear position and developed ideas?" },
      { n: "Coherence and cohesion", hint: "Is it organised into paragraphs with logical progression and linking that is not mechanical?" },
      { n: "Lexical resource", hint: "Is the vocabulary varied and precise, with collocation and word form under control?" },
      { n: "Grammatical range and accuracy", hint: "Is there a mix of sentence forms, and are most sentences error free?" },
    ],
    // The four criteria are equally weighted and the mean is rounded to the nearest half band.
    combine: (scores) => Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 2) / 2,
    format: (v) => v.toFixed(1),
  },

  ieltsSpeaking: {
    name: "IELTS speaking band descriptors",
    scale: [4, 5, 5.5, 6, 6.5, 7, 7.5, 8, 9],
    unit: "band",
    criteria: [
      { n: "Fluency and coherence", hint: "Could you keep going without long pauses or constant self correction?" },
      { n: "Lexical resource", hint: "Could you paraphrase when the exact word would not come?" },
      { n: "Grammatical range and accuracy", hint: "Did you use complex structures, and were they mostly accurate?" },
      { n: "Pronunciation", hint: "Were you understandable throughout, with useful stress and intonation?" },
    ],
    combine: (scores) => Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 2) / 2,
    format: (v) => v.toFixed(1),
  },

  toeflWriting: {
    name: "TOEFL writing rubric",
    scale: [1, 2, 3, 4, 5],
    unit: "out of 5",
    criteria: [
      { n: "Development", hint: "Are the ideas explained and supported, not just listed?" },
      { n: "Organisation", hint: "Does the response hold together and progress?" },
      { n: "Language use", hint: "Is the grammar and vocabulary varied and accurate enough not to obscure meaning?" },
    ],
    combine: (scores) => Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    format: (v) => `${v} (about ${Math.round((v / 5) * 30)} of 30 scaled)`,
  },

  toeflSpeaking: {
    name: "TOEFL speaking rubric",
    scale: [1, 2, 3, 4],
    unit: "out of 4",
    criteria: [
      { n: "Delivery", hint: "Was it clear and paced, without long hesitation?" },
      { n: "Language use", hint: "Was the grammar and vocabulary sufficient to express the idea?" },
      { n: "Topic development", hint: "Did you answer fully, with reasons or detail, and use the whole time?" },
    ],
    combine: (scores) => Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    format: (v) => `${v} (about ${Math.round((v / 4) * 30)} of 30 scaled)`,
  },

  actEssay: {
    name: "ACT writing domains",
    scale: [1, 2, 3, 4, 5, 6],
    unit: "per domain",
    criteria: [
      { n: "Ideas and analysis", hint: "Do you engage with multiple perspectives and take a clear position?" },
      { n: "Development and support", hint: "Is the reasoning developed with relevant examples?" },
      { n: "Organisation", hint: "Is there a controlling idea and a logical sequence?" },
      { n: "Language use", hint: "Is the style consistent and the mechanics sound?" },
    ],
    // Two raters score each domain 1 to 6 and the four domain scores are averaged to 2 to 12.
    combine: (scores) => Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 2),
    format: (v) => `${v} of 12`,
  },

  ssatWriting: {
    name: "SSAT writing sample",
    scale: [1, 2, 3, 4, 5],
    unit: "guide only",
    criteria: [
      { n: "Focus", hint: "Does it stay on the prompt from first line to last?" },
      { n: "Development", hint: "Are the ideas taken somewhere, with specifics rather than generalities?" },
      { n: "Organisation", hint: "Is there a beginning, a middle and an end that follow one another?" },
      { n: "Mechanics", hint: "Is the spelling, punctuation and sentence control clean?" },
    ],
    combine: (scores) => Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    format: (v) => `${v} of 5, for your own guidance`,
  },
};

export const TASKS = {
  ielts: {
    writing: {
      rubric: "ielts",
      tasks: [
        {
          id: "iw1a", name: "Task 1", minutes: 20, minWords: 150,
          prompt: "The graph below shows the percentage of households with a fixed broadband connection in one European country between 2005 and 2020.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.",
          chart: {
            kind: "line",
            title: "Households with fixed broadband, 2005 to 2020",
            unit: "% of households",
            x: ["2005", "2008", "2011", "2014", "2017", "2020"],
            series: [
              { name: "All households", values: [14, 31, 47, 61, 71, 79] },
              { name: "Rural households", values: [4, 12, 22, 36, 49, 61] },
            ],
          },
          tip: "Task 1 is a description, not an argument. No opinion, and no causes you were not given. Open with an overview sentence covering the overall movement, then two body paragraphs of detail with figures. The gap between the two lines is the comparison the question is asking for.",
        },
        {
          id: "iw1b", name: "Task 1, bar chart", minutes: 20, minWords: 150,
          prompt: "The chart below shows how adults in one city travelled to work in 2010 and in 2022.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.",
          chart: {
            kind: "bar",
            title: "Main mode of travel to work, 2010 and 2022",
            unit: "% of working adults",
            x: ["Car", "Bus", "Rail", "Cycle", "Walk", "Work from home"],
            series: [
              { name: "2010", values: [58, 14, 12, 5, 9, 2] },
              { name: "2022", values: [37, 11, 15, 12, 10, 15] },
            ],
          },
          tip: "With two periods, the marks are in the changes, not in reading out twelve numbers. Group what fell, group what rose, and name the largest movement in your overview. Working from home going from 2 to 15 percent is the headline here.",
        },
        {
          id: "iw2", name: "Task 2", minutes: 40, minWords: 250,
          prompt: "Some people believe that universities should only admit students with the highest academic results. Others argue that admission should also consider a candidate's background and circumstances.\n\nDiscuss both these views and give your own opinion.\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.",
          tip: "Discuss both views AND give your own means three things to do. Answering only two of them caps Task Response at band 5 no matter how good the English is. Task 2 is worth double Task 1.",
        },
      ],
    },
    speaking: {
      rubric: "ieltsSpeaking",
      tasks: [
        {
          id: "is1", name: "Part 1", prep: 0, respond: 270,
          prompt: "The examiner asks about familiar topics. Answer each in two or three sentences, not one word.\n\n- Do you work or are you a student?\n- What do you usually do at weekends?\n- Has that changed since you were a child?\n- Do you prefer spending time indoors or outdoors? Why?",
          tip: "Part 1 is a warm up, but one word answers cost you fluency marks immediately. Give the answer, then a reason or an example.",
        },
        {
          id: "is2", name: "Part 2, the long turn", prep: 60, respond: 120,
          prompt: "Describe a decision you made that you now think was wrong.\n\nYou should say:\n- what the decision was\n- when you made it\n- why you made it at the time\n- and explain what you would do differently now.",
          tip: "You get one minute to make notes and then must speak for one to two minutes without interruption. Stopping at 45 seconds is the most common way to lose marks here. Use the bullets as your structure.",
        },
        {
          id: "is3", name: "Part 3", prep: 0, respond: 270,
          prompt: "The examiner asks broader questions connected to Part 2.\n\n- Do you think young people and older people regret different kinds of decisions?\n- Should schools teach students how to make decisions?\n- Is it always useful to look back at past choices?\n- How has access to information changed the way people decide things?",
          tip: "Part 3 wants abstract discussion, not personal anecdote. Take a position, justify it, then concede the other side. Longer, more developed answers are expected here than in Part 1.",
        },
      ],
    },
  },

  toefl: {
    writing: {
      rubric: "toeflWriting",
      tasks: [
        {
          id: "tw1", name: "Writing for an Academic Discussion", minutes: 10, minWords: 100,
          prompt: "Your professor is teaching a class on urban policy. Write a post responding to the professor's question. In your response you should express and support your opinion, and make a contribution to the discussion.\n\nProfessor Ellis: Many cities are considering making public transport free at the point of use. Supporters say it cuts congestion and helps low income residents. Critics say the money would do more good if it were spent improving service frequency instead. What do you think, and why?\n\nAndrei: I think free transport is the obvious answer. Cost is the main reason people drive.\n\nPriya: But a free bus that comes twice an hour is still useless. Frequency is what actually changes behaviour.",
          tip: "Ten minutes, at least 100 words. State a position, give a reason the others have not already given, and engage with at least one classmate by name. Simply agreeing adds nothing to the discussion and is scored as such.",
        },
        {
          id: "tw2", name: "Integrated writing", minutes: 20, minWords: 150, soon: true,
          prompt: "",
          tip: "The integrated task requires a reading passage and a lecture played as audio. Audio is still being built, so this task is not available yet.",
        },
      ],
    },
    speaking: {
      rubric: "toeflSpeaking",
      tasks: [
        {
          id: "ts1", name: "Task 1, independent", prep: 15, respond: 45,
          prompt: "Some students prefer to study for an examination over several weeks. Others prefer to study intensively in the days just before it.\n\nWhich do you think is better, and why? Use details and examples to explain your answer.",
          tip: "Fifteen seconds to prepare and forty five to speak, which is very short. Choose a side in the first sentence, give exactly two reasons, and put a concrete example on the stronger one. Running out of things to say before the clock stops costs you Topic Development.",
        },
        {
          id: "ts2", name: "Tasks 2 to 4, integrated", prep: 30, respond: 60, soon: true,
          prompt: "",
          tip: "The integrated speaking tasks need a campus conversation or a lecture played as audio. Audio is still being built, so these are not available yet.",
        },
      ],
    },
  },

  act: {
    writing: {
      rubric: "actEssay",
      tasks: [
        {
          id: "aw1", name: "Writing (optional essay)", minutes: 40, minWords: 350,
          prompt: "Automated decision making\n\nAlgorithms now decide who is offered a loan, shortlisted for a job, or flagged at a border. Supporters argue that a well designed system is more consistent than a tired human. Critics argue that a system trained on past decisions will reproduce past unfairness at scale, and that nobody can be held accountable for its output.\n\nPerspective 1: Automated decisions should be preferred wherever they are measurably more accurate than human ones.\n\nPerspective 2: Any decision that materially affects a person's life must be made, or at minimum signed off, by a named human being.\n\nPerspective 3: The real question is not who decides but whether the decision can be explained and appealed.\n\nWrite a unified essay evaluating multiple perspectives on automated decision making. In your essay, analyse the relationship between your own perspective and at least one other.",
          tip: "The instruction is explicit: analyse the relationship between your position and at least one other. An essay that only argues its own case, however well, is capped in Ideas and Analysis.",
        },
      ],
    },
  },

  ssat: {
    writing: {
      rubric: "ssatWriting",
      tasks: [
        {
          id: "sw1", name: "Writing sample", minutes: 25, minWords: 300,
          prompt: "Choose ONE of the following and write an essay or a story.\n\nA. Is it better to be respected or to be liked?\n\nB. Write a story that begins: 'The envelope had been on the table for three days before anyone opened it.'",
          tip: "The writing sample is not scored, but it is sent to every school you apply to, so it is read by admissions staff. Twenty five minutes. Pick fast and spend two minutes planning rather than starting immediately and stalling.",
        },
      ],
    },
  },
};
