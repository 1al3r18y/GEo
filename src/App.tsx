import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import HotelsPage from "./pages/HotelsPage";
import HotelOffersPage from "./pages/HotelOffersPage";
import CarsPage from "./pages/CarsPage";
import CarPricingPage from "./pages/CarPricingPage";
import SettingsPage from "./pages/SettingsPage";
import RoutesPage from "./pages/RoutesPage";
import AirportsPage from "./pages/AirportsPage";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/DashboardLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/hotels" element={<HotelsPage />} />
            <Route path="/hotel-offers" element={<HotelOffersPage />} />
            <Route path="/cars" element={<CarsPage />} />
            <Route path="/car-pricing" element={<CarPricingPage />} />
            <Route path="/airports" element={<AirportsPage />} />
            <Route path="/routes" element={<RoutesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
