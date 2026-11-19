/**
 * storage.js
 * Advanix - LocalStorage persistence layer (frontend prototype).
 *
 * This module wraps browser LocalStorage so the rest of the app can read and
 * write demo data without caring about the underlying storage mechanism.
 *
 * IMPORTANT: This is a prototype-only layer. All data lives in the browser
 * and is cleared when the user clears site data. It is NOT production-secure.
 */

const STORAGE_KEYS = {
  USERS: 'sjc_users',           // registered users (demo)
  CURRENT_USER: 'sjc_current_user', // currently logged-in user (demo session)
  JOBS: 'sjc_jobs',             // job listings (demo + recruiter-posted)
  APPLICATIONS: 'sjc_applications', // job applications
  SAVED_JOBS: 'sjc_saved_jobs', // saved/bookmarked jobs
  PROFILE: 'sjc_profile',       // student profile details
};

/**
 * Helper: read a value from LocalStorage, returning a default if missing/invalid.
 * @param {string} key - LocalStorage key
 * @param {any} defaultValue - value to return when nothing is stored
 * @returns {any}
 */
export function get(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`storage.get(${key}) failed, returning default:`, error);
    return defaultValue;
  }
}

/**
 * Helper: write a value to LocalStorage.
 * @param {string} key - LocalStorage key
 * @param {any} value - value to store (will be JSON.stringified)
 */
export function set(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`storage.set(${key}) failed:`, error);
  }
}

/**
 * Helper: remove a key from LocalStorage.
 * @param {string} key - LocalStorage key
 */
export function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`storage.remove(${key}) failed:`, error);
  }
}

/**
 * Seed demo data into LocalStorage if it does not already exist.
 * All seeded jobs are clearly marked as sample/demo data.
 */
