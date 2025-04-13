import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTrainingData, getIntents } from "@/lib/api";
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
import { PlusCircle, BrainCircuit, Upload, AlertTriangle, Sparkles, RefreshCw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

const AITraining = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  const { 
    data: faqData, 
    isLoading: isLoadingFaqs, 
    error: faqError 
  } = useQuery({
    queryKey: ["/api/training/data", selectedCategory],
    queryFn: () => selectedCategory === "all" 
      ? getTrainingData() 
      : getTrainingData(selectedCategory)
  });

  const { 
    data: intents, 
    isLoading: isLoadingIntents, 
    error: intentsError 
  } = useQuery({
    queryKey: ["/api/training/intents"],
    queryFn: getIntents
  });

  const categories = [
    "General",
    "Products",
    "Support",
    "Billing",
    "Returns",
    "Shipping"
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Core & Training</h1>
          <p className="text-muted-foreground">
            Manage AI training data, customize responses, and monitor performance
          </p>
        </div>
        <Button>
          <BrainCircuit className="mr-2 h-4 w-4" />
          Train AI Model
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="faq">
            <TabsList>
              <TabsTrigger value="faq">FAQ Training</TabsTrigger>
              <TabsTrigger value="intents">Intent Recognition</TabsTrigger>
              <TabsTrigger value="vocabulary">Custom Vocabulary</TabsTrigger>
            </TabsList>
            <TabsContent value="faq" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Frequently Asked Questions</CardTitle>
                      <CardDescription>
                        Train the AI with question-answer pairs to improve responses
                      </CardDescription>
                    </div>
                    <Select 
                      value={selectedCategory} 
                      onValueChange={setSelectedCategory}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(category => (
                          <SelectItem key={category} value={category.toLowerCase()}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingFaqs ? (
                    <Skeleton className="h-64 w-full" />
                  ) : faqError ? (
                    <div className="bg-red-50 p-4 rounded-md text-red-600">
                      Failed to load training data
                    </div>
                  ) : !faqData?.length ? (
                    <div className="text-center py-8 text-neutral-500">
                      No FAQ data found for this category
                    </div>
                  ) : (
                    <Table>
                      <TableCaption>A list of training question-answer pairs</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead>Question</TableHead>
                          <TableHead>Answer</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {faqData.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.category}</TableCell>
                            <TableCell>{item.question}</TableCell>
                            <TableCell>{item.answer}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button variant="ghost" size="sm">
                                  Edit
                                </Button>
                                <Button variant="ghost" size="sm" className="text-red-500">
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New FAQ
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Bulk Upload FAQs</CardTitle>
                  <CardDescription>
                    Upload a CSV file with questions and answers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center">
                    <Upload className="h-8 w-8 text-neutral-400 mb-2" />
                    <h3 className="font-medium text-lg">Drop your CSV file here</h3>
                    <p className="text-neutral-500 text-sm mt-1 text-center">
                      Format: Category, Question, Answer (CSV with headers)
                    </p>
                    <Button className="mt-4" variant="outline">
                      Select File
                    </Button>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="text-sm text-neutral-500">
                    Max file size: 5MB
                  </div>
                  <Button>
                    Upload and Process
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            <TabsContent value="intents">
              <Card>
                <CardHeader>
                  <CardTitle>Intent Recognition</CardTitle>
                  <CardDescription>
                    Define user intents and train with example phrases
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingIntents ? (
                    <Skeleton className="h-64 w-full" />
                  ) : intentsError ? (
                    <div className="bg-red-50 p-4 rounded-md text-red-600">
                      Failed to load intent data
                    </div>
                  ) : !intents?.length ? (
                    <div className="text-center py-8 text-neutral-500">
                      No intent definitions found
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {intents.map((intent) => (
                        <div key={intent.id} className="border rounded-md p-4">
                          <div className="flex justify-between">
                            <h3 className="font-medium text-lg">{intent.intent}</h3>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">
                                Edit
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-500">
                                Delete
                              </Button>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {intent.examples.map((example, i) => (
                              <div key={i} className="bg-neutral-100 px-3 py-1 rounded-full text-sm">
                                {example}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Intent
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            <TabsContent value="vocabulary">
              <Card>
                <CardHeader>
                  <CardTitle>Custom Vocabulary</CardTitle>
                  <CardDescription>
                    Define custom terms, acronyms, and phrases specific to your business
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border rounded-md p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">Product Names</h3>
                          <p className="text-sm text-neutral-500">
                            Custom product names and correct pronunciations
                          </p>
                        </div>
                        <Button variant="outline" size="sm">Edit</Button>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="bg-neutral-50 p-2 rounded text-sm">
                          <span className="font-medium">SuperWidget XL</span>
                          <span className="text-neutral-500 ml-2">
                            (soo-per-wi-jet ex-el)
                          </span>
                        </div>
                        <div className="bg-neutral-50 p-2 rounded text-sm">
                          <span className="font-medium">UltraBoost Pro</span>
                          <span className="text-neutral-500 ml-2">
                            (ul-tra-boost pro)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-md p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">Industry Terms</h3>
                          <p className="text-sm text-neutral-500">
                            Industry-specific terminology and acronyms
                          </p>
                        </div>
                        <Button variant="outline" size="sm">Edit</Button>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="bg-neutral-50 p-2 rounded text-sm">
                          <span className="font-medium">CRM</span>
                          <span className="text-neutral-500 ml-2">
                            Customer Relationship Management
                          </span>
                        </div>
                        <div className="bg-neutral-50 p-2 rounded text-sm">
                          <span className="font-medium">POS</span>
                          <span className="text-neutral-500 ml-2">
                            Point of Sale
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Vocabulary Set
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Training Status</CardTitle>
              <CardDescription>
                Current AI model performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Response Accuracy</Label>
                    <span className="text-sm font-medium">92%</span>
                  </div>
                  <Progress value={92} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Intent Recognition</Label>
                    <span className="text-sm font-medium">87%</span>
                  </div>
                  <Progress value={87} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Entity Extraction</Label>
                    <span className="text-sm font-medium">81%</span>
                  </div>
                  <Progress value={81} className="h-2" />
                </div>

                <div className="rounded-md bg-neutral-50 p-4">
                  <div className="flex items-start space-x-2">
                    <Sparkles className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Last Training</h4>
                      <p className="text-sm text-neutral-500 mt-1">
                        4 hours ago (45 minutes duration)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Model Settings</CardTitle>
              <CardDescription>
                Configure AI behavior and personality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tone-style">Tone & Style</Label>
                  <Select defaultValue="professional">
                    <SelectTrigger id="tone-style">
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly & Casual</SelectItem>
                      <SelectItem value="formal">Formal & Corporate</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="empathetic">Empathetic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="response-length">Response Length</Label>
                  <Select defaultValue="medium">
                    <SelectTrigger id="response-length">
                      <SelectValue placeholder="Select length" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concise">Concise</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="detailed">Detailed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Primary Language</Label>
                  <Select defaultValue="en">
                    <SelectTrigger id="language">
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
                  <Label htmlFor="sample-prompt">Test Prompt</Label>
                  <Textarea 
                    id="sample-prompt" 
                    placeholder="Type a test question here..." 
                    className="resize-none"
                    rows={2}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Test Response
              </Button>
              <Button>Save Settings</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AITraining;
