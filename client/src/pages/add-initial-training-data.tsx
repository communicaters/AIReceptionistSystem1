import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createTrainingData, createIntent } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/layout/dashboard-layout";

// Sample training data examples for different categories - with human, conversational tone
const trainingExamples = [
  // Voice calls - warm and natural responses
  { category: "call", content: "We're open weekdays from 9 to 5. Let me know if you need any help outside those hours - I can always try to arrange something that works for you!" },
  { category: "call", content: "I'd be happy to help set up that appointment for you. What day works best on your end? And could I get your name and best number to reach you, just in case we need to make any changes?" },
  { category: "call", content: "I understand you're having a technical issue - that can be frustrating! If you have your account number handy, I can pull up your information right away and get this sorted for you." },
  { category: "voicemail", content: "Hi there! This is Jamie from Acme Solutions calling on Tuesday afternoon about your recent inquiry. I've got some great options for you - give me a call back at 555-1234 whenever you have a moment. Looking forward to chatting!" },
  { category: "call", content: "I'm going to connect you with Sarah from our technical team - she's amazing with these kinds of questions and will get you taken care of right away. Just give me one second to transfer you." },

  // Email handling - personalized and warm
  { category: "email", content: "Thanks for your email! I wanted to let you know I've received it and I'm looking into this for you right now. You'll hear back from me very soon with more details." },
  { category: "email", content: "Hi David, thanks for reaching out about the project timeline! I've checked with the team, and we're actually running a bit ahead of schedule. I've attached the latest progress report for you to review. Let me know if you need anything else!" },
  { category: "email", content: "Jamie Miller\nCustomer Success Manager\nAcme Solutions\n555-123-4567\nBook a chat with me: calendly.com/jamiemiller" },
  { category: "email", content: "Thanks for your support request! I've created ticket #45678 for you. Our team is already looking into this, and we should have a solution for you within the next 4 hours. I'll keep you posted!" },
  { category: "email", content: "Following up on our conversation from Tuesday - I spoke with the development team and they've implemented those changes you requested. Would you have time this week to take a look and share your thoughts?" },
  
  // Chat/WhatsApp - casual but professional
  { category: "chat", content: "I'll jump on your questions right away! Give me just a minute to pull up that information for you." },
  { category: "chat", content: "Hey there! I'm Jamie with customer support. How can I make your day better?" },
  { category: "chat", content: "This is a bit complex to handle over chat. Would you prefer a quick phone call to sort this out faster? I'm available now if that works for you!" },
  { category: "whatsapp", content: "Thanks for reaching out! I can definitely help with that question about your subscription. The upgrade you're asking about includes 5 additional users and premium support." },
  { category: "whatsapp", content: "Which option works better for you: 1) Schedule a demo this week, 2) Get pricing info by email, or 3) Speak with a sales specialist?" },

  // Calendar & Meetings - helpful and accommodating
  { category: "calendar", content: "I've checked the team calendar and we have availability on Thursday at 2pm or Friday morning. Which would work better for your schedule?" },
  { category: "meeting", content: "I've set up our call for Tuesday at 3pm EST. We'll be discussing the Q3 marketing strategy, and it should take about 45 minutes. Could you come prepared with your campaign results from last quarter?" },
  { category: "scheduling", content: "Instead of going back and forth, you can pick a time that works for you right here: calendly.com/mylink. I've opened up extra slots this week just for you!" },
  { category: "calendar", content: "Sorry we need to reschedule! Would Tuesday at 11am or Wednesday at 2pm work better with your schedule? I've temporarily held both times for you." },
  { category: "meeting", content: "Just a friendly reminder about our strategy call tomorrow at 10am. I've attached the discussion points we'll cover and the latest analytics report. Looking forward to our conversation!" },

  // Business & Product information - enthusiastic but genuine
  { category: "business", content: "We started back in 2015 with a simple mission - to make communication effortless through smart AI. It's been an amazing journey seeing how we've transformed customer experiences since then!" },
  { category: "product", content: "Our pricing is designed to grow with your needs. Many of our customers start with the Basic plan at $49/month, though the Professional plan at $99 is our most popular option because of the advanced analytics. For larger organizations, we create custom Enterprise packages." },
  { category: "product", content: "What makes our solution special is how it brings everything together in one place - your voice calls, emails, chat, and WhatsApp messages, all with smart AI responses. And the calendar integration is seamless, so you'll never miss an important meeting." },
  { category: "business", content: "Our support team is here for you weekdays from 9am to 6pm Eastern. If you need help outside those hours, leave a message and we'll get back to you first thing the next morning!" },
  { category: "business", content: "I'd love to connect you with our partnerships team! Drop an email to partnerships@aireceptionist.com, and Maya will personally get back to you within a day to discuss the opportunities." },

  // General interactions - conversational and natural
  { category: "greeting", content: "Hey there! Welcome to Acme Solutions. How can I help make your day better?" },
  { category: "farewell", content: "Thanks so much for chatting today, Jessica! I've got you all set up with those account changes, and I'll send over that information we discussed by email. Is there anything else I can help with before you go?" },
  { category: "general", content: "That's a great question! I'm not 100% certain about the details, but I'd rather get you the right answer than guess. Can I look into this and get back to you in about an hour?" },
  { category: "general", content: "Great to hear from you again, Michael! How have things been since we last spoke?" },
  { category: "fallback", content: "I want to make sure I'm helping you correctly, but I'm not quite following. Could you tell me a bit more about what you're looking for? I can help with things like account questions, scheduling, or technical support." }
];

