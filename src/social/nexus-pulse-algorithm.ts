export type RankedPost = {
  id: string;
  authorId?: string;
  handle: string;
  caption: string;
  title: string;
  tags: string[];
  creatorTopics?: string[];
  category: string;
  likes: number;
  comments: number;
  createdAt?: string;
};

export type FeedSignals = {
  likedPostIds: string[];
  savedPostIds: string[];
  followedHandles: string[];
  hiddenPostIds?: string[];
  hiddenHandles?: string[];
  preferredCategories?: string[];
  categoryWeights?: Record<string, number>;
  hiddenAuthorIds?: string[];
};

const CATEGORY_TERMS: Record<string, string[]> = {
  Creative: ["edit","editing","cinematic","visual","story","motion","film","creator","design"],
  Design: ["design","logo","brand","poster","graphic","typography","colour","color","product"],
  Learning: ["learn","lesson","tutorial","explain","study","education","how to","tips","knowledge"],
  Lifestyle: ["daily","routine","travel","food","fashion","life","vlog","moment","recap"],
  Gaming: ["game","gaming","gamer","gameplay","level","stream"],
  Music: ["music","song","beat","audio","dance","sing","sound"],
  Business: ["business","brand","marketing","sales","startup","entrepreneur","productivity"]
};

const words = (value: string) => value.toLowerCase().match(/[a-z0-9]+/g) || [];

export function inferPostCategory(post: Pick<RankedPost, "caption" | "title" | "tags" | "category">) {
  const text = [post.caption, post.title, ...post.tags].join(" ").toLowerCase();
  let best = "Creative";
  let bestScore = 0;
  for (const [category, terms] of Object.entries(CATEGORY_TERMS)) {
    const score = terms.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0);
    if (score > bestScore) { best = category; bestScore = score; }
  }
  return bestScore ? best : (post.category || "Creative");
}

const ageInHours = (createdAt?: string) => {
  const time = createdAt ? Date.parse(createdAt) : Number.NaN;
  return Number.isFinite(time) ? Math.max(0, (Date.now() - time) / 3_600_000) : 72;
};

const hash = (value: string) => {
  let result = 2166136261;
  for (let i = 0; i < value.length; i++) result = Math.imul(result ^ value.charCodeAt(i), 16777619);
  return result >>> 0;
};

/**
 * NEXUS Pulse ranking: explicit creator/category preferences + freshness +
 * useful community signals, followed by creator diversity and exploration.
 * It deliberately does not optimize watch time or use sensitive attributes.
 */
export function rankNexusFeed<T extends RankedPost>(posts: T[], signals: FeedSignals, mode: "for-you" | "following" = "for-you"): T[] {
  const hiddenPosts = new Set(signals.hiddenPostIds || []);
  const hiddenCreators = new Set(signals.hiddenHandles || []);
  const hiddenAuthors = new Set(signals.hiddenAuthorIds || []);
  const liked = new Set(signals.likedPostIds);
  const saved = new Set(signals.savedPostIds);
  const followed = new Set(signals.followedHandles);
  const interests = new Map<string, number>();
  const preferred = new Set(signals.preferredCategories || []);
  const historicalWeights = signals.categoryWeights || {};

  for (const post of posts) {
    const category = inferPostCategory(post);
    if (liked.has(post.id)) interests.set(category, (interests.get(category) || 0) + 1);
    if (saved.has(post.id)) interests.set(category, (interests.get(category) || 0) + 2);
  }

  const ranked = posts
    .filter(post => !hiddenPosts.has(post.id) && !hiddenCreators.has(post.handle) && !(post.authorId && hiddenAuthors.has(post.authorId)))
    .map(post => {
      const category = inferPostCategory(post);
      const hours = ageInHours(post.createdAt);
      const freshness = 24 * Math.exp(-hours / 72);
      const affinity = Math.min(18, (interests.get(category) || 0) * 5);
      const preference = preferred.has(category) ? 14 : 0;
      const historyAffinity = Math.min(24, (historicalWeights[category] || 0) * 2.5);
      const creatorTopicMatch = (post.creatorTopics || []).reduce((total, topic) => {
        const topicCategory = inferPostCategory({ caption: topic, title: topic, tags: [topic], category: "Creative" });
        const matchesPreferred = preferred.has(topicCategory);
        const matchesHistory = (historicalWeights[topicCategory] || 0) > 0;
        return total + (matchesPreferred ? 6 : matchesHistory ? 4 : 0);
      }, 0);
      const followScore = followed.has(post.handle) ? 8 : 0;
      const communitySignal = Math.min(10, Math.log1p(post.likes) * 1.2 + Math.log1p(post.comments) * 1.4);
      const alreadySeenPenalty = liked.has(post.id) || saved.has(post.id) ? -3 : 0;
      const exploration = (hash(post.id) % 1000) / 1000 * (preferred.size || Object.keys(historicalWeights).length ? 7 : 14);
      const score = freshness + affinity + preference + historyAffinity + creatorTopicMatch + followScore + communitySignal + alreadySeenPenalty + exploration;
      return { post, score, category };
    })
    .sort((a, b) => b.score - a.score);

  if (mode === "following") return ranked.map(item => item.post);

  // Soft diversity pass: avoid consecutive repeats from the same creator/category.
  const output: T[] = [];
  const remaining = [...ranked];
  while (remaining.length) {
    const previous = output[output.length - 1];
    let index = remaining.findIndex(item =>
      !previous || (item.post.handle !== previous.handle && item.category !== inferPostCategory(previous))
    );
    if (index < 0) index = 0;
    output.push(remaining.splice(index, 1)[0].post);
  }
  return output;
}
