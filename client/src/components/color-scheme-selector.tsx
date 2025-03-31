import { useState, useMemo } from 'react';
import { useStore, COLOR_SCHEMES } from '@/lib/store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function ColorSchemeSelector() {
  const { colorScheme, setColorScheme } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState(colorScheme);
  const [currentPage, setCurrentPage] = useState(0);
  
  // Define theme groups (6 themes per page)
  const themeGroups = useMemo(() => {
    const themes = Object.entries(COLOR_SCHEMES);
    return [
      themes.slice(0, 6),  // First 6 themes (original)
      themes.slice(6, 12)   // Next 6 themes (new)
    ];
  }, []);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      // When opening the dialog, start with the current scheme
      setSelectedScheme(colorScheme);
      
      // Set the current page based on where the selected theme is
      const themeIndex = Object.keys(COLOR_SCHEMES).findIndex(key => key === colorScheme);
      setCurrentPage(themeIndex >= 6 ? 1 : 0);
    }
    setIsOpen(open);
  };

  const handleSave = () => {
    setColorScheme(selectedScheme);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
    // Reset to current scheme
    setSelectedScheme(colorScheme);
  };
  
  const goToPage = (pageIndex: number) => {
    setCurrentPage(pageIndex);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className="relative w-full rounded-md border border-blue-700 bg-blue-800 py-2 pl-3 pr-10 text-sm text-white shadow-sm hover:bg-blue-700 transition-colors">
          <span className="flex items-center justify-between">
            <span>Theme: {COLOR_SCHEMES[colorScheme].name}</span>
            <div className="flex space-x-1">
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
          </span>
        </button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[725px]">
        <DialogHeader>
          <DialogTitle>Choose a Color Theme</DialogTitle>
          <DialogDescription>
            Select a theme that best suits your preferences. Changes will only be applied after clicking Save.
          </DialogDescription>
        </DialogHeader>
        
        {/* Page navigation */}
        <div className="flex justify-center space-x-2 mb-2">
          <button 
            onClick={() => goToPage(0)}
            className={`px-3 py-1 rounded text-sm ${currentPage === 0 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
          >
            Classic Themes
          </button>
          <button 
            onClick={() => goToPage(1)}
            className={`px-3 py-1 rounded text-sm ${currentPage === 1 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
          >
            Modern Themes
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
          {themeGroups[currentPage].map(([key, scheme]) => (
            <ThemePreviewCard 
              key={key} 
              schemeKey={key} 
              scheme={scheme}
              isSelected={selectedScheme === key}
              onSelect={() => setSelectedScheme(key)}
            />
          ))}
        </div>
        
        <DialogFooter className="flex justify-between items-center">
          <div className="text-xs text-gray-500">
            Page {currentPage + 1} of {themeGroups.length}
          </div>
          <div>
            <Button variant="outline" onClick={handleCancel} className="mr-2">Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ThemePreviewCardProps {
  schemeKey: string;
  scheme: typeof COLOR_SCHEMES[keyof typeof COLOR_SCHEMES];
  isSelected: boolean;
  onSelect: () => void;
}

function ThemePreviewCard({ schemeKey, scheme, isSelected, onSelect }: ThemePreviewCardProps) {
  const { colors } = scheme;
  
  // Add class name based on theme for gradient overlays
  const themeClass = `${schemeKey}-theme`;
  
  return (
    <div 
      className={`theme-preview-card border rounded-lg overflow-hidden cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}`}
      onClick={onSelect}
    >
      <div className="font-medium text-center py-2" style={{ backgroundColor: colors.primary, color: 'white' }}>
        {scheme.name}
      </div>
      
      {/* Use the theme-bg class to showcase the gradient overlay effects */}
      <div className={`${themeClass}`}>
        <div style={{ backgroundColor: colors.background }} className="theme-bg p-3">
          <div className="mb-2 text-xs" style={{ color: colors.text }}>Preview</div>
          
          {/* Sidebar preview */}
          <div className="mb-2 rounded p-2" style={{ backgroundColor: colors.sidebar, color: 'white' }}>
            <div className="text-[10px] font-medium">Sidebar</div>
            <div className="text-[9px] opacity-80">Navigation area</div>
          </div>
          
          {/* Content section preview with card */}
          <div 
            className="theme-card p-2 mb-2" 
            style={{ color: colors.text }}
          >
            <div className="text-[10px] font-medium">Content Section</div>
            <div className="text-[9px]">Main text area</div>
            <button 
              className="text-[9px] mt-1 px-2 py-0.5 rounded"
              style={{ backgroundColor: colors.primary, color: 'white' }}
            >
              Example Button
            </button>
          </div>
          
          {/* Secondary card with accent color */}
          <div 
            className="theme-card p-2" 
            style={{ color: colors.text }}
          >
            <div className="text-[10px] font-medium" style={{ color: colors.secondary }}>
              Secondary Section
            </div>
            <div className="flex justify-between items-center mt-1">
              <div className="text-[9px]">Details</div>
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: colors.accent }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to convert hex color to RGB
function hexToRgb(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert 3-digit hex to 6-digit
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  
  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `${r}, ${g}, ${b}`;
}