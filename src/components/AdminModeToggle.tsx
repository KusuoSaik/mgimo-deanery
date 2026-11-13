import { motion } from 'framer-motion';
import { BarChart3, Users } from 'lucide-react';

interface AdminModeToggleProps {
  isAdminMode: boolean;
  onToggle: (admin: boolean) => void;
}

export const AdminModeToggle = ({ isAdminMode, onToggle }: AdminModeToggleProps) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onToggle(!isAdminMode)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
        isAdminMode
          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
          : 'bg-blue-600 hover:bg-blue-700 text-white'
      }`}
    >
      {isAdminMode ? (
        <>
          <BarChart3 className="h-5 w-5" />
          🏛️ Пульт деканата
        </>
      ) : (
        <>
          <Users className="h-5 w-5" />
          👨‍🎓 Кабинет студента
        </>
      )}
    </motion.button>
  );
};
