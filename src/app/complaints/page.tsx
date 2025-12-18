"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  Clock,
  Tag,
  User,
  Ticket,
  Hash,
  ChevronDown,
  Filter,
  Paperclip,
} from "lucide-react";
import Image from "next/image";
type ComplaintStatus = "open" | "in progress" | "resolved" | "closed";
type ComplaintPriority = "low" | "medium" | "high";
interface assignee {
  name: string;
  email: string;
}
interface user {
  email: string;
  name: string;
}
interface ComplaintPageProps {
  userId: user;
  ticketId: string;
  category: string;
  invoice: string;
  serialnumber: string;
  description: string;
  images?: string[];
  status: ComplaintStatus;
  priority?: ComplaintPriority;
  assignee?: assignee[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

const STATUS_OPTIONS: ComplaintStatus[] = [
  "open",
  "in progress",
  "resolved",
  "closed",
];
const PRIORITY_OPTIONS: ComplaintPriority[] = ["low", "medium", "high"];

const getStatusColor = (status: ComplaintStatus) => {
  switch (status) {
    case "open":
      return "bg-blue-100 text-blue-800 border-blue-300";
    case "in progress":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "resolved":
      return "bg-green-100 text-green-800 border-green-300";
    case "closed":
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
};

const getPriorityColor = (priority: ComplaintPriority) => {
  switch (priority) {
    case "high":
      return "text-red-700 bg-red-100 border-red-300";
    case "medium":
      return "text-orange-700 bg-orange-100 border-orange-300";
    case "low":
      return "text-lime-700 bg-lime-100 border-lime-300";
  }
};

const formatDate = (date: string | Date) => {
  if (!date) return "N/A";
  try {
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return String(date);
  }
};

interface SelectDropdownProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
  colorClasses: string;
  placeholder?: string;
}

const SelectDropdown: React.FC<SelectDropdownProps> = ({
  value,
  onChange,
  options,
  colorClasses,
  placeholder,
}) => (
  <div className={`relative rounded-lg border ${colorClasses}`}>
    <select
      value={value}
      onChange={onChange}
      className={`appearance-none bg-transparent w-full py-1.5 px-3 text-base font-medium focus:outline-none cursor-pointer ${colorClasses} rounded-lg`}
    >
      {placeholder && (
        <option value="" disabled={value !== ""}>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt} value={opt} className="bg-white text-gray-900">
          {opt.toUpperCase()}
        </option>
      ))}
    </select>
    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
  </div>
);

interface ComplaintCardProps {
  complaint: ComplaintPageProps;
  onUpdate: (
    ticketId: string,
    field: "status" | "priority" | "assigneeEmail",
    value: string,
    currentAssigneeEmail?: string,
    assigneeName?: string
  ) => void;
}

