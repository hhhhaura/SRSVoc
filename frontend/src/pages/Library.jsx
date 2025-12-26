import { useState, useEffect } from 'react';
import { Plus, FolderPlus, Loader2, HelpCircle, X, Folder, Trash2, CheckSquare, Square } from 'lucide-react';
import { getLibrary, createFolder, deleteFolder, createDeck, updateDeck, deleteDeck } from '../api/library';
import FolderSection from '../components/FolderSection';
import DeckCard from '../components/DeckCard';
import BottomNav from '../components/BottomNav';
import Tooltip, { InfoBadge } from '../components/Tooltip';

const Library = () => {
  const [library, setLibrary] = useState({ folders: [], root_decks: [] });
  const [loading, setLoading] = useState(true);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewDeck, setShowNewDeck] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [targetFolderId, setTargetFolderId] = useState(null);
  const [targetFolderName, setTargetFolderName] = useState('');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [movingDeckId, setMovingDeckId] = useState(null);
  const [movingDeckName, setMovingDeckName] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedDecks, setSelectedDecks] = useState(new Set());

  const fetchLibrary = async () => {
    try {
      const data = await getLibrary();
      setLibrary(data);
    } catch (error) {
      console.error('Failed to fetch library:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      await createFolder(newFolderName);
      setNewFolderName('');
      setShowNewFolder(false);
      fetchLibrary();
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!confirm('Delete this folder? Decks will be moved to root.')) return;

    try {
      await deleteFolder(folderId);
      fetchLibrary();
    } catch (error) {
      console.error('Failed to delete folder:', error);
    }
  };

  const handleAddDeckToFolder = (folderId, folderName) => {
    setTargetFolderId(folderId);
    setTargetFolderName(folderName);
    setShowNewDeck(true);
  };

  const handleCreateDeck = async (e) => {
    e.preventDefault();
    if (!newDeckName.trim()) return;

    try {
      await createDeck(newDeckName, targetFolderId);
      setNewDeckName('');
      setShowNewDeck(false);
      setTargetFolderId(null);
      setTargetFolderName('');
      fetchLibrary();
    } catch (error) {
      console.error('Failed to create deck:', error);
    }
  };

  const handleOpenMoveModal = (deckId, deckName) => {
    setMovingDeckId(deckId);
    setMovingDeckName(deckName);
    setShowMoveModal(true);
  };

  const handleMoveDeck = async (folderId) => {
    try {
      await updateDeck(movingDeckId, { folder_id: folderId });
      setShowMoveModal(false);
      setMovingDeckId(null);
      setMovingDeckName('');
      fetchLibrary();
    } catch (error) {
      console.error('Failed to move deck:', error);
    }
  };

  // Batch delete handlers
  const allDecks = [
    ...library.root_decks,
    ...library.folders.flatMap(f => f.decks || [])
  ];

  const toggleDeckSelection = (deckId) => {
    setSelectedDecks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deckId)) {
        newSet.delete(deckId);
      } else {
        newSet.add(deckId);
      }
      return newSet;
    });
  };

  const selectAllDecks = () => {
    setSelectedDecks(new Set(allDecks.map(d => d.id)));
  };

  const deselectAllDecks = () => {
    setSelectedDecks(new Set());
  };

  const handleBatchDeleteDecks = async () => {
    if (selectedDecks.size === 0) return;
    if (!confirm(`Delete ${selectedDecks.size} selected deck(s) and all their cards?`)) return;

    try {
      await Promise.all([...selectedDecks].map(id => deleteDeck(id)));
      setSelectedDecks(new Set());
      setSelectMode(false);
      fetchLibrary();
    } catch (error) {
      console.error('Failed to delete decks:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-800">My Library</h1>
            <Tooltip text="Organize your vocabulary with folders and decks. Click on a deck to view cards and start studying." position="bottom">
              <HelpCircle size={18} className="text-gray-400 hover:text-indigo-500 cursor-help" />
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            {selectMode ? (
              <>
                <button
                  onClick={selectedDecks.size === allDecks.length ? deselectAllDecks : selectAllDecks}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  {selectedDecks.size === allDecks.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  onClick={handleBatchDeleteDecks}
                  disabled={selectedDecks.size === 0}
                  className="flex items-center gap-1 px-3 py-2 bg-red-100 text-red-600 rounded-xl text-sm font-medium hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={16} />
                  Delete ({selectedDecks.size})
                </button>
                <button
                  onClick={() => { setSelectMode(false); setSelectedDecks(new Set()); }}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  <X size={18} />
                </button>
              </>
            ) : (
              <>
                {allDecks.length > 0 && (
                  <button
                    onClick={() => setSelectMode(true)}
                    className="text-sm text-gray-500 hover:text-indigo-600 mr-2"
                  >
                    Select
                  </button>
                )}
                <button
                  onClick={() => setShowNewFolder(true)}
                  className="flex items-center gap-2 bg-indigo-100 text-indigo-600 px-4 py-2 rounded-xl font-medium hover:bg-indigo-200 transition-colors"
                >
                  <FolderPlus size={20} />
                  New Folder
                </button>
              </>
            )}
          </div>
        </div>

        {showNewFolder && (
          <form onSubmit={handleCreateFolder} className="mb-6 bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-gray-700">Create New Folder</span>
              <Tooltip text="Folders help organize your decks by topic or language" position="right">
                <HelpCircle size={14} className="text-gray-400" />
              </Tooltip>
            </div>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g., Spanish, TOEFL, Business English"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none mb-3"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-indigo-600 text-white py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewFolder(false);
                  setNewFolderName('');
                }}
                className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {showNewDeck && (
          <form onSubmit={handleCreateDeck} className="mb-6 bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-gray-700">
                Create New Deck {targetFolderName && <span className="text-indigo-600">in "{targetFolderName}"</span>}
              </span>
              <Tooltip text="Decks contain flashcards. Each deck can have multiple cards to study." position="right">
                <HelpCircle size={14} className="text-gray-400" />
              </Tooltip>
            </div>
            <input
              type="text"
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              placeholder="e.g., Common Verbs, Chapter 1 Vocabulary"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none mb-3"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-indigo-600 text-white py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                Create Deck
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewDeck(false);
                  setNewDeckName('');
                  setTargetFolderId(null);
                  setTargetFolderName('');
                }}
                className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Folders */}
        {library.folders.map(folder => (
          <FolderSection 
            key={folder.id} 
            folder={folder} 
            onDelete={handleDeleteFolder}
            onAddDeck={handleAddDeckToFolder}
            selectMode={selectMode}
            selectedDecks={selectedDecks}
            onToggleSelect={toggleDeckSelection}
          />
        ))}

        {/* Root Decks */}
        {library.root_decks.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-semibold text-gray-700">Decks</h2>
              {library.folders.length > 0 && !selectMode && (
                <span className="text-xs text-gray-400">(click folder icon to organize)</span>
              )}
            </div>
            <div className="space-y-3">
              {library.root_decks.map(deck => (
                <DeckCard 
                  key={deck.id} 
                  deck={deck} 
                  showMoveButton={library.folders.length > 0}
                  onMove={handleOpenMoveModal}
                  selectMode={selectMode}
                  isSelected={selectedDecks.has(deck.id)}
                  onToggleSelect={toggleDeckSelection}
                />
              ))}
            </div>
          </div>
        )}

        {library.folders.length === 0 && library.root_decks.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-4">
              <Plus size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-600">No decks yet</h3>
            <p className="text-gray-400 mt-1">Create your first deck to start learning</p>
          </div>
        )}
      </div>

      {/* Move Deck Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Move "{movingDeckName}"</h3>
              <button
                onClick={() => {
                  setShowMoveModal(false);
                  setMovingDeckId(null);
                  setMovingDeckName('');
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-sm text-gray-500 mb-3">Select a folder:</p>
              
              {/* Move to Root option */}
              <button
                onClick={() => handleMoveDeck(0)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Folder size={20} className="text-gray-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-800">Root (No folder)</div>
                  <div className="text-xs text-gray-400">Move to top level</div>
                </div>
              </button>

              {/* Folder options */}
              {library.folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => handleMoveDeck(folder.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <Folder size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">{folder.name}</div>
                    <div className="text-xs text-gray-400">{folder.decks.length} decks</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Library;
