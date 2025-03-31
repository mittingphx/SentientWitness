import { useStore, COLOR_SCHEMES } from '@/lib/store';

export default function ColorSchemeSelector() {
  const { colorScheme, setColorScheme } = useStore();

  const handleSchemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setColorScheme(event.target.value);
  };

  return (
    <div className="relative w-full">
      <select 
        value={colorScheme}
        onChange={handleSchemeChange}
        className="w-full rounded-md border border-blue-700 bg-blue-800 py-2 pl-3 pr-10 text-sm text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {Object.entries(COLOR_SCHEMES).map(([key, scheme]) => (
          <option key={key} value={key}>
            {scheme.name}
          </option>
        ))}
      </select>
      
      {colorScheme && COLOR_SCHEMES[colorScheme] && (
        <div className="absolute top-3 right-10 flex space-x-1">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: COLOR_SCHEMES[colorScheme].colors.primary }}
          />
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: COLOR_SCHEMES[colorScheme].colors.secondary }}
          />
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: COLOR_SCHEMES[colorScheme].colors.accent }}
          />
        </div>
      )}
    </div>
  );
}