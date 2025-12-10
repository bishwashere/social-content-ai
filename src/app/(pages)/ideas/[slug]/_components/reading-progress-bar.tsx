"use client"

import { useEffect, useState } from "react"

export function ReadingProgressBar() {
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        const updateProgress = () => {
            // Get the article element or use document body
            const article = document.querySelector("article")
            if (!article) return

            // Calculate scroll progress
            const windowHeight = window.innerHeight
            const documentHeight = article.scrollHeight
            const scrollTop = window.scrollY
            const articleTop = article.offsetTop

            // Calculate how far through the article we've scrolled
            const scrollableHeight = documentHeight - windowHeight
            const scrolled = scrollTop - articleTop
            const progressPercentage = (scrolled / scrollableHeight) * 100

            // Clamp between 0 and 100
            const clampedProgress = Math.min(Math.max(progressPercentage, 0), 100)
            setProgress(clampedProgress)
        }

        // Update on scroll
        window.addEventListener("scroll", updateProgress)
        // Update on resize
        window.addEventListener("resize", updateProgress)
        // Initial update
        updateProgress()

        return () => {
            window.removeEventListener("scroll", updateProgress)
            window.removeEventListener("resize", updateProgress)
        }
    }, [])

    return (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200 dark:bg-gray-800">
            <div
                className="h-full bg-green-500 transition-all duration-150 ease-out"
                style={{ width: `${progress}%` }}
            />
        </div>
    )
}