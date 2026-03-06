import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

const tierLabels: Record<string, string> = {
  economy: "اقتصادي", standard: "ستاندرد", superior: "سوبيريور", deluxe: "ديلوكس", luxury: "فاخر",
};

const HotelsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Tables<"hotels"> | null>(null);

  const { data: hotels, isLoading } = useQuery({
    queryKey: ["hotels"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hotels").select("*, cities(name_ar)").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: cities } = useQuery({
    queryKey: ["cities"],
    queryFn: async () => {
      const { data } = await supabase.from("cities").select("*").order("sort_order");
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (hotel: TablesInsert<"hotels">) => {
      if (editingHotel) {
        const { error } = await supabase.from("hotels").update(hotel).eq("id", editingHotel.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hotels").insert(hotel);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels"] });
      setOpen(false);
      setEditingHotel(null);
      toast({ title: editingHotel ? "تم تحديث الفندق" : "تم إضافة الفندق" });
    },
    onError: (err) => toast({ title: "خطأ", description: String(err), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hotels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels"] });
      toast({ title: "تم حذف الفندق" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const hotel: TablesInsert<"hotels"> = {
      name_ar: fd.get("name_ar") as string,
      name_en: fd.get("name_en") as string,
      city_id: fd.get("city_id") as string,
      tier: fd.get("tier") as any,
      price_single: Number(fd.get("price_single")),
      price_double: Number(fd.get("price_double")),
      price_triple: Number(fd.get("price_triple")),
      price_single_view: Number(fd.get("price_single_view") || 0),
      price_double_view: Number(fd.get("price_double_view") || 0),
      price_triple_view: Number(fd.get("price_triple_view") || 0),
    };
    saveMutation.mutate(hotel);
  };

  const openEdit = (hotel: Tables<"hotels">) => {
    setEditingHotel(hotel);
    setOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">إدارة الفنادق</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditingHotel(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 ml-2" />إضافة فندق</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingHotel ? "تعديل الفندق" : "إضافة فندق جديد"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>الاسم بالعربية</Label>
                  <Input name="name_ar" defaultValue={editingHotel?.name_ar} required />
                </div>
                <div>
                  <Label>الاسم بالإنجليزية</Label>
                  <Input name="name_en" defaultValue={editingHotel?.name_en} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>المدينة</Label>
                  <select name="city_id" defaultValue={editingHotel?.city_id} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">اختر المدينة</option>
                    {cities?.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                  </select>
                </div>
                <div>
                  <Label>التصنيف</Label>
                  <select name="tier" defaultValue={editingHotel?.tier ?? "standard"} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {Object.entries(tierLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <p className="text-sm font-semibold text-muted-foreground">أسعار بدون إطلالة ($)</p>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>مفرد</Label><Input name="price_single" type="number" defaultValue={editingHotel?.price_single ?? 0} /></div>
                <div><Label>مزدوج</Label><Input name="price_double" type="number" defaultValue={editingHotel?.price_double ?? 0} /></div>
                <div><Label>ثلاثي</Label><Input name="price_triple" type="number" defaultValue={editingHotel?.price_triple ?? 0} /></div>
              </div>
              <p className="text-sm font-semibold text-muted-foreground">أسعار مع إطلالة ($)</p>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>مفرد</Label><Input name="price_single_view" type="number" defaultValue={editingHotel?.price_single_view ?? 0} /></div>
                <div><Label>مزدوج</Label><Input name="price_double_view" type="number" defaultValue={editingHotel?.price_double_view ?? 0} /></div>
                <div><Label>ثلاثي</Label><Input name="price_triple_view" type="number" defaultValue={editingHotel?.price_triple_view ?? 0} /></div>
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الفندق</TableHead>
                <TableHead>المدينة</TableHead>
                <TableHead>التصنيف</TableHead>
                <TableHead>مفرد</TableHead>
                <TableHead>مزدوج</TableHead>
                <TableHead>ثلاثي</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
              ) : hotels?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">لا توجد فنادق. أضف فندقاً جديداً.</TableCell></TableRow>
              ) : (
                hotels?.map((hotel) => (
                  <TableRow key={hotel.id}>
                    <TableCell className="font-medium">{hotel.name_ar}</TableCell>
                    <TableCell>{(hotel as any).cities?.name_ar}</TableCell>
                    <TableCell>{tierLabels[hotel.tier]}</TableCell>
                    <TableCell>${hotel.price_single}</TableCell>
                    <TableCell>${hotel.price_double}</TableCell>
                    <TableCell>${hotel.price_triple}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(hotel)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(hotel.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
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

export default HotelsPage;
