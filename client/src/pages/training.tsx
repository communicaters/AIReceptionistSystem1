import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit, Trash2, Filter, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import DashboardLayout from "@/components/layout/dashboard-layout";

// Types for our training data
interface TrainingData {
  id: number;
  userId: number;
  category: string;
  content: string;
  metadata: any;
  createdAt: string;
}

interface Intent {
  id: number;
  userId: number;
  intent: string;
  examples: string[];
}

// API functions
const fetchTrainingData = async (category?: string) => {
  const url = category 
    ? `/api/training/data?category=${encodeURIComponent(category)}` 
    : '/api/training/data';
  const response = await apiRequest('GET', url);
  return response.json();
};

const createTrainingData = async (data: Omit<TrainingData, 'id' | 'userId' | 'createdAt' | 'metadata'>) => {
  const response = await apiRequest('POST', '/api/training/data', { 
    ...data, 
    userId: 1, // Fixed user ID for demo
    metadata: {} // Default empty metadata
  });
  return response.json();
};

const updateTrainingDataItem = async ({ id, data }: { 
  id: number, 
  data: Partial<Omit<TrainingData, 'id' | 'userId' | 'createdAt' | 'metadata'>> 
}) => {
  const response = await apiRequest('PATCH', `/api/training/data/${id}`, data);
  return response.json();
};;

const updateTrainingData = async (id: number, data: Partial<Omit<TrainingData, 'id' | 'userId' | 'createdAt' | 'metadata'>>) => {
  const response = await apiRequest('PATCH', `/api/training/data/${id}`, data);
  return response.json();
};

const deleteTrainingData = async (id: number) => {
  const response = await apiRequest('DELETE', `/api/training/data/${id}`);
  return response.json();
};

const fetchIntents = async () => {
  const response = await apiRequest('GET', '/api/training/intents');
  return response.json();
};

const createIntent = async (data: Omit<Intent, 'id' | 'userId'>) => {
  const response = await apiRequest('POST', '/api/training/intents', { 
    ...data, 
    userId: 1 // Fixed user ID for demo
  });
  return response.json();
};

// Common categories for training data
const commonCategories = [
  "general",
  "product",
  "service",
  "greeting",
  "farewell",
  "whatsapp",
  "email",
  "voice",
  "call",
  "voicemail",
  "chat",
  "calendar",
  "scheduling",
  "meeting",
  "business",
  "faq",
  "support"
];