// Intent mapping examples - expanded with more conversational, natural expressions
const intentExamples = [
  {
    intent: "schedule_meeting",
    examples: [
      "I need to schedule a meeting",
      "Could you help me book an appointment?",
      "I'd like to find a time that works for us to connect",
      "Can we jump on a call sometime this week?",
      "I need to arrange a chat with someone from your team",
      "When would be a good time to discuss this further?",
      "Let's set up some time to talk about this project"
    ]
  },
  {
    intent: "business_hours",
    examples: [
      "What are your hours?",
      "When are you guys open?",
      "What time do you close today?",
      "Are you available on weekends?",
      "What days of the week are you open?",
      "Is anyone there on Sunday?",
      "Do you have holiday hours?"
    ]
  },
  {
    intent: "product_info",
    examples: [
      "Tell me a bit about what you offer",
      "What kind of services do you provide?",
      "I'm wondering about your pricing",
      "Could you share some details about your plans?",
      "What makes your product special?",
      "Can you tell me more about how the AI Receptionist works?",
      "I'm trying to understand if this would be a good fit for my company"
    ]
  },
  {
    intent: "technical_support",
    examples: [
      "I'm having trouble with the system",
      "Something's been acting weird on my account",
      "I can't seem to get this feature working",
      "The app keeps crashing when I try to...",
      "I think there might be a bug in your system",
      "Can you help me fix this issue?",
      "The integration with my calendar isn't working properly"
    ]
  },
  {
    intent: "contact_human",
    examples: [
      "Could I talk to someone from your team?",
      "I'd prefer to speak with a person about this",
      "Is there a way to reach your customer support?",
      "Can you connect me with someone who can help with this?",
      "I need to speak to a specialist about this question",
      "This is a bit complex - is there someone I could talk to directly?",
      "I'd like to have a conversation with a real person"
    ]
  },
  {
    intent: "greeting",
    examples: [
      "Hey there!",
      "Hi, how's it going?",
      "Good morning, hope you're having a great day",
      "Hello, thanks for being here",
      "Hey, appreciate you helping me out",
      "Hi! Just wanted to ask a quick question",
      "Hello, hope I'm not interrupting!"
    ]
  },
  {
    intent: "check_status",
    examples: [
      "Just wondering where we are with my request?",
      "Has there been any progress on my support ticket?",
      "I'm following up on the issue I reported yesterday",
      "Just checking in on the status of my order",
      "Have you had a chance to look at my question from earlier?",
      "Any updates on that thing we discussed?",
      "I'm curious about what's happening with my case"
    ]
  },
  {
    intent: "general_inquiry",
    examples: [
      "I have a quick question about something",
      "I was wondering if you could help me understand something",
      "Could you explain how this works?",
      "I'm reaching out because I wanted to ask about...",
      "Just looking for some information on...",
      "I'm curious about something on your website",
      "Mind if I ask you something real quick?"
    ]
  }
];

const AddInitialTrainingDataPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
      let successfulTrainingData = 0;
      let successfulIntents = 0;
      let failedItems = 0;

      // Add training data
      for (let i = 0; i < trainingExamples.length; i++) {
        try {
          const example = trainingExamples[i];
          const result = await createTrainingData({ 
            category: example.category, 
            content: example.content,
            userId: 1 // Explicitly set userId
          });
          
          if (result && result.id) {
            successfulTrainingData++;
          } else {
            failedItems++;
          }
        } catch (e) {
          console.error("Failed to add training example:", e);
          failedItems++;
        }
        setProgress(Math.round(((i + 1) / totalItems) * 100));
      }

      // Add intent mappings
      const startIdx = trainingExamples.length;
      for (let i = 0; i < intentExamples.length; i++) {
        try {
          const intent = intentExamples[i];
          const result = await createIntent({
            intent: intent.intent,
            examples: intent.examples,
            userId: 1 // Explicitly set userId
          });
          
          if (result && result.id) {
            successfulIntents++;
          } else {
            failedItems++;
          }
        } catch (e) {
          console.error("Failed to add intent:", e);
          failedItems++;
        }
        setProgress(Math.round(((startIdx + i + 1) / totalItems) * 100));
      }

      // Update results with actual counts
      setResults({
        trainingData: successfulTrainingData,
        intents: successfulIntents,
        failed: failedItems
      });

      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/training/data'] });
      queryClient.invalidateQueries({ queryKey: ['/api/training/intents'] });
      
      setCompleted(true);
      toast({
        title: "Training data added successfully",
        description: `Added ${successfulTrainingData} training examples and ${successfulIntents} intent mappings.`,
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