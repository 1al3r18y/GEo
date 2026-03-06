import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Save, Car, Users } from "lucide-react";
import { useState } from "react";
import type { Tables } from "@/integrations/supabase/types";

const CarPricingPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editedPricing, setEditedPricing] = useState<Record<string, Partial<Tables<"car_pricing">>>>({});

  const { data: carPricing, isLoading } = useQuery({
    queryKey: ["car-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("car_pricing")
        .select("*")
        .order("min_pax");
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Tables<"car_pricing">> }) => {
      const { error } = await supabase.from("car_pricing").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["car-pricing"] });
      toast({ title: "تم حفظ التغييرات" });
    },
    onError: (err) => {
      toast({ title: "خطأ", description: String(err), variant: "destructive" });
    },
  });

  const handleChange = (id: string, field: string, value: number) => {
    setEditedPricing((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleSave = (id: string) => {
    if (editedPricing[id]) {
      updateMutation.mutate({ id, updates: editedPricing[id] });
      setEditedPricing((prev) => { const n = { ...prev }; delete n[id]; return n; });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Car className="h-6 w-6" />
            تسعير السيارات حسب عدد الركاب
          </h1>
          <p className="text-muted-foreground mt-1">
            أسعار السيارات اليومية بناءً على إجمالي عدد الركاب (البالغين + جميع الأطفال)
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            جدول تسعير السيارات
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">نطاق الركاب</TableHead>
                <TableHead className="text-right">الوصف</TableHead>
                <TableHead className="text-right">السعر اليومي ($)</TableHead>
                <TableHead className="text-center">حفظ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : carPricing?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    لا توجد بيانات تسعير. يرجى تشغيل الـ Migration لإضافة البيانات الافتراضية.
                  </TableCell>
                </TableRow>
              ) : (
                carPricing?.map((pricing) => (
                  <TableRow key={pricing.id}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full">
                        <Users className="h-4 w-4" />
                        {pricing.min_pax} - {pricing.max_pax} راكب
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {pricing.description_ar}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-28"
                        defaultValue={pricing.price_per_day}
                        onChange={(e) => handleChange(pricing.id, "price_per_day", Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSave(pricing.id)}
                        disabled={!editedPricing[pricing.id] || updateMutation.isPending}
                      >
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>معادلة حساب تكلفة السيارة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm">
            <p className="mb-2"><strong>تكلفة السيارة = السعر اليومي × عدد الأيام</strong></p>
            <p className="text-muted-foreground">
              حيث يتم اختيار السعر اليومي بناءً على إجمالي عدد الركاب (البالغين + جميع الأطفال)
            </p>
          </div>
          <div className="mt-4 grid gap-2 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span>1-3 ركاب:</span>
              <span className="font-semibold">$100/يوم</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span>4-6 ركاب:</span>
              <span className="font-semibold">$120/يوم</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span>7-8 ركاب:</span>
              <span className="font-semibold">$160/يوم</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span>9-12 راكب:</span>
              <span className="font-semibold">$250/يوم</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span>13-24 راكب:</span>
              <span className="font-semibold">$550/يوم</span>
            </div>
            <div className="flex justify-between">
              <span>25-45 راكب:</span>
              <span className="font-semibold">$700/يوم</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CarPricingPage;
