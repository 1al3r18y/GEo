import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const RoutesPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: routes } = useQuery({
    queryKey: ["city-routes"],
    queryFn: async () => {
      const { data } = await supabase.from("city_routes").select("*, cities(name_ar), arrival:airports!city_routes_arrival_airport_id_fkey(name_ar, code), departure:airports!city_routes_departure_airport_id_fkey(name_ar, code)").order("total_nights").order("route_order");
      return data ?? [];
    },
  });

  const { data: cities } = useQuery({
    queryKey: ["cities"],
    queryFn: async () => {
      const { data } = await supabase.from("cities").select("*").order("sort_order");
      return data ?? [];
    },
  });

  const { data: airports } = useQuery({
    queryKey: ["airports"],
    queryFn: async () => {
      const { data } = await supabase.from("airports").select("*");
      return data ?? [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (route: any) => {
      const { error } = await supabase.from("city_routes").insert(route);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["city-routes"] });
      setOpen(false);
      toast({ title: "تم إضافة المسار" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("city_routes").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["city-routes"] });
      toast({ title: "تم حذف المسار" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    addMutation.mutate({
      total_nights: Number(fd.get("total_nights")),
      city_id: fd.get("city_id"),
      nights_in_city: Number(fd.get("nights_in_city")),
      route_order: Number(fd.get("route_order")),
      arrival_airport_id: fd.get("arrival_airport_id") || null,
      departure_airport_id: fd.get("departure_airport_id") || null,
    });
  };

  // Group routes by total_nights
  const grouped = routes?.reduce<Record<number, typeof routes>>((acc, r) => {
    (acc[r.total_nights] = acc[r.total_nights] || []).push(r);
    return acc;
  }, {}) ?? {};

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">إدارة المسارات</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 ml-2" />إضافة مسار</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إضافة مسار جديد</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>إجمالي الليالي</Label><Input name="total_nights" type="number" required min={1} /></div>
                <div><Label>ترتيب المسار</Label><Input name="route_order" type="number" required min={1} /></div>
              </div>
              <div>
                <Label>المدينة</Label>
                <select name="city_id" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">اختر المدينة</option>
                  {cities?.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                </select>
              </div>
              <div><Label>عدد الليالي في المدينة</Label><Input name="nights_in_city" type="number" required min={1} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>مطار الوصول</Label>
                  <select name="arrival_airport_id" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">بدون</option>
                    {airports?.map((a) => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
                  </select>
                </div>
                <div>
                  <Label>مطار المغادرة</Label>
                  <select name="departure_airport_id" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">بدون</option>
                    {airports?.map((a) => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
                  </select>
                </div>
              </div>
              <Button type="submit" className="w-full">{addMutation.isPending ? "جاري الحفظ..." : "حفظ"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b)).map(([nights, items]) => (
          <Card key={nights}>
            <CardHeader>
              <CardTitle>{nights} ليالي</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الترتيب</TableHead>
                    <TableHead>المدينة</TableHead>
                    <TableHead>الليالي</TableHead>
                    <TableHead>مطار الوصول</TableHead>
                    <TableHead>مطار المغادرة</TableHead>
                    <TableHead>حذف</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.route_order}</TableCell>
                      <TableCell>{(r as any).cities?.name_ar}</TableCell>
                      <TableCell>{r.nights_in_city}</TableCell>
                      <TableCell>{(r as any).arrival?.code ?? "-"}</TableCell>
                      <TableCell>{(r as any).departure?.code ?? "-"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(r.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
        {Object.keys(grouped).length === 0 && (
          <Card><CardContent className="py-8 text-center text-muted-foreground">لا توجد مسارات. أضف مساراً جديداً لتوزيع الليالي على المدن.</CardContent></Card>
        )}
      </div>
    </div>
  );
};

export default RoutesPage;
