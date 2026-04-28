type Article = {
  title: string;
  slug: string;
  category?: string;
  excerpt?: string;
};

export function getSuggestedInternalLinks(
  currentArticle: Article,
  allArticles: Article[],
  limit = 5
) {
  const currentCategory = currentArticle.category?.toLowerCase();

  return allArticles
    .filter((article) => article.slug !== currentArticle.slug)
    .map((article) => {
      let score = 0;

      if (
        currentCategory &&
        article.category?.toLowerCase() === currentCategory
      ) {
        score += 5;
      }

      const currentWords = currentArticle.title.toLowerCase().split(/\s+/);
      const articleWords = article.title.toLowerCase().split(/\s+/);

      for (const word of currentWords) {
        if (word.length > 4 && articleWords.includes(word)) {
          score += 2;
        }
      }

      return { ...article, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}