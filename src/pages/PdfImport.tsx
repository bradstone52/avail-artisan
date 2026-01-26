import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileText, CheckCircle, XCircle, RefreshCw, ArrowRight, Building2, Plus } from 'lucide-react';
import { usePdfImport } from '@/hooks/usePdfImport';
import { formatNumber } from '@/lib/formatters';

export default function PdfImport() {
  const {
    isUploading,
    loading,
    brokerages,
    batches,
    stagingRecords,
    matchedListings,
    fetchBrokerages,
    fetchBatches,
    fetchStagingRecords,
    uploadPdf,
    updateStagingAction,
    executeImport,
  } = usePdfImport();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBrokerage, setSelectedBrokerage] = useState<string>('');
  const [newBrokerageName, setNewBrokerageName] = useState('');
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('upload');

  useEffect(() => {
    fetchBrokerages();
    fetchBatches();
  }, [fetchBrokerages, fetchBatches]);

  useEffect(() => {
    if (activeBatchId) {
      fetchStagingRecords(activeBatchId);
    }
  }, [activeBatchId, fetchStagingRecords]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const batchId = await uploadPdf(
      selectedFile,
      selectedBrokerage !== 'new' ? selectedBrokerage : undefined,
      selectedBrokerage === 'new' ? newBrokerageName : undefined
    );

    if (batchId) {
      setActiveBatchId(batchId);
      setActiveTab('review');
      setSelectedFile(null);
      setSelectedBrokerage('');
      setNewBrokerageName('');
      fetchBatches();
      fetchBrokerages();
    }
  };

  const handleImport = async () => {
    if (!activeBatchId) return;
    const success = await executeImport(activeBatchId);
    if (success) {
      fetchBatches();
      setActiveBatchId(null);
      setActiveTab('upload');
    }
  };

  const activeBatch = batches.find((b) => b.id === activeBatchId);

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">PDF Import</h1>
          <p className="text-muted-foreground">
            Upload brokerage PDFs to extract and import listings
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="review" disabled={!activeBatchId}>
              <FileText className="h-4 w-4 mr-2" />
              Review & Import
            </TabsTrigger>
            <TabsTrigger value="history">
              <RefreshCw className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Upload Brokerage PDF</CardTitle>
                  <CardDescription>
                    Select a PDF containing property listings from a brokerage
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Brokerage</Label>
                    <Select value={selectedBrokerage} onValueChange={setSelectedBrokerage}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select brokerage..." />
                      </SelectTrigger>
                      <SelectContent>
                        {brokerages.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.display_name}
                          </SelectItem>
                        ))}
                        <SelectItem value="new">
                          <span className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Add New Brokerage
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedBrokerage === 'new' && (
                    <div className="space-y-2">
                      <Label>New Brokerage Name</Label>
                      <Input
                        placeholder="e.g., CBRE, JLL, Cushman & Wakefield"
                        value={newBrokerageName}
                        onChange={(e) => setNewBrokerageName(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>PDF File</Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      <Input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="hidden"
                        id="pdf-upload"
                      />
                      <label
                        htmlFor="pdf-upload"
                        className="cursor-pointer flex flex-col items-center gap-2"
                      >
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        {selectedFile ? (
                          <span className="font-medium">{selectedFile.name}</span>
                        ) : (
                          <span className="text-muted-foreground">
                            Click to select a PDF file
                          </span>
                        )}
                      </label>
                    </div>
                  </div>

                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || (!selectedBrokerage || (selectedBrokerage === 'new' && !newBrokerageName)) || isUploading}
                    className="w-full"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload & Extract
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>How It Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Upload PDF</p>
                      <p className="text-sm text-muted-foreground">
                        Select the brokerage and upload their monthly listings PDF
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                      2
                    </div>
                    <div>
                      <p className="font-medium">AI Extraction</p>
                      <p className="text-sm text-muted-foreground">
                        Our AI analyzes the document and extracts all listings
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Review & Compare</p>
                      <p className="text-sm text-muted-foreground">
                        See extracted data side-by-side with existing listings
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                      4
                    </div>
                    <div>
                      <p className="font-medium">Import</p>
                      <p className="text-sm text-muted-foreground">
                        Choose what to import, update, or skip
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="review" className="space-y-4">
            {activeBatch && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Review Extracted Listings</CardTitle>
                    <CardDescription>
                      {activeBatch.filename} • {stagingRecords.length} listings extracted
                    </CardDescription>
                  </div>
                  <Button onClick={handleImport} disabled={loading}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Import Selected
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Extracted Address</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead className="w-[50px]" />
                          <TableHead className="w-[200px]">Existing Match</TableHead>
                          <TableHead>Existing Details</TableHead>
                          <TableHead className="w-[150px]">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stagingRecords.map((record) => {
                          const extracted = record.extracted_data as Record<string, unknown>;
                          const matched = record.matched_listing_id
                            ? matchedListings[record.matched_listing_id]
                            : null;

                          return (
                            <TableRow key={record.id}>
                              <TableCell className="font-medium">
                                <div className="space-y-1">
                                  <div>{extracted.address as string}</div>
                                  {extracted.city && (
                                    <div className="text-xs text-muted-foreground">
                                      {extracted.city as string}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm space-y-1">
                                  {extracted.size_sf && (
                                    <div>{formatNumber(extracted.size_sf as number)} SF</div>
                                  )}
                                  {extracted.asking_rate_psf && (
                                    <div className="text-muted-foreground">
                                      {extracted.asking_rate_psf as string}/SF
                                    </div>
                                  )}
                                  {extracted.clear_height_ft && (
                                    <div className="text-muted-foreground">
                                      {extracted.clear_height_ft as number}' clear
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {record.matched_listing_id && (
                                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                )}
                              </TableCell>
                              <TableCell>
                                {matched ? (
                                  <div className="space-y-1">
                                    <div className="font-medium">{matched.display_address || matched.address}</div>
                                    <Badge variant={matched.status === 'Active' ? 'default' : 'secondary'}>
                                      {matched.status}
                                    </Badge>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">No match found</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {matched && (
                                  <div className="text-sm space-y-1">
                                    <div>{formatNumber(matched.size_sf)} SF</div>
                                    {matched.asking_rate_psf && (
                                      <div className="text-muted-foreground">
                                        {matched.asking_rate_psf}/SF
                                      </div>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  {matched ? (
                                    <>
                                      <Button
                                        size="sm"
                                        variant={record.import_action === 'update' ? 'default' : 'outline'}
                                        onClick={() => updateStagingAction(record.id, 'update')}
                                      >
                                        Update
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant={record.import_action === 'skip' ? 'secondary' : 'ghost'}
                                        onClick={() => updateStagingAction(record.id, 'skip')}
                                      >
                                        <XCircle className="h-4 w-4" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        size="sm"
                                        variant={record.import_action === 'import' ? 'default' : 'outline'}
                                        onClick={() => updateStagingAction(record.id, 'import')}
                                      >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Import
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant={record.import_action === 'skip' ? 'secondary' : 'ghost'}
                                        onClick={() => updateStagingAction(record.id, 'skip')}
                                      >
                                        <XCircle className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Import History</CardTitle>
                <CardDescription>Previous PDF imports and their results</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Extracted</TableHead>
                      <TableHead>Imported</TableHead>
                      <TableHead>Skipped</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-medium">{batch.filename}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              batch.status === 'completed'
                                ? 'default'
                                : batch.status === 'ready_for_review'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {batch.status.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{batch.total_listings}</TableCell>
                        <TableCell>{batch.imported_count}</TableCell>
                        <TableCell>{batch.skipped_count}</TableCell>
                        <TableCell>
                          {new Date(batch.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {batch.status === 'ready_for_review' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setActiveBatchId(batch.id);
                                setActiveTab('review');
                              }}
                            >
                              Review
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {batches.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No imports yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
