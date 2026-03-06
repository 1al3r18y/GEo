import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";
import { useState } from "react";
import type { Database } from "@/integrations/supabase/types";

type CarType = Database["public"]["Enums"]["car_type"];
const carTypes: CarType[] = ["sedan", "minivan", "van", "sprinter"];
const carTypeLabels: Record<string, string> = { sedan: "سيدان", minivan: "ميني فان", van: "فان", sprinter: "سبرنتر" };

const AirportsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: airports } = useQuery({
    queryKey: ["airports"],
    queryFn: async () => {
      const { data } = await supabase.from("airports").select("*").order("code");
      return data ?? [];
    },
  });

  const { data: transfers } = useQuery({
    queryKey: ["airport-transfers"],
    queryFn: async () => {
      const { data } = await supabase.from("airport_transfers").select("*");
      return data ?? [];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async ({ airport_id, car_type, price }: { airport_id: string; car_type: CarType; price: number }) => {
      const existing = transfers?.find((t) => t.airport_id === airport_id && t.car_type === car_type);
      if (existing) {
        await supabase.from("airport_transfers").update({ price }).eq("id", existing.id);
      } else {
        await supabase.from("airport_transfers").insert({ airport_id, car_type, price });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["airport-transfers"] });
      toast({ title: "تم حفظ سعر النقل" });
    },
  });

  const getPrice = (airportId: string, carType: CarType) => {
    return transfers?.find((t) => t.airport_id === airportId && t.car_type === carType)?.price ?? 0;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">المطارات وأسعار النقل</h1>
      <div className="space-y-6">
        {airports?.map((airport) => (
          <Card key={airport.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">{airport.code}</span>
                {airport.name_ar}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {carTypes.map((ct) => (
                  <div key={ct}>
                    <Label>{carTypeLabels[ct]}</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="number"
                        defaultValue={getPrice(airport.id, ct)}
                        onBlur={(e) => {
                          const price = Number(e.target.value);
                          if (price !== getPrice(airport.id, ct)) {
                            upsertMutation.mutate({ airport_id: airport.id, car_type: ct, price });
                          }
                        }}
                        className="w-full"
                        placeholder="$"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AirportsPage;
