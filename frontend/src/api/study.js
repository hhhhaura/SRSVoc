import api from './axios';

export const getStudyCards = async (deckId, mode = 'due', limit = 15) => {
  const response = await api.get(`/study/${deckId}`, { params: { mode, limit } });
  return response.data;
};

export const reviewCard = async (cardId, quality) => {
  const response = await api.post(`/study/${cardId}/review`, { quality });
  return response.data;
};

export const resetDeckProgress = async (deckId) => {
  const response = await api.post(`/study/${deckId}/reset`);
  return response.data;
};

export const importCards = async (deckId, cards) => {
  const response = await api.post('/import', { deck_id: deckId, cards });
  return response.data;
};

export const importCardsCSV = async (deckId, csvData) => {
  const response = await api.post('/import/csv', { deck_id: deckId, csv_data: csvData });
  return response.data;
};

export const getMultiDeckStudyCards = async (deckIds, mode = 'due', limit = 15) => {
  const response = await api.post('/study/multi', { deck_ids: deckIds, mode, limit });
  return response.data;
};

export const generateAIExamples = async (word, definition) => {
  const response = await api.post('/ai/generate-examples', { word, definition });
  return response.data;
};

export const generateAIDefinition = async (word) => {
  const response = await api.post('/ai/generate-definition', { word });
  return response.data;
};

export const generateAISynonyms = async (word, definition) => {
  const response = await api.post('/ai/generate-synonyms', { word, definition });
  return response.data;
};

export const generateAIExamplesBatch = async (cards) => {
  // cards: [{card_id, word, definition}, ...]
  const response = await api.post('/ai/generate-examples-batch', { cards });
  return response.data;
};
