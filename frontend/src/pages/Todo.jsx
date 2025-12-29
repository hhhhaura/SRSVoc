import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, Play, Loader2, CheckSquare, Square, Layers, Sparkles, Eye, EyeOff } from 'lucide-react';
import { getLibrary } from '../api/library';
import BottomNav from '../components/BottomNav';

const Todo = () => {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDecks, setSelectedDecks] = useState(new Set());
  const [showAllDecks, setShowAllDecks] = useState(false);
  const [studyMode, setStudyMode] = useState('due'); // 'due' or 'all'
  const [cardMode, setCardMode] = useState('flashcard'); // 'flashcard', 'cloze', 'cloze-ai'
  const [cardLimit, setCardLimit] = useState(20);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDecks = async () => {
      try {
        const data = await getLibrary();
        // Flatten all decks from folders and root_decks
        const allDecks = [
          ...(data.root_decks || []),
          ...(data.folders || []).flatMap(folder => folder.decks || [])
        ];
        setDecks(allDecks);
      } catch (error) {
        console.error('Failed to fetch library:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDecks();
  }, []);

  // Filter decks based on showAllDecks toggle
  const decksWithCards = decks.filter(deck => deck.card_count > 0);
  const pendingDecks = decksWithCards.filter(deck => deck.due_count > 0);
  const completedDecks = decksWithCards.filter(deck => deck.due_count === 0);
  const displayedDecks = showAllDecks ? decksWithCards : pendingDecks;
  
  const totalDue = pendingDecks.reduce((sum, deck) => sum + deck.due_count, 0);
  const totalCards = decksWithCards.reduce((sum, deck) => sum + deck.card_count, 0);

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

  const selectAllDisplayed = () => {
    setSelectedDecks(new Set(displayedDecks.map(d => d.id)));
  };

  const clearSelection = () => {
    setSelectedDecks(new Set());
  };

  // Calculate selected card counts
  const selectedDueCount = decksWithCards
    .filter(d => selectedDecks.has(d.id))
    .reduce((sum, d) => sum + d.due_count, 0);
  
  const selectedTotalCount = decksWithCards
    .filter(d => selectedDecks.has(d.id))
    .reduce((sum, d) => sum + d.card_count, 0);

  const selectedCardsWithExamplesCount = decksWithCards
    .filter(d => selectedDecks.has(d.id))
    .reduce((sum, d) => sum + (d.cards_with_examples_count || 0), 0);

  // For cloze mode (non-AI), only cards with examples are available
  const isClozeMode = cardMode === 'cloze';
  const effectiveCardCount = isClozeMode 
    ? selectedCardsWithExamplesCount 
    : (studyMode === 'due' ? selectedDueCount : selectedTotalCount);

  const startMultiDeckStudy = () => {
    if (selectedDecks.size === 0) return;
    const deckIdsParam = Array.from(selectedDecks).join(',');
    // Map cardMode to URL params
    const urlCardMode = cardMode === 'cloze-ai' ? 'cloze' : cardMode;
    const aiMode = cardMode === 'cloze-ai' ? '&aiCloze=true' : '';
    navigate(`/study/multi?decks=${deckIdsParam}&mode=${studyMode}&cardMode=${urlCardMode}&limit=${cardLimit}${aiMode}`);
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
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Study</h1>
          <p className="text-gray-500 mt-1">
            {totalDue > 0 
              ? `${totalDue} cards due across ${pendingDecks.length} deck${pendingDecks.length !== 1 ? 's' : ''}`
              : 'All caught up! Practice any deck below.'}
          </p>
        </div>

        {/* Summary Card */}
        <div className={`rounded-xl p-4 mb-6 ${
          totalDue > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
        }`}>
          <div className="flex items-center gap-4">
            {totalDue > 0 ? (
              <>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Clock size={24} className="text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold text-red-700">{totalDue}</p>
                  <p className="text-red-600 text-sm">cards to review</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={24} className="text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold text-green-700">All done!</p>
                  <p className="text-green-600 text-sm">Great job! You can still practice.</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Deck Selection Section */}
        {decksWithCards.length > 0 && (
          <div className="mb-6">
            {/* Section Header with Show All Toggle */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Layers size={18} className="text-indigo-500" />
                Select Decks
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAllDecks(!showAllDecks)}
                  className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${
                    showAllDecks 
                      ? 'bg-indigo-100 text-indigo-700' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {showAllDecks ? <Eye size={14} /> : <EyeOff size={14} />}
                  {showAllDecks ? 'All Decks' : 'Due Only'}
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={selectAllDisplayed}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Deck Selection List */}
            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
              {displayedDecks.map(deck => (
                <button
                  key={deck.id}
                  onClick={() => toggleDeckSelection(deck.id)}
                  className={`w-full text-left bg-white rounded-xl shadow p-3 transition-all border-2 ${
                    selectedDecks.has(deck.id)
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-transparent hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {selectedDecks.has(deck.id) ? (
                      <CheckSquare size={20} className="text-indigo-600 flex-shrink-0" />
                    ) : (
                      <Square size={20} className="text-gray-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-800 truncate text-sm">{deck.name}</h3>
                      <p className="text-xs text-gray-500">{deck.card_count} cards</p>
                    </div>
                    {deck.due_count > 0 ? (
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0">
                        {deck.due_count} due
                      </span>
                    ) : (
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0">
                        ✓
                      </span>
                    )}
                  </div>
                </button>
              ))}
              {displayedDecks.length === 0 && (
                <p className="text-center text-gray-400 py-4 text-sm">
                  {showAllDecks ? 'No decks available' : 'No due cards. Toggle "All Decks" to practice.'}
                </p>
              )}
            </div>

            {/* Study Mode Toggle */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">STUDY MODE</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setStudyMode('due')}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    studyMode === 'due'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  📅 Due Cards
                </button>
                <button
                  onClick={() => setStudyMode('all')}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    studyMode === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  📚 All Cards
                </button>
              </div>
            </div>

            {/* Card Mode Selection */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">CARD MODE</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setCardMode('flashcard')}
                  className={`py-2 px-2 rounded-lg text-sm font-medium transition-all ${
                    cardMode === 'flashcard'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  📇 Flip
                </button>
                <button
                  onClick={() => setCardMode('cloze')}
                  disabled={selectedCardsWithExamplesCount === 0 && selectedDecks.size > 0}
                  className={`py-2 px-2 rounded-lg text-sm font-medium transition-all ${
                    cardMode === 'cloze'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  } ${selectedCardsWithExamplesCount === 0 && selectedDecks.size > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  ✏️ Cloze
                </button>
                <button
                  onClick={() => setCardMode('cloze-ai')}
                  className={`py-2 px-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1 ${
                    cardMode === 'cloze-ai'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <Sparkles size={14} />
                  AI
                </button>
              </div>
              {cardMode === 'cloze' && selectedDecks.size > 0 && (
                <p className="text-xs text-green-600 mt-2">
                  {selectedCardsWithExamplesCount} cards with examples available
                </p>
              )}
              {selectedCardsWithExamplesCount === 0 && selectedDecks.size > 0 && cardMode !== 'cloze-ai' && cardMode !== 'flashcard' && (
                <p className="text-xs text-gray-400 mt-2">
                  No cards with examples in selected decks
                </p>
              )}
            </div>

            {/* Card Limit Slider */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500">CARDS PER SESSION</p>
                <span className="text-sm font-semibold text-indigo-600">
                  {cardLimit === 0 || cardLimit >= effectiveCardCount ? 'All' : cardLimit} 
                  <span className="text-gray-400 font-normal"> / {effectiveCardCount}</span>
                </span>
              </div>
              <input
                type="range"
                min="1"
                max={Math.max(effectiveCardCount, 1)}
                value={cardLimit === 0 ? effectiveCardCount : Math.min(cardLimit, effectiveCardCount)}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setCardLimit(val >= effectiveCardCount ? 0 : val);
                }}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1</span>
                <span>{effectiveCardCount}</span>
              </div>
            </div>

            {/* Start Study Button */}
            <button
              onClick={startMultiDeckStudy}
              disabled={selectedDecks.size === 0}
              className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all ${
                selectedDecks.size > 0
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Play size={24} />
              {selectedDecks.size > 0 
                ? `Start Study (${cardLimit === 0 ? effectiveCardCount : Math.min(cardLimit, effectiveCardCount)} cards)`
                : 'Select decks to study'}
            </button>
          </div>
        )}

        {/* Empty state */}
        {decksWithCards.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No decks yet. Create your first deck to start learning!</p>
            <Link
              to="/"
              className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              Go to Library
            </Link>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Todo;
