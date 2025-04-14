import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Mic, Play, VolumeX, Volume2, RefreshCw, Settings, AudioWaveform, Upload, Link2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useRef, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Import our custom speech components
import { AudioPlayer } from "@/components/speech/audio-player";
import { VoiceSelector, type Voice } from "@/components/speech/voice-selector";
import { AudioUploader } from "@/components/speech/audio-uploader";

const SpeechEngines = () => {
  const { toast } = useToast();
  const [volume, setVolume] = useState(80);
  const [speed, setSpeed] = useState(1.0);
  const [testText, setTestText] = useState("Hello, I'm the AI Receptionist. How may I help you today?");
  const [audioUrl, setAudioUrl] = useState("");
  const [transcription, setTranscription] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [selectedVoice, setSelectedVoice] = useState("voice1");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrlInput, setAudioUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch available TTS voices
  // Define the response type for voices
  type VoicesResponse = {
    success: boolean;
    voices: Array<{
      id: string;
      name: string;
      accent?: string;
      description: string;
    }>;
  };
  
  const { data: voicesData, isLoading: isLoadingVoices } = useQuery<VoicesResponse>({
    queryKey: ['/api/speech/tts/voices'],
    enabled: true,
  });
  
  // Text-to-speech mutation
  const ttsTestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/speech/tts', {
        text: testText,
        voiceId: selectedVoice,
        stability: 0.75,
        similarityBoost: 0.7
      });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.audioUrl) {
        setAudioUrl(data.audioUrl);
        toast({
          title: "Speech Generated",
          description: "Text has been converted to speech successfully",
        });
      } else {
        toast({
          title: "Generation Failed",
          description: data.error || "Failed to generate speech",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "An error occurred during text-to-speech generation",
        variant: "destructive",
      });
    }
  });
  
  // Speech-to-text from file upload mutation
  const sttFromFileMutation = useMutation({
    mutationFn: async () => {
      if (!audioFile) throw new Error("No audio file selected");
      
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('language', selectedLanguage);
      
      setIsProcessing(true);
      
      const response = await fetch('/api/speech/stt/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      return await response.json();
    },
    onSuccess: (data) => {
      setIsProcessing(false);
      if (data.success && data.transcript) {
        setTranscription(data.transcript);
        toast({
          title: "Transcription Complete",
          description: `Audio transcribed successfully (${Math.round(data.duration || 0)}s)`,
        });
      } else {
        toast({
          title: "Transcription Failed",
          description: data.error || "Failed to transcribe audio",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      setIsProcessing(false);
      toast({
        title: "Error",
        description: error.message || "An error occurred during speech-to-text processing",
        variant: "destructive",
      });
    }
  });
  
  // Speech-to-text from URL mutation
  const sttFromUrlMutation = useMutation({
    mutationFn: async () => {
      if (!audioUrlInput) throw new Error("No audio URL provided");
      
      setIsProcessing(true);
      
      const response = await apiRequest('POST', '/api/speech/stt/url', {
        audioUrl: audioUrlInput,
        language: selectedLanguage
      });
      
      return await response.json();
    },
    onSuccess: (data) => {
      setIsProcessing(false);
      if (data.success && data.transcript) {
        setTranscription(data.transcript);
        toast({
          title: "Transcription Complete",
          description: `Audio transcribed successfully (${Math.round(data.duration || 0)}s)`,
        });
      } else {
        toast({
          title: "Transcription Failed",
          description: data.error || "Failed to transcribe audio",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      setIsProcessing(false);
      toast({
        title: "Error",
        description: error.message || "An error occurred during speech-to-text processing",
        variant: "destructive",
      });
    }
  });
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAudioFile(e.target.files[0]);
    }
  };
  
  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // In a real application, these would come from API queries
  const sttEngines = [
    { id: 1, name: "OpenAI Whisper", status: "operational", accuracy: 94 },
    { id: 2, name: "Google Speech-to-Text", status: "inactive", accuracy: 92 },
  ];
  
  // Voice type definition
  type VoiceType = {
    id: string;
    name: string;
    accent?: string;
    description: string;
  };
  
  const ttsVoices: VoiceType[] = voicesData?.voices || [
    { id: "voice1", name: "Emma", accent: "American", description: "Professional female voice" },
    { id: "voice2", name: "Michael", accent: "American", description: "Professional male voice" },
    { id: "voice3", name: "Olivia", accent: "British", description: "Friendly female voice" },
    { id: "voice4", name: "James", accent: "British", description: "Friendly male voice" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Speech Engines</h1>
          <p className="text-muted-foreground">
            Configure speech-to-text and text-to-speech capabilities
          </p>
        </div>
        <Button onClick={() => handleFileUpload()}>
          <Mic className="mr-2 h-4 w-4" />
          Test Speech Recognition
        </Button>
      </div>

      <Tabs defaultValue="tts">
        <TabsList>
          <TabsTrigger value="tts">Text-to-Speech</TabsTrigger>
          <TabsTrigger value="stt">Speech-to-Text</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tts" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Text-to-Speech Configuration</CardTitle>
                  <CardDescription>
                    Configure voice settings for automated speech generation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="tts-provider">TTS Provider</Label>
                      <Select defaultValue="elevenlabs">
                        <SelectTrigger id="tts-provider">
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                          <SelectItem value="polly">Amazon Polly</SelectItem>
                          <SelectItem value="google">Google Text-to-Speech</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="api-key">API Key</Label>
                      <Input id="api-key" type="password" placeholder="••••••••••••••••••••••" />
                      <p className="text-xs text-neutral-500">
                        Your API key is stored securely and never shared
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Volume</Label>
                      <div className="flex items-center space-x-4">
                        <VolumeX className="h-4 w-4 text-neutral-500" />
                        <Slider
                          value={[volume]}
                          min={0}
                          max={100}
                          step={1}
                          onValueChange={(vals) => setVolume(vals[0])}
                          className="flex-1"
                        />
                        <Volume2 className="h-4 w-4 text-neutral-500" />
                        <span className="w-12 text-sm text-neutral-500">{volume}%</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Speech Rate</Label>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-neutral-500">Slow</span>
                        <Slider
                          value={[speed * 100]}
                          min={50}
                          max={200}
                          step={10}
                          onValueChange={(vals) => setSpeed(vals[0] / 100)}
                          className="flex-1"
                        />
                        <span className="text-sm text-neutral-500">Fast</span>
                        <span className="w-12 text-sm text-neutral-500">{speed.toFixed(1)}x</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="test-text">Test Text</Label>
                      <Textarea 
                        id="test-text" 
                        value={testText}
                        onChange={(e) => setTestText(e.target.value)}
                        className="resize-none"
                        rows={3}
                      />
                    </div>

                    <Button 
                      className="w-full" 
                      disabled={ttsTestMutation.isPending}
                      onClick={() => ttsTestMutation.mutate()}
                    >
                      {ttsTestMutation.isPending ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Generate & Play Test Audio
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Advanced Settings</CardTitle>
                  <CardDescription>
                    Fine-tune speech generation parameters
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="emotion-detection">Emotion Detection</Label>
                        <p className="text-sm text-neutral-500">
                          Adjust tone based on detected emotions
                        </p>
                      </div>
                      <Switch id="emotion-detection" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="audio-cache">Audio Caching</Label>
                        <p className="text-sm text-neutral-500">
                          Cache commonly used phrases for faster playback
                        </p>
                      </div>
                      <Switch id="audio-cache" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="speech-markers">Speech Markers</Label>
                        <p className="text-sm text-neutral-500">
                          Include SSML markers for breathing pauses
                        </p>
                      </div>
                      <Switch id="speech-markers" defaultChecked />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stability">Voice Stability</Label>
                      <Slider
                        id="stability"
                        defaultValue={[75]}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-neutral-500">
                        <span>More Variable</span>
                        <span>More Stable</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clarity">Voice Clarity & Enhancement</Label>
                      <Slider
                        id="clarity"
                        defaultValue={[80]}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-neutral-500">
                        <span>Natural</span>
                        <span>Enhanced</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    Reset to Defaults
                  </Button>
                </CardFooter>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Voice Selection</CardTitle>
                  <CardDescription>
                    Choose the voice for your AI assistant
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Using our custom VoiceSelector component */}
                  <VoiceSelector 
                    voices={ttsVoices as Voice[]}
                    selectedVoice={selectedVoice}
                    onSelect={(voiceId) => setSelectedVoice(voiceId)}
                    onPreview={(voice) => {
                      setSelectedVoice(voice.id);
                      ttsTestMutation.mutate();
                    }}
                    disabled={ttsTestMutation.isPending}
                  />
                </CardContent>
                <CardFooter>
                  <Button className="w-full">
                    Save Voice Settings
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Adding audio player component for playback */}
              {audioUrl && (
                <Card>
                  <CardHeader>
                    <CardTitle>Audio Preview</CardTitle>
                    <CardDescription>
                      Listen to the generated speech
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AudioPlayer 
                      src={audioUrl}
                      autoPlay={true}
                      volume={volume}
                      playbackRate={speed}
                      onError={(error) => {
                        toast({
                          title: "Playback Error",
                          description: error.message,
                          variant: "destructive",
                        });
                      }}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="stt" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Speech Recognition Configuration</CardTitle>
                  <CardDescription>
                    Configure speech-to-text transcription settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="stt-provider">STT Provider</Label>
                      <Select defaultValue="whisper">
                        <SelectTrigger id="stt-provider">
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whisper">OpenAI Whisper</SelectItem>
                          <SelectItem value="google">Google Speech-to-Text</SelectItem>
                          <SelectItem value="aws">Amazon Transcribe</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stt-api-key">API Key</Label>
                      <Input id="stt-api-key" type="password" placeholder="••••••••••••••••••••••" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="language-model">Language Model</Label>
                      <Select defaultValue="whisper-1">
                        <SelectTrigger id="language-model">
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whisper-1">Whisper-1 (Multilingual)</SelectItem>
                          <SelectItem value="whisper-1-en">Whisper-1 (English Only)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="primary-language">Primary Language</Label>
                        <Select defaultValue="en">
                          <SelectTrigger id="primary-language">
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Spanish</SelectItem>
                            <SelectItem value="fr">French</SelectItem>
                            <SelectItem value="de">German</SelectItem>
                            <SelectItem value="zh">Chinese</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="speech-context">Speech Context</Label>
                        <Select defaultValue="customer-service">
                          <SelectTrigger id="speech-context">
                            <SelectValue placeholder="Select context" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="customer-service">Customer Service</SelectItem>
                            <SelectItem value="technical">Technical Support</SelectItem>
                            <SelectItem value="sales">Sales</SelectItem>
                            <SelectItem value="healthcare">Healthcare</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button 
                      className="w-full"
                      onClick={handleFileUpload}
                    >
                      <Mic className="mr-2 h-4 w-4" />
                      Test Speech Recognition
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Speech-to-Text Test Results</CardTitle>
                  <CardDescription>
                    Real-time transcription results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Hidden file input for audio upload */}
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="audio/*" 
                      className="hidden"
                    />
                    
                    {/* Transcription result display */}
                    <div className="border rounded-md p-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium">Current Transcription</h3>
                        {isProcessing && (
                          <div className="flex items-center">
                            <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
                            <span className="text-xs">Processing...</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-3 p-3 bg-muted/50 rounded-md min-h-24">
                        {transcription ? (
                          <p className="text-sm">{transcription}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            No transcription available. Upload an audio file or provide a URL to begin.
                          </p>
                        )}
                      </div>
                      
                      {audioFile && (
                        <div className="mt-3 flex items-center text-sm text-muted-foreground">
                          <AudioWaveform className="h-4 w-4 mr-2" />
                          <span>{audioFile.name} ({Math.round(audioFile.size / 1024)} KB)</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Audio file upload section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <Label>Upload Audio File</Label>
                        <AudioUploader
                          onFileSelect={(file) => setAudioFile(file)}
                          onRecordingComplete={(blob) => {
                            // Convert blob to file
                            const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
                            const file = new File([blob], `recording_${timestamp}.webm`, { type: 'audio/webm' });
                            setAudioFile(file);
                          }}
                          disabled={isProcessing}
                        />
                        <Button 
                          className="w-full" 
                          disabled={!audioFile || isProcessing}
                          onClick={() => sttFromFileMutation.mutate()}
                        >
                          <AudioWaveform className="mr-2 h-4 w-4" />
                          Transcribe Audio File
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        <Label>Transcribe from URL</Label>
                        <div className="space-y-2">
                          <Input
                            type="url"
                            placeholder="https://example.com/audio.mp3"
                            value={audioUrlInput}
                            onChange={(e) => setAudioUrlInput(e.target.value)}
                          />
                          <Button 
                            className="w-full" 
                            disabled={!audioUrlInput || isProcessing}
                            onClick={() => sttFromUrlMutation.mutate()}
                          >
                            <Link2 className="mr-2 h-4 w-4" />
                            Transcribe from URL
                          </Button>
                        </div>
                        
                        <div className="space-y-2 mt-4">
                          <Label htmlFor="transcription-language">Language</Label>
                          <Select 
                            value={selectedLanguage}
                            onValueChange={setSelectedLanguage}
                          >
                            <SelectTrigger id="transcription-language">
                              <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="en">English</SelectItem>
                              <SelectItem value="es">Spanish</SelectItem>
                              <SelectItem value="fr">French</SelectItem>
                              <SelectItem value="de">German</SelectItem>
                              <SelectItem value="zh">Chinese</SelectItem>
                              <SelectItem value="ja">Japanese</SelectItem>
                              <SelectItem value="ko">Korean</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" onClick={handleFileUpload}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Start New Transcription
                  </Button>
                </CardFooter>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recognition Engines</CardTitle>
                  <CardDescription>
                    Available speech recognition engines
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sttEngines.map((engine) => (
                      <div key={engine.id} className="border rounded-md p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{engine.name}</h3>
                            <div className="flex items-center mt-1">
                              <span 
                                className={`w-2 h-2 rounded-full mr-2 ${
                                  engine.status === 'operational' ? 'bg-green-500' : 'bg-neutral-300'
                                }`}
                              />
                              <span className="text-sm text-neutral-500 capitalize">
                                {engine.status}
                              </span>
                            </div>
                          </div>
                          <Switch checked={engine.status === 'operational'} />
                        </div>
                        <div className="mt-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Accuracy</span>
                            <span className="font-medium">{engine.accuracy}%</span>
                          </div>
                          <Progress value={engine.accuracy} className="h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    Engine Settings
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Custom Vocabulary</CardTitle>
                  <CardDescription>
                    Add industry-specific terms to improve recognition
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border rounded-md p-3">
                      <div className="flex justify-between">
                        <h3 className="font-medium text-sm">Product Names</h3>
                        <Button variant="ghost" size="sm">Edit</Button>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        12 custom terms
                      </p>
                    </div>
                    
                    <div className="border rounded-md p-3">
                      <div className="flex justify-between">
                        <h3 className="font-medium text-sm">Technical Terms</h3>
                        <Button variant="ghost" size="sm">Edit</Button>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        8 custom terms
                      </p>
                    </div>
                    
                    <div className="border rounded-md p-3">
                      <div className="flex justify-between">
                        <h3 className="font-medium text-sm">Industry Acronyms</h3>
                        <Button variant="ghost" size="sm">Edit</Button>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        15 custom terms
                      </p>
                    </div>
                    
                    <Button className="w-full">
                      Add New Vocabulary List
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SpeechEngines;
