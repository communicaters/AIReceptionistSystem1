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
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const SpeechEngines = () => {
  const [volume, setVolume] = useState(80);
  const [speed, setSpeed] = useState(1.0);
  const [testText, setTestText] = useState("Hello, I'm the AI Receptionist. How may I help you today?");
  
  // In a real application, these would come from API queries
  const sttEngines = [
    { id: 1, name: "OpenAI Whisper", status: "operational", accuracy: 94 },
    { id: 2, name: "Google Speech-to-Text", status: "inactive", accuracy: 92 },
  ];
  
  const ttsVoices = [
    { id: "voice1", name: "Emma", gender: "Female", accent: "American", description: "Professional female voice" },
    { id: "voice2", name: "Michael", gender: "Male", accent: "American", description: "Professional male voice" },
    { id: "voice3", name: "Olivia", gender: "Female", accent: "British", description: "Friendly female voice" },
    { id: "voice4", name: "James", gender: "Male", accent: "British", description: "Friendly male voice" },
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
        <Button>
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

                    <Button className="w-full">
                      <Play className="mr-2 h-4 w-4" />
                      Play Test Audio
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
                  <div className="space-y-4">
                    {ttsVoices.map((voice) => (
                      <div 
                        key={voice.id}
                        className="border rounded-md p-3 flex items-start space-x-3 cursor-pointer hover:border-primary"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <AudioWaveform className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <h3 className="font-medium">{voice.name}</h3>
                            <span className="text-xs bg-neutral-100 px-2 py-0.5 rounded-full">
                              {voice.accent}
                            </span>
                          </div>
                          <p className="text-sm text-neutral-500 mt-1">
                            {voice.description}
                          </p>
                          <Button variant="ghost" size="sm" className="mt-2">
                            <Play className="h-3 w-3 mr-1" />
                            Preview
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">
                    Save Voice Settings
                  </Button>
                </CardFooter>
              </Card>
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

                    <Button className="w-full">
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
                    Recorded test transcriptions and accuracy metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border rounded-md p-4">
                      <div className="flex justify-between">
                        <h3 className="font-medium">Test Transcript 1</h3>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                          97% Accuracy
                        </span>
                      </div>
                      <p className="mt-2 text-sm">
                        "I'd like to schedule a meeting with the sales team next Tuesday at 2 PM."
                      </p>
                      <div className="mt-3 flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Play className="h-3 w-3 mr-1" />
                          Play Recording
                        </Button>
                        <Button variant="ghost" size="sm">View Details</Button>
                      </div>
                    </div>

                    <div className="border rounded-md p-4">
                      <div className="flex justify-between">
                        <h3 className="font-medium">Test Transcript 2</h3>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                          92% Accuracy
                        </span>
                      </div>
                      <p className="mt-2 text-sm">
                        "What are your business hours for the downtown location?"
                      </p>
                      <div className="mt-3 flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Play className="h-3 w-3 mr-1" />
                          Play Recording
                        </Button>
                        <Button variant="ghost" size="sm">View Details</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Run Accuracy Tests
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
