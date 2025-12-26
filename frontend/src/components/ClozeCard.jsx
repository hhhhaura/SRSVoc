import { useState, useMemo, useEffect } from 'react';
import SpeakButton from './SpeakButton';

const ClozeCard = ({ sentence, word, definition, onAnswer }) => {
  const [userInputs, setUserInputs] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState({});

  // Parse cloze deletion: find text between asterisks
  const parsed = useMemo(() => {
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
      parts.push({ type: 'cloze', content: match[1], index: clozeIndex });
      matches.push({ answer: match[1], index: clozeIndex });
      clozeIndex++;
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < sentence.length) {
      parts.push({ type: 'text', content: sentence.slice(lastIndex) });
    }

    return { parts, answers: matches };
  }, [sentence]);

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
    if (onAnswer) onAnswer(allCorrect);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !submitted) {
      handleSubmit();
    }
  };

  const allFilled = parsed.answers.every(({ index }) => (userInputs[index] || '').trim());

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
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
                  placeholder="..."
                  autoFocus={part.index === 0}
                />
              )}
            </span>
          )
        ))}
      </div>

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
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ClozeCard;
