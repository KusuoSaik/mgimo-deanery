import { Segmented } from './ui/primitives';

interface AdminModeToggleProps {
  isAdminMode: boolean;
  onToggle: (admin: boolean) => void;
}

export const AdminModeToggle = ({ isAdminMode, onToggle }: AdminModeToggleProps) => {
  return (
    <Segmented
      id="mode"
      tone="dark"
      size="sm"
      className="w-[184px]"
      value={isAdminMode ? 'admin' : 'student'}
      onChange={(value) => onToggle(value === 'admin')}
      options={[
        { value: 'student', label: 'Студент' },
        { value: 'admin', label: 'Деканат' },
      ]}
    />
  );
};
