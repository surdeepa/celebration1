
export type Role = 'ADMIN' | 'STAFF';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: Role;
}

export type EventType = 'BIRTHDAY' | 'ANNIVERSARY';

export interface Tracking {
  messaged: boolean;    // 7 days before
  called: boolean;      // 3 days before
  greeted: boolean;     // On the day
  followedUp: boolean;  // 2 days after
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  eventType: EventType;
  day: number;
  month: number;
  assignedStaffId: string;
  assignedStaffName: string;
  status: 'PENDING' | 'WISHED';
  tracking: Tracking;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
