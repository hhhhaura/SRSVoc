import { useState, useMemo, useEffect } from 'react';
import SpeakButton from './SpeakButton';
import { useSettings } from '../context/SettingsContext';
import { Loader2, Sparkles } from 'lucide-react';

// Cache for stable random example selection (non-AI mode)
const stableExampleCache = new Map(); // cardId -> selectedExample

const ClozeCard = ({ examples, word, definition, synonyms, onResult, cardId, aiExample: prefetchedAiExample, aiLoading: externalAiLoading }) => {
  const { settings } = useSettings();
  
  // Compute stable card key
  const stableCardId = cardId || `${word}-${definition}`;
  
  // Pick example: AI-generated if provided, otherwise random from stored examples
  const selectedExample = useMemo(() => {
    // If we have a pre-fetched AI example, use it
    if (prefetchedAiExample) {
      return prefetchedAiExample;
    }
    
    // Non-AI mode: use stable cached selection from stored examples
    if (!examples || examples.length === 0) return null;
    
    if (stableExampleCache.has(stableCardId)) {
      return stableExampleCache.get(stableCardId);
    }
    
    // Pick random and cache it
    const randomIndex = Math.floor(Math.random() * examples.length);
    const selected = examples[randomIndex];
    stableExampleCache.set(stableCardId, selected);
    return selected;
  }, [examples, prefetchedAiExample, stableCardId]);
  
  const sentence = selectedExample?.sentence || '';
  const translation = selectedExample?.translation || '';
  const [userInputs, setUserInputs] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState({});

  // Parse cloze deletion: find text between asterisks
  const parsed = useMemo(() => {
    if (!sentence) return { parts: [], answers: [] };
    
    const regex = /\*([^*]+)\*/g;
    const matches = [];
    let match;
    let lastIndex = 0;
    const parts = [];
    let clozeIndex = 0;

    while ((match = regex.exec(sentence)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: sentence.slice(lastIndex, match.index) });
      }
      const answer = match[1];
      const firstLetter = settings.showFirstLetterHint ? answer.charAt(0) : '';
      parts.push({ type: 'cloze', content: answer, index: clozeIndex, firstLetter });
      matches.push({ answer, index: clozeIndex, firstLetter });
      clozeIndex++;
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < sentence.length) {
      parts.push({ type: 'text', content: sentence.slice(lastIndex) });
    }

    return { parts, answers: matches };
  }, [sentence, settings.showFirstLetterHint]);

  // Reset state when sentence changes (new card)
  useEffect(() => {
    setUserInputs({});
    setSubmitted(false);
    setResults({});
  }, [sentence]);

  const handleInputChange = (index, value) => {
    // Filter out asterisks from input
    const cleanValue = value.replace(/\*/g, '');
    setUserInputs(prev => ({ ...prev, [index]: cleanValue }));
  };

  const handleSubmit = () => {
    const newResults = {};
    let allCorrect = true;

    parsed.answers.forEach(({ answer, index }) => {
      const userAnswer = (userInputs[index] || '').toLowerCase().trim();
      const correct = answer.toLowerCase().trim() === userAnswer;
      newResults[index] = correct;
      if (!correct) allCorrect = false;
    });

    setResults(newResults);
    setSubmitted(true);
    // Notify parent of result
    if (onResult) {
      onResult(allCorrect);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !submitted) {
      handleSubmit();
    }
  };

  const allFilled = parsed.answers.every(({ index }) => (userInputs[index] || '').trim());

  // Show loading state for AI gen mode (external loading from parent)
  if (externalAiLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="animate-spin text-purple-600 mb-4" size={40} />
          <p className="text-gray-600 flex items-center gap-2">
            <Sparkles size={16} className="text-purple-600" />
            Generating AI examples for session...
          </p>
        </div>
      </div>
    );
  }

  // No example available - show fallback with word/definition
  if (!sentence || parsed.answers.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-4">
          <p className="text-amber-600 text-sm mb-4">No cloze example available for this card</p>
          {word && definition && (
            <div className="text-left border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl font-bold text-gray-800">{word}</span>
                <SpeakButton text={word} size={18} />
              </div>
              <p className="text-gray-600">{definition}</p>
              {synonyms && synonyms.length > 0 && (
                <p className="text-gray-500 text-sm mt-1">Synonyms: {synonyms.join(', ')}</p>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => onResult && onResult(true)}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors mt-4"
        >
          Continue →
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* AI Gen Mode indicator */}
      {prefetchedAiExample && (
        <div className="flex items-center gap-1 text-purple-600 text-xs mb-3">
          <Sparkles size={12} />
          <span>AI Generated</span>
        </div>
      )}
      <div className="text-lg leading-relaxed mb-6">
        {parsed.parts.map((part, idx) => (
          part.type === 'text' ? (
            <span key={idx}>{part.content}</span>
          ) : (
            <span key={idx} className="inline-block mx-1">
              {submitted ? (
                <span className={`font-bold ${results[part.index] ? 'text-green-600' : 'text-red-600'}`}>
                  {part.content}
                  {!results[part.index] && userInputs[part.index] && (
                    <span className="text-gray-400 line-through ml-1">({userInputs[part.index]})</span>
                  )}
                </span>
              ) : (
                <input
                  type="text"
                  value={userInputs[part.index] || ''}
                  onChange={(e) => handleInputChange(part.index, e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="border-b-2 border-indigo-400 bg-transparent outline-none text-center font-medium w-32 focus:border-indigo-600"
                  placeholder={settings.showFirstLetterHint ? `${part.firstLetter}...` : '...'}
                  autoFocus={part.index === 0}
                />
              )}
            </span>
          )
        ))}
      </div>

      {/* Show translation if enabled */}
      {settings.showClozeTranslation && translation && (
        <p className="text-indigo-600 text-lg mb-4 italic">{translation}</p>
      )}

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={!allFilled}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Check Answer
        </button>
      ) : (
        <>
          <div className={`text-center py-3 rounded-xl font-medium ${
            Object.values(results).every(r => r) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {Object.values(results).every(r => r) 
              ? '✓ Correct!' 
              : `✗ Some answers were wrong`}
          </div>
          
          {/* Show word and definition after attempt */}
          {word && definition && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl font-bold text-gray-800">{word}</span>
                <SpeakButton text={word} size={18} />
              </div>
              <p className="text-gray-600">{definition}</p>
              {synonyms && synonyms.length > 0 && (
                <p className="text-gray-500 text-sm mt-1">Synonyms: {synonyms.join(', ')}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ClozeCard;
