import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, AlertCircle, Sparkles, Square } from 'lucide-react';
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";

const VoiceInterface = ({ onCommandReceived, lastResponse, isChartActive }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [volume, setVolume] = useState(0);
  const [caption, setCaption] = useState("");
  
  // --- NEW: Audio Control State ---
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('ai_muted') === 'true');

  const dgConnectionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);
  const isManualStop = useRef(false);

  // --- 1. SPEECH SYNTHESIS LOGIC ---
  const stopSpeech = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const speakResponse = (text) => {
    if (!text || !window.speechSynthesis || isMuted) return;
    
    stopSpeech(); // Clear any existing speech
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  // Toggle Mute & Persist
  const toggleMute = () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    localStorage.setItem('ai_muted', newMuteState);
    if (newMuteState) stopSpeech();
  };

  // Auto-Stop when chart is closed
  useEffect(() => {
    if (!isChartActive) stopSpeech();
  }, [isChartActive]);

  // Speak when lastResponse changes
  useEffect(() => {
    if (lastResponse && isChartActive) speakResponse(lastResponse);
  }, [lastResponse]);

  // --- 2. DEEPGRAM / AUDIO TOOLS ---
  const startVolumeAnalysis = (stream) => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContextRef.current = new AudioContext();
    const source = audioContextRef.current.createMediaStreamSource(stream);
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 64;
    source.connect(analyserRef.current);

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    const updateVolume = () => {
      if (!analyserRef.current || audioContextRef.current?.state === 'closed') return;
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setVolume(average);
      animationFrameRef.current = requestAnimationFrame(updateVolume);
    };
    updateVolume();
  };

  const stopAudioTools = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setVolume(0);
  };

  const startListening = async () => {
    if (isProcessing || isListening) return;
    
    stopSpeech(); // Stop AI talking if user starts talking
    setIsProcessing(true);
    isManualStop.current = false;
    setError(null);
    setCaption(""); 
    
    try {
      const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      startVolumeAnalysis(stream);

      const deepgram = createClient(apiKey);
      const connection = deepgram.listen.live({
        model: "nova-2",
        interim_results: true,
        language: "en-US",
        smart_format: true,
        endpointing: 500, 
      });

      dgConnectionRef.current = connection;

      connection.on(LiveTranscriptionEvents.Open, () => {
        setIsListening(true);
        setIsProcessing(false);
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        
        mediaRecorderRef.current.addEventListener('dataavailable', (event) => {
          if (event.data.size > 0 && connection.getReadyState() === 1) {
            connection.send(event.data);
          }
        });
        
        mediaRecorderRef.current.start(250); 
      });

      connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        const transcript = data.channel.alternatives[0].transcript;
        if (!transcript) return;
        setCaption(transcript);

        if (data.is_final && data.speech_final) {
          onCommandReceived(transcript);
          stopListening();
        }
      });

      connection.on(LiveTranscriptionEvents.Error, () => {
        if (!isManualStop.current) {
          setError("Connection Error");
          stopListening();
        }
      });

      connection.on(LiveTranscriptionEvents.Close, () => {
        if (!isManualStop.current) setIsListening(false);
        stopAudioTools();
        setIsProcessing(false);
      });

    } catch (err) {
      setError("Mic Denied");
      setIsProcessing(false);
    }
  };

  const stopListening = () => {
    if (dgConnectionRef.current?.getReadyState() === 1) {
      dgConnectionRef.current.finish();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
    stopAudioTools();
    setTimeout(() => setIsProcessing(false), 300);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex items-center justify-center">
        {isListening && (
          <div 
            className="absolute rounded-full bg-blue-500/20 transition-all duration-75"
            style={{ width: `${60 + volume}px`, height: `${60 + volume}px` }}
          />
        )}
        <button 
          disabled={isProcessing}
          onClick={isListening ? stopListening : startListening}
          className={`relative z-10 p-5 rounded-full transition-all shadow-xl active:scale-90 disabled:opacity-50 ${
            isListening ? 'bg-red-500 ring-4 ring-red-500/10' : 'bg-blue-600 hover:bg-blue-500'
          } text-white`}
        >
          {isListening ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        {isListening && caption && (
          <div className="absolute bottom-20 left-0 bg-white border shadow-2xl rounded-2xl p-4 min-w-[200px] animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={12} className="text-blue-500 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Live Transcription</span>
            </div>
            <p className="text-sm font-medium text-slate-700 leading-tight">
              {caption}
              <span className="inline-block w-1.5 h-4 ml-1 bg-blue-500 animate-pulse align-middle" />
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Manual Stop Button - Only shows when speaking */}
        {isSpeaking && !isListening && (
          <button 
            onClick={stopSpeech}
            className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all"
          >
            <Square size={12} fill="currentColor" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Stop</span>
          </button>
        )}

        {/* Mute Toggle Button */}
        <button 
          onClick={toggleMute}
          className={`p-3 rounded-xl border transition-all ${
            isMuted 
              ? 'bg-slate-800 border-white/10 text-slate-500' 
              : 'bg-blue-600/10 border-blue-500/20 text-blue-500'
          }`}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        {/* Status Indicators */}
        <div className="flex flex-col">
          {isListening && (
            <div className="flex items-center gap-2">
              <span className="flex gap-0.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </span>
              <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Listening</span>
            </div>
          )}
          
          {isSpeaking && !isListening && (
            <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest animate-pulse">Speaking</span>
          )}

          {error && !isListening && (
            <div className="flex items-center gap-1 text-red-400">
              <AlertCircle size={10} />
              <span className="text-[9px] font-bold uppercase">{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceInterface;