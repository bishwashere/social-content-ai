"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Facebook } from "lucide-react";

type FacebookPage = {
  access_token: string;
  name: string;
  id: string;
};

type Props = {
  pages: FacebookPage[];
  onPageSelect: (page: FacebookPage) => void;
  isOpen: boolean;
};

export function FacebookPageSelector({ pages, onPageSelect, isOpen }: Props) {
  const [selectedPage, setSelectedPage] = useState<FacebookPage | null>(null);

  const handlePageSelect = (page: FacebookPage) => {
    setSelectedPage(page);
  };

  const handleConfirm = () => {
    if (selectedPage) {
      onPageSelect(selectedPage);
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Select Facebook Page</DialogTitle>
          <DialogDescription>
            Choose the Facebook page you want to manage posts for.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {pages.map((page) => (
            <Card
              key={page.id}
              className={`cursor-pointer transition-all !py-0 ${selectedPage?.id === page.id ? 'border-primary' : ''}`}
              onClick={() => handlePageSelect(page)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <Facebook className="h-5 w-5 text-[#1877F2]" />
                <span className="font-medium">{page.name}</span>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex justify-end mt-4">
          <Button
            onClick={(e) => {
              e.currentTarget.disabled = true;
              handleConfirm();
            }}
            disabled={!selectedPage}
            className="w-full sm:w-auto"

          >
            Confirm Selection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}