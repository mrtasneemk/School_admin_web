import { api } from "./client";

export type LatestTimetableSnapshot = {
  text: string;
  contentType: string;
  inferredFileName: string;
  isXml: boolean;
};

export type UploadLatestTimetableResult = {
  message: string;
  fileName: string;
  uploadedFileName: string;
  size: number;
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

export async function uploadLatestTimetable(file: File): Promise<UploadLatestTimetableResult> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post("/timetable/latest", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    message: String(raw.message ?? raw.Message ?? ""),
    fileName: String(raw.fileName ?? raw.FileName ?? ""),
    uploadedFileName: String(raw.uploadedFileName ?? raw.UploadedFileName ?? file.name),
    size: Number(raw.size ?? raw.Size ?? file.size)
  };
}
