export type SiteKey = "cashclimb" | "northfield";

export type Author = {
  id: string;
  name: string;
  role: string;
  bio: string;
  expertise: string[];
  location: string;
  avatar?: string;
};

export const AUTHORS: Record<SiteKey, Author[]> = {
  cashclimb: [
    {
      id: "alex-rivera",
      name: "Alex Rivera",
      role: "Side Hustle Specialist",
      bio: "Alex Rivera writes about side hustles, online income, and practical money strategies for readers who want to build better financial habits.",
      expertise: ["Side Hustles", "Online Income", "Personal Finance"],
      location: "United States",
      avatar: "/authors/alex-rivera.jpg",
    },
    {
      id: "jordan-lee",
      name: "Jordan Lee",
      role: "Personal Finance Writer",
      bio: "Jordan Lee focuses on budgeting, saving money, and beginner-friendly financial education for Western audiences.",
      expertise: ["Budgeting", "Saving Money", "Financial Planning"],
      location: "United States",
      avatar: "/authors/jordan-lee.jpg",
    },
  ],
  northfield: [
    {
      id: "emily-carter",
      name: "Emily Carter",
      role: "Learning Specialist",
      bio: "Emily Carter writes about study skills, learning systems, productivity, and academic improvement for students and lifelong learners.",
      expertise: ["Study Skills", "Learning Methods", "Academic Success"],
      location: "United Kingdom",
      avatar: "/authors/emily-carter.jpg",
    },
    {
      id: "mark-reyes",
      name: "Mark Reyes",
      role: "Academic Writing Coach",
      bio: "Mark Reyes covers academic writing, essays, research projects, thesis statements, and practical ways students can communicate ideas clearly.",
      expertise: ["Academic Writing", "Essays", "Research Projects"],
      location: "United States",
      avatar: "/authors/mark-reyes.jpg",
    },
    {
      id: "aisha-patel",
      name: "Aisha Patel",
      role: "Exam Preparation Specialist",
      bio: "Aisha Patel writes about exam preparation, revision planning, test confidence, and practical strategies for performing well under pressure.",
      expertise: ["Exam Prep", "Revision Planning", "Test Confidence"],
      location: "United Kingdom",
      avatar: "/authors/aisha-patel.jpg",
    },
    {
      id: "laura-bennett",
      name: "Laura Bennett",
      role: "Parent Education Writer",
      bio: "Laura Bennett writes practical guides for parents on homework routines, school support, homeschooling, and helping children build confidence as learners.",
      expertise: ["Parent Guides", "Homework Support", "Homeschooling"],
      location: "United States",
      avatar: "/authors/laura-bennett.jpg",
    },
    {
      id: "samuel-brooks",
      name: "Dr. Samuel Brooks",
      role: "Inclusive Education Specialist",
      bio: "Dr. Samuel Brooks focuses on inclusive education, learning differences, classroom accommodations, and practical support for diverse learners.",
      expertise: ["Special Education", "Learning Differences", "Classroom Accommodations"],
      location: "United Kingdom",
      avatar: "/authors/samuel-brooks.jpg",
    },
  ],
};

function hasAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

export function getAuthorForArticle(site: SiteKey, category?: string): Author {
  const authors = AUTHORS[site];
  const normalized = category?.toLowerCase() ?? "";

  if (site === "cashclimb") {
    if (hasAny(normalized, ["side hustle", "make money", "online income"])) return authors[0];
    return authors[1];
  }

  if (hasAny(normalized, ["special education", "inclusive", "learning difference", "dyslexia", "adhd", "iep", "accommodation"])) return authors[4];
  if (hasAny(normalized, ["parent", "homework", "homeschool", "family", "child", "children"])) return authors[3];
  if (hasAny(normalized, ["exam", "test", "revision", "finals", "assessment", "test anxiety"])) return authors[2];
  if (hasAny(normalized, ["essay", "writing", "thesis", "research", "paper", "assignment", "citation"])) return authors[1];
  return authors[0];
}
