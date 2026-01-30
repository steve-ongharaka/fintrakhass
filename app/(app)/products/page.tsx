'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { TableSkeleton } from '@/components/loading-spinner';
import { DataTable } from '@/components/ui/data-table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Droplets,
  Flame,
  Waves,
  Beaker,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useUserRole } from '@/hooks/use-user-role';

const PRODUCT_ICONS: Record<string, { icon: any; className: string }> = {
  'Crude Oil': { icon: Droplets, className: 'bg-amber-100 text-amber-600' },
  'Natural Gas': { icon: Flame, className: 'bg-red-100 text-red-600' },
  'Condensate': { icon: Beaker, className: 'bg-purple-100 text-purple-600' },
  'Water': { icon: Waves, className: 'bg-blue-100 text-blue-600' },
  'NGL': { icon: Beaker, className: 'bg-green-100 text-green-600' },
};

interface Product {
  id: string;
  productName: string;
  productCode: string;
  unitOfMeasurement: string | null;
  standardTemperature: number | null;
  standardPressure: number | null;
  density: number | null;
  apiGravity: number | null;
}

export default function ProductsPage() {
  const { userRole, canEdit } = useUserRole();
  
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    productName: '',
    productCode: '',
    unitOfMeasurement: '',
    standardTemperature: '60',
    standardPressure: '14.7',
    density: '',
    apiGravity: '',
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error ?? 'Failed to create product');
      return result;
    },
    onSuccess: () => {
      toast.success('Product created successfully');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      closeForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error ?? 'Failed to update product');
      return result;
    },
    onSuccess: () => {
      toast.success('Product updated successfully');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      closeForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error ?? 'Failed to delete product');
      return result;
    },
    onSuccess: () => {
      toast.success('Product deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
    setFormData({
      productName: '',
      productCode: '',
      unitOfMeasurement: '',
      standardTemperature: '60',
      standardPressure: '14.7',
      density: '',
      apiGravity: '',
    });
  };

  const openCreateForm = () => {
    setEditingProduct(null);
    setFormData({
      productName: '',
      productCode: '',
      unitOfMeasurement: '',
      standardTemperature: '60',
      standardPressure: '14.7',
      density: '',
      apiGravity: '',
    });
    setIsFormOpen(true);
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      productName: product.productName,
      productCode: product.productCode,
      unitOfMeasurement: product.unitOfMeasurement || '',
      standardTemperature: product.standardTemperature?.toString() || '60',
      standardPressure: product.standardPressure?.toString() || '14.7',
      density: product.density?.toString() || '',
      apiGravity: product.apiGravity?.toString() || '',
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      standardTemperature: formData.standardTemperature ? parseFloat(formData.standardTemperature) : null,
      standardPressure: formData.standardPressure ? parseFloat(formData.standardPressure) : null,
      density: formData.density ? parseFloat(formData.density) : null,
      apiGravity: formData.apiGravity ? parseFloat(formData.apiGravity) : null,
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const products = productsData?.data ?? [];

  const columns = [
    {
      key: 'productName',
      header: 'Product',
      sortable: true,
      render: (product: Product) => {
        const iconInfo = PRODUCT_ICONS[product.productName] || { icon: Package, className: 'bg-gray-100 text-gray-600' };
        const Icon = iconInfo.icon;
        return (
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconInfo.className}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{product.productName}</p>
              <p className="text-xs text-gray-500">{product.productCode}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'unitOfMeasurement',
      header: 'Unit',
      render: (product: Product) => (
        <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-sm font-medium text-gray-700">
          {product.unitOfMeasurement || '-'}
        </span>
      ),
    },
    {
      key: 'standardTemperature',
      header: 'Std. Temp',
      render: (product: Product) => product.standardTemperature ? `${product.standardTemperature}°F` : '-',
    },
    {
      key: 'standardPressure',
      header: 'Std. Pressure',
      render: (product: Product) => product.standardPressure ? `${product.standardPressure} psia` : '-',
    },
    {
      key: 'density',
      header: 'Density',
      render: (product: Product) => product.density ? `${product.density} lb/ft³` : '-',
    },
    {
      key: 'apiGravity',
      header: 'API Gravity',
      render: (product: Product) => product.apiGravity ? `${product.apiGravity}°` : '-',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products Configuration"
        description="Configure hydrocarbon products and their properties"
        action={
          canEdit ? (
            <Button onClick={openCreateForm} className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          ) : undefined
        }
      />

      {/* Stats Card */}
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Package className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold text-amber-900">{products.length}</p>
              <p className="text-sm text-amber-700">Configured Products</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="pt-6">
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : products.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No products found"
              description="Start by adding your first product."
              action={
                canEdit ? (
                  <Button onClick={openCreateForm} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Product
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <DataTable
              data={products}
              columns={columns}
              searchable={true}
              searchPlaceholder="Search products..."
              searchKeys={['productName', 'productCode']}
              pageSize={10}
              pageSizeOptions={[5, 10, 20]}
              actions={canEdit ? (product: Product) => (
                <>
                  <Button variant="ghost" size="icon" onClick={() => openEditForm(product)} className="hover:bg-amber-50">
                    <Edit className="h-4 w-4 text-amber-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this product?')) {
                        deleteMutation.mutate(product.id);
                      }
                    }}
                    className="hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </>
              ) : undefined}
            />
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-600" />
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Update the product properties.' : 'Enter the details for the new product.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productName">Product Name *</Label>
                <Input
                  id="productName"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  required
                  className="bg-gray-50 focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="productCode">Product Code *</Label>
                <Input
                  id="productCode"
                  value={formData.productCode}
                  onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                  required
                  className="bg-gray-50 focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitOfMeasurement">Unit of Measurement</Label>
                <Input
                  id="unitOfMeasurement"
                  value={formData.unitOfMeasurement}
                  onChange={(e) => setFormData({ ...formData, unitOfMeasurement: e.target.value })}
                  placeholder="e.g., bbl, Mcf"
                  className="bg-gray-50 focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="standardTemperature">Standard Temperature (°F)</Label>
                <Input
                  id="standardTemperature"
                  type="number"
                  step="any"
                  value={formData.standardTemperature}
                  onChange={(e) => setFormData({ ...formData, standardTemperature: e.target.value })}
                  className="bg-gray-50 focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="standardPressure">Standard Pressure (psia)</Label>
                <Input
                  id="standardPressure"
                  type="number"
                  step="any"
                  value={formData.standardPressure}
                  onChange={(e) => setFormData({ ...formData, standardPressure: e.target.value })}
                  className="bg-gray-50 focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="density">Density (lb/ft³)</Label>
                <Input
                  id="density"
                  type="number"
                  step="any"
                  value={formData.density}
                  onChange={(e) => setFormData({ ...formData, density: e.target.value })}
                  className="bg-gray-50 focus:bg-white"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="apiGravity">API Gravity (°)</Label>
                <Input
                  id="apiGravity"
                  type="number"
                  step="any"
                  value={formData.apiGravity}
                  onChange={(e) => setFormData({ ...formData, apiGravity: e.target.value })}
                  className="bg-gray-50 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-gradient-to-r from-amber-500 to-orange-600"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingProduct ? 'Update Product' : 'Create Product'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
