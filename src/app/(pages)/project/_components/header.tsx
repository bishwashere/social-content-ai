import { CreditCard, LogOut, Settings, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLogout, useSession } from "@/backend-apis/auth/hooks";
import { Logo } from "@/components/common/logo";
import GoogleLoginButton from "@/components/common/google-login-button";
import Subscription from "@/components/common/subscription";
import { useParams, useRouter } from "next/navigation";
import { FaRegQuestionCircle } from "react-icons/fa";
import { useResetFirstViewTooltip } from "@/server-actions/first-view-tooltip/hooks";
import { useGetAllProjects } from "@/backend-apis/projects/hooks";
import { ProjectEditModal } from "./project-edit-modal";


export function Header() {
  const { data } = useSession();
  const logout = useLogout();
  const router = useRouter();
  const resetTooltip = useResetFirstViewTooltip();
  const { id } = useParams();
  const projects = useGetAllProjects();

  return (
    <div className="w-full px-4 border-b h-fit relative overflow-hidden flex items-center justify-center">
      <div className="flex h-16 items-center justify-between bg-background w-full px-4 md:px-8 max-w-full md:max-w-[calc(100vw-16rem)] lg:max-w-[calc(100vw-18rem)]">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="min-w-[24px]" />
          <div className="flex items-center gap-1">
            <span className="truncate">
              {
                projects?.data?.find((project) => project.id === id)?.name || "Dashboard"
              }
            </span>
            {(() => {
              const project = projects?.data?.find((project) => project.id === id);
              return project ? <ProjectEditModal project={project} /> : null;
            })()}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Subscription />
          <button onClick={() => resetTooltip.mutate(data?.user.id || "")}>
            <FaRegQuestionCircle className="size-5" />
          </button>
          {!data?.user ? (
            <GoogleLoginButton triggerClassName="py-3 px-10 h-12 text-lg font-semibold text-white rounded-lg hover:bg-gray-700" />
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={data?.user.avatarUrl}
                      alt={data?.user.name}
                    />
                    <AvatarFallback>{data?.user.name}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {data?.user.name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {data?.user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/project/billing")}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span>Billing</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout.mutate()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}
