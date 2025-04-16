import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { createTrainingData, createIntent } from "@/lib/api";
import { Progress } from "@/components/ui/progress";

// Sample training data examples for different categories
const trainingExamples = [
  // Voice calls
  { category: "call", content: "When a caller asks for business hours, state the hours from Monday to Friday, 9 AM to 5 PM, and mention that we're closed on weekends." },
  { category: "call", content: "For calls asking about setting up an appointment, ask for their name, contact information, and preferred time before scheduling." },
  { category: "call", content: "If a caller needs technical support, ask for their account number first, then the nature of their technical issue." },
  { category: "voicemail", content: "If the call goes to voicemail, leave a message that includes the date and time of the call, your name, and a brief reason for calling. Ask them to return the call and provide your contact number." },
  { category: "call", content: "When transferring a call, always inform the caller that you're transferring them and to whom. Provide a brief reason for the transfer." },

  // Email handling
  { category: "email", content: "All emails should be acknowledged within 1 business hour, even if a full resolution takes longer." },
  { category: "email", content: "When responding to customer inquiries by email, begin with a greeting using their name, reference their specific question, and provide a clear answer with any necessary links or attachments." },
  { category: "email", content: "Email signatures should include your full name, position, company name, contact number, and a link to schedule a meeting if needed." },
  { category: "email", content: "For email support tickets, confirm receipt with a ticket number and estimated resolution time." },
  { category: "email", content: "When sending follow-up emails, reference previous communication and summarize what actions have been taken so far." },
  
  // Chat/WhatsApp
  { category: "chat", content: "Respond to all chat messages within 1 minute during business hours." },
  { category: "chat", content: "Begin chat interactions with a greeting and your name." },
  { category: "chat", content: "For complex issues in chat, offer to escalate to a phone call or schedule a time to have a more detailed discussion." },
  { category: "whatsapp", content: "When using WhatsApp for business communication, maintain the same professional tone as other channels, but messages can be more concise." },
  { category: "whatsapp", content: "Use WhatsApp's list or button features when providing multiple options to simplify customer selection." },

  // Calendar & Meetings
  { category: "calendar", content: "Before scheduling a meeting, verify availability in the shared calendar and block the time immediately upon confirmation." },
  { category: "meeting", content: "All meeting invitations should include an agenda, expected duration, and any preparation needed from participants." },
  { category: "scheduling", content: "When scheduling external meetings, provide a link to your booking system rather than going back and forth with available times." },
  { category: "calendar", content: "If a meeting needs to be rescheduled, provide at least two alternative times and dates." },
  { category: "meeting", content: "Send meeting reminders 24 hours in advance with the agenda and any relevant documents." },

  // Business & Product information
  { category: "business", content: "When discussing company history, mention our founding in 2015 and our mission to simplify communication through AI technology." },
  { category: "product", content: "The AI Receptionist has three pricing tiers: Basic ($49/month), Professional ($99/month), and Enterprise (custom pricing)." },
  { category: "product", content: "Key features include multi-channel support (voice, email, chat, WhatsApp), AI-powered responses, and seamless calendar integration." },
  { category: "business", content: "Our support hours are Monday to Friday, 9 AM to 6 PM Eastern Time." },
  { category: "business", content: "For partnership inquiries, direct them to partnerships@aireceptionist.com." },

  // General interactions
  { category: "greeting", content: "Begin all interactions with a warm welcome that includes the company name." },
  { category: "farewell", content: "End conversations by thanking the person for their time, summarizing any next steps, and offering additional assistance if needed." },
  { category: "general", content: "If you don't know the answer to a question, acknowledge that and offer to find out rather than guessing." },
  { category: "general", content: "Always address people by their name if it's available." },
  { category: "fallback", content: "When unable to understand a request, politely ask for clarification and provide examples of what you can help with." }
];

