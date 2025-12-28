import { useState } from 'react';
import SpeakButton from './SpeakButton';

const FlipCard = ({ front, back, sentence, chinese, onFlip }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = (e) => {
    // Don't flip if clicking on speak button
    if (e.target.closest('.speak-btn')) return;
    setIsFlipped(!isFlipped);
    if (onFlip) onFlip(!isFlipped);
  };

  // Clean sentence for display (remove cloze markers)
  const cleanSentence = sentence ? sentence.replace(/\*/g, '') : null;

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
            {cleanSentence && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-center gap-2">
                  <p className="text-gray-600 italic text-sm">{cleanSentence}</p>
                  <div className="speak-btn">
                    <SpeakButton text={cleanSentence} size={16} />
                  </div>
                </div>
              </div>
            )}
            <p className="text-sm text-gray-400 mt-4">Tap to flip</p>
          </div>
        </div>
        <div className="flip-card-back bg-indigo-600 shadow-lg flex items-center justify-center p-6">
          <div className="text-center text-white">
            <p className="text-xl font-medium">{back}</p>
            {chinese && (
              <p className="text-lg text-indigo-200 mt-2">{chinese}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlipCard;
