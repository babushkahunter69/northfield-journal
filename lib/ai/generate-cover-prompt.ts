export function generateCoverPrompt(input: {
  title: string;
  excerpt?: string;
  category?: string;
}) {
  const title = input.title?.trim() || 'Education article';
  const excerpt = input.excerpt?.trim() || '';
  const category = input.category?.trim() || 'education';

  return `
Create a photorealistic editorial cover image for a premium Western-market education publication.

Article title:
${title}

Article summary:
${excerpt}

Category:
${category}

Requirements:
- photorealistic, not cartoon, not illustration, not CGI
- realistic people, natural facial expressions
- clean editorial photography style
- natural lighting, soft shadows
- modern academic or educational environment
- visually premium and trustworthy
- suitable as a blog cover image
- no text, no watermark, no logo
- no extra fingers, no distorted faces
- landscape composition
- style should feel like high-end magazine photography

Return only the image based on this prompt intent.
`.trim();
}