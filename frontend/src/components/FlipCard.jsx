import { useState } from 'react';
import SpeakButton from './SpeakButton';

const FlipCard = ({ front, back, examples, synonyms, onFlip }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = (e) => {
    // Don't flip if clicking on speak button
    if (e.target.closest('.speak-btn')) return;
    setIsFlipped(!isFlipped);
    if (onFlip) onFlip(!isFlipped);
  };

  // Clean sentences for display (remove cloze markers)
  const cleanExamples = examples?.map(ex => ({
    sentence: ex.sentence?.replace(/\*/g, '') || '',
    translation: ex.translation || ''
  })) || [];

  return (
    <div 
      className="flip-card w-full cursor-pointer"
      onClick={handleFlip}
    >
      <div className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}>
        <div className="flip-card-front bg-white shadow-lg flex flex-col items-center justify-center p-6">
          <div className="text-center w-full">
            <div className="flex items-center justify-center gap-2 mb-2">
              <p className="text-2xl font-bold text-gray-800">{front}</p>
              <div className="speak-btn">
                <SpeakButton text={front} size={22} />
              </div>
            </div>
            {cleanExamples.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                {cleanExamples.map((ex, idx) => (
                  <div key={idx} className="flex items-center justify-center gap-2">
                    <p className="text-gray-600 italic text-sm">{ex.sentence}</p>
                    <div className="speak-btn">
                      <SpeakButton text={ex.sentence} size={16} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-sm text-gray-400 mt-4">Tap to flip</p>
          </div>
        </div>
        <div className="flip-card-back bg-indigo-600 shadow-lg flex items-center justify-center p-6 overflow-y-auto">
          <div className="text-center text-white w-full">
            <div className="flex items-center justify-center gap-2 mb-2">
              <p className="text-2xl font-bold">{front}</p>
              <div className="speak-btn">
                <SpeakButton text={front} size={22} />
              </div>
            </div>
            <p className="text-xl font-medium">{back}</p>
            {synonyms && synonyms.length > 0 && (
              <p className="text-indigo-200 text-sm mt-2">Synonyms: {synonyms.join(', ')}</p>
            )}
            {cleanExamples.length > 0 && (
              <div className="mt-4 pt-4 border-t border-indigo-400 space-y-3">
                {cleanExamples.map((ex, idx) => (
                  <div key={idx} className="text-left">
                    <div className="flex items-start gap-2">
                      <p className="text-indigo-100 text-sm flex-1">{ex.sentence}</p>
                      <div className="speak-btn mt-0.5">
                        <SpeakButton text={ex.sentence} size={16} />
                      </div>
                    </div>
                    {ex.translation && (
                      <p className="text-indigo-300 text-xs mt-1">{ex.translation}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlipCard;
