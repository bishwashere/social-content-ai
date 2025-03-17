import React, { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "../ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCreateWall } from "@/backend-apis/wall/hooks";
import { UploadCloudIcon } from "lucide-react";

type Props = {
  content: string;
  platform: string;
  projectId: string;
  prompt: string;
};

const PostToWall = (props: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const wall = useCreateWall();
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Button
                loading={wall.isPending}
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(true)}
              >
                <UploadCloudIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Publish to wall!</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will publish this content to public wall where other users can
            see the content and project name.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            loading={wall.isPending}
            onClick={async () => {
              try {
                await wall.mutateAsync({
                  content: props.content,
                  prompt: props.prompt || "",
                  platform: props.platform,
                  projectId: props.projectId,
                });
              } catch {
              } finally {
                setIsOpen(false);
              }
            }}
          >
            Continue
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PostToWall;