// Intent mapping examples
const intentExamples = [
  {
    intent: "schedule_meeting",
    examples: [
      "I need to schedule a meeting",
      "Book an appointment",
      "Find a time for us to meet",
      "Can we set up a call?",
      "I'd like to arrange a meeting with the team"
    ]
  },
  {
    intent: "business_hours",
    examples: [
      "What are your hours?",
      "When are you open?",
      "What time do you close?",
      "Are you open on weekends?",
      "Business hours please"
    ]
  },
  {
    intent: "product_info",
    examples: [
      "Tell me about your products",
      "What services do you offer?",
      "How much does it cost?",
      "Do you have pricing information?",
      "Features of AI Receptionist"
    ]
  },
  {
    intent: "technical_support",
    examples: [
      "I'm having a problem with...",
      "Something's not working",
      "I need help with a technical issue",
      "The system is down",
      "How do I fix..."
    ]
  },
  {
    intent: "contact_human",
    examples: [
      "I want to speak to a person",
      "Connect me with a human",
      "Transfer to an agent",
      "Is there someone I can talk to?",
      "Real person please"
    ]
  },
  {
    intent: "greeting",
    examples: [
      "Hello",
      "Hi there",
      "Good morning",
      "Hey",
      "How are you?"
    ]
  },
  {
    intent: "check_status",
    examples: [
      "What's the status of my request?",
      "Update on my ticket",
      "Has my issue been resolved?",
      "Any progress on my case?",
      "Where are we with..."
    ]
  }
];

const AddInitialTrainingDataPage = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState({
    trainingData: 0,
    intents: 0,
    failed: 0
  });

  const totalItems = trainingExamples.length + intentExamples.length;

  const addAllData = async () => {
    setIsLoading(true);
    setError(null);
    setProgress(0);
    setCompleted(false);
    setResults({ trainingData: 0, intents: 0, failed: 0 });

    try {
      // Add training data
      for (let i = 0; i < trainingExamples.length; i++) {
        try {
          const example = trainingExamples[i];
          await createTrainingData({ 
            category: example.category, 
            content: example.content
          });
          setResults(prev => ({ ...prev, trainingData: prev.trainingData + 1 }));
        } catch (e) {
          console.error("Failed to add training example:", e);
          setResults(prev => ({ ...prev, failed: prev.failed + 1 }));
        }
        setProgress(Math.round(((i + 1) / totalItems) * 100));
      }

      // Add intent mappings
      const startIdx = trainingExamples.length;
      for (let i = 0; i < intentExamples.length; i++) {
        try {
          const intent = intentExamples[i];
          await createIntent({
            intent: intent.intent,
            examples: intent.examples
          });
          setResults(prev => ({ ...prev, intents: prev.intents + 1 }));
        } catch (e) {
          console.error("Failed to add intent:", e);
          setResults(prev => ({ ...prev, failed: prev.failed + 1 }));
        }
        setProgress(Math.round(((startIdx + i + 1) / totalItems) * 100));
      }

      setCompleted(true);
      toast({
        title: "Training data added successfully",
        description: `Added ${results.trainingData} training examples and ${results.intents} intent mappings.`,
      });
    } catch (e) {
      console.error("Error adding training data:", e);
      setError("An error occurred while adding training data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Add Initial Training Data</h1>
        <p className="text-muted-foreground">
          This will add example training data and intent mappings to help bootstrap the AI Receptionist system.
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Initialize Training Data</CardTitle>
            <CardDescription>
              Adds a set of common training examples and intent mappings covering voice calls, emails, chat, calendar, and general business information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="rounded-lg border p-3">
                  <p className="text-sm font-medium mb-2">Training Examples</p>
                  <p className="text-2xl font-bold">{trainingExamples.length}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-sm font-medium mb-2">Intent Mappings</p>
                  <p className="text-2xl font-bold">{intentExamples.length}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-sm font-medium mb-2">Categories</p>
                  <p className="text-2xl font-bold">
                    {new Set(trainingExamples.map(ex => ex.category)).size}
                  </p>
                </div>
              </div>

              {isLoading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {completed && !isLoading && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                  <div>
                    <p className="font-medium text-green-800">Training data added successfully!</p>
                    <p className="text-sm text-green-700">
                      Added {results.trainingData} training examples and {results.intents} intent mappings.
                      {results.failed > 0 && ` (${results.failed} items failed)`}
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-red-800">{error}</p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={addAllData} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding Training Data...
                </>
              ) : completed ? (
                "Add More Training Data"
              ) : (
                "Add Initial Training Data"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AddInitialTrainingDataPage;