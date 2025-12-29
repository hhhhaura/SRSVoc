import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Check, HelpCircle, Sparkles } from 'lucide-react';
import { getMultiDeckStudyCards, reviewCard } from '../api/study';
import FlipCard from '../components/FlipCard';
import ClozeCard from '../components/ClozeCard';
import Tooltip from '../components/Tooltip';
import { useSettings } from '../context/SettingsContext';

const MultiDeckStudy = () => {
  const [searchParams] = useSearchParams();
  const deckIdsParam = searchParams.get('decks') || '';
  const studyMode = searchParams.get('mode') || 'due';
  const preferredCardMode = searchParams.get('cardMode') || 'flashcard';
  const limitParam = searchParams.get('limit');
  const aiClozeParam = searchParams.get('aiCloze') === 'true';
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [cardMode, setCardMode] = useState(preferredCardMode);
  const [completed, setCompleted] = useState(false);
  const [clozeResult, setClozeResult] = useState(null);

  const deckIds = deckIdsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));

  // Temporarily enable AI cloze mode if requested via URL param
  useEffect(() => {
    if (aiClozeParam && !settings.clozeAIGenMode) {
      updateSettings({ clozeAIGenMode: true });
    }
  }, [aiClozeParam]);

  useEffect(() => {
    const fetchCards = async () => {
      if (deckIds.length === 0) {
        navigate('/');
        return;
      }

      try {
        const limit = limitParam ? parseInt(limitParam) : 20;
        const data = await getMultiDeckStudyCards(deckIds, studyMode, limit);
        setCards(data);
        if (data.length === 0) {
          setCompleted(true);
        }
      } catch (error) {
        console.error('Failed to fetch study cards:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, [deckIdsParam, studyMode, limitParam]);

  const currentCard = cards[currentIndex];
  const hasCloze = currentCard?.examples?.some(ex => ex.sentence?.includes('*'));

  const handleFlip = (flipped) => {
    setIsFlipped(flipped);
    if (flipped) {
      setShowRating(true);
    }
  };

  const handleClozeResult = (correct) => {
    setClozeResult(correct);
    if (correct) {
      setShowRating(true);
    }
  };

  const handleClozeNext = async () => {
    try {
      await reviewCard(currentCard.id, 0);
      moveToNextCard();
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  const moveToNextCard = useCallback(() => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      setShowRating(false);
      setClozeResult(null);
    } else {
      setCompleted(true);
    }
  }, [currentIndex, cards.length]);

  const handleRating = async (quality) => {
    try {
      let effectiveQuality = quality;
      if (cardMode === 'cloze' && quality > 0) {
        effectiveQuality = Math.min(5, Math.round(quality * settings.clozeScoreMultiplier));
      }
      
      await reviewCard(currentCard.id, effectiveQuality);
      moveToNextCard();
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <Check size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Session Complete!</h2>
          <p className="text-gray-500 mb-6">
            {cards.length > 0 
              ? `You reviewed ${cards.length} cards from ${deckIds.length} decks`
              : 'No cards due for review'}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft size={24} className="text-gray-600" />
          </Link>
          <div className="text-center">
            <span className="text-lg font-semibold text-gray-800">
              {currentIndex + 1} / {cards.length}
            </span>
          </div>
          <div className="w-10" />
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div
            className="bg-indigo-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          />
        </div>

        {/* Multi-deck indicator */}
        <div className="bg-purple-100 text-purple-700 px-4 py-2 rounded-xl text-sm font-medium text-center mb-4">
          📚 Multi-Deck Study - {deckIds.length} decks combined
        </div>

        {/* Current Mode Indicator */}
        <div className={`px-4 py-2 rounded-xl text-sm font-medium text-center mb-4 flex items-center justify-center gap-2 ${
          aiClozeParam ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
        }`}>
          {cardMode === 'flashcard' ? (
            '📇 Flashcard Mode'
          ) : aiClozeParam ? (
            <><Sparkles size={16} /> AI Cloze Mode</>
          ) : (
            '✏️ Fill in Blank Mode'
          )}
        </div>

        {/* Card Display */}
        <div className="mb-6 relative z-0">
          {cardMode === 'flashcard' ? (
            <FlipCard
              key={currentCard.id}
              front={currentCard.word}
              back={currentCard.definition}
              examples={currentCard.examples}
              synonyms={currentCard.synonyms}
              onFlip={handleFlip}
            />
          ) : (
            <ClozeCard
              key={currentCard.id}
              examples={currentCard.examples}
              word={currentCard.word}
              definition={currentCard.definition}
              synonyms={currentCard.synonyms}
              onResult={handleClozeResult}
            />
          )}
        </div>

        {/* Next button for wrong cloze answers */}
        {cardMode === 'cloze' && clozeResult === false && (
          <button
            onClick={handleClozeNext}
            className="w-full bg-gray-600 text-white py-3 rounded-xl font-medium hover:bg-gray-700 transition-colors"
          >
            Next →
          </button>
        )}

        {/* Rating Buttons */}
        {showRating && (cardMode === 'flashcard' || (cardMode === 'cloze' && clozeResult === true)) && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <p className="text-gray-500 text-sm">How well did you know this?</p>
              <Tooltip text="Your rating affects when you'll see this card again." position="top">
                <HelpCircle size={14} className="text-gray-400" />
              </Tooltip>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Tooltip text="Didn't know it - review again soon" position="bottom">
                <button
                  onClick={() => handleRating(0)}
                  className="w-full bg-red-100 text-red-700 py-3 rounded-xl font-medium hover:bg-red-200 transition-colors"
                >
                  Forgot
                </button>
              </Tooltip>
              <Tooltip text="Struggled to recall - short interval" position="bottom">
                <button
                  onClick={() => handleRating(3)}
                  className="w-full bg-yellow-100 text-yellow-700 py-3 rounded-xl font-medium hover:bg-yellow-200 transition-colors"
                >
                  Hard
                </button>
              </Tooltip>
              <Tooltip text="Recalled correctly - normal interval" position="bottom">
                <button
                  onClick={() => handleRating(4)}
                  className="w-full bg-blue-100 text-blue-700 py-3 rounded-xl font-medium hover:bg-blue-200 transition-colors"
                >
                  Good
                </button>
              </Tooltip>
              <Tooltip text="Knew it instantly - longer interval" position="bottom">
                <button
                  onClick={() => handleRating(5)}
                  className="w-full bg-green-100 text-green-700 py-3 rounded-xl font-medium hover:bg-green-200 transition-colors"
                >
                  Easy
                </button>
              </Tooltip>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiDeckStudy;
