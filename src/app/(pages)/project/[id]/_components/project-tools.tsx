"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Sparkles } from "lucide-react";

interface ProjectToolsProps {
  projectId: string;
}

export function ProjectTools({ projectId }: ProjectToolsProps) {
  const [isDiscoveryDialogOpen, setIsDiscoveryDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🛠️ Project Tools</CardTitle>
          <CardDescription>
            Powerful tools to enhance your content creation workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Add Discovery Tool */}
            <ToolCard
              icon={<Search className="h-8 w-8 text-blue-600" />}
              title="Add Discovery"
              description="Discover trending content and ideas for your project"
              onClick={() => setIsDiscoveryDialogOpen(true)}
            />
            
            {/* Placeholder for future tools */}
            <ToolCard
              icon={<Sparkles className="h-8 w-8 text-purple-600" />}
              title="Coming Soon"
              description="More tools will be added here"
              disabled
            />
          </div>
        </CardContent>
      </Card>

      {/* Add Discovery Dialog */}
      <Dialog open={isDiscoveryDialogOpen} onOpenChange={setIsDiscoveryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-600" />
              Add Discovery
            </DialogTitle>
            <DialogDescription>
              Help us understand your brand and target audience to create better content
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-8">
            {/* Brand Information */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">📦 YOUR PRODUCT</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">What is your brand name?</label>
                <input type="text" className="w-full p-2 border rounded-md" placeholder="Enter your brand name" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Describe the product or service in one sentence:</label>
                <input type="text" className="w-full p-2 border rounded-md" placeholder="One sentence description" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Features: What are the product's main features?</label>
                <input type="text" className="w-full p-2 border rounded-md mb-2" placeholder="1. Feature one" />
                <input type="text" className="w-full p-2 border rounded-md mb-2" placeholder="2. Feature two" />
                <input type="text" className="w-full p-2 border rounded-md" placeholder="3. Feature three" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Who is your Hero Persona (what specific persona are you marketing to)?</label>
                <textarea className="w-full p-2 border rounded-md" rows={2} placeholder="Describe your target persona..." />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Benefits: What are the product's main benefits?</label>
                <input type="text" className="w-full p-2 border rounded-md mb-2" placeholder="1. Benefit one" />
                <input type="text" className="w-full p-2 border rounded-md mb-2" placeholder="2. Benefit two" />
                <input type="text" className="w-full p-2 border rounded-md" placeholder="3. Benefit three" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Buyer Decision Questions: What are the main questions someone might ask about the product?</label>
                <input type="text" className="w-full p-2 border rounded-md mb-2" placeholder="1. Question one" />
                <input type="text" className="w-full p-2 border rounded-md mb-2" placeholder="2. Question two" />
                <input type="text" className="w-full p-2 border rounded-md" placeholder="3. Question three" />
              </div>
            </section>

            {/* Competition */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">🎯 COMPETITION</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Competitors: List your top 3 competitors</label>
                <input type="text" className="w-full p-2 border rounded-md mb-2" placeholder="1. Competitor one" />
                <input type="text" className="w-full p-2 border rounded-md mb-2" placeholder="2. Competitor two" />
                <input type="text" className="w-full p-2 border rounded-md" placeholder="3. Competitor three" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">How is your product different or better than your competitors?</label>
                <textarea className="w-full p-2 border rounded-md" rows={3} placeholder="Explain your unique advantages..." />
              </div>
            </section>

            {/* Social Proof */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">⭐ SOCIAL PROOF</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Testimonials: Paste 3 Testimonials Here</label>
                <textarea className="w-full p-2 border rounded-md mb-2" rows={2} placeholder="1. First testimonial" />
                <textarea className="w-full p-2 border rounded-md mb-2" rows={2} placeholder="2. Second testimonial" />
                <textarea className="w-full p-2 border rounded-md" rows={2} placeholder="3. Third testimonial" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Proof Points: What proof do you have that your product works?</label>
                <input type="text" className="w-full p-2 border rounded-md mb-2" placeholder="1. Proof point one (e.g., 10,000+ users)" />
                <input type="text" className="w-full p-2 border rounded-md mb-2" placeholder="2. Proof point two" />
                <input type="text" className="w-full p-2 border rounded-md" placeholder="3. Proof point three" />
              </div>
            </section>

            {/* Customers */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">👥 YOUR CUSTOMERS</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Customers: How would you describe your customer?</label>
                <textarea className="w-full p-2 border rounded-md" rows={2} placeholder="Describe your ideal customer..." />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Dream Outcome: What is their dream outcome once they buy your product?</label>
                <input type="text" className="w-full p-2 border rounded-md" placeholder="I wish that I could __ so that __" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Jobs To Be Done: What job(s) are they hiring the product to do?</label>
                <input type="text" className="w-full p-2 border rounded-md mb-2" placeholder="1. Job one" />
                <input type="text" className="w-full p-2 border rounded-md mb-2" placeholder="2. Job two" />
                <input type="text" className="w-full p-2 border rounded-md" placeholder="3. Job three" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Challenges: What problems will the product solve for them?</label>
                <input type="text" className="w-full p-2 border rounded-md mb-2" placeholder="1. Challenge one" />
                <input type="text" className="w-full p-2 border rounded-md mb-2" placeholder="2. Challenge two" />
                <input type="text" className="w-full p-2 border rounded-md" placeholder="3. Challenge three" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Emotional Benefits: What 3 emotional benefits does the product give them?</label>
                <input type="text" className="w-full p-2 border rounded-md mb-2" placeholder="1. Emotional benefit one (e.g., confidence)" />
                <input type="text" className="w-full p-2 border rounded-md mb-2" placeholder="2. Emotional benefit two" />
                <input type="text" className="w-full p-2 border rounded-md" placeholder="3. Emotional benefit three" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Transformation: How will their life change once they buy the product?</label>
                <input type="text" className="w-full p-2 border rounded-md mb-2" placeholder="1. Transformation one" />
                <input type="text" className="w-full p-2 border rounded-md mb-2" placeholder="2. Transformation two" />
                <input type="text" className="w-full p-2 border rounded-md" placeholder="3. Transformation three" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Perception: How will others perceive them once they have the product?</label>
                <input type="text" className="w-full p-2 border rounded-md mb-2" placeholder="1. Perception one" />
                <input type="text" className="w-full p-2 border rounded-md mb-2" placeholder="2. Perception two" />
                <input type="text" className="w-full p-2 border rounded-md" placeholder="3. Perception three" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Alternatives: What other solutions have they tried?</label>
                <input type="text" className="w-full p-2 border rounded-md mb-2" placeholder="1. Alternative one" />
                <input type="text" className="w-full p-2 border rounded-md mb-2" placeholder="2. Alternative two" />
                <input type="text" className="w-full p-2 border rounded-md" placeholder="3. Alternative three" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">How is your product better than the alternatives?</label>
                <textarea className="w-full p-2 border rounded-md" rows={3} placeholder="Explain how you're better..." />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Life Events: Are there specific life events that typically trigger a purchase?</label>
                <input type="text" className="w-full p-2 border rounded-md mb-2" placeholder="1. Life event one" />
                <input type="text" className="w-full p-2 border rounded-md mb-2" placeholder="2. Life event two" />
                <input type="text" className="w-full p-2 border rounded-md" placeholder="3. Life event three" />
              </div>
            </section>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsDiscoveryDialogOpen(false)}>
                Cancel
              </Button>
              <Button>
                Save Discovery
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ToolCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  disabled?: boolean;
}

function ToolCard({ icon, title, description, onClick, disabled }: ToolCardProps) {
  return (
    <Card 
      className={`hover:shadow-lg transition-shadow ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={disabled ? undefined : onClick}
    >
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          {icon}
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {!disabled && (
        <CardContent>
          <Button variant="outline" size="sm" className="w-full">
            Open Tool
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