// Main component
const TrainingPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showIntentDialog, setShowIntentDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTrainingData, setEditingTrainingData] = useState<TrainingData | null>(null);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  
  // Training data queries and mutations
  const { 
    data: trainingData = [], 
    isLoading: isLoadingData,
    error: dataError
  } = useQuery<TrainingData[]>({
    queryKey: ['/api/training/data', selectedCategory],
    queryFn: () => fetchTrainingData(selectedCategory === "all" ? undefined : selectedCategory),
  });

  // Intents queries and mutations
  const { 
    data: intents = [], 
    isLoading: isLoadingIntents,
    error: intentsError
  } = useQuery<Intent[]>({
    queryKey: ['/api/training/intents'],
    queryFn: fetchIntents,
  });

  // Extract all unique categories from training data
  useEffect(() => {
    if (trainingData && trainingData.length > 0) {
      const categories = new Set<string>();
      
      // Add common categories first
      commonCategories.forEach(cat => categories.add(cat));
      
      // Add categories from data
      trainingData.forEach(item => {
        if (item.category) categories.add(item.category);
      });
      
      setAllCategories(Array.from(categories).sort());
    }
  }, [trainingData]);

  // Training data mutations
  const addTrainingDataMutation = useMutation({
    mutationFn: createTrainingData,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/data'] });
      toast({
        title: "Training data added",
        description: "Your training data has been successfully added.",
      });
      setShowAddDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add training data",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update training data mutation
  const updateTrainingDataMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<Omit<TrainingData, 'id' | 'userId' | 'createdAt' | 'metadata'>> }) => 
      updateTrainingData(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/data'] });
      toast({
        title: "Training data updated",
        description: "Your training data has been successfully updated.",
      });
      setShowEditDialog(false);
      setEditingTrainingData(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update training data",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete training data mutation
  const deleteTrainingDataMutation = useMutation({
    mutationFn: deleteTrainingData,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/data'] });
      toast({
        title: "Training data deleted",
        description: "Your training data has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete training data",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Intent mutation
  const addIntentMutation = useMutation({
    mutationFn: createIntent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/intents'] });
      toast({
        title: "Intent added",
        description: "Your intent mapping has been successfully added.",
      });
      setShowIntentDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add intent",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">AI Training & Intent Management</h1>
          <div className="flex gap-2">
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Training Data
            </Button>
            <Button variant="outline" onClick={() => setShowIntentDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Intent
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.location.href = "/ai-training/initialize"}
            >
              Initialize Training Data
            </Button>
          </div>
        </div>

        <Tabs defaultValue="training-data">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="training-data">Training Data</TabsTrigger>
            <TabsTrigger value="intents">Intent Mapping</TabsTrigger>
          </TabsList>

          {/* Training Data Tab */}
          <TabsContent value="training-data">
            <Card>
              <CardHeader>
                <CardTitle>Training Dataset</CardTitle>
                <CardDescription>
                  Training data is used to teach the AI how to respond to user queries. 
                  Add examples of user messages and appropriate responses.
                </CardDescription>
                <div className="flex items-center gap-2 mt-4">
                  <Select 
                    value={selectedCategory} 
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {allCategories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCategory && selectedCategory !== "all" && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setSelectedCategory("all")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : dataError ? (
                  <div className="bg-red-50 p-4 rounded-md text-red-600">
                    Failed to load training data
                  </div>
                ) : trainingData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="mb-2">No training data found</p>
                    <p className="text-sm">
                      {selectedCategory && selectedCategory !== "all" 
                        ? `Try removing the category filter or add some training data for the "${selectedCategory}" category.`
                        : "Add some training data to get started."}
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Category</TableHead>
                          <TableHead>Content</TableHead>
                          <TableHead className="w-[120px]">Date Added</TableHead>
                          <TableHead className="w-[100px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trainingData.map(item => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Badge variant="outline">{item.category}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs max-w-[500px] break-words">
                              {item.content}
                            </TableCell>
                            <TableCell className="text-xs">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => {
                                    setEditingTrainingData(item);
                                    setShowEditDialog(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this training data?')) {
                                      deleteTrainingDataMutation.mutate(item.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Intent Mapping Tab */}
          <TabsContent value="intents">
            <Card>
              <CardHeader>
                <CardTitle>Intent Map</CardTitle>
                <CardDescription>
                  Intent mapping helps the AI understand user intentions and map them to appropriate 
                  actions. Add example phrases for each intent.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingIntents ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : intentsError ? (
                  <div className="bg-red-50 p-4 rounded-md text-red-600">
                    Failed to load intents
                  </div>
                ) : intents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="mb-2">No intents defined yet</p>
                    <p className="text-sm">
                      Add some intents to help the AI understand user requests.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {intents.map(intent => (
                      <div key={intent.id} className="border rounded-md p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-lg">{intent.intent}</h3>
                            <div className="mt-2 space-y-1">
                              {intent.examples.map((example, idx) => (
                                <div key={idx} className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded-sm">
                                  "{example}"
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" disabled>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" disabled>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog for adding training data */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Training Data</DialogTitle>
          </DialogHeader>
          <AddTrainingDataForm onSubmit={(data) => addTrainingDataMutation.mutate(data)} 
                              isLoading={addTrainingDataMutation.isPending}
                              categories={allCategories} />
        </DialogContent>
      </Dialog>

      {/* Dialog for adding intent */}
      <Dialog open={showIntentDialog} onOpenChange={setShowIntentDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Intent</DialogTitle>
          </DialogHeader>
          <AddIntentForm onSubmit={(data) => addIntentMutation.mutate(data)} 
                        isLoading={addIntentMutation.isPending} />
        </DialogContent>
      </Dialog>

      {/* Dialog for editing training data */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) setEditingTrainingData(null);
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Training Data</DialogTitle>
          </DialogHeader>
          {editingTrainingData && (
            <EditTrainingDataForm 
              trainingData={editingTrainingData}
              onSubmit={(data) => updateTrainingDataMutation.mutate({ 
                id: editingTrainingData.id, 
                data 
              })} 
              isLoading={updateTrainingDataMutation.isPending}
              categories={allCategories} 
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

// Training data form component
interface AddTrainingDataFormProps {
  onSubmit: (data: Omit<TrainingData, 'id' | 'userId' | 'createdAt' | 'metadata'>) => void;
  isLoading: boolean;
  categories: string[];
}

const AddTrainingDataForm = ({ onSubmit, isLoading, categories }: AddTrainingDataFormProps) => {
  const [formData, setFormData] = useState({
    category: "",
    customCategory: "",
    content: ""
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const category = formData.category === "custom" 
      ? formData.customCategory.toLowerCase().trim() 
      : formData.category;
      
    if (!category) {
      return; // Prevent submission without category
    }
    
    onSubmit({
      category,
      content: formData.content
    });
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select 
          name="category" 
          value={formData.category} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </SelectItem>
            ))}
            <SelectItem value="custom">Custom Category</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {formData.category === "custom" && (
        <div className="space-y-2">
          <Label htmlFor="customCategory">Custom Category Name</Label>
          <Input
            id="customCategory"
            name="customCategory"
            value={formData.customCategory}
            onChange={handleChange}
            placeholder="Enter a custom category name"
            required={formData.category === "custom"}
          />
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          name="content"
          value={formData.content}
          onChange={handleChange}
          placeholder="Enter the training data content. This can be a question, response, or conversation example."
          rows={8}
          required
        />
      </div>
      
      <DialogFooter>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Training Data
        </Button>
      </DialogFooter>
    </form>
  );
};

// Intent form component
interface AddIntentFormProps {
  onSubmit: (data: Omit<Intent, 'id' | 'userId'>) => void;
  isLoading: boolean;
}

const AddIntentForm = ({ onSubmit, isLoading }: AddIntentFormProps) => {
  const [intent, setIntent] = useState("");
  const [example, setExample] = useState("");
  const [examples, setExamples] = useState<string[]>([]);
  
  const addExample = () => {
    if (example.trim()) {
      setExamples(prev => [...prev, example.trim()]);
      setExample("");
    }
  };
  
  const removeExample = (idx: number) => {
    setExamples(prev => prev.filter((_, i) => i !== idx));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!intent.trim() || examples.length === 0) {
      return; // Prevent submission without intent or examples
    }
    
    onSubmit({
      intent: intent.trim(),
      examples
    });
    
    // Reset form
    setIntent("");
    setExample("");
    setExamples([]);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="intent">Intent Name</Label>
        <Input
          id="intent"
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          placeholder="e.g., schedule_meeting, product_info, help_request"
          required
        />
        <p className="text-xs text-muted-foreground">
          Use a clear and descriptive name for the intent, typically in snake_case.
        </p>
      </div>
      
      <div className="space-y-2">
        <Label>Example Phrases</Label>
        <div className="flex space-x-2">
          <Input
            value={example}
            onChange={(e) => setExample(e.target.value)}
            placeholder="Add an example phrase for this intent"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addExample();
              }
            }}
          />
          <Button type="button" onClick={addExample} variant="secondary">
            Add
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Add multiple example phrases that represent this intent.
          Press Enter or click Add to add each example.
        </p>
      </div>
      
      {examples.length > 0 && (
        <div className="border rounded-md p-3 space-y-2">
          <Label>Added Examples:</Label>
          <div className="space-y-2">
            {examples.map((ex, idx) => (
              <div key={idx} className="flex justify-between items-center bg-muted p-2 rounded-sm">
                <span className="text-sm font-mono">"{ex}"</span>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeExample(idx)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <DialogFooter>
        <Button 
          type="submit" 
          disabled={isLoading || !intent.trim() || examples.length === 0}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Intent
        </Button>
      </DialogFooter>
    </form>
  );
};

// Edit Training Data form component
interface EditTrainingDataFormProps {
  trainingData: TrainingData;
  onSubmit: (data: Partial<Omit<TrainingData, 'id' | 'userId' | 'createdAt' | 'metadata'>>) => void;
  isLoading: boolean;
  categories: string[];
}

const EditTrainingDataForm = ({ trainingData, onSubmit, isLoading, categories }: EditTrainingDataFormProps) => {
  const [formData, setFormData] = useState({
    category: trainingData.category,
    customCategory: "",
    content: trainingData.content
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const category = formData.category === "custom" 
      ? formData.customCategory.toLowerCase().trim() 
      : formData.category;
      
    if (!category) {
      return; // Prevent submission without category
    }
    
    onSubmit({
      category,
      content: formData.content
    });
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select 
          name="category" 
          value={formData.category} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </SelectItem>
            ))}
            <SelectItem value="custom">Custom Category</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {formData.category === "custom" && (
        <div className="space-y-2">
          <Label htmlFor="customCategory">Custom Category Name</Label>
          <Input
            id="customCategory"
            name="customCategory"
            value={formData.customCategory}
            onChange={handleChange}
            placeholder="Enter a custom category name"
            required={formData.category === "custom"}
          />
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          name="content"
          value={formData.content}
          onChange={handleChange}
          placeholder="Enter the training data content. This can be a question, response, or conversation example."
          rows={8}
          required
        />
      </div>
      
      <DialogFooter>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update Training Data
        </Button>
      </DialogFooter>
    </form>
  );
};

export default TrainingPage;