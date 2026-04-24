export type TimetableHeader = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
};

export type TimetableCell =
  | { type: "lesson"; subject: string; teacher?: string }
  | { type: "empty" };

export type TimetableRow = {
  dayName: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
  cells: TimetableCell[];
};

export type TimetableGrid = {
  headers: TimetableHeader[];
  rows: TimetableRow[];
  meta?: {
    matchedTeacher?: boolean;
    lessonCount?: number;
  };
};

type XmlEntity = Record<string, string>;

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

function parseXml(xml: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Invalid timetable XML.");
  }
  return doc;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeTeacherName(value: string) {
  return normalizeWhitespace(value)
    .toUpperCase()
    .replace(/[._-]/g, " ")
    .replace(/\b(MR|MRS|MS|MISS|DR|SIR|MADAM)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeTeacherName(value)
    .split(" ")
    .map((x) => x.trim())
    .filter(Boolean);
}

function stringSimilarity(a: string, b: string) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const left = new Set(Array.from({ length: Math.max(0, a.length - 1) }, (_, i) => a.slice(i, i + 2)));
  const right = new Set(Array.from({ length: Math.max(0, b.length - 1) }, (_, i) => b.slice(i, i + 2)));
  if (left.size === 0 || right.size === 0) return 0;
  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) overlap += 1;
  }
  return (2 * overlap) / (left.size + right.size);
}

function nodesToRecords(doc: Document, selector: string): XmlEntity[] {
  return Array.from(doc.querySelectorAll(selector)).map((node) => {
    const element = node as Element;
    const raw: XmlEntity = {};
    for (const attr of Array.from(element.attributes)) {
      raw[attr.name] = attr.value;
    }
    return raw;
  });
}

function decodeDaysMask(mask: string): string[] {
  const normalized = String(mask ?? "").trim();
  return DAYS.filter((_, index) => normalized[index] === "1").map((day) => day);
}

function getTeacherDisplayName(raw: XmlEntity) {
  return normalizeWhitespace(raw.name || `${raw.firstname ?? ""} ${raw.lastname ?? ""}`);
}

function getPeriodSortNumber(period: XmlEntity) {
  const values = [period.period, period.short, period.name, period.id];
  for (const value of values) {
    const match = String(value ?? "").match(/\d+/);
    if (match) return Number(match[0]);
  }
  return Number.MAX_SAFE_INTEGER;
}

function getTimeMinutes(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1]) * 60 + Number(match[2]);
}

function normalizeClassLabel(input: string) {
  const raw = normalizeWhitespace(input).toUpperCase().replace(/\./g, "");
  if (!raw) return { className: "", section: "" };
  if (raw === "UKG" || raw === "LKG") return { className: raw, section: "" };
  if (/^(UKG|LKG)[A-Z]$/.test(raw)) return { className: raw.slice(0, 3), section: raw.slice(3) };

  const stdMatch = raw.match(/^(?:STD\s+)?([IVX]+|\d+|LKG|UKG)(?:\s+([A-Z]))?$/);
  if (stdMatch) {
    const base = stdMatch[1];
    const section = stdMatch[2] ?? "";
    if (base === "LKG" || base === "UKG") return { className: base, section };
    return { className: `STD ${base}`, section };
  }

  const compactMatch = raw.match(/^([IVX]+|\d+)\s*([A-Z])$/);
  if (compactMatch) return { className: `STD ${compactMatch[1]}`, section: compactMatch[2] };
  return { className: raw, section: "" };
}

