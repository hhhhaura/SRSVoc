import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, Play, Loader2 } from 'lucide-react';
import { getLibrary } from '../api/library';
import BottomNav from '../components/BottomNav';

const Todo = () => {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDecks = async () => {
      try {
        const data = await getLibrary();
        // Flatten all decks from folders and root_decks
        const allDecks = [
          ...(data.root_decks || []),
          ...(data.folders || []).flatMap(folder => folder.decks || [])
        ];
        setDecks(allDecks);
      } catch (error) {
        console.error('Failed to fetch library:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDecks();
  }, []);

  const pendingDecks = decks.filter(deck => deck.due_count > 0);
  const completedDecks = decks.filter(deck => deck.due_count === 0 && deck.card_count > 0);
  const totalDue = pendingDecks.reduce((sum, deck) => sum + deck.due_count, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Today's Reviews</h1>
          <p className="text-gray-500 mt-1">
            {totalDue > 0 
              ? `${totalDue} cards due across ${pendingDecks.length} deck${pendingDecks.length !== 1 ? 's' : ''}`
              : 'All caught up! No reviews pending.'}
          </p>
        </div>

        {/* Summary Card */}
        <div className={`rounded-xl p-6 mb-6 ${
          totalDue > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
        }`}>
          <div className="flex items-center gap-4">
            {totalDue > 0 ? (
              <>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Clock size={24} className="text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-700">{totalDue}</p>
                  <p className="text-red-600 text-sm">cards to review</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={24} className="text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-green-700">All done!</p>
                  <p className="text-green-600 text-sm">Great job keeping up with your reviews</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Pending Decks */}
        {pendingDecks.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Clock size={18} className="text-red-500" />
              Pending Reviews
            </h2>
            <div className="space-y-3">
              {pendingDecks.map(deck => (
                <Link
                  key={deck.id}
                  to={`/deck/${deck.id}`}
                  className="block bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow border-l-4 border-red-500"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800">{deck.name}</h3>
                      <p className="text-sm text-gray-500">{deck.card_count} cards total</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
                        {deck.due_count} due
                      </span>
                      <Play size={20} className="text-indigo-600" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Completed Decks */}
        {completedDecks.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-green-500" />
              Completed Today
            </h2>
            <div className="space-y-3">
              {completedDecks.map(deck => (
                <Link
                  key={deck.id}
                  to={`/deck/${deck.id}`}
                  className="block bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow border-l-4 border-green-500 opacity-75"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800">{deck.name}</h3>
                      <p className="text-sm text-gray-500">{deck.card_count} cards total</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                        ✓ Done
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {decks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No decks yet. Create your first deck to start learning!</p>
            <Link
              to="/"
              className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              Go to Library
            </Link>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Todo;
