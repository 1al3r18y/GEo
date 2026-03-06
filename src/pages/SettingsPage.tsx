import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, Percent, Shield, Phone } from "lucide-react";
import { useState, useEffect } from "react";

const seasonLabels: Record<string, string> = { high: "موسم عالي", low: "موسم منخفض", mid: "موسم متوسط" };

const SettingsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("system_settings").select("*").single();
      return data;
    },
  });

  const { data: services } = useQuery({
    queryKey: ["mandatory-services"],
    queryFn: async () => {
      const { data } = await supabase.from("mandatory_services").select("*").single();
      return data;
    },
  });

  const [profitMargin, setProfitMargin] = useState(15);
  const [activeSeason, setActiveSeason] = useState("high");
  const [simPrice, setSimPrice] = useState(15);
  const [insurancePrice, setInsurancePrice] = useState(5);

  useEffect(() => {
    if (settings) { setProfitMargin(settings.profit_margin); setActiveSeason(settings.active_season); }
    if (services) { setSimPrice(services.sim_card_price); setInsurancePrice(services.insurance_price_per_day_per_pax); }
  }, [settings, services]);

  const updateSettings = useMutation({
    mutationFn: async () => {
      if (settings) {
        await supabase.from("system_settings").update({ profit_margin: profitMargin, active_season: activeSeason as any }).eq("id", settings.id);
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["system-settings"] }); toast({ title: "تم حفظ الإعدادات" }); },
  });

  const updateServices = useMutation({
    mutationFn: async () => {
      if (services) {
        await supabase.from("mandatory_services").update({ sim_card_price: simPrice, insurance_price_per_day_per_pax: insurancePrice }).eq("id", services.id);
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["mandatory-services"] }); toast({ title: "تم حفظ أسعار الخدمات" }); },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">الإعدادات العامة</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Percent className="h-5 w-5" />إعدادات النظام</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>هامش الربح المخفي (%)</Label>
              <Input type="number" value={profitMargin} onChange={(e) => setProfitMargin(Number(e.target.value))} />
              <p className="text-xs text-muted-foreground mt-1">يُضاف تلقائياً على السعر النهائي ولا يظهر للعميل</p>
            </div>
            <div>
              <Label>الموسم النشط</Label>
              <select value={activeSeason} onChange={(e) => setActiveSeason(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {Object.entries(seasonLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <Button onClick={() => updateSettings.mutate()} disabled={updateSettings.isPending} className="w-full">
              <Save className="h-4 w-4 ml-2" />{updateSettings.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Phone className="h-5 w-5" />الخدمات الإلزامية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>سعر شريحة الاتصال ($) - للشخص الواحد</Label>
              <Input type="number" value={simPrice} onChange={(e) => setSimPrice(Number(e.target.value))} />
            </div>
            <div>
              <Label>سعر التأمين ($) - لكل يوم لكل شخص</Label>
              <Input type="number" value={insurancePrice} onChange={(e) => setInsurancePrice(Number(e.target.value))} />
              <p className="text-xs text-muted-foreground mt-1">المعادلة: السعر × عدد الأيام × عدد الأشخاص</p>
            </div>
            <Button onClick={() => updateServices.mutate()} disabled={updateServices.isPending} className="w-full">
              <Save className="h-4 w-4 ml-2" />{updateServices.isPending ? "جاري الحفظ..." : "حفظ أسعار الخدمات"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
