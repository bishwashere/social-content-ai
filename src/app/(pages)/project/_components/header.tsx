import * as React from "react";
import {
  CreditCard,
  LogOut,
  Settings,
  User,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
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
import { useSidebar } from "@/components/ui/sidebar";
import { useLogout, useSession } from "@/backend-apis/auth/hooks";
import GoogleLoginButton from "@/components/common/auth/google-login-button";
import Subscription from "@/components/common/subscription";
import { useParams, useRouter } from "next/navigation";
import { useGetAllProjects } from "@/backend-apis/projects/hooks";
import { ProjectEditModal } from "./project-edit-modal";
import Image from "next/image";
import { useUserSettings, useUpdateUserSettings } from "@/backend-apis/user-settings/hooks";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/providers/theme-provider";

interface HeaderProps {
  onTourStart?: () => void;
  subscribeRef?: React.RefObject<HTMLDivElement>;
}

export function Header({ onTourStart, subscribeRef }: HeaderProps) {
  const { data } = useSession();
  const logout = useLogout();
  const router = useRouter();
  const { id } = useParams();
  const projects = useGetAllProjects();
  const sidebar = useSidebar();
  const { data: settings } = useUserSettings();

  return (
    <div className="w-full px-4 h-fit relative overflow-hidden flex items-center justify-center">
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
      <div className="flex h-16 items-center justify-between bg-transparent w-full max-w-7xl 2xl:max-w-[90%] mx-auto px-2 md:px-4 lg:px-6 xl:px-10 2xl:px-14">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-gray-100 transition-colors"
            onClick={() => sidebar.toggleSidebar()}
          >
            {sidebar.open ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
          {!sidebar.open && (
            <button
              onClick={() => router.push("/project")}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              <Image
                src="/logo-transparent.png"
                width="100"
                height="100"
                alt="NextPostAi"
                className="size-6"
              />
            </button>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => router.push("/project")}
              className="truncate cursor-pointer hover:opacity-80 transition-opacity text-left"
            >
              {projects?.data?.find((project) => project.id === id)?.name ||
                "Dashboard"}
            </button>
            {(() => {
              const project = projects?.data?.find(
                (project) => project.id === id
              );
              return project ? <ProjectEditModal project={project} /> : null;
            })()}
            {onTourStart && data?.user && (settings?.guidedTourEnabled ?? true) && (
              <button
                onClick={onTourStart}
                className="ml-2 text-xs text-gray-500 hover:text-gray-700 hidden md:inline"
              >
                Gimme a quick tour
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 pl-5 pr-16">
          <div ref={subscribeRef}>
            <Subscription />
          </div>
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
                  <DropdownMenuItem
                    onClick={() => router.push("/project/settings")}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <OnboardingToggles />
                <DarkModeToggle />
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

function OnboardingToggles() {
  const { data: settings } = useUserSettings();
  const updateSettings = useUpdateUserSettings();

  return (
    <div className="px-2 py-1.5">
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="dropdown-guided-tour" className="text-sm font-normal cursor-pointer flex-1">
          Feature Tips
        </Label>
        <Switch
          id="dropdown-guided-tour"
          checked={settings?.guidedTourEnabled ?? true}
          onCheckedChange={(checked) => {
            updateSettings.mutate({ guidedTourEnabled: checked });
          }}
          disabled={updateSettings.isPending}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}

function DarkModeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const getCurrentTheme = () => {
    if (!mounted) return false;
    if (theme === "system") {
      return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return theme === "dark";
  };

  const isDark = getCurrentTheme();

  return (
    <div className="px-2 py-1.5">
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="dropdown-dark-mode" className="text-sm font-normal cursor-pointer flex-1">
          Dark Mode
        </Label>
        <Switch
          id="dropdown-dark-mode"
          checked={isDark}
          onCheckedChange={(checked) => {
            setTheme(checked ? "dark" : "light");
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
