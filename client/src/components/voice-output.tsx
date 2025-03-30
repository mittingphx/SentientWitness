import { useState, useEffect, useCallback } from 'react';
import { useSpeechSynthesis } from '../hooks/use-speech-synthesis';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceOutputProps {
  text?: string;
  autoPlay?: boolean;
  language?: string;
  voiceName?: string;
  disabled?: boolean;
  className?: string;
  onStart?: () => void;
  onEnd?: () => void;
}

export default function VoiceOutput({
  text = '',
  autoPlay = false,
  language = 'en-US',
  voiceName,
  disabled = false,
  className = '',
  onStart,
  onEnd
}: VoiceOutputProps) {
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  
  // Setup speech synthesis
  const {
    voices,
    speak,
    cancel,
    isSpeaking,
    hasSynthesisSupport,
    error
  } = useSpeechSynthesis({
    onStart,
    onEnd,
    onError: (err) => console.error('Speech synthesis error:', err)
  });
  
  // Find the best voice for the language and voice name
  useEffect(() => {
    if (voices.length === 0) return;
    
    let bestVoice: SpeechSynthesisVoice | undefined;
    
    // If a voice name is specified, try to find that voice
    if (voiceName) {
      bestVoice = voices.find(v => 
        v.name.toLowerCase().includes(voiceName.toLowerCase())
      );
    }
    
    // If no voice found by name, or no name specified, find one by language
    if (!bestVoice) {
      bestVoice = voices.find(v => v.lang.startsWith(language));
    }
    
    // If still no voice found, use the first available voice
    if (!bestVoice && voices.length > 0) {
      bestVoice = voices[0];
    }
    
    setSelectedVoice(bestVoice);
  }, [voices, language, voiceName]);
  
  // Speak the text when it changes and autoPlay is true
  useEffect(() => {
    if (autoPlay && text && selectedVoice && !isSpeaking && !disabled) {
      speak(text, { voice: selectedVoice, lang: language });
    }
  }, [text, autoPlay, selectedVoice, isSpeaking, speak, language, disabled]);
  
  // Toggle speaking the text
  const toggleSpeak = useCallback(() => {
    if (isSpeaking) {
      cancel();
    } else if (text && selectedVoice) {
      speak(text, { voice: selectedVoice, lang: language });
    }
  }, [text, selectedVoice, isSpeaking, speak, cancel, language]);
  
  // If speech synthesis is not supported, show a message
  if (!hasSynthesisSupport) {
    return (
      <div className={cn("text-sm text-muted-foreground p-2", className)}>
        Speech synthesis is not supported in this browser.
      </div>
    );
  }
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        type="button"
        size="sm"
        variant={isSpeaking ? "default" : "outline"}
        onClick={toggleSpeak}
        disabled={disabled || !text || voices.length === 0}
        className="flex-shrink-0 rounded-full w-8 h-8 p-0"
        title={isSpeaking ? "Stop speaking" : "Speak text"}
      >
        {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </Button>
      
      <div className="flex-1 text-sm">
        {isSpeaking ? (
          <span className="text-primary">Speaking...</span>
        ) : (
          <span className="text-muted-foreground">
            {text ? "Press the button to hear the text" : "No text to speak"}
          </span>
        )}
      </div>
      
      {error && (
        <div className="text-destructive text-sm mt-1">
          Error: {error.message || JSON.stringify(error)}
        </div>
      )}
    </div>
  );
}