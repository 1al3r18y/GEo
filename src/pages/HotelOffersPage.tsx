import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Hotel, Eye, EyeOff, Users } from "lucide-react";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type OfferTier = "tier_1" | "tier_2" | "tier_3" | "tier_4" | "tier_5";

const tierLabels: Record<OfferTier, string> = {
  tier_1: "العرض 1 (اقتصادي)",
  tier_2: "العرض 2 (ستاندرد)",
  tier_3: "العرض 3 (متوسط)",
  tier_4: "العرض 4 (ديلوكس)",
  tier_5: "العرض 5 (فاخر)",
};

const tierColors: Record<OfferTier, string> = {
  tier_1: "bg-green-100 text-green-800",
  tier_2: "bg-blue-100 text-blue-800",
  tier_3: "bg-yellow-100 text-yellow-800",
  tier_4: "bg-purple-100 text-purple-800",
  tier_5: "bg-gold/20 text-gold",
};

const HotelOffersPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Tables<"hotel_offers"> | null>(null);
  const [selectedTier, setSelectedTier] = useState<OfferTier>("tier_1");

  const { data: hotelOffers, isLoading } = useQuery({
    queryKey: ["hotel-offers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotel_offers")
        .select("*")
        .order("offer_tier")
        .order("city");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (offer: TablesInsert<"hotel_offers">) => {
      if (editingOffer) {
        const { error } = await supabase.from("hotel_offers").update(offer).eq("id", editingOffer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hotel_offers").insert(offer);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotel-offers"] });
      setOpen(false);
      setEditingOffer(null);
      toast({ title: editingOffer ? "تم تحديث العرض" : "تم إضافة العرض" });
    },
    onError: (err) => toast({ title: "خطأ", description: String(err), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hotel_offers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotel-offers"] });
      toast({ title: "تم حذف العرض" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const offer: TablesInsert<"hotel_offers"> = {
      offer_tier: fd.get("offer_tier") as OfferTier,
      city: fd.get("city") as string,
      hotel_name: fd.get("hotel_name") as string,
      dbl_view: Number(fd.get("dbl_view")),
      dbl_no_view: Number(fd.get("dbl_no_view")),
      trbl_view: Number(fd.get("trbl_view")),
      trbl_no_view: Number(fd.get("trbl_no_view")),
    };
    saveMutation.mutate(offer);
  };

  const openEdit = (offer: Tables<"hotel_offers">) => {
    setEditingOffer(offer);
    setOpen(true);
  };

  const filteredOffers = hotelOffers?.filter(o => o.offer_tier === selectedTier) ?? [];

  const cities = ["Tbilisi", "Batumi", "Kutaisi", "Borjomi", "Gudauri", "Bakuriani", "Dashbash"];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Hotel className="h-6 w-6" />
            عروض الفنادق (5 مستويات)
          </h1>
          <p className="text-muted-foreground mt-1">
            إدارة أسعار الفنادق حسب المدينة ونوع الغرفة والإطلالة
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditingOffer(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 ml-2" />إضافة عرض</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingOffer ? "تعديل العرض" : "إضافة عرض جديد"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>مستوى العرض</Label>
                  <select 
                    name="offer_tier" 
                    defaultValue={editingOffer?.offer_tier ?? "tier_1"} 
                    required 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {Object.entries(tierLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>المدينة</Label>
                  <select 
                    name="city" 
                    defaultValue={editingOffer?.city ?? ""} 
                    required 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">اختر المدينة</option>
                    {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label>اسم الفندق</Label>
                <Input name="hotel_name" defaultValue={editingOffer?.hotel_name} required />
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  غرفة مزدوجة (Double)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1">
                      <Eye className="h-3 w-3" /> مع إطلالة ($)
                    </Label>
                    <Input name="dbl_view" type="number" defaultValue={editingOffer?.dbl_view ?? 0} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      <EyeOff className="h-3 w-3" /> بدون إطلالة ($)
                    </Label>
                    <Input name="dbl_no_view" type="number" defaultValue={editingOffer?.dbl_no_view ?? 0} />
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  غرفة ثلاثية (Triple)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1">
                      <Eye className="h-3 w-3" /> مع إطلالة ($)
                    </Label>
                    <Input name="trbl_view" type="number" defaultValue={editingOffer?.trbl_view ?? 0} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      <EyeOff className="h-3 w-3" /> بدون إطلالة ($)
                    </Label>
                    <Input name="trbl_no_view" type="number" defaultValue={editingOffer?.trbl_no_view ?? 0} />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={selectedTier} onValueChange={(v) => setSelectedTier(v as OfferTier)}>
        <TabsList className="grid w-full grid-cols-5 mb-6">
          {Object.entries(tierLabels).map(([tier, label]) => (
            <TabsTrigger key={tier} value={tier} className="text-xs sm:text-sm">
              {label.split(" ")[1]}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.keys(tierLabels).map((tier) => (
          <TabsContent key={tier} value={tier}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm ${tierColors[tier as OfferTier]}`}>
                    {tierLabels[tier as OfferTier]}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المدينة</TableHead>
                      <TableHead className="text-right">الفندق</TableHead>
                      <TableHead className="text-center">
                        <div className="flex flex-col items-center">
                          <span>مزدوجة</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                          </span>
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex flex-col items-center">
                          <span>مزدوجة</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <EyeOff className="h-3 w-3" />
                          </span>
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex flex-col items-center">
                          <span>ثلاثية</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                          </span>
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex flex-col items-center">
                          <span>ثلاثية</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <EyeOff className="h-3 w-3" />
                          </span>
                        </div>
                      </TableHead>
                      <TableHead className="text-center">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">جاري التحميل...</TableCell>
                      </TableRow>
                    ) : filteredOffers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          لا توجد عروض لهذا المستوى. أضف عرضاً جديداً.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOffers.map((offer) => (
                        <TableRow key={offer.id}>
                          <TableCell className="font-medium">{offer.city}</TableCell>
                          <TableCell>{offer.hotel_name}</TableCell>
                          <TableCell className="text-center font-semibold text-green-600">${offer.dbl_view}</TableCell>
                          <TableCell className="text-center">${offer.dbl_no_view}</TableCell>
                          <TableCell className="text-center font-semibold text-green-600">${offer.trbl_view}</TableCell>
                          <TableCell className="text-center">${offer.trbl_no_view}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(offer)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(offer.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>ملاحظات حول التسعير</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• <strong>DBL_View:</strong> سعر الغرفة المزدوجة مع إطلالة لليلة الواحدة</p>
          <p>• <strong>DBL_NoView:</strong> سعر الغرفة المزدوجة بدون إطلالة لليلة الواحدة</p>
          <p>• <strong>TRBL_View:</strong> سعر الغرفة الثلاثية مع إطلالة لليلة الواحدة</p>
          <p>• <strong>TRBL_NoView:</strong> سعر الغرفة الثلاثية بدون إطلالة لليلة الواحدة</p>
          <p className="mt-4 font-medium">يتم توزيع الركاب تلقائياً على الغرف بأولوية: ثلاثية أولاً، ثم مزدوجة، ثم مفردة.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default HotelOffersPage;
