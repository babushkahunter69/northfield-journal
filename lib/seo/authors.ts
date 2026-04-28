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
      role: "Academic Skills Coach",
      bio: "Mark Reyes focuses on practical education strategies, student productivity, memory improvement, and exam preparation.",
      expertise: ["Exam Prep", "Student Productivity", "Memory Techniques"],
      location: "United States",
      avatar: "/authors/mark-reyes.jpg",
    },
  ],
};

export function getAuthorForArticle(site: SiteKey, category?: string): Author {
  const authors = AUTHORS[site];

  const normalized = category?.toLowerCase() ?? "";

  if (site === "cashclimb") {
    if (
      normalized.includes("side hustle") ||
      normalized.includes("make money") ||
      normalized.includes("online income")
    ) {
      return authors[0];
    }

    return authors[1];
  }

  if (site === "northfield") {
    if (
      normalized.includes("study") ||
      normalized.includes("learning") ||
      normalized.includes("memory")
    ) {
      return authors[0];
    }

    return authors[1];
  }

  return authors[0];
}