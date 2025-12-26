import api from './axios';

// Library
export const getLibrary = async () => {
  const response = await api.get('/library');
  return response.data;
};

// Folders
export const createFolder = async (name) => {
  const response = await api.post('/library/folders', { name });
  return response.data;
};

export const updateFolder = async (folderId, name) => {
  const response = await api.put(`/library/folders/${folderId}`, { name });
  return response.data;
};

export const deleteFolder = async (folderId) => {
  const response = await api.delete(`/library/folders/${folderId}`);
  return response.data;
};

// Decks
export const createDeck = async (name, folderId = null) => {
  const response = await api.post('/library/decks', { name, folder_id: folderId });
  return response.data;
};

export const getDeck = async (deckId) => {
  const response = await api.get(`/library/decks/${deckId}`);
  return response.data;
};

export const updateDeck = async (deckId, data) => {
  const response = await api.put(`/library/decks/${deckId}`, data);
  return response.data;
};

export const deleteDeck = async (deckId) => {
  const response = await api.delete(`/library/decks/${deckId}`);
  return response.data;
};

// Cards
export const getCards = async (deckId) => {
  const response = await api.get(`/library/decks/${deckId}/cards`);
  return response.data;
};

export const createCard = async (deckId, cardData) => {
  const response = await api.post(`/library/decks/${deckId}/cards`, cardData);
  return response.data;
};

export const updateCard = async (cardId, cardData) => {
  const response = await api.put(`/library/cards/${cardId}`, cardData);
  return response.data;
};

export const deleteCard = async (cardId) => {
  const response = await api.delete(`/library/cards/${cardId}`);
  return response.data;
};
