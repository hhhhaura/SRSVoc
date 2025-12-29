import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Play, Plus, Trash2, Edit2, Loader2, RotateCcw, BookOpen, HelpCircle, CheckSquare, Square, X, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { getDeck, getCards, deleteDeck, deleteCard, createCard, updateCard } from '../api/library';
import { resetDeckProgress, generateAIExamples, generateAIDefinition, generateAISynonyms } from '../api/study';
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
  const [newCard, setNewCard] = useState({ word: '', definition: '', synonymsText: '', examples: [] });
  const [showStudyOptions, setShowStudyOptions] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [editingCard, setEditingCard] = useState(null);
  const [editForm, setEditForm] = useState({
    word: '',
    definition: '',
    synonymsText: '',
    examples: []
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDefLoading, setAiDefLoading] = useState(false);
  const [aiSynLoading, setAiSynLoading] = useState(false);

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

    const synonyms = newCard.synonymsText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const examples = newCard.examples
      .map(ex => ({
        sentence: (ex.sentence || '').trim(),
        translation: (ex.translation || '').trim() || null
      }))
      .filter(ex => ex.sentence);

    try {
      await createCard(deckId, {
        word: newCard.word.trim(),
        definition: newCard.definition.trim(),
        synonyms: synonyms.length > 0 ? synonyms : null,
        examples: examples.length > 0 ? examples : null
      });
      setNewCard({ word: '', definition: '', synonymsText: '', examples: [] });
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
    // Handle AI cloze mode
    const urlCardMode = options.cardMode === 'cloze-ai' ? 'cloze' : options.cardMode;
    params.set('cardMode', urlCardMode);
    if (options.cardMode === 'cloze-ai') {
      params.set('aiCloze', 'true');
    }
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
  const hasClozeCards = cards.some(card => card.examples?.some(ex => ex.sentence?.includes('*')));

  const toggleCardExpand = (cardId) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const openEditModal = (card) => {
    setEditingCard(card);
    setEditForm({
      word: card.word || '',
      definition: card.definition || '',
      synonymsText: (card.synonyms || []).join(', '),
      examples: (card.examples || []).map(ex => ({
        sentence: ex?.sentence || '',
        translation: ex?.translation || ''
      }))
    });
  };

  const closeEditModal = () => {
    setEditingCard(null);
    setEditForm({ word: '', definition: '', synonymsText: '', examples: [] });
  };

  const updateExampleField = (index, field, value) => {
    setEditForm(prev => {
      const nextExamples = [...prev.examples];
      nextExamples[index] = { ...nextExamples[index], [field]: value };
      return { ...prev, examples: nextExamples };
    });
  };

  const addExampleRow = () => {
    setEditForm(prev => ({
      ...prev,
      examples: [...prev.examples, { sentence: '', translation: '' }]
    }));
  };

  const removeExampleRow = (index) => {
    setEditForm(prev => ({
      ...prev,
      examples: prev.examples.filter((_, i) => i !== index)
    }));
  };

  const handleSaveEdit = async (e) => {
    e?.preventDefault?.();
    if (!editingCard) return;
    if (!editForm.word.trim() || !editForm.definition.trim()) return;

    const synonyms = editForm.synonymsText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const examples = editForm.examples
      .map(ex => ({
        sentence: (ex.sentence || '').trim(),
        translation: (ex.translation || '').trim() || null
      }))
      .filter(ex => ex.sentence);

    try {
      await updateCard(editingCard.id, {
        word: editForm.word.trim(),
        definition: editForm.definition.trim(),
        synonyms: synonyms.length > 0 ? synonyms : null,
        examples: examples.length > 0 ? examples : null
      });
      closeEditModal();
      fetchData();
    } catch (error) {
      console.error('Failed to update card:', error);
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
              placeholder="Word"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              autoFocus
            />
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">Meaning</span>
                <button
                  type="button"
                  onClick={async () => {
                    if (!newCard.word.trim()) return;
                    setAiDefLoading(true);
                    try {
                      const result = await generateAIDefinition(newCard.word.trim());
                      if (result?.definition) {
                        setNewCard(prev => ({ ...prev, definition: result.definition }));
                      }
                    } catch (error) {
                      console.error('AI definition generation failed:', error);
                      alert('Failed to generate definition. Please try again.');
                    } finally {
                      setAiDefLoading(false);
                    }
                  }}
                  disabled={aiDefLoading || !newCard.word.trim()}
                  className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 disabled:text-gray-400"
                >
                  {aiDefLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  AI Generate
                </button>
              </div>
              <textarea
                value={newCard.definition}
                onChange={(e) => setNewCard({ ...newCard, definition: e.target.value })}
                placeholder="Meaning"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                rows={2}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">Synonyms (comma-separated)</span>
                <button
                  type="button"
                  onClick={async () => {
                    if (!newCard.word.trim() || !newCard.definition.trim()) return;
                    setAiSynLoading(true);
                    try {
                      const result = await generateAISynonyms(newCard.word.trim(), newCard.definition.trim());
                      if (result?.synonyms && result.synonyms.length > 0) {
                        setNewCard(prev => ({ ...prev, synonymsText: result.synonyms.join(', ') }));
                      }
                    } catch (error) {
                      console.error('AI synonyms generation failed:', error);
                      alert('Failed to generate synonyms. Please try again.');
                    } finally {
                      setAiSynLoading(false);
                    }
                  }}
                  disabled={aiSynLoading || !newCard.word.trim() || !newCard.definition.trim()}
                  className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 disabled:text-gray-400"
                >
                  {aiSynLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  AI Generate
                </button>
              </div>
              <input
                type="text"
                value={newCard.synonymsText}
                onChange={(e) => setNewCard({ ...newCard, synonymsText: e.target.value })}
                placeholder="syn1, syn2"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
            
            {/* Examples */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Examples</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newCard.word.trim() || !newCard.definition.trim()) return;
                      setAiLoading(true);
                      try {
                        const result = await generateAIExamples(newCard.word.trim(), newCard.definition.trim());
                        if (result?.examples && result.examples.length > 0) {
                          setNewCard(prev => ({
                            ...prev,
                            examples: [
                              ...prev.examples,
                              ...result.examples.map(ex => ({
                                sentence: ex.sentence || '',
                                translation: ex.translation || ''
                              }))
                            ]
                          }));
                        }
                      } catch (error) {
                        console.error('AI generation failed:', error);
                        alert('Failed to generate examples. Please try again.');
                      } finally {
                        setAiLoading(false);
                      }
                    }}
                    disabled={aiLoading || !newCard.word.trim() || !newCard.definition.trim()}
                    className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 disabled:text-gray-400"
                  >
                    {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    AI Generate
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCard({ ...newCard, examples: [...newCard.examples, { sentence: '', translation: '' }] })}
                    className="text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    + Add example
                  </button>
                </div>
              </div>
              {newCard.examples.map((ex, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Example {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => setNewCard({ ...newCard, examples: newCard.examples.filter((_, i) => i !== idx) })}
                      className="text-xs text-gray-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    value={ex.sentence}
                    onChange={(e) => {
                      const updated = [...newCard.examples];
                      updated[idx] = { ...updated[idx], sentence: e.target.value };
                      setNewCard({ ...newCard, examples: updated });
                    }}
                    placeholder="Sentence (wrap target with *word*)"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                  <input
                    type="text"
                    value={ex.translation}
                    onChange={(e) => {
                      const updated = [...newCard.examples];
                      updated[idx] = { ...updated[idx], translation: e.target.value };
                      setNewCard({ ...newCard, examples: updated });
                    }}
                    placeholder="Chinese translation (optional)"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>
              ))}
              {newCard.examples.length === 0 && (
                <p className="text-sm text-gray-400">No examples yet.</p>
              )}
            </div>

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
                  setNewCard({ word: '', definition: '', synonymsText: '', examples: [] });
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
          {cards.map(card => {
            const isExpanded = expandedCards.has(card.id);
            const hasDetails = (card.synonyms && card.synonyms.length > 0) || (card.examples && card.examples.length > 0);
            
            return (
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
                    
                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                        {card.examples && card.examples.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-gray-500 text-sm font-medium">Examples:</span>
                            {card.examples.map((ex, idx) => (
                              <div key={idx} className="pl-3 border-l-2 border-indigo-200">
                                <div className="flex items-center gap-2">
                                  <p className="text-gray-600 text-sm">{ex.sentence?.replace(/\*/g, '')}</p>
                                  <SpeakButton text={ex.sentence?.replace(/\*/g, '')} size={14} />
                                </div>
                                {ex.translation && (
                                  <p className="text-indigo-600 text-xs mt-1">{ex.translation}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {card.synonyms && card.synonyms.length > 0 && (
                          <p className="text-gray-500 text-sm">
                            <span className="font-medium">Synonyms:</span> {card.synonyms.join(', ')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {!selectMode && (
                    <div className="flex flex-col items-end gap-1">
                      {hasDetails && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCardExpand(card.id);
                          }}
                          className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                          aria-label={isExpanded ? 'Hide details' : 'Show details'}
                        >
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(card);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-700 transition-colors"
                        aria-label="Edit card"
                      >
                        <Edit2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                  <div className="flex items-center gap-4">
                    <span>Interval: {card.interval} days</span>
                    <span>EF: {card.ease_factor.toFixed(2)}</span>
                  </div>
                  {!selectMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCard(card.id);
                      }}
                      className="p-2 -my-2 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Delete card"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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

      {/* Edit Card Modal */}
      {editingCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Edit Card</h3>
              <button
                onClick={closeEditModal}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                aria-label="Close"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Word</label>
                <input
                  type="text"
                  value={editForm.word}
                  onChange={(e) => setEditForm(prev => ({ ...prev, word: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  autoFocus
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Meaning</label>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!editForm.word.trim()) return;
                      setAiDefLoading(true);
                      try {
                        const result = await generateAIDefinition(editForm.word.trim());
                        if (result?.definition) {
                          setEditForm(prev => ({ ...prev, definition: result.definition }));
                        }
                      } catch (error) {
                        console.error('AI definition generation failed:', error);
                        alert('Failed to generate definition. Please try again.');
                      } finally {
                        setAiDefLoading(false);
                      }
                    }}
                    disabled={aiDefLoading || !editForm.word.trim()}
                    className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 disabled:text-gray-400"
                  >
                    {aiDefLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    AI Generate
                  </button>
                </div>
                <textarea
                  value={editForm.definition}
                  onChange={(e) => setEditForm(prev => ({ ...prev, definition: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                  rows={2}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Synonyms (comma-separated)</label>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!editForm.word.trim() || !editForm.definition.trim()) return;
                      setAiSynLoading(true);
                      try {
                        const result = await generateAISynonyms(editForm.word.trim(), editForm.definition.trim());
                        if (result?.synonyms && result.synonyms.length > 0) {
                          setEditForm(prev => ({ ...prev, synonymsText: result.synonyms.join(', ') }));
                        }
                      } catch (error) {
                        console.error('AI synonyms generation failed:', error);
                        alert('Failed to generate synonyms. Please try again.');
                      } finally {
                        setAiSynLoading(false);
                      }
                    }}
                    disabled={aiSynLoading || !editForm.word.trim() || !editForm.definition.trim()}
                    className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 disabled:text-gray-400"
                  >
                    {aiSynLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    AI Generate
                  </button>
                </div>
                <input
                  type="text"
                  value={editForm.synonymsText}
                  onChange={(e) => setEditForm(prev => ({ ...prev, synonymsText: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="syn1, syn2"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Examples</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!editForm.word.trim() || !editForm.definition.trim()) return;
                        setAiLoading(true);
                        try {
                          const result = await generateAIExamples(editForm.word.trim(), editForm.definition.trim());
                          if (result?.examples && result.examples.length > 0) {
                            setEditForm(prev => ({
                              ...prev,
                              examples: [
                                ...prev.examples,
                                ...result.examples.map(ex => ({
                                  sentence: ex.sentence || '',
                                  translation: ex.translation || ''
                                }))
                              ]
                            }));
                          }
                        } catch (error) {
                          console.error('AI generation failed:', error);
                          alert('Failed to generate examples. Please try again.');
                        } finally {
                          setAiLoading(false);
                        }
                      }}
                      disabled={aiLoading || !editForm.word.trim() || !editForm.definition.trim()}
                      className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 disabled:text-gray-400"
                    >
                      {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      AI Generate
                    </button>
                    <button
                      type="button"
                      onClick={addExampleRow}
                      className="text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      + Add example
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {editForm.examples.map((ex, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">Example {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeExampleRow(idx)}
                          className="text-xs text-gray-500 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                      <input
                        type="text"
                        value={ex.sentence}
                        onChange={(e) => updateExampleField(idx, 'sentence', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        placeholder="Sentence (wrap target with *word*)"
                      />
                      <input
                        type="text"
                        value={ex.translation}
                        onChange={(e) => updateExampleField(idx, 'translation', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        placeholder="Chinese translation (optional)"
                      />
                    </div>
                  ))}

                  {editForm.examples.length === 0 && (
                    <div className="text-sm text-gray-400">No examples yet.</div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={!editForm.word.trim() || !editForm.definition.trim()}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:bg-indigo-400"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default DeckView;
