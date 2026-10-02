// =============================================================================
// Elementary Music Success Scorecard: ALL editable content and IDs live here.
// Updating copy, IDs, trainings or URLs should never require touching quiz logic.
//
// Anything still starting with "PLACEHOLDER" is treated as "not set yet":
//   - Tracking IDs: that tracker is skipped entirely.
//   - Flodesk form IDs: the Expectations & Procedures form is used instead
//     (with a console warning) so the flow can still be tested.
// =============================================================================

export const CONFIG = {
  site: {
    title: 'Your Elementary Music Success Scorecard | TEN',
    brandUrl: 'https://tarbeteducationnetwork.com',
    logoSrc: '/assets/ten-logo-black.svg',
    logoAlt: 'Tarbet Education Network',
  },

  // --- Tracking (skipped while placeholder) ---------------------------------
  tracking: {
    META_PIXEL_ID: 'PLACEHOLDER_META_PIXEL_ID',
    GA4_MEASUREMENT_ID: 'PLACEHOLDER_GA4_MEASUREMENT_ID',
    CLARITY_PROJECT_ID: 'PLACEHOLDER_CLARITY_PROJECT_ID',
  },

  // --- Flodesk: one form per GROWTH pillar ----------------------------------
  // Each form adds the subscriber to that pillar's segment, which starts the
  // pillar's email workflow. Keys are pillar slugs.
  flodesk: {
    forms: {
      'expectations-procedures': '6abffc0d14eff99404fef9c4',
      'approaches-pedagogy': 'PLACEHOLDER_APPROACHES_PEDAGOGY',
      'inclusion-differentiation': 'PLACEHOLDER_INCLUSION_DIFFERENTIATION',
      'curriculum-planning': 'PLACEHOLDER_CURRICULUM_PLANNING',
      'teacher-fulfillment': 'PLACEHOLDER_TEACHER_FULFILLMENT',
    },
    // Used while a pillar's form ID is still a placeholder.
    fallbackPillar: 'expectations-procedures',
    // If the form hasn't rendered by then (e.g. an ad blocker), offer a way through.
    renderTimeoutMs: 6000,
    // Only used when Flodesk gives no success signal after a submit.
    submitFallbackMs: 1500,
  },

  // --- Links ----------------------------------------------------------------
  links: {
    edgeBase: 'https://www.thatmusicteacher.com/EDGE',
    edgeUtm: {
      utm_source: 'pillar-quiz',
      utm_medium: 'quiz',
      utm_campaign: 'scorecard',
      // utm_content is set to the growth pillar slug automatically.
    },
    privacy: 'https://www.thatmusicteacher.com/privacy',
    terms: 'https://www.thatmusicteacher.com/tou',
    disclaimer: 'https://www.thatmusicteacher.com/disclaimer',
    contact: 'mailto:hello@thatmusicteacher.com',
    pdfFooterLink: 'thatmusicteacher.com/EDGE',
  },

  // --- Screen copy ----------------------------------------------------------
  copy: {
    intro: {
      // Approved copy: use exactly.
      heading: 'Your Elementary Music Success Scorecard',
      body: 'Discover your Growth Pillar: the one area of the Pillars of General Music Success that will make the biggest difference in your teaching right now.',
      button: 'Start My Scorecard',
    },
    scale: { low: 'Strongly Disagree', high: 'Strongly Agree' },
    gate: {
      heading: 'Your results are ready.',
      subtext: 'Enter your name and email to see your scorecard and personalized growth plan.',
      blockedMessage: "We couldn't load the sign-up form. It may be blocked by your browser or an ad blocker.",
      blockedButton: 'Show my results',
    },
    results: {
      intro: 'Here is where focused growth will make the biggest difference in your teaching right now.',
      scoresHeading: 'Your Pillar Scores',
      foundationHeadingPrefix: 'Your Foundation Pillar:',
      growthHeadingPrefix: 'Your Growth Plan:',
      trainingsHeading: 'Recommended EDGE Trainings',
      alsoAttentionLabel: 'Also worth your attention:',
      supportHeading: 'The support you need',
      supportBody: 'Every training recommended above lives inside Elementary Music EDGE®, the professional development membership for elementary music teachers. Join to start your growth plan today, with on-demand trainings, ready-to-use resources and a community of music teachers who get it.',
      supportButton: 'Join Elementary Music EDGE®',
      downloadHeading: 'Keep your scorecard',
      nameFieldLabel: 'Name to print on your scorecard',
      nameFieldHint: 'Optional. Used only in your PDF, never saved or sent anywhere.',
      downloadButton: 'Download My Scorecard',
      retake: 'Retake the Scorecard',
    },
    cookie: {
      text: 'This site uses cookies to improve your experience and measure our marketing.',
      linkText: 'Privacy Policy',
      button: 'Got it',
    },
    footer: {
      privacyNote: 'Your quiz answers stay on your device and are never saved.',
      disclaimerNote: 'This scorecard is a self-reflection tool, not a formal evaluation.',
      // {year} is replaced with the current year.
      copyright: '© {year} That Music Teacher, LLC d/b/a Tarbet Education Network. All rights reserved.',
      trademark: 'Elementary Music EDGE® is a registered trademark of That Music Teacher, LLC.',
    },
    pdf: {
      filename: 'My-Elementary-Music-Success-Scorecard.pdf',
      title: 'My Elementary Music Success Scorecard',
      scoresHeading: 'My Pillar Scores',
      footerCopyright: '© {year} That Music Teacher, LLC d/b/a Tarbet Education Network',
      footerCta: 'Continue your growth plan: thatmusicteacher.com/EDGE',
    },
  },

  // --- Pillars (framework order = tie-break order; do not reorder) ----------
  pillars: [
    {
      slug: 'expectations-procedures',
      name: 'Expectations & Procedures',
      // Radar labels: two lines on wide screens, one short word on phones.
      chartLabel: ['EXPECTATIONS &', 'PROCEDURES'],
      shortLabel: 'EXPECTATIONS',
      description: 'Clear expectations and procedures are essential for creating a positive learning environment. This pillar focuses on classroom management, student routines, and maintaining a learning-focused atmosphere.',
      statements: [
        'I have clearly communicated classroom expectations that students understand and follow.',
        'I consistently enforce classroom procedures and rules.',
        'My students can independently follow routines without frequent reminders.',
        'I feel confident in managing classroom behavior effectively.',
        'My classroom environment supports learning by minimizing disruptions.',
      ],
      foundationCopy: 'PLACEHOLDER: Your classroom runs on clear expectations and dependable routines. Lean into this strength by using your procedures to free up more time for music-making, and share what works with colleagues.',
      growthCopy: 'PLACEHOLDER: Clear expectations and consistent procedures create the calm, focused room every music lesson needs. Small changes to routines and transitions can quickly give you back teaching time.',
      trainings: [
        { title: 'PLACEHOLDER Training Title 1', clinician: 'PLACEHOLDER Clinician', description: 'PLACEHOLDER one-line description of this training.' },
        { title: 'PLACEHOLDER Training Title 2', clinician: 'PLACEHOLDER Clinician', description: 'PLACEHOLDER one-line description of this training.' },
        { title: 'PLACEHOLDER Training Title 3', clinician: 'PLACEHOLDER Clinician', description: 'PLACEHOLDER one-line description of this training.' },
      ],
    },
    {
      slug: 'approaches-pedagogy',
      name: 'Approaches & Pedagogy',
      chartLabel: ['APPROACHES &', 'PEDAGOGY'],
      shortLabel: 'APPROACHES',
      description: 'This pillar emphasizes teaching strategies and methodologies. It includes your ability to apply diverse approaches like Kodály, Orff, and Dalcroze to engage students effectively.',
      statements: [
        'I regularly use a variety of teaching approaches to meet the needs of all students.',
        'I feel confident applying different methodologies in my teaching.',
        'I adapt my teaching style based on the content and/or needs of the class.',
        'I can effectively engage students through hands-on and active music-making experiences.',
        'My teaching reflects a solid understanding of age-appropriate practices.',
      ],
      foundationCopy: 'PLACEHOLDER: You bring a rich toolbox of approaches to your teaching. Lean into this strength by building lessons around the approaches your students respond to most.',
      growthCopy: 'PLACEHOLDER: Growing your toolbox of approaches like Kodály, Orff and Dalcroze helps every student find a way into the music.',
      trainings: [
        { title: 'PLACEHOLDER Training Title 1', clinician: 'PLACEHOLDER Clinician', description: 'PLACEHOLDER one-line description of this training.' },
        { title: 'PLACEHOLDER Training Title 2', clinician: 'PLACEHOLDER Clinician', description: 'PLACEHOLDER one-line description of this training.' },
        { title: 'PLACEHOLDER Training Title 3', clinician: 'PLACEHOLDER Clinician', description: 'PLACEHOLDER one-line description of this training.' },
      ],
    },
    {
      slug: 'inclusion-differentiation',
      name: 'Inclusion & Differentiation',
      chartLabel: ['INCLUSION &', 'DIFFERENTIATION'],
      shortLabel: 'INCLUSION',
      description: 'Creating inclusive classrooms ensures all students feel valued and supported. This pillar addresses adapting lessons for diverse needs and integrating culturally relevant content.',
      statements: [
        'I feel confident differentiating instruction to meet diverse learning needs.',
        'I create an inclusive classroom where all students feel valued and supported.',
        'I have strategies in place to adapt lessons for students with IEPs, 504s, and other accommodations.',
        'I integrate culturally relevant music and practices into my lessons.',
        'I design lessons that are accessible to students of varying abilities and backgrounds.',
      ],
      foundationCopy: 'PLACEHOLDER: Your classroom is a place where every student belongs. Lean into this strength by making your adaptations part of how you plan every unit.',
      growthCopy: 'PLACEHOLDER: Practical strategies for differentiation and inclusion help every student take part fully, without adding hours to your planning.',
      trainings: [
        { title: 'PLACEHOLDER Training Title 1', clinician: 'PLACEHOLDER Clinician', description: 'PLACEHOLDER one-line description of this training.' },
        { title: 'PLACEHOLDER Training Title 2', clinician: 'PLACEHOLDER Clinician', description: 'PLACEHOLDER one-line description of this training.' },
        { title: 'PLACEHOLDER Training Title 3', clinician: 'PLACEHOLDER Clinician', description: 'PLACEHOLDER one-line description of this training.' },
      ],
    },
    {
      slug: 'curriculum-planning',
      name: 'Curriculum & Planning',
      chartLabel: ['CURRICULUM &', 'PLANNING'],
      shortLabel: 'CURRICULUM',
      description: 'Effective curriculum planning ensures you meet your learning goals and standards. This pillar focuses on long-term planning, pacing, repertoire selection, and assessment strategies.',
      statements: [
        'I have a clear long-term plan for what I want students to learn by the end of the year.',
        "My lesson plans are aligned with national/state/local standards and/or my district's curriculum.",
        'I have a consistent process for selecting repertoire and activities that support student learning goals.',
        'I feel confident designing assessments to accurately measure student progress.',
        'My lessons are well-paced and manageable for the time allotted.',
      ],
      foundationCopy: 'PLACEHOLDER: You plan with purpose and know where your students are headed. Lean into this strength by using your long-range plan to make room for creativity and student choice.',
      growthCopy: 'PLACEHOLDER: A clear long-range plan, well-paced lessons and simple assessments make every class period count and take the guesswork out of your week.',
      trainings: [
        { title: 'PLACEHOLDER Training Title 1', clinician: 'PLACEHOLDER Clinician', description: 'PLACEHOLDER one-line description of this training.' },
        { title: 'PLACEHOLDER Training Title 2', clinician: 'PLACEHOLDER Clinician', description: 'PLACEHOLDER one-line description of this training.' },
        { title: 'PLACEHOLDER Training Title 3', clinician: 'PLACEHOLDER Clinician', description: 'PLACEHOLDER one-line description of this training.' },
      ],
    },
    {
      slug: 'teacher-fulfillment',
      name: 'Teacher Fulfillment',
      chartLabel: ['TEACHER', 'FULFILLMENT'],
      shortLabel: 'FULFILLMENT',
      description: 'Teacher fulfillment reflects how supported, balanced, and purposeful you feel in your role. This pillar includes personal well-being, self-advocacy, and professional satisfaction.',
      statements: [
        'I feel a sense of joy and purpose in my teaching role.',
        'I have a good work/life balance that allows me to recharge outside of school.',
        'I reflect regularly on my teaching to identify areas of growth and to celebrate successes.',
        'I feel supported by my school, colleagues, administration, and community.',
        'I am confident in advocating for myself and my program when necessary.',
      ],
      foundationCopy: 'PLACEHOLDER: You find joy and purpose in your work. Lean into this strength by protecting the habits that keep you balanced, and let that energy carry into your classroom.',
      growthCopy: 'PLACEHOLDER: You can only pour from a full cup. Support, balance and self-advocacy help you keep loving this work for the long haul.',
      trainings: [
        { title: 'PLACEHOLDER Training Title 1', clinician: 'PLACEHOLDER Clinician', description: 'PLACEHOLDER one-line description of this training.' },
        { title: 'PLACEHOLDER Training Title 2', clinician: 'PLACEHOLDER Clinician', description: 'PLACEHOLDER one-line description of this training.' },
        { title: 'PLACEHOLDER Training Title 3', clinician: 'PLACEHOLDER Clinician', description: 'PLACEHOLDER one-line description of this training.' },
      ],
    },
  ],
};

export const isPlaceholder = (value) => !value || String(value).startsWith('PLACEHOLDER');
