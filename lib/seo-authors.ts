export type SiteKey = 'cashclimb' | 'northfield'

export type AutoAuthor = {
  name: string
  role: string
  bio: string
  initials: string
  reviewerName: string
  reviewerRole: string
  reviewerBio: string
}

export function getAutoAuthor(site: SiteKey, category?: string): AutoAuthor {
  const c = category?.toLowerCase() || ''

  if (site === 'cashclimb') {
    if (
      c.includes('side hustle') ||
      c.includes('make money') ||
      c.includes('income') ||
      c.includes('personal finance')
    ) {
      return {
        name: 'Daniel Reeves',
        role: 'Personal Finance Writer',
        bio: 'Daniel Reeves writes practical money advice focused on better habits, stronger savings, and realistic ways to increase income.',
        initials: 'DR',
        reviewerName: 'CashClimb Editorial',
        reviewerRole: 'Editorial Review Team',
        reviewerBio: 'CashClimb articles are reviewed for clarity, usefulness, and responsible financial education. Content is informational only and is not personal financial advice.',
      }
    }

    return {
      name: 'Sophie Tran',
      role: 'Finance Writer',
      bio: 'Sophie Tran covers budgeting, digital banking, and simple financial systems that help readers stay organized and in control.',
      initials: 'ST',
      reviewerName: 'CashClimb Editorial',
      reviewerRole: 'Editorial Review Team',
      reviewerBio: 'CashClimb articles are reviewed for clarity, usefulness, and responsible financial education. Content is informational only and is not personal financial advice.',
    }
  }

  if (
    c.includes('study') ||
    c.includes('learning') ||
    c.includes('memory') ||
    c.includes('education') ||
    c.includes('academic')
  ) {
    return {
      name: 'Emily Carter',
      role: 'Learning Specialist',
      bio: 'Emily Carter writes about study skills, learning systems, productivity, and academic improvement for students and lifelong learners.',
      initials: 'EC',
      reviewerName: 'Northfield Journal Editorial Review',
      reviewerRole: 'Education Review Desk',
      reviewerBio: 'Northfield Journal reviews education content for clarity, practical usefulness, and alignment with established learning principles.',
    }
  }

  return {
    name: 'Mark Reyes',
    role: 'Academic Skills Coach',
    bio: 'Mark Reyes focuses on practical education strategies, student productivity, memory improvement, and exam preparation.',
    initials: 'MR',
    reviewerName: 'Northfield Journal Editorial Review',
    reviewerRole: 'Education Review Desk',
    reviewerBio: 'Northfield Journal reviews education content for clarity, practical usefulness, and alignment with established learning principles.',
  }
}
