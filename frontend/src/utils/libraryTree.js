export const SORT_OPTIONS = {
  NAME_ASC: 'name_asc',
  NAME_DESC: 'name_desc',
  CREATED_DESC: 'created_desc',
  CREATED_ASC: 'created_asc',
  UPDATED_DESC: 'updated_desc'
};

const compareBySort = (a, b, sortBy) => {
  if (sortBy === SORT_OPTIONS.NAME_DESC) return b.name.localeCompare(a.name);
  if (sortBy === SORT_OPTIONS.CREATED_DESC) return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  if (sortBy === SORT_OPTIONS.CREATED_ASC) return new Date(a.created_at || 0) - new Date(b.created_at || 0);
  if (sortBy === SORT_OPTIONS.UPDATED_DESC) return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
  return a.name.localeCompare(b.name);
};

export const sortDecks = (decks = [], sortBy = SORT_OPTIONS.NAME_ASC) =>
  [...decks].sort((a, b) => compareBySort(a, b, sortBy));

export const flattenFolders = (folders = [], prefix = '') => {
  const output = [];
  folders.forEach(folder => {
    const path = prefix ? `${prefix} / ${folder.name}` : folder.name;
    output.push({ ...folder, path });
    output.push(...flattenFolders(folder.children || [], path));
  });
  return output;
};

export const flattenDecksFromTree = (folders = [], sortBy = SORT_OPTIONS.NAME_ASC, prefix = '') => {
  let output = [];
  folders.forEach(folder => {
    const folderPath = prefix ? `${prefix} / ${folder.name}` : folder.name;
    const sortedDecks = sortDecks(folder.decks || [], sortBy).map(deck => ({
      ...deck,
      folderPath
    }));
    output = output.concat(sortedDecks);
    output = output.concat(flattenDecksFromTree(folder.children || [], sortBy, folderPath));
  });
  return output;
};

export const sortFolderTree = (folders = [], sortBy = SORT_OPTIONS.NAME_ASC) =>
  [...folders]
    .map(folder => ({
      ...folder,
      decks: sortDecks(folder.decks || [], sortBy),
      children: sortFolderTree(folder.children || [], sortBy),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
