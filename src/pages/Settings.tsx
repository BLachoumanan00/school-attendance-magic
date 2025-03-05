
import React, { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { LogOut, Save, School, User } from "lucide-react";

const Settings = () => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("account");
  
  // School settings state
  const [schoolName, setSchoolName] = useState("Adventist College of Mauritius");
  const [schoolEmail, setSchoolEmail] = useState("admin@adventistcollege.mu");
  const [autoSave, setAutoSave] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  
  const handleSaveSchoolSettings = () => {
    // In a real app, this would save to the database
    toast({
      title: "Settings updated",
      description: "School settings have been saved successfully.",
    });
  };
  
  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error logging out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-md mb-6">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Account
            </TabsTrigger>
            <TabsTrigger value="school" className="flex items-center gap-2">
              <School className="h-4 w-4" />
              School
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Manage your account settings and sign out.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {user && (
                  <>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={user.email} readOnly className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label>Account Type</Label>
                      <Input value="Staff" readOnly className="bg-muted" />
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  variant="destructive" 
                  onClick={handleLogout}
                  className="w-full sm:w-auto flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="school">
            <Card>
              <CardHeader>
                <CardTitle>School Settings</CardTitle>
                <CardDescription>
                  Configure default settings for the attendance system.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="schoolName">School Name</Label>
                  <Input 
                    id="schoolName" 
                    value={schoolName} 
                    onChange={(e) => setSchoolName(e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="schoolEmail">School Email</Label>
                  <Input 
                    id="schoolEmail" 
                    type="email" 
                    value={schoolEmail} 
                    onChange={(e) => setSchoolEmail(e.target.value)}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Preferences</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="autoSave">Auto-save Attendance</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically save attendance records when marking students
                      </p>
                    </div>
                    <Switch 
                      id="autoSave" 
                      checked={autoSave} 
                      onCheckedChange={setAutoSave}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailNotifications">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Send email notifications for absence reports
                      </p>
                    </div>
                    <Switch 
                      id="emailNotifications" 
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleSaveSchoolSettings} 
                  className="w-full sm:w-auto flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Settings
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Settings;
