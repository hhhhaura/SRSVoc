import { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, Trash2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import DeckCard from './DeckCard';
import Tooltip from './Tooltip';

const FolderSection = ({ folder, onDelete, onAddDeck, selectMode = false, selectedDecks = new Set(), onToggleSelect }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="mb-4">
      <div 
        className="flex items-center justify-between bg-white rounded-xl shadow px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          {isOpen ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
          <Folder size={20} className="text-indigo-600" />
          <span className="font-medium text-gray-800">{folder.name}</span>
          <span className="text-sm text-gray-400">({folder.decks.length} decks)</span>
        </div>
        {!selectMode && (
          <div className="flex items-center gap-1">
            <Tooltip text="Add a new deck to this folder" position="top">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddDeck(folder.id, folder.name);
                }}
                className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
              >
                <Plus size={18} />
              </button>
            </Tooltip>
            <Tooltip text="Delete folder (decks move to root)" position="top">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(folder.id);
                }}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </Tooltip>
          </div>
        )}
      </div>
      
      {isOpen && (
        <div className="mt-2 ml-6 space-y-3">
          {folder.decks.length > 0 ? (
            folder.decks.map(deck => (
              <DeckCard 
                key={deck.id} 
                deck={deck}
                selectMode={selectMode}
                isSelected={selectedDecks.has(deck.id)}
                onToggleSelect={onToggleSelect}
              />
            ))
          ) : (
            <div className="text-center py-4 text-gray-400 text-sm bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              No decks yet. Click + to add one.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FolderSection;
