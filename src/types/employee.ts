export type EmployeeListFilter = {
  search: string;
  active?: boolean;
  page: number;
  pageSize: number;
};

export type EmployeeListItem = {
  EMP_ID: number;
  NAME: string;
  DISGNATION: string;
  ROLE: string;
  ACTIVE: boolean;
};

export type EmployeeDetailDto = {
  EMP_ID: number;
  NAME: string;
  FATHER: string;
  DOB: string;
  PAREA: string;
  PPOST: string;
  PDIST: string;
  AREA: string;
  POST: string;
  DIST: string;
  PHONE: string;
  MOBILE: string;
  DISGNATION: string;
  DOJ: string;
  EMAIL: string;
  CASTE: string;
  RELIGION: string;
  AADHAR: string;
  ExperienceYrs: string;
  ExperienceMonths: string;
  Qualification: string;
  TechQualification: string;
  PAN: string;
  PZIP: string;
  ZIP: string;
  Emp_Cat: number;
  ACTIVE: boolean;
};

export type CreateEmployeeDto = {
  NAME: string;
  FATHER: string;
  DOB: string;
  PAREA: string;
  PPOST: string;
  PDIST: string;
  AREA: string;
  POST: string;
  DIST: string;
  PHONE: string;
  MOBILE: string;
  DISGNATION: string;
  DOJ: string;
  EMAIL: string;
  CASTE: string;
  RELIGION: string;
  AADHAR: string;
  ExperienceYrs: string;
  ExperienceMonths: string;
  Qualification: string;
  TechQualification: string;
  PAN: string;
  PZIP: string;
  ZIP: string;
  Emp_Cat: number;
  ACTIVE: boolean;
};

export type UpdateEmployeeDto = CreateEmployeeDto;

export type AssignClassDto = {
  ClassName: string;
  SectionName: string;
};

export type AssignSubjectDto = {
  ClassName: string;
  SectionName: string;
  SubjectName: string;
};

export type AssignedClassDto = {
  ClassName: string;
  SectionName?: string | null;
};

export type AssignedSubjectDto = {
  ClassName: string;
  SectionName?: string | null;
  SubjectName: string;
};

export type EmployeeProfileDto = {
  EMP_ID: number;
  NAME: string;
  ROLE?: string;
  FATHER: string;
  DOB: string;
  MOBILE: string;
  EMAIL: string;
  DISGNATION: string;
  DOJ: string;
  qualification: string;
  tech_qualification: string;
  ACTIVE: boolean;
  Emp_Cat: number;
  PICURL: string;
};

export type EmployeeOverviewDto = {
  Profile: EmployeeProfileDto;
  Classes: AssignedClassDto[];
  Subjects: AssignedSubjectDto[];
};

export type AssignEmployeeRoleResult = {
  empId: number;
  userId: number;
  roleId: number;
  roleName: string;
  createdUser: boolean;
  username: string;
};
