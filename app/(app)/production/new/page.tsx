'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
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
  field: string | null;
}

export default function NewProductionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    productionDate: new Date().toISOString().split('T')[0],
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

  const { data: wellsData } = useQuery({
    queryKey: ['wells-active'],
    queryFn: async () => {
      const res = await fetch('/api/wells?status=active&pageSize=1000');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error ?? 'Failed to create entry');
      return result;
    },
    onSuccess: () => {
      toast.success('Production entry created successfully');
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
    
    if (!formData.wellId) {
      toast.error('Please select a well');
      return;
    }

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

    createMutation.mutate(data);
  };

  // Calculate preview values
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

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="New Production Entry"
        description="Enter daily production data for a well"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
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
                      placeholder="0"
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
                      placeholder="0"
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
                      placeholder="0"
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
                      placeholder="0-24"
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
                      placeholder="0-100"
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
                      placeholder="°F"
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
                      placeholder="inches"
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
                      placeholder="psi"
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
                      placeholder="psi"
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
                    placeholder="Enter any additional notes or observations..."
                    value={formData.comments}
                    onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Entry
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Calculated Preview */}
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

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Calculation Formulas</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Net Oil = Gross Oil × (1 - S&W%)</li>
                <li>• GOR = Gas ÷ Net Oil</li>
                <li>• Water Cut = Water ÷ (Net Oil + Water)</li>
                <li>• Efficiency = Operating Hours ÷ 24</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
