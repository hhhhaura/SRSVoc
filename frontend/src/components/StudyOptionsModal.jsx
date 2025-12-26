import { useState, useEffect } from 'react';
import { X, Play, HelpCircle } from 'lucide-react';
import Tooltip from './Tooltip';

const StudyOptionsModal = ({ isOpen, onClose, onStart, deckName, dueCount, totalCards, hasClozeCards }) => {
  const [cardMode, setCardMode] = useState('flashcard');
  const [cardsPerSession, setCardsPerSession] = useState(Math.min(dueCount || totalCards || 15, 15));

  // Reset to sensible default when modal opens
  useEffect(() => {
    if (isOpen) {
      // If no cards due, default to min of totalCards or 15
      const defaultCount = dueCount > 0 ? Math.min(dueCount, 15) : Math.min(totalCards, 15);
      setCardsPerSession(defaultCount);
    }
  }, [isOpen, dueCount, totalCards]);

  if (!isOpen) return null;

  const handleStart = () => {
    onStart({
      cardMode,
      cardsPerSession,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-800">Start Study Session</h3>
            <p className="text-sm text-gray-500">{deckName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Study Mode */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <label className="text-sm font-medium text-gray-700">Study Mode</label>
              <Tooltip text="Flashcard: flip to reveal answer. Fill in Blank: type the missing word." position="right">
                <HelpCircle size={14} className="text-gray-400" />
              </Tooltip>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCardMode('flashcard')}
                className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                  cardMode === 'flashcard'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                📇 Flashcard
              </button>
              <button
                onClick={() => setCardMode('cloze')}
                disabled={!hasClozeCards}
                className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                  cardMode === 'cloze'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } ${!hasClozeCards ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                ✏️ Fill in Blank
              </button>
            </div>
            {!hasClozeCards && (
              <p className="text-xs text-gray-400 mt-2">
                Fill in Blank requires cards with example sentences containing *word* markers.
              </p>
            )}
          </div>

          {/* Cards per session */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <label className="text-sm font-medium text-gray-700">Cards to Study</label>
              <Tooltip text="Choose how many cards to review. You can study just the due cards or include more from the full deck." position="right">
                <HelpCircle size={14} className="text-gray-400" />
              </Tooltip>
            </div>
            
            {/* Quick select buttons */}
            <div className="flex gap-2 mb-4">
              {dueCount >= 10 && (
                <button
                  onClick={() => setCardsPerSession(10)}
                  className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
                    cardsPerSession === 10
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Quick (10)
                </button>
              )}
              {dueCount > 0 && (
                <button
                  onClick={() => setCardsPerSession(dueCount)}
                  className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
                    cardsPerSession === dueCount
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Due ({dueCount})
                </button>
              )}
              <button
                onClick={() => setCardsPerSession(totalCards)}
                className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
                  cardsPerSession === totalCards
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                }`}
              >
                Full Deck ({totalCards})
              </button>
            </div>

            {/* Slider for fine-tuning */}
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max={totalCards}
                step="1"
                value={cardsPerSession}
                onChange={(e) => setCardsPerSession(parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="w-16 text-center font-medium text-gray-800 bg-gray-100 px-3 py-2 rounded-lg">
                {cardsPerSession}
              </span>
            </div>
            
            {/* Visual indicator */}
            <div className="mt-2 text-xs text-gray-500">
              {dueCount === 0 ? (
                <span className="text-purple-600">📚 Practice mode: Studying {cardsPerSession} cards</span>
              ) : cardsPerSession <= dueCount ? (
                <span className="text-green-600">📗 Studying {cardsPerSession} of {dueCount} due cards</span>
              ) : (
                <span className="text-purple-600">📚 Studying {cardsPerSession} cards ({dueCount} due + {cardsPerSession - dueCount} extra)</span>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>📊 Due today:</span>
              <span className="font-medium">{dueCount} cards</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>📚 Full deck:</span>
              <span className="font-medium">{totalCards} cards</span>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={handleStart}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            <Play size={20} />
            Start Studying ({cardsPerSession} cards)
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudyOptionsModal;
