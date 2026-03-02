import { useRef } from 'react'
import { Upload, FileText, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useState } from 'react'
import { useUploadDocument, useDeleteDocument, UnderwritingDocument } from '@/hooks/useUnderwritings'

const DOC_TYPES = [
  { value: 'rent_roll', label: 'Rent Roll' },
  { value: 'operating_statement', label: 'Operating Statement (T-12/T-24)' },
  { value: 'lease', label: 'Lease' },
  { value: 'site_plan', label: 'Site Plan' },
  { value: 'tax', label: 'Tax Statement' },
  { value: 'appraisal', label: 'Appraisal' },
  { value: 'other', label: 'Other' },
]

interface Props {
  underwritingId: string
  documents: UnderwritingDocument[]
}

export function DocumentUploadSection({ underwritingId, documents }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedType, setSelectedType] = useState('rent_roll')
  const upload = useUploadDocument(underwritingId)
  const deleteDoc = useDeleteDocument(underwritingId)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await upload.mutateAsync({ file, documentType: selectedType })
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-56 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOC_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value} className="text-xs">
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={upload.isPending}
          className="h-8 text-xs"
        >
          {upload.isPending ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Upload className="w-3 h-3 mr-1" />
          )}
          Upload
        </Button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange}
          accept=".pdf,.xlsx,.xls,.csv,.docx,.doc" />
      </div>

      {documents.length > 0 && (
        <div className="space-y-1">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border border-foreground/20 rounded text-xs">
              <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="flex-1 truncate font-medium">{doc.file_name}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-foreground/30">
                {DOC_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type}
              </Badge>
              <Button
                size="icon"
                variant="ghost"
                className="w-5 h-5 text-muted-foreground hover:text-destructive"
                onClick={() => deleteDoc.mutate({ id: doc.id, storagePath: doc.storage_path })}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
