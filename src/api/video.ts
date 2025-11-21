export const getChapters = async () => {
  await new Promise(r => setTimeout(r, 300));
  return Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    title: `Chapter ${i + 1}`,
    timestamp: `${i * 2}:00`,
    description: `This is a detailed description for Chapter ${i + 1}.`,
    bookmarked: false,
    reactions: { like: 0, love: 0, wow: 0 },
  }));
};

export const getAnalyticsEvents = async () => {
  await new Promise(r => setTimeout(r, 300));
  return Array.from({ length: 500 }, (_, i) => ({
    id: i,
    type: `Event ${i + 1}`,
    timestamp: new Date(Date.now() - i * 1000 * 60).toLocaleTimeString(),
    details: `Details for event ${i + 1}`,
  }));
};

export const getComments = async () => {
  await new Promise(r => setTimeout(r, 300));
  return Array.from({ length: 300 }, (_, i) => ({
    id: i,
    user: `User${i + 1}`,
    text: `This is comment number ${i + 1}`,
    timestamp: new Date(Date.now() - i * 1000 * 60).toLocaleTimeString(),
    bookmarked: false,
    reactions: { like: 0, love: 0, wow: 0 },
  }));
};

export const addBookmark = async (type: string, id: number) => {
  await new Promise(r => setTimeout(r, 100));
  return { success: true };
};

export const addReaction = async (type: string, id: number, reaction: string) => {
  await new Promise(r => setTimeout(r, 100));
  return { success: true };
};

export const exportAnalytics = async () => {
  await new Promise(r => setTimeout(r, 200));
  return { url: '/mock-export.csv' };
};

export const shareAnalytics = async () => {
  await new Promise(r => setTimeout(r, 200));
  return { url: '/mock-share-link' };
}; 