export function seedDemoData() {
  // --- Seed demo users (plaintext passwords are prototype-only, NOT secure) ---
  const existingUsers = get(STORAGE_KEYS.USERS, []);
  if (existingUsers.length === 0) {
    const demoUsers = [
      {
        id: 'user_101',
        role: 'student',
        fullName: 'Aarav Sharma',
        email: 'aarav.sharma@student.com',
        password: 'student123', // prototype-only, never do this in production
        college: 'Delhi Technological University',
        degree: 'Bachelor of Technology',
        graduationYear: '2025',
        skills: ['HTML', 'CSS', 'JavaScript', 'Python', 'React'],
        resumeUrl: '',
        profilePhoto: '',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'user_102',
        role: 'recruiter',
        fullName: 'Priya Mehta',
        email: 'priya.mehta@zomato.com',
        password: 'recruiter123', // prototype-only, never do this in production
        companyName: 'Zomato',
        designation: 'Talent Acquisition Lead',
        createdAt: new Date().toISOString(),
      },
    ];
    set(STORAGE_KEYS.USERS, demoUsers);
  }

  // --- Seed demo jobs ---
  const existingJobs = get(STORAGE_KEYS.JOBS, []);
  if (existingJobs.length === 0) {
    const demoJobs = [
      {
        id: 'job_001',
        title: 'Frontend Development Intern',
        company: 'Zomato',
        companyLogo: 'https://ui-avatars.com/api/?name=Zomato&background=FF3E00&color=fff',
        location: 'Bangalore, Karnataka',
        salary: '₹20,000 / month',
        jobType: 'Internship',
        workMode: 'Remote',
        experience: '0-1 years',
        deadline: '2026-12-31',
        description:
          'We are looking for a passionate Frontend Intern to join our web team. You will work on building responsive user interfaces using modern web technologies and collaborate with designers and backend engineers.',
        responsibilities: [
          'Develop and maintain responsive web pages using HTML, CSS, and JavaScript',
          'Collaborate with UI/UX designers to implement designs',
          'Optimize pages for maximum speed and scalability',
          'Participate in code reviews and team stand-ups',
        ],
        qualifications: [
          'Currently pursuing a degree in Computer Science or related field',
          'Basic understanding of HTML, CSS, and JavaScript',
          'Eagerness to learn and work in a fast-paced environment',
        ],
        requiredSkills: ['HTML', 'CSS', 'JavaScript', 'React'],
        postedDate: '2026-11-10',
        source: 'Demo (Sample Data)',
        isDemo: true,
        postedBy: 'user_102', // Zomato recruiter
        applicants: [], // array of application ids
      },
      {
        id: 'job_002',
        title: 'React Developer',
        company: 'Flipkart',
        companyLogo: 'https://ui-avatars.com/api/?name=Flipkart&background=2874F6&color=fff',
        location: 'Gurgaon, Haryana',
        salary: '₹12,00,000 / year',
        jobType: 'Full-time',
        workMode: 'Hybrid',
        experience: '2-4 years',
        deadline: '2027-01-15',
        description:
          'Join Flipkart\'s frontend engineering team to build scalable e-commerce experiences used by millions of customers every day.',
        responsibilities: [
          'Build reusable frontend components with React and Redux',
          'Work with backend engineers to integrate REST APIs',
          'Ensure high performance and accessibility of web applications',
          'Mentor junior developers and contribute to design systems',
        ],
        qualifications: [
          "Bachelor's degree in Computer Science or equivalent",
          '2+ years of experience with React and modern JavaScript',
          'Experience with state management (Redux, Context, or Zustand)',
        ],
        requiredSkills: ['JavaScript', 'React', 'Redux', 'Node.js'],
        postedDate: '2026-11-08',
        source: 'Demo (Sample Data)',
        isDemo: true,
        postedBy: 'user_103',
        applicants: [],
      },
      {
        id: 'job_003',
        title: 'Java Backend Developer',
        company: 'Infosys',
        companyLogo: 'https://ui-avatars.com/api/?name=Infosys&background=00A86B&color=fff',
        location: 'Pune, Maharashtra',
        salary: '₹6,00,000 / year',
        jobType: 'Full-time',
        workMode: 'On-site',
        experience: '1-3 years',
        deadline: '2026-12-10',
        description:
          'Infosys is hiring Java developers to work on enterprise-grade applications for global clients across banking and retail domains.',
        responsibilities: [
          'Design and develop RESTful services using Java and Spring Boot',
          'Write efficient SQL queries and work with relational databases',
          'Participate in agile sprints and deliver production-quality code',
          'Collaborate with QA teams to ensure bug-free releases',
        ],
        qualifications: [
          "Bachelor's degree in Computer Science or IT",
          '1+ years of experience with Java and Spring Boot',
          'Knowledge of SQL and relational databases',
        ],
        requiredSkills: ['Java', 'Spring Boot', 'SQL'],
        postedDate: '2026-11-05',
        source: 'Demo (Sample Data)',
        isDemo: true,
        postedBy: 'user_103',
        applicants: [],
      },
      {
        id: 'job_004',
        title: 'Data Analyst Intern',
        company: 'TCS',
        companyLogo: 'https://ui-avatars.com/api/?name=TCS&background=0033A0&color=fff',
        location: 'Mumbai, Maharashtra',
        salary: '₹15,000 / month',
        jobType: 'Internship',
        workMode: 'Hybrid',
        experience: '0-1 years',
        deadline: '2026-12-20',
        description:
          'TCS invites students to analyze business data and create dashboards that help stakeholders make informed decisions.',
        responsibilities: [
          'Collect, clean, and validate data from multiple sources',
          'Build dashboards and reports using Tableau and Power BI',
          'Perform exploratory data analysis and present findings',
          'Support senior analysts with ad-hoc requests',
        ],
        qualifications: [
          'Pursuing a degree in Statistics, Mathematics, Computer Science, or related field',
          'Basic knowledge of SQL and Python',
          'Familiarity with Excel and data visualization tools',
        ],
        requiredSkills: ['Python', 'SQL', 'Tableau', 'Excel'],
        postedDate: '2026-11-03',
        source: 'Demo (Sample Data)',
        isDemo: true,
        postedBy: 'user_103',
        applicants: [],
      },
      {
        id: 'job_005',
        title: 'Digital Marketing Intern',
        company: 'Paytm',
        companyLogo: 'https://ui-avatars.com/api/?name=Paytm&background=002144&color=fff',
        location: 'Noida, Uttar Pradesh',
        salary: '₹12,000 / month',
        jobType: 'Internship',
        workMode: 'Remote',
        experience: '0-1 years',
        deadline: '2026-12-05',
        description:
          'Paytm\'s growth team is looking for a digital marketing intern to run campaigns, analyze performance, and support brand initiatives.',
        responsibilities: [
          'Assist in planning and executing SEO and SEM campaigns',
          'Create and schedule social media content',
          'Track campaign performance using Google Analytics',
          'Support content creation for blogs and newsletters',
        ],
        qualifications: [
          'Pursuing a degree in Marketing, Business, or Communications',
          'Basic understanding of SEO, SEM, and social media platforms',
          'Creative thinking and strong written communication',
        ],
        requiredSkills: ['SEO', 'SEM', 'Social Media', 'Content Writing'],
        postedDate: '2026-11-01',
        source: 'Demo (Sample Data)',
        isDemo: true,
        postedBy: 'user_103',
        applicants: [],
      },
      {
        id: 'job_006',
        title: 'Business Development Executive',
        company: 'Byju\'s',
        companyLogo: 'https://ui-avatars.com/api/?name=Byjus&background=0099FF&color=fff',
        location: 'Chennai, Tamil Nadu',
        salary: '₹4,50,000 / year',
        jobType: 'Full-time',
        workMode: 'On-site',
        experience: '0-2 years',
        deadline: '2026-11-25',
        description:
          'Byju\'s is expanding its sales team. Help schools and students discover better learning outcomes through our edtech platform.',
        responsibilities: [
          'Generate leads and conduct product demonstrations for schools',
          'Achieve monthly sales targets and report progress',
          'Build and maintain relationships with educational institutions',
          'Use CRM tools to track pipeline and follow-ups',
        ],
        qualifications: [
          "Bachelor's degree in any discipline",
          'Strong communication and interpersonal skills',
          'Willingness to travel within the assigned region',
        ],
        requiredSkills: ['Communication', 'Sales', 'CRM', 'Negotiation'],
        postedDate: '2026-10-28',
        source: 'Demo (Sample Data)',
        isDemo: true,
        postedBy: 'user_103',
        applicants: [],
      },
      {
        id: 'job_007',
        title: 'Financial Analyst',
        company: 'HDFC Bank',
        companyLogo: 'https://ui-avatars.com/api/?name=HDFC+Bank&background=2F2FA2&color=fff',
        location: 'Bangalore, Karnataka',
        salary: '₹5,00,000 / year',
        jobType: 'Full-time',
        workMode: 'On-site',
        experience: '1-3 years',
        deadline: '2026-12-01',
        description:
          'HDFC Bank is hiring financial analysts to support budgeting, forecasting, and financial reporting for its retail banking division.',
        responsibilities: [
          'Prepare monthly financial statements and variance analysis',
          'Build financial models to support business decisions',
          'Monitor budgets and identify cost-saving opportunities',
          'Coordinate with internal and external auditors',
        ],
        qualifications: [
          "Bachelor's degree in Finance, Accounting, or Commerce",
          'Proficiency in MS Excel and accounting software (Tally)',
          'Knowledge of banking regulations and financial reporting',
        ],
        requiredSkills: ['Finance', 'Accounting', 'Excel', 'Tally'],
        postedDate: '2026-10-25',
        source: 'Demo (Sample Data)',
        isDemo: true,
        postedBy: 'user_103',
        applicants: [],
      },
      {
        id: 'job_008',
        title: 'Graphic Design Intern',
        company: 'MakeMyTrip',
        companyLogo: 'https://ui-avatars.com/api/?name=MakeMyTrip&background=FF6600&color=fff',
        location: 'Goa, India',
        salary: '₹10,000 / month',
        jobType: 'Internship',
        workMode: 'Remote',
        experience: '0-1 years',
        deadline: '2026-11-30',
        description:
          'MakeMyTrip\'s creative team needs a design intern to produce visuals for travel campaigns, social media, and email newsletters.',
        responsibilities: [
          'Design social media posts, banners, and email templates',
          'Create print and digital collateral for marketing campaigns',
          'Collaborate with the marketing team on visual concepts',
          'Maintain brand consistency across all assets',
        ],
        qualifications: [
          'Pursuing a degree in Design, Fine Arts, or related field',
          'Proficiency in Photoshop, Illustrator, or Canva',
          'A portfolio showcasing design work',
        ],
        requiredSkills: ['Photoshop', 'Illustrator', 'Canva'],
        postedDate: '2026-10-20',
        source: 'Demo (Sample Data)',
        isDemo: true,
        postedBy: 'user_103',
        applicants: [],
      },
      {
        id: 'job_009',
        title: 'UI/UX Designer',
        company: 'Swiggy',
        companyLogo: 'https://ui-avatars.com/api/?name=Swiggy&background=F13A25&color=fff',
        location: 'Bangalore, Karnataka',
        salary: '₹8,00,000 / year',
        jobType: 'Full-time',
        workMode: 'Hybrid',
        experience: '2-4 years',
        deadline: '2027-01-10',
        description:
          'Swiggy is looking for a UI/UX designer to shape the food delivery experience for millions of users across India.',
        responsibilities: [
          'Design user flows, wireframes, and high-fidelity prototypes',
          'Conduct user research and usability testing',
          'Collaborate with product managers and engineers',
          'Maintain and contribute to the design system',
        ],
        qualifications: [
          "Bachelor's degree in Design or HCI (preferred)",
          '2+ years of experience with Figma or Adobe XD',
          'Strong portfolio of digital product design',
        ],
        requiredSkills: ['Figma', 'Adobe XD', 'Prototyping', 'User Research'],
        postedDate: '2026-10-18',
        source: 'Demo (Sample Data)',
        isDemo: true,
        postedBy: 'user_103',
        applicants: [],
      },
      {
        id: 'job_010',
        title: 'Web Development Intern',
        company: 'Ola',
        companyLogo: 'https://ui-avatars.com/api/?name=Ola&background=FF0000&color=fff',
        location: 'Bangalore, Karnataka',
        salary: '₹18,000 / month',
        jobType: 'Internship',
        workMode: 'Hybrid',
        experience: '0-1 years',
        deadline: '2026-12-15',
        description:
          'Ola\'s web team is hiring interns to build and maintain customer-facing web applications for ride booking and electric vehicle services.',
        responsibilities: [
          'Build responsive pages using HTML, CSS, JavaScript, and TypeScript',
          'Integrate frontend with backend REST APIs',
          'Write clean, documented, and testable code',
          'Fix bugs and improve existing code quality',
        ],
        qualifications: [
          'Pursuing a degree in Computer Science or related field',
          'Knowledge of HTML, CSS, and JavaScript',
          'Familiarity with TypeScript is a plus',
        ],
        requiredSkills: ['HTML', 'CSS', 'JavaScript', 'TypeScript'],
        postedDate: '2026-10-15',
        source: 'Demo (Sample Data)',
        isDemo: true,
        postedBy: 'user_103',
        applicants: [],
      },
      {
        id: 'job_011',
        title: 'Software Engineer',
        company: 'Wipro',
        companyLogo: 'https://ui-avatars.com/api/?name=Wipro&background=009245&color=fff',
        location: 'Hyderabad, Telangana',
        salary: '₹5,50,000 / year',
        jobType: 'Full-time',
        workMode: 'On-site',
        experience: '1-3 years',
        deadline: '2026-12-25',
        description:
          'Wipro is hiring software engineers to work on digital transformation projects for clients in healthcare and manufacturing.',
        responsibilities: [
          'Develop backend services using Java and Python',
          'Design and maintain databases and APIs',
          'Participate in code reviews and agile ceremonies',
          'Support deployment and production monitoring',
        ],
        qualifications: [
          "Bachelor's degree in Computer Science or IT",
          '1+ years of software development experience',
          'Knowledge of Java or Python and SQL',
        ],
        requiredSkills: ['Java', 'Python', 'SQL'],
        postedDate: '2026-10-10',
        source: 'Demo (Sample Data)',
        isDemo: true,
        postedBy: 'user_103',
        applicants: [],
      },
      {
        id: 'job_012',
        title: 'Data Analyst',
        company: 'Accenture',
        companyLogo: 'https://ui-avatars.com/api/?name=Accenture&background=6EC400&color=fff',
        location: 'Gurgaon, Haryana',
        salary: '₹7,00,000 / year',
        jobType: 'Full-time',
        workMode: 'Hybrid',
        experience: '2-4 years',
        deadline: '2027-01-05',
        description:
          'Accenture\'s analytics practice is hiring data analysts to deliver insights to Fortune 500 clients across industries.',
        responsibilities: [
          'Analyze large datasets to uncover business insights',
          'Build dashboards using Power BI and Tableau',
          'Present findings to clients and stakeholders',
          'Work with data engineers on ETL pipelines',
        ],
        qualifications: [
          "Bachelor's degree in a quantitative field",
          '2+ years of experience in data analysis',
          'Proficiency in Python, SQL, and visualization tools',
        ],
        requiredSkills: ['Python', 'SQL', 'Power BI', 'Tableau'],
        postedDate: '2026-10-05',
        source: 'Demo (Sample Data)',
        isDemo: true,
        postedBy: 'user_103',
        applicants: [],
      },
      {
        id: 'job_013',
        title: 'Digital Marketing Manager',
        company: 'Amazon',
        companyLogo: 'https://ui-avatars.com/api/?name=Amazon&background=FF9900&color=141414',
        location: 'Hyderabad, Telangana',
        salary: '₹10,00,000 / year',
        jobType: 'Full-time',
        workMode: 'On-site',
        experience: '4-7 years',
        deadline: '2026-12-31',
        description:
          'Amazon is hiring a Digital Marketing Manager to lead performance marketing campaigns across India and global marketplaces.',
        responsibilities: [
          'Plan and manage SEO, SEM, and paid media campaigns',
          'Own marketing budget and optimize ROI',
          'Lead a team of marketing executives and agencies',
          'Analyze performance data and recommend improvements',
        ],
        qualifications: [
          "Bachelor's or Master's degree in Marketing or Business",
          '4+ years of digital marketing experience',
          'Expertise in Google Ads, Meta Ads, and analytics',
        ],
        requiredSkills: ['SEO', 'SEM', 'Analytics', 'Strategy'],
        postedDate: '2026-09-28',
        source: 'Demo (Sample Data)',
        isDemo: true,
        postedBy: 'user_103',
        applicants: [],
      },
      {
        id: 'job_014',
        title: 'Design Intern',
        company: 'Myntra',
        companyLogo: 'https://ui-avatars.com/api/?name=Myntra&background=FF5C2A&color=fff',
        location: 'Bangalore, Karnataka',
        salary: '₹12,000 / month',
        jobType: 'Internship',
        workMode: 'Remote',
        experience: '0-1 years',
        deadline: '2026-11-20',
        description:
          'Myntra\'s creative team is looking for a design intern to support fashion e-commerce visuals and social media assets.',
        responsibilities: [
          'Create product listing images and promotional banners',
          'Design Instagram and Facebook creatives',
          'Assist in photoshoot coordination and editing',
          'Follow brand guidelines for all deliverables',
        ],
        qualifications: [
          'Pursuing a degree in Design or Visual Communication',
          'Proficiency in Photoshop and Illustrator',
          'Interest in fashion and e-commerce',
        ],
        requiredSkills: ['Photoshop', 'Illustrator'],
        postedDate: '2026-09-25',
        source: 'Demo (Sample Data)',
        isDemo: true,
        postedBy: 'user_103',
        applicants: [],
      },
      {
        id: 'job_015',
        title: 'UX Design Intern',
        company: 'PhonePe',
        companyLogo: 'https://ui-avatars.com/api/?name=PhonePe&background=7342D6&color=fff',
        location: 'Bangalore, Karnataka',
        salary: '₹15,000 / month',
        jobType: 'Internship',
        workMode: 'Remote',
        experience: '0-1 years',
        deadline: '2026-12-10',
        description:
          'PhonePe\'s product design team is hiring a UX intern to improve the payments and financial services app experience.',
        responsibilities: [
          'Create wireframes and low-fidelity prototypes in Figma',
          'Assist with user research and interview synthesis',
          'Document design decisions and user flows',
          'Collaborate with product and engineering teams',
        ],
        qualifications: [
          'Pursuing a degree in Design, HCI, or Psychology',
          'Familiarity with Figma or similar design tools',
          'Curiosity about user behavior and product design',
        ],
        requiredSkills: ['Figma', 'User Research', 'Wireframing'],
        postedDate: '2026-09-20',
        source: 'Demo (Sample Data)',
        isDemo: true,
        postedBy: 'user_103',
        applicants: [],
      },
    ];
    set(STORAGE_KEYS.JOBS, demoJobs);
  }

  // --- Seed empty collections if missing ---
  if (get(STORAGE_KEYS.APPLICATIONS) === null) {
    set(STORAGE_KEYS.APPLICATIONS, []);
  }
  if (get(STORAGE_KEYS.SAVED_JOBS) === null) {
    set(STORAGE_KEYS.SAVED_JOBS, []);
  }
}

export { STORAGE_KEYS };
