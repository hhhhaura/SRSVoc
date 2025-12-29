import { useState } from 'react';
import { ArrowLeft, RotateCcw, HelpCircle, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import Tooltip from '../components/Tooltip';
import BottomNav from '../components/BottomNav';

const AVATAR_OPTIONS = ['😀', '😎', '🤓', '🧠', '📚', '✨', '🎯', '🚀', '🌟', '💡', '🔥', '💪'];

const Settings = () => {
  const { settings, updateSettings, resetSettings, DEFAULT_SETTINGS } = useSettings();
  const { user } = useAuth();
  const [localSettings, setLocalSettings] = useState(settings);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const handleSave = () => {
    updateSettings(localSettings);
    alert('Settings saved!');
  };

  const handleReset = () => {
    if (confirm('Reset all settings to defaults?')) {
      resetSettings();
      setLocalSettings(DEFAULT_SETTINGS);
    }
  };

  const displayName = localSettings.username || user?.username || 'User';
  const displayAvatar = localSettings.avatar || displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft size={24} className="text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Profile Settings */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Profile</h2>
            
            {/* Avatar */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl hover:bg-indigo-200 transition-colors border-2 border-indigo-300"
              >
                {displayAvatar}
              </button>
              <div>
                <p className="font-medium text-gray-800">{displayName}</p>
                <p className="text-sm text-gray-500">Click avatar to change</p>
              </div>
            </div>

            {/* Avatar Picker */}
            {showAvatarPicker && (
              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm font-medium text-gray-700 mb-3">Choose an avatar:</p>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setLocalSettings({ ...localSettings, avatar: emoji });
                        setShowAvatarPicker(false);
                      }}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl hover:bg-indigo-100 transition-colors ${
                        localSettings.avatar === emoji ? 'bg-indigo-200 ring-2 ring-indigo-500' : 'bg-white'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={localSettings.username}
                onChange={(e) => setLocalSettings({ ...localSettings, username: e.target.value })}
                placeholder={user?.username || 'Enter display name'}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">Leave empty to use your account username</p>
            </div>
          </div>

          {/* Study Settings */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Study Settings</h2>

            {/* Cloze score multiplier */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium text-gray-700">Cloze Score Multiplier</label>
                <Tooltip text="Cloze (fill-in-blank) is harder, so ratings are boosted. 1.5x means 'Good' in cloze ≈ 'Easy' in flashcard." position="right">
                  <HelpCircle size={14} className="text-gray-400" />
                </Tooltip>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="2"
                  step="0.1"
                  value={localSettings.clozeScoreMultiplier}
                  onChange={(e) => setLocalSettings({ ...localSettings, clozeScoreMultiplier: parseFloat(e.target.value) })}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <span className="w-20 text-center font-medium text-gray-800 bg-gray-100 px-3 py-1 rounded-lg">
                  {localSettings.clozeScoreMultiplier.toFixed(1)}x
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                At {localSettings.clozeScoreMultiplier.toFixed(1)}x: Cloze "Good" (4) → Effective score: {(4 * localSettings.clozeScoreMultiplier).toFixed(1)}
              </p>
            </div>

            {/* Show First Letter Hint */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Show First Letter Hint</label>
                <Tooltip text="Display the first letter of the answer in cloze mode blanks" position="right">
                  <HelpCircle size={14} className="text-gray-400" />
                </Tooltip>
              </div>
              <button
                onClick={() => setLocalSettings({ ...localSettings, showFirstLetterHint: !localSettings.showFirstLetterHint })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  localSettings.showFirstLetterHint ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    localSettings.showFirstLetterHint ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Show Chinese Translation in Cloze */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Show Translation in Cloze</label>
                <Tooltip text="Display the Chinese translation of the example sentence while answering in cloze mode" position="right">
                  <HelpCircle size={14} className="text-gray-400" />
                </Tooltip>
              </div>
              <button
                onClick={() => setLocalSettings({ ...localSettings, showClozeTranslation: !localSettings.showClozeTranslation })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  localSettings.showClozeTranslation ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    localSettings.showClozeTranslation ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              Save Settings
            </button>
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-2 bg-gray-100 text-gray-600 px-6 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              <RotateCcw size={18} />
              Reset
            </button>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Settings;
