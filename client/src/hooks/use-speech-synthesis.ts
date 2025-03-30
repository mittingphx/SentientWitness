import { useState, useEffect, useCallback, useRef } from 'react';

interface SpeechSynthesisOptions {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
  onPause?: () => void;
  onResume?: () => void;
}

interface UseSpeechSynthesisReturn {
  voices: SpeechSynthesisVoice[];
  speak: (text: string, options?: Partial<SpeechSynthesisOptions>) => void;
  cancel: () => void;
  pause: () => void;
  resume: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  hasSynthesisSupport: boolean;
  error: any;
}

/**
 * A hook for using the Web Speech API for speech synthesis (text-to-voice)
 */
export const useSpeechSynthesis = (options: SpeechSynthesisOptions = {}): UseSpeechSynthesisReturn => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);
  
  // Create a ref to store the current options, which will be used in event listeners
  const optionsRef = useRef<SpeechSynthesisOptions>(options);
  
  // Update the options ref when props change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);
  
  // Check if the browser supports speech synthesis
  const hasSynthesisSupport = typeof window !== 'undefined' && 'speechSynthesis' in window;
  
  // Initialize and load available voices
  useEffect(() => {
    if (!hasSynthesisSupport) {
      setError(new Error('Speech synthesis is not supported in this browser.'));
      return;
    }
    
    function loadVoices() {
      // Get the list of voices
      const availableVoices = window.speechSynthesis.getVoices();
      
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
      }
    }
    
    // Load voices immediately in case they're already available
    loadVoices();
    
    // Add an event listener for when voices change
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    // Clean up the event listener when component unmounts
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [hasSynthesisSupport]);
  
  // Find a voice based on language and optional voice preference
  const findVoice = useCallback((language: string, voiceOptions?: SpeechSynthesisVoice): SpeechSynthesisVoice | undefined => {
    if (voices.length === 0) return undefined;
    
    // If a specific voice is provided, use it
    if (voiceOptions) return voiceOptions;
    
    // Otherwise, find the first voice with the specified language
    return voices.find(voice => voice.lang.startsWith(language)) || voices[0];
  }, [voices]);
  
  /**
   * Speak text using speech synthesis
   */
  const speak = useCallback((text: string, speakOptions: Partial<SpeechSynthesisOptions> = {}) => {
    if (!hasSynthesisSupport || !text) return;
    
    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      // Create a new utterance
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Merge options with defaults
      const mergedOptions = {
        ...optionsRef.current,
        ...speakOptions
      };
      
      // Set utterance properties
      if (mergedOptions.voice) {
        utterance.voice = mergedOptions.voice;
      } else if (mergedOptions.lang) {
        const voice = findVoice(mergedOptions.lang);
        if (voice) utterance.voice = voice;
      }
      
      if (mergedOptions.lang) utterance.lang = mergedOptions.lang;
      if (mergedOptions.rate !== undefined) utterance.rate = mergedOptions.rate;
      if (mergedOptions.pitch !== undefined) utterance.pitch = mergedOptions.pitch;
      if (mergedOptions.volume !== undefined) utterance.volume = mergedOptions.volume;
      
      // Set event handlers
      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        if (mergedOptions.onStart) mergedOptions.onStart();
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        if (mergedOptions.onEnd) mergedOptions.onEnd();
      };
      
      utterance.onerror = (event) => {
        setError(event);
        if (mergedOptions.onError) mergedOptions.onError(event);
      };
      
      utterance.onpause = () => {
        setIsPaused(true);
        if (mergedOptions.onPause) mergedOptions.onPause();
      };
      
      utterance.onresume = () => {
        setIsPaused(false);
        if (mergedOptions.onResume) mergedOptions.onResume();
      };
      
      // Speak the utterance
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      setError(err);
      if (optionsRef.current.onError) optionsRef.current.onError(err);
    }
  }, [findVoice, hasSynthesisSupport]);
  
  /**
   * Cancel ongoing speech
   */
  const cancel = useCallback(() => {
    if (!hasSynthesisSupport) return;
    
    try {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    } catch (err) {
      setError(err);
      if (optionsRef.current.onError) optionsRef.current.onError(err);
    }
  }, [hasSynthesisSupport]);
  
  /**
   * Pause ongoing speech
   */
  const pause = useCallback(() => {
    if (!hasSynthesisSupport || !isSpeaking) return;
    
    try {
      window.speechSynthesis.pause();
      setIsPaused(true);
      if (optionsRef.current.onPause) optionsRef.current.onPause();
    } catch (err) {
      setError(err);
      if (optionsRef.current.onError) optionsRef.current.onError(err);
    }
  }, [hasSynthesisSupport, isSpeaking]);
  
  /**
   * Resume paused speech
   */
  const resume = useCallback(() => {
    if (!hasSynthesisSupport || !isPaused) return;
    
    try {
      window.speechSynthesis.resume();
      setIsPaused(false);
      if (optionsRef.current.onResume) optionsRef.current.onResume();
    } catch (err) {
      setError(err);
      if (optionsRef.current.onError) optionsRef.current.onError(err);
    }
  }, [hasSynthesisSupport, isPaused]);
  
  // Clean up by canceling any ongoing speech when component unmounts
  useEffect(() => {
    return () => {
      if (hasSynthesisSupport) {
        window.speechSynthesis.cancel();
      }
    };
  }, [hasSynthesisSupport]);
  
  return {
    voices,
    speak,
    cancel,
    pause,
    resume,
    isSpeaking,
    isPaused,
    hasSynthesisSupport,
    error
  };
};