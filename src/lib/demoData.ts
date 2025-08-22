// Demo data for when API server is not available
import type { StaffMember, Permission } from '@/types';

const AVAILABLE_MODULES = [
  'Dashboard', 'Products', 'Buyers', 'Locations', 'Quality Control', 
  'Materials', 'Finished Products', 'Semi Products', 'Settings', 
  'Reports', 'Staff Management', 'Warehouse', 'History'
];

// Create admin permissions
const createAdminPermissions = (): Permission[] => {
  return AVAILABLE_MODULES.map(module => ({
    module,
    canView: true,
    canAdd: true,
    canEdit: true,
    canDelete: true,
    canExport: true,
    fullControl: true
  }));
};

// Create manager permissions
const createManagerPermissions = (): Permission[] => {
  return AVAILABLE_MODULES.map(module => ({
    module,
    canView: true,
    canAdd: module !== 'Staff Management',
    canEdit: module !== 'Staff Management',
    canDelete: false,
    canExport: true,
    fullControl: false
  }));
};

// Create viewer permissions
const createViewerPermissions = (): Permission[] => {
  return AVAILABLE_MODULES.map(module => ({
    module,
    canView: !['Staff Management', 'Settings'].includes(module),
    canAdd: false,
    canEdit: false,
    canDelete: false,
    canExport: false,
    fullControl: false
  }));
};

// Demo staff data
export const DEMO_STAFF: StaffMember[] = [
  {
    id: '1',
    name: 'System Administrator',
    email: 'admin@company.com',
    phone: '+1234567890',
    department: 'Administration',
    position: 'System Administrator',
    role: 'ADMIN',
    status: 'ACTIVE',
    permissions: createAdminPermissions(),
    lastLogin: new Date().toISOString(),
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    phone: '+1234567891',
    department: 'Production',
    position: 'Production Manager',
    role: 'MANAGER',
    status: 'ACTIVE',
    permissions: createManagerPermissions(),
    lastLogin: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days ago
    updated_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: '3',
    name: 'Mike Wilson',
    email: 'mike.wilson@company.com',
    phone: '+1234567892',
    department: 'Quality Control',
    position: 'QC Supervisor',
    role: 'SUPERVISOR',
    status: 'ACTIVE',
    permissions: AVAILABLE_MODULES.map(module => ({
      module,
      canView: !['Staff Management', 'Settings'].includes(module),
      canAdd: !['Staff Management', 'Settings'].includes(module),
      canEdit: !['Staff Management', 'Settings'].includes(module),
      canDelete: false,
      canExport: true,
      fullControl: false
    })),
    lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '4',
    name: 'Lisa Chen',
    email: 'lisa.chen@company.com',
    phone: '+1234567893',
    department: 'Warehouse',
    position: 'Warehouse Operator',
    role: 'OPERATOR',
    status: 'ACTIVE',
    permissions: AVAILABLE_MODULES.map(module => ({
      module,
      canView: !['Staff Management', 'Settings'].includes(module),
      canAdd: ['Products', 'Materials', 'Quality Control', 'Warehouse'].includes(module),
      canEdit: ['Products', 'Materials', 'Quality Control', 'Warehouse'].includes(module),
      canDelete: false,
      canExport: false,
      fullControl: false
    })),
    lastLogin: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    id: '5',
    name: 'John Viewer',
    email: 'john.viewer@company.com',
    phone: '+1234567894',
    department: 'General',
    position: 'Data Analyst',
    role: 'VIEWER',
    status: 'ACTIVE',
    permissions: createViewerPermissions(),
    lastLogin: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '6',
    name: 'Tom Support',
    email: 'tom.support@company.com',
    phone: '+1234567895',
    department: 'IT Support',
    position: 'IT Specialist',
    role: 'IT_SUPPORT',
    status: 'INACTIVE',
    permissions: AVAILABLE_MODULES.map(module => ({
      module,
      canView: true,
      canAdd: ['Products', 'Materials', 'Settings'].includes(module),
      canEdit: ['Products', 'Materials', 'Settings'].includes(module),
      canDelete: false,
      canExport: true,
      fullControl: false
    })),
    lastLogin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(), // 25 days ago
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Demo login credentials
export const DEMO_CREDENTIALS = [
  { email: 'admin@company.com', password: 'admin123', staff: DEMO_STAFF[0] },
  { email: 'sarah.johnson@company.com', password: 'manager123', staff: DEMO_STAFF[1] },
  { email: 'mike.wilson@company.com', password: 'supervisor123', staff: DEMO_STAFF[2] },
  { email: 'lisa.chen@company.com', password: 'operator123', staff: DEMO_STAFF[3] },
  { email: 'john.viewer@company.com', password: 'viewer123', staff: DEMO_STAFF[4] },
  { email: 'tom.support@company.com', password: 'support123', staff: DEMO_STAFF[5] }
];

// Get demo staff member by credentials
export const getDemoStaffByCredentials = (email: string, password: string): StaffMember | null => {
  const credential = DEMO_CREDENTIALS.find(cred => cred.email === email && cred.password === password);
  return credential ? credential.staff : null;
};

// Generate demo token
export const generateDemoToken = (staffId: string): string => {
  return `demo_token_${staffId}_${Date.now()}`;
};