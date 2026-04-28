export function buildArticlePrompt(input: {
  site: "cashclimb" | "northfield";
  title: string;
  keyword: string;
  category: string;
}) {
  const isCashClimb = input.site === "cashclimb";

  return `
Write a complete SEO article for ${input.site}.

Title: ${input.title}
Primary keyword: ${input.keyword}
Category: ${input.category}

Audience:
Western readers, primarily US, UK, Canada, and Australia.

Tone:
Clear, practical, trustworthy, human, and easy to read.

Required structure:

# ${input.title}

## What is ${input.keyword}?
Give a direct 1–2 sentence answer.

## Key Takeaways
- Include 4–5 bullet points.

## How ${input.keyword} Works
Explain clearly.

${
  isCashClimb
    ? `
## Income Potential
Include realistic income ranges where appropriate.

## Time to Results
Explain how long this usually takes.

## Risks and Limitations
Mention realistic downsides.

## Tools You May Need
List practical tools.
`
    : `
## Why This Works
Explain the learning science or educational reasoning.

## When to Use This Method
Give practical use cases.

## Common Mistakes
List mistakes students should avoid.

## Real Student Example
Give a realistic example.
`
}

## Step-by-Step Guide
Use numbered steps.

## Comparison Table
Include a helpful markdown table.

## Frequently Asked Questions
Include 5 FAQs with concise answers.

## Final Thoughts
End with a practical conclusion.

SEO requirements:
- Use the primary keyword naturally.
- Add related terms.
- Include internal link suggestions.
- Avoid fake claims.
- Avoid overpromising.
`;
}