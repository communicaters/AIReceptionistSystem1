import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/lib/api";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  Search, 
  ShoppingCart, 
  Package, 
  Tag, 
  BarChart4,
  Edit,
  Trash2
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const Products = () => {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { 
    data: products, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ["/api/products"],
    queryFn: getProducts
  });

  const filteredProducts = products?.filter(product => 
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.category && product.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products & Pricing</h1>
          <p className="text-muted-foreground">
            Manage product information, inventory, and pricing
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add New Product
        </Button>
      </div>

      <div className="flex items-center space-x-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-500" />
          <Input
            placeholder="Search products..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Product Catalog</CardTitle>
              <CardDescription>
                View and manage all products in your inventory
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : error ? (
                <div className="bg-red-50 p-4 rounded-md text-red-600">
                  Failed to load product data
                </div>
              ) : !products?.length ? (
                <div className="text-center py-8 text-neutral-500">
                  No products found. Add your first product to get started.
                </div>
              ) : (
                <Table>
                  <TableCaption>A list of your products</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts?.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.sku}</TableCell>
                        <TableCell>{product.category || "Uncategorized"}</TableCell>
                        <TableCell className="text-right">
                          ${(product.priceInCents / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.inventory?.quantity || "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-500">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Management</CardTitle>
              <CardDescription>
                Track and update product inventory levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex flex-col items-center">
                          <ShoppingCart className="h-8 w-8 text-primary mb-2" />
                          <h3 className="text-lg font-medium">Total Products</h3>
                          <p className="text-3xl font-bold mt-2">
                            {products?.length || 0}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex flex-col items-center">
                          <Package className="h-8 w-8 text-amber-500 mb-2" />
                          <h3 className="text-lg font-medium">In Stock</h3>
                          <p className="text-3xl font-bold mt-2">
                            {products?.filter(p => 
                              p.inventory && p.inventory.quantity > 0
                            ).length || 0}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex flex-col items-center">
                          <Tag className="h-8 w-8 text-red-500 mb-2" />
                          <h3 className="text-lg font-medium">Low Stock</h3>
                          <p className="text-3xl font-bold mt-2">
                            {products?.filter(p => 
                              p.inventory && p.inventory.quantity > 0 && p.inventory.quantity < 10
                            ).length || 0}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {filteredProducts?.length > 0 && (
                    <Table>
                      <TableCaption>Inventory Status</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product Name</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">Current Stock</TableHead>
                          <TableHead>Last Updated</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>{product.sku}</TableCell>
                            <TableCell className="text-right">
                              <span className={`${
                                !product.inventory || product.inventory.quantity === 0
                                  ? "text-red-500"
                                  : product.inventory.quantity < 10
                                  ? "text-amber-500"
                                  : "text-green-500"
                              }`}>
                                {product.inventory?.quantity || 0}
                              </span>
                            </TableCell>
                            <TableCell>
                              {product.inventory?.lastUpdated
                                ? new Date(product.inventory.lastUpdated).toLocaleDateString()
                                : "Never"}
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm">
                                Update Stock
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>E-commerce Integrations</CardTitle>
              <CardDescription>
                Connect to external e-commerce platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="border rounded-md p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-md">
                        <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.63 0 0 5.63 0 12s5.63 12 12 12 12-5.63 12-12S18.37 0 12 0zm0 22.5C6.492 22.5 1.5 17.508 1.5 12S6.492 1.5 12 1.5 22.5 6.492 22.5 12 17.508 22.5 12 22.5zm2.25-12.75c-.414 0-.75.336-.75.75 0 .414.336.75.75.75.414 0 .75-.336.75-.75 0-.414-.336-.75-.75-.75zm-4.5 0c-.414 0-.75.336-.75.75 0 .414.336.75.75.75.414 0 .75-.336.75-.75 0-.414-.336-.75-.75-.75z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <h3 className="font-medium">Shopify</h3>
                        <p className="text-sm text-neutral-500">
                          Connect your Shopify store to sync products and inventory
                        </p>
                      </div>
                    </div>
                    <Button>Connect</Button>
                  </div>
                </div>

                <div className="border rounded-md p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-md">
                        <svg className="w-6 h-6 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.63 0 0 5.63 0 12s5.63 12 12 12 12-5.63 12-12S18.37 0 12 0zm0 22.5C6.492 22.5 1.5 17.508 1.5 12S6.492 1.5 12 1.5 22.5 6.492 22.5 12 17.508 22.5 12 22.5zm2.25-12.75c-.414 0-.75.336-.75.75 0 .414.336.75.75.75.414 0 .75-.336.75-.75 0-.414-.336-.75-.75-.75zm-4.5 0c-.414 0-.75.336-.75.75 0 .414.336.75.75.75.414 0 .75-.336.75-.75 0-.414-.336-.75-.75-.75z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <h3 className="font-medium">WooCommerce</h3>
                        <p className="text-sm text-neutral-500">
                          Connect your WooCommerce store to sync products and inventory
                        </p>
                      </div>
                    </div>
                    <Button>Connect</Button>
                  </div>
                </div>

                <div className="border rounded-md p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-md">
                        <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.63 0 0 5.63 0 12s5.63 12 12 12 12-5.63 12-12S18.37 0 12 0zm0 22.5C6.492 22.5 1.5 17.508 1.5 12S6.492 1.5 12 1.5 22.5 6.492 22.5 12 17.508 22.5 12 22.5zm2.25-12.75c-.414 0-.75.336-.75.75 0 .414.336.75.75.75.414 0 .75-.336.75-.75 0-.414-.336-.75-.75-.75zm-4.5 0c-.414 0-.75.336-.75.75 0 .414.336.75.75.75.414 0 .75-.336.75-.75 0-.414-.336-.75-.75-.75z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <h3 className="font-medium">CSV Import/Export</h3>
                        <p className="text-sm text-neutral-500">
                          Import or export products using CSV files
                        </p>
                      </div>
                    </div>
                    <div className="space-x-2">
                      <Button variant="outline">Import</Button>
                      <Button variant="outline">Export</Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Products;
