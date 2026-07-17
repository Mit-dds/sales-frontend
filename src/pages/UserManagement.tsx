import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Avatar, Modal } from "@/components/ui";
import type { User } from "@/types";
import { apiClient } from "@/lib/api/apiClient";
import { useAuth } from "@/app/providers/AuthProvider";

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {},
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);
  const [selectedProfileUser, setSelectedProfileUser] = useState<User | null>(
    null,
  );
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchUsers = useCallback(
    async (currentPage: number, searchVal: string, statusVal: string) => {
      setLoading(true);
      try {
        const params: any = {
          page: currentPage,
          limit: 10,
          includeRemoved: "true",
        };
        if (searchVal) params.search = searchVal.trim();
        if (statusVal) params.status = statusVal;

        const response = await apiClient.get<{
          success: boolean;
          data: {
            users: User[];
            pagination: {
              page: number;
              limit: number;
              total: number;
              totalPages: number;
            };
          };
        }>("admin/users", { params });

        if (response.data.success) {
          setUsers(response.data.data.users);
          setTotalPages(response.data.data.pagination.totalPages || 1);
          setTotalUsers(response.data.data.pagination.total || 0);
        }
      } catch (ex: any) {
        const errData = ex.response?.data || ex;
        toast.error(errData.message || "Failed to load users list");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchUsers(page, search, statusFilter);
  }, [page, search, statusFilter, fetchUsers]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    setActionLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      const response = await apiClient.patch<{
        success: boolean;
        message: string;
      }>(`admin/users/${userId}/status`, { status: newStatus });

      if (response.data.success) {
        toast.success(
          response.data.message || "User status updated successfully",
        );
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u)),
        );
      }
    } catch (ex: any) {
      const errData = ex.response?.data || ex;
      toast.error(errData.message || "Failed to update status");
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleViewProfile = async (user: User) => {
    setSelectedProfileUser(user);
    setProfileLoading(true);
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: {
          user: User;
        };
      }>(`admin/users/${user.id}`);

      if (response.data.success) {
        setSelectedProfileUser(response.data.data.user);
      }
    } catch (ex: any) {
      const errData = ex.response?.data || ex;
      toast.error(errData.message || "Failed to load detailed profile data");
    } finally {
      setProfileLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return "bg-green-dim text-green border border-[rgba(26,138,90,0.3)]";
      case "PENDING":
        return "bg-[rgba(201,100,10,0.08)] text-orange border border-[rgba(201,100,10,0.3)]";
      case "INACTIVE":
        return "bg-[rgba(74,88,128,0.08)] text-navy-light border border-[rgba(74,88,128,0.3)]";
      case "REMOVED":
        return "bg-red-dim text-red border border-[rgba(192,57,43,0.3)]";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-300";
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-6">
        <h1 className="font-serif text-2xl font-semibold text-navy">
          Users
        </h1>
        {/* {totalUsers > 0 && (
          <span className="bg-blue-dim text-blue rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
            {totalUsers} total
          </span>
        )} */}
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-white border border-border rounded-md px-3.5 py-2 text-[13px] text-navy placeholder-navy-dim outline-none focus:border-blue transition-colors"
          />
        </div>
        <div className="flex gap-2.5 items-center w-full md:w-auto">
          <span className="text-xs font-mono tracking-[1px] text-navy-dim uppercase">
            Status Filter:
          </span>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="appearance-none bg-white border border-border hover:border-blue rounded-md pl-3.5 pr-8 py-2 text-[13px] text-navy font-semibold outline-none focus:border-blue focus:ring-2 focus:ring-[rgba(30,111,217,0.15)] transition-all cursor-pointer min-w-[120px]"
            >
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="REMOVED">Remove</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-navy-dim">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-[10px] shadow-[0_2px_8px_rgba(30,60,120,0.06)] overflow-x-auto overflow-y-auto max-h-[600px]">
        <table className="w-full border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-surface">
              <th className="px-4 py-[11px] text-left text-[10px] text-navy-light font-mono tracking-[1.4px] uppercase border-b-2 border-border">
                Name
              </th>
              <th className="px-4 py-[11px] text-left text-[10px] text-navy-light font-mono tracking-[1.4px] uppercase border-b-2 border-border">
                Email
              </th>
              <th className="px-4 py-[11px] text-left text-[10px] text-navy-light font-mono tracking-[1.4px] uppercase border-b-2 border-border">
                Role
              </th>
              <th className="px-4 py-[11px] text-left text-[10px] text-navy-light font-mono tracking-[1.4px] uppercase border-b-2 border-border">
                Status
              </th>
              <th className="px-4 py-[11px] text-left text-[10px] text-navy-light font-mono tracking-[1.4px] uppercase border-b-2 border-border">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-8 text-xs text-navy-dim"
                >
                  Loading users list...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-8 text-xs text-navy-dim"
                >
                  No users found
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="px-4 py-[11px] text-[13px] text-navy">
                    <div className="flex items-center gap-2">
                      <Avatar name={u.name} size={28} />
                      <span className="truncate max-w-[120px] sm:max-w-none">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-[11px] text-[13px] text-navy">
                    <span className="truncate max-w-[150px] sm:max-w-none block">{u.email}</span>
                  </td>
                  <td className="px-4 py-[11px]">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-[10px] font-mono ${
                        u.role === "admin"
                          ? "bg-gold-dim text-gold border border-[rgba(184,134,11,0.3)]"
                          : "bg-blue-dim text-blue border border-[rgba(30,111,217,0.3)]"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-[11px]">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-[10px] font-mono ${getStatusBadge(u.status || "PENDING")}`}
                    >
                      {u.status || "PENDING"}
                    </span>
                  </td>
                  <td className="px-4 py-[11px] relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuUserId(
                          activeMenuUserId === u.id ? null : u.id,
                        );
                      }}
                      className="p-1 hover:bg-surface rounded-md transition-colors text-navy-light cursor-pointer"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                        />
                      </svg>
                    </button>

                    {activeMenuUserId === u.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setActiveMenuUserId(null)}
                        ></div>
                        <div className="fixed sm:absolute right-4 left-4 sm:left-auto mt-1 w-auto sm:w-44 bg-white border border-border rounded-lg shadow-lg py-1.5 z-20 animate-slide-down">
                          {(
                            [
                              "PENDING",
                              "ACTIVE",
                              "INACTIVE",
                              "REMOVED",
                            ] as const
                          ).map((status) => (
                            <button
                              key={status}
                              disabled={
                                actionLoading[u.id] ||
                                (u.status || "PENDING").toUpperCase() ===
                                  status ||
                                u.id === currentUser?.id
                              }
                              onClick={() => {
                                handleStatusChange(u.id, status);
                                setActiveMenuUserId(null);
                              }}
                              className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-[#F8FAFF] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer
                                ${(u.status || "PENDING").toUpperCase() === status ? "text-gold font-semibold" : "text-navy"}
                              `}
                            >
                              {status === "REMOVED"
                                ? "Remove"
                                : status.charAt(0) +
                                  status.slice(1).toLowerCase()}
                            </button>
                          ))}
                          <div className="border-t border-surface my-1"></div>
                          <button
                            onClick={() => {
                              handleViewProfile(u);
                              setActiveMenuUserId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-blue hover:bg-[#F8FAFF] transition-colors font-semibold cursor-pointer"
                          >
                            View Profile
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalUsers > 0 && (
        <span className=" mt-4 text-blue rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
          {totalUsers} Total User
        </span>
      )}

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 bg-white border border-border rounded-[10px] p-4 shadow-[0_2px_8px_rgba(30,60,120,0.06)]">
          <button
            disabled={page === 1 || loading}
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            className="bg-transparent border border-border hover:border-blue text-[#1D2B4F] disabled:opacity-50 disabled:hover:border-border rounded-md px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors"
          >
            Previous
          </button>
          <span className="text-xs text-navy-light">
            Page {page} of {totalPages} ({totalUsers} total users)
          </span>
          <button
            disabled={page === totalPages || loading}
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            className="bg-transparent border border-border hover:border-blue text-[#1D2B4F] disabled:opacity-50 disabled:hover:border-border rounded-md px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors"
          >
            Next
          </button>
        </div>
      )}

      <Modal
        open={!!selectedProfileUser}
        onClose={() => setSelectedProfileUser(null)}
        title={
          <div className="font-serif text-[18px] font-semibold text-navy">
            User Profile
          </div>
        }
        size="sm"
      >
        {selectedProfileUser && (
          <div className="flex flex-col items-center py-4 text-center">
            {profileLoading ? (
              <div className="py-12 text-xs text-navy-dim font-mono">
                Loading detailed profile information...
              </div>
            ) : (
              <>
                <Avatar name={selectedProfileUser.name} size={64} />
                <h3 className="font-serif text-lg font-semibold text-navy mt-3">
                  {selectedProfileUser.name}
                </h3>
                <span
                  className={`inline-block rounded px-2.5 py-0.5 text-[10px] font-mono mt-1 ${
                    selectedProfileUser.role === "admin"
                      ? "bg-gold-dim text-gold border border-[rgba(184,134,11,0.3)]"
                      : "bg-blue-dim text-blue border border-[rgba(30,111,217,0.3)]"
                  }`}
                >
                  {selectedProfileUser.role}
                </span>

                <div className="w-full mt-6 space-y-4 border-t border-surface pt-4 text-left">
                  <div>
                    <div className="text-[10px] text-navy-light tracking-[1.5px] uppercase font-mono">
                      Email Address
                    </div>
                    <div className="text-[13px] text-navy font-semibold mt-0.5">
                      {selectedProfileUser.email}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-navy-light tracking-[1.5px] uppercase font-mono">
                      Phone Number
                    </div>
                    <div className="text-[13px] text-navy font-semibold mt-0.5">
                      {selectedProfileUser.phone || "Not Provided"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-navy-light tracking-[1.5px] uppercase font-mono">
                      Display Email
                    </div>
                    <div className="text-[13px] text-navy font-semibold mt-0.5">
                      {selectedProfileUser.profileEmail || "Not Provided"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-navy-light tracking-[1.5px] uppercase font-mono">
                      Account Status
                    </div>
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-[10px] font-mono mt-1.5 ${getStatusBadge(selectedProfileUser.status || "PENDING")}`}
                    >
                      {selectedProfileUser.status || "PENDING"}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
