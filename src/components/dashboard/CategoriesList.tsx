import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const CategoriesList = () => {
  // Temporary data until API integration
  const categories = [
    { id: 1, name: "Electronics", products: 142 },
    { id: 2, name: "Fashion", products: 89 },
    { id: 3, name: "Home & Garden", products: 67 },
  ];

  return (
    <Card>
      <CardHeader className="text-lg font-semibold">Product Categories</CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category Name</TableHead>
              <TableHead className="text-right">Products</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>{category.name}</TableCell>
                <TableCell className="text-right">{category.products}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default CategoriesList;
