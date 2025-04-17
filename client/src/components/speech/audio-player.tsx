import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  src?: string;
  autoPlay?: boolean;
  volume?: number;
  playbackRate?: number;
  className?: string;
  onEnded?: () => void;
  onError?: (error: Error) => void;
}

export function AudioPlayer({
  src,
  autoPlay = false,
  volume = 80,
  playbackRate = 1.0,
  className,
  onEnded,
  onError
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Create stable callback references to avoid issues with event listeners
  const handlePlayEvent = useCallback(() => setIsPlaying(true), []);
  const handlePauseEvent = useCallback(() => setIsPlaying(false), []);
  
  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  }, []);
  
  const handleLoadedMetadata = useCallback(() => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  }, []);
  
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (onEnded) onEnded();
  }, [onEnded]);
  
  const handleError = useCallback((e: Event) => {
    console.log("Audio player error:", e);
    let errorMessage = "Failed to load audio file";
    
    // Get more detailed error message if available
    if (audioRef.current && audioRef.current.error) {
      const mediaError = audioRef.current.error;
      // Add code information to error message
      if (mediaError.code) {
        const errorCodes = {
          1: "MEDIA_ERR_ABORTED - Audio playback was aborted",
          2: "MEDIA_ERR_NETWORK - Network error occurred during playback",
          3: "MEDIA_ERR_DECODE - Audio decoding error",
          4: "MEDIA_ERR_SRC_NOT_SUPPORTED - Audio format not supported"
        };
        errorMessage = errorCodes[mediaError.code as keyof typeof errorCodes] || errorMessage;
      }
      
      // Add any additional error message from the browser
      if (mediaError.message) {
        errorMessage += `: ${mediaError.message}`;
      }
    }
    
    setError(errorMessage);
    if (onError) onError(new Error(errorMessage));
  }, [onError]);
  
  const playAudio = () => {
    if (!audioRef.current || !src) return;
    
    audioRef.current.play().catch(error => {
      console.error("Error playing audio:", error);
      setError("Failed to play audio file");
      if (onError) onError(error);
    });
  };
  
  const pauseAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
  };
  
  const restartAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    playAudio();
  };
  
  const skipForward = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 5, duration);
  };
  
  const skipBackward = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 5, 0);
  };
  
  const handleSeek = (values: number[]) => {
    if (!audioRef.current || values.length === 0) return;
    audioRef.current.currentTime = values[0];
    setCurrentTime(values[0]);
  };
  
  // Format time in MM:SS
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-4">
        {error ? (
          <div className="text-destructive text-sm mb-2">
            {error}
          </div>
        ) : null}
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">{formatTime(currentTime)}</span>
            <span className="text-sm">{formatTime(duration || 0)}</span>
          </div>
          
          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            disabled={!src || duration === 0}
            className="w-full"
          />
          
          <div className="flex items-center justify-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={skipBackward}
              disabled={!src}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button
              variant="default"
              size="icon"
              onClick={isPlaying ? pauseAudio : playAudio}
              disabled={!src}
              className="h-10 w-10 rounded-full"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 pl-0.5" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={skipForward}
              disabled={!src}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            {volume === 0 ? (
              <VolumeX className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Volume2 className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground min-w-[3ch]">
              {volume}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}