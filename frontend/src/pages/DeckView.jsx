import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Play, Plus, Trash2, Edit2, Loader2, RotateCcw, BookOpen, HelpCircle, CheckSquare, Square, X } from 'lucide-react';
import { getDeck, getCards, deleteDeck, deleteCard, createCard } from '../api/library';
import { resetDeckProgress } from '../api/study';
import ProgressBar from '../components/ProgressBar';
import BottomNav from '../components/BottomNav';
import Tooltip from '../components/Tooltip';
import ScheduleInfo from '../components/ScheduleInfo';
import SpeakButton from '../components/SpeakButton';
import StudyOptionsModal from '../components/StudyOptionsModal';

const DeckView = () => {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCard, setNewCard] = useState({ word: '', definition: '', example_sentence: '' });
  const [showStudyOptions, setShowStudyOptions] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState(new Set());

  const fetchData = async () => {
    try {
      const [deckData, cardsData] = await Promise.all([
        getDeck(deckId),
        getCards(deckId)
      ]);
      setDeck(deckData);
      setCards(cardsData);
    } catch (error) {
      console.error('Failed to fetch deck:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [deckId]);

  const handleDeleteDeck = async () => {
    if (!confirm('Delete this deck and all its cards?')) return;

    try {
      await deleteDeck(deckId);
      navigate('/');
    } catch (error) {
      console.error('Failed to delete deck:', error);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!confirm('Delete this card?')) return;

    try {
      await deleteCard(cardId);
      fetchData();
    } catch (error) {
      console.error('Failed to delete card:', error);
    }
  };

  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!newCard.word.trim() || !newCard.definition.trim()) return;

    try {
      await createCard(deckId, newCard);
      setNewCard({ word: '', definition: '', example_sentence: '' });
      setShowAddCard(false);
      fetchData();
    } catch (error) {
      console.error('Failed to add card:', error);
    }
  };

  const handleResetProgress = async () => {
    if (!confirm('Reset all progress for this deck? All cards will be marked as new and due for review.')) return;

    try {
      await resetDeckProgress(deckId);
      fetchData();
    } catch (error) {
      console.error('Failed to reset progress:', error);
    }
  };

  const handleStartStudy = (options) => {
    const params = new URLSearchParams();
    params.set('cardMode', options.cardMode);
    params.set('limit', options.cardsPerSession);
    // If no cards due OR user wants more cards than are due, use "all" mode
    const dueCount = deck?.due_count || 0;
    if (dueCount === 0 || options.cardsPerSession > dueCount) {
      params.set('mode', 'all');
    }
    navigate(`/study/${deckId}?${params.toString()}`);
  };

  // Batch delete handlers
  const toggleCardSelection = (cardId) => {
    setSelectedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const selectAllCards = () => {
    setSelectedCards(new Set(cards.map(c => c.id)));
  };

  const deselectAllCards = () => {
    setSelectedCards(new Set());
  };

  const handleBatchDelete = async () => {
    if (selectedCards.size === 0) return;
    if (!confirm(`Delete ${selectedCards.size} selected card(s)?`)) return;

    try {
      await Promise.all([...selectedCards].map(id => deleteCard(id)));
      setSelectedCards(new Set());
      setSelectMode(false);
      fetchData();
    } catch (error) {
      console.error('Failed to delete cards:', error);
    }
  };

  // Check if any cards have cloze markers
  const hasClozeCards = cards.some(card => card.example_sentence?.includes('*'));

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
        <div className="flex items-center gap-4 mb-6">
          <Link to="/" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft size={24} className="text-gray-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-800">{deck?.name}</h1>
            <p className="text-gray-500">{cards.length} cards</p>
          </div>
          <button
            onClick={handleDeleteDeck}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={24} />
          </button>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <Tooltip text="Cards are 'mastered' when their review interval exceeds 3 days. Keep studying to increase mastery!" position="right">
              <HelpCircle size={14} className="text-gray-400" />
            </Tooltip>
          </div>
          <ProgressBar current={deck?.mastered_count || 0} total={deck?.card_count || 0} />
          
          {/* Status indicator */}
          {cards.length > 0 && (
            <div className={`mt-4 mb-3 px-4 py-2 rounded-xl text-sm font-medium text-center ${
              deck?.due_count > 0 
                ? 'bg-red-100 text-red-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              {deck?.due_count > 0 
                ? `📋 ${deck.due_count} cards due for review today`
                : '✓ All caught up! No cards due today.'}
            </div>
          )}

          {/* Practice button - always available */}
          {cards.length > 0 && (
            <button
              onClick={() => setShowStudyOptions(true)}
              className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium transition-colors ${
                deck?.due_count > 0
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Play size={20} />
              {deck?.due_count > 0 ? `Study Now (${deck.due_count} due)` : 'Practice'}
            </button>
          )}
          
          {cards.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <Tooltip text="Reset all cards to 'new' status - useful for starting fresh" position="top">
                <button
                  onClick={handleResetProgress}
                  className="flex items-center justify-center gap-2 w-full text-gray-500 hover:text-orange-600 py-2 text-sm font-medium transition-colors"
                >
                  <RotateCcw size={16} />
                  Reset Progress & Relearn All
                </button>
              </Tooltip>
            </div>
          )}
          
          {/* Schedule Info Link */}
          <div className="mt-3 pt-3 border-t border-gray-100 text-center">
            <ScheduleInfo />
          </div>
        </div>

        {/* Add Card Button */}
        <button
          onClick={() => setShowAddCard(true)}
          className="flex items-center justify-center gap-2 w-full bg-indigo-100 text-indigo-600 py-3 rounded-xl font-medium hover:bg-indigo-200 transition-colors mb-6"
        >
          <Plus size={20} />
          Add Card
        </button>

        {/* Add Card Form */}
        {showAddCard && (
          <form onSubmit={handleAddCard} className="bg-white rounded-xl shadow-lg p-4 mb-6 space-y-3">
            <input
              type="text"
              value={newCard.word}
              onChange={(e) => setNewCard({ ...newCard, word: e.target.value })}
              placeholder="Word (front)"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              autoFocus
            />
            <textarea
              value={newCard.definition}
              onChange={(e) => setNewCard({ ...newCard, definition: e.target.value })}
              placeholder="Definition (back)"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
              rows={2}
            />
            <input
              type="text"
              value={newCard.example_sentence}
              onChange={(e) => setNewCard({ ...newCard, example_sentence: e.target.value })}
              placeholder="Example sentence (use *word* for cloze)"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-indigo-600 text-white py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                Add Card
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddCard(false);
                  setNewCard({ word: '', definition: '', example_sentence: '' });
                }}
                className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Cards List Header with Batch Actions */}
        {cards.length > 0 && (
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-700">Cards ({cards.length})</h3>
            {selectMode ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={selectedCards.size === cards.length ? deselectAllCards : selectAllCards}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  {selectedCards.size === cards.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  onClick={handleBatchDelete}
                  disabled={selectedCards.size === 0}
                  className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={14} />
                  Delete ({selectedCards.size})
                </button>
                <button
                  onClick={() => { setSelectMode(false); setSelectedCards(new Set()); }}
                  className="p-1 text-gray-500 hover:text-gray-700"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSelectMode(true)}
                className="text-sm text-gray-500 hover:text-indigo-600"
              >
                Select
              </button>
            )}
          </div>
        )}

        {/* Cards List */}
        <div className="space-y-3">
          {cards.map(card => (
            <div 
              key={card.id} 
              className={`bg-white rounded-xl shadow p-4 ${selectMode ? 'cursor-pointer' : ''} ${selectedCards.has(card.id) ? 'ring-2 ring-indigo-500' : ''}`}
              onClick={selectMode ? () => toggleCardSelection(card.id) : undefined}
            >
              <div className="flex items-start justify-between">
                {selectMode && (
                  <div className="mr-3 mt-1">
                    {selectedCards.has(card.id) ? (
                      <CheckSquare size={20} className="text-indigo-600" />
                    ) : (
                      <Square size={20} className="text-gray-400" />
                    )}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-800">{card.word}</h3>
                    {!selectMode && <SpeakButton text={card.word} size={16} />}
                  </div>
                  <p className="text-gray-600 text-sm mt-1">{card.definition}</p>
                  {card.example_sentence && (
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-gray-400 text-sm italic">{card.example_sentence.replace(/\*/g, '')}</p>
                      {!selectMode && <SpeakButton text={card.example_sentence.replace(/\*/g, '')} size={14} />}
                    </div>
                  )}
                </div>
                {!selectMode && (
                  <button
                    onClick={() => handleDeleteCard(card.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                <span>Interval: {card.interval} days</span>
                <span>EF: {card.ease_factor.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {cards.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">No cards yet. Add your first card!</p>
          </div>
        )}
      </div>

      {/* Study Options Modal */}
      <StudyOptionsModal
        isOpen={showStudyOptions}
        onClose={() => setShowStudyOptions(false)}
        onStart={handleStartStudy}
        deckName={deck?.name}
        dueCount={deck?.due_count || 0}
        totalCards={cards.length}
        hasClozeCards={hasClozeCards}
      />

      <BottomNav />
    </div>
  );
};

export default DeckView;
