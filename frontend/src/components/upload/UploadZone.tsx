"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { datasetApi } from "@/lib/api"
import { toast } from "sonner"

interface UploadZoneProps {
  onUploadComplete?: (datasetId: string) => void
}

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    // Validate file type
    const allowedTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/parquet",
      "application/json",
    ]
    const allowedExtensions = [".csv", ".xls", ".xlsx", ".parquet", ".json"]
    const ext = "." + file.name.split(".").pop()?.toLowerCase()

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
      setError("Unsupported file type. Please upload CSV, Excel, Parquet, or JSON files.")
      return
    }

    // Validate file size (100MB)
    if (file.size > 100 * 1024 * 1024) {
      setError("File too large. Maximum size is 100MB.")
      return
    }

    setIsUploading(true)
    setProgress(0)
    setError(null)

    try {
      const response = await datasetApi.upload(file, setProgress)
      const datasetId = response.data.dataset_id
      toast.success("File uploaded successfully!")

      if (onUploadComplete) {
        onUploadComplete(datasetId)
      } else {
        router.push(`/datasets/${datasetId}`)
        router.refresh()
      }
    } catch (err: any) {
      const message = err.response?.data?.detail || "Upload failed. Please try again."
      setError(message)
      toast.error(message)
    } finally {
      setIsUploading(false)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/parquet": [".parquet"],
      "application/json": [".json"],
    },
    maxFiles: 1,
    disabled: isUploading,
  })

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-center">Upload Your Data</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
            ${isUploading ? "pointer-events-none opacity-50" : ""}
          `}
        >
          <input {...getInputProps()} />

          {isUploading ? (
            <div className="space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="text-lg font-medium">Uploading {progress}%</p>
              <Progress value={progress} className="h-2" />
            </div>
          ) : error ? (
            <div className="space-y-4 text-destructive">
              <AlertCircle className="h-12 w-12 mx-auto" />
              <p className="text-lg font-medium">Upload Failed</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={() => setError(null)}>
                Try Again
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-lg font-medium">
                {isDragActive ? "Drop the file here..." : "Drag & drop your file here"}
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports: CSV, Excel (.xls, .xlsx), Parquet, JSON • Max 100MB
              </p>
            </div>
          )}
        </div>

        {/* Supported formats */}
        <div className="mt-6 space-y-2">
          <p className="text-sm text-muted-foreground font-medium">Supported formats:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {["CSV", "Excel", "Parquet", "JSON"].map((fmt) => (
              <span
                key={fmt}
                className="px-3 py-1 text-xs font-medium bg-secondary rounded-full"
              >
                {fmt}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}