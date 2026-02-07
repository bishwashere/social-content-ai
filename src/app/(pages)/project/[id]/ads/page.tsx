"use client";
import { useParams } from "next/navigation";
import {
    useGetAllProjectChats
} from "@/backend-apis/projects/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { ProjectToolsStepByStep } from "../_components/project-tools-stepbystep";

interface AdCreative {
    id: string;
    angle: string;
    imageDescription: string;
    imageCopy: string;
    headline: string;
    primaryText: string;
}

export default function ChatPage() {
    const { id } = useParams() as { id: string };
    const [generatedAds, setGeneratedAds] = useState<AdCreative[]>([]);

    const fetchAds = async () => {
        if (!id) return;
        console.log(id)
        const response = await fetch(`/api/brand-discovery?projectId=${id}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
            throw new Error("Failed to save brand discovery");
        }

        const data = await response.json();
        const adCreatives = data.adCreatives as AdCreative[];
        setGeneratedAds(adCreatives);
    }
    useEffect(() => {
        fetchAds();
    }, [])

    return (
        <div className="flex-grow max-w-7xl 2xl:max-w-[90%] mx-auto justify-center px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20 space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        Ad Discovery
                    </CardTitle>
                    <CardDescription className="mt-4 flex justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <span className="text-white text-base font-semibold">Generated Facebook Ad Creatives</span>
                            </div>
                            {generatedAds.length > 0 ?
                                <p>
                                    {generatedAds.length} ad concepts based on your brand discovery
                                </p>
                                :
                                <p>
                                    No ads generated. Generate a new one
                                </p>
                            }
                        </div>
                        <ProjectToolsStepByStep projectId={id} buttonText={generatedAds.length ? 'Reload' : 'Generate'} setGeneratedAds={setGeneratedAds} />
                    </CardDescription>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-6 space-y-6">
                {generatedAds.map((ad, index) => (
                    <Card key={ad.id || index} className="border-2 max-w-6xl max-h-[90vh] overflow-y-auto">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                    {ad.angle}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-sm text-gray-600 mb-1">📸 Image Description</h4>
                                <p className="text-sm bg-gray-50 p-3 rounded">{ad.imageDescription}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm text-gray-600 mb-1">🖼️ Image Copy</h4>
                                <p className="text-sm bg-gray-50 p-3 rounded font-medium">{ad.imageCopy}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm text-gray-600 mb-1">📰 Headline</h4>
                                <p className="text-base font-bold">{ad.headline}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm text-gray-600 mb-1">📝 Primary Text</h4>
                                <p className="text-sm leading-relaxed">{ad.primaryText}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}