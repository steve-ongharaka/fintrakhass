'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { PageLoading } from '@/components/loading-spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ArrowLeft, Calculator, Droplets, Flame, Waves } from 'lucide-react';
import toast from 'react-hot-toast';
import { calculateStandardizedProduction } from '@/lib/calculations';

interface Well {
  id: string;
  wellName: string;
  wellId: string;
}

export default function EditProductionPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const productionId = params?.id as string;
  
  const [formData, setFormData] = useState({
    productionDate: '',
    wellId: '',
    grossOilVolume: '',
    grossGasVolume: '',
    grossWaterVolume: '',
    operatingHours: '',
    flowingTubingPressure: '',
    flowingCasingPressure: '',
    chokeSize: '',
    sandWaterPercentage: '',
    temperature: '',
    comments: '',
  });

  const { data: productionData, isLoading: loadingProduction } = useQuery({
    queryKey: ['production', productionId],
    queryFn: async () => {
      const res = await fetch(`/api/production/${productionId}`);
      return res.json();
    },
    enabled: !!productionId,
  });

  const { data: wellsData } = useQuery({
    queryKey: ['wells-all-edit'],
    queryFn: async () => {
      const res = await fetch('/api/wells?pageSize=1000');
      return res.json();
    },
  });

  useEffect(() => {
    if (productionData?.data) {
      const p = productionData.data;
      setFormData({
        productionDate: p.productionDate ? new Date(p.productionDate).toISOString().split('T')[0] : '',
        wellId: p.wellId ?? '',
        grossOilVolume: p.grossOilVolume?.toString() ?? '',
        grossGasVolume: p.grossGasVolume?.toString() ?? '',
        grossWaterVolume: p.grossWaterVolume?.toString() ?? '',
        operatingHours: p.operatingHours?.toString() ?? '',
        flowingTubingPressure: p.flowingTubingPressure?.toString() ?? '',
        flowingCasingPressure: p.flowingCasingPressure?.toString() ?? '',
        chokeSize: p.chokeSize?.toString() ?? '',
        sandWaterPercentage: p.sandWaterPercentage?.toString() ?? '',
        temperature: p.temperature?.toString() ?? '',
        comments: p.comments ?? '',
      });
    }
  }, [productionData]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/production/${productionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error ?? 'Failed to update entry');
      return result;
    },
    onSuccess: () => {
      toast.success('Production entry updated successfully');
      queryClient.invalidateQueries({ queryKey: ['production'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      router.push('/production');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      productionDate: new Date(formData.productionDate),
      wellId: formData.wellId,
      grossOilVolume: formData.grossOilVolume ? parseFloat(formData.grossOilVolume) : 0,
      grossGasVolume: formData.grossGasVolume ? parseFloat(formData.grossGasVolume) : 0,
      grossWaterVolume: formData.grossWaterVolume ? parseFloat(formData.grossWaterVolume) : 0,
      operatingHours: formData.operatingHours ? parseFloat(formData.operatingHours) : 0,
      flowingTubingPressure: formData.flowingTubingPressure ? parseFloat(formData.flowingTubingPressure) : null,
      flowingCasingPressure: formData.flowingCasingPressure ? parseFloat(formData.flowingCasingPressure) : null,
      chokeSize: formData.chokeSize ? parseFloat(formData.chokeSize) : null,
      sandWaterPercentage: formData.sandWaterPercentage ? parseFloat(formData.sandWaterPercentage) : 0,
      temperature: formData.temperature ? parseFloat(formData.temperature) : null,
      comments: formData.comments || null,
    };

    updateMutation.mutate(data);
  };

  const previewValues = calculateStandardizedProduction({
    grossOilVolume: formData.grossOilVolume ? parseFloat(formData.grossOilVolume) : 0,
    grossGasVolume: formData.grossGasVolume ? parseFloat(formData.grossGasVolume) : 0,
    grossWaterVolume: formData.grossWaterVolume ? parseFloat(formData.grossWaterVolume) : 0,
    sandWaterPercentage: formData.sandWaterPercentage ? parseFloat(formData.sandWaterPercentage) : 0,
    operatingHours: formData.operatingHours ? parseFloat(formData.operatingHours) : 0,
    temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
    flowingTubingPressure: formData.flowingTubingPressure ? parseFloat(formData.flowingTubingPressure) : undefined,
  });

  const wells: Well[] = wellsData?.data ?? [];

  if (loadingProduction) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Edit Production Entry"
        description="Update production data"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Field Data Capture (FDC)</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="productionDate">Production Date *</Label>
                  <Input
                    id="productionDate"
                    type="date"
                    value={formData.productionDate}
                    onChange={(e) => setFormData({ ...formData, productionDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wellId">Well *</Label>
                  <Select
                    value={formData.wellId}
                    onValueChange={(v) => setFormData({ ...formData, wellId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a well" />
                    </SelectTrigger>
                    <SelectContent>
                      {wells.map((well) => (
                        <SelectItem key={well.id} value={well.id}>
                          {well.wellName} ({well.wellId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Production Volumes</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="grossOilVolume">Gross Oil (bbl)</Label>
                    <Input
                      id="grossOilVolume"
                      type="number"
                      step="any"
                      min="0"
                      value={formData.grossOilVolume}
                      onChange={(e) => setFormData({ ...formData, grossOilVolume: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grossGasVolume">Gross Gas (Mcf)</Label>
                    <Input
                      id="grossGasVolume"
                      type="number"
                      step="any"
                      min="0"
                      value={formData.grossGasVolume}
                      onChange={(e) => setFormData({ ...formData, grossGasVolume: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grossWaterVolume">Gross Water (bbl)</Label>
                    <Input
                      id="grossWaterVolume"
                      type="number"
                      step="any"
                      min="0"
                      value={formData.grossWaterVolume}
                      onChange={(e) => setFormData({ ...formData, grossWaterVolume: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Operating Parameters</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="operatingHours">Operating Hours</Label>
                    <Input
                      id="operatingHours"
                      type="number"
                      step="0.1"
                      min="0"
                      max="24"
                      value={formData.operatingHours}
                      onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sandWaterPercentage">S&W %</Label>
                    <Input
                      id="sandWaterPercentage"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.sandWaterPercentage}
                      onChange={(e) => setFormData({ ...formData, sandWaterPercentage: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="temperature">Temperature (°F)</Label>
                    <Input
                      id="temperature"
                      type="number"
                      step="any"
                      value={formData.temperature}
                      onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chokeSize">Choke Size (in)</Label>
                    <Input
                      id="chokeSize"
                      type="number"
                      step="any"
                      min="0"
                      value={formData.chokeSize}
                      onChange={(e) => setFormData({ ...formData, chokeSize: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Pressure Readings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="flowingTubingPressure">Flowing Tubing Pressure (psi)</Label>
                    <Input
                      id="flowingTubingPressure"
                      type="number"
                      step="any"
                      min="0"
                      value={formData.flowingTubingPressure}
                      onChange={(e) => setFormData({ ...formData, flowingTubingPressure: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="flowingCasingPressure">Flowing Casing Pressure (psi)</Label>
                    <Input
                      id="flowingCasingPressure"
                      type="number"
                      step="any"
                      min="0"
                      value={formData.flowingCasingPressure}
                      onChange={(e) => setFormData({ ...formData, flowingCasingPressure: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="space-y-2">
                  <Label htmlFor="comments">Comments / Notes</Label>
                  <Textarea
                    id="comments"
                    value={formData.comments}
                    onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Update Entry
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Calculated Values (Preview)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-amber-600" />
                  <span className="text-sm">Net Oil</span>
                </div>
                <span className="font-semibold text-amber-700">
                  {previewValues.netOilVolume.toLocaleString()} bbl
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-red-600" />
                  <span className="text-sm">GOR</span>
                </div>
                <span className="font-semibold text-red-700">
                  {previewValues.gor.toFixed(2)} Mcf/bbl
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Waves className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">Water Cut</span>
                </div>
                <span className="font-semibold text-blue-700">
                  {previewValues.waterCut.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm">Efficiency</span>
                <span className="font-semibold text-green-700">
                  {previewValues.productionEfficiency.toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
