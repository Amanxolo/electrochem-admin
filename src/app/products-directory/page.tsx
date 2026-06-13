"use client";
import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";

interface IProducts {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}
type stockMap = Record<string, number>;
export default function UsersAdminPage() {
  const { data: products, isLoading } = trpc.product.getAll.useQuery();
  const { mutate: updateProduct } = trpc.product.updateProduct.useMutation();
  const [productsData, setProductsData] = useState<IProducts[]>([]);
  const [productStock, setProductStock] = useState<stockMap>({});
  const [updatingStock, setUpdatingStock] = useState<boolean>(false);
  const utils = trpc.useUtils();
  useEffect(() => {
    if (products && !isLoading) {
      const formattedProducts = products.map((product) => ({
        id: String(product._id),
        name: product.productName,
        category: product.productCategory,
        price: product.price,
        stock: product.stock ?? 0,
      }));
      setProductsData(formattedProducts);
      const stockData: stockMap = {};
      formattedProducts.forEach((prod) => {
        stockData[prod.id] = prod.stock || 0;
      });
      setProductStock(stockData);
    }
  }, [products, isLoading]);

  const exportToExcel = () => {
    if (productsData.length === 0) return toast.error("No data to export");
    const worksheetData = productsData.map((prod) => ({
      "Product Name": prod.name || "—",
      Category: prod.category,
      Price: prod.price,
      Stock: prod.stock,
    }));
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    const wscols = [
      { wch: 40 },
      { wch: 20 }, 
      { wch: 15 },
      { wch: 15 }, 
    ];
    worksheet["!cols"] = wscols;
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(
      workbook,
      `Products_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
    toast.success("Excel file downloaded");
  };

  const getProductStockStatus = (stock: number) => {
    return stock > 10;
  };

  const handleUpdateStock = (
    productId: string,
    productName: string,
    newStock: number,
  ) => {
    if (newStock < 0) return toast.error("Stock cannot be negative");
    try {
      const res = confirm(
        `This will update the stock of ${productName} in the database to ${newStock}. Do you want to proceed?`,
      );
      if (res) {
        setUpdatingStock(true);
        updateProduct(
          {
            id: productId,
            updates: {
              stock: newStock,
            },
          },
          {
            onSuccess: () => {
              utils.product.getAll.invalidate();
              toast.success("Product updated");
              setUpdatingStock(false);
            },
            onError: (err: unknown) => {
              console.error("TRPC update error:", err);
              let errorMessage = `Unexpected Error ${err}`;
              if (err instanceof Error) {
                errorMessage = err.message;
              }
              toast.error(errorMessage || "Could not update product");
              setUpdatingStock(false);
            },
          },
        );
      }
    } catch (err) {
      toast.error("Error updating stock");
    }finally{
      setUpdatingStock(false);
    }
  };
  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Product Directory
            </h1>
            <p className="text-slate-500 text-sm md:text-base">
              Managing {productsData.length} products in your inventory.
            </p>
          </div>

          <button
            onClick={exportToExcel}
            disabled={isLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition-all disabled:opacity-50"
          >
            <Download size={18} />
            <span className="whitespace-nowrap">Export Excel</span>
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-slate-200">
            <Loader2 className="animate-spin text-green-600 mb-2" size={32} />
            <p className="text-slate-500 font-medium">
              Loading Product data...
            </p>
          </div>
        ) : (
          <>
            <div>
              <div className="block lg:hidden space-y-4">
                {productsData.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm active:bg-slate-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-slate-800">
                          {product.name}
                        </h3>
                        <p className="text-xs text-slate-400 uppercase tracking-wider">
                          {product.category ?? "—"}
                        </p>
                      </div>
                      <span className="font-semibold text-slate-600">
                        {product.price}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
                      <span className="text-sm text-slate-500">
                        Stock Status:
                      </span>
                      <input
                        className={`text-sm py-2 w-24 px-2 focus:ring-2 ${
                          getProductStockStatus(product.stock)
                            ? "text-green-600"
                            : "text-red-600 font-semibold"
                        }`}
                        type="number"
                        value={
                          Number.isNaN(productStock[product.id])
                            ? ""
                            : (productStock[product.id] ?? "")
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          const parsedVal = val === "" ? "" : parseInt(val, 10);
                          setProductStock((prev) => ({
                            ...prev,
                            [product.id]: parsedVal === "" ? 0 : parsedVal,
                          }));
                        }}
                      />
                      <button
                        onClick={() =>
                          handleUpdateStock(
                            product.id,
                            product.name,
                            productStock[product.id],
                          )
                        }
                        disabled={updatingStock}
                        className="bg-transparent cursor-pointer  text-green-800 p-2 rounded-2xl
                        disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Price(₹)
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Stock Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {productsData.map((product) => (
                      <tr
                        key={product.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          {product.name}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          {product.category ?? "—"}
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-sm">
                          ₹ {product.price}
                        </td>
                        <td >
                          <input
                            className={`text-sm py-2 w-24 px-2 focus:ring-2 ${
                              getProductStockStatus(product.stock)
                                ? "text-green-600"
                                : "text-red-600 font-semibold"
                            }`}
                            type="number"
                            value={
                              Number.isNaN(productStock[product.id])
                                ? ""
                                : (productStock[product.id] ?? "")
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              const parsedVal =
                                val === "" ? "" : parseInt(val, 10);
                              setProductStock((prev) => ({
                                ...prev,
                                [product.id]: parsedVal === "" ? 0 : parsedVal,
                              }));
                            }}
                          />
                          <button
                            onClick={() =>
                              handleUpdateStock(
                                product.id,
                                product.name,
                                productStock[product.id],
                              )
                            }
                            disabled={updatingStock}
                            className="bg-transparent cursor-pointer  text-green-800 p-2 rounded-2xl
                            disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Update
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
