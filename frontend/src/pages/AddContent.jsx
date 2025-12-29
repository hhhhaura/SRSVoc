import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, Loader2, FileText, HelpCircle } from 'lucide-react';
import { getLibrary, createDeck, createFolder } from '../api/library';
import { importCards, importCardsCSV } from '../api/study';
import BottomNav from '../components/BottomNav';
import Tooltip from '../components/Tooltip';

const AddContent = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('deck');
  const [library, setLibrary] = useState({ folders: [], root_decks: [] });
  const [loading, setLoading] = useState(false);
  
  // Deck form
  const [deckName, setDeckName] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  
  // Import form
  const [selectedDeck, setSelectedDeck] = useState('');
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const data = await getLibrary();
        setLibrary(data);
      } catch (error) {
        console.error('Failed to fetch library:', error);
      }
    };
    fetchLibrary();
  }, []);

  const allDecks = [
    ...(library.root_decks || []),
    ...(library.folders || []).flatMap(f => f.decks || [])
  ];

  const handleCreateDeck = async (e) => {
    e.preventDefault();
    if (!deckName.trim()) return;

    setLoading(true);
    try {
      const deck = await createDeck(deckName, selectedFolder || null);
      navigate(`/deck/${deck.id}`);
    } catch (error) {
      console.error('Failed to create deck:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setImportText(event.target.result);
    };
    reader.readAsText(file);
  };

  const handleImport = async (e) => {
    e.preventDefault();
    setImportError('');
    
    if (!selectedDeck) {
      setImportError('Please select a deck');
      return;
    }

    if (!importText.trim()) {
      setImportError('Please enter or upload some data');
      return;
    }

    setLoading(true);
    try {
      await importCardsCSV(selectedDeck, importText);
      navigate(`/deck/${selectedDeck}`);
    } catch (error) {
      setImportError(error.response?.data?.detail || 'Failed to import cards');
      console.error('Failed to import:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Add Content</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('deck')}
            className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
              activeTab === 'deck'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Plus size={20} className="inline mr-2" />
            New Deck
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
              activeTab === 'import'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Upload size={20} className="inline mr-2" />
            Import Cards
          </button>
        </div>

        {/* New Deck Form */}
        {activeTab === 'deck' && (
          <form onSubmit={handleCreateDeck} className="bg-white rounded-xl shadow-lg p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deck Name
              </label>
              <input
                type="text"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder="e.g., Spanish Vocabulary"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Folder (optional)
              </label>
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
              >
                <option value="">No folder (root)</option>
                {library.folders.map(folder => (
                  <option key={folder.id} value={folder.id}>{folder.name}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !deckName.trim()}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
              Create Deck
            </button>
          </form>
        )}

        {/* Import Form */}
        {activeTab === 'import' && (
          <form onSubmit={handleImport} className="bg-white rounded-xl shadow-lg p-6 space-y-4">
            {importError && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                {importError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Deck
              </label>
              <select
                value={selectedDeck}
                onChange={(e) => setSelectedDeck(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                required
              >
                <option value="">Choose a deck...</option>
                {allDecks.map(deck => (
                  <option key={deck.id} value={deck.id}>{deck.name}</option>
                ))}
              </select>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload CSV File (optional)
              </label>
              <p className="text-xs text-gray-400 mb-2">
                CSV format: <code className="bg-gray-100 px-1 rounded">word, meaning, synonyms, examples</code>
              </p>
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-indigo-500 hover:text-indigo-600 transition-colors"
              >
                <FileText size={20} />
                Click to upload .csv or .txt file
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or paste cards below (one per line)
              </label>
              <div className="text-xs text-gray-400 mb-2 space-y-1">
                <p><strong>CSV format:</strong> <code className="bg-gray-100 px-1 rounded">word,meaning,syn1 | syn2,(ex1 | trans1); (ex2 | trans2)</code></p>
                <p><strong>Pipe format:</strong> <code className="bg-gray-100 px-1 rounded">word || meaning || syn1 | syn2 || (ex1 | trans1); (ex2 | trans2)</code></p>
              </div>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={`CSV format:
apple,蘋果,fruit | produce,(He ate an *apple*. | 他吃了一個蘋果。); (*Apples* are healthy. | 蘋果很健康。)
hello,你好,hi | greetings,(*Hello* world! | 你好世界！)

Or pipe format:
apple || 蘋果 || fruit | produce || (He ate an *apple*. | 他吃了一個蘋果。); (*Apples* are healthy. | 蘋果很健康。)
hello || 你好 || hi | greetings || (*Hello* world! | 你好世界！)`}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none font-mono text-sm"
                rows={10}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !importText.trim() || !selectedDeck}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
              Import Cards
            </button>
          </form>
        )}

      </div>
      <BottomNav />
    </div>
  );
};

export default AddContent;