function buildMaps(doc: Document) {
  const periods = [...nodesToRecords(doc, "timetable > periods > period")].sort((a, b) => {
    const periodDiff = getPeriodSortNumber(a) - getPeriodSortNumber(b);
    if (periodDiff !== 0) return periodDiff;
    const timeDiff = getTimeMinutes(a.starttime ?? "") - getTimeMinutes(b.starttime ?? "");
    if (timeDiff !== 0) return timeDiff;
    return String(a.name ?? a.short ?? a.id ?? "").localeCompare(String(b.name ?? b.short ?? b.id ?? ""));
  });

  const subjectsById = new Map(
    nodesToRecords(doc, "timetable > subjects > subject").map((subject) => [String(subject.id ?? ""), normalizeWhitespace(subject.name ?? "")])
  );

  const teachersById = new Map(
    nodesToRecords(doc, "timetable > teachers > teacher").map((teacher) => [
      String(teacher.id ?? ""),
      {
        id: String(teacher.id ?? ""),
        partnerId: String(teacher.partner_id ?? teacher.partnerid ?? ""),
        name: getTeacherDisplayName(teacher)
      }
    ])
  );

  const daysById = new Map(
    nodesToRecords(doc, "timetable > daysdefs > daysdef").map((daysdef) => [String(daysdef.id ?? ""), decodeDaysMask(daysdef.days ?? "")])
  );

  const classesById = new Map(
    nodesToRecords(doc, "timetable > classes > class").map((item) => {
      const label = normalizeWhitespace(item.name ?? item.short ?? item.id ?? "");
      return [String(item.id ?? ""), { label, normalized: normalizeClassLabel(label) }] as const;
    })
  );

  const lessonsById = new Map(
    nodesToRecords(doc, "timetable > lessons > lesson").map((lesson) => {
      const classIds = String(lesson.classids ?? lesson.classid ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      const teacherIds = String(lesson.teacherids ?? lesson.teacherid ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      return [
        String(lesson.id ?? ""),
        {
          subjectId: String(lesson.subjectid ?? ""),
          classIds,
          teacherIds,
          daysDefId: String(lesson.daysdefid ?? "")
        }
      ] as const;
    })
  );

  const cards = nodesToRecords(doc, "timetable > cards > card");
  return { periods, subjectsById, teachersById, daysById, classesById, lessonsById, cards };
}

function buildHeaders(periods: XmlEntity[]): TimetableHeader[] {
  return periods.map((period) => {
    const label = normalizeWhitespace(period.name ?? period.short ?? period.id ?? "");
    return {
      id: String(period.period ?? period.id ?? label),
      label,
      startTime: String(period.starttime ?? ""),
      endTime: String(period.endtime ?? ""),
      isBreak: /break|recess|lunch/i.test(label)
    };
  });
}

function buildRows(headers: TimetableHeader[]): TimetableRow[] {
  return DAYS.map((dayName) => ({
    dayName,
    cells: headers.map(() => ({ type: "empty" as const }))
  }));
}

function scoreTeacherMatch(candidate: { id: string; partnerId: string; name: string }, target: { teacherName?: string; teacherEmpId?: number }) {
  const targetId = target.teacherEmpId ? String(target.teacherEmpId) : "";
  if (targetId && (candidate.id === targetId || candidate.partnerId === targetId)) return 100;

  const candidateName = normalizeTeacherName(candidate.name);
  const targetName = normalizeTeacherName(target.teacherName ?? "");
  if (!candidateName || !targetName) return 0;
  if (candidateName === targetName) return 90;
  if (candidateName.includes(targetName) || targetName.includes(candidateName)) return 70;

  const candidateTokens = tokenize(candidateName);
  const targetTokens = tokenize(targetName);
  const overlap = candidateTokens.filter((token) => targetTokens.includes(token)).length;
  const overlapRatio = overlap / Math.max(candidateTokens.length, targetTokens.length, 1);
  let score = overlap * 18;

  if (candidateTokens[0] && targetTokens[0] && candidateTokens[0] === targetTokens[0]) score += 10;
  if (
    candidateTokens[candidateTokens.length - 1] &&
    targetTokens[targetTokens.length - 1] &&
    candidateTokens[candidateTokens.length - 1] === targetTokens[targetTokens.length - 1]
  ) {
    score += 10;
  }
  if (candidateTokens[0] && targetTokens[0] && candidateTokens[candidateTokens.length - 1] && targetTokens[targetTokens.length - 1]) {
    if (
      candidateTokens[0] === targetTokens[0] &&
      candidateTokens[candidateTokens.length - 1] === targetTokens[targetTokens.length - 1]
    ) {
      score += 12;
    }
  }

  score += Math.round(overlapRatio * 20);
  score += Math.round(stringSimilarity(candidateName, targetName) * 25);
  return score;
}

export function parseStudentTimetableXml(xml: string, targetDbClass: string, targetSection: string): TimetableGrid {
  const doc = parseXml(xml);
  const { periods, subjectsById, teachersById, daysById, classesById, lessonsById, cards } = buildMaps(doc);
  const headers = buildHeaders(periods);
  const rows = buildRows(headers);
  const periodIndexById = new Map(headers.map((header, index) => [header.id, index]));
  const target = normalizeClassLabel(`${targetDbClass} ${targetSection}`.trim());
  const matchingClassIds = new Set(
    Array.from(classesById.entries())
      .filter(([, value]) => {
        if (value.normalized.className !== target.className) return false;
        if (target.className === "UKG" || target.className === "LKG") {
          return !target.section || !value.normalized.section || value.normalized.section === target.section;
        }
        return value.normalized.section === target.section;
      })
      .map(([id]) => id)
  );

  let lessonCount = 0;
  for (const card of cards) {
    const lesson = lessonsById.get(String(card.lessonid ?? ""));
    if (!lesson) continue;
    if (!lesson.classIds.some((id) => matchingClassIds.has(id))) continue;
    const days = card.days ? decodeDaysMask(card.days) : daysById.get(lesson.daysDefId) ?? [];
    const periodIndex = periodIndexById.get(String(card.period ?? ""));
    if (periodIndex === undefined) continue;
    const subject = subjectsById.get(lesson.subjectId) || "Unknown Subject";
    const teacher = lesson.teacherIds[0] ? teachersById.get(lesson.teacherIds[0])?.name : "";

    for (const day of days) {
      const row = rows.find((item) => item.dayName === day);
      if (!row) continue;
      row.cells[periodIndex] = { type: "lesson", subject, teacher };
      lessonCount += 1;
    }
  }

  return { headers, rows, meta: { lessonCount } };
}

export function parseTeacherTimetableXml(xml: string, args: { teacherName?: string; teacherEmpId?: number }): TimetableGrid {
  const doc = parseXml(xml);
  const { periods, subjectsById, teachersById, daysById, classesById, lessonsById, cards } = buildMaps(doc);
  const headers = buildHeaders(periods);
  const rows = buildRows(headers);
  const periodIndexById = new Map(headers.map((header, index) => [header.id, index]));

  const best = Array.from(teachersById.values())
    .map((candidate) => ({ candidate, score: scoreTeacherMatch(candidate, args) }))
    .sort((a, b) => b.score - a.score)[0];

  if (!best || best.score < 40) {
    return { headers, rows, meta: { matchedTeacher: false, lessonCount: 0 } };
  }

  let lessonCount = 0;
  for (const card of cards) {
    const lesson = lessonsById.get(String(card.lessonid ?? ""));
    if (!lesson) continue;
    if (!lesson.teacherIds.includes(best.candidate.id)) continue;

    const days = card.days ? decodeDaysMask(card.days) : daysById.get(lesson.daysDefId) ?? [];
    const periodIndex = periodIndexById.get(String(card.period ?? ""));
    if (periodIndex === undefined) continue;
    const subject = subjectsById.get(lesson.subjectId) || "Unknown Subject";
    const classLabel = Array.from(
      new Set(
        lesson.classIds
          .map((id) => classesById.get(id)?.label)
          .filter(Boolean)
          .map((value) => normalizeWhitespace(String(value)))
      )
    ).join(", ");

    for (const day of days) {
      const row = rows.find((item) => item.dayName === day);
      if (!row) continue;
      row.cells[periodIndex] = { type: "lesson", subject, teacher: classLabel };
      lessonCount += 1;
    }
  }

  return { headers, rows, meta: { matchedTeacher: true, lessonCount } };
}
