import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, AlertCircle } from 'lucide-react';
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";

const VoiceInterface = ({ onCommandReceived, lastResponse }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // New lock state
  const [error, setError] = useState(null);
  const [volume, setVolume] = useState(0);

  const dgConnectionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);
  const isManualStop = useRef(false);

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
    if (isProcessing || isListening) return; // Prevent double trigger
    
    setIsProcessing(true);
    isManualStop.current = false;
    setError(null);
    
    try {
      const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY;
      if (!apiKey) {
        setError("API Key Missing");
        setIsProcessing(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      startVolumeAnalysis(stream);

      const deepgram = createClient(apiKey);
      const connection = deepgram.listen.live({
        model: "nova-2",
        interim_results: false,
        language: "en-US",
        smart_format: true,
      });

      dgConnectionRef.current = connection;

      connection.on(LiveTranscriptionEvents.Open, () => {
        setIsListening(true);
        setIsProcessing(false); // Unlock after successful open
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
        if (transcript && data.is_final) {
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
    if (isProcessing) return; // Prevent double trigger
    setIsProcessing(true);
    isManualStop.current = true; 
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (dgConnectionRef.current) {
      dgConnectionRef.current.finish();
      dgConnectionRef.current = null;
    }
    
    setIsListening(false);
    stopAudioTools();
    
    // Safety timeout to ensure hardware release before allowing next toggle
    setTimeout(() => setIsProcessing(false), 300);
  };

  const speakResponse = (text) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const premiumVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || voices[0];
    
    if (premiumVoice) utterance.voice = premiumVoice;
    utterance.pitch = 1.05; 
    utterance.rate = 0.95; 

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (lastResponse) speakResponse(lastResponse);
  }, [lastResponse]);

  useEffect(() => {
    window.speechSynthesis.getVoices();
  }, []);

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex items-center justify-center">
        {isListening && (
          <div 
            className="absolute rounded-full bg-blue-500/20 transition-all duration-75"
            style={{ width: `${56 + volume}px`, height: `${56 + volume}px` }}
          />
        )}
        <button 
          id="voice-trigger-btn"
          disabled={isProcessing}
          onClick={isListening ? stopListening : startListening}
          className={`relative z-10 p-4 rounded-full transition-all shadow-xl active:scale-95 disabled:opacity-50 ${
            isListening ? 'bg-red-500 ring-4 ring-red-500/20' : 'bg-blue-600 hover:bg-blue-500'
          } text-white`}
        >
          {isListening ? <MicOff size={22} /> : <Mic size={22} />}
        </button>
      </div>

      <div className="flex flex-col min-w-[140px]">
        {isListening && (
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5 items-end h-3">
               {[0.1, 0.2, 0.3].map((d, i) => (
                 <div key={i} className="w-1 bg-blue-400 rounded-full animate-bounce" style={{ height: '100%', animationDelay: `${d}s` }} />
               ))}
            </div>
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Listening</span>
          </div>
        )}
        
        {isSpeaking && !isListening && (
          <div className="flex items-center gap-2 text-amber-500 animate-in fade-in slide-in-from-left-2">
            <Volume2 size={14} className="animate-pulse" />
            <span className="text-[10px] font-bold uppercase">Assistant Speaking</span>
          </div>
        )}

        {error && !isListening && (
          <div className="flex items-center gap-1 text-red-400">
            <AlertCircle size={12} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceInterface;