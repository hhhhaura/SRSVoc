import { Link, useLocation } from 'react-router-dom';
import { Library, Plus, LogOut, Settings, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BottomNav = () => {
  const location = useLocation();
  const { logout } = useAuth();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex justify-around items-center h-16">
          <Link
            to="/"
            className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-colors ${
              isActive('/') 
                ? 'text-indigo-600 bg-indigo-50' 
                : 'text-gray-500 hover:text-indigo-600'
            }`}
          >
            <Library size={22} />
            <span className="text-xs mt-1 font-medium">Library</span>
          </Link>

          <Link
            to="/todo"
            className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-colors ${
              isActive('/todo') 
                ? 'text-indigo-600 bg-indigo-50' 
                : 'text-gray-500 hover:text-indigo-600'
            }`}
          >
            <GraduationCap size={22} />
            <span className="text-xs mt-1 font-medium">Study</span>
          </Link>
          
          <Link
            to="/add"
            className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-colors ${
              isActive('/add') 
                ? 'text-indigo-600 bg-indigo-50' 
                : 'text-gray-500 hover:text-indigo-600'
            }`}
          >
            <Plus size={22} />
            <span className="text-xs mt-1 font-medium">Add</span>
          </Link>

          <Link
            to="/settings"
            className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-colors ${
              isActive('/settings') 
                ? 'text-indigo-600 bg-indigo-50' 
                : 'text-gray-500 hover:text-indigo-600'
            }`}
          >
            <Settings size={22} />
            <span className="text-xs mt-1 font-medium">Settings</span>
          </Link>
          
          <button
            onClick={logout}
            className="flex flex-col items-center justify-center px-3 py-2 rounded-xl text-gray-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={22} />
            <span className="text-xs mt-1 font-medium">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
