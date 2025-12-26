import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

const Tooltip = ({ text, children, position = 'top' }) => {
  const [show, setShow] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div 
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children || (
        <HelpCircle size={16} className="text-gray-400 hover:text-indigo-500 cursor-help transition-colors" />
      )}
      {show && (
        <div className={`absolute ${positionClasses[position]} z-50 px-3 py-2 text-sm text-white bg-gray-800 rounded-lg shadow-lg whitespace-nowrap max-w-xs`}>
          {text}
          <div className={`absolute w-2 h-2 bg-gray-800 transform rotate-45 ${
            position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' :
            position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' :
            position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1' :
            'right-full top-1/2 -translate-y-1/2 -mr-1'
          }`} />
        </div>
      )}
    </div>
  );
};

export const InfoBadge = ({ text, className = '' }) => (
  <Tooltip text={text} position="top">
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 hover:bg-indigo-100 cursor-help transition-colors ${className}`}>
      <HelpCircle size={14} className="text-gray-400 hover:text-indigo-500" />
    </span>
  </Tooltip>
);

export default Tooltip;
