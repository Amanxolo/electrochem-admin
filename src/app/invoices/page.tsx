"use client";
import { useState } from "react";
import { UploadCloud, X, FileText, Search } from "lucide-react";
import pdfToText from "react-pdftotext";
import { toast } from "sonner";
import { invoiceProps } from "../../../models/invoice";

const InvoicePopup = () => {
  const [file, setFile] = useState<File | null>(null);
  const [billNumber, setBillNumber] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [serialNumbers, setSerialNumbers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [savingData, setSavingData] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [searchResult, setSearchResult] = useState<invoiceProps | null>(null);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
    setSerialNumbers([]);
    setBillNumber("");
    setDate("");
  };

  const handleExtract = () => {
    if (file) {
      console.log("Extracting details from file:", file.name);
      pdfToText(file)
        .then((text) => {
          const regexForInvoice =
            /(?<=Billed to\s*)([A-Z0-9]+(?:\s*-\s*[A-Z0-9]+)?\/\d+\s*-\s*\d+\/\d+)\s+(\d{2}\/\d{2}\/\d{4})/;

          console.log("Extracted Text:", text);
          const billMatch = text.match(regexForInvoice);
          const billNumberAndDate = billMatch ? billMatch[0] : "Not Found";
          const [billNumber, date] = billNumberAndDate.split("  ");
          console.log("Bill Number:", billNumber);
          console.log("Date:", date);
          setBillNumber(billNumber.trim());
          setDate(date.trim());
          const serialRegex =
            /Item\/Description[\s\S]*?S\.?\s*No\.?\s*([A-Z0-9\-]+)/gi;

          const serialMatches = [...text.matchAll(serialRegex)];
          const extractedSerials: string[] = [];
          serialMatches.forEach((mat) => {
            const rawData = mat[1].trim();
            if (!rawData.includes("&")) {
              extractedSerials.push(rawData);
              return;
            }
            const [basePart, numbersPart] = rawData.split(" - ");
            const base = basePart.trim();

            const numbers = numbersPart.split("&").map((num) => num.trim());
            numbers.forEach((num) => {
              const trimmedNum = num.trim();
              extractedSerials.push(`${base} - ${trimmedNum}`);
            });
          });

          console.log("All Serial Numbers:", extractedSerials);
          setSerialNumbers(extractedSerials);
        })
        .catch((error) => {
          console.error("Error extracting text from PDF:", error);
          setSerialNumbers([]);
        });
    }
  };

  const saveDetails = async () => {
    try {
      if (billNumber.trim() === "" && serialNumbers.length === 0) {
        toast.error("No Data Exracted from PDF");
        return;
      }
      setSavingData(true);
      const payloads: invoiceProps = { billNumber, serialNumbers, date };

      const res = await fetch("api/saveInvoiceDetails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payloads),
      });

      if (!res.ok) {
        toast.error("Unable to store data.Please try Again.");
        return;
      }
      const data = await res.json();
      console.log(data);
      toast.success("Data Saved Successfully.");
      setBillNumber("");
      setSerialNumbers([]);
      setDate("");
    } catch (error) {
      toast.error("Error Occured while Saving Data");
      console.log(error);
    } finally {
      setSavingData(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value.trim());
    console.log("Search Query:", e.target.value);
  };

  const handleSearch = async () => {
    // console.log(selectedOption);
    if (searchQuery.trim() === "" || selectedOption.trim() === "") {
      toast.error("Please provide valid search inputs.");
      return;
    }
    try {
      const res = await fetch(
        `api/saveInvoiceDetails?type=${selectedOption}&invoiceNo=${
          selectedOption === "invoice" ? searchQuery : ""
        }&serialNo=${selectedOption === "serialNo" ? searchQuery : ""}`,
        {
          method: "GET",
        }
      );
      if (!res.ok) {
        toast.error("Failed to Fetch Data.");
        return;
      }
      const data = await res.json();
      console.log("Search Data:", data);
      setSearchResult(
        data.dataForInvoiceNumber || data.dataForSerialNumber || null
      );
      if (!data.dataForInvoiceNumber && !data.dataForSerialNumber) {
        toast.error("No Data Found.");
        return;
      }
      toast.success("Data Fetched Successfully.");
    } catch (error) {
      toast.error("Failed to Search Data.");
    }
  };

  const clearFile = () => {
    setFile(null);
    setSerialNumbers([]);
    setBillNumber("");
    setDate("");
  };
  const isDataAvailable = serialNumbers.length > 0 && billNumber.trim() !== "";
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg transition-all duration-300">
        <div
          className={`mt-1 flex justify-center px-6 pt-8 pb-8 border-2 ${
            file ? "border-green-400" : "border-gray-300"
          } border-dashed rounded-lg hover:border-green-500 transition-colors duration-200 cursor-pointer`}
          onClick={() => document.getElementById("invoice-file-input")?.click()}
        >
          <div className="space-y-3 text-center">
            <UploadCloud className="w-10 h-10 mx-auto text-gray-400" />

            <div className="flex text-sm text-gray-600 justify-center">
              <label
                htmlFor="invoice-file-input"
                className="relative cursor-pointer rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500"
              >
                <span>Click to upload</span>
                <input
                  id="invoice-file-input"
                  name="invoice-file-input"
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">PDF (max 10MB)</p>
          </div>
        </div>

        {file && (
          <div className="mt-4 flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center text-sm font-medium text-green-700 truncate">
              <FileText className="w-5 h-5 mr-2 flex-shrink-0" />
              <span>Selected File: {file.name}</span>
            </div>
            <button
              onClick={clearFile}
              className="text-green-500 hover:text-green-700 p-1 rounded-full hover:bg-green-100 transition"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={handleExtract}
            disabled={!file}
            className={`w-full py-3 rounded-lg text-lg font-semibold transition-colors duration-200 cursor-pointer ${
              file
                ? "bg-green-600 text-white hover:bg-green-700 shadow-md"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Extract Details
          </button>
        </div>
        <div className="mt-6">
          {billNumber.trim() !== "" && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">
                Extracted Bill Number:
              </h3>
              <p className="text-blue-700">{billNumber}</p>
            </div>
          )}
          {date.trim() !== "" && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                Extracted Date:
              </h3>
              <span className="text-green-700">{date}</span>
            </div>
          )}
          {serialNumbers.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg max-h-40 overflow-y-auto">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                Extracted Serial Numbers:
              </h3>
              <ul className="list-disc list-inside text-yellow-700">
                {serialNumbers.map((sn, index) => (
                  <li key={index}>{sn}</li>
                ))}
              </ul>
            </div>
          )}

          {isDataAvailable && (
            <button
              disabled={!isDataAvailable}
              className={`mt-6 w-full py-3 rounded-lg text-lg font-semibold transition-colors 
                duration-200 cursor-pointer bg-green-600 text-white hover:bg-green-700 shadow-md
                ${savingData ? "opacity-50 cursor-not-allowed" : ""}
                `}
              onClick={saveDetails}
            >
              {savingData ? `Saving Data ` : "Save Data"}
            </button>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
            <Search className="w-5 h-5 mr-2 text-blue-600" />
            S.NO./Invoice Lookup
          </h3>

          <form>
            <fieldset>
              <div className="text-black flex gap-2 mb-4">
                <input
                  type="radio"
                  id="invoice"
                  name="selector"
                  value="invoice"
                  onChange={(e) => {
                    console.log(e.target.value);
                    setSelectedOption(e.target.value);
                  }}
                />
                <label htmlFor="invoice">Invoice No.</label>
                <input
                  type="radio"
                  id="Serial"
                  name="selector"
                  value="serialNo"
                  onChange={(e) => {
                    console.log(e.target.value);
                    setSelectedOption(e.target.value);
                  }}
                />
                <label htmlFor="serial">Serial No.</label>
              </div>
            </fieldset>
          </form>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Enter S.No/Invoice No."
            className="w-full p-3 border border-gray-300 rounded-lg text-black focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
          <div className="mt-6">
            <button
              onClick={handleSearch}
              className="w-full py-3 rounded-lg text-lg font-semibold transition-colors duration-200 cursor-pointer bg-green-600"
            >
              Search
            </button>
          </div>
        </div>
        {searchResult && (
          <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-800 mb-2">
              Search Result:
            </h3>
            <p className="text-purple-700">
              <span className="font-semibold">Bill Number:</span>{" "}
              {searchResult.billNumber}
            </p>
            <p className="text-purple-700">
              <span className="font-semibold">Date of Bill:</span>{" "}
              {searchResult.date}
            </p>
            <div className="mt-2">
              <span className="font-semibold text-purple-800">
                Serial Numbers:
              </span>
              <ul className="list-disc list-inside text-purple-700 mt-1">
                {searchResult.serialNumbers.map((sn, index) => (
                  <li key={index}>{sn}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function InvoicePage() {
  return (
    <>
      <InvoicePopup />
    </>
  );
}
