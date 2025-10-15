"use client"

import type React from "react"
import { toast } from "sonner"
import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, Mail, Lock, User, Zap, MapPin, Phone, ArrowLeft, ArrowRight, Check } from "lucide-react"
import { trpc } from "@/utils/trpc";

interface Address {
  type: string
  street: string
  city: string
  state: string
  zipCode: string
  country: string
  phone?: string
}

interface RegistrationData {
  name: string
  email: string
  password: string
  confirmPassword: string
  addresses: Address[]
  documents: {
    aadhar: File | null
    pan?: File | null
    gstin?: File | null
  }
}

interface documentForURL{
  aadhar:File,
  pan:File,
  gstin?:File | null
}
interface UploadUrlResponse{
  aadharUrl: string;
  panUrl: string;
  gstinUrl?: string | null;
};
export default function SignupPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [passwordError,setpasswordError]=useState('')
  const [confirmPasswordError,setConfirmPasswordError]=useState('')
  const [passwordStrength, setPasswordStrength] = useState(0)
  
  const [errorFeilds,seterrorFeilds]=useState({
    name:false,
    email:false,
    password:false,
    confirmPassword:false,
    addresses: [
    {
      street: false,
      city: false,
      state: false,
      zipCode: false,
      country: false,
      phone: false,
    },
  ]
    
  })

  const [formData, setFormData] = useState<RegistrationData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    addresses: [
      {
        type: "billing",
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
        phone: "",
      },
    ],
    documents: {
      aadhar: null,
      pan: null,
      gstin: null,
    },
  })

  const registerMutation = trpc.user.register.useMutation();
  
  const totalSteps = 4

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    seterrorFeilds((prev)=>({
      ...prev,
      [name]: false,
    }))
  }
  const calculatePasswordStrength = (pass: string):number => {
  
    let score = 0
    if (pass.length >= 6) score++; // Base requirement
    if (pass.length >= 6 && /\d/.test(pass)) score++; // Has numbers
    if (pass.length >= 6 && /[a-z]/.test(pass) && /[A-Z]/.test(pass) && /[^a-zA-Z0-9]/.test(pass)) score++; // Has mixed case and symbols
    return score;
  }

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name,value } = e.target
    setFormData((prev)=>({
      ...prev,
      password: value,
      
    }))
    seterrorFeilds((prev)=>({
      ...prev,
      [name]: false,
    }))
    if(value.length>0 && value.length<6){
      setpasswordError('Password should be at least 6 characters long')
    }else setpasswordError('')
    const strength = calculatePasswordStrength(value)
    setPasswordStrength(strength)

  
  }
  const handleConfirmPasswordInputChange =(e: React.ChangeEvent<HTMLInputElement>) => {
  
    const {name,value}=e.target
    setFormData((prev)=>({
      ...prev,
      confirmPassword: value,
      
    }))
    seterrorFeilds((prev)=>({
      ...prev,
      [name]: false,
    }))

    if(value.length>0 && value!==formData.password){
      setConfirmPasswordError('Passwords do not match')
    }else setConfirmPasswordError('')
  }
  const handleAddressChange = (index: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      addresses: prev.addresses.map((addr, i) => (i === index ? { ...addr, [field]: value } : addr)),
    }))
    seterrorFeilds(prev => ({
    ...prev,
    addresses: prev.addresses.map((addressError, i) =>
      i === index ? { ...addressError, [field]: false } : addressError
        
    ),
  }));
  }

  const handleFileUpload = (documentType: "aadhar" | "pan" | "gstin", file: File | null) => {
    setFormData((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [documentType]: file,
      },
    }))
  }

  const removeFile = (documentType: "aadhar" | "pan" | "gstin") => {
    setFormData((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [documentType]: null,
      },
    }))
  }

  const addAddress = () => {
    setFormData((prev) => ({
      ...prev,
      addresses: [
        ...prev.addresses,
        {
          type: "shipping",
          street: "",
          city: "",
          state: "",
          zipCode: "",
          country: "",
          phone: "",
        },
      ],
    }))
  }

  const removeAddress = (index: number) => {
    if (formData.addresses.length > 1) {
      setFormData((prev) => ({
        ...prev,
        addresses: prev.addresses.filter((_, i) => i !== index),
      }))
    }
  }

  const nextStep = (e:React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }
  const upLoadDocumentsForURL=async(document:documentForURL):Promise<UploadUrlResponse>=>{
    const formDataForURL= new FormData();
    formDataForURL.append('aadhar',document.aadhar);
    formDataForURL.append('pan',document.pan);
    if(document.gstin){ 
       formDataForURL.append('gstin',document.gstin);
    }
    const res=await fetch('/api/getUrl',{
      method:'POST',  
      body: formDataForURL
    });
    if(!res.ok){  
      throw new Error('Failed to upload documents');
    }
    const data=await res.json();
    if(!data.aadharUrl || !data.panUrl){
      throw new Error('Invalid response from server');
    }
    return {
      aadharUrl:data.aadharUrl,
      panUrl:data.panUrl,
      gstinUrl:data.gstinUrl ?? null
    }
  }
  const validateAllRequiredFields=():number =>{
    if(formData.name.trim() === "" || formData.email.trim() === "" || formData.password.trim() === "" || formData.confirmPassword.trim() === ""){ 
        seterrorFeilds((prev)=>({
          ...prev,
          name:formData.name.trim() === ""? true:false,
          email:formData.email.trim() === ""? true:false,
          password:formData.password.trim() === ""? true:false,
          confirmPassword:formData.confirmPassword.trim() === ""? true:false,
        }))
        return 1
    }
    const addressErrors = formData.addresses.map(address => ({
      street: address.street.trim() === "",
      city: address.city.trim() === "",
      state: address.state.trim() === "",
      zipCode: address.zipCode.trim() === "",
      country: address.country.trim() === "",
      phone: false, 
      }));

      const isAnyAddressInvalid = addressErrors.some(address =>
      address.street || address.city || address.state || address.zipCode || address.country
      );
      if (isAnyAddressInvalid) {
        seterrorFeilds((prev)=>({
          ...prev,
          addresses:addressErrors
        }))
        return 2
      }
      if(!formData.documents.aadhar || !formData.documents.pan){
        return 3
      }
     
    return 0
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    //Validate every required errorFeilds are present
    setIsLoading(true)
    const validateFields:number=validateAllRequiredFields();
    if(validateFields!==0){
      if(validateFields===3)toast.error("Please upload both AADHAR and PAN documents")
      else toast.error("Please Fill All Required Fields")
      setIsLoading(false)
      setTimeout(() => setCurrentStep(validateFields), 0)
      return;
    }
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match")
      seterrorFeilds((prev)=>({
        ...prev,
        confirmPassword: true,
      }))
      setCurrentStep(1)
      setIsLoading(false)
      return;
    }
    // Validate password strength
    if (passwordStrength <= 2) {
      toast.error("Please choose a stronger password.Include at least one uppercase letter, one lowercase letter, one number, and one special character.")
      seterrorFeilds((prev)=>({
        ...prev,
        password: true,
      }))
      setIsLoading(false)
      setCurrentStep(1)
      return;

    }
    
    
   
    
    // Validate required documents
    if (!formData.documents.aadhar || !formData.documents.pan) {
      // alert("Please upload both AADHAR and PAN documents")
      setIsLoading(false)
      return
    }
    const {aadharUrl,panUrl,gstinUrl}=await upLoadDocumentsForURL({ 
      aadhar:formData.documents.aadhar,
      pan:formData.documents.pan,
      gstin:formData.documents.gstin ?? null
    })

    console.log("Uploaded document URLs:", { aadharUrl, panUrl, gstinUrl })
    


    // Prepare data for your schema
    const userData = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      addresses: formData.addresses,
      documents: {
        aadhar: aadharUrl,
        pan: panUrl,
        gstin: gstinUrl ?? undefined,
      },
    }

    console.log("Submitting registration data:", userData)

    try {
      await registerMutation.mutateAsync(userData);
      // alert("User registered successfully");
      toast.success("User registered successfully")
      // redirect here
    } catch (error) {
      console.error("Registration error:", error);
      // alert("Registration failed. Try again.");
      toast.error("Registration failed. Try again.")
    } finally {
      setIsLoading(false);
    }

    console.log("Registration data:", userData)

    setTimeout(() => {
      setIsLoading(false)
      // Redirect to login or dashboard
    }, 2000)
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-5">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Personal Information</h3>
              <p className="text-gray-600">Let&apos;s start with your basic details</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700 font-medium">
                Full Name 
              </Label>
              <span className="text-red-500">*</span>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  id="name"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`pl-10 h-12 bg-gray-50 ${errorFeilds.name===false ?`border-gray-300` : `border-red-300`} text-gray-900 placeholder-gray-500 focus:border-green-500 focus:ring-green-500`}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">
                Email Address
              </Label>
               <span className="text-red-500">*</span>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`pl-10 h-12 bg-gray-50 ${errorFeilds.email===false ?`border-gray-300` : `border-red-300`} text-gray-900 placeholder-gray-500 focus:border-green-500 focus:ring-green-500`}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">
                Password
              </Label>
               <span className="text-red-500">*</span>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handlePasswordInputChange}
                  className={`pl-10 pr-12 h-12 bg-gray-50 ${errorFeilds.password===false ?`border-gray-300` : `border-red-300`} text-gray-900 placeholder-gray-500 focus:border-green-500 focus:ring-green-500`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  
                </button>
              </div>
              {passwordError && <p className="text-red-700">{passwordError}</p>}
              {formData.password.length > 0 && passwordStrength > 0 && (
                <>
                  {passwordStrength > 0 && (
                        <div className="mt-3" title="Password Should contains atleast a character,a number , a uppercase and a special character">
                          <div 
                            className="h-2 w-full bg-gray-200 rounded-full" 
                            title="Password should contain at least one character, one number, one uppercase letter, and one special character"
                          >
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                passwordStrength === 3 ? 'bg-green-500' : passwordStrength === 2 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${(passwordStrength / 3) * 100}%` }}
                            ></div>
                            <p className={`${passwordStrength === 3 ? 'text-green-500' : passwordStrength === 2 ? 'text-yellow-500' : 'text-red-500'}`}>Your Password is {passwordStrength===3?"Strong":passwordStrength===2?"Medium" : "Weak"}</p>
                          </div>
                        </div>
              )}
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">
                Confirm Password
              </Label>
               <span className="text-red-500">*</span>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleConfirmPasswordInputChange}
                  className={`pl-10 pr-12 h-12 bg-gray-50 ${errorFeilds.confirmPassword===false ?`border-gray-300` : `border-red-300`} text-gray-900 placeholder-gray-500 focus:border-green-500 focus:ring-green-500`}

                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            {confirmPasswordError && <p className="text-red-700">{confirmPasswordError}</p>}
          </div>
        )

      case 2:
        return (
          <div className="space-y-5">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Address Information</h3>
              <p className="text-gray-600">Add your billing and shipping addresses</p>
            </div>

            {formData.addresses.map((address, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 capitalize">
                    {address.type} Address {index > 0 && `#${index + 1}`}
                  </h4>
                  {formData.addresses.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeAddress(index)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label className="text-gray-700 font-medium">Street Address</Label>
                     <span className="text-red-500">*</span>
                    <Input
                      placeholder="Enter street address"
                      value={address.street}
                      onChange={(e) => handleAddressChange(index, "street", e.target.value)}
                      className={`h-10 bg-gray-50 ${errorFeilds.addresses[index]?.street ? "border-red-300":"border-gray-300"} focus:border-green-500 focus:ring-green-500`}
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium">City</Label>
                     <span className="text-red-500">*</span>
                    <Input
                      placeholder="City"
                      value={address.city}
                      onChange={(e) => handleAddressChange(index, "city", e.target.value)}
                      className={`h-10 bg-gray-50 ${errorFeilds.addresses[index]?.city ? "border-red-300":"border-gray-300"} focus:border-green-500 focus:ring-green-500`}
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium">State</Label>
                     <span className="text-red-500">*</span>
                    <Input
                      placeholder="State"
                      value={address.state}
                      onChange={(e) => handleAddressChange(index, "state", e.target.value)}
                      className={`h-10 bg-gray-50 ${errorFeilds.addresses[index]?.state ? "border-red-300":"border-gray-300"} focus:border-green-500 focus:ring-green-500`}
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium">ZIP Code</Label>
                     <span className="text-red-500">*</span>
                    <Input
                      placeholder="ZIP Code"
                      value={address.zipCode}
                      onChange={(e) => handleAddressChange(index, "zipCode", e.target.value)}
                      className={`h-10 bg-gray-50 ${errorFeilds.addresses[index]?.zipCode ? "border-red-300":"border-gray-300"} focus:border-green-500 focus:ring-green-500`}
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium">Country</Label>
                     <span className="text-red-500">*</span>
                    <Input
                      placeholder="Country"
                      value={address.country}
                      onChange={(e) => handleAddressChange(index, "country", e.target.value)}
                      className={`h-10 bg-gray-50 ${errorFeilds.addresses[index]?.country ? "border-red-300":"border-gray-300"} focus:border-green-500 focus:ring-green-500`}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-gray-700 font-medium">Phone Number (Optional)</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Phone number"
                        value={address.phone}
                        onChange={(e) => handleAddressChange(index, "phone", e.target.value)}
                        className="pl-10 h-10 bg-gray-50 border-gray-300 focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addAddress}
              className="w-full border-green-200 text-green-600 hover:bg-green-50 bg-transparent"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Add Another Address
            </Button>
          </div>
        )

      case 3:
        return (
          <div className="space-y-5">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Document Upload</h3>
              <p className="text-gray-600">Upload your identity and business documents</p>
            </div>

            <div className="space-y-6">
              {/* AADHAR Upload */}
              <div className="p-4 border border-gray-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">AADHAR Card</h4>
                    <p className="text-sm text-gray-600">Upload your AADHAR card (front and back)</p>
                  </div>
                  <span className="text-xs text-red-500">Required</span>
                </div>

                {!formData.documents.aadhar ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
                    <input
                      type="file"
                      id="aadhar-upload"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        handleFileUpload("aadhar", file)
                      }}
                      className="hidden"
                    />
                    <label htmlFor="aadhar-upload" className="cursor-pointer">
                      <div className="space-y-2">
                        <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Click to upload AADHAR</p>
                          <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                        </div>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{formData.documents.aadhar.name}</p>
                        <p className="text-xs text-gray-500">
                          {(formData.documents.aadhar.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeFile("aadhar")}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>

              {/* PAN Upload */}
              <div className="p-4 border border-gray-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">PAN Card</h4>
                    <p className="text-sm text-gray-600">Upload your PAN card</p>
                  </div>
                  <span className="text-xs text-red-500">Required</span>
                </div>

                {!formData.documents.pan ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
                    <input
                      type="file"
                      id="pan-upload"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        handleFileUpload("pan", file)
                      }}
                      className="hidden"
                    />
                    <label htmlFor="pan-upload" className="cursor-pointer">
                      <div className="space-y-2">
                        <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Click to upload PAN</p>
                          <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                        </div>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{formData.documents.pan.name}</p>
                        <p className="text-xs text-gray-500">
                          {(formData.documents.pan.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeFile("pan")}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>

              {/* GSTIN Upload */}
              <div className="p-4 border border-gray-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">GSTIN Certificate</h4>
                    <p className="text-sm text-gray-600">Upload your GST registration certificate (Optional)</p>
                  </div>
                  <span className="text-xs text-gray-500">Optional</span>
                </div>

                {!formData.documents.gstin ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
                    <input
                      type="file"
                      id="gstin-upload"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        handleFileUpload("gstin", file)
                      }}
                      className="hidden"
                    />
                    <label htmlFor="gstin-upload" className="cursor-pointer">
                      <div className="space-y-2">
                        <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Click to upload GSTIN</p>
                          <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                        </div>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{formData.documents.gstin.name}</p>
                        <p className="text-xs text-gray-500">
                          {(formData.documents.gstin.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeFile("gstin")}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Document Guidelines</h4>
                    <ul className="text-xs text-blue-700 mt-1 space-y-1">
                      <li>Ensure documents are clear and readable</li>
                      <li>Accepted formats: PNG, JPG, PDF</li>
                      <li>Maximum file size: 10MB per document</li>
                      <li>AADHAR and PAN are required for verification</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Review & Confirm</h3>
              <p className="text-gray-600">Please review your information before creating your account</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Personal Information</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">Name:</span> {formData.name}
                  </p>
                  <p>
                    <span className="font-medium">Email:</span> {formData.email}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Addresses</h4>
                {formData.addresses.map((address, index) => (
                  <div key={index} className="mb-3 last:mb-0">
                    <p className="font-medium text-sm text-gray-700 capitalize">{address.type} Address:</p>
                    <p className="text-sm text-gray-600">
                      {address.street}, {address.city}, {address.state} {address.zipCode}, {address.country}
                      {address.phone && ` • ${address.phone}`}
                    </p>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Documents</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>AADHAR Card:</span>
                    <span className={formData.documents.aadhar ? "text-green-600 font-medium" : "text-red-500"}>
                      {formData.documents.aadhar ? "✓ Uploaded" : "Not uploaded"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>PAN Card:</span>
                    <span className={formData.documents.pan ? "text-green-600 font-medium" : "text-red-500"}>
                      {formData.documents.pan ? "✓ Uploaded" : "Not uploaded"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>GSTIN Certificate:</span>
                    <span className={formData.documents.gstin ? "text-green-600 font-medium" : "text-gray-500"}>
                      {formData.documents.gstin ? "✓ Uploaded" : "Not provided (Optional)"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center text-xs text-gray-500 pt-4">
              By creating an account, you agree to our{" "}
              <Link href="/terms" className="text-green-600 hover:text-green-700 underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-green-600 hover:text-green-700 underline">
                Privacy Policy
              </Link>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <>
    
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left side - Branding - Now always visible */}
          <div className="flex flex-col items-center justify-center space-y-6 lg:space-y-8 order-2 lg:order-1">
            <div className="text-center space-y-4 lg:space-y-6">
              <div className="flex items-center justify-center space-x-3 mb-6 lg:mb-8">
                <div className="p-2 lg:p-3 bg-green-100 rounded-full">
                  <Zap className="h-6 w-6 lg:h-8 lg:w-8 text-green-600" />
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Electrochem</h1>
              </div>
              <div className="relative">
                <Image
                  src="/images/battery_charging.gif"
                  alt="Professional Green Li-ion Battery"
                  width={280}
                  height={280}
                  className="mx-auto drop-shadow-lg lg:w-[320px] lg:h-[320px]"
                />
              </div>
              <div className="space-y-3 lg:space-y-4">
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">Join Electrochem</h2>
                <p className="text-gray-600 max-w-md text-base lg:text-lg leading-relaxed mx-auto">
                  Create your account in just a few steps and start accessing advanced electrochemical energy solutions.
                </p>
              </div>
              <div className="flex items-center justify-center space-x-6 lg:space-x-8 pt-4">
                <div className="text-center">
                  <div className="text-xl lg:text-2xl font-bold text-green-600">99.9%</div>
                  <div className="text-xs lg:text-sm text-gray-500">Reliability</div>
                </div>
                <div className="text-center">
                  <div className="text-xl lg:text-2xl font-bold text-green-600">24/7</div>
                  <div className="text-xs lg:text-sm text-gray-500">Support</div>
                </div>
                <div className="text-center">
                  <div className="text-xl lg:text-2xl font-bold text-green-600">10K+</div>
                  <div className="text-xs lg:text-sm text-gray-500">Customers</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Registration Form */}
          <div className="w-full max-w-md mx-auto order-1 lg:order-2">
            <Card className="bg-white border-gray-200 shadow-xl">
              <CardHeader className="space-y-2 text-center pb-6">
                <CardTitle className="text-2xl lg:text-3xl font-bold text-gray-900">Create Account</CardTitle>
                <CardDescription className="text-gray-600">
                  Step {currentStep} of {totalSteps}
                </CardDescription>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                  ></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit}>
                  {renderStep()}

                  <div className="flex justify-between pt-6">
                    {currentStep > 1 ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={prevStep}
                        className="flex items-center space-x-2 bg-transparent"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Previous</span>
                      </Button>
                    ) : (
                      <div></div>
                    )}

                    {currentStep < totalSteps ? (
                      <Button
                        type="button"
                        onClick={(e) => nextStep(e)}
                        className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2"
                      >
                        <span>Next</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Creating...</span>
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            <span>Create Account</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </form>

                
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>

    </>
  )
}
