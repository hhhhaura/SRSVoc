import { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const SpeakButton = ({ text, lang = 'en-US', size = 20, className = '' }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      if (isSpeaking) {
        setIsSpeaking(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      utterance.pitch = 1;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } else {
      alert('Text-to-speech is not supported in your browser.');
    }
  };

  return (
    <button
      onClick={handleSpeak}
      className={`p-2 rounded-lg transition-colors ${
        isSpeaking 
          ? 'bg-indigo-100 text-indigo-600' 
          : 'hover:bg-gray-100 text-gray-500 hover:text-indigo-600'
      } ${className}`}
      title={isSpeaking ? 'Stop' : 'Listen'}
    >
      {isSpeaking ? <VolumeX size={size} /> : <Volume2 size={size} />}
    </button>
  );
};

export default SpeakButton;
