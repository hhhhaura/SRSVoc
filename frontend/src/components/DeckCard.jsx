import { Link } from 'react-router-dom';
import { BookOpen, Clock, FolderInput, CheckSquare, Square } from 'lucide-react';
import ProgressBar from './ProgressBar';
import Tooltip from './Tooltip';

const DeckCard = ({ deck, onMove, showMoveButton = false, selectMode = false, isSelected = false, onToggleSelect }) => {
  const { id, name, card_count, mastered_count, due_count } = deck;

  const handleClick = (e) => {
    if (selectMode && onToggleSelect) {
      e.preventDefault();
      onToggleSelect(id);
    }
  };

  const content = (
    <div 
      className={`bg-white rounded-xl shadow-lg p-4 hover:shadow-xl transition-shadow ${selectMode ? 'cursor-pointer' : ''} ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
      onClick={selectMode ? handleClick : undefined}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          {selectMode && (
            <div className="mr-1">
              {isSelected ? (
                <CheckSquare size={20} className="text-indigo-600" />
              ) : (
                <Square size={20} className="text-gray-400" />
              )}
            </div>
          )}
          {selectMode ? (
            <h3 className="font-semibold text-gray-800 text-lg">{name}</h3>
          ) : (
            <Link to={`/deck/${id}`} className="flex-1">
              <h3 className="font-semibold text-gray-800 text-lg hover:text-indigo-600 transition-colors">{name}</h3>
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          {due_count > 0 && (
            <span className="flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs font-medium px-2 py-1 rounded-full">
              <Clock size={12} />
              {due_count} due
            </span>
          )}
          {!selectMode && showMoveButton && onMove && (
            <Tooltip text="Move to folder" position="left">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onMove(id, name);
                }}
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <FolderInput size={16} />
              </button>
            </Tooltip>
          )}
        </div>
      </div>
      
      <div className={selectMode ? '' : ''}>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <BookOpen size={16} />
          <span>{card_count} cards</span>
        </div>
        
        <ProgressBar current={mastered_count} total={card_count} />
      </div>
    </div>
  );

  if (selectMode) {
    return content;
  }

  return content;
};

export default DeckCard;
