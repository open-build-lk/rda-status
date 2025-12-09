import { useEffect, useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  VisibilityState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { formatDistanceToNow } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  RefreshCw,
  Pencil,
  UserPlus,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  Trash2,
  Shield,
  ShieldCheck,
  UserCog,
  Building2,
  Plus,
  X,
  Star,
  Settings2,
  Filter,
  History,
} from "lucide-react";
import { UserAuditTimeline } from "@/components/admin/UserAuditTimeline";

interface UserOrgInfo {
  orgId: string;
  orgCode: string;
  orgName: string;
  orgRole: string;
  isPrimary: boolean | number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  designation: string | null;
  phone: string | null;
  isActive: boolean | number;
  emailVerified: boolean | number;
  createdAt: string;
  lastLogin: string | null;
  organizations: UserOrgInfo[];
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

interface Organization {
  id: string;
  name: string;
  code: string;
  type: string;
  province: string | null;
}

interface UserOrgMembership {
  organizationId: string;
  role: string;
  isPrimary: boolean | number;
  assignedAt: string;
  orgName: string;
  orgCode: string;
  orgType: string;
  orgProvince?: string | null;
}

interface UserAuditEntry {
  id: string;
  targetType: string;
  targetId: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  performedById: string | null;
  performerRole: string | null;
  performerName: string | null;
}

const roleLabels: Record<string, string> = {
  citizen: "Citizen",
  field_officer: "Field Officer",
  planner: "Planner",
  admin: "Admin",
  super_admin: "Super Admin",
  stakeholder: "Stakeholder",
};

const roleColors: Record<string, string> = {
  citizen: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  field_officer: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  planner: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  admin: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  super_admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  stakeholder: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
};

const roleOptions = [
  { value: "citizen", label: "Citizen" },
  { value: "field_officer", label: "Field Officer" },
  { value: "planner", label: "Planner" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
  { value: "stakeholder", label: "Stakeholder" },
];

const orgRoleOptions = [
  { value: "member", label: "Member" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
];

const columnHelper = createColumnHelper<User>();

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    emailVerified: false,
    createdAt: false,
  });
  const [orgFilter, setOrgFilter] = useState<string>("all");

  // Invite modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("field_officer");
  const [inviteSending, setInviteSending] = useState(false);

  // Edit modal state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesignation, setEditDesignation] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);