const ComplaintCard: React.FC<ComplaintCardProps> = ({
  complaint,
  onUpdate,
}) => {
  const {
    ticketId,
    category,
    description,
    status,
    priority = "low",
    createdAt,
    updatedAt,
    assignee = [],
    invoice,
    serialnumber,
  } = complaint;

  const currentAssigneeEmail = assignee[0]?.email || "";
  const currentAssigneeName = assignee[0]?.name || "";

  const [assigneeEmail, setAssigneeEmail] = useState(currentAssigneeEmail);
  const [assigneeName, setAssigneeName] = useState(currentAssigneeName);

  useEffect(() => {
    setAssigneeEmail(currentAssigneeEmail);
    setAssigneeName(currentAssigneeName);
  }, [currentAssigneeEmail, currentAssigneeName]);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate(
      ticketId,
      "status",
      e.target.value as ComplaintStatus,
      currentAssigneeEmail
    );
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate(
      ticketId,
      "priority",
      e.target.value as ComplaintPriority,
      currentAssigneeEmail
    );
  };

  const handleAssigneeSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const isEmailValid = assigneeEmail && assigneeEmail.includes("@");
    const isNameProvided = assigneeName.trim() !== "";
    if (isEmailValid && isNameProvided) {
      onUpdate(
        ticketId,
        "assigneeEmail",
        assigneeEmail,
        currentAssigneeEmail,
        assigneeName
      );
    } else if (!isEmailValid) {
      toast.error("Please enter a valid email address.");
    } else if (!isNameProvided) {
      toast.error("Please enter the assignee's name.");
    }
  };
  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 border border-gray-100 flex flex-col h-full">
      <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 flex items-center">
          <Ticket className="w-5 h-5 mr-2 text-indigo-600" />
          {ticketId}
        </h3>
        <button className="text-sm text-indigo-600 font-medium hover:text-indigo-800">
          View Details
        </button>
      </div>
      <div>
        <h4 className="text-lg text-gray-800 mb-2 flex items-center underline underline-offset-4">
          <User className="w-5 h-5 mr-2 text-green-600" />
          Customer: {complaint.userId.name} ({complaint.userId.email})
        </h4>
      </div>

      <div className="flex flex-col sm:flex-row sm:space-x-4 mb-4 space-y-4 sm:space-y-0 sm:w-120">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-600 mb-1">Status</p>
          <SelectDropdown
            value={status}
            onChange={handleStatusChange}
            options={STATUS_OPTIONS}
            colorClasses={getStatusColor(status)}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-600 mb-1">Priority</p>
          <SelectDropdown
            value={priority}
            onChange={handlePriorityChange}
            options={PRIORITY_OPTIONS}
            colorClasses={getPriorityColor(priority)}
          />
        </div>
      </div>

      <form
        onSubmit={handleAssigneeSubmit}
        className="mb-4 pt-3 border-t border-gray-100"
      >
        <p className="text-sm font-semibold text-gray-600 mb-1 flex items-center">
          <User className="w-4 h-4 mr-1 text-green-600" />
          Assignee Details
        </p>
        <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:space-x-2">
          <input
            type="text"
            value={assigneeName}
            onChange={(e) => setAssigneeName(e.target.value)}
            placeholder="Assignee Name"
            className="w-full p-2 border font-black border-gray-300 rounded-lg text-base focus:ring-green-500 focus:border-green-500 sm:w-60 placeholder-gray-400"
          />

          <input
            type="email"
            value={assigneeEmail}
            onChange={(e) => setAssigneeEmail(e.target.value)}
            placeholder="Assignee Email"
            className="flex-1 p-2 border font-black border-gray-300 rounded-lg text-base focus:ring-green-500 focus:border-green-500 max-w-60 placeholder-gray-400"
          />
          <button
            type="submit"
            className="flex-shrink-0 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition duration-150"
            title="Update Assignee"
          >
            Update Assignee
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-base text-gray-700 flex-grow pt-3 border-t border-gray-100">
        <div className="flex items-center">
          <Tag className="w-5 h-5 mr-3 text-teal-600" />
          <span className="font-semibold text-gray-800">Category:</span>{" "}
          <span className="ml-2">{category}</span>
        </div>

        <div className="flex items-center">
          <User className="w-5 h-5 mr-3 text-green-600" />
          <span className="font-semibold text-gray-800">Current Assignee:</span>
          {assignee.length > 0 ? (
            <>
              <span className="ml-2  max-w-[150px]">{assignee[0].name}</span>
              <span className="ml-2  max-w-[150px]">{assignee[0].email}</span>
            </>
          ) : (
            <span className="ml-2 italic text-gray-500">Not Assigneed</span>
          )}
        </div>

        <div className="flex items-center">
          <Clock className="w-5 h-5 mr-3 text-indigo-600" />
          <span className="font-semibold text-gray-800">Created:</span>{" "}
          <span className="ml-2">{formatDate(createdAt)}</span>
        </div>

        <div className="flex items-center">
          <Clock className="w-5 h-5 mr-3 text-orange-600" />
          <span className="font-semibold text-gray-800">Updated:</span>{" "}
          <span className="ml-2">{formatDate(updatedAt)}</span>
        </div>

        {invoice && invoice.trim() !== "" && (
          <div className="flex items-center sm:col-span-2">
            <Paperclip className="w-5 h-5 mr-3 text-blue-600" />
            <span className="font-semibold text-gray-800">Invoice:</span>{" "}
            <span className="ml-2">{invoice}</span>
          </div>
        )}

        {serialnumber && serialnumber.trim() !== "" && (
          <div className="flex items-center sm:col-span-2">
            <Hash className="w-5 h-5 mr-3 text-blue-600" />
            <span className="font-semibold text-gray-800">
              Serial Number:
            </span>{" "}
            <span className="ml-2">{serialnumber}</span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="flex items-center text-md font-semibold text-gray-800 mb-2">
          Description
        </h4>
        <p className="text-gray-700 text-base italic line-clamp-2">
          {description}
        </p>
        {complaint.images && complaint.images.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {complaint.images.map((imgUrl, index) => (
              <div
                key={index}
                className="w-full h-32 relative rounded-lg overflow-hidden border border-gray-200"
              >
                <Image
                  src={imgUrl}
                  fill
                  alt={`Complaint Image ${index + 1}`}
                  objectFit="cover"
                  className="hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default function ComplaintPage() {
  const [complaints, setComplaints] = useState<ComplaintPageProps[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [serialNo, setserialNo] = useState<string>("");
  const [activeSearchSerial, setActiveSearchSerial] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<ComplaintStatus | "">("");
  const [filterPriority, setFilterPriority] = useState<ComplaintPriority | "">(
    ""
  );

  const updateComplaint = useCallback(
    (
      ticketId: string,
      field: "status" | "priority" | "assigneeEmail",
      value: string,
      currentAssigneeEmail?: string,
      assigneeName?: string
    ) => {
      setComplaints((prev) =>
        prev.map((c) => {
          if (c.ticketId !== ticketId) return c;

          if (field === "assigneeEmail") {
            const name = assigneeName || "No Name Provided...";
            const newAssignee: assignee[] = [{ name: name, email: value }];
            return { ...c, assignee: newAssignee, updatedAt: new Date() };
          }

          return { ...c, [field]: value, updatedAt: new Date() };
        })
      );

      const updateFeilds = async () => {
        try {
          const payload =
            field === "assigneeEmail"
              ? {
                  updateType: "assigneeUpdate",
                  ticketId,
                  field: "assignee",
                  value: { email: value, name: assigneeName },
                }
              : { updateType: "statusUpdate", ticketId, field, value };

          const res = await fetch("/api/complaints", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            setComplaints((prev) =>
              prev.map((c) =>
                c.ticketId !== ticketId
                  ? c
                  : {
                      ...c,
                      [field]:
                        field === "status" ? c.status : c.priority || "low",
                      assignee:
                        field === "assigneeEmail" ? c.assignee : c.assignee,
                    }
              )
            );
            throw new Error("Failed to update complaint");
          }

          const data = await res.json();

          if (data.updatedComplaint) {
            setComplaints((prev) =>
              prev.map((c) =>
                c.ticketId === ticketId ? data.updatedComplaint : c
              )
            );
          }

          toast.success(
            `${
              field === "assigneeEmail" ? "Assignee" : field
            } updated successfully!`
          );
        } catch (error) {
          console.error("Error updating complaint:", error);
          toast.error("Failed to update complaint. Reverting changes.");
        }
      };
      updateFeilds();
    },
    []
  );

  useEffect(() => {
    const fetchComplaints = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/complaints?query=getAllComplaints");
        if (!res.ok) {
          toast.error("Error fetching complaints");
          setLoading(false);
          return;
        }
        const data = await res.json();
        // console.log(data);
        setComplaints(data.complaints);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching complaints:", error);
        setLoading(false);
      }
    };
    fetchComplaints();
  }, []);

  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) => {
      const statusMatch =
        filterStatus === "" || complaint.status === filterStatus;
      const priorityMatch =
        filterPriority === "" || complaint.priority === filterPriority;
      const serialMatch =
        activeSearchSerial === "" ||
        (complaint.serialnumber &&
          complaint.serialnumber
            .toLowerCase()
            .includes(activeSearchSerial.toLowerCase()));
      return statusMatch && priorityMatch && serialMatch;
    });
  }, [complaints, filterStatus, filterPriority, activeSearchSerial]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-8">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-8 border-b pb-4">
        Customer Complaints Dashboard
      </h1>

      <div className="bg-white p-4 rounded-lg shadow-md mb-6 flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <Filter className="w-5 h-5 text-gray-500" />
          <span className="text-lg font-semibold text-gray-700">
            Filter By:
          </span>
        </div>

        <div className="flex-1 max-w-xs">
          <p className="text-sm font-medium text-gray-600 mb-1">Status</p>
          <SelectDropdown
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as ComplaintStatus | "")
            }
            options={["", ...STATUS_OPTIONS]}
            colorClasses="bg-gray-50 text-gray-900 border-gray-300"
            placeholder="All Statuses"
          />
        </div>

        <div className="flex-1 max-w-xs">
          <p className="text-sm font-medium text-gray-600 mb-1">Priority</p>
          <SelectDropdown
            value={filterPriority}
            onChange={(e) =>
              setFilterPriority(e.target.value as ComplaintPriority | "")
            }
            options={["", ...PRIORITY_OPTIONS]}
            colorClasses="bg-gray-50 text-gray-900 border-gray-300"
            placeholder="All Priorities"
          />
        </div>
      </div>
      <div className="flex-1 max-w-xs mb-2">
        <input
          type="text"
          value={serialNo}
          className="border-1 bg-gray-50 text-black border-gray-300 px-2 py-1 placeholder-gray-500"
          placeholder="Search by Serial No."
          onChange={(e) => setserialNo(e.target.value as string)}
        />
        <button
          className="cursor-pointer mx-2 bg-green-600 text-white p-2 rounded-lg text-sm font-large hover:bg-green-700 transition duration-150"
          onClick={() => {
            setActiveSearchSerial(serialNo);
          }}
        >
          Search
        </button>
        {activeSearchSerial && (
          <button
            onClick={() => {
              setserialNo("");
              setActiveSearchSerial("");
            }}
            className="cursor-pointer ml-2 text-gray-500 hover:text-red-600 text-sm underline"
          >
            Clear
          </button>
        )}
      </div>

      {loading && (
        <p className="text-center text-lg text-indigo-600">
          Loading complaints...
        </p>
      )}

      {!loading && filteredComplaints.length === 0 && complaints.length > 0 && (
        <p className="text-center text-xl text-gray-600 p-8 border border-dashed rounded-lg bg-white">
          No complaints match the selected filters.
        </p>
      )}

      {!loading && complaints.length === 0 && (
        <p className="text-center text-gray-600">No complaints found.</p>
      )}

      <div className="grid grid-cols-1 gap-6">
        {filteredComplaints.map((complaint) => (
          <ComplaintCard
            key={complaint.ticketId}
            complaint={complaint}
            onUpdate={updateComplaint}
          />
        ))}
      </div>
    </div>
  );
}
