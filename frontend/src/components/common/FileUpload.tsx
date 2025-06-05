import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  File, 
  X, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Image,
  FileVideo,
  FileAudio,
  Download
} from 'lucide-react';

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
  maxFiles?: number;
  onFilesSelected?: (files: File[]) => void;
  onFileRemove?: (index: number) => void;
  onUploadComplete?: (results: UploadResult[]) => void;
  disabled?: boolean;
  className?: string;
  uploadEndpoint?: string;
  showPreview?: boolean;
  allowedTypes?: string[];
}

interface UploadResult {
  file: File;
  url?: string;
  error?: string;
  success: boolean;
}

interface FileWithProgress extends File {
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  url?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  accept = '*/*',
  multiple = false,
  maxSize = 10, // 10MB default
  maxFiles = 5,
  onFilesSelected,
  onFileRemove,
  onUploadComplete,
  disabled = false,
  className = '',
  uploadEndpoint,
  showPreview = true,
  allowedTypes = []
}) => {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (file: File) => {
    const type = file.type;
    if (type.startsWith('image/')) return <Image className="w-6 h-6" />;
    if (type.startsWith('video/')) return <FileVideo className="w-6 h-6" />;
    if (type.startsWith('audio/')) return <FileAudio className="w-6 h-6" />;
    if (type.includes('pdf') || type.includes('document')) return <FileText className="w-6 h-6" />;
    return <File className="w-6 h-6" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File size exceeds ${maxSize}MB limit`;
    }

    // Check allowed types
    if (allowedTypes.length > 0 && !allowedTypes.some(type => file.type.includes(type))) {
      return `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`;
    }

    return null;
  };

  const handleFileSelection = useCallback((selectedFiles: FileList) => {
    const newFiles: FileWithProgress[] = [];
    const validFiles: File[] = [];

    Array.from(selectedFiles).forEach((file) => {
      // Check max files limit
      if (files.length + newFiles.length >= maxFiles) {
        return;
      }

      const error = validateFile(file);
      const fileWithProgress: FileWithProgress = {
        ...file,
        id: Math.random().toString(36).substr(2, 9),
        progress: 0,
        status: error ? 'error' : 'pending',
        error: error || undefined,
      };

      newFiles.push(fileWithProgress);
      if (!error) {
        validFiles.push(file);
      }
    });

    setFiles(prev => [...prev, ...newFiles]);
    
    if (validFiles.length > 0) {
      onFilesSelected?.(validFiles);
    }
  }, [files.length, maxFiles, onFilesSelected]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFileSelection(droppedFiles);
    }
  }, [disabled, handleFileSelection]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFileSelection(selectedFiles);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    onFileRemove?.(index);
  };

  const uploadFiles = async () => {
    if (!uploadEndpoint) return;

    const uploadPromises = files
      .filter(file => file.status === 'pending')
      .map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
          // Update status to uploading
          setFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, status: 'uploading' as const } : f
          ));

          const response = await fetch(uploadEndpoint, {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const result = await response.json();
            setFiles(prev => prev.map(f => 
              f.id === file.id ? { 
                ...f, 
                status: 'success' as const, 
                progress: 100,
                url: result.url 
              } : f
            ));
            return { file, url: result.url, success: true };
          } else {
            throw new Error('Upload failed');
          }
        } catch (error) {
          setFiles(prev => prev.map(f => 
            f.id === file.id ? { 
              ...f, 
              status: 'error' as const, 
              error: 'Upload failed' 
            } : f
          ));
          return { file, error: 'Upload failed', success: false };
        }
      });

    const results = await Promise.all(uploadPromises);
    onUploadComplete?.(results);
  };

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={className}>
      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Drop Zone */}
      <Card
        className={`
          border-2 border-dashed transition-colors cursor-pointer
          ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={openFileDialog}
      >
        <CardContent className="p-8 text-center">
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Drop files here or click to browse
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {multiple ? `Select up to ${maxFiles} files` : 'Select a file'} 
            {maxSize && ` (max ${maxSize}MB each)`}
          </p>
          {allowedTypes.length > 0 && (
            <p className="text-xs text-gray-400">
              Allowed types: {allowedTypes.join(', ')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Selected Files</h4>
          {files.map((file, index) => (
            <Card key={file.id} className="p-3">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {getFileIcon(file)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                  
                  {file.status === 'uploading' && (
                    <Progress value={file.progress} className="mt-1" />
                  )}
                  
                  {file.error && (
                    <p className="text-xs text-red-500 mt-1">{file.error}</p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {file.status === 'success' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  {file.url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(file.url, '_blank');
                      }}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          
          {uploadEndpoint && files.some(f => f.status === 'pending') && (
            <Button onClick={uploadFiles} className="w-full mt-4">
              Upload Files
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