  // Organization management state
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [userMemberships, setUserMemberships] = useState<UserOrgMembership[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [addingOrg, setAddingOrg] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [selectedOrgRole, setSelectedOrgRole] = useState<string>("member");

  // Audit trail state
  const [auditEntries, setAuditEntries] = useState<UserAuditEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [editModalTab, setEditModalTab] = useState<"edit" | "audit">("edit");

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/admin/users", {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("You don't have permission to view users");
        }
        throw new Error("Failed to fetch users");
      }
      const data = await response.json() as {
        users: User[];
        pendingInvitations: PendingInvitation[];
        organizations: Organization[];
      };
      setUsers(data.users);
      setPendingInvitations(data.pendingInvitations);
      setAllOrganizations(data.organizations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviteSending(true);
    try {
      const response = await fetch("/api/v1/admin/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
        credentials: "include",
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Failed to send invitation");
      }
      setInviteModalOpen(false);
      setInviteEmail("");
      setInviteRole("field_officer");
      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setInviteSending(false);
    }
  };

  const handleCancelInvitation = async (id: string) => {
    if (!confirm("Cancel this invitation?")) return;
    try {
      const response = await fetch(`/api/v1/admin/users/invitations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error || "Failed to cancel invitation");
      }
      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to cancel invitation");
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName || null,
          role: editingUser.role,
          isActive: Boolean(editingUser.isActive),
          designation: editDesignation || null,
          phone: editPhone || null,
        }),
        credentials: "include",
      });
      const data = await response.json() as { error?: string; user?: User };
      if (!response.ok) {
        throw new Error(data.error || "Failed to update user");
      }
      // Refetch users to get updated organization memberships
      await fetchUsers();
      setEditingUser(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Fetch organizations and user memberships when editing a user
  const fetchOrganizations = async () => {
    try {
      const response = await fetch("/api/v1/admin/organizations", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json() as Organization[];
        setOrganizations(data);
      }
    } catch (err) {
      console.error("Failed to load organizations:", err);
    }
  };

  const fetchUserMemberships = async (userId: string) => {
    setLoadingOrgs(true);
    try {
      const response = await fetch(`/api/v1/admin/users/${userId}/organizations`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json() as UserOrgMembership[];
        setUserMemberships(data);
      }
    } catch (err) {
      console.error("Failed to load user organizations:", err);
    } finally {
      setLoadingOrgs(false);
    }
  };

  const fetchUserAuditTrail = async (userId: string) => {
    setLoadingAudit(true);
    try {
      const response = await fetch(`/api/v1/admin/users/${userId}/audit-trail`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json() as { userId: string; entries: UserAuditEntry[] };
        setAuditEntries(data.entries);
      }
    } catch (err) {
      console.error("Failed to load audit trail:", err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleAddOrg = async () => {
    if (!editingUser || !selectedOrgId) return;
    setAddingOrg(true);
    try {
      const response = await fetch(`/api/v1/admin/users/${editingUser.id}/organizations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selectedOrgId,
          role: selectedOrgRole,
          isPrimary: userMemberships.length === 0,
        }),
        credentials: "include",
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Failed to add organization");
      }
      await fetchUserMemberships(editingUser.id);
      setSelectedOrgId("");
      setSelectedOrgRole("member");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setAddingOrg(false);
    }
  };

  const handleRemoveOrg = async (orgId: string) => {
    if (!editingUser) return;
    if (!confirm("Remove user from this organization?")) return;
    try {
      const response = await fetch(
        `/api/v1/admin/users/${editingUser.id}/organizations/${orgId}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error || "Failed to remove");
      }
      await fetchUserMemberships(editingUser.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove");
    }
  };

  const handleSetPrimary = async (orgId: string) => {
    if (!editingUser) return;
    try {
      const response = await fetch(
        `/api/v1/admin/users/${editingUser.id}/organizations/${orgId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPrimary: true }),
          credentials: "include",
        }
      );
      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error || "Failed to update");
      }
      await fetchUserMemberships(editingUser.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    }
  };

  // Load orgs and audit when editing user
  useEffect(() => {
    if (editingUser) {
      fetchOrganizations();
      fetchUserMemberships(editingUser.id);
      fetchUserAuditTrail(editingUser.id);
      setEditName(editingUser.name || "");
      setEditDesignation(editingUser.designation || "");
      setEditPhone(editingUser.phone || "");
      setEditModalTab("edit");
    } else {
      setUserMemberships([]);
      setAuditEntries([]);
      setSelectedOrgId("");
      setSelectedOrgRole("member");
      setEditName("");
      setEditDesignation("");
      setEditPhone("");
    }
  }, [editingUser]);

  // Filter users by organization
  const filteredUsers = useMemo(() => {
    if (orgFilter === "all") return users;
    if (orgFilter === "unassigned") {
      return users.filter((u) => !u.organizations || u.organizations.length === 0);
    }
    return users.filter((u) =>
      u.organizations?.some((o) => o.orgId === orgFilter)
    );
  }, [users, orgFilter]);

  // Filter out already assigned orgs
  const availableOrgs = organizations.filter(
    (org) => !userMemberships.some((m) => m.organizationId === org.id)
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Name",
        cell: (info) => (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium">
              {info.getValue().charAt(0).toUpperCase()}
            </div>
            <span className="font-medium">{info.getValue()}</span>
          </div>
        ),
      }),
      columnHelper.accessor("email", {
        header: "Email",
        cell: (info) => (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("designation", {
        header: "Designation",
        cell: (info) => {
          const value = info.getValue();
          return value ? (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {value}
            </span>
          ) : (
            <span className="text-sm text-gray-400 italic">-</span>
          );
        },
      }),
      columnHelper.accessor("organizations", {
        header: "Organizations",
        enableSorting: false,
        cell: (info) => {
          const orgs = info.getValue();
          if (!orgs || orgs.length === 0) {
            return <span className="text-sm text-gray-400 italic">None</span>;
          }
          // Sort to show primary first
          const sorted = [...orgs].sort((a, b) =>
            (Boolean(b.isPrimary) ? 1 : 0) - (Boolean(a.isPrimary) ? 1 : 0)
          );
          return (
            <div className="flex flex-wrap gap-1">
              {sorted.slice(0, 2).map((org) => (
                <span
                  key={org.orgId}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                    Boolean(org.isPrimary)
                      ? "bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                  title={`${org.orgName} (${org.orgRole})`}
                >
                  {Boolean(org.isPrimary) && <Star className="w-3 h-3 fill-current" />}
                  {org.orgCode}
                </span>
              ))}
              {sorted.length > 2 && (
                <span className="text-xs text-gray-500">+{sorted.length - 2}</span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("role", {
        header: "Role",
        cell: (info) => {
          const role = info.getValue();
          return (
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                roleColors[role] || roleColors.citizen
              }`}
            >
              {role === "super_admin" ? (
                <ShieldCheck className="w-3 h-3" />
              ) : role === "admin" ? (
                <Shield className="w-3 h-3" />
              ) : null}
              {roleLabels[role] || role}
            </span>
          );
        },
      }),
      columnHelper.accessor("isActive", {
        header: "Status",
        cell: (info) => {
          const isActive = Boolean(info.getValue());
          return (
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                isActive
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
              }`}
            >
              {isActive ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  Active
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3" />
                  Disabled
                </>
              )}
            </span>
          );
        },
      }),
      columnHelper.accessor("emailVerified", {
        header: "Verified",
        cell: (info) => {
          const verified = Boolean(info.getValue());
          return verified ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <Clock className="w-4 h-4 text-gray-400" />
          );
        },
      }),
      columnHelper.accessor("lastLogin", {
        header: "Last Login",
        cell: (info) => {
          const value = info.getValue();
          return value ? (
            <span className="text-sm text-gray-500">
              {formatDistanceToNow(new Date(value))} ago
            </span>
          ) : (
            <span className="text-sm text-gray-400">Never</span>
          );
        },
      }),
      columnHelper.accessor("createdAt", {
        header: "Joined",
        cell: (info) => (
          <span className="text-sm text-gray-500">
            {formatDistanceToNow(new Date(info.getValue()))} ago
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingUser({ ...info.row.original })}
          >
            <Pencil className="w-4 h-4" />
          </Button>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filteredUsers,
    columns,
    state: {
      sorting,
      globalFilter,
      columnFilters,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  // Column labels for visibility dropdown
  const columnLabels: Record<string, string> = {
    name: "Name",
    email: "Email",
    designation: "Designation",
    organizations: "Organizations",
    role: "Role",
    isActive: "Status",
    emailVerified: "Verified",
    lastLogin: "Last Login",
    createdAt: "Joined",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="border border-red-200 bg-red-50 dark:bg-red-900/20 rounded-lg p-6 text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <Button onClick={fetchUsers} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="w-6 h-6" />
            User Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage users and send invitations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-[180px]"
          />
          {/* Organization Filter */}
          <Select value={orgFilter} onValueChange={setOrgFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Orgs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {allOrganizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Column Visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings2 className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value: boolean) => column.toggleVisibility(value)}
                  >
                    {columnLabels[column.id] || column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={fetchUsers} variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => setInviteModalOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite User
          </Button>
        </div>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="border rounded-lg p-4 bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800">
          <h2 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Pending Invitations ({pendingInvitations.length})
          </h2>
          <div className="space-y-2">
            {pendingInvitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <span className="font-medium">{inv.email}</span>
                    <span
                      className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs ${
                        roleColors[inv.role] || roleColors.citizen
                      }`}
                    >
                      {roleLabels[inv.role] || inv.role}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Expires {formatDistanceToNow(new Date(inv.expiresAt))}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCancelInvitation(inv.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="text-sm text-gray-500 flex items-center gap-2">
        <span>
          Showing {table.getRowModel().rows.length} of {filteredUsers.length} users
        </span>
        {orgFilter !== "all" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setOrgFilter("all")}
          >
            <X className="w-3 h-3 mr-1" />
            Clear filter
          </Button>
        )}
        {users.length !== filteredUsers.length && (
          <span className="text-gray-400">
            ({users.length} total)
          </span>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={
                            header.column.getCanSort()
                              ? "flex items-center gap-1 cursor-pointer select-none hover:text-gray-700"
                              : ""
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getCanSort() && (
                            <span className="text-gray-400">
                              {{
                                asc: <ChevronUp className="w-4 h-4" />,
                                desc: <ChevronDown className="w-4 h-4" />,
                              }[header.column.getIsSorted() as string] ?? (
                                <ChevronsUpDown className="w-4 h-4" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Invite Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Send an invitation email to add a new user to the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInviteModalOpen(false)}
              disabled={inviteSending}
            >
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={inviteSending || !inviteEmail}>
              {inviteSending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? (editName || editingUser.email) : "Edit User"}
            </DialogTitle>
            <DialogDescription>
              {editingUser?.email}
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <>
              {/* Tabs */}
              <div className="flex gap-1 border-b">
                <button
                  onClick={() => setEditModalTab("edit")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    editModalTab === "edit"
                      ? "border-primary-600 text-primary-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Pencil className="w-4 h-4 inline-block mr-1.5" />
                  Edit
                </button>
                <button
                  onClick={() => setEditModalTab("audit")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    editModalTab === "audit"
                      ? "border-primary-600 text-primary-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <History className="w-4 h-4 inline-block mr-1.5" />
                  Audit Trail
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {editModalTab === "edit" ? (
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Enter name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select
                        value={editingUser.role}
                        onValueChange={(value) =>
                          setEditingUser({ ...editingUser, role: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Account Status</Label>
                      <Select
                        value={editingUser.isActive ? "active" : "disabled"}
                        onValueChange={(value) =>
                          setEditingUser({
                            ...editingUser,
                            isActive: value === "active",
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="disabled">Disabled</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        Disabled users cannot log in to the platform.
                      </p>
                    </div>

                    {/* Designation and Phone */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-designation">Designation</Label>
                        <Input
                          id="edit-designation"
                          placeholder="e.g. Senior Engineer"
                          value={editDesignation}
                          onChange={(e) => setEditDesignation(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-phone">Phone</Label>
                        <Input
                          id="edit-phone"
                          placeholder="e.g. +94 77 123 4567"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Organization Memberships */}
                    <div className="space-y-3 border-t pt-4 mt-2">
                      <Label className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Organization Memberships
                      </Label>

                      {loadingOrgs ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500 p-3">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading organizations...
                        </div>
                      ) : (
                        <>
                          {/* Current memberships */}
                          {userMemberships.length > 0 ? (
                            <div className="space-y-2">
                              {userMemberships.map((m) => (
                                <div
                                  key={m.organizationId}
                                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                                >
                                  <div className="flex items-center gap-2">
                                    {Boolean(m.isPrimary) && (
                                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    )}
                                    <span className="font-medium text-sm">{m.orgCode}</span>
                                    <span className="text-xs text-gray-500">{m.orgName}</span>
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700">
                                      {m.role}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {!Boolean(m.isPrimary) && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleSetPrimary(m.organizationId)}
                                        className="h-7 px-2 text-xs"
                                        title="Set as primary"
                                      >
                                        <Star className="w-3 h-3" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveOrg(m.organizationId)}
                                      className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 p-2">
                              No organization memberships
                            </p>
                          )}

                          {/* Add organization */}
                          {availableOrgs.length > 0 && (
                            <div className="flex items-center gap-2 pt-2">
                              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Select organization..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableOrgs.map((org) => (
                                    <SelectItem key={org.id} value={org.id}>
                                      <span className="font-medium">{org.code}</span>
                                      <span className="ml-2 text-gray-500">{org.name}</span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select value={selectedOrgRole} onValueChange={setSelectedOrgRole}>
                                <SelectTrigger className="w-28">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {orgRoleOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                onClick={handleAddOrg}
                                disabled={!selectedOrgId || addingOrg}
                              >
                                {addingOrg ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Plus className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-4">
                    {loadingAudit ? (
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-8">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading audit trail...
                      </div>
                    ) : (
                      <UserAuditTimeline
                        entries={auditEntries}
                        userCreatedAt={editingUser.createdAt}
                      />
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          <DialogFooter className="border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setEditingUser(null)}
              disabled={saving}
            >
              {editModalTab === "edit" ? "Cancel" : "Close"}
            </Button>
            {editModalTab === "edit" && (
              <Button onClick={handleSaveUser} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
