export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  userId: number;
  username: string;
  roleId: number;
  roleCode: string;
  roleName: string;
  token: string;
};

export type ResetEmployeePasswordResponse = {
  success: boolean;
  message: string;
  password: string;
  updatedUsers: number;
};
