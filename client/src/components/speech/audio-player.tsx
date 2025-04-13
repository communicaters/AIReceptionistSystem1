import { useState, useEffect, useRef } from 'react';
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
  
  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    
    // Set up event listeners
    audio.addEventListener('play', () => setIsPlaying(true));
    audio.addEventListener('pause', () => setIsPlaying(false));
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);
    
    // Clean up on unmount
    return () => {
      audio.pause();
      audio.removeEventListener('play', () => setIsPlaying(true));
      audio.removeEventListener('pause', () => setIsPlaying(false));
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
    };
  }, []);
  
  // Load new audio when src changes
  useEffect(() => {
    if (!src || !audioRef.current) return;
    
    // Reset state for new audio
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
    
    const audio = audioRef.current;
    audio.src = src;
    audio.volume = volume / 100;
    audio.playbackRate = playbackRate;
    
    if (autoPlay) {
      playAudio();
    }
  }, [src]);
  
  // Update volume and playback rate when they change
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume / 100;
  }, [volume]);
  
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);
  
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };
  
  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };
  
  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (onEnded) onEnded();
  };
  
  const handleError = (e: Event) => {
    const errorMessage = "Failed to load audio file";
    setError(errorMessage);
    if (onError) onError(new Error(errorMessage));
  };
  
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