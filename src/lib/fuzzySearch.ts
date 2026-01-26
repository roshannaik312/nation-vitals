// Simple fuzzy matching algorithm for county search
export function fuzzyMatch(query: string, text: string): number {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Exact match gets highest score
  if (textLower === queryLower) return 100;
  
  // Starts with query gets high score
  if (textLower.startsWith(queryLower)) return 90;
  
  // Contains query gets medium score
  if (textLower.includes(queryLower)) return 70;
  
  // Check if all characters in query appear in order in text
  let queryIndex = 0;
  let matchScore = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
      matchScore += 10;
    }
  }
  
  if (queryIndex === queryLower.length) {
    return 50 + matchScore;
  }
  
  // No match
  return 0;
}

export function fuzzySearch<T>(
  items: T[],
  query: string,
  getSearchText: (item: T) => string,
  limit: number = 20
): T[] {
  if (!query.trim()) return [];
  
  const scored = items.map(item => ({
    item,
    score: fuzzyMatch(query, getSearchText(item))
  }));
  
  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);
}
