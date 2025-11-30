import { useEffect, useRef, useState } from "react";
import { useTooltipManager } from "@/providers/first-view-tooltip-manager";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { TooltipKeysType } from "@/lib/types/first-view-tooltip";

interface FirstViewtooltipProps {
    tooltipKey: TooltipKeysType;
    content: string;
    order: number;
    children: React.ReactNode;
}

export default function FirstViewTooltip({
    tooltipKey,
    content,
    order,
    children,
}: FirstViewtooltipProps) {
    const [visible, setVisible] = useState(false);
    const [readyToRegister, setReadyToRegister] = useState(false);
    const {
        registerTooltip,
        unregisterTooltip,
        currentTooltip,
        showNextTooltip,
        checkTooltipSeen,
        markTooltipSeen,
        isTooltipDataLoaded
    } = useTooltipManager();

    const containerRef = useRef<HTMLDivElement>(null);

    // IntersectionObserver to detect when the element is in view
    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) setReadyToRegister(true);
                });
            },
            { threshold: 0.5 }
        );
        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    // Register tooltip only when data is loaded and element is visible
    useEffect(() => {
        if (!isTooltipDataLoaded || !readyToRegister) return;
        const seen = checkTooltipSeen(tooltipKey);

        if (!seen) {
            registerTooltip(
                tooltipKey,
                order,
                () => setVisible(true),
                () => setVisible(false)
            );
        }

        return () => unregisterTooltip(tooltipKey);
    }, [
        tooltipKey, order, readyToRegister,
        registerTooltip, unregisterTooltip,
        checkTooltipSeen, isTooltipDataLoaded
    ]);

    const handleGotIt = async () => {
        setVisible(false);
        await markTooltipSeen(tooltipKey);
        showNextTooltip();
    };

    return (
        <Tooltip open={visible && currentTooltip === tooltipKey}>
            <TooltipTrigger asChild>
                <div ref={containerRef}>
                    {children}
                </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-60 md:max-w-72 p-4 md:p-6 text-base" side="bottom" collisionPadding={10}>
                {content}
                <div className="text-right mt-2 md:mt-3">
                    <Button size="sm" onClick={handleGotIt}>Got it</Button>
                </div>
            </TooltipContent>
        </Tooltip>
    );
}
