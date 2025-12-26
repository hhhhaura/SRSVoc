import { useState } from 'react';
import { Info, X, Brain, Calendar, TrendingUp } from 'lucide-react';

const ScheduleInfo = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium transition-colors"
      >
        <Info size={16} />
        How does scheduling work?
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Spaced Repetition</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-6">
              {/* What is SRS */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Brain size={20} className="text-indigo-600" />
                  <h3 className="font-semibold text-gray-800">What is Spaced Repetition?</h3>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Spaced Repetition is a learning technique that shows you cards at optimal intervals. 
                  Cards you know well appear less often, while difficult cards appear more frequently.
                </p>
              </div>

              {/* SM-2 Algorithm */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={20} className="text-indigo-600" />
                  <h3 className="font-semibold text-gray-800">How Scheduling Works</h3>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-3">
                  We use the <strong>SM-2 algorithm</strong> to calculate when you should review each card:
                </p>
                <div className="space-y-2">
                  <div className="bg-red-50 rounded-lg p-3">
                    <div className="font-medium text-red-700 text-sm">Forgot (0)</div>
                    <div className="text-red-600 text-xs">Card resets → Review tomorrow</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <div className="font-medium text-yellow-700 text-sm">Hard (3)</div>
                    <div className="text-yellow-600 text-xs">Interval increases slightly</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="font-medium text-blue-700 text-sm">Good (4)</div>
                    <div className="text-blue-600 text-xs">Normal interval increase (recommended)</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="font-medium text-green-700 text-sm">Easy (5)</div>
                    <div className="text-green-600 text-xs">Larger interval increase</div>
                  </div>
                </div>
              </div>

              {/* Interval Progression */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={20} className="text-indigo-600" />
                  <h3 className="font-semibold text-gray-800">Interval Progression</h3>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-3">
                  When you consistently rate cards as "Good" or "Easy":
                </p>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">1st review:</span>
                    <span className="font-medium text-gray-800">1 day</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-500">2nd review:</span>
                    <span className="font-medium text-gray-800">6 days</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-500">3rd review:</span>
                    <span className="font-medium text-gray-800">~15 days</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-500">4th review:</span>
                    <span className="font-medium text-gray-800">~38 days</span>
                  </div>
                  <div className="text-center text-gray-400 text-xs mt-2">...and so on</div>
                </div>
              </div>

              {/* Mastery */}
              <div className="bg-indigo-50 rounded-xl p-4">
                <h4 className="font-semibold text-indigo-800 mb-2">📊 Mastery Status</h4>
                <p className="text-indigo-700 text-sm">
                  A card is considered <strong>"mastered"</strong> when its review interval exceeds 3 days. 
                  The progress bar shows what percentage of your cards have reached this level.
                </p>
              </div>

              {/* Tips */}
              <div className="border-t border-gray-100 pt-4">
                <h4 className="font-semibold text-gray-800 mb-2">💡 Tips</h4>
                <ul className="text-gray-600 text-sm space-y-1">
                  <li>• Review cards daily for best results</li>
                  <li>• Be honest with your ratings</li>
                  <li>• Use "Practice All" to refresh your memory</li>
                  <li>• Reset progress if you want to start fresh</li>
                </ul>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ScheduleInfo;
