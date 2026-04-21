import { api } from "./client";

export type LatestTimetableSnapshot = {
  text: string;
  contentType: string;
  inferredFileName: string;
  isXml: boolean;
};

export async function getLatestTimetable(): Promise<LatestTimetableSnapshot> {
  const response = await api.get("/timetable/latest", {
    responseType: "text",
    transformResponse: [(value) => value]
  });

  const contentType = String(response.headers["content-type"] ?? "");
  const text = typeof response.data === "string" ? response.data : String(response.data ?? "");
  const lower = text.trim().toLowerCase();
  const isXml =
    contentType.toLowerCase().includes("xml") ||
    lower.startsWith("<?xml") ||
    lower.startsWith("<timetable") ||
    lower.startsWith("<");

  return {
    text,
    contentType,
    inferredFileName: isXml ? "latest-timetable.xml" : "latest-timetable.txt",
    isXml
  };
}
