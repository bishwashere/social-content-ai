"use server";
import { AI } from "@/lib/ai";
import axios from "axios";
import * as cheerio from "cheerio";

export async function getWebsiteDescription(url: string) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Try to get meta description first
    let description =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content");

    console.log("description from meta tags:", description);

    // If no description, get all body text
    if (!description) {
      description = $("body").text();
      // Optional: trim and collapse whitespace
      description = description.replace(/\s+/g, " ").trim();

      console.log("description from body text:", description);
    }

    // summarize this description using gemini in 3 lines

    const ai = new AI();
    description = (await ai.summarize(description, 3)) || "";

    console.log("summarized description:", description);

    return description;
  } catch {
    return null;
  }
}
