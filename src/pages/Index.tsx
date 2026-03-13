import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Hotel, Car, Plane, Map, DollarSign, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const Index = () => {
  const { data: hotels } = useQuery({
    queryKey: ["hotels-count"],
    queryFn: async () => {
      const { count } = await supabase.from("hotel_offers").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: cars } = useQuery({
    queryKey: ["cars-count"],
    queryFn: async () => {
      const { count } = await supabase.from("cars").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: cities } = useQuery({
    queryKey: ["cities-count"],
    queryFn: async () => {
      const { count } = await supabase.from("cities").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("system_settings").select("*").single();
      return data;
    },
  });

  const seasonLabels: Record<string, string> = { high: "موسم عالي", low: "موسم منخفض", mid: "موسم متوسط" };

  const stats = [
    { label: "الفنادق", value: hotels ?? 0, icon: Hotel, color: "bg-primary" },
    { label: "السيارات", value: cars ?? 0, icon: Car, color: "bg-secondary" },
    { label: "المدن", value: cities ?? 0, icon: Map, color: "bg-accent" },
    { label: "المطارات", value: 3, icon: Plane, color: "bg-gold" },
    { label: "هامش الربح", value: `${settings?.profit_margin ?? 15}%`, icon: DollarSign, color: "bg-success" },
    { label: "الموسم النشط", value: settings ? seasonLabels[settings.active_season] : "...", icon: Shield, color: "bg-primary" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">لوحة التحكم الرئيسية</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center gap-4 p-5">
                <div className={`${stat.color} rounded-xl p-3 text-primary-foreground`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Index;
