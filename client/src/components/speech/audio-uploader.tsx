import { useState, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, Upload, RotateCw, Check, X } from 'lucide-react';

interface AudioUploaderProps {
  onFileSelect: (file: File) => void;
  onRecordingComplete?: (blob: Blob) => void;
  allowedTypes?: string[];
  maxSize?: number; // in bytes
  className?: string;
  disabled?: boolean;
}

export function AudioUploader({
  onFileSelect,
  onRecordingComplete,
  allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'],
  maxSize = 10 * 1024 * 1024, // 10MB default
  className,
  disabled = false
}: AudioUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Handle file selection
  const handleFileSelect = (file: File | null) => {
    if (!file) {
      setFileName(null);
      setError(null);
      return;
    }
    
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      setError(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
      setFileName(null);
      return;
    }
    
    // Check file size
    if (file.size > maxSize) {
      setError(`File too large. Maximum size: ${(maxSize / (1024 * 1024)).toFixed(1)}MB`);
      setFileName(null);
      return;
    }
    
    // Clear any previous errors
    setError(null);
    setFileName(file.name);
    
    // Call the callback
    onFileSelect(file);
  };
  
  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    handleFileSelect(file);
  };
  
  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    handleFileSelect(file);
  };
  
  // Open file dialog
  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Clear selected file
  const clearFile = () => {
    setFileName(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Handle recording
  const startRecording = async () => {
    if (!onRecordingComplete) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Reset audio chunks
      audioChunksRef.current = [];
      
      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      // Handle data available event
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = () => {
        // Create a blob from the audio chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Stop all tracks in the stream
        stream.getTracks().forEach(track => track.stop());
        
        // Set file name
        const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
        setFileName(`recording_${timestamp}.webm`);
        
        // Call the callback
        onRecordingComplete(audioBlob);
        setIsRecording(false);
      };
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to access microphone');
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };
  
  return (
    <div className={className}>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept={allowedTypes.join(',')}
        className="hidden"
        disabled={disabled}
      />
      
      {/* Drag and drop area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-md p-6 text-center
          transition-colors cursor-pointer
          ${isDragging ? 'border-primary bg-primary/5' : 'border-neutral-200'}
          ${disabled ? 'opacity-70 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
        `}
        onClick={openFileDialog}
      >
        {fileName ? (
          <div className="flex items-center justify-between">
            <span className="truncate max-w-xs">{fileName}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-8 w-8 mx-auto text-neutral-400" />
            <p className="text-sm text-neutral-600">
              Drag and drop an audio file or click to browse
            </p>
            <p className="text-xs text-neutral-500">
              Supported formats: MP3, WAV, OGG, WEBM
            </p>
          </div>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}
      
      {/* Recording controls */}
      {onRecordingComplete && (
        <div className="mt-4 flex justify-center">
          <Button
            variant={isRecording ? "destructive" : "outline"}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled}
          >
            {isRecording ? (
              <>
                <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 mr-2" />
                Record Audio
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}