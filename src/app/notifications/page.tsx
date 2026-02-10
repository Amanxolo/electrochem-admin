"use client";

import { useEffect, useState } from "react";
import { Mail, Clock, ChevronRight } from "lucide-react";
interface INotification{
    _id:string
    userEmail:string,
    createdAt:string

}

export default function BulkInquiriesPage() {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notification")
      .then((res) => res.json())
      .then((data) => {
        setNotifications(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Simple Header */}
      <header className="border-b border-slate-100 px-8 py-6">
        <h1 className="text-xl font-semibold tracking-tight">Bulk Inquiries</h1>
        <p className="text-sm text-slate-500">
          Manage high-value order requests
        </p>
      </header>

      <main className="max-w-4xl px-8 py-10">
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <p className="py-10 text-slate-400 italic">No inquiries found.</p>
            ) : (
              notifications.map((note) => (
                <div className="flex items-start gap-4" key={note._id}>
                  <div className="mt-1">
                    <Mail className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">
                      {note.userEmail}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(note.createdAt).toLocaleDateString("en-IN")}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(note.createdAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
