import { useState, useEffect, useCallback } from 'react';

interface SpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  onResult?: (text: string, isFinal: boolean) => void;
  onError?: (error: SpeechRecognitionError) => void;
}

interface SpeechRecognitionReturn {
  transcript: string;
  isListening: boolean;
  resetTranscript: () => void;
  startListening: () => void;
  stopListening: () => void;
  hasRecognitionSupport: boolean;
  error: SpeechRecognitionError | null;
}

interface SpeechRecognitionError {
  message: string;
  error?: any;
}

// Add global type definitions for browser SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: typeof webkitSpeechRecognition;
    webkitSpeechRecognition: typeof webkitSpeechRecognition;
  }
}

/**
 * A hook for using the Web Speech API for speech recognition
 */
export function useSpeechRecognition({
  language = 'en-US',
  continuous = true,
  interimResults = true,
  maxAlternatives = 1,
  onResult,
  onError
}: SpeechRecognitionOptions = {}): SpeechRecognitionReturn {
  const [transcript, setTranscript] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [error, setError] = useState<SpeechRecognitionError | null>(null);
  const [recognition, setRecognition] = useState<any>(null);
  
  // Check if the browser supports speech recognition
  const hasRecognitionSupport = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  
  // Initialize the speech recognition instance
  useEffect(() => {
    if (!hasRecognitionSupport) {
      const error: SpeechRecognitionError = {
        message: 'Speech recognition is not supported in this browser.'
      };
      setError(error);
      if (onError) onError(error);
      return;
    }
    
    try {
      // Create the recognition instance
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      // Configure the recognition
      recognitionInstance.lang = language;
      recognitionInstance.continuous = continuous;
      recognitionInstance.interimResults = interimResults;
      recognitionInstance.maxAlternatives = maxAlternatives;
      
      // Handle recognition results
      recognitionInstance.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        let isFinal = false;
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            isFinal = true;
          } else {
            interimTranscript += transcript;
          }
        }
        
        const newTranscript = finalTranscript || interimTranscript;
        
        // Update the transcript state
        setTranscript(prevTranscript => {
          const updatedTranscript = prevTranscript.trim() ? 
            `${prevTranscript} ${newTranscript}` : 
            newTranscript;
            
          // Call the onResult callback if provided
          if (onResult) {
            onResult(updatedTranscript, isFinal);
          }
          
          return updatedTranscript;
        });
      };
      
      // Handle recognition errors
      recognitionInstance.onerror = (event) => {
        const errorObj: SpeechRecognitionError = {
          message: `Speech recognition error: ${event.error}`,
          error: event
        };
        
        setError(errorObj);
        if (onError) onError(errorObj);
        
        // Stop listening on error
        setIsListening(false);
      };
      
      // Handle end of recognition
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      // Save the recognition instance
      setRecognition(recognitionInstance);
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      const errorObj: SpeechRecognitionError = {
        message: 'Error initializing speech recognition',
        error
      };
      
      setError(errorObj);
      if (onError) onError(errorObj);
    }
  }, [continuous, hasRecognitionSupport, interimResults, language, maxAlternatives, onError, onResult]);
  
  // Start listening to speech
  const startListening = useCallback(() => {
    if (!recognition) return;
    
    try {
      recognition.start();
      setIsListening(true);
      setError(null);
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      const errorObj: SpeechRecognitionError = {
        message: 'Error starting speech recognition',
        error
      };
      
      setError(errorObj);
      if (onError) onError(errorObj);
    }
  }, [onError, recognition]);
  
  // Stop listening to speech
  const stopListening = useCallback(() => {
    if (!recognition) return;
    
    try {
      recognition.stop();
      setIsListening(false);
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  }, [recognition]);
  
  // Reset the transcript
  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);
  
  // Clean up the recognition instance when the component unmounts
  useEffect(() => {
    return () => {
      if (recognition && isListening) {
        recognition.stop();
      }
    };
  }, [isListening, recognition]);
  
  return {
    transcript,
    isListening,
    resetTranscript,
    startListening,
    stopListening,
    hasRecognitionSupport,
    error
  };
}