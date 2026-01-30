'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Paperclip,
  Upload,
  Download,
  Trash2,
  FileText,
  Image,
  File,
  Loader2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'react-hot-toast';
import { useUserRole } from '@/hooks/use-user-role';

interface Attachment {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  description?: string;
  uploadedBy?: string;
  createdAt: string;
  downloadUrl?: string;
}

interface DocumentAttachmentsProps {
  entityType: string;
  entityId: string;
  title?: string;
  maxFiles?: number;
  allowedTypes?: string[];
}

const fileTypeIcons: Record<string, any> = {
  'image/': Image,
  'application/pdf': FileText,
  'text/': FileText,
  default: File,
};

function getFileIcon(mimeType: string) {
  for (const [key, Icon] of Object.entries(fileTypeIcons)) {
    if (mimeType.startsWith(key)) return Icon;
  }
  return fileTypeIcons.default;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function DocumentAttachments({
  entityType,
  entityId,
  title = 'Attachments',
  maxFiles = 10,
  allowedTypes,
}: DocumentAttachmentsProps) {
  const { canEdit } = useUserRole();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');

  // Fetch attachments
  const { data: attachments = [], isLoading } = useQuery<Attachment[]>({
    queryKey: ['attachments', entityType, entityId],
    queryFn: async () => {
      const res = await fetch(
        `/api/attachments?entityType=${entityType}&entityId=${entityId}`
      );
      if (!res.ok) throw new Error('Failed to fetch attachments');
      return res.json();
    },
    enabled: !!entityId,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Step 1: Get presigned URL and create attachment record
      const initRes = await fetch('/api/attachments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
          entityType,
          entityId,
          description,
          isPublic: false,
        }),
      });

      if (!initRes.ok) {
        const error = await initRes.json();
        throw new Error(error.error || 'Failed to initialize upload');
      }

      const { uploadUrl } = await initRes.json();

      // Step 2: Upload file directly to S3
      // Check if content-disposition is in signed headers
      const url = new URL(uploadUrl);
      const signedHeaders = url.searchParams.get('X-Amz-SignedHeaders') || '';
      const headers: Record<string, string> = {
        'Content-Type': file.type,
      };
      if (signedHeaders.includes('content-disposition')) {
        headers['Content-Disposition'] = 'attachment';
      }

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers,
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file to storage');
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', entityType, entityId] });
      toast.success('File uploaded successfully');
      setIsUploadOpen(false);
      setSelectedFile(null);
      setDescription('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to upload file');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const res = await fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete attachment');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', entityType, entityId] });
      toast.success('File deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete file');
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type if restrictions exist
      if (allowedTypes && !allowedTypes.some(type => file.type.startsWith(type))) {
        toast.error('File type not allowed');
        return;
      }
      // Check file size (max 100MB for single-part upload)
      if (file.size > 100 * 1024 * 1024) {
        toast.error('File size must be less than 100MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      await uploadMutation.mutateAsync(selectedFile);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (attachment: Attachment) => {
    if (attachment.downloadUrl) {
      const a = document.createElement('a');
      a.href = attachment.downloadUrl;
      a.download = attachment.originalName;
      a.click();
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Paperclip className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">{title}</h3>
          <span className="text-sm text-muted-foreground">({attachments.length})</span>
        </div>
        {canEdit && attachments.length < maxFiles && (
          <Button size="sm" onClick={() => setIsUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : attachments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <File className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No attachments yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const FileIcon = getFileIcon(attachment.mimeType);
            return (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <FileIcon className="h-8 w-8 text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{attachment.originalName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.fileSize)} • {attachment.uploadedBy}
                  </p>
                  {attachment.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {attachment.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(attachment)}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(attachment.id)}
                      title="Delete"
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Select File</Label>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept={allowedTypes?.join(',')}
              />
              {selectedFile ? (
                <div className="flex items-center gap-2 mt-2 p-3 bg-muted rounded-lg">
                  <File className="h-6 w-6 text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
              )}
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the document"
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
