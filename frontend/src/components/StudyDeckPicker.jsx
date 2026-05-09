import { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, CheckSquare, Square, MinusSquare } from 'lucide-react';
import { collectDeckIdsInFolderTree } from '../utils/libraryTree';

function countDecksInTree(folder) {
  let n = folder.decks?.length || 0;
  for (const c of folder.children || []) n += countDecksInTree(c);
  return n;
}

function folderSelectionState(folder, selectedDecks) {
  const ids = collectDeckIdsInFolderTree(folder);
  if (ids.length === 0) return 'none';
  const selected = ids.filter((id) => selectedDecks.has(id)).length;
  if (selected === 0) return 'none';
  if (selected === ids.length) return 'all';
  return 'some';
}

const StudyFolderNode = ({
  folder,
  expandedIds,
  toggleExpanded,
  selectedDecks,
  onToggleDeck,
  onToggleFolder,
}) => {
  const isOpen = expandedIds.has(folder.id);
  const fState = folderSelectionState(folder, selectedDecks);

  return (
    <div className="mb-2">
      <div className="flex items-stretch gap-1 bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <button
          type="button"
          onClick={() => onToggleFolder(folder)}
          className="flex items-center justify-center px-2 shrink-0 hover:bg-indigo-50 border-r border-gray-100"
          title={fState === 'all' ? 'Deselect folder' : 'Select entire folder'}
        >
          {fState === 'all' ? (
            <CheckSquare size={20} className="text-indigo-600" />
          ) : fState === 'some' ? (
            <MinusSquare size={20} className="text-indigo-500" />
          ) : (
            <Square size={20} className="text-gray-400" />
          )}
        </button>
        <button
          type="button"
          onClick={() => toggleExpanded(folder.id)}
          className="flex-1 flex items-center gap-2 px-3 py-3 text-left hover:bg-gray-50 min-w-0"
        >
          {isOpen ? (
            <ChevronDown size={18} className="text-gray-400 shrink-0" />
          ) : (
            <ChevronRight size={18} className="text-gray-400 shrink-0" />
          )}
          <Folder size={18} className="text-indigo-600 shrink-0" />
          <span className="font-medium text-gray-800 truncate">{folder.name}</span>
          <span className="text-xs text-gray-400 shrink-0">({countDecksInTree(folder)} decks)</span>
        </button>
      </div>

      {isOpen && (
        <div className="mt-2 ml-4 pl-2 border-l-2 border-indigo-100 space-y-2">
          {(folder.decks || []).map((deck) => (
            <StudyDeckRow
              key={deck.id}
              deck={deck}
              selected={selectedDecks.has(deck.id)}
              onToggle={() => onToggleDeck(deck.id)}
            />
          ))}
          {(folder.children || []).map((child) => (
            <StudyFolderNode
              key={child.id}
              folder={child}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
              selectedDecks={selectedDecks}
              onToggleDeck={onToggleDeck}
              onToggleFolder={onToggleFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const StudyDeckRow = ({ deck, selected, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className={`w-full text-left rounded-xl p-3 transition-all border-2 ${
      selected ? 'border-indigo-500 bg-indigo-50' : 'border-transparent bg-white shadow hover:shadow-md'
    }`}
  >
    <div className="flex items-center gap-3">
      {selected ? (
        <CheckSquare size={18} className="text-indigo-600 shrink-0" />
      ) : (
        <Square size={18} className="text-gray-400 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-800 truncate text-sm">{deck.name}</h3>
        <p className="text-xs text-gray-500">{deck.card_count} cards</p>
      </div>
      {deck.due_count > 0 ? (
        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium shrink-0">
          {deck.due_count} due
        </span>
      ) : (
        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium shrink-0">
          ✓
        </span>
      )}
    </div>
  </button>
);

const StudyDeckPicker = ({
  filteredRootDecks,
  filteredFolders,
  selectedDecks,
  onToggleDeck,
  onToggleRoot,
  onToggleFolder,
}) => {
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const toggleExpanded = (folderId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const rootIds = filteredRootDecks.map((d) => d.id);
  const rootState =
    rootIds.length === 0
      ? 'none'
      : rootIds.every((id) => selectedDecks.has(id))
        ? 'all'
        : rootIds.some((id) => selectedDecks.has(id))
          ? 'some'
          : 'none';

  return (
    <div className="space-y-3 mb-4 max-h-[min(70vh,28rem)] overflow-y-auto pr-1">
      {(filteredRootDecks.length > 0 || filteredFolders.length > 0) && (
        <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-2">
          {filteredRootDecks.length > 0 && (
            <div className="mb-3">
              <div className="flex items-stretch gap-1 bg-white rounded-xl shadow border border-gray-100 mb-2">
                <button
                  type="button"
                  onClick={onToggleRoot}
                  className="flex items-center justify-center px-2 shrink-0 hover:bg-indigo-50 border-r border-gray-100"
                  title={rootState === 'all' ? 'Deselect all root decks' : 'Select all root decks'}
                >
                  {rootState === 'all' ? (
                    <CheckSquare size={20} className="text-indigo-600" />
                  ) : rootState === 'some' ? (
                    <MinusSquare size={20} className="text-indigo-500" />
                  ) : (
                    <Square size={20} className="text-gray-400" />
                  )}
                </button>
                <div className="flex-1 flex items-center gap-2 px-3 py-3 text-left">
                  <Folder size={18} className="text-gray-500 shrink-0" />
                  <span className="font-medium text-gray-800">Root</span>
                  <span className="text-xs text-gray-400">({filteredRootDecks.length} decks)</span>
                </div>
              </div>
              <div className="space-y-2 ml-1">
                {filteredRootDecks.map((deck) => (
                  <StudyDeckRow
                    key={deck.id}
                    deck={deck}
                    selected={selectedDecks.has(deck.id)}
                    onToggle={() => onToggleDeck(deck.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredFolders.map((folder) => (
            <StudyFolderNode
              key={folder.id}
              folder={folder}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
              selectedDecks={selectedDecks}
              onToggleDeck={onToggleDeck}
              onToggleFolder={onToggleFolder}
            />
          ))}
        </div>
      )}

      {filteredRootDecks.length === 0 && filteredFolders.length === 0 && (
        <p className="text-center text-gray-400 py-6 text-sm">
          No decks match this filter. Try &quot;All Decks&quot; if you only see due cards.
        </p>
      )}
    </div>
  );
};

export default StudyDeckPicker;
