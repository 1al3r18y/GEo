import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";
import { useState, useEffect } from "react";
import type { Tables } from "@/integrations/supabase/types";

const carTypeLabels: Record<string, string> = {
  sedan: "سيدان", minivan: "ميني فان", van: "فان", sprinter: "سبرنتر",
};

const CarsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editedCars, setEditedCars] = useState<Record<string, Partial<Tables<"cars">>>>({});

  const { data: cars, isLoading } = useQuery({
    queryKey: ["cars"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cars").select("*").order("min_pax");
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Tables<"cars">> }) => {
      const { error } = await supabase.from("cars").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      toast({ title: "تم حفظ التغييرات" });
    },
  });

  const handleChange = (id: string, field: string, value: number) => {
    setEditedCars((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleSave = (id: string) => {
    if (editedCars[id]) {
      updateMutation.mutate({ id, updates: editedCars[id] });
      setEditedCars((prev) => { const n = { ...prev }; delete n[id]; return n; });
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">إدارة السيارات والأسعار</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نوع السيارة</TableHead>
                <TableHead>الركاب (من)</TableHead>
                <TableHead>الركاب (إلى)</TableHead>
                <TableHead>سعر يومي - موسم عالي ($)</TableHead>
                <TableHead>سعر يومي - موسم متوسط ($)</TableHead>
                <TableHead>سعر يومي - موسم منخفض ($)</TableHead>
                <TableHead>حفظ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
              ) : (
                cars?.map((car) => (
                  <TableRow key={car.id}>
                    <TableCell className="font-medium">{carTypeLabels[car.car_type]}</TableCell>
                    <TableCell>{car.min_pax}</TableCell>
                    <TableCell>{car.max_pax}</TableCell>
                    <TableCell>
                      <Input type="number" className="w-24" defaultValue={car.price_per_day_high}
                        onChange={(e) => handleChange(car.id, "price_per_day_high", Number(e.target.value))} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" className="w-24" defaultValue={car.price_per_day_mid}
                        onChange={(e) => handleChange(car.id, "price_per_day_mid", Number(e.target.value))} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" className="w-24" defaultValue={car.price_per_day_low}
                        onChange={(e) => handleChange(car.id, "price_per_day_low", Number(e.target.value))} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleSave(car.id)} disabled={!editedCars[car.id]}>
                        <Save className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CarsPage;
