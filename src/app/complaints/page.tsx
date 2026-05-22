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
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";
import { useUserhook } from "@/contexts/userContext";

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
  serviceReport?: ServiceReport;
}

interface ServiceReportUpdatedBy {
  name: string;
  email: string;
}

interface ServiceReport {
  natureOfProblem: string;
  solutionImplemented: string;
  furtherInterventionRequired: boolean;
  interventionDetails?: string;
  escalationRequired: boolean;
  escalationDetails?: string;
  finalResolutionSummary: string;
  serviceDate: string | Date;
  updatedBy: ServiceReportUpdatedBy;
  customerSatisfied?: boolean;
  customerRemarks?: string;
}

interface ServiceReportFormState {
  natureOfProblem: string;
  solutionImplemented: string;
  furtherInterventionRequired: boolean;
  interventionDetails: string;
  escalationRequired: boolean;
  escalationDetails: string;
  finalResolutionSummary: string;
  serviceDate: string;
  customerSatisfied?: boolean;
  customerRemarks: string;
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

// ── Labelled field helpers ──────────────────────────────────────────────────

/** Wraps a textarea with a visible label and optional required star */
function LabeledTextarea({
  label,
  required,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 resize-y bg-white text-gray-900"
        required={required}
      />
    </div>
  );
}

/** Wraps a native input with a visible label */
function LabeledInput({
  label,
  required,
  type = "text",
  value,
  onChange,
  placeholder,
}: {
  label: string;
  required?: boolean;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 bg-white text-gray-900"
        required={required}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────

interface ComplaintCardProps {
  complaint: ComplaintPageProps;
  adminUser: ServiceReportUpdatedBy;
  onUpdate: (
    ticketId: string,
    field: "status" | "priority" | "assigneeEmail",
    value: string,
    currentAssigneeEmail?: string,
    assigneeName?: string
  ) => void;
  onServiceReportSave: (
    ticketId: string,
    report: ServiceReport
  ) => Promise<void>;
}

const ComplaintCard: React.FC<ComplaintCardProps> = ({
  complaint,
  adminUser,
  onUpdate,
  onServiceReportSave,
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
  const [showServiceReportForm, setShowServiceReportForm] = useState(false);
  const [savingServiceReport, setSavingServiceReport] = useState(false);

  const [serviceReportForm, setServiceReportForm] =
    useState<ServiceReportFormState>({
      natureOfProblem: complaint.serviceReport?.natureOfProblem ?? "",
      solutionImplemented: complaint.serviceReport?.solutionImplemented ?? "",
      furtherInterventionRequired:
        complaint.serviceReport?.furtherInterventionRequired ?? false,
      interventionDetails: complaint.serviceReport?.interventionDetails ?? "",
      escalationRequired: complaint.serviceReport?.escalationRequired ?? false,
      escalationDetails: complaint.serviceReport?.escalationDetails ?? "",
      finalResolutionSummary:
        complaint.serviceReport?.finalResolutionSummary ?? "",
      serviceDate: complaint.serviceReport?.serviceDate
        ? new Date(complaint.serviceReport.serviceDate)
            .toISOString()
            .split("T")[0]
        : new Date().toISOString().split("T")[0],
      customerSatisfied: complaint.serviceReport?.customerSatisfied,
      customerRemarks: complaint.serviceReport?.customerRemarks ?? "",
    });

  useEffect(() => {
    setAssigneeEmail(currentAssigneeEmail);
    setAssigneeName(currentAssigneeName);
  }, [currentAssigneeEmail, currentAssigneeName]);

  useEffect(() => {
    setServiceReportForm({
      natureOfProblem: complaint.serviceReport?.natureOfProblem ?? "",
      solutionImplemented: complaint.serviceReport?.solutionImplemented ?? "",
      furtherInterventionRequired:
        complaint.serviceReport?.furtherInterventionRequired ?? false,
      interventionDetails: complaint.serviceReport?.interventionDetails ?? "",
      escalationRequired: complaint.serviceReport?.escalationRequired ?? false,
      escalationDetails: complaint.serviceReport?.escalationDetails ?? "",
      finalResolutionSummary:
        complaint.serviceReport?.finalResolutionSummary ?? "",
      serviceDate: complaint.serviceReport?.serviceDate
        ? new Date(complaint.serviceReport.serviceDate)
            .toISOString()
            .split("T")[0]
        : new Date().toISOString().split("T")[0],
      customerSatisfied: complaint.serviceReport?.customerSatisfied,
      customerRemarks: complaint.serviceReport?.customerRemarks ?? "",
    });
  }, [complaint.serviceReport]);

  const handleServiceReportField = <K extends keyof ServiceReportFormState>(
    key: K,
    value: ServiceReportFormState[K]
  ) => {
    setServiceReportForm((prev) => ({ ...prev, [key]: value }));
  };

  const submitServiceReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !serviceReportForm.natureOfProblem.trim() ||
      !serviceReportForm.solutionImplemented.trim() ||
      !serviceReportForm.finalResolutionSummary.trim() ||
      !serviceReportForm.serviceDate
    ) {
      toast.error("Please fill all required Service Report fields.");
      return;
    }
    if (
      serviceReportForm.furtherInterventionRequired &&
      !serviceReportForm.interventionDetails.trim()
    ) {
      toast.error("Intervention details are required when further intervention is checked.");
      return;
    }
    if (
      serviceReportForm.escalationRequired &&
      !serviceReportForm.escalationDetails.trim()
    ) {
      toast.error("Escalation details are required when escalation is checked.");
      return;
    }
    setSavingServiceReport(true);
    try {
      await onServiceReportSave(ticketId, {
        ...serviceReportForm,
        serviceDate: serviceReportForm.serviceDate,
        updatedBy: adminUser,
      });
      setShowServiceReportForm(false);
    } finally {
      setSavingServiceReport(false);
    }
  };

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

  const hasServiceReport = Boolean(complaint.serviceReport?.natureOfProblem);

  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 border border-gray-100 flex flex-col">
      {/* ── Header ── */}
      <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Ticket className="w-5 h-5 text-indigo-600" />
          {ticketId}
        </h3>
        {/* Service report filed indicator */}
        {hasServiceReport ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full border border-green-200">
            <CheckCircle className="w-3.5 h-3.5" />
            Report Filed
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded-full border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5" />
            Pending Report
          </span>
        )}
      </div>

      {/* ── Customer ── */}
      <div className="mb-4">
        <h4 className="text-base text-gray-800 flex items-center gap-2 underline underline-offset-4">
          <User className="w-5 h-5 text-green-600" />
          Customer: {complaint.userId.name} ({complaint.userId.email})
        </h4>
      </div>

      {/* ── Status & Priority ── */}
      <div className="flex flex-col sm:flex-row sm:space-x-4 mb-4 space-y-4 sm:space-y-0">
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

      {/* ── Assignee ── */}
      <form
        onSubmit={handleAssigneeSubmit}
        className="mb-4 pt-3 border-t border-gray-100"
      >
        <p className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-1">
          <User className="w-4 h-4 text-green-600" />
          Assignee Details
        </p>
        <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:space-x-2">
          <input
            type="text"
            value={assigneeName}
            onChange={(e) => setAssigneeName(e.target.value)}
            placeholder="Assignee Name"
            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-green-500 focus:border-green-500 sm:w-56 placeholder-gray-400"
          />
          <input
            type="email"
            value={assigneeEmail}
            onChange={(e) => setAssigneeEmail(e.target.value)}
            placeholder="Assignee Email"
            className="flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-green-500 focus:border-green-500 max-w-60 placeholder-gray-400"
          />
          <button
            type="submit"
            className="flex-shrink-0 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition duration-150"
          >
            Update Assignee
          </button>
        </div>
      </form>

      {/* ── Meta grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm text-gray-700 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-teal-600 flex-shrink-0" />
          <span className="font-semibold text-gray-800">Category:</span>
          <span>{category}</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span className="font-semibold text-gray-800">Current Assignee:</span>
          {assignee.length > 0 ? (
            <span>{assignee[0].name} ({assignee[0].email})</span>
          ) : (
            <span className="italic text-gray-500">Not Assigned</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          <span className="font-semibold text-gray-800">Created:</span>
          <span>{formatDate(createdAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-600 flex-shrink-0" />
          <span className="font-semibold text-gray-800">Updated:</span>
          <span>{formatDate(updatedAt)}</span>
        </div>
        {invoice && invoice.trim() !== "" && (
          <div className="flex items-center gap-2 sm:col-span-2">
            <Paperclip className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="font-semibold text-gray-800">Invoice:</span>
            <span>{invoice}</span>
          </div>
        )}
        {serialnumber && serialnumber.trim() !== "" && (
          <div className="flex items-center gap-2 sm:col-span-2">
            <Hash className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="font-semibold text-gray-800">Serial Number:</span>
            <span>{serialnumber}</span>
          </div>
        )}
      </div>

      {/* ── Service Report Section ── */}
      <div className="mt-5 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-base font-semibold text-gray-800">
            Service Report
          </h4>
          <button
            type="button"
            onClick={() => setShowServiceReportForm((prev) => !prev)}
            className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            {hasServiceReport
              ? showServiceReportForm
                ? "Cancel Edit"
                : "Edit Report"
              : showServiceReportForm
              ? "Cancel"
              : "Add Service Report"}
          </button>
        </div>

        {/* ── Read-only view ── */}
        {hasServiceReport && !showServiceReportForm && (
          <div className="rounded-lg border border-gray-200 p-4 bg-gray-50 space-y-3 text-sm">
            <div>
              <p className="font-semibold text-gray-700 mb-0.5">Nature of Problem</p>
              <p className="text-gray-800 whitespace-pre-wrap">
                {complaint.serviceReport!.natureOfProblem || (
                  <span className="italic text-gray-400">Not provided</span>
                )}
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-700 mb-0.5">Solution Implemented</p>
              <p className="text-gray-800 whitespace-pre-wrap">
                {complaint.serviceReport!.solutionImplemented || (
                  <span className="italic text-gray-400">Not provided</span>
                )}
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-700 mb-0.5">Final Resolution Summary</p>
              <p className="text-gray-800 whitespace-pre-wrap">
                {complaint.serviceReport!.finalResolutionSummary || (
                  <span className="italic text-gray-400">Not provided</span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  complaint.serviceReport!.furtherInterventionRequired
                    ? "bg-amber-100 text-amber-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                Further Intervention:{" "}
                {complaint.serviceReport!.furtherInterventionRequired
                  ? "Yes"
                  : "No"}
              </span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  complaint.serviceReport!.escalationRequired
                    ? "bg-red-100 text-red-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                Escalation:{" "}
                {complaint.serviceReport!.escalationRequired ? "Yes" : "No"}
              </span>
              {typeof complaint.serviceReport!.customerSatisfied ===
                "boolean" && (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    complaint.serviceReport!.customerSatisfied
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  Customer Satisfied:{" "}
                  {complaint.serviceReport!.customerSatisfied ? "Yes" : "No"}
                </span>
              )}
            </div>

            {complaint.serviceReport!.furtherInterventionRequired &&
              complaint.serviceReport!.interventionDetails && (
                <div>
                  <p className="font-semibold text-gray-700 mb-0.5">
                    Intervention Details
                  </p>
                  <p className="text-gray-800 whitespace-pre-wrap">
                    {complaint.serviceReport!.interventionDetails}
                  </p>
                </div>
              )}
            {complaint.serviceReport!.escalationRequired &&
              complaint.serviceReport!.escalationDetails && (
                <div>
                  <p className="font-semibold text-gray-700 mb-0.5">
                    Escalation Details
                  </p>
                  <p className="text-gray-800 whitespace-pre-wrap">
                    {complaint.serviceReport!.escalationDetails}
                  </p>
                </div>
              )}
            {complaint.serviceReport!.customerRemarks && (
              <div>
                <p className="font-semibold text-gray-700 mb-0.5">
                  Customer Remarks
                </p>
                <p className="text-gray-800 whitespace-pre-wrap">
                  {complaint.serviceReport!.customerRemarks}
                </p>
              </div>
            )}

            <div className="pt-2 border-t border-gray-200 text-xs text-gray-500 flex flex-col sm:flex-row sm:gap-6 gap-1">
              <span>
                <span className="font-semibold text-gray-600">Service Date:</span>{" "}
                {formatDate(complaint.serviceReport!.serviceDate)}
              </span>
              <span>
                <span className="font-semibold text-gray-600">Updated By:</span>{" "}
                {complaint.serviceReport!.updatedBy?.name} (
                {complaint.serviceReport!.updatedBy?.email})
              </span>
            </div>
          </div>
        )}

        {/* ── Editable form ── */}
        {showServiceReportForm && (
          <form
            onSubmit={submitServiceReport}
            className="rounded-lg border border-indigo-200 bg-indigo-50 p-5 space-y-4"
          >
            <LabeledTextarea
              label="Nature of Problem"
              required
              value={serviceReportForm.natureOfProblem}
              onChange={(e) =>
                handleServiceReportField("natureOfProblem", e.target.value)
              }
              placeholder="Describe the diagnosed issue..."
              rows={3}
            />

            <LabeledTextarea
              label="Solution Implemented"
              required
              value={serviceReportForm.solutionImplemented}
              onChange={(e) =>
                handleServiceReportField("solutionImplemented", e.target.value)
              }
              placeholder="Describe what was done to resolve the issue..."
              rows={3}
            />

            <LabeledTextarea
              label="Final Resolution Summary"
              required
              value={serviceReportForm.finalResolutionSummary}
              onChange={(e) =>
                handleServiceReportField(
                  "finalResolutionSummary",
                  e.target.value
                )
              }
              placeholder="Summarise the final outcome..."
              rows={2}
            />

            {/* Further intervention */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={serviceReportForm.furtherInterventionRequired}
                  onChange={(e) =>
                    handleServiceReportField(
                      "furtherInterventionRequired",
                      e.target.checked
                    )
                  }
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Further Intervention Required
              </label>
              {serviceReportForm.furtherInterventionRequired && (
                <LabeledTextarea
                  label="Intervention Details"
                  required
                  value={serviceReportForm.interventionDetails}
                  onChange={(e) =>
                    handleServiceReportField(
                      "interventionDetails",
                      e.target.value
                    )
                  }
                  placeholder="Describe what further action is needed..."
                  rows={2}
                />
              )}
            </div>

            {/* Escalation */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={serviceReportForm.escalationRequired}
                  onChange={(e) =>
                    handleServiceReportField(
                      "escalationRequired",
                      e.target.checked
                    )
                  }
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Escalation Required
              </label>
              {serviceReportForm.escalationRequired && (
                <LabeledTextarea
                  label="Escalation Details"
                  required
                  value={serviceReportForm.escalationDetails}
                  onChange={(e) =>
                    handleServiceReportField(
                      "escalationDetails",
                      e.target.value
                    )
                  }
                  placeholder="Who is this being escalated to and why..."
                  rows={2}
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <LabeledInput
                label="Service Date"
                required
                type="date"
                value={serviceReportForm.serviceDate}
                onChange={(e) =>
                  handleServiceReportField("serviceDate", e.target.value)
                }
              />

              {/* FIX: correct boolean cast for customerSatisfied */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700">
                  Customer Satisfied
                </label>
                <select
                  value={
                    typeof serviceReportForm.customerSatisfied === "boolean"
                      ? serviceReportForm.customerSatisfied
                        ? "yes"
                        : "no"
                      : ""
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    handleServiceReportField(
                      "customerSatisfied",
                      val === "" ? undefined : val === "yes" // ← FIX: was `(val === "yes") as boolean`
                    );
                  }}
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 bg-white text-gray-900"
                >
                  <option value="">Pending / Not assessed</option>
                  <option value="yes">Yes — satisfied</option>
                  <option value="no">No — not satisfied</option>
                </select>
              </div>
            </div>

            <LabeledTextarea
              label="Customer Remarks"
              value={serviceReportForm.customerRemarks}
              onChange={(e) =>
                handleServiceReportField("customerRemarks", e.target.value)
              }
              placeholder="Any note about customer feedback or satisfaction..."
              rows={2}
            />

            <button
              type="submit"
              disabled={savingServiceReport}
              className="w-full sm:w-auto bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition"
            >
              {savingServiceReport ? "Saving..." : "Save Service Report"}
            </button>
          </form>
        )}
      </div>

      {/* ── Description ── */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-semibold text-gray-800 mb-1">
          Description
        </h4>
        <p className="text-gray-700 text-sm italic line-clamp-3">
          {description}
        </p>
        {complaint.images && complaint.images.length > 0 && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {complaint.images.map((imgUrl, index) => (
              <div
                key={index}
                className="w-full h-28 relative rounded-lg overflow-hidden border border-gray-200"
              >
                <Image
                  src={imgUrl}
                  fill
                  alt={`Complaint Image ${index + 1}`}
                  className="object-cover hover:scale-105 transition-transform duration-300"
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
  const { token } = useUserhook();
  const [complaints, setComplaints] = useState<ComplaintPageProps[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [serialNo, setserialNo] = useState<string>("");
  const [activeSearchSerial, setActiveSearchSerial] = useState<string>("");
  const [emailSearch, setEmailSearch] = useState<string>("");
  const [activeSearchEmail, setActiveSearchEmail] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<ComplaintStatus | "">("");
  const [filterPriority, setFilterPriority] = useState<
    ComplaintPriority | ""
  >("");

  /**
   * FIX: decode token to get the logged-in admin's actual email.
   * Name is still inferred from email (same logic), but this is
   * correct — the name saved to updatedBy will match the JWT email.
   */
  const adminUser = useMemo<ServiceReportUpdatedBy>(() => {
    let email = "admin@electrochem.local";
    if (token) {
      try {
        const base64Payload = token.split(".")[1];
        const payload = JSON.parse(atob(base64Payload));
        if (typeof payload?.email === "string" && payload.email) {
          email = payload.email;
        }
      } catch {
        // token parse fallback — use default
      }
    }
    const guessedName =
      email.split("@")[0]?.replace(/[._-]/g, " ") || "Admin";
    const normalizedName =
      guessedName.charAt(0).toUpperCase() + guessedName.slice(1);
    return { name: normalizedName, email };
  }, [token]);

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
            const name = assigneeName || "No Name Provided";
            return {
              ...c,
              assignee: [{ name, email: value }],
              updatedAt: new Date(),
            };
          }
          return { ...c, [field]: value, updatedAt: new Date() };
        })
      );

      const doUpdate = async () => {
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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.message || "Failed to update complaint");
          }

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
          toast.error("Failed to update complaint.");
          // Refetch to restore correct state
          const res = await fetch("/api/complaints?query=getAllComplaints");
          const data = await res.json();
          if (data.complaints) setComplaints(data.complaints);
        }
      };
      doUpdate();
    },
    []
  );

  const saveServiceReport = useCallback(
    async (ticketId: string, report: ServiceReport) => {
      const res = await fetch("/api/complaints", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updateType: "addServiceReport",
          ticketId,
          serviceReport: report,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to save service report");
        throw new Error(data.message || "Failed to save service report");
      }
      setComplaints((prev) =>
        prev.map((c) =>
          c.ticketId === ticketId ? data.updatedComplaint : c
        )
      );
      toast.success("Service report saved successfully.");
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
          return;
        }
        const data = await res.json();
        setComplaints(data.complaints);
      } catch (error) {
        console.error("Error fetching complaints:", error);
        toast.error("Failed to load complaints.");
      } finally {
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
      const emailMatch =
        activeSearchEmail === "" ||
        (complaint.userId?.email &&
          complaint.userId.email
            .toLowerCase()
            .includes(activeSearchEmail.toLowerCase()));
      return statusMatch && priorityMatch && serialMatch && emailMatch;
    });
  }, [
    complaints,
    filterStatus,
    filterPriority,
    activeSearchSerial,
    activeSearchEmail,
  ]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-8">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-8 border-b pb-4">
        Customer Complaints Dashboard
      </h1>

      {/* ── Filters ── */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-4 flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <span className="text-base font-semibold text-gray-700">
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

      {/* ── Search ── */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={emailSearch}
            className="border bg-gray-50 text-black border-gray-300 px-3 py-1.5 rounded-lg text-sm placeholder-gray-400 focus:ring-2 focus:ring-green-400"
            placeholder="Search by user email..."
            onChange={(e) => setEmailSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setActiveSearchEmail(emailSearch)}
          />
          <button
            className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700 transition"
            onClick={() => setActiveSearchEmail(emailSearch)}
          >
            Search
          </button>
          {activeSearchEmail && (
            <button
              onClick={() => {
                setEmailSearch("");
                setActiveSearchEmail("");
              }}
              className="text-gray-500 hover:text-red-600 text-sm underline"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={serialNo}
            className="border bg-gray-50 text-black border-gray-300 px-3 py-1.5 rounded-lg text-sm placeholder-gray-400 focus:ring-2 focus:ring-green-400"
            placeholder="Search by serial number..."
            onChange={(e) => setserialNo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setActiveSearchSerial(serialNo)}
          />
          <button
            className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700 transition"
            onClick={() => setActiveSearchSerial(serialNo)}
          >
            Search
          </button>
          {activeSearchSerial && (
            <button
              onClick={() => {
                setserialNo("");
                setActiveSearchSerial("");
              }}
              className="text-gray-500 hover:text-red-600 text-sm underline"
            >
              Clear
            </button>
          )}
        </div>
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
            adminUser={adminUser}
            onUpdate={updateComplaint}
            onServiceReportSave={saveServiceReport}
          />
        ))}
      </div>
    </div>
  );
}