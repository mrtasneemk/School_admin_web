export type ResultActionRequest = {
  className: string;
  sectionName: string;
  academicYear?: string;
  examType?: number;
  nowd?: string;
  dryRun?: boolean;
};

export type ResultOperationResponse = {
  success: boolean;
  message: string;
  errorCode: string;
  className: string;
  sectionName: string;
  academicYear: string;
  examType: number;
  totalMarksRows: number;
  affectedRows: number;
};

export type ResultCompilePreviewCoreSubject = {
  subjectId: number;
  subjectName: string;
  obtainedMarks: string;
  notebookMarks: string;
  seMarks: string;
  carryMarks: number;
  total: number;
  grade: string;
  isAbsent: boolean;
  failed: boolean;
};

export type ResultCompilePreviewNacaSubject = {
  subjectId: number;
  subjectName: string;
  grade: string;
  present: boolean;
};

export type ResultCompilePreviewStudent = {
  admNo: number;
  studentName: string;
  totalObtainedMarks: number;
  totalMaxMarks: number;
  corePresent: boolean;
  corePassed: boolean;
  nacaPresent: boolean;
  eligibleForRank: boolean;
  provisionalRank?: number | null;
  coreSubjects: ResultCompilePreviewCoreSubject[];
  nacaSubjects: ResultCompilePreviewNacaSubject[];
};

export type ResultCompilePreviewResponse = {
  success: boolean;
  message: string;
  errorCode: string;
  className: string;
  sectionName: string;
  academicYear: string;
  examType: number;
  studentCount: number;
  students: ResultCompilePreviewStudent[];
};
