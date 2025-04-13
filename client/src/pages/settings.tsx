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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Settings2, 
  Shield, 
  Bell, 
  User, 
  Globe, 
  Key, 
  Clock, 
  Save, 
  RefreshCw, 
  FileDown
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const SettingsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground">
            Configure global settings and customize system behavior
          </p>
        </div>
        <Button>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="backup">Backup & Export</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Basic system configuration settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input id="company-name" defaultValue="ACME Corporation" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="business-website">Business Website</Label>
                <Input id="business-website" defaultValue="https://example.com" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="primary-contact">Primary Contact Email</Label>
                <Input id="primary-contact" defaultValue="admin@example.com" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select defaultValue="America/New_York">
                    <SelectTrigger id="timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="Europe/London">London (GMT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="date-format">Date Format</Label>
                  <Select defaultValue="MM/DD/YYYY">
                    <SelectTrigger id="date-format">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="business-hours">Business Hours</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Select defaultValue="9">
                    <SelectTrigger id="business-hours-start">
                      <SelectValue placeholder="Start time" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <SelectItem key={i} value={String(i + 7)}>
                          {i + 7}:00 {i + 7 < 12 ? 'AM' : 'PM'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select defaultValue="17">
                    <SelectTrigger id="business-hours-end">
                      <SelectValue placeholder="End time" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <SelectItem key={i} value={String(i + 12)}>
                          {i === 0 ? 12 : i > 12 ? i - 12 : i + 12}:00 PM
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="business-days">Business Days</Label>
                <div className="flex flex-wrap gap-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, i) => (
                    <label 
                      key={day} 
                      className={`px-3 py-1 rounded-full border cursor-pointer 
                        ${i < 5 ? 'bg-primary text-white border-primary' : 'bg-white text-neutral-700 border-neutral-300'}`}
                    >
                      <input type="checkbox" className="sr-only" defaultChecked={i < 5} />
                      {day}
                    </label>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-medium">System Behavior</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-response">Automatic Responses</Label>
                    <p className="text-sm text-neutral-500">
                      Enable AI to automatically respond to incoming communications
                    </p>
                  </div>
                  <Switch id="auto-response" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="log-conversations">Log Conversations</Label>
                    <p className="text-sm text-neutral-500">
                      Save records of all conversations for training and review
                    </p>
                  </div>
                  <Switch id="log-conversations" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="human-escalation">Human Escalation</Label>
                    <p className="text-sm text-neutral-500">
                      Automatically escalate complex queries to human operators
                    </p>
                  </div>
                  <Switch id="human-escalation" defaultChecked />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="ml-auto">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset to Defaults
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>API Integration Settings</CardTitle>
              <CardDescription>
                Global settings for third-party service integrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="openai-key">OpenAI API Key</Label>
                <Input id="openai-key" type="password" placeholder="sk-••••••••••••••••••••••" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="openai-model">Default AI Model</Label>
                <Select defaultValue="gpt-4o">
                  <SelectTrigger id="openai-model">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o (Most capable)</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-medium">Active Integrations</h3>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Checked</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Twilio</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          Connected
                        </span>
                      </TableCell>
                      <TableCell>5 minutes ago</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">Configure</Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">SendGrid</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          Connected
                        </span>
                      </TableCell>
                      <TableCell>10 minutes ago</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">Configure</Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Google Calendar</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          Connected
                        </span>
                      </TableCell>
                      <TableCell>15 minutes ago</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">Configure</Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">WhatsApp Business</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                          Disconnected
                        </span>
                      </TableCell>
                      <TableCell>1 hour ago</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">Connect</Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage security and access control settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password-policy">Password Policy</Label>
                <Select defaultValue="strong">
                  <SelectTrigger id="password-policy">
                    <SelectValue placeholder="Select policy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic (8+ characters)</SelectItem>
                    <SelectItem value="medium">Medium (8+ chars, mixed case, numbers)</SelectItem>
                    <SelectItem value="strong">Strong (12+ chars, mixed case, numbers, symbols)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="session-timeout">Session Timeout</Label>
                <Select defaultValue="60">
                  <SelectTrigger id="session-timeout">
                    <SelectValue placeholder="Select timeout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ip-restrictions">IP Access Restrictions</Label>
                <Textarea 
                  id="ip-restrictions" 
                  placeholder="Enter IP addresses or ranges (one per line)"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-neutral-500">
                  Leave blank to allow access from all IP addresses
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="two-factor">Two-Factor Authentication</Label>
                  <p className="text-sm text-neutral-500">
                    Require 2FA for all administrator accounts
                  </p>
                </div>
                <Switch id="two-factor" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="audit-logging">Enhanced Audit Logging</Label>
                  <p className="text-sm text-neutral-500">
                    Log all user actions and system changes
                  </p>
                </div>
                <Switch id="audit-logging" defaultChecked />
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h3 className="font-medium">Data Retention Policy</h3>
                <RadioGroup defaultValue="90days">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="30days" id="r1" />
                    <Label htmlFor="r1">30 days</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="90days" id="r2" />
                    <Label htmlFor="r2">90 days</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="180days" id="r3" />
                    <Label htmlFor="r3">180 days</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="1year" id="r4" />
                    <Label htmlFor="r4">1 year</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="indefinite" id="r5" />
                    <Label htmlFor="r5">Indefinite</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="ml-auto">Save Security Settings</Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>API Access Management</CardTitle>
              <CardDescription>
                Manage API keys and access tokens
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Key Name</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Primary API Key</TableCell>
                      <TableCell>2023-11-15</TableCell>
                      <TableCell>Today</TableCell>
                      <TableCell className="text-right flex space-x-2 justify-end">
                        <Button variant="outline" size="sm">Regenerate</Button>
                        <Button variant="outline" size="sm">View</Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Development Key</TableCell>
                      <TableCell>2024-01-20</TableCell>
                      <TableCell>Yesterday</TableCell>
                      <TableCell className="text-right flex space-x-2 justify-end">
                        <Button variant="outline" size="sm">Regenerate</Button>
                        <Button variant="outline" size="sm">View</Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                
                <Button variant="outline" className="w-full">
                  <Key className="mr-2 h-4 w-4" />
                  Generate New API Key
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure system alerts and notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Email Notifications</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="system-alerts">System Alerts</Label>
                    <p className="text-sm text-neutral-500">
                      Critical system issues and outages
                    </p>
                  </div>
                  <Switch id="system-alerts" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="new-meetings">New Meeting Notifications</Label>
                    <p className="text-sm text-neutral-500">
                      Alert when new meetings are scheduled
                    </p>
                  </div>
                  <Switch id="new-meetings" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="daily-summary">Daily Summary Reports</Label>
                    <p className="text-sm text-neutral-500">
                      Daily activity summary report
                    </p>
                  </div>
                  <Switch id="daily-summary" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="weekly-summary">Weekly Performance Report</Label>
                    <p className="text-sm text-neutral-500">
                      Weekly system performance metrics
                    </p>
                  </div>
                  <Switch id="weekly-summary" defaultChecked />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-medium">Dashboard Alerts</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="real-time-alerts">Real-time Alerts</Label>
                    <p className="text-sm text-neutral-500">
                      Show real-time alerts in dashboard
                    </p>
                  </div>
                  <Switch id="real-time-alerts" defaultChecked />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="alert-threshold">Alert Threshold</Label>
                  <Select defaultValue="warning">
                    <SelectTrigger id="alert-threshold">
                      <SelectValue placeholder="Select threshold" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical Issues Only</SelectItem>
                      <SelectItem value="warning">Warnings & Critical Issues</SelectItem>
                      <SelectItem value="info">All Notifications (Info, Warning, Critical)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notification-emails">Notification Recipients</Label>
                <Textarea 
                  id="notification-emails" 
                  placeholder="Enter email addresses, one per line"
                  className="resize-none"
                  rows={3}
                  defaultValue="admin@example.com"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="ml-auto">
                <Bell className="mr-2 h-4 w-4" />
                Save Notification Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>
                Customize the system appearance and branding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="theme-mode">Theme Mode</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4 flex flex-col items-center cursor-pointer bg-white border-primary">
                    <div className="w-full h-24 rounded bg-white border mb-2"></div>
                    <span className="text-sm font-medium">Light</span>
                  </div>
                  <div className="border rounded-lg p-4 flex flex-col items-center cursor-pointer">
                    <div className="w-full h-24 rounded bg-neutral-800 border border-neutral-700 mb-2"></div>
                    <span className="text-sm font-medium">Dark</span>
                  </div>
                  <div className="border rounded-lg p-4 flex flex-col items-center cursor-pointer">
                    <div className="w-full h-24 rounded bg-gradient-to-b from-white to-neutral-800 border mb-2"></div>
                    <span className="text-sm font-medium">System</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="primary-color">Primary Color</Label>
                <div className="grid grid-cols-5 gap-4">
                  {[
                    { color: '#2563eb', name: 'Blue' },
                    { color: '#8b5cf6', name: 'Purple' },
                    { color: '#ec4899', name: 'Pink' },
                    { color: '#ef4444', name: 'Red' },
                    { color: '#f59e0b', name: 'Amber' },
                  ].map(({ color, name }) => (
                    <div 
                      key={color}
                      className={`border rounded-lg p-2 flex flex-col items-center cursor-pointer ${
                        color === '#2563eb' ? 'border-primary ring-2 ring-primary/20' : ''
                      }`}
                    >
                      <div 
                        className="w-full h-12 rounded mb-2" 
                        style={{ backgroundColor: color }}
                      ></div>
                      <span className="text-xs font-medium">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="font-family">Font Family</Label>
                <Select defaultValue="inter">
                  <SelectTrigger id="font-family">
                    <SelectValue placeholder="Select font" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inter">Inter (Default)</SelectItem>
                    <SelectItem value="roboto">Roboto</SelectItem>
                    <SelectItem value="open-sans">Open Sans</SelectItem>
                    <SelectItem value="montserrat">Montserrat</SelectItem>
                    <SelectItem value="lato">Lato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="border-radius">Border Radius</Label>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="0" 
                      max="16" 
                      defaultValue="4"
                      className="w-full h-2 bg-neutral-100 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-sm w-8 text-right">4px</span>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 border bg-white" style={{ borderRadius: '0px' }}></div>
                    <div className="w-12 h-12 border bg-white" style={{ borderRadius: '4px' }}></div>
                    <div className="w-12 h-12 border bg-white" style={{ borderRadius: '8px' }}></div>
                    <div className="w-12 h-12 border bg-white" style={{ borderRadius: '16px' }}></div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="logo-upload">Company Logo</Label>
                <div className="flex items-center space-x-4">
                  <div className="w-24 h-24 border rounded flex items-center justify-center bg-neutral-50">
                    <p className="text-neutral-400 text-xs text-center">
                      No logo<br />uploaded
                    </p>
                  </div>
                  <Button variant="outline">Upload Logo</Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="custom-css">Custom CSS</Label>
                <Textarea 
                  id="custom-css" 
                  placeholder="Enter custom CSS styles"
                  className="font-mono text-sm"
                  rows={5}
                />
                <p className="text-xs text-neutral-500">
                  Advanced: Custom CSS will be applied to the entire application
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="mr-auto">
                Reset to Defaults
              </Button>
              <Button>
                <Save className="mr-2 h-4 w-4" />
                Save Appearance
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="backup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Backup & Export Settings</CardTitle>
              <CardDescription>
                Configure system backups and data exports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Automatic Backups</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-backup">Enable Automatic Backups</Label>
                    <p className="text-sm text-neutral-500">
                      Schedule regular system backups
                    </p>
                  </div>
                  <Switch id="auto-backup" defaultChecked />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="backup-frequency">Backup Frequency</Label>
                  <Select defaultValue="daily">
                    <SelectTrigger id="backup-frequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="backup-time">Backup Time</Label>
                  <Select defaultValue="02:00">
                    <SelectTrigger id="backup-time">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }).map((_, i) => (
                        <SelectItem key={i} value={`${String(i).padStart(2, '0')}:00`}>
                          {String(i).padStart(2, '0')}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="retention-period">Retention Period</Label>
                  <Select defaultValue="30">
                    <SelectTrigger id="retention-period">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-medium">Manual Backup</h3>
                
                <div className="space-y-2">
                  <p className="text-sm text-neutral-500">
                    Create a manual backup of your system configuration and data
                  </p>
                  <Button className="w-full">
                    <FileDown className="mr-2 h-4 w-4" />
                    Create Backup Now
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-medium">Data Export</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline">Export Conversation Logs</Button>
                  <Button variant="outline">Export Call Recordings</Button>
                  <Button variant="outline">Export Email History</Button>
                  <Button variant="outline">Export System Settings</Button>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="export-format">Export Format</Label>
                  <Select defaultValue="json">
                    <SelectTrigger id="export-format">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="xml">XML</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="ml-auto">
                Save Backup Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
