import { Sidebar } from "@/components/sidebar";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

function LayoutContent({ children }: LayoutProps) {
  const { isOpen, toggle } = useSidebar();

  return (
    <div className="flex min-h-screen bg-rosae-black">
      <Sidebar />
      <main className={cn(
        "flex-1 transition-all duration-300 ease-in-out",
        "lg:ml-0",
        isOpen ? "lg:ml-0" : "lg:ml-0"
      )}>
        {/* Mobile header with hamburger menu */}
        <div className="lg:hidden bg-rosae-dark-gray border-b border-gray-600 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            className="text-white hover:bg-gray-700"
            data-testid="button-open-sidebar"
          >
            <Menu className="w-6 h-6" />
          </Button>
        </div>
        <div className="min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}

export default Layout;