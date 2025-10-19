"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit3, Trash2, Package, Zap, Save, X } from "lucide-react"
import { trpc } from "@/utils/trpc"; // adjust based on your actual path
import Image from "next/image";
import { toast } from "sonner"; // sonner toasts

interface Product {
  id: string // Use string for MongoDB ObjectId or number for a simple ID
  name: string
  category: string
  price: number
  description: string
  stock: number
  image: string
  minQuantity: number
}

export default function AdminPanel() {
  const [animationStage, setAnimationStage] = useState(0)
  const { mutate: addProduct } = trpc.product.addProduct.useMutation();
  const { mutate: updateProduct } = trpc.product.updateProduct.useMutation();
  const { mutate: deleteProduct } = trpc.product.deleteProduct.useMutation();
  const { data: fetchedProducts } = trpc.product.getAll.useQuery();
  const utils = trpc.useUtils();

  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    console.log(fetchedProducts)
    if (fetchedProducts) {
      const transformed = fetchedProducts.map((prod) => ({
        id: String(prod._id), // or use prod._id if you want
        name: prod.productName,
        category: prod.productCategory,
        price: prod.price,
        description: prod.prodSpecs || "",
        stock: prod.stock,
        image: prod.image?.[0] || "/placeholder.svg?height=200&width=200",
        minQuantity: prod.minQuantity,
      }));
      setProducts(transformed);
    }
  }, [fetchedProducts]);

  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    price: "",
    description: "",
    stock: "",
    image: null as File | null,
  })

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // file change handler

  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // New state to support image upload in Update tab (mirrors Add tab)
  const [editingImageFile, setEditingImageFile] = useState<File | null>(null)
  const [editingPreviewUrl, setEditingPreviewUrl] = useState<string | null>(null)

  // Search states for update and delete tabs
  const [updateSearchQuery, setUpdateSearchQuery] = useState("")
  const [deleteSearchQuery, setDeleteSearchQuery] = useState("")

  // Filter products based on search queries
  const filteredProductsForUpdate = products.filter((product) =>
    product.name.toLowerCase().includes(updateSearchQuery.toLowerCase())
  )
  const filteredProductsForDelete = products.filter((product) =>
    product.name.toLowerCase().includes(deleteSearchQuery.toLowerCase())
  )


  useEffect(() => {
    const timers = [
      setTimeout(() => setAnimationStage(1), 800), // Curtain opens
      setTimeout(() => setAnimationStage(2), 2200), // ElectroChem appears from back
      setTimeout(() => setAnimationStage(3), 3800), // Text settles and glows
      setTimeout(() => setAnimationStage(4), 5200), // Content appears
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  const handleAddProduct = async () => {
    if (newProduct.name && newProduct.category && newProduct.price) {
      try {
        const formData = new FormData();
        if (newProduct.image) {
          formData.append("file", newProduct.image); // send file
        }
        formData.append("productName", newProduct.name);
        formData.append("productCategory", newProduct.category);
        formData.append("price", newProduct.price.toString());
        formData.append("prodSpecs", newProduct.description);
        formData.append("minQuantity", "1");
        formData.append("stock", (Number(newProduct.stock) || 0).toString());

        // send arrays as JSON strings
        formData.append("voltageRatings", JSON.stringify([]));
        formData.append("ahRatings", JSON.stringify([]));
        formData.append("subprodlst", JSON.stringify([]));

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          toast.error(data?.error || "Upload failed");
          throw new Error(data.error || "Upload failed");
        }

        

        toast.success("Product added and image uploaded");
        utils.product.getAll.invalidate(); // Refresh products list

        // reset state
        setNewProduct({
          name: "",
          category: "",
          price: "",
          description: "",
          stock: "",
          image: null,
        });
        setPreviewUrl(null);
      } catch (err: unknown) {
        console.error("Add product failed:", err);
        let errorMessage = `Unexpected Error ${err}`
        if (err instanceof Error) {
          errorMessage = err.message
        }
        toast.error(errorMessage)
      }
    }
  };

  // Updated to support optional image upload when updating a product
  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    try {
      // Default to current image
      let imageArray: string[] = [editingProduct.image];

      if (editingImageFile) {
        // Basic client-side validation
        if (!editingImageFile.type.startsWith("image/")) {
          toast.error("Please choose an image file.");
          return;
        }
        const MAX_BYTES = 8 * 1024 * 1024; // 8 MB, adjust if needed
        if (editingImageFile.size > MAX_BYTES) {
          toast.error("Image too large (max 8 MB).");
          return;
        }

        const fd = new FormData();
        fd.append("file", editingImageFile); // ensure backend expects 'file'
        fd.append("productId", editingProduct.id);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: fd,
        });

        // Try to parse JSON, otherwise fallback to text
        let uploadData: { product?: { image?: string | string[] }; image?: string | string[]; path?: string; error?: string; message?: string; raw?: string } | null = null;
        const ct = uploadRes.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          try { uploadData = await uploadRes.json(); }
          catch { uploadData = { raw: await uploadRes.text() }; }
        } else {
          uploadData = { raw: await uploadRes.text() };
        }

        // Always log the response details for debugging
        

        if (!uploadRes.ok) {
          // Show friendly toast with server-provided message if present
          const msg = uploadData?.error || uploadData?.message || uploadData?.raw || `Upload failed (${uploadRes.status})`;
          toast.error(String(msg));
          // throw to jump to catch where we log too
          throw new Error(msg);
        }

        // --- replace the existing extraction with this ---
        let uploadedPath: string | null = null;

        // product.image might be an array or string
        if (uploadData?.product?.image) {
          uploadedPath = Array.isArray(uploadData.product.image)
            ? String(uploadData.product.image[0])
            : String(uploadData.product.image);
        } else if (uploadData?.image) {
          uploadedPath = Array.isArray(uploadData.image)
            ? String(uploadData.image[0])
            : String(uploadData.image);
        } else if (uploadData?.path) {
          uploadedPath = String(uploadData.path);
        }

        // now ensure we only set imageArray if we have a string
        if (uploadedPath) {
          imageArray = [uploadedPath];

        } else {
          // upload succeeded but no path — warn but proceed (optional)
          console.warn("Upload succeeded but no image path found", uploadData);
          toast.success("Image uploaded (no path returned by server)");
        }
      }


      // Now call TRPC update
      updateProduct(
        {
          id: editingProduct.id.toString(),
           updates: {
             productName: editingProduct.name,
             productCategory: editingProduct.category,
             price: editingProduct.price,
             prodSpecs: editingProduct.description,
             minQuantity: editingProduct.minQuantity,
             stock: editingProduct.stock,
             image: imageArray,
           },
        },
        {
          onSuccess: () => {
            utils.product.getAll.invalidate(); // Refresh products list
            toast.success("Product updated");
          },
          onError: (err: unknown) => {
            console.error("TRPC update error:", err);
            let errorMessage = `Unexpected Error ${err}`
            if (err instanceof Error) {
              errorMessage = err.message
            }
            toast.error(errorMessage || "Could not update product");
          },
        }
      );

      // reset editing states
      setEditingProduct(null);
      setEditingImageFile(null);
      setEditingPreviewUrl(null);
    } catch (err: unknown) {
      console.error("Update error (client):", err);
      // If we've already shown a toast from the upload failure, this is fallback
      let errorMessage = `Unexpected Error ${err}`
      if (err instanceof Error) {
        errorMessage = err.message
      }
      toast.error(errorMessage || "Update failed");
    }
  };


  const handleDeleteProduct = (id: string) => {
    deleteProduct(
      { id: id.toString() },
      {
        onSuccess: () => {
          utils.product.getAll.invalidate(); // Refresh products list
          toast.success("Product deleted");
        },
        onError: (err: unknown) => {
          console.error(err);
          let errorMessage = `Unexpected Error ${err}`
          if (err instanceof Error) {
            errorMessage = err.message
          }
          toast.error(errorMessage || "Delete failed");
        },
      }
    );
  };

  const startEditing = (product: Product) => {
    setEditingProduct({ ...product })
    setEditingImageFile(null)
    setEditingPreviewUrl(null)
  }

  const cancelEditing = () => {
    setEditingProduct(null)
    setEditingImageFile(null)
    setEditingPreviewUrl(null)
  }

  const [categories, setCategories] = useState([
    "Batteries",
    "Controllers",
    "Inverters",
    "Sensors",
    "Cables",
  ]);
  const [newCategory, setNewCategory] = useState("");

  // Add category
  const handleAddCategory = () => {
    if (newCategory.trim() !== "" && !categories.includes(newCategory)) {
      setCategories([...categories, newCategory]);
      setNewCategory("");
    }
  };

  // Delete category
  const handleDeleteCategory = (category: string) => {
    setCategories(categories.filter((c) => c !== category));
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Sonner Toaster (placed at top of component) */}

      {/* Ultra Modern Curtain Animation */}
      <div className={`fixed inset-0 z-50 flex ${animationStage >= 1 ? "pointer-events-none" : ""}`}>
        {/* Left Curtain */}
        <div
          className={`w-1/2 h-full transform transition-all duration-[3000ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${animationStage >= 1 ? "-translate-x-full" : "translate-x-0"
            }`}
          style={{
            background: `
              linear-gradient(135deg, 
                #000000 0%, 
                #1a1a1a 25%, 
                #2d2d2d 50%, 
                #1a1a1a 75%, 
                #000000 100%
              )
            `,
            boxShadow: `
              inset -30px 0 60px rgba(0,0,0,0.8),
              inset 0 0 100px rgba(34, 197, 94, 0.1)
            `,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/5 to-transparent" />
        </div>

        {/* Right Curtain */}
        <div
          className={`w-1/2 h-full transform transition-all duration-[3000ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${animationStage >= 1 ? "translate-x-full" : "translate-x-0"
            }`}
          style={{
            background: `
              linear-gradient(225deg, 
                #000000 0%, 
                #1a1a1a 25%, 
                #2d2d2d 50%, 
                #1a1a1a 75%, 
                #000000 100%
              )
            `,
            boxShadow: `
              inset 30px 0 60px rgba(0,0,0,0.8),
              inset 0 0 100px rgba(34, 197, 94, 0.1)
            `,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-green-500/5 to-transparent" />
        </div>
      </div>

      {/* Sophisticated Grid Background */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
              radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)
            `,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Radial Gradient Overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(ellipse at center, 
              rgba(34, 197, 94, 0.1) 0%, 
              rgba(0, 0, 0, 0.3) 50%, 
              rgba(0, 0, 0, 0.8) 100%
            )
          `,
        }}
      />

      {/* ElectroChem Title Animation - Only for intro */}
      <div
        className={`fixed inset-0 z-40 flex items-center justify-center pointer-events-none ${animationStage >= 3 ? "opacity-0" : "opacity-100"
          } transition-opacity duration-1000`}
      >
        <div className="relative text-center">
          {/* Main Title */}
          <div
            className={`transition-all duration-[2500ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] ${animationStage >= 2 ? "opacity-100 scale-100" : "opacity-0 scale-[2] blur-lg"
              }`}
          >
            <h1
              className="text-8xl font-black text-white mb-2"
              style={{
                fontFamily: "'Inter', sans-serif",
                letterSpacing: "0.02em",
                textShadow: `
                  0 0 40px rgba(34, 197, 94, 0.4),
                  0 0 80px rgba(34, 197, 94, 0.2),
                  0 0 120px rgba(34, 197, 94, 0.1)
                `,
                background: `
                  linear-gradient(135deg, 
                    #ffffff 0%, 
                    #f0f0f0 30%, 
                    #22c55e 50%, 
                    #f0f0f0 70%, 
                    #ffffff 100%
                  )
                `,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              ElectroChem
            </h1>

            {/* Subtitle */}
            <div
              className={`transition-all duration-1000 delay-500 ${animationStage >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
            >
              <p
                className="text-2xl font-light text-gray-300 tracking-[0.3em] mb-2"
                style={{
                  textShadow: "0 0 20px rgba(34, 197, 94, 0.3)",
                }}
              >
                ADMIN PANEL
              </p>
              <div className="w-32 h-[1px] bg-gradient-to-r from-transparent via-green-400 to-transparent mx-auto" />
            </div>
          </div>

          {/* Animated Icon */}
          <div
            className={`absolute -top-16 left-1/2 transform -translate-x-1/2 transition-all duration-1000 ${animationStage >= 2 ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-0 rotate-180"
              }`}
          >
            <div className="relative">
              <Zap
                className="h-12 w-12 text-green-400"
                style={{
                  filter: `
                    drop-shadow(0 0 20px rgba(34, 197, 94, 0.6))
                    drop-shadow(0 0 40px rgba(34, 197, 94, 0.3))
                  `,
                }}
              />
              <div className="absolute inset-0 animate-ping">
                <Zap className="h-12 w-12 text-green-400 opacity-20" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Header - Appears after animation */}
      <header
        className={`fixed top-0 left-0 right-0 z-30 bg-black/80 backdrop-blur-sm border-b border-gray-800/50 transition-all duration-1000 ${animationStage >= 3 ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full"
          }`}
      >
        <div className="container mx-auto px-8 py-4">
          <div className="flex items-center justify-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Zap className="h-6 w-6 text-green-400" />
            </div>
            <h1
              className="text-2xl font-bold text-white"
              style={{
                background: `
                  linear-gradient(135deg, 
                    #ffffff 0%, 
                    #f0f0f0 30%, 
                    #22c55e 50%, 
                    #f0f0f0 70%, 
                    #ffffff 100%
                  )
                `,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              ElectroChem Admin
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content with Perfect Layout */}
      <div
        className={`relative z-10 transition-all duration-[2000ms] ease-out ${animationStage >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
      >
        {/* Header Space */}
        <div className="h-20" />

        {/* Admin Panel Container */}
        <div className="max-w-7xl mx-auto px-8 pb-16 pt-8">
          <Tabs defaultValue="add" className="w-full">
            {/* Enhanced Tab Navigation */}
            <TabsList className="grid w-full grid-cols-3 mb-12 bg-gray-900/80 border border-gray-800/50 backdrop-blur-sm h-14 p-1 rounded-xl">
              <TabsTrigger
                value="add"
                className="data-[state=active]:bg-green-500 data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 text-gray-300 hover:text-white transition-all duration-300 rounded-lg font-medium"
              >
                <Plus className="h-5 w-5 mr-3" />
                Add Product
              </TabsTrigger>
              <TabsTrigger
                value="update"
                className="data-[state=active]:bg-green-500 data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 text-gray-300 hover:text-white transition-all duration-300 rounded-lg font-medium"
              >
                <Edit3 className="h-5 w-5 mr-3" />
                Update Product
              </TabsTrigger>
              <TabsTrigger
                value="delete"
                className="data-[state=active]:bg-green-500 data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 text-gray-300 hover:text-white transition-all duration-300 rounded-lg font-medium"
              >
                <Trash2 className="h-5 w-5 mr-3" />
                Delete Product
              </TabsTrigger>
            </TabsList>

            {/* Add Product Tab */}
            <TabsContent value="add" className="mt-0">
              <Card className="bg-gray-900/90 border-gray-800/50 shadow-2xl backdrop-blur-sm rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-gray-800/50 bg-gray-900/50 px-8 py-6">
                  <CardTitle className="text-white flex items-center gap-3 text-xl">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <Plus className="h-6 w-6 text-green-400" />
                    </div>
                    Add New Product
                  </CardTitle>
                  <CardDescription className="text-gray-400 text-base mt-2">
                    Create a new electrochemical product entry with detailed specifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                          Product Name
                        </label>
                        <Input
                          placeholder="Enter product name"
                          value={newProduct.name}
                          onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                          className="bg-black/50 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-green-400 focus:ring-green-400/20 h-12 rounded-xl transition-all duration-200"
                        />
                      </div>
                      {/* Category Section */}
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                          Category
                        </label>

                        {/* Category Select */}
                        <Select
                          value={newProduct.category}
                          onValueChange={(value) =>
                            setNewProduct({ ...newProduct, category: value })
                          }
                        >
                          <SelectTrigger className="bg-black/50 border-gray-700/50 text-white focus:border-green-400 focus:ring-green-400/20 h-12 rounded-xl">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent className="bg-black/80 backdrop-blur-md border border-gray-700 rounded-xl text-white shadow-2xl">
                            {categories.map((cat) => (
                              <div
                                key={cat}
                                className="flex items-center justify-between px-2 py-1"
                              >
                                <SelectItem
                                  value={cat}
                                  className="hover:bg-green-500/20 focus:bg-green-500/30 text-white flex-1"
                                >
                                  {cat}
                                </SelectItem>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(cat)}
                                  className="ml-2 text-red-400 hover:text-red-500 text-sm"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Add New Category */}
                        <div className="flex gap-3 mt-3">
                          <Input
                            placeholder="New category"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            className="flex-1 bg-black/50 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-green-400 focus:ring-green-400/20 h-12 rounded-xl"
                          />
                          <Button
                            type="button"
                            onClick={handleAddCategory}
                            className="bg-green-500 hover:bg-green-600 text-black font-semibold px-4 h-12 rounded-xl"
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Price ($)</label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={newProduct.price}
                          onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                          className="bg-black/50 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-green-400 focus:ring-green-400/20 h-12 rounded-xl"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                          Stock Quantity
                        </label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={newProduct.stock}
                          onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                          className="bg-black/50 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-green-400 focus:ring-green-400/20 h-12 rounded-xl"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Description</label>
                      <Textarea
                        placeholder="Enter detailed product description"
                        value={newProduct.description}
                        onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                        className="bg-black/50 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-green-400 focus:ring-green-400/20 min-h-[120px] rounded-xl resize-none"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                        Product Image
                      </label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          setNewProduct({ ...newProduct, image: file });
                          if (file) {
                            setPreviewUrl(URL.createObjectURL(file));
                          } else {
                            setPreviewUrl(null);
                          }
                        }}
                        className="bg-black/50 border-gray-700/50 text-white placeholder:text-gray-500 
                                  focus:border-green-400 focus:ring-green-400/20 h-12 rounded-xl"
                      />

                      {previewUrl && (
                        <div className="mt-2">
                          <Image
                            src={previewUrl}
                            alt="Preview"
                            width={128}
                            height={128}
                            className="h-32 w-32 object-cover rounded-xl border border-gray-700"
                          />
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={handleAddProduct}
                      className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-4 h-14 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/25 rounded-xl text-lg"
                    >
                      <Plus className="h-5 w-5 mr-3" />
                      Add Product to Inventory
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Update Product Tab */}
            <TabsContent value="update" className="mt-0">
              <div className="space-y-8">
                {editingProduct ? (
                  <Card className="bg-gray-900/90 border-gray-800/50 shadow-2xl backdrop-blur-sm rounded-2xl overflow-hidden">
                    <CardHeader className="border-b border-gray-800/50 bg-gray-900/50 px-8 py-6">
                      <CardTitle className="text-white flex items-center gap-3 text-xl">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                          <Edit3 className="h-6 w-6 text-green-400" />
                        </div>
                        Update Product
                      </CardTitle>
                      <CardDescription className="text-gray-400 text-base mt-2">
                        Modify the selected product details and specifications
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                      <div className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          <div className="space-y-3">
                            <label className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                              Product Name
                            </label>
                            <Input
                              value={editingProduct.name}
                              onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                              className="bg-black/50 border-gray-700/50 text-white focus:border-green-400 focus:ring-green-400/20 h-12 rounded-xl"
                            />
                          </div>
                          {/* Category Section */}
                          <div className="space-y-3">
                            <label className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                              Category
                            </label>

                            {/* Category Select */}
                            <Select
                              value={editingProduct.category}
                              onValueChange={(value) =>
                                setEditingProduct({ ...editingProduct, category: value })
                              }
                            >
                              <SelectTrigger className="bg-black/50 border-gray-700/50 text-white focus:border-green-400 focus:ring-green-400/20 h-12 rounded-xl">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent className="bg-black/80 backdrop-blur-md border border-gray-700 rounded-xl text-white shadow-2xl">
                                {categories.map((cat) => (
                                  <div
                                    key={cat}
                                    className="flex items-center justify-between px-2 py-1"
                                  >
                                    <SelectItem
                                      value={cat}
                                      className="hover:bg-green-500/20 focus:bg-green-500/30 text-white flex-1"
                                    >
                                      {cat}
                                    </SelectItem>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCategory(cat)}
                                      className="ml-2 text-red-400 hover:text-red-500 text-sm"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Add New Category */}
                            <div className="flex gap-3 mt-3">
                              <Input
                                placeholder="New category"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                className="flex-1 bg-black/50 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-green-400 focus:ring-green-400/20 h-12 rounded-xl"
                              />
                              <Button
                                type="button"
                                onClick={handleAddCategory}
                                className="bg-green-500 hover:bg-green-600 text-black font-semibold px-4 h-12 rounded-xl"
                              >
                                Add
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <label className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                              Price ($)
                            </label>
                            <Input
                              type="number"
                              value={editingProduct.price}
                              onChange={(e) =>
                                setEditingProduct({ ...editingProduct, price: Number.parseFloat(e.target.value) || 0 })
                              }
                              className="bg-black/50 border-gray-700/50 text-white focus:border-green-400 focus:ring-green-400/20 h-12 rounded-xl"
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                              Stock Quantity
                            </label>
                            <Input
                              type="number"
                              value={editingProduct.stock}
                              onChange={(e) =>
                                setEditingProduct({ ...editingProduct, stock: Number.parseInt(e.target.value) || 0 })
                              }
                              className="bg-black/50 border-gray-700/50 text-white focus:border-green-400 focus:ring-green-400/20 h-12 rounded-xl"
                            />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <label className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                            Description
                          </label>
                          <Textarea
                            value={editingProduct.description}
                            onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                            className="bg-black/50 border-gray-700/50 text-white focus:border-green-400 focus:ring-green-400/20 min-h-[120px] rounded-xl resize-none"
                          />
                        </div>

                        {/* Image upload added here for Update tab (mirrors Add) */}
                        <div className="space-y-3">
                          <label className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                            Product Image
                          </label>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0] ?? null;
                              setEditingImageFile(file);
                              if (file) {
                                setEditingPreviewUrl(URL.createObjectURL(file));
                              } else {
                                setEditingPreviewUrl(null);
                              }
                            }}
                            className="bg-black/50 border-gray-700/50 text-white placeholder:text-gray-500 
                                      focus:border-green-400 focus:ring-green-400/20 h-12 rounded-xl"
                          />

                          {editingPreviewUrl ? (
                            <div className="mt-2">
                              <Image
                                src={editingPreviewUrl}
                                alt="Preview"
                                width={128}
                                height={128}
                                className="h-32 w-32 object-cover rounded-xl border border-gray-700"
                              />
                            </div>
                          ) : editingProduct.image ? (
                            <div className="mt-2">
                              <Image
                                src={editingProduct.image}
                                alt="Current"
                                width={128}
                                height={128}
                                className="h-32 w-32 object-cover rounded-xl border border-gray-700"
                              />
                            </div>
                          ) : null}
                        </div>

                        <div className="flex gap-6">
                          <Button
                            onClick={handleUpdateProduct}
                            className="flex-1 bg-green-500 hover:bg-green-600 text-black font-semibold py-4 h-14 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/25 rounded-xl"
                          >
                            <Save className="h-5 w-5 mr-3" />
                            Save Changes
                          </Button>
                          <Button
                            onClick={cancelEditing}
                            variant="outline"
                            className="flex-1 border-gray-700/50 text-gray-300 hover:bg-gray-800 hover:text-white py-4 h-14 rounded-xl font-semibold transition-all duration-300"
                          >
                            <X className="h-5 w-5 mr-3" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-gray-900/90 border-gray-800/50 shadow-2xl backdrop-blur-sm rounded-2xl overflow-hidden">
                    <CardHeader className="border-b border-gray-800/50 bg-gray-900/50 px-8 py-6">
                      <CardTitle className="text-white flex items-center gap-3 text-xl">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                          <Edit3 className="h-6 w-6 text-green-400" />
                        </div>
                        Select Product to Update
                      </CardTitle>
                      <CardDescription className="text-gray-400 text-base mt-2">
                        Choose a product from your inventory to modify its details
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                      {/* Search Bar for Update Tab */}
                      <div className="mb-6">
                        <Input
                          placeholder="Search products by name..."
                          value={updateSearchQuery}
                          onChange={(e) => setUpdateSearchQuery(e.target.value)}
                          className="bg-black/50 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-green-400 focus:ring-green-400/20 h-12 rounded-xl"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredProductsForUpdate.length > 0 ? (
                          filteredProductsForUpdate.map((product) => (
                            <div
                              key={product.id}
                              className="p-6 bg-black/30 rounded-xl border border-gray-800/50 hover:border-green-400/50 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-green-500/10 group"
                              onClick={() => startEditing(product)}
                            >
                              <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-gray-800/50 rounded-lg group-hover:bg-green-500/20 transition-colors duration-300">
                                  <Package className="h-6 w-6 text-green-400" />
                                </div>
                                <h3 className="font-semibold text-white truncate text-lg">{product.name}</h3>
                              </div>
                              <div className="flex items-center justify-between">
                                <Badge
                                  variant="secondary"
                                  className="bg-gray-800/50 text-gray-300 border-gray-700/50 px-3 py-1"
                                >
                                  {product.category}
                                </Badge>
                                <span className="text-green-400 font-bold text-lg">${product.price}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-full text-center py-12">
                            <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                              <Package className="h-10 w-10 text-gray-600" />
                            </div>
                            <p className="text-gray-400 text-lg">
                              {updateSearchQuery ? `No products found matching "${updateSearchQuery}"` : "No products available to update"}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Delete Product Tab */}
            <TabsContent value="delete" className="mt-0">
              <Card className="bg-gray-900/90 border-gray-800/50 shadow-2xl backdrop-blur-sm rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-gray-800/50 bg-gray-900/50 px-8 py-6">
                  <CardTitle className="text-white flex items-center gap-3 text-xl">
                    <div className="p-2 bg-red-500/20 rounded-lg">
                      <Trash2 className="h-6 w-6 text-red-400" />
                    </div>
                    Delete Products
                  </CardTitle>
                  <CardDescription className="text-gray-400 text-base mt-2">
                    Remove products from your inventory (This action cannot be undone)
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  {/* Search Bar for Delete Tab */}
                  <div className="mb-6">
                    <Input
                      placeholder="Search products by name..."
                      value={deleteSearchQuery}
                      onChange={(e) => setDeleteSearchQuery(e.target.value)}
                      className="bg-black/50 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-green-400 focus:ring-green-400/20 h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-6">
                    {filteredProductsForDelete.length > 0 ? (
                      filteredProductsForDelete.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-6 bg-black/30 rounded-xl border border-gray-800/50 hover:border-red-400/50 transition-all duration-300 group"
                        >
                          <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-gray-800/50 rounded-xl flex items-center justify-center group-hover:bg-red-500/20 transition-colors duration-300">
                              <Package className="h-8 w-8 text-gray-400 group-hover:text-red-400 transition-colors duration-300" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-white text-lg mb-1">{product.name}</h3>
                              <div className="flex items-center gap-6 text-gray-400">
                                <span className="text-sm">{product.category}</span>
                                <span className="text-sm font-medium">${product.price}</span>
                                <span className="text-sm">Stock: {product.stock}</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleDeleteProduct(product.id)}
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/25 px-6 py-3 rounded-xl font-semibold"
                          >
                            <Trash2 className="h-5 w-5 mr-2" />
                            Delete
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-16">
                        <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                          <Package className="h-10 w-10 text-gray-600" />
                        </div>
                        <p className="text-gray-400 text-lg">
                          {deleteSearchQuery ? `No products found matching "${deleteSearchQuery}"` : "No products available to delete"}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
