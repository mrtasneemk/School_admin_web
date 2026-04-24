export type GuardianSearchResult = {
  guardianId: number;
  guardianCode: string;
  guardianName: string;
  username: string;
  mobile: string;
  wardCount: number;
  isActive: boolean;
};

export type GuardianWard = {
  admNo: number;
  studentName: string;
  className: string;
  sectionName: string;
  fatherName: string;
  motherName: string;
  mobile: string;
  isPrimary: boolean;
};

export type GuardianDetail = {
  guardianId: number;
  guardianCode: string;
  guardianName: string;
  username: string;
  mobile: string;
  fatherName: string;
  motherName: string;
  email: string;
  isActive: boolean;
  wards: GuardianWard[];
};

export type GuardianAdmissionOperationRequest = {
  admNo: number;
  relationship: string;
  setAsPrimary: boolean;
};

export type GuardianAdminOperationResult = {
  success: boolean;
  message: string;
  guardianId: number;
  guardianCode: string;
  guardianName: string;
  username: string;
  mobile: string;
  createdAccount: boolean;
  createdMapping: boolean;
  temporaryPassword: string | null;
  wardCount: number;
};

export type GuardianPasswordResetResult = {
  success: boolean;
  message: string;
  guardianId: number;
  guardianCode: string;
  username: string;
  temporaryPassword: string | null;
};
