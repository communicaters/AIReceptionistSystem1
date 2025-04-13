import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play } from 'lucide-react';
import { AudioWaveform } from 'lucide-react';

// Define the voice type that matches our API
export interface Voice {
  id: string;
  name: string;
  accent?: string;
  description: string;
  previewUrl?: string;
}

interface VoiceSelectorProps {
  voices: Voice[];
  selectedVoice: string;
  onSelect: (voiceId: string) => void;
  onPreview?: (voice: Voice) => void;
  className?: string;
  disabled?: boolean;
}

export function VoiceSelector({
  voices,
  selectedVoice,
  onSelect,
  onPreview,
  className,
  disabled = false
}: VoiceSelectorProps) {
  // Track if any preview is currently playing
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  
  // Handle voice selection
  const handleSelect = (voiceId: string) => {
    if (disabled) return;
    onSelect(voiceId);
  };
  
  // Handle preview playback
  const handlePreview = (e: React.MouseEvent, voice: Voice) => {
    // Stop propagation to prevent selecting the voice when clicking the preview button
    e.stopPropagation();
    
    if (disabled || !onPreview) return;
    
    // Set the currently playing preview
    setPlayingPreview(voice.id);
    
    // Call the provided preview handler
    onPreview(voice);
    
    // Clear the playing state after a short delay
    setTimeout(() => {
      setPlayingPreview(null);
    }, 1000);
  };
  
  return (
    <div className={className}>
      <div className="space-y-3">
        {voices.map((voice) => (
          <div 
            key={voice.id}
            className={`border rounded-md p-3 flex items-start space-x-3 cursor-pointer hover:border-primary transition-colors ${
              disabled ? 'opacity-70 cursor-not-allowed' : ''
            } ${
              selectedVoice === voice.id ? 'border-primary bg-primary/5' : ''
            }`}
            onClick={() => handleSelect(voice.id)}
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <AudioWaveform className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <h3 className="font-medium">{voice.name}</h3>
                {voice.accent && (
                  <span className="text-xs bg-neutral-100 px-2 py-0.5 rounded-full">
                    {voice.accent}
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-500 mt-1">
                {voice.description}
              </p>
              {onPreview && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2"
                  disabled={disabled}
                  onClick={(e) => handlePreview(e, voice)}
                >
                  <Play className="h-3 w-3 mr-1" />
                  {playingPreview === voice.id ? 'Playing...' : 'Preview'}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}