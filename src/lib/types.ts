/** รูปแบบข้อมูลดิบหนึ่งแถวที่ Apps Script ส่งกลับมา */
export type RawApplication = {
  id: string;
  no: string;
  name: string;
  company: string;
  position: string;
  statusText: string;
  department: string;
  gpa: string;
  semester: string;
  email: string;
  phone: string;
  portfolioUrl: string;
  documentsUrl: string;
  linkedinUrl: string;
  registrationRequest: string;
  registrationStatus: string;
  letterStatus: string;
  advisor: string;
  stage: string;
  rowNumber: number;
};

/** ข้อมูลที่ผ่านการกรองแล้ว พร้อมส่งให้เบราว์เซอร์ */
export type PublicApplication = {
  company: string;
  position: string;
  stage: string;
  stageKey: StageKey;
  stageLabel: string;
  stageStep: number;
  statusText: string;
  registrationRequest: string;
  registrationStatus: string;
  letterStatus: string;
  hasPortfolio: boolean;
  hasDocuments: boolean;
  hasLinkedin: boolean;
  portfolioUrl: string;
  linkedinUrl: string;
  /** เปิดเผยเมื่อ SHOW_SENSITIVE_FIELDS=true เท่านั้น */
  gpa?: string;
  phone?: string;
  documentsUrl?: string;
};

export type StudentResult = {
  id: string;
  name: string;
  department: string;
  advisor: string;
  semester: string;
  maskedEmail: string;
  applications: PublicApplication[];
};

export type StageKey =
  | 'submitted'
  | 'reviewing'
  | 'test'
  | 'interview'
  | 'accepted'
  | 'rejected'
  | 'unknown';

export type StatItem = { label: string; count: number };

export type Stats = {
  totalApplications: number;
  totalStudents: number;
  byStage: StatItem[];
  byDepartment: StatItem[];
  byAdvisor: StatItem[];
  topCompanies: StatItem[];
  updatedAt: string;
};
