import { useState, useEffect, useCallback } from 'react';
import { useSpeechRecognition } from '../hooks/use-speech-recognition';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  language?: string;
  disabled?: boolean;
  className?: string;
  clearAfterSubmit?: boolean;
  autoSubmitAfterSilence?: boolean;
  silenceTimeout?: number;
}

export default function VoiceInput({
  onTranscript,
  language = 'en-US',
  disabled = false,
  className = '',
  clearAfterSubmit = true,
  autoSubmitAfterSilence = false,
  silenceTimeout = 2000
}: VoiceInputProps) {
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Setup speech recognition
  const {
    transcript,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
    hasRecognitionSupport,
    error
  } = useSpeechRecognition({
    language,
    continuous: true,
    interimResults: true,
    onResult: (text, isFinal) => {
      if (autoSubmitAfterSilence && isFinal) {
        // Reset any existing silence timer
        if (silenceTimer) {
          clearTimeout(silenceTimer);
        }
        
        // Set a new silence timer
        const timer = setTimeout(() => {
          if (text.trim()) {
            handleSubmitTranscript();
          }
        }, silenceTimeout);
        
        setSilenceTimer(timer);
      }
    },
    onError: (error) => {
      console.error('Speech recognition error:', error);
    }
  });
  
  // Clean up the silence timer when component unmounts
  useEffect(() => {
    return () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }
    };
  }, [silenceTimer]);
  
  // Toggle listening state
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  }, [isListening, startListening, stopListening, resetTranscript]);
  
  // Submit the transcript
  const handleSubmitTranscript = useCallback(() => {
    if (!transcript.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      onTranscript(transcript);
      
      if (clearAfterSubmit) {
        resetTranscript();
      }
    } catch (error) {
      console.error('Error submitting transcript:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [transcript, onTranscript, resetTranscript, clearAfterSubmit]);
  
  // If speech recognition is not supported, show a message
  if (!hasRecognitionSupport) {
    return (
      <div className={cn("text-sm text-muted-foreground p-2", className)}>
        Speech recognition is not supported in this browser.
      </div>
    );
  }
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        type="button"
        size="sm"
        variant={isListening ? "default" : "outline"}
        onClick={toggleListening}
        disabled={disabled}
        className="flex-shrink-0 rounded-full w-8 h-8 p-0"
      >
        {isListening ? <MicOff size={16} /> : <Mic size={16} />}
      </Button>
      
      <div className="flex-1 text-sm">
        {isListening ? (
          <span className="text-primary">
            Listening... {transcript || "Speak now"}
          </span>
        ) : (
          <span className="text-muted-foreground">
            {transcript
              ? transcript
              : "Press the microphone button to start speaking"}
          </span>
        )}
      </div>
      
      {transcript && (
        <Button
          type="button"
          size="sm"
          onClick={handleSubmitTranscript}
          disabled={isSubmitting || !transcript.trim()}
          className="flex-shrink-0"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Submit"}
        </Button>
      )}
      
      {error && (
        <div className="text-destructive text-sm mt-1">
          Error: {error.message}
        </div>
      )}
    </div>
  );
}